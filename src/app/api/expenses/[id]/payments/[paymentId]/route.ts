import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { todayMonth } from "@/lib/date";
import { getCreditRealState } from "@/lib/engine";
import { formatMoney } from "@/lib/utils";
import { deletePaymentPart, getExpenseById, getPaymentsForExpense, updatePaymentPart } from "@/lib/repository";
import { AMOUNT_LOCKED, amountLocked } from "@/lib/pay-expense";
import { withBalanceGuard } from "@/lib/balance-guard";

interface Params {
  params: Promise<{ id: string; paymentId: string }>;
}

const bodySchema = z.object({
  amount: z.number().positive().max(1e9),
  method: z.enum(["cash", "card"]),
});

/** Corrects one payment of a month (one part of it): { amount, method }. */
export const PATCH = withBalanceGuard(async function patch(req: NextRequest, { params }: Params) {
  const { id, paymentId } = await params;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Montant invalide." }, { status: 400 });
  const [expense, payments] = await Promise.all([getExpenseById(id), getPaymentsForExpense(id)]);
  const payment = payments.find((p) => p.id === paymentId);
  if (!expense || !payment) return NextResponse.json({ error: "Paiement introuvable." }, { status: 404 });

  const amount = Math.round(parsed.data.amount * 100) / 100;
  const more = Math.round((amount - payment.amountPaid) * 100) / 100;
  if (Math.abs(more) > 0.005 && (await amountLocked(id))) return NextResponse.json({ error: AMOUNT_LOCKED }, { status: 409 });
  if (expense.type === "credit" && more > 0.005) {
    const { remaining } = getCreditRealState(expense, payments, todayMonth());
    if (more > remaining + 0.005) {
      return NextResponse.json({ error: `Il ne reste que ${formatMoney(remaining)} sur ce crédit.` }, { status: 400 });
    }
  }

  const updated = await updatePaymentPart(id, paymentId, { amountPaid: amount, method: parsed.data.method });
  if (!updated) return NextResponse.json({ error: "Paiement introuvable." }, { status: 404 });
  return NextResponse.json(updated);
});

/** Removes one payment of a month (one part of it). */
export const DELETE = withBalanceGuard(async function remove(_req: NextRequest, { params }: Params) {
  const { id, paymentId } = await params;
  const ok = await deletePaymentPart(id, paymentId);
  if (!ok) return NextResponse.json({ error: "Paiement introuvable." }, { status: 404 });
  return NextResponse.json({ ok: true });
});
