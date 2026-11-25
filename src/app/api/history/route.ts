import { NextResponse, type NextRequest } from "next/server";
import { getWallet } from "@/lib/wallet-data";
import { getSettings } from "@/lib/page-data";
import { HISTORY_SCOPES, historyRows, type HistoryScope } from "@/lib/history";

export const dynamic = "force-dynamic";

/** GET ?scope=expenses…: the history window's rows (see lib/history). */
export async function GET(req: NextRequest) {
  const asked = req.nextUrl.searchParams.get("scope");
  const scope: HistoryScope = HISTORY_SCOPES.includes(asked as HistoryScope) ? (asked as HistoryScope) : "all";
  const [wallet, settings] = await Promise.all([getWallet(), getSettings()]);
  return NextResponse.json({ currency: settings.currency, rows: historyRows(wallet.entries, scope) });
}
