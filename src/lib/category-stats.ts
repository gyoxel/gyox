// Where the money goes: a month's expenses grouped by category, against
// the month before. Expenses the app makes itself are grouped by what made
// them (Épargne, Darets, Dettes, Budgets, Argent prêté) rather than lost in
// "Sans catégorie". Pure (no DB access).
import { addMonths, type MonthId } from "./date";
import { getMonthSummary } from "./engine";
import { displayIcon } from "./category";
import { msg } from "./i18n";
import type { BudgetMonth, BudgetWithExpense, Category, DaretWithExpense, Expense, Goal, Loan, SavingsMove } from "./types";

export interface CategorySlice {
  /** A category's id, or the group's key ("savings", "debts"…). */
  key: string;
  /** The category's name as the user has it, or (`own` false) the app's
   *  French word, to translate where it's shown. */
  label: string;
  own: boolean;
  emoji: string;
  amount: number;
  /** The same group the month before. */
  previous: number;
  /** What it's made of, the largest first. */
  items: { id: string; name: string; icon: string; amount: number }[];
}

const GROUPS = {
  savings: { label: msg("Épargne"), emoji: "🐷" },
  darets: { label: msg("Darets"), emoji: "🤝🏻" },
  debts: { label: msg("Dettes"), emoji: "🏦" },
  budgets: { label: msg("Budgets"), emoji: "👛" },
  loans: { label: msg("Argent prêté"), emoji: "💸" },
  none: { label: msg("Sans catégorie"), emoji: "🏷️" },
} as const;

export interface CategoryStatsInput {
  expenses: Expense[];
  categories: Category[];
  darets: DaretWithExpense[];
  savingsMoves: SavingsMove[];
  goals: Goal[];
  budgets: BudgetWithExpense[];
  budgetMonths: BudgetMonth[];
  loans: Loan[];
}

const round = (n: number) => Math.round(n * 100) / 100;

/** The groups of `month`, the largest first (empty ones left out). */
export function categoryBreakdown(input: CategoryStatsInput, month: MonthId): CategorySlice[] {
  const made = new Map<string, keyof typeof GROUPS>();
  for (const m of input.savingsMoves) if (m.expenseId) made.set(m.expenseId, "savings");
  for (const g of input.goals) for (const d of g.deposits) if (d.expenseId) made.set(d.expenseId, "savings");
  for (const d of input.darets) made.set(d.expenseId, "darets");
  for (const b of input.budgets) made.set(b.expenseId, "budgets");
  for (const m of input.budgetMonths) if (m.overflowExpenseId) made.set(m.overflowExpenseId, "budgets");
  for (const l of input.loans) if (l.expenseId) made.set(l.expenseId, "loans");

  const categories = new Map(input.categories.map((c) => [c.id, c]));
  const emojiById = new Map(input.categories.map((c) => [c.id, c.emoji]));
  const keyOf = (e: Expense): string => {
    const group = made.get(e.id);
    if (group) return group;
    if (e.type === "credit") return "debts";
    if (e.categoryId && categories.has(e.categoryId)) return e.categoryId;
    return "none";
  };

  const totals = (m: MonthId) => {
    const out = new Map<string, { amount: number; items: CategorySlice["items"] }>();
    for (const o of getMonthSummary(input.expenses, m, 0).occurrences) {
      if (!(o.amount > 0)) continue;
      const key = keyOf(o.expense);
      const slot = out.get(key) ?? { amount: 0, items: [] };
      slot.amount += o.amount;
      slot.items.push({ id: o.expense.id, name: o.expense.name, icon: displayIcon(o.expense, emojiById), amount: o.amount });
      out.set(key, slot);
    }
    return out;
  };

  const now = totals(month);
  const before = totals(addMonths(month, -1));
  return [...now.entries()]
    .map(([key, { amount, items }]) => {
      const category = categories.get(key);
      const group = GROUPS[key as keyof typeof GROUPS];
      return {
        key,
        label: category?.name ?? group.label,
        own: category != null,
        emoji: category?.emoji ?? group.emoji,
        amount: round(amount),
        previous: round(before.get(key)?.amount ?? 0),
        items: items.sort((a, b) => b.amount - a.amount),
      };
    })
    .sort((a, b) => b.amount - a.amount);
}
