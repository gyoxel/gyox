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

/**
 * When something was done, short enough to sit small beside it (Moroccan
 * time): "09:40" today, "hier 23:15", "12 oct. 14:05" this year, else
 * "12 oct. 2025". A day without a time ("2026-10-12"): "Aujourd'hui",
 * "Hier", "12 oct.". `t` translates the words.
 */
export function whenLabel(iso: string, lang: Lang, t: (text: string, vars?: Record<string, string>) => string, now = new Date()): string {
  const dayOnly = /^\d{4}-\d{2}-\d{2}$/.test(iso);
  // A day alone: its noon, the same day in Morocco.
  const date = new Date(dayOnly ? `${iso}T12:00:00Z` : iso);
  if (Number.isNaN(date.getTime())) return "";
  const day = DAY.format(date);
  const time = dayOnly ? "" : formatDate(date, lang, { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit" });
  if (day === DAY.format(now)) return time || t("Aujourd'hui");
  if (day === DAY.format(new Date(now.getTime() - 86_400_000))) return time ? t("hier {time}", { time }) : t("Hier");
  const sameYear = day.slice(0, 4) === DAY.format(now).slice(0, 4);
  const short = (d: Intl.DateTimeFormatOptions) => formatDate(date, lang, { timeZone: TIME_ZONE, ...d }).replace(/\.$/, "");
  return sameYear ? `${short({ day: "numeric", month: "short" })} ${time}`.trim() : short({ day: "numeric", month: "short", year: "numeric" });
}

/**
 * When something done on a day picked in a form happened, for whenLabel:
 * the moment it was saved when that's the same day (Moroccan time), else
 * the day alone.
 */
export function doneAt(day: string, createdAt: string): string {
  const saved = new Date(createdAt);
  return !Number.isNaN(saved.getTime()) && DAY.format(saved) === day ? createdAt : day;
}
