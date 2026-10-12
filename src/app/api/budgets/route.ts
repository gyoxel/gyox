import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createBudget } from "@/lib/budgets-repo";
import { budgetSchema, toBudgetInput } from "@/lib/budget-input";
import { payExpense } from "@/lib/pay-expense";
import { monthKey, todayMonth } from "@/lib/date";
import { withBalanceGuard } from "@/lib/balance-guard";

const createSchema = budgetSchema.extend({
  /** Taken now (this month's amount leaves the Solde). */
  paid: z.object({ method: z.enum(["cash", "card"]) }).optional(),
});

/** POST { name, emoji, amount, recurrence, paid? }: a new budget, from this month. */
export const POST = withBalanceGuard(async function post(req: NextRequest) {
  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const budget = await createBudget(toBudgetInput(parsed.data));
  if (parsed.data.paid) {
    const paid = await payExpense(budget.expenseId, monthKey(todayMonth()), parsed.data.paid.method);
    // Refused (not enough money): the budget is kept, not taken.
    if ("error" in paid) return NextResponse.json({ ...budget, problems: ["paid"] }, { status: 201 });
  }
  return NextResponse.json(budget, { status: 201 });
});
