import { AsyncLocalStorage } from "node:async_hooks";
import { Prisma, PrismaClient } from "@prisma/client";
import { scopeUserId } from "./user-scope";

/**
 * Production runs on Prisma Postgres, whose direct host only accepts a few
 * connections per database role. Every serverless instance keeps its own
 * pool of connections open — even while idle, and even after a newer
 * deployment replaced it — so a burst of requests (ticking many expenses
 * quickly: each tick refreshes and prefetches several pages) started enough
 * instances to use them all up. From then on every page failed with "too
 * many connections for role", and so did the next build's migrations.
 *
 * The app therefore goes through Prisma Postgres's connection pooler
 * (PgBouncer in transaction mode, same credentials, pooled.* host), which
 * shares a few database connections between all instances. The direct host
 * stays for the Prisma CLI (migrations, seed), which needs a real session:
 * schema.prisma still reads DATABASE_URL as is.
 */
const DIRECT_HOST = "db.prisma.io";
const POOLED_HOST = "pooled.db.prisma.io";

/**
 * The test version (Vercel Preview deployments, the test branch) has its own
 * database, connected to Preview only as TEST_DATABASE_URL — so it never
 * touches the real data. Production never uses it, even if a TEST_
 * variable gets connected to Production by mistake.
 */
export function databaseUrl(): string | undefined {
  if (process.env.VERCEL_ENV === "production") return process.env.DATABASE_URL;
  return process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
}

/**
 * Also: serverless Postgres can suspend when idle and take several seconds
 * to wake. Prisma's defaults (5s connect timeout, 10s pool timeout) make the
 * first requests after a pause fail with a server error — especially when a
 * page load and its background prefetches all hit the database at once.
 * Give it more room, unless the connection string already sets these.
 */
export function runtimeDatabaseUrl(url: string | undefined): string | undefined {
  if (!url) return url;
  try {
    const parsed = new URL(url);
    if (parsed.hostname === DIRECT_HOST) parsed.hostname = POOLED_HOST;
    // Transaction pooling can't keep Prisma's named prepared statements
    // between queries.
    if (parsed.hostname === POOLED_HOST && !parsed.searchParams.has("pgbouncer")) {
      parsed.searchParams.set("pgbouncer", "true");
    }
    if (!parsed.searchParams.has("connect_timeout")) parsed.searchParams.set("connect_timeout", "15");
    if (!parsed.searchParams.has("pool_timeout")) parsed.searchParams.set("pool_timeout", "20");
    // Keep each instance's own pool small too (Prisma's default here is 5):
    // a burst can start several instances at once.
    if (process.env.VERCEL && !parsed.searchParams.has("connection_limit")) {
      parsed.searchParams.set("connection_limit", "3");
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

// Connection-level failures (database unreachable / waking up, timeouts,
// connection closed, pool exhausted): safe to retry for reads.
const TRANSIENT_CODES = new Set(["P1001", "P1002", "P1008", "P1017", "P2024"]);
const READ_OPERATIONS = new Set([
  "findMany",
  "findFirst",
  "findFirstOrThrow",
  "findUnique",
  "findUniqueOrThrow",
  "count",
  "aggregate",
  "groupBy",
]);

function isTransient(error: unknown): boolean {
  const code = (error as { code?: unknown })?.code;
  if (typeof code === "string" && TRANSIENT_CODES.has(code)) return true;
  const message = error instanceof Error ? error.message : "";
  return /Can't reach database server|Timed out fetching a new connection|too many (clients|connections)|Connection (reset|terminated|closed)/i.test(
    message,
  );
}

/** The tables holding someone's data: every query on them is scoped to its user. */
const USER_MODELS = new Set<string>(Prisma.dmmf.datamodel.models.map((m) => m.name).filter((name) => name !== "User"));

// Never sent back: queries only ever see their own user's rows anyway.
const omitUserId = Object.fromEntries(
  [...USER_MODELS].map((name) => [name[0].toLowerCase() + name.slice(1), { userId: true }]),
) as unknown as Prisma.GlobalOmitConfig;

type Args = { where?: object; data?: unknown; create?: object; update?: object };

const withoutUserId = (data: unknown) => {
  if (!data || typeof data !== "object") return data;
  const rest = { ...(data as Record<string, unknown>) };
  delete rest.userId;
  return rest;
};

/**
 * Adds the user to a query (see lib/user-scope.ts): to its filter, and to
 * the rows it creates. An update can't move a row to someone else.
 */
function scopeArgs(operation: string, args: Args, userId: string): Args {
  const scoped: Args = { ...args };
  if (operation === "create") scoped.data = { ...(args.data as object), userId };
  else if (operation === "createMany" || operation === "createManyAndReturn") {
    const rows = Array.isArray(args.data) ? args.data : [args.data];
    scoped.data = rows.map((row) => ({ ...(row as object), userId }));
  } else {
    scoped.where = { ...args.where, userId };
    if (operation === "upsert") {
      scoped.create = { ...args.create, userId };
      scoped.update = withoutUserId(args.update) as object;
    } else if ("data" in args) {
      scoped.data = withoutUserId(args.data);
    }
  }
  return scoped;
}

function createClient() {
  return new PrismaClient({ datasourceUrl: runtimeDatabaseUrl(databaseUrl()), omit: omitUserId }).$extends({
    query: {
      async $allOperations({ model, operation, args, query }) {
        if (model && USER_MODELS.has(model)) {
          const userId = await scopeUserId();
          if (userId) args = scopeArgs(operation, args as Args, userId) as typeof args;
        }
        if (!READ_OPERATIONS.has(operation)) return query(args);
        for (let attempt = 0; ; attempt++) {
          try {
            return await query(args);
          } catch (error) {
            if (attempt >= 2 || !isTransient(error)) throw error;
            // Logged (code and the end of the message) so slow, retried queries show up.
            const code = (error as { code?: unknown })?.code;
            const message = error instanceof Error ? error.message.replace(/\s+/g, " ").slice(-240) : "";
            console.warn(`[db] retry ${attempt + 1} after ${String(code ?? "")} ${message}`);
            await new Promise((resolve) => setTimeout(resolve, 400 * 2 ** attempt));
          }
        }
      },
    },
  });
}

type ExtendedPrismaClient = ReturnType<typeof createClient>;

declare global {
  var __budgetPrisma: ExtendedPrismaClient | undefined;
}

const base = globalThis.__budgetPrisma ?? createClient();
if (process.env.NODE_ENV !== "production") globalThis.__budgetPrisma = base;

type TransactionClient = Parameters<Parameters<ExtendedPrismaClient["$transaction"]>[0]>[0];
const transactionScope = new AsyncLocalStorage<TransactionClient>();

/**
 * Runs `work` in one database transaction: every query made through
 * `prisma` meanwhile (in any module) is part of it, and a throw rolls all
 * of it back. Lets a check made after a change undo it (see balance-guard).
 */
export function inTransaction<T>(work: () => Promise<T>): Promise<T> {
  if (transactionScope.getStore()) return work();
  return base.$transaction((tx) => transactionScope.run(tx, async () => await work()), { maxWait: 10_000, timeout: 20_000 });
}

/** Outside a transaction scope (e.g. the state before it, as committed). */
export const committedPrisma = base;

/**
 * The client the app uses: the plain client, or — inside inTransaction —
 * that transaction. Code written for the plain client keeps working there,
 * including its own `prisma.$transaction([...])` batches (run in order
 * within the surrounding transaction).
 */
export const prisma = new Proxy(base, {
  get(target, prop) {
    const tx = transactionScope.getStore();
    if (tx && prop === "$transaction") {
      return async (arg: unknown) => {
        if (typeof arg === "function") return arg(tx);
        const results: unknown[] = [];
        for (const query of arg as Promise<unknown>[]) results.push(await query);
        return results;
      };
    }
    const source = (tx ?? target) as object;
    const value = Reflect.get(source, prop);
    return typeof value === "function" ? value.bind(source) : value;
  },
}) as ExtendedPrismaClient;
