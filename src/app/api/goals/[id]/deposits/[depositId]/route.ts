import { NextResponse } from "next/server";
import { deleteGoalDeposit } from "@/lib/repository";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; depositId: string }> }) {
  const { id, depositId } = await params;
  const ok = await deleteGoalDeposit(id, depositId);
  if (!ok) return NextResponse.json({ error: "Versement introuvable." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
