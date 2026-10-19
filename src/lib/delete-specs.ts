// What each delete says and calls — shared by the red button at the bottom
// of an edit page and the bin in its header (DeleteButton). In the device's
// language (`t`).
import type { DaretWithExpense, Expense, GoalDeposit, Income, Loan, SavingsMove } from "./types";
import type { T } from "./i18n";
import { formatMoney } from "./utils";

/** Deleting an expense or a credit. */
export function expenseDelete(expense: Expense, t: T) {
  const credit = expense.type === "credit";
  return {
    label: credit ? t("Supprimer cette dette") : t("Supprimer cette dépense"),
    endpoint: `/api/expenses/${expense.id}`,
    title: credit ? t("Supprimer cette dette ?") : t("Supprimer cette dépense ?"),
    description: credit
      ? t("« {name} », ses paiements et l'argent reçu enregistré dans tes revenus seront définitivement supprimés.", { name: expense.name })
      : t("« {name} » sera définitivement supprimée. Le budget et les prévisions seront recalculés automatiquement.", { name: expense.name }),
    success: credit ? t("Dette supprimée.") : t("Dépense supprimée."),
    fallback: credit ? "/credits" : "/budget",
  };
}

/** Deleting an income (bottom button and header bin). */
export function incomeDelete(income: Income, t: T) {
  return {
    label: t("Supprimer ce revenu"),
    endpoint: `/api/incomes/${income.id}`,
    title: t("Supprimer ce revenu ?"),
    description: t("« {name} » ({amount}) sera supprimé.", { name: income.name, amount: formatMoney(income.amount) }),
    success: t("Revenu supprimé."),
    fallback: "/incomes",
  };
}

/** Deleting a daret (bottom button and header bin). */
export function daretDelete(daret: DaretWithExpense, t: T) {
  return {
    label: t("Supprimer cette daret"),
    endpoint: `/api/darets/${daret.id}`,
    title: t("Supprimer cette daret ?"),
    description: t("« {name} » et ses cotisations enregistrées seront définitivement supprimées.", { name: daret.expense.name }),
    success: t("Daret supprimée."),
    fallback: "/daret",
  };
}

/** Deleting a budget (its lines, its "+" expenses and "- Reste" incomes go with it). */
export function budgetDelete(budget: { id: string; expense: { name: string } }, t: T) {
  return {
    label: t("Supprimer ce budget"),
    endpoint: `/api/budgets/${budget.id}`,
    title: t("Supprimer ce budget ?"),
    description: t("« {name} », ses dépenses notées, ses dépassements et ses restes seront définitivement supprimés.", {
      name: budget.expense.name,
    }),
    success: t("Budget supprimé."),
    fallback: "/budgets",
  };
}

/** Deleting a deposit (bottom button and header bin). */
export function depositDelete(goalId: string, deposit: GoalDeposit, currency: string, t: T) {
  const amount = formatMoney(deposit.amount, currency);
  return {
    label: t("Supprimer ce versement"),
    endpoint: `/api/goals/${goalId}/deposits/${deposit.id}`,
    title: t("Supprimer ce versement ?"),
    description:
      deposit.method === "savings"
        ? t("{amount} sera retiré de l'objectif et reviendra dans l'épargne.", { amount })
        : deposit.expenseId
          ? t("{amount} sera retiré de l'objectif et de tes dépenses.", { amount })
          : t("{amount} sera retiré de l'objectif.", { amount }),
    success: t("Versement supprimé."),
    fallback: `/goals/${goalId}`,
  };
}

/** Deleting a goal (bottom button and header bin). */
export function goalDelete(goal: { id: string; emoji: string; name: string }, t: T) {
  return {
    label: t("Supprimer l'objectif"),
    endpoint: `/api/goals/${goal.id}`,
    title: t("Supprimer cet objectif ?"),
    description: t("« {name} » et tous ses versements seront supprimés. Tes darets ne sont pas touchées.", {
      name: `${goal.emoji} ${goal.name}`,
    }),
    success: t("Objectif supprimé."),
    fallback: "/goals",
  };
}

/** Deleting a savings move (its expense / income goes with it). */
export function savingsDelete(move: SavingsMove, t: T) {
  const amount = formatMoney(move.amount);
  if (move.kind === "existing") {
    return {
      label: t("Supprimer cette épargne"),
      endpoint: `/api/savings/${move.id}`,
      title: t("Supprimer cette épargne ?"),
      description: t("{amount} retirés de l'épargne. Ton solde ne change pas.", { amount }),
      success: t("Épargne supprimée."),
      fallback: "/epargne",
    };
  }
  return {
    label: move.kind === "in" ? t("Supprimer cette épargne") : t("Supprimer ce retrait"),
    endpoint: `/api/savings/${move.id}`,
    title: move.kind === "in" ? t("Supprimer cette épargne ?") : t("Supprimer ce retrait ?"),
    description:
      move.kind === "in"
        ? t("{amount} retirés de l'épargne et de tes dépenses : ils reviennent dans ton solde.", { amount })
        : t("{amount} retirés de tes revenus : ils reviennent dans l'épargne.", { amount }),
    success: move.kind === "in" ? t("Épargne supprimée.") : t("Retrait supprimé."),
    fallback: "/epargne",
  };
}

/** Deleting a loan (its expense and the repayments received go with it). */
export function loanDelete(loan: Pick<Loan, "id" | "name">, t: T) {
  return {
    label: t("Supprimer"),
    endpoint: `/api/loans/${loan.id}`,
    title: t("Supprimer l'argent prêté à « {name} » ?", { name: loan.name }),
    description: t("Sa sortie dans tes dépenses et ce qu'on t'a déjà rendu seront définitivement supprimés."),
    success: t("Supprimé."),
    fallback: "/prets",
  };
}
