import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity";
import { deleteSalaryAdvance, getAllSalaryAdvances } from "@/lib/repository";
import { withBalanceGuard } from "@/lib/balance-guard";

export const DELETE = withBalanceGuard(async function remove(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const before = (await getAllSalaryAdvances()).find((a) => a.id === id);
  const ok = await deleteSalaryAdvance(id);
  if (!ok) return NextResponse.json({ error: "Avance introuvable." }, { status: 404 });
  if (before) await logActivity({ kind: "advance", action: "delete", name: "Avance sur salaire", amount: before.amount, detail: before.method });
  return NextResponse.json({ ok: true });
});
