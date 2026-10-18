// Marking an expense paid (a month, or a credit's next installment) — shared
// by the payments route and by creating an expense already paid.
import { monthKey as toMonthKey, parseMonthKey, todayMonth } from "./date";
import { findPayment, getCreditRealState, getOccurrenceForMonth, getUnpaidMonths } from "./engine";
import { formatMoney } from "./utils";
import {
  getAllExpenses,
  getDaretOfExpense,
  getDepositOfExpense,
  getExpenseById,
  addPaymentPart,
  getPaymentsForExpense,
  markCreditSlotPaid,
  markMonthPaid,
} from "./repository";
import { getSavingsMoveOfExpense } from "./savings-repo";
import { getLoanOfExpense } from "./loans-repo";
import { budgetIdOfExpense } from "./budgets-repo";
import type { Payment, PaymentMethod } from "./types";

export const AMOUNT_LOCKED = "Ce montant se change depuis là d'où vient la dépense.";

/** Whether the expense comes from somewhere else (a daret, a goal, savings,
 *  a loan, a budget), whose amount it follows: it's paid as it is. */
export async function amountLocked(id: string): Promise<boolean> {
  const links = await Promise.all([
    getDaretOfExpense(id),
    getDepositOfExpense(id),
    getSavingsMoveOfExpense(id),
    getLoanOfExpense(id),
    budgetIdOfExpense(id),
  ]);
  return links.some(Boolean);
}

/**
 * - Non-credit: settles `monthKey` (omitted: the oldest unpaid month).
 * - Credit: pays the installment pending as of `monthKey` (omitted: now).
 * `amount`: paid only part of it (or more): the rest stays to pay that month
 * ("X · reste"), and paying it later adds to the same month — a part of its
 * own, cash or card. Without `amount`, pays all that's left of the month.
 * Once the month is over, what's left goes with it (a credit carries it
 * over to its last installment).
 * Returns the payment, or the reason it can't be paid.
 */
export async function payExpense(
  id: string,
  monthKey: string | undefined,
  method: PaymentMethod | null,
  amount?: number,
): Promise<{ payment: Payment } | { error: string; status: number }> {
  // Only this expense's payments are needed (the engine filters by id
  // anyway); loading the whole table on every tap made quick successive
  // ticks needlessly heavy for the database.
  const [expense, payments] = await Promise.all([getExpenseById(id), getPaymentsForExpense(id)]);
  if (!expense) return { error: "Dépense introuvable.", status: 404 };
  const value = amount != null ? Math.round(amount * 100) / 100 : null;

  if (value != null && (await amountLocked(id))) return { error: AMOUNT_LOCKED, status: 409 };

  if (expense.type === "credit") {
    const evalMonth = monthKey ? parseMonthKey(monthKey) : todayMonth();
    const key = toMonthKey(evalMonth);
    const state = getCreditRealState(expense, payments, evalMonth);
    // This month's installment paid in part: add to it.
    const paidThisMonth = findPayment(payments.filter((p) => p.slotIndex != null), expense.id, key);
    if (paidThisMonth) {
      const rest = Math.round((paidThisMonth.amountDue - paidThisMonth.amountPaid) * 100) / 100;
      if (rest <= 0.005) return { error: "Cette mensualité est déjà payée.", status: 400 };
      const add = value ?? rest;
      if (add > state.remaining + 0.005) return { error: `Il ne reste que ${formatMoney(state.remaining)} sur cette dette.`, status: 400 };
      const payment = await addPaymentPart(expense.id, key, paidThisMonth.slotIndex, paidThisMonth.amountDue, add, method);
      return { payment };
    }
    if (state.pendingAmount <= 0) return { error: "Aucune mensualité en attente pour cette dette.", status: 400 };
    const paid = value ?? state.pendingAmount;
    if (paid > state.remaining + 0.005) return { error: `Il ne reste que ${formatMoney(state.remaining)} sur cette dette.`, status: 400 };
    const payment = await markCreditSlotPaid(expense.id, state.pendingAmount, paid, key, method);
    return { payment };
  }

  const currentMonth = todayMonth();
  const allExpenses = await getAllExpenses();
  const byId = new Map(allExpenses.map((e) => [e.id, e]));
  const unpaid = getUnpaidMonths(expense, payments, currentMonth, byId);

  let targetMonthKey: string;
  let amountDue: number;
  if (monthKey) {
    const match = unpaid.find((u) => u.monthKey === monthKey);
    if (match) {
      targetMonthKey = match.monthKey;
      amountDue = match.amountDue;
    } else {
      // Month not in the unpaid ledger (already settled, or outside the
      // usual range) — fall back to the actual occurrence amount for it.
      const occ = getOccurrenceForMonth(expense, parseMonthKey(monthKey), byId);
      if (!occ) return { error: "Aucune échéance pour ce mois.", status: 400 };
      targetMonthKey = monthKey;
      amountDue = occ.amount;
    }
  } else {
    if (!unpaid[0]) return { error: "Rien à payer pour cette dépense.", status: 400 };
    targetMonthKey = unpaid[0].monthKey;
    amountDue = unpaid[0].amountDue;
  }

  // Already paid in part: what's added is a part of its own.
  const already = findPayment(payments, expense.id, targetMonthKey);
  if (already && already.amountPaid > 0) {
    const add = value ?? Math.round((amountDue - already.amountPaid) * 100) / 100;
    if (add <= 0.005) return { error: "Ce mois est déjà payé.", status: 400 };
    return { payment: await addPaymentPart(expense.id, targetMonthKey, null, amountDue, add, method) };
  }
  return { payment: await markMonthPaid(expense.id, targetMonthKey, amountDue, value ?? amountDue, method) };
}
