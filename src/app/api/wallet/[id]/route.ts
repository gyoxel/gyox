import { NextResponse } from "next/server";
import { deleteWalletOp } from "@/lib/repository";
import { withBalanceGuard } from "@/lib/balance-guard";

export const DELETE = withBalanceGuard(async function remove(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ok = await deleteWalletOp(id);
  if (!ok) return NextResponse.json({ error: "Opération introuvable." }, { status: 404 });
  return NextResponse.json({ ok: true });
});
