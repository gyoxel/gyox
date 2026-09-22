import { NextRequest, NextResponse } from "next/server";
import { monthKey as toMonthKey, parseMonthKey, todayMonth } from "@/lib/date";
import { getCreditRealState, getOccurrenceForMonth, getUnpaidMonths } from "@/lib/engine";
import {
  getAllExpenses,
  getAllPayments,
  getExpenseById,
  markCreditSlotPaid,
  markMonthPaid,
  markMonthUnpaid,
  undoLastCreditSlot,
} from "@/lib/repository";

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * Marks the next due amount paid.
 * Body: { monthKey?: string } —
 * - Non-credit: which month to settle; omitted, settles the oldest unpaid
 *   month (the Dashboard's quick action).
 * - Credit: which month to evaluate "is anything pending" against —
 *   passing a future month (e.g. from the Dashboard's month carousel)
 *   lets a not-yet-started installment be paid in advance; omitted
 *   defaults to the real current month.
 */
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const expense = await getExpenseById(id);
  if (!expense) return NextResponse.json({ error: "Dépense introuvable." }, { status: 404 });

  const body = await req.json().catch(() => ({}) as { monthKey?: string });
  const payments = await getAllPayments();

  if (expense.type === "credit") {
    const evalMonth = body.monthKey ? parseMonthKey(body.monthKey) : todayMonth();
    const state = getCreditRealState(expense, payments, evalMonth);
    if (state.pendingAmount <= 0) {
      return NextResponse.json({ error: "Aucune mensualité en attente pour ce crédit." }, { status: 400 });
    }
    const payment = await markCreditSlotPaid(
      expense.id,
      state.pendingAmount,
      state.pendingAmount,
      toMonthKey(evalMonth),
    );
    return NextResponse.json(payment, { status: 201 });
  }

  const currentMonth = todayMonth();
  const allExpenses = await getAllExpenses();
  const byId = new Map(allExpenses.map((e) => [e.id, e]));
  const unpaid = getUnpaidMonths(expense, payments, currentMonth, byId);

  let targetMonthKey: string;
  let amountDue: number;
  if (body.monthKey) {
    const match = unpaid.find((u) => u.monthKey === body.monthKey);
    if (match) {
      targetMonthKey = match.monthKey;
      amountDue = match.amountDue;
    } else {
      // Month not in the unpaid ledger (already settled, or outside the
      // usual range) — fall back to the actual occurrence amount for it.
      const occ = getOccurrenceForMonth(expense, parseMonthKey(body.monthKey), byId);
      if (!occ) return NextResponse.json({ error: "Aucune échéance pour ce mois." }, { status: 400 });
      targetMonthKey = body.monthKey;
      amountDue = occ.amount;
    }
  } else {
    if (!unpaid[0]) return NextResponse.json({ error: "Rien à payer pour cette dépense." }, { status: 400 });
    targetMonthKey = unpaid[0].monthKey;
    amountDue = unpaid[0].amountDue;
  }

  const payment = await markMonthPaid(expense.id, targetMonthKey, amountDue, amountDue);
  return NextResponse.json(payment, { status: 201 });
}

/**
 * Undoes a payment.
 * Body: { monthKey?: string } — for non-credit expenses, which month to
 * unmark. Ignored for credits, which always undo the most recent
 * installment.
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const expense = await getExpenseById(id);
  if (!expense) return NextResponse.json({ error: "Dépense introuvable." }, { status: 404 });

  if (expense.type === "credit") {
    const ok = await undoLastCreditSlot(expense.id);
    if (!ok) return NextResponse.json({ error: "Aucun paiement à annuler." }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  const monthKeyValue = req.nextUrl.searchParams.get("monthKey") ?? toMonthKey(todayMonth());
  const ok = await markMonthUnpaid(expense.id, monthKeyValue);
  if (!ok) return NextResponse.json({ error: "Aucun paiement à annuler pour ce mois." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
