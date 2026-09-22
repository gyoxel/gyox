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

export type DisplayColor = "red" | "yellow" | "blue";

/**
 * The color an expense should be shown in, independent of the manually
 * picked `color` category field: permanent expenses are always red (they
 * lead every list, and never "repeat toward an end" — they just continue).
 * Everything else is colored by how long it recurs: yellow when it spans
 * more than 2 calendar months, blue when it's 2 months or shorter — a
 * one-time expense (inherently a single month) or a credit that pays off
 * within 2 months included. A credit's span comes from its payoff schedule
 * (getEffectiveEndMonth already resolves that), so a quick credit reads
 * blue and a long one reads yellow, exactly like a temporary expense would.
 */
export function getExpenseDisplayColor(expense: Expense, byId: Map<string, Expense>): DisplayColor {
  if (expense.type === "permanent") return "red";
  if (expense.frequency === "one-time") return "blue";

  const start = monthOfDateStr(expense.startDate);
  const end = getEffectiveEndMonth(expense, byId);
  if (!end) return "yellow"; // no end in sight — treat as long-running
  const durationMonths = monthsBetween(start, end) + 1;
  return durationMonths > 2 ? "yellow" : "blue";
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

  if (remaining <= 0 && paidSlots > 0) {
    // The real completion month is whichever real month the last
    // confirmed installment actually landed in (stored on the payment
    // itself), not a schedule guess — accurate whether it finished early,
    // late, or exactly on the theoretical pace.
    const lastPaymentMonth = creditPayments.reduce<string | null>(
      (max, p) => (p.monthKey && (!max || p.monthKey > max) ? p.monthKey : max),
      null,
    );
    return {
      paidTotal,
      remaining: 0,
      paidSlots,
      pendingAmount: 0,
      isOverdue: false,
      status: "completed",
      projectedEndMonth: lastPaymentMonth ? parseMonthKey(lastPaymentMonth) : addMonths(start, paidSlots - 1),
      dueMonth: null,
    };
  }

  // Nothing paid yet and the credit's own start date hasn't arrived —
  // genuinely hasn't begun. (If something HAS been paid — an advance
  // payment made before the start month, e.g. via the Dashboard's month
  // carousel — this falls through to the general case below instead of
  // discarding that real payment.)
  if (paidSlots === 0 && compareMonths(currentMonth, start) < 0) {
    return {
      paidTotal: 0,
      remaining: initial,
      paidSlots: 0,
      pendingAmount: 0,
      isOverdue: false,
      status: "not-started",
      projectedEndMonth: null,
      dueMonth: null,
    };
  }

  // The calendar month the next installment would naturally fall in, had
  // every prior one been paid exactly on schedule from `start`.
  const scheduleMonth = addMonths(start, paidSlots);
  // Behind schedule only if we're evaluating a month that's already past
  // where the next installment was due; evaluating a month before that
  // (e.g. paying ahead) is never "overdue".
  const isOverdue = compareMonths(currentMonth, scheduleMonth) > 0;
  const effectiveMonth = isOverdue ? currentMonth : scheduleMonth;
  const monthlyAmount = expense.amount > 0 ? expense.amount : 0;
  const pendingAmount = monthlyAmount > 0 ? Math.min(monthlyAmount, remaining) : 0;
  const remainingSlotsNeeded = monthlyAmount > 0 ? Math.ceil(remaining / monthlyAmount) : 0;
  const projectedEndMonth =
    remainingSlotsNeeded > 0 ? addMonths(effectiveMonth, remainingSlotsNeeded - 1) : effectiveMonth;

  return {
    paidTotal,
    remaining,
    paidSlots,
    pendingAmount,
    isOverdue,
    status: "in-progress",
    projectedEndMonth,
    dueMonth: scheduleMonth,
  };
}

/**
 * Projects which installment (if any) a credit would owe in a specific
 * FUTURE month, assuming every installment between today and then gets
 * paid on time from here on. Anchored on today's real remaining balance
 * and pace (so any real arrears already baked in up to today still delay
 * things by exactly as many months as missed) — never on the naive
 * theoretical schedule from the credit's original start date, and never
 * repeating today's single pending amount forever. Returns null once the
 * balance would already be fully paid off by `viewMonth`.
 */
function projectCreditInstallment(
  expense: Expense,
  payments: Payment[],
  viewMonth: MonthId,
  currentMonth: MonthId,
): number | null {
  const today = getCreditRealState(expense, payments, currentMonth);
  if (today.status === "completed") return null;

  const monthlyAmount = expense.amount > 0 ? expense.amount : 0;
  if (monthlyAmount <= 0) return null;

  let remaining = today.remaining;
  let m: MonthId =
    today.status === "not-started"
      ? monthOfDateStr(expense.startDate)
      : today.isOverdue
        ? currentMonth
        : (today.dueMonth ?? currentMonth);

  let guard = 0;
  while (remaining > 0.005 && guard < SAFETY_MONTHS_CAP) {
    const payment = Math.min(monthlyAmount, remaining);
    if (compareMonths(m, viewMonth) === 0) return round2(payment);
    if (compareMonths(m, viewMonth) > 0) return null; // shouldn't happen, guards against infinite loop misuse
    remaining = round2(remaining - payment);
    m = addMonths(m, 1);
    guard++;
  }
  return null; // fully paid off before reaching viewMonth
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

export interface LedgerItem {
  expense: Expense;
  amount: number;
  paid: boolean;
}

/**
 * Dashboard's "à payer" list for a given month: one row per expense
 * relevant to that month, whether settled or not — a paid item is kept
 * (so the UI can show it struck through) rather than silently dropped, so
 * the checklist looks the same after a reload as it does right after
 * checking something off. Credits never stack (see getCreditRealState) —
 * only one installment can ever be pending at a time. Non-credit expenses
 * accumulate: every past occurrence that was never paid keeps adding to
 * what's due, until settled (rule: "le montant reste dû jusqu'à ce que je
 * le paie").
 *
 * `currentMonth` is the real calendar month "today" falls in. When
 * `viewMonth` is browsed into the future, arrears are only ever summed up
 * through `currentMonth` (accumulating unpaid months that haven't happened
 * yet makes no sense) and the future month itself shows only its own
 * single occurrence — the "fixed" or "programmed" amount that would fall
 * due that month, per rule 6.
 */
export function getMonthLedgerItems(
  expenses: Expense[],
  payments: Payment[],
  viewMonth: MonthId,
  currentMonth: MonthId,
): LedgerItem[] {
  const byId = new Map(expenses.map((e) => [e.id, e]));
  const items: LedgerItem[] = [];
  const isFuture = compareMonths(viewMonth, currentMonth) > 0;

  for (const expense of expenses) {
    if (!expense.active) continue;

    if (expense.type === "credit") {
      const creditStart = monthOfDateStr(expense.startDate);
      if (compareMonths(viewMonth, creditStart) < 0) continue; // hasn't started as of this month

      // A payment actually settled against this exact month always stays
      // visible here (struck through) — checked first, before any
      // completed/projection logic, so it can never vanish: neither when
      // the credit has since been paid off entirely (which otherwise hides
      // it everywhere) nor when browsing back to a future month whose
      // installment was already paid ahead (which otherwise falls outside
      // the forward projection's range and disappears).
      const settled = findPayment(payments, expense.id, monthKey(viewMonth));
      if (settled) {
        items.push({ expense, amount: settled.amountPaid, paid: true });
        continue;
      }

      if (isFuture) {
        // A future month must reflect where the payoff schedule will
        // actually be by then — not today's single pending installment
        // repeated forever. Project forward from today's real remaining
        // balance so the credit correctly stops appearing once it would
        // be paid off (rule: e.g. a 1200 DH credit at 500/month shows
        // 500, 500, 200, then nothing — never a 4th month).
        const projected = projectCreditInstallment(expense, payments, viewMonth, currentMonth);
        if (!projected) continue;
        items.push({ expense, amount: projected, paid: false });
        continue;
      }

      const state = getCreditRealState(expense, payments, viewMonth);
      if (state.status === "completed") continue;
      // Due only once the viewed month has actually reached the pending
      // installment's natural month — a payment made ahead of schedule
      // must not make an earlier month look like it's still owed.
      const isDueByNow = state.pendingAmount > 0 && state.dueMonth != null && compareMonths(viewMonth, state.dueMonth) >= 0;
      if (isDueByNow) {
        items.push({ expense, amount: state.pendingAmount, paid: false });
      } else {
        items.push({ expense, amount: expense.amount, paid: true });
      }
      continue;
    }

    const start = monthOfDateStr(expense.startDate);
    if (compareMonths(viewMonth, start) < 0) continue;

    if (isFuture) {
      // Future month: show only its own occurrence (fixed/programmed for
      // that specific month), never the backlog accumulated through today —
      // that backlog already surfaces when browsing to today's/past months.
      const occ = getOccurrenceForMonth(expense, viewMonth, byId);
      if (!occ) continue;
      const payment = findPayment(payments, expense.id, monthKey(viewMonth));
      const paidAmount = payment?.amountPaid ?? 0;
      const remaining = round2(occ.amount - paidAmount);
      if (remaining > 0.005) {
        items.push({ expense, amount: remaining, paid: false });
      } else {
        items.push({ expense, amount: occ.amount, paid: true });
      }
      continue;
    }

    const owed = getUnpaidMonths(expense, payments, viewMonth, byId).reduce(
      (s, u) => s + (u.amountDue - u.amountPaid),
      0,
    );
    if (owed > 0.005) {
      items.push({ expense, amount: round2(owed), paid: false });
      continue;
    }

    const occ = getOccurrenceForMonth(expense, viewMonth, byId);
    if (occ) {
      items.push({ expense, amount: occ.amount, paid: true });
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
