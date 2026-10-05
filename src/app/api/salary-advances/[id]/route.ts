import { NextResponse } from "next/server";
import { deleteSalaryAdvance } from "@/lib/repository";
import { withBalanceGuard } from "@/lib/balance-guard";

export const DELETE = withBalanceGuard(async function remove(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ok = await deleteSalaryAdvance(id);
  if (!ok) return NextResponse.json({ error: "Avance introuvable." }, { status: 404 });
  return NextResponse.json({ ok: true });
});
