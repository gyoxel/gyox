import { cn } from "@/lib/utils";

/**
 * The day over the line between rows (or above a card): what's under it was
 * done that day, until the next one. Small; written once for rows of the
 * same day.
 */
export function DateDivider({
  label,
  as: Tag = "li",
  className,
  lineClassName,
}: {
  label: string;
  as?: "li" | "div" | "span";
  className?: string;
  /** The line's colour where it sits on another (a tinted box). */
  lineClassName?: string;
}) {
  // Between cards ("div"), on the page: a line a little darker to be seen.
  const line = cn("h-px flex-1", lineClassName ?? (Tag === "div" ? "bg-slate-200 dark:bg-slate-700" : "bg-slate-100 dark:bg-slate-800"));
  return (
    <Tag className={cn("flex items-center gap-2 px-4 pb-0.5 pt-2", className)}>
      <span aria-hidden className={line} />
      <span className="text-[10px] font-medium tabular-nums text-slate-400">{label}</span>
      <span aria-hidden className={line} />
    </Tag>
  );
}

/**
 * The last done on top (by `at`, an ISO time or a day), those with nothing
 * done ("") last in their own order; each with the day to write over it —
 * only where it changes: once for rows of the same day, `noDate` before the
 * undated ones when dated ones came first.
 */
export function withDividers<T>(items: T[], at: (item: T) => string, label: (at: string) => string, noDate: string): { item: T; divider: string | null }[] {
  const sorted = items.map((item) => ({ item, at: at(item) })).sort(lastDoneFirst((s) => s.at));
  const dividers = dividersOf(
    sorted.map((s) => (s.at ? label(s.at) : "")),
    noDate,
  );
  return sorted.map(({ item }, i) => ({ item, divider: dividers[i] }));
}

/** Orders by `at`: the last done first, those with nothing done ("") last
 *  in their own order. */
export const lastDoneFirst =
  <T,>(at: (item: T) => string) =>
  (a: T, b: T): number =>
    Number(Boolean(at(b))) - Number(Boolean(at(a))) || at(b).localeCompare(at(a));

/** For days already in order ("" for nothing done): the day to write over
 *  each row, only where it changes. */
export function dividersOf(days: string[], noDate: string): (string | null)[] {
  return days.map((day, i) => (day === (days[i - 1] ?? "") ? null : day || noDate));
}
