import { NextRequest, NextResponse } from "next/server";
import { deleteExpense, getDaretOfExpense, pagesGoneWithExpenses, getDepositOfExpense, getExpenseById, paymentFollowsAmount, updateExpense } from "@/lib/repository";
import { amountLocked } from "@/lib/pay-expense";
import { monthKey, monthOfDateStr, todayMonth } from "@/lib/date";
import { getSavingsMoveOfExpense } from "@/lib/savings-repo";
import { getLoanOfExpense } from "@/lib/loans-repo";
import { expenseInputSchema, partialExpenseSchema } from "@/lib/validation";
import { withBalanceGuard } from "@/lib/balance-guard";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const expense = await getExpenseById(id);
  if (!expense) return NextResponse.json({ error: "Dépense introuvable." }, { status: 404 });
  return NextResponse.json(expense);
}

export const PATCH = withBalanceGuard(async function patch(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const existing = await getExpenseById(id);
  if (!existing) return NextResponse.json({ error: "Dépense introuvable." }, { status: 404 });

  const body = await req.json();
  const partialParsed = partialExpenseSchema.safeParse(body);
  if (!partialParsed.success) {
    return NextResponse.json({ error: partialParsed.error.flatten() }, { status: 400 });
  }

  const merged = { ...existing, ...partialParsed.data };
  const fullParsed = expenseInputSchema.safeParse(merged);
  if (!fullParsed.success) {
    return NextResponse.json({ error: fullParsed.error.flatten() }, { status: 400 });
  }

  const updated = await updateExpense(id, fullParsed.data);
  // A new amount: the month the form shows follows it (a one-time expense's
  // own month, else this one) — paid in full, it stays paid in full.
  if (updated && existing.type !== "credit" && Math.abs(updated.amount - existing.amount) > 0.005 && !(await amountLocked(id))) {
    const month = existing.frequency === "one-time" ? monthKey(monthOfDateStr(existing.startDate)) : monthKey(todayMonth());
    await paymentFollowsAmount(id, month, existing.amount, updated.amount);
  }
  return NextResponse.json(updated);
});

export const DELETE = withBalanceGuard(async function remove(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  // Only its source deletes what it created: a daret, a goal deposit.
  const [daret, deposit, move, loan] = await Promise.all([
    getDaretOfExpense(id),
    getDepositOfExpense(id),
    getSavingsMoveOfExpense(id),
    getLoanOfExpense(id),
  ]);
  if (daret) return NextResponse.json({ error: "Cette dépense vient d'une daret : supprime la daret." }, { status: 409 });
  if (deposit) return NextResponse.json({ error: "Cette dépense vient d'un versement : supprime le versement." }, { status: 409 });
  if (move) return NextResponse.json({ error: "Cette dépense vient de l'épargne : supprime-la depuis l'épargne." }, { status: 409 });
  if (loan) return NextResponse.json({ error: "Cette dépense est de l'argent prêté : supprime-la depuis « Argent prêté »." }, { status: 409 });
  const gone = await pagesGoneWithExpenses([id]);
  const ok = await deleteExpense(id);
  if (!ok) return NextResponse.json({ error: "Dépense introuvable." }, { status: 404 });
  return NextResponse.json({ ok: true, gone });
});
