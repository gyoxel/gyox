// Budgets: what a month of a budget looks like. Pure (no DB access).
//
// A budget's expense carries its amount: ticked, the whole amount leaves the
// Solde at once, so what's noted inside it (20 DH of taxi…) doesn't count
// again. Past the amount, the difference is spent for real: one expense
// "<name> +" for the month, growing with each line. What's left once the
// month is over comes back as an income "<name> - Reste" on the 1st of the
// next month (only if the budget was taken: else nothing left the Solde).
import { addMonths, compareMonths, monthKey as toMonthKey, parseMonthKey } from "./date";
import { getOccurrenceForMonth } from "./engine";
import type { BudgetEntry, Expense, Payment, PaymentMethod } from "./types";

const round2 = (n: number) => Math.round(n * 100) / 100;

export const overflowName = (name: string) => `${name} +`;
export const resteName = (name: string) => `${name} - Reste`;
/** Income category of what's left of a budget (lib/income.ts). */
export const RESTE_CATEGORY = "budget";

export interface BudgetMonthState {
  monthKey: string;
  /** The month's budget: what was taken, else what's planned; 0: none that month. */
  amount: number;
  /** Ticked in Dépenses: the amount left the Solde. */
  taken: boolean;
  takenMethod: PaymentMethod | null;
  spent: number;
  /** Still in the budget. */
  left: number;
  /** Spent past it: the month's expense "<name> +". */
  over: number;
  /** How / when the overflow is paid: the month's last line's. */
  overMethod: PaymentMethod;
  overDate: string | null;
  /** The month is over. */
  closed: boolean;
  /** Comes back as an income the next month (closed and taken only). */
  reste: number;
}

/** Lines of `monthKey`, oldest first. */
export function entriesOf(entries: BudgetEntry[], monthKey: string): BudgetEntry[] {
  return entries
    .filter((e) => e.date.startsWith(monthKey))
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
}

/** The planned budget of a month (0: the budget doesn't run that month). */
export function plannedAmount(expense: Expense, monthKey: string): number {
  return getOccurrenceForMonth(expense, parseMonthKey(monthKey), new Map())?.amount ?? 0;
}

/**
 * One month of a budget. `entries`: the budget's lines; `payments`: its
 * expense's; `currentMonthKey`: this month ("YYYY-MM").
 */
export function budgetMonthState(
  expense: Expense,
  entries: BudgetEntry[],
  payments: Payment[],
  monthKey: string,
  currentMonthKey: string,
): BudgetMonthState {
  const payment = payments.find((p) => p.expenseId === expense.id && p.monthKey === monthKey && p.amountPaid > 0);
  const amount = payment ? payment.amountPaid : plannedAmount(expense, monthKey);
  const lines = entriesOf(entries, monthKey);
  const spent = round2(lines.reduce((s, e) => s + e.amount, 0));
  const last = lines[lines.length - 1];
  const left = round2(Math.max(0, amount - spent));
  const closed = compareMonths(parseMonthKey(monthKey), parseMonthKey(currentMonthKey)) < 0;
  return {
    monthKey,
    amount,
    taken: payment != null,
    takenMethod: payment?.method ?? null,
    spent,
    left,
    over: round2(Math.max(0, spent - amount)),
    overMethod: last?.method ?? "cash",
    overDate: last?.date ?? null,
    closed,
    reste: closed && payment ? left : 0,
  };
}

/** The months a budget has something in: lines, ticks, or a linked expense / income. */
export function budgetMonthKeys(expenseId: string, entries: BudgetEntry[], payments: Payment[], monthKeys: string[]): string[] {
  const keys = new Set<string>(monthKeys);
  for (const e of entries) keys.add(e.date.slice(0, 7));
  for (const p of payments) if (p.expenseId === expenseId && p.monthKey) keys.add(p.monthKey);
  return [...keys].sort();
}

/** "YYYY-MM-01" of the month after `monthKey`: when its rest comes back. */
export function resteDate(monthKey: string): string {
  return `${toMonthKey(addMonths(parseMonthKey(monthKey), 1))}-01`;
}
