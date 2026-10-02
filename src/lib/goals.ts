// Pure goal (objectif) calculations — no DB access. A goal is reached with
// the money already put aside, plus the payout of each daret attached to it,
// counted in that daret's turn month, plus an optional planned monthly saving.
import { type MonthId, addMonths, compareMonths, monthsBetween, parseMonthKey } from "./date";
import { getDaretState } from "./daret";
import type { DaretWithExpense, Goal, Payment } from "./types";

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface GoalStep {
  kind: "saved" | "daret";
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
  let reachedByDaretsIn: MonthId | null = null;
  for (const a of attached) {
    cumulative = round2(cumulative + a.payout);
    if (!reachedByDaretsIn && cumulative >= target && goal.savedAmount < target) reachedByDaretsIn = a.turn;
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

  const reachedNow = round2(goal.savedAmount + attached.filter((a) => a.received).reduce((s, a) => s + a.payout, 0));
  const projected = cumulative;

  // Deadline: what's left after the darets that pay out by then, spread over
  // the months until it (this month included).
  const deadline = goal.deadline ? parseMonthKey(goal.deadline) : null;
  let monthsToDeadline: number | null = null;
  let monthlyNeeded: number | null = null;
  if (deadline) {
    monthsToDeadline = monthsBetween(currentMonth, deadline) + 1;
    const byDeadline =
      goal.savedAmount +
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
        goal.savedAmount +
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
