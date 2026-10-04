// Extra incomes (on top of the salary): categories and month totals.
import type { Category, Income } from "./types";

/** The default categories (also in the database, with these keys as ids):
 *  used when a list isn't at hand, or for an id no longer in it. */
const DEFAULT_INCOME_CATEGORIES = [
  { key: "prime", label: "Prime", emoji: "🏆" },
  { key: "freelance", label: "Freelance", emoji: "💻" },
  { key: "heures-sup", label: "Heures sup", emoji: "⏱️" },
  { key: "vente", label: "Vente", emoji: "🛍️" },
  { key: "cadeau", label: "Cadeau", emoji: "🎁" },
  { key: "remboursement", label: "Remboursement", emoji: "↩️" },
  { key: "loyer", label: "Loyer reçu", emoji: "🏠" },
  { key: "investissement", label: "Investissement", emoji: "📈" },
  { key: "autre", label: "Autre", emoji: "✨" },
];

/** Set by the app only (not offered in the form): a credit's money, money
 *  taken back from the savings, a loan's repayment. */
const SYSTEM_CATEGORIES = [
  { key: "credit", label: "Crédit / prêt", emoji: "🏦" },
  { key: "epargne", label: "Épargne", emoji: "🐷" },
  { key: "pret", label: "Prêt rendu", emoji: "🤝" },
];

/** Label and emoji of an income's category (from `list` when given). */
export function incomeCategory(key: string, list?: Category[]): { key: string; label: string; emoji: string } {
  const own = list?.find((c) => c.id === key);
  if (own) return { key: own.id, label: own.name, emoji: own.emoji };
  return (
    SYSTEM_CATEGORIES.find((c) => c.key === key) ??
    DEFAULT_INCOME_CATEGORIES.find((c) => c.key === key) ??
    DEFAULT_INCOME_CATEGORIES[DEFAULT_INCOME_CATEGORIES.length - 1]
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
