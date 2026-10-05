import { formatMoney } from "./utils";
import type { PaymentMethod } from "./types";

const WHERE: Record<PaymentMethod, string> = { cash: "en cash", card: "sur la carte" };

/** Why a change is refused: "Solde insuffisant : il te reste 120 DH en cash." */
export function insufficientMessage(account: PaymentMethod, available: number): string {
  return `Solde insuffisant : il te reste ${formatMoney(Math.max(0, available))} ${WHERE[account]}.`;
}
