import { NextResponse } from "next/server";
import { databaseUrl, prisma, runtimeDatabaseUrl } from "@/lib/prisma";
import { addMonths, todayMonth } from "@/lib/date";
import { getMonthLedgerItems, getPaidThisMonth } from "@/lib/engine";
import { getAllCategories, getAllDarets, getAllExpenses, getAllPayments, getSettings } from "@/lib/repository";

export const dynamic = "force-dynamic";

/**
 * Diagnostic: runs, step by step, what the pages need (database connection,
 * each table, the Dashboard calculations) and reports the first failure
 * with its real message. In production, page errors only show an opaque
 * code; the error screen calls this to show what actually went wrong.
 */
export async function GET() {
  const steps: { step: string; ms: number }[] = [];

  async function run<T>(step: string, fn: () => Promise<T> | T): Promise<T> {
    const started = Date.now();
    try {
      const result = await fn();
      steps.push({ step, ms: Date.now() - started });
      return result;
    } catch (error) {
      throw Object.assign(new Error(describe(error)), { step });
    }
  }

  try {
    await run("connexion", () => prisma.$queryRaw`SELECT 1`);
    const settings = await run("réglages", getSettings);
    const expenses = await run("dépenses", getAllExpenses);
    const payments = await run("paiements", getAllPayments);
    await run("catégories", getAllCategories);
    await run("darets", getAllDarets);
    await run("calculs", () => {
      const month = todayMonth();
      getPaidThisMonth(expenses, payments, month);
      for (let i = -1; i <= 2; i++) getMonthLedgerItems(expenses, payments, addMonths(month, i), month);
      return settings.salary;
    });
    return NextResponse.json({ ok: true, pooled: isPooled(), steps }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const e = error as Error & { step?: string };
    return NextResponse.json(
      { ok: false, pooled: isPooled(), step: e.step ?? "inconnu", message: e.message, steps },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}

/** Whether the app goes through the connection pooler (see lib/prisma.ts). */
function isPooled(): boolean {
  try {
    return new URL(runtimeDatabaseUrl(databaseUrl()) ?? "").hostname.startsWith("pooled.");
  } catch {
    return false;
  }
}

/** Error name/code and message, without connection strings or hostnames. */
function describe(error: unknown): string {
  const code = (error as { code?: unknown })?.code;
  const message = error instanceof Error ? error.message : String(error);
  const clean = message
    .replace(/\w+(\+\w+)?:\/\/\S+/g, "[url]")
    .replace(/`[^`]*\.(?:com|tech|io|net|co|app|cloud)(?::\d+)?`/gi, "[serveur]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 400);
  return typeof code === "string" ? `${code} — ${clean}` : clean;
}
