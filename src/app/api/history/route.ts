import { NextResponse, type NextRequest } from "next/server";
import { getWallet } from "@/lib/wallet-data";
import { getAllCategories, getAllExpenses, getAllIncomes, getSettings } from "@/lib/page-data";
import { displayIcon } from "@/lib/category";
import { HISTORY_SCOPES, historyRows, withAddedDebts, type HistoryScope } from "@/lib/history";

export const dynamic = "force-dynamic";

/** GET ?scope=expenses…: the history window's rows (see lib/history). */
export async function GET(req: NextRequest) {
  const asked = req.nextUrl.searchParams.get("scope");
  const scope: HistoryScope = HISTORY_SCOPES.includes(asked as HistoryScope) ? (asked as HistoryScope) : "all";
  const [wallet, settings, expenses, incomes, categories] = await Promise.all([getWallet(), getSettings(), getAllExpenses(), getAllIncomes(), getAllCategories()]);
  // Debts whose money didn't come in here (it was already had).
  const received = new Set(incomes.map((i) => i.expenseId).filter(Boolean));
  const emoji = new Map(categories.map((c) => [c.id, c.emoji]));
  const added = expenses
    .filter((e) => e.type === "credit" && !received.has(e.id))
    .map((e) => ({ id: e.id, name: e.name, at: e.createdAt, total: e.creditInitialAmount ?? e.amount, emoji: displayIcon(e, emoji) }));
  return NextResponse.json({ currency: settings.currency, rows: historyRows(withAddedDebts(wallet.entries, added), scope) });
}
