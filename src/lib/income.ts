// Extra incomes (on top of the salary): categories and month totals.
import type { Income } from "./types";

export const INCOME_CATEGORIES = [
  { key: "prime", label: "Prime", emoji: "🏆" },
  { key: "freelance", label: "Freelance", emoji: "💻" },
  { key: "heures-sup", label: "Heures sup", emoji: "⏱️" },
  { key: "vente", label: "Vente", emoji: "🛍️" },
  { key: "cadeau", label: "Cadeau", emoji: "🎁" },
  { key: "remboursement", label: "Remboursement", emoji: "↩️" },
  { key: "loyer", label: "Loyer reçu", emoji: "🏠" },
  { key: "investissement", label: "Investissement", emoji: "📈" },
  { key: "credit", label: "Crédit / prêt", emoji: "🏦" },
  { key: "autre", label: "Autre", emoji: "✨" },
] as const;

export type IncomeCategoryKey = (typeof INCOME_CATEGORIES)[number]["key"];

/** Set by the app only (not offered in the form): money taken back from
 *  the savings, a loan's repayment. */
const SYSTEM_CATEGORIES = [
  { key: "epargne", label: "Épargne", emoji: "🐷" },
  { key: "pret", label: "Prêt rendu", emoji: "🤝" },
] as const;

export function incomeCategory(key: string): { key: string; label: string; emoji: string } {
  return (
    INCOME_CATEGORIES.find((c) => c.key === key) ??
    SYSTEM_CATEGORIES.find((c) => c.key === key) ??
    INCOME_CATEGORIES[INCOME_CATEGORIES.length - 1]
  );
}

/** Not earned, only moved: money borrowed (a credit), taken back from the
 *  savings, or a loan given back. In the Solde, not in the month's income. */
const NOT_EARNED = new Set(["credit", "epargne", "pret"]);

/** Total earned in `month` ("YYYY-MM"). */
export function incomesIn(incomes: Income[], month: string): number {
  return (
    Math.round(
      incomes.filter((i) => i.date.startsWith(month) && !NOT_EARNED.has(i.category)).reduce((s, i) => s + i.amount, 0) * 100,
    ) / 100
  );
}
