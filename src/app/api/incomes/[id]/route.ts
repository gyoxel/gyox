import { NextResponse, type NextRequest } from "next/server";
import { deleteIncome, updateIncome } from "@/lib/repository";
import { incomeInputSchema } from "@/lib/validation";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = incomeInputSchema.partial().safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const income = await updateIncome(id, parsed.data);
  if (!income) return NextResponse.json({ error: "Revenu introuvable." }, { status: 404 });
  return NextResponse.json(income);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ok = await deleteIncome(id);
  if (!ok) return NextResponse.json({ error: "Revenu introuvable." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
