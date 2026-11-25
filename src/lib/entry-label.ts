// A history entry's name, in the device's language (a name typed by the
// user stays as typed).
import type { WalletEntry } from "./wallet";
import { localName, type Lang, type T } from "./i18n";
import { monthLabelShort } from "./i18n/dates";
import { parseMonthKey } from "./date";

export function entryLabel(entry: Pick<WalletEntry, "label" | "say">, lang: Lang, t: T): string {
  if (!entry.say) return localName(entry.label, t);
  const { text, vars, period } = entry.say;
  const month = period ? monthLabelShort(parseMonthKey(period), lang) : null;
  return t(text, { ...vars, ...(month ? { period: lang === "en" ? month : month.toLowerCase() } : {}) });
}
