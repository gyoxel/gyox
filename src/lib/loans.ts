// Prêts: a loan's installments and where it stands. Pure (no DB access).
import { addMonths, compareMonths, parseMonthKey, type MonthId } from "./date";
import type { Loan, LoanRepayment } from "./types";

const round = (n: number) => Math.round(n * 100) / 100;

export interface LoanSlot {
  slot: number;
  month: MonthId;
  amount: number;
  /** Set once received. */
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

/** Installments 1…months: `monthly` each, the last one taking what's left. */
export function loanSlots(loan: Loan): LoanSlot[] {
  const toRepay = loanToRepay(loan);
  const start = parseMonthKey(loan.startMonth);
  const bySlot = new Map(loan.repayments.map((r) => [r.slot, r]));
  return Array.from({ length: loan.months }, (_, i) => ({
    slot: i + 1,
    month: addMonths(start, i),
    amount: i === loan.months - 1 ? round(toRepay - loan.monthly * (loan.months - 1)) : loan.monthly,
    repayment: bySlot.get(i + 1) ?? null,
  }));
}

export function loanState(loan: Loan, current: MonthId): LoanState {
  const toRepay = loanToRepay(loan);
  const slots = loanSlots(loan);
  const received = round(loan.repayments.reduce((s, r) => s + r.amount, 0));
  const open = slots.filter((s) => !s.repayment);
  return {
    toRepay,
    received,
    remaining: round(Math.max(0, toRepay - received)),
    slots,
    due: open.filter((s) => compareMonths(s.month, current) <= 0),
    next: open[0] ?? null,
    done: open.length === 0,
    endMonth: slots.at(-1)?.month ?? parseMonthKey(loan.startMonth),
  };
}
