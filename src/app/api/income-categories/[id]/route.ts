import { NextRequest, NextResponse } from "next/server";
import { deleteIncomeCategory, updateIncomeCategory } from "@/lib/income-categories-repo";
import { categoryInputSchema } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const parsed = categoryInputSchema.partial().safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const updated = await updateIncomeCategory((await params).id, parsed.data);
  if (!updated) return NextResponse.json({ error: "Catégorie introuvable." }, { status: 404 });
  return NextResponse.json(updated);
}

/** Its incomes move to "Autre" (which can't be deleted). */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const ok = await deleteIncomeCategory((await params).id);
  if (!ok) return NextResponse.json({ error: "Suppression impossible." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
