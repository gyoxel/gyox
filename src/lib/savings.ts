// Épargne: what's in the savings. Pure (no DB access).
import { paidTotal } from "./monthly-plan";
import type { Payment, SavingsMove } from "./types";

/** Money put aside counts while its expense is paid (every month, every
 *  month ticked); money taken back (or given to a goal) always. */
export function savingsBalance(moves: SavingsMove[], payments: Payment[]): number {
  const paid = new Set(payments.filter((p) => p.amountPaid > 0).map((p) => p.expenseId));
  const total = moves.reduce((s, m) => {
    if (m.kind === "out" || m.kind === "goal") return s - m.amount;
    if (m.monthly) return s + paidTotal(m.expenseId, payments);
    return m.expenseId && !paid.has(m.expenseId) ? s : s + m.amount;
  }, 0);
  return Math.round(total * 100) / 100;
}

/** Whether a move counts (money put aside: only while its expense is paid —
 *  every month: once one month is). */
export function isMoveCounted(move: SavingsMove, payments: Payment[]): boolean {
  if (move.kind === "out" || !move.expenseId) return true;
  return payments.some((p) => p.expenseId === move.expenseId && p.amountPaid > 0);
}
