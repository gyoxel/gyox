"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, CaretDown } from "@phosphor-icons/react/ssr";
import type { CategorySlice } from "@/lib/category-stats";
import { budgetLevel, budgetPercent } from "@/lib/category-budgets";
import { LEVEL_TEXT } from "@/components/budget-bar";
import { sliceLabel } from "@/lib/category-stats";
import { localName } from "@/lib/i18n";
import { useT } from "@/lib/i18n/client";
import { cn, formatMoney } from "@/lib/utils";

/** Up or down against the month before: more spent reads red, less green
 *  (always with its arrow, never the colour alone). */
export function SliceChange({ amount, previous, className }: { amount: number; previous: number; className?: string }) {
  const t = useT();
  if (!(previous > 0)) {
    return <span className={cn("text-[11px] font-semibold text-slate-400", className)}>{t("nouveau")}</span>;
  }
  const pct = Math.round(((amount - previous) / previous) * 100);
  if (pct === 0) return <span className={cn("text-[11px] font-semibold text-slate-400", className)}>=</span>;
  const up = pct > 0;
  const Arrow = up ? ArrowUp : ArrowDown;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-[11px] font-semibold tabular-nums",
        up ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400",
        className,
      )}
    >
      <Arrow weight="bold" className="h-3 w-3" />
      {up ? "+" : "−"}
      {Math.abs(pct)}%
    </span>
  );
}

/**
 * Statistiques → Par catégorie: one bar per category (the largest is the
 * full width), its amount, its share of the month, and how much of its
 * budget that is when it has one — this month alone (beside another:
 * CategorySection's « Comparaison »). Tapping one shows what it's made of.
 */
export function CategoryBars({
  slices,
  currency,
  budgets = {},
}: {
  slices: CategorySlice[];
  currency: string;
  /** Category id → its budget. */
  budgets?: Record<string, number>;
}) {
  const t = useT();
  const [open, setOpen] = useState<string | null>(null);
  const money = (n: number) => formatMoney(n, currency);
  const total = slices.reduce((s, x) => s + x.amount, 0);
  const max = Math.max(1, ...slices.map((s) => s.amount));

  if (slices.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-slate-200 px-3 py-6 text-center text-sm text-slate-400 dark:border-slate-700">
        {t("Aucune dépense prévue pour ce mois.")}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1 rounded-3xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {slices.map((s) => {
        const expanded = open === s.key;
        const share = total > 0 ? Math.round((s.amount / total) * 100) : 0;
        const budget = budgets[s.key];
        return (
          <div key={s.key} className={cn("rounded-2xl transition-colors", expanded && "bg-slate-50 dark:bg-slate-800/50")}>
            <button
              type="button"
              onClick={() => setOpen(expanded ? null : s.key)}
              aria-expanded={expanded}
              className="flex w-full flex-col gap-1.5 rounded-2xl px-3 py-2.5 text-left active:bg-slate-50 dark:active:bg-slate-800/60"
            >
              <span className="flex items-center gap-2 text-sm">
                <span className="text-base leading-none">{s.emoji}</span>
                <span className="min-w-0 flex-1 truncate font-medium text-slate-800 dark:text-slate-100">{sliceLabel(s, t)}</span>
                <span className="font-semibold tabular-nums text-slate-900 dark:text-white">{money(s.amount)}</span>
                <CaretDown weight="bold" className={cn("h-3.5 w-3.5 shrink-0 text-slate-300 transition-transform", expanded && "rotate-180")} />
              </span>
              <span className="flex items-center gap-2">
                <span className="relative h-2 flex-1 overflow-hidden rounded-[4px] bg-slate-100 dark:bg-slate-800">
                  <span
                    className="absolute inset-y-0 left-0 rounded-r-[4px] bg-[var(--gx-brand-500)]"
                    style={{ width: `${Math.max(2, (s.amount / max) * 100)}%` }}
                  />
                </span>
                <span className="w-9 text-right text-[11px] tabular-nums text-slate-400">{share}%</span>
              </span>
              {budget > 0 && (
                <span className={cn("text-[11px] font-medium tabular-nums", LEVEL_TEXT[budgetLevel(s.amount, budget)])}>
                  {t("{pct}% du budget ({amount})", { pct: budgetPercent(s.amount, budget), amount: money(budget) })}
                </span>
              )}
            </button>
            {expanded && (
              <ul className="flex flex-col gap-1.5 px-3 pb-3 pt-0.5">
                {s.items.map((item) => (
                  <li key={item.id} className="flex items-center gap-2 text-[13px]">
                    <span className="leading-none">{item.icon}</span>
                    <span className="min-w-0 flex-1 truncate text-slate-600 dark:text-slate-300">{localName(item.name, t)}</span>
                    <span className="tabular-nums text-slate-700 dark:text-slate-200">{money(item.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
