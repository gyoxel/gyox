// Prêts: a loan's installments and where it stands. Pure (no DB access).
import { addMonths, compareMonths, parseMonthKey, type MonthId } from "./date";
import type { Loan, LoanRepayment } from "./types";

const round = (n: number) => Math.round(n * 100) / 100;

export interface LoanSlot {
  slot: number;
  month: MonthId;
  /** What's expected that month: the plan's installment, plus what the
   *  previous month left (or minus what it gave beyond). */
  amount: number;
  /** The plan's installment alone (0 for a month added by a shortfall). */
  planned: number;
  /** Set once received (its amount may differ from `amount`). */
  repayment: LoanRepayment | null;
}

export interface LoanState {
  /** Amount minus what was given back before it was added here. */
  toRepay: number;
  received: number;
  remaining: number;
  slots: LoanSlot[];
  /** Installments whose month has come and that aren't received yet. */
  due: LoanSlot[];
  /** First installment not received yet. */
  next: LoanSlot | null;
  done: boolean;
  endMonth: MonthId;
}

export function loanToRepay(loan: Pick<Loan, "amount" | "priorRepaid">): number {
  return round(loan.amount - (loan.priorRepaid ?? 0));
}

const MAX_SLOTS = 600;

/**
 * Installments month by month from the first: the plan's (`monthly` each,
 * the last one taking what's left), each received with any amount. What a
 * month gives less goes to the next month (a month is added after the
 * plan's last while something is left); what it gives more comes off the
 * next one. A month not received yet keeps its amount (still expected).
 */
export function loanSlots(loan: Loan): LoanSlot[] {
  const toRepay = loanToRepay(loan);
  const start = parseMonthKey(loan.startMonth);
  const bySlot = new Map(loan.repayments.map((r) => [r.slot, r]));
  const lastSlot = Math.max(loan.months, ...loan.repayments.map((r) => r.slot));
  const slots: LoanSlot[] = [];
  let left = toRepay; // not received yet
  let expected = 0; // expected by the months not received yet
  let carry = 0; // from the previous month: short (+) or beyond (−)
  for (let i = 0; i < MAX_SLOTS; i++) {
    const planned = i < loan.months - 1 ? loan.monthly : i === loan.months - 1 ? round(toRepay - loan.monthly * (loan.months - 1)) : 0;
    const available = round(Math.max(0, left - expected));
    const repayment = bySlot.get(i + 1) ?? null;
    // The plan's last month and any after it take everything left.
    const amount = round(i >= loan.months - 1 ? available : Math.min(available, Math.max(0, planned + carry)));
    if (amount <= 0 && !repayment) {
      // Nothing expected this month (given ahead, or all is expected already).
      if (i >= loan.months - 1 && i >= lastSlot - 1) break;
      carry = Math.min(0, round(planned + carry));
      continue;
    }
    slots.push({ slot: i + 1, month: addMonths(start, i), amount, planned, repayment });
    if (repayment) {
      carry = round(amount - repayment.amount);
      left = round(left - repayment.amount);
    } else {
      carry = 0;
      expected = round(expected + amount);
    }
  }
  return slots;
}

export function loanState(loan: Loan, current: MonthId): LoanState {
  const toRepay = loanToRepay(loan);
  const slots = loanSlots(loan);
  const received = round(loan.repayments.reduce((s, r) => s + r.amount, 0));
  const open = slots.filter((s) => !s.repayment && s.amount > 0);
  return {
    toRepay,
    received,
    remaining: round(Math.max(0, toRepay - received)),
    slots,
    due: open.filter((s) => compareMonths(s.month, current) <= 0),
    next: open[0] ?? null,
    done: open.length === 0 && received >= toRepay - 0.005,
    endMonth: slots.at(-1)?.month ?? parseMonthKey(loan.startMonth),
  };
}
