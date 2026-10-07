// What each delete says and calls — shared by the red button at the bottom
// of an edit page and the bin in its header (DeleteButton).
import type { DaretWithExpense, Expense, GoalDeposit, Income, Loan, SavingsMove } from "./types";
import { formatMoney } from "./utils";

/** Deleting an expense or a credit. */
export function expenseDelete(expense: Expense) {
  const credit = expense.type === "credit";
  return {
    label: credit ? "Supprimer ce crédit" : "Supprimer cette dépense",
    endpoint: `/api/expenses/${expense.id}`,
    title: credit ? "Supprimer ce crédit ?" : "Supprimer cette dépense ?",
    description: credit
      ? `« ${expense.name} », ses paiements et l'argent reçu enregistré dans tes revenus seront définitivement supprimés.`
      : `« ${expense.name} » sera définitivement supprimée. Le budget et les prévisions seront recalculés automatiquement.`,
    success: credit ? "Crédit supprimé." : "Dépense supprimée.",
    fallback: credit ? "/credits" : "/budget",
  };
}

/** Deleting an income (bottom button and header bin). */
export function incomeDelete(income: Income) {
  return {
    label: "Supprimer ce revenu",
    endpoint: `/api/incomes/${income.id}`,
    title: "Supprimer ce revenu ?",
    description: `« ${income.name} » (${formatMoney(income.amount)}) sera supprimé.`,
    success: "Revenu supprimé.",
    fallback: "/incomes",
  };
}

/** Deleting a daret (bottom button and header bin). */
export function daretDelete(daret: DaretWithExpense) {
  return {
    label: "Supprimer cette daret",
    endpoint: `/api/darets/${daret.id}`,
    title: "Supprimer cette daret ?",
    description: `« ${daret.expense.name} » et ses cotisations enregistrées seront définitivement supprimées.`,
    success: "Daret supprimée.",
    fallback: "/daret",
  };
}

/** Deleting a budget (its lines, its "+" expenses and "- Reste" incomes go with it). */
export function budgetDelete(budget: { id: string; expense: { name: string } }) {
  return {
    label: "Supprimer ce budget",
    endpoint: `/api/budgets/${budget.id}`,
    title: "Supprimer ce budget ?",
    description: `« ${budget.expense.name} », ses dépenses notées, ses dépassements et ses restes seront définitivement supprimés.`,
    success: "Budget supprimé.",
    fallback: "/budgets",
  };
}

/** Deleting a deposit (bottom button and header bin). */
export function depositDelete(goalId: string, deposit: GoalDeposit, currency: string) {
  return {
    label: "Supprimer ce versement",
    endpoint: `/api/goals/${goalId}/deposits/${deposit.id}`,
    title: "Supprimer ce versement ?",
    description: `${formatMoney(deposit.amount, currency)} sera retiré de l'objectif${deposit.expenseId ? " et de tes dépenses" : ""}.`,
    success: "Versement supprimé.",
    fallback: `/goals/${goalId}`,
  };
}

/** Deleting a goal (bottom button and header bin). */
export function goalDelete(goal: { id: string; emoji: string; name: string }) {
  return {
    label: "Supprimer l'objectif",
    endpoint: `/api/goals/${goal.id}`,
    title: "Supprimer cet objectif ?",
    description: `« ${goal.emoji} ${goal.name} » et tous ses versements seront supprimés. Tes darets ne sont pas touchées.`,
    success: "Objectif supprimé.",
    fallback: "/goals",
  };
}

/** Deleting a savings move (its expense / income goes with it). */
export function savingsDelete(move: SavingsMove) {
  if (move.kind === "existing") {
    return {
      label: "Supprimer cette épargne",
      endpoint: `/api/savings/${move.id}`,
      title: "Supprimer cette épargne ?",
      description: `${formatMoney(move.amount)} retirés de l'épargne. Ton solde ne change pas.`,
      success: "Épargne supprimée.",
      fallback: "/epargne",
    };
  }
  return {
    label: move.kind === "in" ? "Supprimer cette épargne" : "Supprimer ce retrait",
    endpoint: `/api/savings/${move.id}`,
    title: move.kind === "in" ? "Supprimer cette épargne ?" : "Supprimer ce retrait ?",
    description:
      move.kind === "in"
        ? `${formatMoney(move.amount)} retirés de l'épargne et de tes dépenses : ils reviennent dans ton solde.`
        : `${formatMoney(move.amount)} retirés de tes revenus : ils reviennent dans l'épargne.`,
    success: move.kind === "in" ? "Épargne supprimée." : "Retrait supprimé.",
    fallback: "/epargne",
  };
}

/** Deleting a loan (its expense and the repayments received go with it). */
export function loanDelete(loan: Pick<Loan, "id" | "name">) {
  return {
    label: "Supprimer ce prêt",
    endpoint: `/api/loans/${loan.id}`,
    title: "Supprimer ce prêt ?",
    description: `Le prêt à « ${loan.name} », sa sortie dans tes dépenses et les remboursements reçus seront définitivement supprimés.`,
    success: "Prêt supprimé.",
    fallback: "/prets",
  };
}
