import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { receiveRepayment } from "@/lib/loans-repo";
import { withBalanceGuard } from "@/lib/balance-guard";

const bodySchema = z.object({ slot: z.number().int().positive(), method: z.enum(["cash", "card"]) });

/** POST { slot, method }: installment received (an income in Revenus). */
export const POST = withBalanceGuard(async function post(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const repayment = await receiveRepayment((await params).id, parsed.data.slot, parsed.data.method);
  if (!repayment) return NextResponse.json({ error: "Remboursement introuvable ou déjà reçu." }, { status: 400 });
  return NextResponse.json(repayment, { status: 201 });
});
