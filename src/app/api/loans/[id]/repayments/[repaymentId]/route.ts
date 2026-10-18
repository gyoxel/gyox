import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { cancelRepayment, getLoan, updateRepayment } from "@/lib/loans-repo";
import { loanState } from "@/lib/loans";
import { todayMonth } from "@/lib/date";
import { formatMoney } from "@/lib/utils";
import { withBalanceGuard } from "@/lib/balance-guard";

type Params = { params: Promise<{ id: string; repaymentId: string }> };

const bodySchema = z.object({ amount: z.number().positive().max(1e9), method: z.enum(["cash", "card"]) });

/** PATCH { amount, method }: what a repayment brought (its income follows). */
export const PATCH = withBalanceGuard(async function patch(req: NextRequest, { params }: Params) {
  const { id, repaymentId } = await params;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const loan = await getLoan(id);
  const current = loan?.repayments.find((r) => r.id === repaymentId);
  if (!loan || !current) return NextResponse.json({ error: "Remboursement introuvable." }, { status: 404 });
  const amount = Math.round(parsed.data.amount * 100) / 100;
  const max = loanState(loan, todayMonth()).remaining + current.amount;
  if (amount > max + 0.005) {
    return NextResponse.json({ error: `Il ne reste que ${formatMoney(max)} à te rendre.` }, { status: 400 });
  }
  const repayment = await updateRepayment(id, repaymentId, { amount, method: parsed.data.method });
  return NextResponse.json(repayment);
});

/** Undo a repayment (its income goes with it). */
export const DELETE = withBalanceGuard(async function remove(_req: NextRequest, { params }: Params) {
  const { id, repaymentId } = await params;
  const ok = await cancelRepayment(id, repaymentId);
  if (!ok) return NextResponse.json({ error: "Remboursement introuvable." }, { status: 404 });
  return NextResponse.json({ ok: true });
});
