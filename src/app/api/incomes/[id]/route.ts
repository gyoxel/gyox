import { NextResponse, type NextRequest } from "next/server";
import { deleteIncome, getIncomeById, updateIncome } from "@/lib/repository";
import { getSavingsMoveOfIncome } from "@/lib/savings-repo";
import { getLoanOfIncome } from "@/lib/loans-repo";
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
  const income = await getIncomeById(id);
  if (income?.expenseId) return NextResponse.json({ error: "Ce revenu vient d'un crédit : supprime le crédit." }, { status: 409 });
  const [move, loan] = await Promise.all([getSavingsMoveOfIncome(id), getLoanOfIncome(id)]);
  if (move) return NextResponse.json({ error: "Ce revenu vient de l'épargne : supprime-le depuis l'épargne." }, { status: 409 });
  if (loan) return NextResponse.json({ error: "Ce revenu est un remboursement de prêt : annule-le depuis le prêt." }, { status: 409 });
  const ok = await deleteIncome(id);
  if (!ok) return NextResponse.json({ error: "Revenu introuvable." }, { status: 404 });
  return NextResponse.json({ ok: true, gone: [`/incomes/${id}`] });
}
