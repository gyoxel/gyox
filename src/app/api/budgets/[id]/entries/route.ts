import { NextResponse, type NextRequest } from "next/server";
import { addBudgetEntry, getBudget, outsideBudget } from "@/lib/budgets-repo";
import { budgetEntrySchema } from "@/lib/budget-input";
import { withBalanceGuard } from "@/lib/balance-guard";

type Params = { params: Promise<{ id: string }> };

/** POST { date, amount, note, method }: a line spent from the budget. */
export const POST = withBalanceGuard(async function post(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const parsed = budgetEntrySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const budget = await getBudget(id);
  if (!budget) return NextResponse.json({ error: "Budget introuvable." }, { status: 404 });
  const refused = await outsideBudget(budget.expense, parsed.data.date);
  if (refused) return NextResponse.json({ error: refused }, { status: 400 });
  const entry = await addBudgetEntry(id, { ...parsed.data, amount: Math.round(parsed.data.amount * 100) / 100 });
  return NextResponse.json(entry, { status: 201 });
});
