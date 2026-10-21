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

/** The month's short name alone: "Oct." / "Oct". */
export function monthShortName(month: number, lang: Lang): string {
  return MONTHS_SHORT[lang][month - 1];
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

const TIME_ZONE = "Africa/Casablanca";
const DAY = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" });

const WEEKDAY: Intl.DateTimeFormatOptions = { timeZone: TIME_ZONE, weekday: "long" };

/**
 * The day something was done, short enough to sit small beside it
 * (Moroccan time), never the hour: "Aujourd'hui", "Hier", then within the
 * week its day's name and date ("Lundi 19/10"), older the date alone
 * ("14/10", "14/10/25" another year). Takes an ISO time or a day
 * ("2026-10-12"); `t` translates the words.
 */
export function whenLabel(iso: string, lang: Lang, t: (text: string, vars?: Record<string, string>) => string, now = new Date()): string {
  // A day alone: its noon, the same day in Morocco.
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T12:00:00Z` : iso);
  if (Number.isNaN(date.getTime())) return "";
  const day = DAY.format(date);
  const today = DAY.format(now);
  const daysAgo = Math.round((Date.parse(today) - Date.parse(day)) / 86_400_000);
  if (daysAgo === 0) return t("Aujourd'hui");
  if (daysAgo === 1) return t("Hier");
  const short = `${day.slice(8, 10)}/${day.slice(5, 7)}${day.slice(0, 4) === today.slice(0, 4) ? "" : `/${day.slice(2, 4)}`}`;
  if (daysAgo > 1 && daysAgo < 7) {
    const name = formatDate(date, lang, WEEKDAY);
    return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${short}`;
  }
  return short;
}
