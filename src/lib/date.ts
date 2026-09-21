// All months are represented as plain {year, month} pairs (month = 1-12) to
// avoid timezone bugs entirely. All stored dates are "YYYY-MM-DD" strings.

export interface MonthId {
  year: number;
  month: number; // 1-12
}

export function monthKey(m: MonthId): string {
  return `${m.year}-${String(m.month).padStart(2, "0")}`;
}

export function parseMonthKey(key: string): MonthId {
  const [y, mo] = key.split("-").map(Number);
  return { year: y, month: mo };
}

export function addMonths(m: MonthId, delta: number): MonthId {
  const total = m.year * 12 + (m.month - 1) + delta;
  const year = Math.floor(total / 12);
  const month = (((total % 12) + 12) % 12) + 1;
  return { year, month };
}

export function compareMonths(a: MonthId, b: MonthId): number {
  return a.year * 12 + a.month - (b.year * 12 + b.month);
}

export function monthsBetween(a: MonthId, b: MonthId): number {
  return b.year * 12 + b.month - (a.year * 12 + a.month);
}

export function monthOfDateStr(dateStr: string): MonthId {
  const [y, mo] = dateStr.split("-").map(Number);
  return { year: y, month: mo };
}

export function todayMonth(): MonthId {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

// The app is used to plan the *upcoming* month's budget, so it opens on
// next month by default (e.g. if it's September, it opens on October).
export function defaultViewMonth(): MonthId {
  return addMonths(todayMonth(), 1);
}

const MONTHS_FR = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

export function monthLabelFr(m: MonthId): string {
  return `${MONTHS_FR[m.month - 1]} ${m.year}`;
}

export function monthLabelShortFr(m: MonthId): string {
  return `${MONTHS_FR[m.month - 1].slice(0, 3)} ${m.year}`;
}

export function monthToDateStr(m: MonthId): string {
  return `${monthKey(m)}-01`;
}

export function monthFromSearchParams(value: string | undefined, fallback: MonthId): MonthId {
  if (!value) return fallback;
  const parsed = parseMonthKey(value);
  if (Number.isNaN(parsed.year) || Number.isNaN(parsed.month)) return fallback;
  return parsed;
}

export function todayDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}
