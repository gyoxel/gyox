import { formatMoney } from "./utils";
import type { PaymentMethod } from "./types";
import { translate, type T } from "./i18n";

/** Why a change is refused: "Solde insuffisant : il te reste 120 DH en
 *  espèces." — in French from the server (the browser shows it in the
 *  device's language, see localizeMessage), in `t`'s language otherwise. */
export function insufficientMessage(account: PaymentMethod, available: number, t: T = (text, vars) => translate("fr", text, vars)): string {
  const amount = formatMoney(Math.max(0, available));
  return account === "cash"
    ? t("Solde insuffisant : il te reste {amount} en espèces.", { amount })
    : t("Solde insuffisant : il te reste {amount} sur la carte.", { amount });
}
