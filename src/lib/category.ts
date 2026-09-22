import type { ColorCategory, Expense } from "./types";

export const CATEGORY_META: Record<
  ColorCategory,
  { label: string; dot: string; badgeVariant: "blue" | "red" | "yellow"; barColor: string; cardBorder: string }
> = {
  blue: {
    label: "Temporaire (crédit)",
    dot: "bg-sky-400",
    badgeVariant: "blue",
    barColor: "bg-sky-400",
    cardBorder: "border-l-sky-300",
  },
  red: {
    label: "Permanent",
    dot: "bg-rose-400",
    badgeVariant: "red",
    barColor: "bg-rose-400",
    cardBorder: "border-l-rose-300",
  },
  yellow: {
    label: "Autre temporaire",
    dot: "bg-amber-400",
    badgeVariant: "yellow",
    barColor: "bg-amber-400",
    cardBorder: "border-l-amber-300",
  },
};

export const TYPE_LABELS_FR: Record<string, string> = {
  permanent: "Permanent",
  temporary: "Temporaire",
  credit: "Crédit",
};

export const FREQUENCY_LABELS_FR: Record<string, string> = {
  monthly: "Mensuel",
  "one-time": "Une seule fois",
};

const FALLBACK_ICON_BY_TYPE: Record<string, string> = {
  credit: "💳",
  permanent: "🏠",
  temporary: "📌",
};

export function expenseIcon(expense: Pick<Expense, "icon" | "type">): string {
  return expense.icon || FALLBACK_ICON_BY_TYPE[expense.type] || "💰";
}
