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
  monthsBetween,
  parseMonthKey,
} from "./date";
import type { CreditRealState, Expense, MonthSummary, MonthlyOccurrence, Payment, PaymentStatus } from "./types";

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


// ---------------------------------------------------------------------------
// Real payment tracking. Everything above this line is the theoretical
// schedule (assumes every payment happens exactly on time) and is left
// untouched — it still drives Budget's monthly totals and forecasts.
// Below is the *actual* picture, built from confirmed Payment rows.
// ---------------------------------------------------------------------------

const MAX_ARREARS_SCAN_MONTHS = 600; // 50 years, safety cap for the scan loop

/**
 * Real-time state of a credit: how much has actually been paid (not
 * assumed from elapsed calendar time), what's really left, and whether the
 * next installment is overdue. A missed installment never stacks onto the
 * next month's due amount — it simply pushes every later installment (and
 * the projected end date) back by one month, which falls out naturally here
 * because `remaining` only decreases on a confirmed payment.
 */
export function getCreditRealState(
  expense: Expense,
  payments: Payment[],
  currentMonth: MonthId,
): CreditRealState {
  const initial = expense.creditInitialAmount ?? 0;
  const creditPayments = payments.filter((p) => p.expenseId === expense.id && p.slotIndex != null);
  const paidTotal = round2(creditPayments.reduce((s, p) => s + p.amountPaid, 0));
  const remaining = Math.max(0, round2(initial - paidTotal));
  const paidSlots = creditPayments.length;
  const start = monthOfDateStr(expense.startDate);

  if (remaining <= 0) {
    return {
      paidTotal,
      remaining: 0,
      paidSlots,
      pendingAmount: 0,
      isOverdue: false,
      status: "completed",
      projectedEndMonth: paidSlots > 0 ? addMonths(start, paidSlots - 1) : currentMonth,
    };
  }

  if (compareMonths(currentMonth, start) < 0) {
    return {
      paidTotal: 0,
      remaining: initial,
      paidSlots: 0,
      pendingAmount: 0,
      isOverdue: false,
      status: "not-started",
      projectedEndMonth: null,
    };
  }

  const monthsElapsed = monthsBetween(start, currentMonth) + 1;
  const monthlyAmount = expense.amount > 0 ? expense.amount : 0;
  const pendingAmount = monthlyAmount > 0 ? Math.min(monthlyAmount, remaining) : 0;
  const isOverdue = paidSlots < monthsElapsed;
  const remainingSlotsNeeded = monthlyAmount > 0 ? Math.ceil(remaining / monthlyAmount) : 0;
  const projectedEndMonth =
    remainingSlotsNeeded > 0
      ? isOverdue
        ? addMonths(currentMonth, remainingSlotsNeeded - 1)
        : addMonths(currentMonth, remainingSlotsNeeded)
      : currentMonth;

  return {
    paidTotal,
    remaining,
    paidSlots,
    pendingAmount,
    isOverdue,
    status: "in-progress",
    projectedEndMonth,
  };
}

function findPayment(
  payments: Payment[],
  expenseId: string,
  monthKeyValue: string,
): Payment | undefined {
  return payments.find((p) => p.expenseId === expenseId && p.monthKey === monthKeyValue);
}

/**
 * Real payment status of one non-credit occurrence for one specific month
 * (used by the Budget page, which shows per-month truth without merging
 * arrears into later months — that merging is a Dashboard-only concept).
 */
export function getMonthPaymentStatus(
  expense: Expense,
  m: MonthId,
  payments: Payment[],
  currentMonth: MonthId,
): PaymentStatus {
  const key = monthKey(m);
  if (expense.type === "credit") {
    const paidThisMonth = payments.some(
      (p) => p.expenseId === expense.id && p.slotIndex != null && p.monthKey === key,
    );
    if (paidThisMonth) return "paid";
    return compareMonths(m, currentMonth) <= 0 ? "unpaid" : "not-yet-due";
  }
  const payment = findPayment(payments, expense.id, key);
  if (payment && payment.amountPaid >= payment.amountDue) return "paid";
  return compareMonths(m, currentMonth) <= 0 ? "unpaid" : "not-yet-due";
}

export interface DueNowItem {
  expense: Expense;
  amountDue: number;
  isOverdue: boolean;
}

export interface UnpaidMonth {
  monthKey: string;
  month: MonthId;
  amountDue: number;
  amountPaid: number;
}

/**
 * Every past-or-current occurrence month of a non-credit expense that isn't
 * fully settled yet, oldest first — the "le montant reste dû jusqu'à ce
 * qu'il soit payé" ledger. Not applicable to credits (they never stack; use
 * getCreditRealState instead).
 */
export function getUnpaidMonths(
  expense: Expense,
  payments: Payment[],
  uptoMonth: MonthId,
  byId: Map<string, Expense>,
): UnpaidMonth[] {
  if (expense.type === "credit") return [];

  const start = monthOfDateStr(expense.startDate);
  if (compareMonths(uptoMonth, start) < 0) return [];

  const unpaid: UnpaidMonth[] = [];
  let m = start;
  let guard = 0;
  while (compareMonths(m, uptoMonth) <= 0 && guard < MAX_ARREARS_SCAN_MONTHS) {
    const occ = getOccurrenceForMonth(expense, m, byId);
    if (occ) {
      const payment = findPayment(payments, expense.id, monthKey(m));
      const paid = payment?.amountPaid ?? 0;
      if (occ.amount - paid > 0.005) {
        unpaid.push({ monthKey: monthKey(m), month: m, amountDue: occ.amount, amountPaid: paid });
      }
    }
    m = addMonths(m, 1);
    guard++;
  }
  return unpaid;
}

/**
 * Dashboard's "à payer maintenant": one aggregated line per expense that
 * currently owes money. Credits never stack (see getCreditRealState) — only
 * one installment can ever be pending. Non-credit expenses accumulate: every
 * past occurrence that was never paid keeps adding to what's due now, until
 * settled (rule: "le montant reste dû jusqu'à ce que je le paie").
 */
export function getDueNowItems(
  expenses: Expense[],
  payments: Payment[],
  currentMonth: MonthId,
): DueNowItem[] {
  const byId = new Map(expenses.map((e) => [e.id, e]));
  const items: DueNowItem[] = [];

  for (const expense of expenses) {
    if (!expense.active) continue;

    if (expense.type === "credit") {
      const state = getCreditRealState(expense, payments, currentMonth);
      if (state.pendingAmount > 0 && state.isOverdue) {
        items.push({ expense, amountDue: state.pendingAmount, isOverdue: true });
      }
      continue;
    }

    const owed = getUnpaidMonths(expense, payments, currentMonth, byId).reduce(
      (s, u) => s + (u.amountDue - u.amountPaid),
      0,
    );
    if (owed > 0.005) {
      items.push({ expense, amountDue: round2(owed), isOverdue: true });
    }
  }

  return items;
}

/**
 * Total actually paid *this* real-time month across every expense — the
 * only thing the Dashboard's salary progress bar should ever subtract. A
 * planned-but-unpaid expense never reduces "disponible".
 */
export function getPaidThisMonth(expenses: Expense[], payments: Payment[], currentMonth: MonthId): number {
  const key = monthKey(currentMonth);
  const activeIds = new Set(expenses.filter((e) => e.active).map((e) => e.id));
  const total = payments
    .filter((p) => activeIds.has(p.expenseId) && p.monthKey === key)
    .reduce((s, p) => s + p.amountPaid, 0);
  return round2(total);
}
