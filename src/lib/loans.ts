// Prêts: a loan's installments and where it stands. Pure (no DB access).
import { addMonths, compareMonths, parseMonthKey, type MonthId } from "./date";
import type { Expense, Loan, LoanRepayment, Payment } from "./types";

const round = (n: number) => Math.round(n * 100) / 100;

export interface LoanSlot {
  slot: number;
  month: MonthId;
  /** What's expected that month: the plan's installment, plus what the
   *  previous month left (or minus what it gave beyond). */
  amount: number;
  /** The plan's installment alone (0 for a month added by a shortfall). */
  planned: number;
  /** What came back for that month (one or more times). */
  repayments: LoanRepayment[];
  received: number;
  /** Still expecting something that month: its month isn't over and it
   *  hasn't been given in full. */
  open: boolean;
  /** Still expected that month (0 once it's closed). */
  left: number;
}

export interface LoanState {
  /** Amount minus what was given back before it was added here. */
  toRepay: number;
  received: number;
  remaining: number;
  slots: LoanSlot[];
  /** Months that have come and still expect something. */
  due: LoanSlot[];
  /** First month still expecting something. */
  next: LoanSlot | null;
  done: boolean;
  /** Given up: what's left won't come back, nothing is expected anymore. */
  givenUp: boolean;
  endMonth: MonthId;
}

export function loanToRepay(loan: Pick<Loan, "amount" | "priorRepaid">): number {
  return round(loan.amount - (loan.priorRepaid ?? 0));
}

/** Still out of your pocket: what was lent less everything given back. */
export function loanRemaining(loan: Pick<Loan, "amount" | "priorRepaid" | "repayments">): number {
  const received = loan.repayments.reduce((s, r) => s + r.amount, 0);
  return round(Math.max(0, loanToRepay(loan) - received));
}

/**
 * Money lent isn't spent, money given back isn't earned: what counts in the
 * month's expenses is only what hasn't come back yet. The expenses and
 * payments as Dépenses, Statistiques, the Calendrier and the bilan count
 * them: a loan's expense (and its payment) is down to what's left to give
 * back, and goes once it's all back. The Solde keeps the real movements
 * (see buildWallet). Nothing stored changes.
 */
export function netOfLoans(expenses: Expense[], payments: Payment[], loans: Loan[]): { expenses: Expense[]; payments: Payment[] } {
  const left = new Map<string, number>();
  for (const l of loans) if (l.expenseId) left.set(l.expenseId, loanRemaining(l));
  if (left.size === 0) return { expenses, payments };
  const kept = (id: string) => (left.get(id) ?? 1) > 0.005;
  return {
    expenses: expenses.filter((e) => kept(e.id)).map((e) => (left.has(e.id) ? { ...e, amount: left.get(e.id)! } : e)),
    payments: payments
      .filter((p) => kept(p.expenseId))
      .map((p) => (left.has(p.expenseId) ? { ...p, amountDue: left.get(p.expenseId)!, amountPaid: left.get(p.expenseId)! } : p)),
  };
}

const MAX_SLOTS = 600;

/**
 * Installments month by month from the first: the plan's (`monthly` each,
 * the last one taking what's left). A month can be given in several times,
 * and stays expecting the rest until it's over (`current` is this month);
 * then what it gave less goes to the next month (a month is added after
 * the plan's last while something is left), what it gave more comes off
 * the next one.
 */
export function loanSlots(loan: Loan, current: MonthId): LoanSlot[] {
  const toRepay = loanToRepay(loan);
  const start = parseMonthKey(loan.startMonth);
  const bySlot = new Map<number, LoanRepayment[]>();
  for (const r of loan.repayments) bySlot.set(r.slot, [...(bySlot.get(r.slot) ?? []), r]);
  const lastSlot = Math.max(loan.months, ...loan.repayments.map((r) => r.slot));
  const slots: LoanSlot[] = [];
  let left = toRepay; // not received yet
  let expected = 0; // still expected by the open months before this one
  let carry = 0; // from the previous month: short (+) or beyond (−)
  for (let i = 0; i < MAX_SLOTS; i++) {
    const month = addMonths(start, i);
    const planned = i < loan.months - 1 ? loan.monthly : i === loan.months - 1 ? round(toRepay - loan.monthly * (loan.months - 1)) : 0;
    const available = round(Math.max(0, left - expected));
    const repayments = (bySlot.get(i + 1) ?? []).sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
    const received = round(repayments.reduce((s, r) => s + r.amount, 0));
    // The plan's last month and any after it take everything left.
    const amount = round(i >= loan.months - 1 ? available : Math.min(available, Math.max(0, planned + carry)));
    if (amount <= 0 && received <= 0) {
      // Nothing expected this month (given ahead, or all is expected already).
      if (i >= loan.months - 1 && i >= lastSlot - 1) break;
      carry = Math.min(0, round(planned + carry));
      continue;
    }
    const over = compareMonths(month, current) < 0;
    const open = !over && received < amount - 0.005;
    left = round(left - received);
    if (open) {
      expected = round(expected + amount - received);
      carry = 0;
    } else {
      carry = round(amount - received);
    }
    slots.push({ slot: i + 1, month, amount, planned, repayments, received, open, left: open ? round(amount - received) : 0 });
  }
  return slots;
}

export function loanState(loan: Loan, current: MonthId): LoanState {
  const toRepay = loanToRepay(loan);
  const givenUp = loan.writtenOffAt != null;
  // Given up: only the months something came back for, none expecting more.
  const all = loanSlots(loan, current);
  const slots = givenUp ? all.filter((s) => s.received > 0).map((s) => ({ ...s, open: false, left: 0 })) : all;
  const received = round(loan.repayments.reduce((s, r) => s + r.amount, 0));
  const open = slots.filter((s) => s.open);
  return {
    toRepay,
    received,
    remaining: loanRemaining(loan),
    slots,
    due: open.filter((s) => compareMonths(s.month, current) <= 0),
    next: open[0] ?? null,
    done: open.length === 0 && received >= toRepay - 0.005,
    givenUp,
    endMonth: slots.at(-1)?.month ?? parseMonthKey(loan.startMonth),
  };
}
