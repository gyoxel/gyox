// Budgets: the most to spend in a category a month (e.g. Alimentation,
// 2 000 DH). Nothing is taken from the Solde: the month's expenses in the
// category add up against it, as Dépenses shows them — green, orange from
// 80%, red once gone past. Pure (no DB access).
import { monthKey, type MonthId } from "./date";
import { findPayment, getMonthPaymentStatus, getMonthSummary } from "./engine";
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

/** What an expense costs in `month`, as Dépenses shows it: paid, what it
 *  really cost; else the month's amount (part of it maybe paid). */
export function monthCost(expense: Expense, amount: number, month: MonthId, payments: Payment[], current: MonthId): number {
  const paid = findPayment(payments, expense.id, monthKey(month))?.amountPaid ?? 0;
  return paid > 0 && getMonthPaymentStatus(expense, month, payments, current) === "paid" ? paid : amount;
}

const round = (n: number) => Math.round(n * 100) / 100;

/** Each category's spending in `month`, credits aside (as in Dépenses). */
export function spentByCategory(expenses: Expense[], payments: Payment[], month: MonthId, current: MonthId): Map<string, number> {
  const out = new Map<string, number>();
  for (const o of getMonthSummary(expenses, month, 0).occurrences) {
    const e = o.expense;
    if (e.type === "credit" || !e.categoryId) continue;
    out.set(e.categoryId, round((out.get(e.categoryId) ?? 0) + monthCost(e, o.amount, month, payments, current)));
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
  current: MonthId,
): CategoryBudget[] {
  const spent = spentByCategory(expenses, payments, month, current);
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
