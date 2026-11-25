import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity";
import { deleteWalletOp, getAllWalletOps } from "@/lib/repository";
import { withBalanceGuard } from "@/lib/balance-guard";

export const DELETE = withBalanceGuard(async function remove(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const before = (await getAllWalletOps()).find((o) => o.id === id);
  const ok = await deleteWalletOp(id);
  if (!ok) return NextResponse.json({ error: "Opération introuvable." }, { status: 404 });
  if (before) await logActivity({ kind: before.kind, action: "delete", name: before.note || (before.kind === "transfer" ? "Transfert" : "Ajustement du solde"), amount: before.amount, detail: before.toAccount });
  return NextResponse.json({ ok: true });
});
