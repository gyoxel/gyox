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

export function incomeCategory(key: string) {
  return INCOME_CATEGORIES.find((c) => c.key === key) ?? INCOME_CATEGORIES[INCOME_CATEGORIES.length - 1];
}

/** Total earned in `month` ("YYYY-MM"). Money borrowed (a credit taken)
 *  isn't earned: it's in the Solde, not in the month's income. */
export function incomesIn(incomes: Income[], month: string): number {
  return (
    Math.round(
      incomes.filter((i) => i.date.startsWith(month) && i.category !== "credit").reduce((s, i) => s + i.amount, 0) * 100,
    ) / 100
  );
}
