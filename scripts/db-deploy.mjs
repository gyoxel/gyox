/**
 * Build step: apply migrations, then seed. Both need a direct database
 * connection, and Prisma Postgres only accepts a few of those: while the
 * serverless instances of an older deployment still hold some (they keep
 * them open until they shut down), wait and try again instead of failing
 * the deployment on the first "too many connections".
 */
import { spawnSync } from "node:child_process";

// The test version (Preview) migrates and seeds its own database, never the
// real one (see databaseUrl in src/lib/prisma.ts). Production never does,
// even if a TEST_ variable gets connected to Production by mistake.
const useTestDb = Boolean(process.env.TEST_DATABASE_URL) && process.env.VERCEL_ENV !== "production";
if (useTestDb) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  console.log("Preview: using the test database (TEST_DATABASE_URL).");
}

const RETRYABLE = /too many (connections|clients)|Can't reach database server|Timed out|P1001|P1002|P1017/i;
// Seconds to wait before each new attempt: about 5 minutes in all.
const DELAYS = [10, 20, 30, 45, 60, 60, 60];

function prisma(...args) {
  for (let attempt = 0; ; attempt++) {
    const result = spawnSync("npx", ["prisma", ...args], { encoding: "utf8", stdio: ["inherit", "pipe", "pipe"] });
    process.stdout.write(result.stdout ?? "");
    process.stderr.write(result.stderr ?? "");
    if (result.status === 0) return;
    if (attempt >= DELAYS.length || !RETRYABLE.test(`${result.stdout}${result.stderr}`)) {
      process.exit(result.status ?? 1);
    }
    console.log(`\`prisma ${args.join(" ")}\`: database busy, retrying in ${DELAYS[attempt]}s…`);
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, DELAYS[attempt] * 1000);
  }
}

// "[reset-test-db]" in the commit message empties the TEST database and
// fills it again with the demo data (never the real one: TEST_ only).
if (useTestDb && (process.env.VERCEL_GIT_COMMIT_MESSAGE ?? "").includes("[reset-test-db]")) {
  console.log("Preview: resetting the test database.");
  prisma("migrate", "reset", "--force", "--skip-generate");
} else {
  prisma("migrate", "deploy");
  prisma("db", "seed");
}
