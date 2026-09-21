import { NextRequest, NextResponse } from "next/server";
import { deleteExpense, getExpenseById, updateExpense } from "@/lib/repository";
import { expenseInputSchema, partialExpenseSchema } from "@/lib/validation";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const expense = getExpenseById(id);
  if (!expense) return NextResponse.json({ error: "Dépense introuvable." }, { status: 404 });
  return NextResponse.json(expense);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const existing = getExpenseById(id);
  if (!existing) return NextResponse.json({ error: "Dépense introuvable." }, { status: 404 });

  const body = await req.json();
  const partialParsed = partialExpenseSchema.safeParse(body);
  if (!partialParsed.success) {
    return NextResponse.json({ error: partialParsed.error.flatten() }, { status: 400 });
  }

  const merged = { ...existing, ...partialParsed.data };
  const fullParsed = expenseInputSchema.safeParse(merged);
  if (!fullParsed.success) {
    return NextResponse.json({ error: fullParsed.error.flatten() }, { status: 400 });
  }

  const updated = updateExpense(id, fullParsed.data);
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const ok = deleteExpense(id);
  if (!ok) return NextResponse.json({ error: "Dépense introuvable." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
