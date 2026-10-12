import { NextResponse, type NextRequest } from "next/server";
import { deleteBudget, updateBudget } from "@/lib/budgets-repo";
import { budgetSchema, toBudgetInput } from "@/lib/budget-input";
import { withBalanceGuard } from "@/lib/balance-guard";

type Params = { params: Promise<{ id: string }> };

/** PATCH { name, emoji, amount, recurrence }: edits the budget; its months follow. */
export const PATCH = withBalanceGuard(async function patch(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const parsed = budgetSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const budget = await updateBudget(id, toBudgetInput(parsed.data));
  if (!budget) return NextResponse.json({ error: "Budget introuvable." }, { status: 404 });
  return NextResponse.json(budget);
});

/** Deletes the budget, its lines, its months' "+" expenses and "- Reste" incomes. */
export const DELETE = withBalanceGuard(async function remove(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const gone = await deleteBudget(id);
  if (!gone) return NextResponse.json({ error: "Budget introuvable." }, { status: 404 });
  return NextResponse.json({ ok: true, gone });
});
