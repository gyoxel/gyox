"use client";

import { useState } from "react";
import { cn, formatMoney } from "@/lib/utils";

export interface StairMonth {
  key: string;
  /** "Nov." */
  short: string;
  /** "Novembre 2026" */
  label: string;
  /** Under the month: its year, on the first month and on each January. */
  year?: string;
  total: number;
  items: { id: string; name: string; icon: string; amount: number; note?: string }[];
}

/** "4,2k": fits above a bar. */
function compact(n: number): string {
  if (n < 1000) return String(Math.round(n));
  return `${(Math.round(n / 100) / 10).toLocaleString("fr-FR")}k`;
}

/** Height of the tallest bar. */
const BARS_PX = 110;

/**
 * What the credits cost each month, from this month to the last
 * installment: one bar a month — each step down is a credit ending — with
 * the amount written where it changes, and a 🏁 after the last one. Tap a
 * month: what's paid that month, credit by credit.
 */
export function CreditStairs({ months, currency }: { months: StairMonth[]; currency: string }) {
  const [selected, setSelected] = useState(0);
  const max = Math.max(1, ...months.map((m) => m.total));
  const month = months[Math.min(selected, months.length - 1)];
  const money = (n: number) => formatMoney(n, currency);
  const height = (total: number) => Math.max(4, Math.round((total / max) * BARS_PX));

  return (
    <div className="flex flex-col gap-3">
      {/* Spread over the card; sideways when there are more months than fit. */}
      <div className="-mx-4 overflow-x-auto overscroll-x-contain px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div
          role="listbox"
          aria-label="Mensualités de crédit par mois"
          className="grid w-max min-w-full items-end gap-x-1.5 pt-7"
          style={{ gridTemplateColumns: `repeat(${months.length}, minmax(26px, 1fr)) 40px` }}
        >
          {months.map((m, i) => {
            const isSelected = i === selected;
            const changed = i === 0 || Math.abs(m.total - months[i - 1].total) > 0.5;
            return (
              <button
                key={m.key}
                type="button"
                role="option"
                aria-selected={isSelected}
                aria-label={`${m.label} : ${money(m.total)}`}
                onClick={() => setSelected(i)}
                className="group flex flex-col items-center gap-1.5"
              >
                <span className="relative flex w-full items-end justify-center" style={{ height: BARS_PX }}>
                  {m.total > 0 && (isSelected || changed) && (
                    <span
                      className={cn(
                        "absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full font-bold tabular-nums leading-none",
                        isSelected
                          ? "bg-violet-600 px-1.5 py-1 text-[10px] text-white shadow-[0_4px_10px_-4px_rgba(91,33,182,0.7)] dark:bg-violet-500"
                          : "text-[9.5px] text-slate-500 dark:text-slate-400",
                      )}
                      style={{ bottom: height(m.total) + (isSelected ? 5 : 4) }}
                    >
                      {compact(m.total)}
                    </span>
                  )}
                  <span
                    className={cn(
                      "w-[22px] rounded-full transition-[height,background-color] duration-300",
                      isSelected
                        ? "gx-cta"
                        : "bg-gradient-to-t from-violet-200 to-violet-300/90 group-active:from-violet-300 dark:from-violet-500/25 dark:to-violet-400/45",
                    )}
                    style={{ height: height(m.total) }}
                  />
                </span>
                <span
                  className={cn(
                    "text-[10px] font-semibold leading-none",
                    isSelected ? "text-violet-700 dark:text-violet-200" : "text-slate-400 dark:text-slate-500",
                  )}
                >
                  {m.short}
                </span>
                <span className="h-2 text-[8.5px] font-medium leading-none text-slate-400 dark:text-slate-500">{m.year ?? ""}</span>
              </button>
            );
          })}
          {/* Then nothing more to pay. */}
          <div className="flex flex-col items-center gap-1.5">
            <span className="flex w-full items-end justify-center pb-1" style={{ height: BARS_PX }}>
              <span className="text-2xl leading-none">🏁</span>
            </span>
            <span className="text-[10px] font-bold leading-none text-violet-700 dark:text-violet-200">Libre</span>
            <span className="h-2" />
          </div>
        </div>
      </div>

      {/* The month tapped, credit by credit. */}
      <div className="rounded-2xl bg-[var(--gx-chip)] px-3.5 py-3">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-bold text-slate-900 dark:text-white">{month.label}</p>
          <p className="text-[15px] font-extrabold tabular-nums text-violet-700 dark:text-violet-200">{money(month.total)}</p>
        </div>
        {month.items.length === 0 ? (
          <p className="mt-1 text-[12.5px] text-slate-500 dark:text-slate-400">Aucune mensualité ce mois-là.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {month.items.map((item) => (
              <li key={item.id} className="flex items-center gap-2.5 text-[13px]">
                <span className="w-5 text-center text-base leading-none">{item.icon}</span>
                <span className="min-w-0 flex-1 truncate font-medium text-slate-800 dark:text-slate-100">{item.name}</span>
                {item.note && (
                  <span className="shrink-0 rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700 dark:bg-violet-500/20 dark:text-violet-200">
                    {item.note}
                  </span>
                )}
                <span className="shrink-0 font-semibold tabular-nums text-slate-900 dark:text-white">{money(item.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
