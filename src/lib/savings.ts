// Épargne: what's in the savings. Pure (no DB access).
import type { Payment, SavingsMove } from "./types";

/** Money put aside counts while its expense is paid; money taken back always. */
export function savingsBalance(moves: SavingsMove[], payments: Payment[]): number {
  const paid = new Set(payments.filter((p) => p.amountPaid > 0).map((p) => p.expenseId));
  const total = moves.reduce((s, m) => {
    if (m.kind === "out") return s - m.amount;
    return m.expenseId && !paid.has(m.expenseId) ? s : s + m.amount;
  }, 0);
  return Math.round(total * 100) / 100;
}

/** Whether a move counts (money put aside: only while its expense is paid). */
export function isMoveCounted(move: SavingsMove, payments: Payment[]): boolean {
  if (move.kind === "out" || !move.expenseId) return true;
  return payments.some((p) => p.expenseId === move.expenseId && p.amountPaid > 0);
}
