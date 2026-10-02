"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Info, StickyNote } from "lucide-react";
import { cn, formatMoney } from "@/lib/utils";
import { DayNoteEditor } from "@/components/day-note-editor";

export interface CalendarEvent {
  id: string;
  kind: "out" | "in" | "saving";
  label: string;
  icon: string;
  amount: number;
  /** Exact time (ISO) for payments; a plain "YYYY-MM-DD" for the rest. */
  at: string;
}

/** "À savoir": something that happens (or will happen) on a day. */
export interface CalendarInfo {
  id: string;
  /** "YYYY-MM-DD" */
  date: string;
  icon: string;
  label: string;
  detail?: string;
}

// Days are counted in Moroccan time on both server and browser, so a
// payment made just after midnight lands on the right day everywhere.
const TIME_ZONE = "Africa/Casablanca";
const DAY_KEY = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" });
const TIME = new Intl.DateTimeFormat("fr-FR", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit" });
const DAY_TITLE = new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" });
const SWIPE_PX = 40;
const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];

const dayKeyOf = (at: string) => (at.length === 10 ? at : DAY_KEY.format(new Date(at)));
const todayKey = () => DAY_KEY.format(new Date());

/** 700 → "700", 1500 → "1,5k", 12000 → "12k" — fits in a day cell. */
function compact(n: number): string {
  if (n < 1000) return String(Math.round(n));
  const k = n / 1000;
  return `${(k >= 10 ? Math.round(k) : Math.round(k * 10) / 10).toString().replace(".", ",")}k`;
}

/**
 * Month calendar: under each day, what went out (red) and came in (green),
 * plus dots for reminders (violet) and notes (amber). Tapping a day shows
 * its movements, its reminders and its note below.
 */
export function CalendarView({
  month,
  monthLabel,
  events,
  infos,
  notes,
  prevHref,
  nextHref,
  currency,
}: {
  /** "YYYY-MM" */
  month: string;
  monthLabel: string;
  events: CalendarEvent[];
  infos: CalendarInfo[];
  /** Notes of this month by "YYYY-MM-DD". */
  notes: Record<string, string>;
  prevHref: string;
  nextHref: string;
  currency: string;
}) {
  const [year, mon] = month.split("-").map(Number);
  const daysInMonth = new Date(year, mon, 0).getDate();
  const firstWeekday = (new Date(year, mon - 1, 1).getDay() + 6) % 7; // Monday first
  const today = todayKey();

  const byDay = new Map<string, CalendarEvent[]>();
  for (const e of events) {
    const key = dayKeyOf(e.at);
    if (!key.startsWith(month)) continue;
    byDay.set(key, [...(byDay.get(key) ?? []), e]);
  }
  const infosByDay = new Map<string, CalendarInfo[]>();
  for (const i of infos) infosByDay.set(i.date, [...(infosByDay.get(i.date) ?? []), i]);
  const sum = (list: CalendarEvent[], kind: CalendarEvent["kind"]) =>
    list.filter((e) => e.kind === kind).reduce((s, e) => s + e.amount, 0);
  const dayKey = (d: number) => `${month}-${String(d).padStart(2, "0")}`;
  const [selected, setSelected] = useState<string | null>(today.startsWith(month) ? today : null);
  const selectedEvents = selected ? (byDay.get(selected) ?? []) : [];
  const selectedInfos = selected ? (infosByDay.get(selected) ?? []) : [];

  // Swipe on the grid: right → previous month, left → next (never the future).
  const router = useRouter();
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  function onTouchStart(e: React.TouchEvent) {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
  function onTouchEnd(e: React.TouchEvent) {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const dx = e.changedTouches[0].clientX - start.x;
    const dy = e.changedTouches[0].clientY - start.y;
    if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) < Math.abs(dy)) return;
    router.replace(dx > 0 ? prevHref : nextHref, { scroll: false });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Month navigation: arrows or swipe on the grid */}
      <div className="flex items-center justify-between gap-2">
        <NavArrow href={prevHref} label="Mois précédent">
          <ChevronLeft className="h-4 w-4" />
        </NavArrow>
        <div className="text-lg font-semibold text-slate-900 dark:text-white">{monthLabel}</div>
        <NavArrow href={nextHref} label="Mois suivant">
          <ChevronRight className="h-4 w-4" />
        </NavArrow>
      </div>

      {/* Grid */}
      <div
        className="touch-pan-y rounded-2xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className="grid grid-cols-7 pb-1">
          {WEEKDAYS.map((w, i) => (
            <span key={i} className="py-1 text-center text-[11px] font-semibold text-slate-400">
              {w}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstWeekday }, (_, i) => (
            <span key={`pad-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const d = i + 1;
            const key = dayKey(d);
            const list = byDay.get(key) ?? [];
            const out = sum(list, "out");
            const inn = sum(list, "in");
            const saved = sum(list, "saving");
            const future = key > today;
            const hasInfo = infosByDay.has(key);
            const hasNote = key in notes;
            const isToday = key === today;
            const isSelected = key === selected;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelected(isSelected ? null : key)}
                className={cn(
                  "flex min-h-[58px] flex-col items-center rounded-xl px-0.5 pb-1 pt-1.5 transition-colors",
                  isSelected
                    ? "bg-[#019c86]/10 ring-2 ring-[#019c86]"
                    : list.length > 0
                      ? "bg-slate-50 active:bg-slate-100 dark:bg-slate-800/60 dark:active:bg-slate-800"
                      : "active:bg-slate-50 dark:active:bg-slate-800/60",
                )}
              >
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
                    isToday
                      ? "bg-[#019c86] text-white"
                      : future
                        ? "text-slate-400 dark:text-slate-500"
                        : "text-slate-700 dark:text-slate-200",
                  )}
                >
                  {d}
                </span>
                {inn > 0 && <span className="text-[10px] font-semibold leading-tight text-emerald-600">+{compact(inn)}</span>}
                {out > 0 && <span className="text-[10px] font-semibold leading-tight text-rose-600">−{compact(out)}</span>}
                {(hasInfo || hasNote || (saved > 0 && inn === 0 && out === 0)) && (
                  <span className="mt-0.5 flex gap-0.5">
                    {saved > 0 && inn === 0 && out === 0 && <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />}
                    {hasInfo && <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />}
                    {hasNote && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="-mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
        <Legend className="bg-violet-500">À savoir</Legend>
        <Legend className="bg-amber-500">Note</Legend>
        <Legend className="bg-teal-500">Objectif</Legend>
      </div>

      {/* Selected day */}
      {selected && (
        <section className="flex flex-col gap-2">
          <h2 className="px-1 text-sm font-semibold capitalize text-slate-600 dark:text-slate-300">
            {DAY_TITLE.format(new Date(`${selected}T12:00:00Z`))}
          </h2>
          {selectedInfos.length > 0 && (
            <ul className="flex flex-col gap-1.5">
              {selectedInfos.map((i) => (
                <li
                  key={i.id}
                  className="flex items-center gap-3 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 dark:border-violet-900/60 dark:bg-violet-950/40"
                >
                  <span className="text-lg leading-none">{i.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">{i.label}</span>
                    {i.detail && <span className="block text-xs text-violet-700 dark:text-violet-300">{i.detail}</span>}
                  </span>
                  <Info className="h-4 w-4 shrink-0 text-violet-400" />
                </li>
              ))}
            </ul>
          )}
          {selectedEvents.length > 0 ? (
            <ul className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              {selectedEvents.map((e) => (
                <li key={e.id} className="flex items-center gap-3 border-t border-slate-100 px-4 py-3 first:border-t-0 dark:border-slate-800">
                  <span className="text-lg leading-none">{e.icon}</span>
                  <span className="flex min-w-0 flex-1 items-baseline gap-2">
                    <span className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{e.label}</span>
                    {e.at.length > 10 && <span className="shrink-0 text-[11px] text-slate-400">{TIME.format(new Date(e.at))}</span>}
                  </span>
                  <span
                    className={cn(
                      "text-sm font-semibold tabular-nums",
                      e.kind === "in" ? "text-emerald-600" : e.kind === "out" ? "text-rose-600" : "text-teal-600",
                    )}
                  >
                    {e.kind === "out" ? "−" : "+"}
                    {formatMoney(e.amount, currency)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            selected <= today &&
            selectedInfos.length === 0 && (
              <p className="rounded-xl border border-dashed border-slate-200 px-3 py-3 text-center text-sm text-slate-400 dark:border-slate-700">
                Aucun mouvement ce jour-là.
              </p>
            )
          )}
          <h3 className="mt-1 flex items-center gap-1.5 px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <StickyNote className="h-3.5 w-3.5" />
            Note
          </h3>
          <DayNoteEditor key={`${selected}:${notes[selected] ?? ""}`} date={selected} text={notes[selected] ?? ""} />
        </section>
      )}
    </div>
  );
}

function Legend({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1">
      <span className={cn("h-1.5 w-1.5 rounded-full", className)} />
      {children}
    </span>
  );
}

function NavArrow({ href, label, children }: { href: string | null; label: string; children: React.ReactNode }) {
  const className =
    "flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200";
  return href ? (
    <Link href={href} prefetch replace scroll={false} aria-label={label} className={className}>
      {children}
    </Link>
  ) : (
    <span aria-hidden className={cn(className, "opacity-30")}>
      {children}
    </span>
  );
}
