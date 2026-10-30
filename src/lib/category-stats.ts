// Where the money went: what a month's expenses really cost — what was paid
// for them, not what was planned — grouped by category, against the month
// before. Expenses the app makes itself are grouped by what made them
// (Épargne, Darets, Dettes, Argent prêté) rather than lost in "Sans
// catégorie". Pure (no DB access).
import { addMonths, dayOf, monthKey, type MonthId } from "./date";
import { displayIcon } from "./category";
import { msg } from "./i18n";
import type { Category, DaretWithExpense, Expense, Goal, Loan, Payment, SavingsMove } from "./types";

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

/** What the app makes itself, grouped by what made it (also the Solde's
 *  history filter). */
export const GROUPS = {
  savings: { label: msg("Épargne"), emoji: "🐷" },
  darets: { label: msg("Darets"), emoji: "🤝🏻" },
  debts: { label: msg("Dettes"), emoji: "🏦" },
  loans: { label: msg("Argent prêté"), emoji: "💸" },
  none: { label: msg("Sans catégorie"), emoji: "🏷️" },
} as const;

export interface CategoryStatsInput {
  expenses: Expense[];
  payments: Payment[];
  categories: Category[];
  darets: DaretWithExpense[];
  savingsMoves: SavingsMove[];
  goals: Goal[];
  loans: Loan[];
}

const round = (n: number) => Math.round(n * 100) / 100;

/** The groups of `month`, the largest first (empty ones left out). */
export function categoryBreakdown(input: CategoryStatsInput, month: MonthId): CategorySlice[] {
  const made = new Map<string, keyof typeof GROUPS>();
  for (const m of input.savingsMoves) if (m.expenseId) made.set(m.expenseId, "savings");
  for (const g of input.goals) for (const d of g.deposits) if (d.expenseId) made.set(d.expenseId, "savings");
  for (const d of input.darets) made.set(d.expenseId, "darets");
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

  const byId = new Map(input.expenses.map((e) => [e.id, e]));
  const totals = (m: MonthId) => {
    const key = monthKey(m);
    // Paid for the month (a debt's installment: paid during it). Nothing
    // ticked, nothing counted: an expense to pay, a debt not repaid yet.
    const paid = new Map<string, number>();
    for (const p of input.payments) {
      if (!(p.amountPaid > 0) || !byId.has(p.expenseId)) continue;
      if (p.monthKey === key || (p.monthKey == null && dayOf(p.paidAt).startsWith(key))) paid.set(p.expenseId, (paid.get(p.expenseId) ?? 0) + p.amountPaid);
    }
    const out = new Map<string, { amount: number; items: CategorySlice["items"] }>();
    for (const [id, total] of paid) {
      const expense = byId.get(id)!;
      // Money lent: only what hasn't come back (its expense's amount, as
      // the Solde counts it).
      const amount = round(made.get(id) === "loans" ? Math.min(total, expense.amount) : total);
      if (!(amount > 0)) continue;
      const group = keyOf(expense);
      const slot = out.get(group) ?? { amount: 0, items: [] };
      slot.amount += amount;
      slot.items.push({ id, name: expense.name, icon: displayIcon(expense, emojiById), amount });
      out.set(group, slot);
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
