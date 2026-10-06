// Whose data a query reads and writes. Every query on the app's tables goes
// through the Prisma extension in lib/prisma.ts, which adds the user here to
// its filter (and to what it creates): one user never reads, changes or
// deletes another's rows, whatever the code above asks for.
//
// The user is the signed-in one (the session cookie of the request), unless
// code runs explicitly for a given user (asUser: the sign-in itself) or for
// no one in particular (asSystem: the health check, which reads no data).
// Anything else — no cookie, an invalid one, no request at all — fails.
import { AsyncLocalStorage } from "node:async_hooks";
import { cookies } from "next/headers";
import { SESSION_COOKIE, readSessionToken } from "./session";

type Scope = { userId: string } | { system: true };

const scope = new AsyncLocalStorage<Scope>();

export class NotSignedIn extends Error {
  constructor() {
    super("Not signed in");
  }
}

/** Runs `work` with queries scoped to this user. */
export function asUser<T>(userId: string, work: () => Promise<T>): Promise<T> {
  // Awaited inside: a Prisma query only runs when awaited, and must run here.
  return scope.run({ userId }, async () => await work());
}

/** Runs `work` with unscoped queries. Only for code that reads no one's data. */
export function asSystem<T>(work: () => Promise<T>): Promise<T> {
  return scope.run({ system: true }, async () => await work());
}

/** The signed-in user's id (from the request's session cookie), or null. */
export async function signedInUserId(): Promise<string | null> {
  let token: string | undefined;
  try {
    token = (await cookies()).get(SESSION_COOKIE)?.value;
  } catch {
    return null; // not in a request
  }
  return token ? readSessionToken(token) : null;
}

/** The user the current queries are for; null in asSystem. */
export async function scopeUserId(): Promise<string | null> {
  const current = scope.getStore();
  if (current) return "system" in current ? null : current.userId;
  const userId = await signedInUserId();
  if (!userId) throw new NotSignedIn();
  return userId;
}

/** The user the current queries are for (never asSystem). */
export async function requireUserId(): Promise<string> {
  const userId = await scopeUserId();
  if (!userId) throw new NotSignedIn();
  return userId;
}
