import { NextResponse, type NextRequest } from "next/server";
import { deleteBudgetEntry, getBudget, outsideBudget, updateBudgetEntry } from "@/lib/budgets-repo";
import { budgetEntrySchema } from "@/lib/budget-input";
import { withBalanceGuard } from "@/lib/balance-guard";

type Params = { params: Promise<{ id: string; entryId: string }> };

/** PATCH { date, amount, note, method }: edits a line. */
export const PATCH = withBalanceGuard(async function patch(req: NextRequest, { params }: Params) {
  const { id, entryId } = await params;
  const parsed = budgetEntrySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const budget = await getBudget(id);
  if (!budget) return NextResponse.json({ error: "Budget introuvable." }, { status: 404 });
  const refused = await outsideBudget(budget.expense, parsed.data.date);
  if (refused) return NextResponse.json({ error: refused }, { status: 400 });
  const entry = await updateBudgetEntry(id, entryId, { ...parsed.data, amount: Math.round(parsed.data.amount * 100) / 100 });
  if (!entry) return NextResponse.json({ error: "Ligne introuvable." }, { status: 404 });
  return NextResponse.json(entry);
});

export const DELETE = withBalanceGuard(async function remove(_req: NextRequest, { params }: Params) {
  const { id, entryId } = await params;
  if (!(await deleteBudgetEntry(id, entryId))) return NextResponse.json({ error: "Ligne introuvable." }, { status: 404 });
  return NextResponse.json({ ok: true });
});
