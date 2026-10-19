// Money put aside every month — into the Épargne, or for a goal. Its
// expense comes back each month in Dépenses ("Chaque mois"), and every month
// ticked there is put aside: what's put aside is what was paid, month by
// month. Stopped, it ends on its last month (earlier months stay). Pure.
import { addMonths, compareMonths, monthKey, monthOfDateStr, type MonthId } from "./date";
import { getEffectiveEndMonth } from "./engine";
import type { Expense, Payment, PaymentMethod } from "./types";

const round = (n: number) => Math.round(n * 100) / 100;

/** Everything paid of an expense (each month ticked). */
export function paidTotal(expenseId: string | null | undefined, payments: Payment[]): number {
  if (!expenseId) return 0;
  return round(payments.filter((p) => p.expenseId === expenseId && p.amountPaid > 0).reduce((s, p) => s + p.amountPaid, 0));
}

export interface MonthlyPlan {
  /** What each month puts aside now. */
  amount: number;
  /** "YYYY-MM": its first month. */
  since: string;
  /** "YYYY-MM": stopped, its last month. */
  until: string | null;
  /** Every month ticked, the oldest first. */
  paid: { monthKey: string; amount: number; method: PaymentMethod | null; paidAt: string }[];
  total: number;
  /** Still coming back each month (not stopped). */
  running: boolean;
  /** This month counts and isn't ticked yet. */
  dueNow: boolean;
}

export function monthlyPlan(expense: Expense, payments: Payment[], current: MonthId): MonthlyPlan {
  const since = monthOfDateStr(expense.startDate);
  const end = expense.type === "permanent" ? null : getEffectiveEndMonth(expense, new Map());
  const byMonth = new Map<string, MonthlyPlan["paid"][number]>();
  for (const p of payments) {
    if (p.expenseId !== expense.id || !(p.amountPaid > 0) || !p.monthKey) continue;
    const slot = byMonth.get(p.monthKey);
    if (slot) {
      slot.amount = round(slot.amount + p.amountPaid);
      if (p.paidAt > slot.paidAt) Object.assign(slot, { paidAt: p.paidAt, method: p.method ?? slot.method });
    } else {
      byMonth.set(p.monthKey, { monthKey: p.monthKey, amount: p.amountPaid, method: p.method ?? null, paidAt: p.paidAt });
    }
  }
  const paid = [...byMonth.values()].sort((a, b) => a.monthKey.localeCompare(b.monthKey));
  const thisMonthCounts = compareMonths(since, current) <= 0 && (end == null || compareMonths(end, current) >= 0);
  return {
    amount: expense.amount,
    since: monthKey(since),
    until: end ? monthKey(end) : null,
    paid,
    total: round(paid.reduce((s, m) => s + m.amount, 0)),
    running: end == null && expense.active,
    dueNow: thisMonthCounts && expense.active && !byMonth.has(monthKey(current)),
  };
}

/** Where a stopped plan ends: this month if it's ticked already, else the
 *  month before. Null: it never put anything aside (nothing to keep). */
export function stopMonth(
  expense: Pick<Expense, "id" | "startDate">,
  payments: Pick<Payment, "expenseId" | "monthKey" | "amountPaid">[],
  current: MonthId,
): MonthId | null {
  if (!payments.some((p) => p.expenseId === expense.id && p.amountPaid > 0)) return null;
  const thisMonth = payments.some((p) => p.expenseId === expense.id && p.monthKey === monthKey(current) && p.amountPaid > 0);
  const last = thisMonth ? current : addMonths(current, -1);
  return compareMonths(last, monthOfDateStr(expense.startDate)) < 0 ? null : last;
}
