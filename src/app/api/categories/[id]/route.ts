import { NextRequest, NextResponse } from "next/server";
import { deleteCategory, updateCategory } from "@/lib/repository";
import { categoryInputSchema } from "@/lib/validation";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const parsed = categoryInputSchema.partial().safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const updated = await updateCategory(id, parsed.data);
  if (!updated) return NextResponse.json({ error: "Catégorie introuvable." }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const ok = await deleteCategory(id);
  if (!ok) return NextResponse.json({ error: "Catégorie introuvable." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
