// Pure daret (tontine) helpers — no DB access. A daret with N members runs
// N consecutive months from its start month; each month every member pays
// the same contribution and one member collects the whole pot.
import { type MonthId, addMonths, compareMonths, monthKey, monthOfDateStr, monthsBetween, parseMonthKey } from "./date";
import type { DaretWithExpense, Payment } from "./types";

export function daretEndMonth(start: MonthId, members: number): MonthId {
  return addMonths(start, members - 1);
}

/** Last calendar day of a month as "YYYY-MM-DD" (used as the backing
 *  expense's endDate so it stops exactly after the last round). */
export function lastDayOfMonth(m: MonthId): string {
  const day = new Date(m.year, m.month, 0).getDate();
  return `${monthKey(m)}-${String(day).padStart(2, "0")}`;
}

export type DaretPhase = "upcoming" | "running" | "finished";

export interface DaretState {
  start: MonthId;
  end: MonthId;
  turn: MonthId;
  /** Contribution × members: what the user collects on their turn. */
  payout: number;
  /** Total the user contributes over the whole daret. */
  totalContribution: number;
  phase: DaretPhase;
  /** 1-based round for the given month while running, else null. */
  round: number | null;
  /** Rounds whose contribution has been confirmed paid. */
  paidRounds: number;
  /** Whether the given month's contribution is paid (null outside range). */
  paidThisMonth: boolean | null;
  turnStatus: "upcoming" | "now" | "received";
}

export function getDaretState(daret: DaretWithExpense, payments: Payment[], currentMonth: MonthId): DaretState {
  const start = monthOfDateStr(daret.expense.startDate);
  const end = daretEndMonth(start, daret.members);
  const turn = parseMonthKey(daret.turnMonth);
  const amount = daret.expense.amount;

  const phase: DaretPhase =
    compareMonths(currentMonth, start) < 0 ? "upcoming" : compareMonths(currentMonth, end) > 0 ? "finished" : "running";

  const own = payments.filter((p) => p.expenseId === daret.expenseId && p.monthKey != null);
  const paidKeys = new Set(own.filter((p) => p.amountPaid >= p.amountDue - 0.005).map((p) => p.monthKey));
  const inRange = (key: string) => {
    const m = parseMonthKey(key);
    return compareMonths(m, start) >= 0 && compareMonths(m, end) <= 0;
  };

  const cmpTurn = compareMonths(currentMonth, turn);
  return {
    start,
    end,
    turn,
    payout: Math.round(amount * daret.members * 100) / 100,
    totalContribution: Math.round(amount * daret.members * 100) / 100,
    phase,
    round: phase === "running" ? monthsBetween(start, currentMonth) + 1 : null,
    paidRounds: [...paidKeys].filter((k) => k != null && inRange(k)).length,
    paidThisMonth: phase === "running" ? paidKeys.has(monthKey(currentMonth)) : null,
    turnStatus: cmpTurn < 0 ? "upcoming" : cmpTurn === 0 ? "now" : "received",
  };
}
