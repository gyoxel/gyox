import { NextResponse, type NextRequest } from "next/server";
import { deleteLoan, getLoan, updateLoan } from "@/lib/loans-repo";
import { loanInputSchema, toLoanInput } from "@/lib/loan-input";
import { withBalanceGuard } from "@/lib/balance-guard";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const loan = await getLoan((await params).id);
  if (!loan) return NextResponse.json({ error: "Prêt introuvable." }, { status: 404 });
  return NextResponse.json(loan);
}

export const PATCH = withBalanceGuard(async function patch(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const parsed = loanInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const input = toLoanInput(parsed.data);
  if (typeof input === "string") return NextResponse.json({ error: input }, { status: 400 });
  const loan = await getLoan(id);
  if (!loan) return NextResponse.json({ error: "Prêt introuvable." }, { status: 404 });
  const lastReceived = Math.max(0, ...loan.repayments.map((r) => r.slot));
  if (input.months < lastReceived) {
    return NextResponse.json(
      { error: `Déjà ${lastReceived} remboursements reçus : le plan doit en garder au moins autant.` },
      { status: 400 },
    );
  }
  return NextResponse.json(await updateLoan(id, input));
});

export const DELETE = withBalanceGuard(async function remove(_req: NextRequest, { params }: Params) {
  const gone = await deleteLoan((await params).id);
  if (!gone) return NextResponse.json({ error: "Prêt introuvable." }, { status: 404 });
  return NextResponse.json({ ok: true, gone });
});
