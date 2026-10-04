// What each delete says and calls — shared by the red button at the bottom
// of an edit page and the bin in its header (DeleteButton).
import type { DaretWithExpense, Expense, GoalDeposit, Income } from "./types";
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
