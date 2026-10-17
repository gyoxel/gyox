import { NextRequest, NextResponse } from "next/server";
import { monthKey as toMonthKey, todayMonth } from "@/lib/date";
import { getExpenseById, getPaymentsForExpense, markMonthUnpaid, setMonthAmount, setPaymentMethod, undoLastCreditSlot } from "@/lib/repository";
import { payExpense } from "@/lib/pay-expense";
import { withBalanceGuard } from "@/lib/balance-guard";

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * Marks the next due amount paid.
 * Body: { monthKey?: string, method?, amount? } — `amount`: paid another
 * amount than expected (it becomes that month's own amount).
 * - Non-credit: which month to settle; omitted, settles the oldest unpaid
 *   month (the Dashboard's quick action).
 * - Credit: which month to evaluate "is anything pending" against —
 *   passing a future month (e.g. from the Dashboard's month carousel)
 *   lets a not-yet-started installment be paid in advance; omitted
 *   defaults to the real current month.
 */
export const POST = withBalanceGuard(async function post(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { monthKey?: string; method?: string; amount?: unknown };
  const method = body.method === "cash" || body.method === "card" ? body.method : null;
  const amount = typeof body.amount === "number" && Number.isFinite(body.amount) ? body.amount : undefined;
  if (amount != null && (amount <= 0 || amount > 1e9)) return NextResponse.json({ error: "Montant invalide." }, { status: 400 });
  const result = await payExpense(id, body.monthKey, method, amount);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.payment, { status: 201 });
});

/**
 * Undoes a payment.
 * Body: { monthKey?: string } — for non-credit expenses, which month to
 * unmark. Ignored for credits, which always undo the most recent
 * installment. That month's own amount (paid another amount) goes too.
 */
export const DELETE = withBalanceGuard(async function remove(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const expense = await getExpenseById(id);
  if (!expense) return NextResponse.json({ error: "Dépense introuvable." }, { status: 404 });

  if (expense.type === "credit") {
    const last = (await getPaymentsForExpense(expense.id))
      .filter((p) => p.slotIndex != null)
      .sort((a, b) => (b.slotIndex ?? 0) - (a.slotIndex ?? 0))[0];
    const ok = await undoLastCreditSlot(expense.id);
    if (!ok) return NextResponse.json({ error: "Aucun paiement à annuler." }, { status: 400 });
    if (last?.monthKey && expense.monthAmounts?.[last.monthKey] != null) await setMonthAmount(expense.id, last.monthKey, null);
    return NextResponse.json({ ok: true });
  }

  const monthKeyValue = req.nextUrl.searchParams.get("monthKey") ?? toMonthKey(todayMonth());
  const ok = await markMonthUnpaid(expense.id, monthKeyValue);
  if (!ok) return NextResponse.json({ error: "Aucun paiement à annuler pour ce mois." }, { status: 400 });
  if (expense.monthAmounts?.[monthKeyValue] != null) await setMonthAmount(expense.id, monthKeyValue, null);
  return NextResponse.json({ ok: true });
});

/** Changes how a month's payment was made. Body: { monthKey, method }. */
export const PATCH = withBalanceGuard(async function patch(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { monthKey?: string; method?: string };
  if (!body.monthKey || (body.method !== "cash" && body.method !== "card")) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }
  const ok = await setPaymentMethod(id, body.monthKey, body.method);
  if (!ok) return NextResponse.json({ error: "Aucun paiement pour ce mois." }, { status: 404 });
  return NextResponse.json({ ok: true });
});
