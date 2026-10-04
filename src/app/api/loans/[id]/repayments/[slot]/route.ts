import { NextResponse, type NextRequest } from "next/server";
import { cancelRepayment } from "@/lib/loans-repo";

/** Undo a received installment (its income goes with it). */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; slot: string }> }) {
  const { id, slot } = await params;
  const ok = await cancelRepayment(id, Number(slot));
  if (!ok) return NextResponse.json({ error: "Remboursement introuvable." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
