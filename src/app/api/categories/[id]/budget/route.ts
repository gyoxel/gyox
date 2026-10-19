import { NextRequest, NextResponse } from "next/server";
import { setCategoryBudget } from "@/lib/repository";
import { categoryBudgetSchema } from "@/lib/validation";

interface Params {
  params: Promise<{ id: string }>;
}

/** Sets the category's budget (the most to spend in it a month). */
export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const parsed = categoryBudgetSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  if (!(await setCategoryBudget(id, parsed.data.amount))) return NextResponse.json({ error: "Catégorie introuvable." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

/** No budget for it any more (the category and its expenses stay). */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  if (!(await setCategoryBudget(id, null))) return NextResponse.json({ error: "Catégorie introuvable." }, { status: 404 });
  return NextResponse.json({ ok: true, gone: [`/budgets/${id}`] });
}
