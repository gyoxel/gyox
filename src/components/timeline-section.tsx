import type { DaretWithExpense, Expense, Payment } from "@/lib/types";
import { addMonths, compareMonths, monthLabelFr, monthOfDateStr, monthsBetween, todayMonth, type MonthId } from "@/lib/date";
import { getDaretState } from "@/lib/daret";
import { getCreditDisplayProgress, getCreditRealState, getEffectiveEndMonth } from "@/lib/engine";
import { cn, formatMoney } from "@/lib/utils";
import { displayIcon } from "@/lib/category";
import { ScrollToFraction } from "@/components/scroll-to-fraction";

const INITIALS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
const SHORT = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
/** "juin 27" — fits next to the remaining amount. */
const monthShort = (m: MonthId) => `${SHORT[m.month - 1]} ${String(m.year).slice(2)}`;
/** Longest span drawn (beyond it, bars are cut at the edge). */
const MAX_MONTHS = 36;
/** Narrowest a month gets, so every month keeps its letter: a longer span
 *  scrolls sideways instead of skipping months. */
const MONTH_PX = 11;
/** The name column (88px) and the gap after it. */
const NAME_PX = 96;

interface Row {
  expense: Expense;
  kind: "credit" | "daret";
  start: MonthId;
  end: MonthId | null;
  /** Share actually repaid, 0-100. */
  percent: number;
  paid: number;
  total: number;
  /** Daret: the month the user collects the pot. */
  turn?: MonthId;
}

const STYLE = {
  credit: {
    paid: "bg-gradient-to-r from-sky-400 to-blue-600",
    rest: "bg-blue-100 dark:bg-blue-950/70",
    text: "text-blue-700 dark:text-blue-300",
  },
  daret: {
    paid: "bg-gradient-to-r from-rose-400 to-rose-600",
    rest: "bg-rose-100 dark:bg-rose-950/60",
    text: "text-rose-700 dark:text-rose-300",
  },
} as const;

/**
 * Timeline of every commitment with an end (credits and darets), drawn as a
 * planning: one bar per commitment from its first to its last month on a
 * shared month axis, filled with what has really been paid, a line on the
 * current month and a 🏁 on the day everything is paid off.
 */
export function TimelineSection({
  expenses,
  darets,
  payments,
  currency,
  categoryEmoji,
}: {
  expenses: Expense[];
  darets: DaretWithExpense[];
  payments: Payment[];
  currency: string;
  categoryEmoji: ReadonlyMap<string, string>;
}) {
  const byId = new Map(expenses.map((e) => [e.id, e]));
  const current = todayMonth();
  const money = (n: number) => formatMoney(n, currency);

  const creditRows: Row[] = expenses
    .filter((e) => e.active && e.type === "credit")
    .map((expense) => {
      const state = getCreditRealState(expense, payments, current);
      return {
        expense,
        kind: "credit",
        start: monthOfDateStr(expense.startDate),
        end: state.projectedEndMonth ?? getEffectiveEndMonth(expense, byId),
        ...getCreditDisplayProgress(expense, state),
      };
    });

  const daretRows: Row[] = darets
    .filter((d) => d.expense.active)
    .map((daret) => {
      const state = getDaretState(daret, payments, current);
      return {
        expense: daret.expense,
        kind: "daret",
        start: state.start,
        end: state.end,
        turn: state.turn,
        percent: Math.round((state.paidRounds / Math.max(1, daret.members)) * 100),
        paid: state.paidRounds * daret.expense.amount,
        total: state.totalContribution,
      };
    });

  // Soonest end first.
  const rows = [...creditRows, ...daretRows].sort((a, b) => {
    if (!a.end || !b.end) return a.end ? -1 : b.end ? 1 : 0;
    return compareMonths(a.end, b.end);
  });
  if (rows.length === 0) return null;

  // Shared axis: from the earliest start (or this month) to the last end.
  const ends = rows.map((r) => r.end ?? addMonths(current, MAX_MONTHS - 1));
  const lastEnd = ends.reduce((a, b) => (compareMonths(a, b) >= 0 ? a : b));
  let axisStart = rows.map((r) => r.start).reduce((a, b) => (compareMonths(a, b) <= 0 ? a : b), current);
  if (compareMonths(axisStart, current) > 0) axisStart = current;
  let axisEnd = compareMonths(lastEnd, current) < 0 ? current : lastEnd;
  if (monthsBetween(axisStart, axisEnd) + 1 > MAX_MONTHS) axisEnd = addMonths(axisStart, MAX_MONTHS - 1);
  const span = monthsBetween(axisStart, axisEnd) + 1;
  const clamp = (n: number) => Math.min(100, Math.max(0, n));
  /** Left edge of a month on the axis, in %. */
  const at = (m: MonthId) => clamp((monthsBetween(axisStart, m) / span) * 100);
  const months = Array.from({ length: span }, (_, i) => addMonths(axisStart, i));
  const todayLeft = at(current) + 50 / span;

  // Summary: what's left on the credits, per month now, and the day it's all over.
  const credits = rows.filter((r) => r.kind === "credit");
  const remaining = credits.reduce((s, r) => s + Math.max(0, r.total - r.paid), 0);
  const monthly = credits
    .filter((r) => r.end && compareMonths(r.end, current) >= 0 && r.percent < 100)
    .reduce((s, r) => s + r.expense.amount, 0);
  const freeAt = credits
    .map((r) => r.end)
    .filter((m): m is MonthId => m != null)
    .reduce<MonthId | null>((a, b) => (!a || compareMonths(b, a) > 0 ? b : a), null);

  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="px-1 text-sm font-semibold text-slate-600 dark:text-slate-300">Timeline</h2>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {/* Summary */}
        {credits.length > 0 && (
          <div className="bg-gradient-to-br from-sky-500 to-blue-700 px-4 pb-4 pt-3.5 text-white">
            <p className="text-xs font-medium text-white/80">Libre de tous tes crédits</p>
            <p className="mt-0.5 flex items-center gap-2 text-xl font-bold capitalize">
              🏁 {freeAt ? monthLabelFr(freeAt) : "—"}
              {freeAt && compareMonths(freeAt, current) > 0 && (
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-semibold normal-case">
                  dans {monthsBetween(current, freeAt)} mois
                </span>
              )}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-white/15 px-3 py-2">
                <p className="text-[11px] text-white/75">Reste à payer</p>
                <p className="text-sm font-bold tabular-nums">{money(remaining)}</p>
              </div>
              <div className="rounded-xl bg-white/15 px-3 py-2">
                <p className="text-[11px] text-white/75">Par mois</p>
                <p className="text-sm font-bold tabular-nums">{money(monthly)}</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col px-3 pb-3 pt-3">
          <ScrollToFraction fraction={(NAME_PX + (todayLeft / 100) * span * MONTH_PX) / (NAME_PX + span * MONTH_PX)}>
          <div style={{ minWidth: NAME_PX + span * MONTH_PX }}>
          {/* Month axis: every month */}
          <div className="flex items-end gap-2">
            <div className="sticky left-0 z-10 w-[88px] shrink-0 self-stretch bg-white dark:bg-slate-900" />
            <div className="relative h-8 flex-1">
              {months.map((m, i) => (
                <span
                  key={i}
                  className={cn(
                    "absolute bottom-0 -translate-x-1/2 text-center text-[9px] leading-tight",
                    compareMonths(m, current) === 0 ? "font-bold text-blue-600 dark:text-sky-300" : "text-slate-400",
                  )}
                  style={{ left: `${at(m) + 50 / span}%` }}
                >
                  {m.month === 1 || i === 0 ? (
                    <span className="block text-[9px] font-semibold text-slate-500 dark:text-slate-400">
                      {String(m.year).slice(2)}
                    </span>
                  ) : null}
                  {INITIALS[m.month - 1]}
                </span>
              ))}
            </div>
          </div>

          {/* Rows */}
          <div className="relative mt-1 flex flex-col">
            {rows.map((r) => {
              const s = STYLE[r.kind];
              const left = at(r.start);
              const right = r.end ? clamp(at(r.end) + 100 / span) : 100;
              const width = Math.max(right - left, 100 / span);
              const done = r.percent >= 100;
              return (
                <div key={r.expense.id} className="flex items-center gap-2 border-t border-slate-100 py-2.5 first:border-t-0 dark:border-slate-800">
                  <div className="sticky left-0 z-10 flex w-[88px] shrink-0 items-center gap-1.5 self-stretch bg-white dark:bg-slate-900">
                    <span className="text-lg leading-none">{displayIcon(r.expense, categoryEmoji)}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-semibold text-slate-800 dark:text-slate-100">
                        {r.expense.name}
                      </span>
                      <span className="block truncate text-[10px] text-slate-400">{money(r.expense.amount)}/m</span>
                    </span>
                  </div>
                  <div className="relative flex-1">
                    {/* Today */}
                    <div
                      className="pointer-events-none absolute -bottom-2.5 -top-2.5 w-px bg-blue-500/50 dark:bg-sky-400/40"
                      style={{ left: `${todayLeft}%` }}
                    />
                    {/* Bar: whole span, filled with what's paid */}
                    <div className="relative h-4">
                      <div
                        className={cn("absolute inset-y-0 overflow-hidden rounded-full", s.rest)}
                        style={{ left: `${left}%`, width: `${width}%` }}
                      >
                        <div className={cn("h-full rounded-full", s.paid)} style={{ width: `${r.percent}%` }} />
                      </div>
                      {r.turn && (
                        <span
                          className="absolute -top-1 -translate-x-1/2 text-[13px] leading-none"
                          style={{ left: `${at(r.turn) + 50 / span}%` }}
                          title={`Ton tour : ${monthLabelFr(r.turn)}`}
                        >
                          💰
                        </span>
                      )}
                    </div>
                    {/* Stays in view while the bars scroll sideways. */}
                    <p
                      className="sticky mt-1 flex items-baseline justify-between gap-1 text-[10px]"
                      style={{ left: NAME_PX, maxWidth: `calc(100vw - ${NAME_PX + 56}px)` }}
                    >
                      <span className={cn("font-semibold tabular-nums", s.text)}>{done ? "Terminé ✓" : `${r.percent}%`}</span>
                      <span className="truncate text-slate-400">
                        {!done && (
                          <>
                            <b className={cn("text-[11px] tabular-nums", s.text)}>{money(Math.max(0, r.total - r.paid))}</b>{" "}
                            restants ·{" "}
                          </>
                        )}
                        {r.end ? `fin ${monthShort(r.end)}` : "sans fin"}
                      </span>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          </div>
          </ScrollToFraction>

          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-[10px] text-slate-400">
            <span className="flex items-center gap-1">
              <span className="h-2 w-3 rounded-full bg-gradient-to-r from-sky-400 to-blue-600" /> Payé
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-3 rounded-full bg-blue-100 dark:bg-blue-950" /> Restant
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-px bg-blue-500/60" /> Aujourd&apos;hui
            </span>
            {daretRows.length > 0 && <span>💰 Ton tour de daret</span>}
          </p>
        </div>
      </div>
    </section>
  );
}
