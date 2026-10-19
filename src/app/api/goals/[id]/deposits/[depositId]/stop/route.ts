import { NextResponse } from "next/server";
import { pagesGoneWithExpenses, getGoalDeposit, stopGoalDeposit } from "@/lib/repository";
import { withBalanceGuard } from "@/lib/balance-guard";

interface Params {
  params: Promise<{ id: string; depositId: string }>;
}

/** POST: stops a deposit made every month (the months put aside stay). */
export const POST = withBalanceGuard(async function post(_req: Request, { params }: Params) {
  const { id, depositId } = await params;
  const deposit = await getGoalDeposit(id, depositId);
  const gone = [`/goals/${id}/deposits/${depositId}`, ...(await pagesGoneWithExpenses(deposit?.expenseId ? [deposit.expenseId] : []))];
  const stopped = await stopGoalDeposit(id, depositId);
  if (!stopped) return NextResponse.json({ error: "Versement introuvable." }, { status: 404 });
  return NextResponse.json({ ok: true, gone: stopped.deleted ? gone : [] });
});
