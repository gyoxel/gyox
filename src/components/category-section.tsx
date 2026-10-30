"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowsLeftRight, CaretLeft, CaretRight } from "@phosphor-icons/react/ssr";
import { sliceLabel, type CategoryComparison, type CategorySlice } from "@/lib/category-stats";
import { addMonths, monthKey, type MonthId } from "@/lib/date";
import { monthLabel, monthLabelShort } from "@/lib/i18n/dates";
import { useI18n } from "@/lib/i18n/client";
import { cn, formatMoney } from "@/lib/utils";
import { CategoryBars } from "@/components/category-bars";

const ARROW =
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 active:bg-slate-100 dark:text-slate-400 dark:active:bg-slate-800";
// Of two amounts, the higher reads red, the lower green: a category's in
// its text alone, the totals as a whole light box.
const TEXT = { higher: "text-rose-600 dark:text-rose-400", lower: "text-emerald-600 dark:text-emerald-400", same: "text-slate-600 dark:text-slate-300" };
const BOX = {
  higher: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300",
  lower: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  same: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};
const toneOf = (value: number, other: number) => (value > other ? "higher" : value < other ? "lower" : "same");

/**
 * Bilan → « Où est allé ton argent », Statistiques → « Par catégorie »: the
 * month's categories or, « Comparaison » tapped, in the same place, that
 * month beside another — each changed with its own ‹ › (the second one is
 * `?vs=`, the first the page's month). `picker`, the page's own month
 * switcher, goes under the title with the list (the comparison has its own).
 */
export function CategorySection({
  title,
  basePath,
  month,
  vs,
  comparing,
  picker,
  slices,
  empty,
  comparison,
  currency,
  budgets,
}: {
  title: string;
  basePath: string;
  month: MonthId;
  vs: MonthId;
  /** Opened on the comparison (a month picked in it). */
  comparing: boolean;
  picker?: ReactNode;
  slices: CategorySlice[];
  /** Said instead of the list when it's empty. */
  empty?: string;
  comparison: CategoryComparison;
  currency: string;
  /** Category id → its budget. */
  budgets: Record<string, number>;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(comparing);
  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-2 px-1">
        <h2 className="min-w-0 truncate text-sm font-semibold text-slate-600 dark:text-slate-300">{title}</h2>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-pressed={open}
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors",
            open
              ? "border-transparent bg-[var(--gx-brand-600)] text-white"
              : "border-slate-200 bg-white text-slate-700 active:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200",
          )}
        >
          <ArrowsLeftRight weight="bold" className="h-3.5 w-3.5" />
          {t("Comparaison")}
        </button>
      </div>
      {open ? (
        <Comparison basePath={basePath} month={month} vs={vs} comparison={comparison} currency={currency} />
      ) : (
        <>
          {picker}
          <CategoryBars key={monthKey(month)} slices={slices} currency={currency} budgets={budgets} empty={empty} />
        </>
      )}
    </section>
  );
}

function Comparison({ basePath, month, vs, comparison, currency }: { basePath: string; month: MonthId; vs: MonthId; comparison: CategoryComparison; currency: string }) {
  const { lang, t } = useI18n();
  const money = (n: number) => formatMoney(n, currency);
  const href = (a: MonthId, b: MonthId) => `${basePath}?month=${monthKey(a)}&vs=${monthKey(b)}`;
  const shortA = monthLabelShort(month, lang);
  const shortB = monthLabelShort(vs, lang);
  const { rows, totalA, totalB } = comparison;

  return (
    <div className="flex flex-col gap-2.5">
      <div className="grid grid-cols-2 gap-2">
        <MonthPicker label={shortA} prev={href(addMonths(month, -1), vs)} next={href(addMonths(month, 1), vs)} />
        <MonthPicker label={shortB} prev={href(month, addMonths(vs, -1))} next={href(month, addMonths(vs, 1))} />
      </div>
      <p className="-mt-0.5 px-1 text-xs text-slate-500 dark:text-slate-400">
        {t("Ce qui a été payé dans chaque catégorie : le plus élevé en rouge, le plus bas en vert.")}
      </p>

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-200 px-3 py-8 text-center text-sm text-slate-400 dark:border-slate-700">
          {t("Rien de payé ces deux mois.")}
        </p>
      ) : (
        <div className="flex flex-col rounded-3xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-1.5 px-1.5 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            <span className="min-w-0 flex-1">{t("Catégorie")}</span>
            <span className="w-[5.75rem] shrink-0 text-center">{shortA}</span>
            <span className="w-[5.75rem] shrink-0 text-center">{shortB}</span>
          </div>
          <ul>
            {rows.map((row) => (
              <li key={row.slice.key} className="flex items-center gap-1.5 border-t border-slate-100 px-1.5 py-1.5 text-[13px] dark:border-slate-800">
                <span className="leading-none">{row.slice.emoji}</span>
                <span className="min-w-0 flex-1 truncate font-medium text-slate-800 dark:text-slate-100">{sliceLabel(row.slice, t)}</span>
                <Amount value={row.a} other={row.b} money={money} />
                <Amount value={row.b} other={row.a} money={money} />
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-1.5 border-t border-slate-200 px-1.5 pb-1 pt-2 dark:border-slate-700">
            <span className="min-w-0 flex-1 text-sm font-bold text-slate-900 dark:text-white">{t("Total")}</span>
            <TotalBox label={shortA} value={totalA} other={totalB} money={money} />
            <TotalBox label={shortB} value={totalB} other={totalA} money={money} />
          </div>
          <p className="px-1.5 pb-1 pt-2 text-xs text-slate-500 dark:text-slate-400">
            {totalA === totalB
              ? t("Autant les deux mois.")
              : t("{month} : {amount} de plus que {other}.", {
                  month: monthLabel(totalA > totalB ? month : vs, lang),
                  amount: money(Math.round(Math.abs(totalA - totalB) * 100) / 100),
                  other: monthLabel(totalA > totalB ? vs : month, lang),
                })}
          </p>
        </div>
      )}
    </div>
  );
}

/** ‹ month › for one side of the comparison. */
function MonthPicker({ label, prev, next }: { label: string; prev: string; next: string }) {
  const { t } = useI18n();
  return (
    <div className="flex items-center justify-between gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <Link href={prev} replace scroll={false} aria-label={t("Mois précédent")} className={ARROW}>
        <CaretLeft weight="bold" className="h-4 w-4" />
      </Link>
      <span className="min-w-0 truncate text-sm font-semibold text-slate-900 dark:text-white">{label}</span>
      <Link href={next} replace scroll={false} aria-label={t("Mois suivant")} className={ARROW}>
        <CaretRight weight="bold" className="h-4 w-4" />
      </Link>
    </div>
  );
}

function Amount({ value, other, money }: { value: number; other: number; money: (n: number) => string }) {
  return (
    <span className={cn("w-[5.75rem] shrink-0 truncate px-1 py-1.5 text-center font-semibold tabular-nums", TEXT[toneOf(value, other)])}>
      {money(value)}
    </span>
  );
}

/** A month's total, in a box with its name: red for the month that spent more, green for the other. */
function TotalBox({ label, value, other, money }: { label: string; value: number; other: number; money: (n: number) => string }) {
  return (
    <span className={cn("flex w-[5.75rem] shrink-0 flex-col items-center rounded-xl px-1 py-1.5 ring-1 ring-inset ring-current/20", BOX[toneOf(value, other)])}>
      <span className="text-[10.5px] font-semibold">{label}</span>
      <span className="max-w-full truncate text-[13px] font-bold tabular-nums">{money(value)}</span>
    </span>
  );
}
