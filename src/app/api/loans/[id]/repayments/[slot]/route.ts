import { NextResponse, type NextRequest } from "next/server";
import { cancelRepayment } from "@/lib/loans-repo";
import { withBalanceGuard } from "@/lib/balance-guard";

/** Undo a received installment (its income goes with it). */
export const DELETE = withBalanceGuard(async function remove(_req: NextRequest, { params }: { params: Promise<{ id: string; slot: string }> }) {
  const { id, slot } = await params;
  const ok = await cancelRepayment(id, Number(slot));
  if (!ok) return NextResponse.json({ error: "Remboursement introuvable." }, { status: 404 });
  return NextResponse.json({ ok: true });
});
