// Pure goal (objectif) calculations — no DB access. A goal is reached with
// the money already put aside, plus the payout of each daret attached to it,
// counted in that daret's turn month, plus an optional planned monthly saving.
import { type MonthId, addMonths, compareMonths, monthsBetween, parseMonthKey } from "./date";
import { getDaretState } from "./daret";
import type { DaretWithExpense, Goal, GoalDeposit, Payment } from "./types";

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface GoalStep {
  kind: "saved" | "deposits" | "daret";
  label: string;
  amount: number;
  /** Month the money arrives (null = already there). */
  month: MonthId | null;
  /** Already in hand (saved money, or a daret whose turn has passed). */
  received: boolean;
  /** Total reached once this step is in, and its share of the target. */
  cumulative: number;
  percent: number;
}

export interface GoalProgress {
  target: number;
  /** Initial savings + every deposit. */
  savedTotal: number;
  /** In hand today: saved + darets already collected. */
  reachedNow: number;
  percentNow: number;
  /** Once every attached daret has paid out. */
  projected: number;
  percentProjected: number;
  remainingNow: number;
  /** Still missing after all attached darets. */
  remainingAfterDarets: number;
  completed: boolean;
  steps: GoalStep[];
  /** First month the target is reached by darets alone (on top of savings). */
  reachedByDaretsIn: MonthId | null;
  /** With a deadline: how much to put aside each month (after darets due by then). */
  deadline: MonthId | null;
  monthsToDeadline: number | null;
  monthlyNeeded: number | null;
  /** With a monthly saving: the month the target would be reached. */
  estimatedMonth: MonthId | null;
}

const pct = (amount: number, target: number) => (target > 0 ? Math.min(100, Math.round((amount / target) * 100)) : 0);

/** Whether a deposit counts: always for older ones, while its expense in
 *  Dépenses is ticked for the newer ones. */
export function isDepositPaid(deposit: GoalDeposit, payments: Payment[]): boolean {
  return !deposit.expenseId || payments.some((p) => p.expenseId === deposit.expenseId && p.amountPaid > 0);
}

export function getGoalProgress(
  goal: Goal,
  darets: DaretWithExpense[],
  payments: Payment[],
  currentMonth: MonthId,
): GoalProgress {
  const target = goal.targetAmount;
  const attached = darets
    .filter((d) => goal.daretIds.includes(d.id))
    .map((d) => {
      const state = getDaretState(d, payments, currentMonth);
      return { daret: d, payout: state.payout, turn: state.turn, received: compareMonths(state.turn, currentMonth) < 0 };
    })
    .sort((a, b) => compareMonths(a.turn, b.turn));

  // A deposit shown in Dépenses counts only while it's ticked there (paid).
  const counted = goal.deposits.filter((d) => isDepositPaid(d, payments));
  const depositsTotal = round2(counted.reduce((s, d) => s + d.amount, 0));
  const savedTotal = round2(goal.savedAmount + depositsTotal);

  const steps: GoalStep[] = [];
  let cumulative = goal.savedAmount;
  if (goal.savedAmount > 0) {
    steps.push({
      kind: "saved",
      label: "Déjà épargné",
      amount: goal.savedAmount,
      month: null,
      received: true,
      cumulative,
      percent: pct(cumulative, target),
    });
  }
  if (depositsTotal > 0) {
    cumulative = savedTotal;
    steps.push({
      kind: "deposits",
      label: counted.length === 1 ? "1 versement" : `${counted.length} versements`,
      amount: depositsTotal,
      month: null,
      received: true,
      cumulative,
      percent: pct(cumulative, target),
    });
  }
  let reachedByDaretsIn: MonthId | null = null;
  for (const a of attached) {
    cumulative = round2(cumulative + a.payout);
    if (!reachedByDaretsIn && cumulative >= target && savedTotal < target) reachedByDaretsIn = a.turn;
    steps.push({
      kind: "daret",
      label: a.daret.expense.name,
      amount: a.payout,
      month: a.turn,
      received: a.received,
      cumulative,
      percent: pct(cumulative, target),
    });
  }

  const reachedNow = round2(savedTotal + attached.filter((a) => a.received).reduce((s, a) => s + a.payout, 0));
  const projected = cumulative;

  // Deadline: what's left after the darets that pay out by then, spread over
  // the months until it (this month included).
  const deadline = goal.deadline ? parseMonthKey(goal.deadline) : null;
  let monthsToDeadline: number | null = null;
  let monthlyNeeded: number | null = null;
  if (deadline) {
    monthsToDeadline = monthsBetween(currentMonth, deadline) + 1;
    const byDeadline =
      savedTotal +
      attached.filter((a) => compareMonths(a.turn, deadline) <= 0).reduce((s, a) => s + a.payout, 0);
    const missing = Math.max(0, target - byDeadline);
    monthlyNeeded = monthsToDeadline > 0 ? round2(missing / monthsToDeadline) : missing > 0 ? missing : 0;
  }

  // Planned monthly saving: first month when savings + darets reach the target.
  let estimatedMonth: MonthId | null = null;
  if (goal.monthlySaving && goal.monthlySaving > 0 && reachedNow < target) {
    for (let i = 0; i < 600; i++) {
      const m = addMonths(currentMonth, i);
      const total =
        savedTotal +
        goal.monthlySaving * (i + 1) +
        attached.filter((a) => compareMonths(a.turn, m) <= 0).reduce((s, a) => s + a.payout, 0);
      if (total >= target) {
        estimatedMonth = m;
        break;
      }
    }
  }

  return {
    target,
    savedTotal,
    reachedNow,
    percentNow: pct(reachedNow, target),
    projected,
    percentProjected: pct(projected, target),
    remainingNow: round2(Math.max(0, target - reachedNow)),
    remainingAfterDarets: round2(Math.max(0, target - projected)),
    completed: reachedNow >= target,
    steps,
    reachedByDaretsIn,
    deadline,
    monthsToDeadline,
    monthlyNeeded,
    estimatedMonth,
  };
}

// ---------------------------------------------------------------------------
// Simulations ("what if") for the goal detail page. They take the goal's
// state today plus its darets still to come, so they run in the browser.
// ---------------------------------------------------------------------------

export interface GoalSimBase {
  target: number;
  /** In hand today (savings, deposits, darets already collected). */
  reachedNow: number;
  /** Attached darets not collected yet: "YYYY-MM" turn and payout. */
  upcoming: { month: string; amount: number }[];
  /** "YYYY-MM" of the current month. */
  currentMonth: string;
}

const daretsUntil = (base: GoalSimBase, until: MonthId) =>
  base.upcoming.filter((u) => compareMonths(parseMonthKey(u.month), until) <= 0).reduce((s, u) => s + u.amount, 0);

export interface SimResult {
  months: number;
  /** Put aside over the period. */
  added: number;
  /** Darets collected by the end of the period. */
  fromDarets: number;
  total: number;
  percent: number;
  remaining: number;
}

/** "If I put `monthly` aside every month from `from` to `to`…" */
export function simulateSaving(base: GoalSimBase, monthly: number, from: MonthId, to: MonthId): SimResult | null {
  if (!(monthly > 0) || compareMonths(to, from) < 0) return null;
  const months = monthsBetween(from, to) + 1;
  const added = round2(monthly * months);
  const fromDarets = round2(daretsUntil(base, to));
  const total = round2(base.reachedNow + fromDarets + added);
  return {
    months,
    added,
    fromDarets,
    total,
    percent: pct(total, base.target),
    remaining: round2(Math.max(0, base.target - total)),
  };
}

export interface NeedResult {
  months: number;
  monthly: number;
  fromDarets: number;
  total: number;
  percent: number;
  remaining: number;
}

/** "I want to gather `amount` by `by`" — per month from now (this month included). */
export function savingNeeded(base: GoalSimBase, amount: number, by: MonthId): NeedResult | null {
  const now = parseMonthKey(base.currentMonth);
  if (!(amount > 0) || compareMonths(by, now) < 0) return null;
  const months = monthsBetween(now, by) + 1;
  const fromDarets = round2(daretsUntil(base, by));
  const total = round2(base.reachedNow + fromDarets + amount);
  return {
    months,
    monthly: round2(amount / months),
    fromDarets,
    total,
    percent: pct(total, base.target),
    remaining: round2(Math.max(0, base.target - total)),
  };
}

/** What's still missing by `by` once the darets due by then are in. */
export function missingBy(base: GoalSimBase, by: MonthId): number {
  return round2(Math.max(0, base.target - base.reachedNow - daretsUntil(base, by)));
}

/** First month the goal is reached putting `monthly` aside from this month on. */
export function finishMonthFor(base: GoalSimBase, monthly: number): MonthId | null {
  const now = parseMonthKey(base.currentMonth);
  for (let i = 0; i < 600; i++) {
    const m = addMonths(now, i);
    if (base.reachedNow + daretsUntil(base, m) + monthly * (i + 1) >= base.target) return m;
  }
  return null;
}
