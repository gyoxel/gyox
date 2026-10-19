// Months and dates in the device's language. Darija takes the French month
// names (as they're said) and its own weekday names.
import type { MonthId } from "../date";
import type { Lang } from "./index";

const MONTHS: Record<Lang, string[]> = {
  fr: ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"],
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  dar: ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"],
};

// Never ambiguous (Juin vs Juil.).
const MONTHS_SHORT: Record<Lang, string[]> = {
  fr: ["Janv.", "Févr.", "Mars", "Avr.", "Mai", "Juin", "Juil.", "Août", "Sept.", "Oct.", "Nov.", "Déc."],
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  dar: ["Janv.", "Févr.", "Mars", "Avr.", "Mai", "Juin", "Juil.", "Août", "Sept.", "Oct.", "Nov.", "Déc."],
};

/** "Octobre 2026" / "October 2026". */
export function monthLabel(m: MonthId, lang: Lang): string {
  return `${MONTHS[lang][m.month - 1]} ${m.year}`;
}

/** "Oct. 2026" / "Oct 2026". */
export function monthLabelShort(m: MonthId, lang: Lang): string {
  return `${MONTHS_SHORT[lang][m.month - 1]} ${m.year}`;
}

/** The month's name alone: "Octobre" / "October". */
export function monthName(month: number, lang: Lang): string {
  return MONTHS[lang][month - 1];
}

/** The locale Intl formats dates with (Darija: French, its weekdays then
 *  put in Darija by formatDate). */
export const dateLocale = (lang: Lang) => (lang === "en" ? "en-GB" : "fr-FR");

const DARIJA_DAYS: [RegExp, string][] = [
  [/\blundi\b|\blun\.?(?=\s|$)/gi, "tnin"],
  [/\bmardi\b|\bmar\.?(?=\s|$)/gi, "tlat"],
  [/\bmercredi\b|\bmer\.?(?=\s|$)/gi, "larb3"],
  [/\bjeudi\b|\bjeu\.?(?=\s|$)/gi, "lkhmis"],
  [/\bvendredi\b|\bven\.?(?=\s|$)/gi, "jjem3a"],
  [/\bsamedi\b|\bsam\.?(?=\s|$)/gi, "ssebt"],
  [/\bdimanche\b|\bdim\.?(?=\s|$)/gi, "l7edd"],
];

/** A date with Intl's options, in `lang`. */
export function formatDate(date: Date, lang: Lang, options: Intl.DateTimeFormatOptions): string {
  const out = new Intl.DateTimeFormat(dateLocale(lang), options).format(date);
  if (lang !== "dar") return out;
  return DARIJA_DAYS.reduce(
    (text, [pattern, day]) => text.replace(pattern, (found) => (found[0] === found[0].toUpperCase() ? day[0].toUpperCase() + day.slice(1) : day)),
    out,
  );
}
