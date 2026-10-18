import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getLoan, receiveRepayment } from "@/lib/loans-repo";
import { loanState } from "@/lib/loans";
import { todayMonth } from "@/lib/date";
import { formatMoney } from "@/lib/utils";
import { withBalanceGuard } from "@/lib/balance-guard";

const bodySchema = z.object({
  slot: z.number().int().positive(),
  method: z.enum(["cash", "card"]),
  /** What was given (default: what's expected that month). */
  amount: z.number().positive().max(1e9).optional(),
});

/** POST { slot, method, amount? }: installment received (an income in Revenus). */
export const POST = withBalanceGuard(async function post(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const id = (await params).id;
  const amount = parsed.data.amount != null ? Math.round(parsed.data.amount * 100) / 100 : undefined;
  if (amount != null) {
    const loan = await getLoan(id);
    const remaining = loan ? loanState(loan, todayMonth()).remaining : 0;
    if (amount > remaining + 0.005) {
      return NextResponse.json({ error: `Il ne reste que ${formatMoney(remaining)} à te rendre.` }, { status: 400 });
    }
  }
  const repayment = await receiveRepayment(id, parsed.data.slot, parsed.data.method, amount);
  if (!repayment) return NextResponse.json({ error: "Ce mois n'attend plus rien." }, { status: 400 });
  return NextResponse.json(repayment, { status: 201 });
});
