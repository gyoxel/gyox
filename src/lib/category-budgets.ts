// Budgets: the most to spend in a category a month (e.g. Alimentation,
// 2 000 DH). Nothing is taken from the Solde: what was paid for the month's
// expenses in the category adds up against it (an expense not ticked yet
// takes nothing) — green, orange from 80%, red once gone past. Pure (no DB
// access).
import { monthKey, type MonthId } from "./date";
import { findPayment, getMonthSummary } from "./engine";
import type { Category, Expense, Payment } from "./types";

/** From this share of its budget on, a category is close to it. */
export const NEAR_SHARE = 0.8;

export type BudgetLevel = "ok" | "near" | "over";

export function budgetLevel(spent: number, budget: number): BudgetLevel {
  if (spent > budget + 0.005) return "over";
  return spent >= budget * NEAR_SHARE ? "near" : "ok";
}

/** Spent of the budget, in %, rounded (past it: over 100). */
export const budgetPercent = (spent: number, budget: number) => (budget > 0 ? Math.round((spent / budget) * 100) : 0);

/** What was paid for an expense in `month` (in part, or nothing yet). */
export function monthPaid(expense: Expense, month: MonthId, payments: Payment[]): number {
  return Math.max(0, findPayment(payments, expense.id, monthKey(month))?.amountPaid ?? 0);
}

const round = (n: number) => Math.round(n * 100) / 100;

/** What each category has paid in `month`, credits aside. */
export function spentByCategory(expenses: Expense[], payments: Payment[], month: MonthId): Map<string, number> {
  const out = new Map<string, number>();
  for (const o of getMonthSummary(expenses, month, 0).occurrences) {
    const e = o.expense;
    if (e.type === "credit" || !e.categoryId) continue;
    const paid = monthPaid(e, month, payments);
    if (paid > 0) out.set(e.categoryId, round((out.get(e.categoryId) ?? 0) + paid));
  }
  return out;
}

export interface CategoryBudget {
  category: Category;
  budget: number;
  spent: number;
  level: BudgetLevel;
}

/** The categories with a budget and what's spent of it in `month`, in the
 *  categories' order. */
export function categoryBudgets(
  categories: Category[],
  expenses: Expense[],
  payments: Payment[],
  month: MonthId,
): CategoryBudget[] {
  const spent = spentByCategory(expenses, payments, month);
  return categories
    .filter((c) => (c.budget ?? 0) > 0)
    .map((c) => {
      const budget = c.budget!;
      const amount = spent.get(c.id) ?? 0;
      return { category: c, budget, spent: amount, level: budgetLevel(amount, budget) };
    });
}

/** Category id → its budget, for the pages that show them beside amounts. */
export const budgetsById = (categories: Category[]): Record<string, number> =>
  Object.fromEntries(categories.filter((c) => (c.budget ?? 0) > 0).map((c) => [c.id, c.budget!]));
