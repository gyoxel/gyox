// Pure calculation engine. No DB access here — everything is derived from
// the expense list + settings so that changing any input automatically
// recalculates every dependent number. Nothing is ever hardcoded per-month.
import {
  type MonthId,
  addMonths,
  compareMonths,
  monthKey,
  monthLabelFr,
  monthOfDateStr,
  parseMonthKey,
} from "./date";
import type { CreditProgress, Expense, MonthSummary, MonthlyOccurrence } from "./types";

interface CreditScheduleEntry {
  monthKey: string;
  remainingBefore: number;
  payment: number;
  remainingAfter: number;
}

const SAFETY_MONTHS_CAP = 1200; // 100 years, prevents runaway loops

/**
 * Computes the full month-by-month payoff schedule for a credit from its
 * start date until the remaining balance reaches zero. The final payment is
 * automatically capped to whatever balance remains (never goes negative).
 */
export function computeCreditSchedule(expense: Expense): CreditScheduleEntry[] {
  if (expense.type !== "credit" || expense.creditInitialAmount == null) return [];
  if (expense.creditInitialAmount <= 0) return [];
  if (expense.amount <= 0) return [];

  const schedule: CreditScheduleEntry[] = [];
  let remaining = expense.creditInitialAmount;
  let m = monthOfDateStr(expense.startDate);
  let guard = 0;

  while (remaining > 0.005 && guard < SAFETY_MONTHS_CAP) {
    const payment = Math.min(expense.amount, remaining);
    const remainingAfter = Math.max(0, round2(remaining - payment));
    schedule.push({
      monthKey: monthKey(m),
      remainingBefore: round2(remaining),
      payment: round2(payment),
      remainingAfter,
    });
    remaining = remainingAfter;
    m = addMonths(m, 1);
    guard++;
  }

  return schedule;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function getCreditEndMonth(expense: Expense): MonthId | null {
  const schedule = computeCreditSchedule(expense);
  if (schedule.length === 0) return null;
  return parseMonthKey(schedule[schedule.length - 1].monthKey);
}

/**
 * The effective end month of an expense: for a credit it's calculated from
 * the payoff schedule; for an expense linked to another one (e.g. Zineb
 * ending with Dnya) it follows the linked expense; otherwise it's the
 * expense's own endDate (or null = permanent / never ends).
 */
export function getEffectiveEndMonth(
  expense: Expense,
  byId: Map<string, Expense>,
  seen: Set<string> = new Set(),
): MonthId | null {
  if (seen.has(expense.id)) return null; // guard against circular links
  seen.add(expense.id);

  if (expense.type === "credit") return getCreditEndMonth(expense);
  if (expense.frequency === "one-time") return monthOfDateStr(expense.startDate);
  if (expense.linkedExpenseId) {
    const linked = byId.get(expense.linkedExpenseId);
    if (linked) return getEffectiveEndMonth(linked, byId, seen);
  }
  if (expense.endDate) return monthOfDateStr(expense.endDate);
  return null;
}

export function getOccurrenceForMonth(
  expense: Expense,
  m: MonthId,
  byId: Map<string, Expense>,
): MonthlyOccurrence | null {
  if (!expense.active) return null;

  const start = monthOfDateStr(expense.startDate);
  if (compareMonths(m, start) < 0) return null;

  if (expense.type === "credit") {
    const schedule = computeCreditSchedule(expense);
    const entry = schedule.find((e) => e.monthKey === monthKey(m));
    if (!entry || entry.payment <= 0) return null;
    return {
      expense,
      amount: entry.payment,
      remainingAfter: entry.remainingAfter,
      isFinalCreditPayment: entry.remainingAfter === 0,
    };
  }

  if (expense.frequency === "one-time") {
    return compareMonths(m, start) === 0 ? { expense, amount: expense.amount } : null;
  }

  // Recurring monthly expense (permanent, or temporary following an end date / link)
  const effectiveEnd = getEffectiveEndMonth(expense, byId);
  if (effectiveEnd && compareMonths(m, effectiveEnd) > 0) return null;
  return { expense, amount: expense.amount };
}

export function getMonthSummary(expenses: Expense[], m: MonthId, salary: number): MonthSummary {
  const byId = new Map(expenses.map((e) => [e.id, e]));
  const occurrences: MonthlyOccurrence[] = [];
  for (const e of expenses) {
    const occ = getOccurrenceForMonth(e, m, byId);
    if (occ) occurrences.push(occ);
  }

  const sumByColor = (color: string) =>
    round2(occurrences.filter((o) => o.expense.color === color).reduce((s, o) => s + o.amount, 0));

  const totalPermanent = sumByColor("red");
  const totalCredit = sumByColor("blue");
  const totalTemporary = sumByColor("yellow");
  const totalExpenses = round2(totalPermanent + totalCredit + totalTemporary);

  return {
    month: m,
    monthKey: monthKey(m),
    label: monthLabelFr(m),
    salary,
    occurrences: occurrences.sort((a, b) => b.amount - a.amount),
    totalExpenses,
    totalPermanent,
    totalCredit,
    totalTemporary,
    remaining: round2(salary - totalExpenses),
  };
}

export function getForecast(
  expenses: Expense[],
  salary: number,
  startMonth: MonthId,
  count: number,
): MonthSummary[] {
  const out: MonthSummary[] = [];
  let m = startMonth;
  for (let i = 0; i < count; i++) {
    out.push(getMonthSummary(expenses, m, salary));
    m = addMonths(m, 1);
  }
  return out;
}

/**
 * Progress of a credit as of the *real* current month: how much has been
 * paid so far, what's left, and when the next payment is due. This
 * advances automatically as real time passes, with no manual bookkeeping.
 */
export function getCreditProgress(expense: Expense, currentMonth: MonthId): CreditProgress {
  const schedule = computeCreditSchedule(expense);
  const initial = expense.creditInitialAmount ?? 0;

  if (schedule.length === 0) {
    return {
      paid: 0,
      remaining: initial,
      status: "not-started",
      nextPaymentMonth: null,
      nextPaymentAmount: 0,
      endMonth: null,
      totalMonths: 0,
    };
  }

  let paid = 0;
  let remaining = initial;
  let nextPaymentMonth: MonthId | null = null;
  let nextPaymentAmount = 0;
  let status: CreditProgress["status"] = "not-started";

  for (const entry of schedule) {
    const mk = parseMonthKey(entry.monthKey);
    if (compareMonths(mk, currentMonth) < 0) {
      paid = round2(paid + entry.payment);
      remaining = entry.remainingAfter;
      status = "in-progress";
    } else if (!nextPaymentMonth) {
      nextPaymentMonth = mk;
      nextPaymentAmount = entry.payment;
    }
  }

  const endMonth = parseMonthKey(schedule[schedule.length - 1].monthKey);
  if (compareMonths(currentMonth, endMonth) > 0) {
    status = "completed";
    remaining = 0;
    nextPaymentMonth = null;
    nextPaymentAmount = 0;
  }

  return {
    paid,
    remaining,
    status,
    nextPaymentMonth,
    nextPaymentAmount,
    endMonth,
    totalMonths: schedule.length,
  };
}
