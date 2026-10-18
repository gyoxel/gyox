import type { DepositSource, PaymentMethod } from "./types";

/** Cash or card: icon and label. */
export const METHOD_META: Record<PaymentMethod, { emoji: string; label: string }> = {
  cash: { emoji: "💵", label: "Espèces" },
  card: { emoji: "💳", label: "Carte" },
};

/** Where a goal deposit comes from: cash, the card, or the savings. */
export const DEPOSIT_SOURCE_META: Record<DepositSource, { emoji: string; label: string }> = {
  ...METHOD_META,
  savings: { emoji: "🐷", label: "Épargne" },
};
