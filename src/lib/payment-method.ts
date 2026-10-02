import type { PaymentMethod } from "./types";

/** Cash or card: icon and label. */
export const METHOD_META: Record<PaymentMethod, { emoji: string; label: string }> = {
  cash: { emoji: "💵", label: "Cash" },
  card: { emoji: "💳", label: "Carte" },
};
