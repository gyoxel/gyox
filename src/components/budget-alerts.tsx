"use client";

import Link from "next/link";
import { CaretRight, Gauge } from "@phosphor-icons/react/ssr";
import type { BudgetLevel } from "@/lib/category-budgets";
import { categoryName } from "@/lib/i18n";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import { LEVEL_TEXT } from "@/components/budget-bar";

export interface BudgetAlert {
  id: string;
  name: string;
  emoji: string;
  /** Spent of the budget this month, in %. */
  percent: number;
  level: Exclude<BudgetLevel, "ok">;
}

/** Accueil: the budgets this month that reached 80% or went past — the
 *  share only, no amounts (they show on Budgets). */
export function BudgetAlerts({ items }: { items: BudgetAlert[] }) {
  const t = useT();
  if (items.length === 0) return null;
  return (
    <Link
      href="/budgets"
      prefetch
      aria-label={t("Budgets à surveiller")}
      className="gx-glass flex flex-col gap-2.5 rounded-[22px] border p-3.5 active:opacity-80"
    >
      <span className="flex items-center gap-2.5">
        <span className="gx-tile flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[var(--gx-tile-ink)]">
          <Gauge weight="duotone" className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900 dark:text-white">{t("Budgets à surveiller")}</span>
        <CaretRight weight="bold" className="h-4 w-4 shrink-0 text-slate-400" />
      </span>
      <ul className="flex flex-col gap-1.5">
        {items.map((b) => (
          <li key={b.id} className="flex items-center gap-2 text-[13px]">
            <span className="leading-none">{b.emoji}</span>
            <span className="min-w-0 flex-1 truncate text-slate-700 dark:text-slate-200">{categoryName(b.name, t)}</span>
            <span className={cn("font-semibold tabular-nums", LEVEL_TEXT[b.level])}>
              {b.level === "over" ? t("{pct}% · dépassé", { pct: b.percent }) : `${b.percent}%`}
            </span>
          </li>
        ))}
      </ul>
    </Link>
  );
}
