// Marking an expense paid (a month, or a credit's next installment) — shared
// by the payments route and by creating an expense already paid.
import { monthKey as toMonthKey, parseMonthKey, todayMonth } from "./date";
import { getCreditRealState, getOccurrenceForMonth, getUnpaidMonths } from "./engine";
import {
  getAllExpenses,
  getDaretOfExpense,
  getDepositOfExpense,
  getExpenseById,
  getPaymentsForExpense,
  markCreditSlotPaid,
  markMonthPaid,
  setMonthAmount,
} from "./repository";
import { getSavingsMoveOfExpense } from "./savings-repo";
import { getLoanOfExpense } from "./loans-repo";
import { budgetIdOfExpense } from "./budgets-repo";
import type { Payment, PaymentMethod } from "./types";

/**
 * - Non-credit: settles `monthKey` (omitted: the oldest unpaid month).
 * - Credit: pays the installment pending as of `monthKey` (omitted: now).
 * `amount`: paid another amount than expected — it becomes that month's own
 * amount (a recurring expense goes back to its usual one the month after,
 * a credit carries the difference over to its last installment).
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
  const [loaded, payments] = await Promise.all([getExpenseById(id), getPaymentsForExpense(id)]);
  let expense = loaded;
  if (!expense) return { error: "Dépense introuvable.", status: 404 };

  if (amount != null) {
    const [daret, deposit, move, loan, budget] = await Promise.all([
      getDaretOfExpense(id),
      getDepositOfExpense(id),
      getSavingsMoveOfExpense(id),
      getLoanOfExpense(id),
      budgetIdOfExpense(id),
    ]);
    if (daret || deposit || move || loan || budget) {
      return { error: "Ce montant se change depuis là d'où vient la dépense.", status: 409 };
    }
    const key = monthKey ?? toMonthKey(todayMonth());
    const usual =
      expense.type === "credit"
        ? getCreditRealState({ ...expense, monthAmounts: withoutMonth(expense.monthAmounts, key) }, payments, parseMonthKey(key)).pendingAmount
        : (getOccurrenceForMonth({ ...expense, monthAmounts: withoutMonth(expense.monthAmounts, key) }, parseMonthKey(key), new Map())?.amount ?? 0);
    const value = Math.round(amount * 100) / 100;
    if (Math.abs(value - usual) > 0.005 || expense.monthAmounts?.[key] != null) {
      expense = (await setMonthAmount(id, key, Math.abs(value - usual) > 0.005 ? value : null)) ?? expense;
    }
    monthKey = key;
  }

  if (expense.type === "credit") {
    const evalMonth = monthKey ? parseMonthKey(monthKey) : todayMonth();
    const state = getCreditRealState(expense, payments, evalMonth);
    if (state.pendingAmount <= 0) return { error: "Aucune mensualité en attente pour ce crédit.", status: 400 };
    const payment = await markCreditSlotPaid(expense.id, state.pendingAmount, state.pendingAmount, toMonthKey(evalMonth), method);
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

  return { payment: await markMonthPaid(expense.id, targetMonthKey, amountDue, amountDue, method) };
}

const withoutMonth = (amounts: Record<string, number> | null, key: string) => {
  if (!amounts || amounts[key] == null) return amounts;
  const rest = { ...amounts };
  delete rest[key];
  return Object.keys(rest).length > 0 ? rest : null;
};
