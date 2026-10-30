import Link from "next/link";
import { CaretLeft, CaretRight } from "@phosphor-icons/react/ssr";
import { getAllCategories, getAllDarets, getAllExpenses, getAllGoals, getAllLoans, getAllPayments, getAllSavingsMoves, getSettings } from "@/lib/page-data";
import { addMonths, monthFromSearchParams, monthKey, todayMonth, type MonthId } from "@/lib/date";
import { categoryBreakdown, sliceLabel, type CategorySlice } from "@/lib/category-stats";
import { monthLabel, monthLabelShort } from "@/lib/i18n/dates";
import { getI18n } from "@/lib/i18n/server";
import type { T } from "@/lib/i18n";
import { cn, formatMoney } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";

export const dynamic = "force-dynamic";

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
const round = (n: number) => Math.round(n * 100) / 100;

/**
 * Comparer deux mois (from the Bilan and Statistiques): what was paid in
 * each category, two months side by side — any two, each changed with its
 * own ‹ ›. Of each pair the higher reads light red and the lower light
 * green, and so do the two months' totals.
 */
export default async function ComparePage({ searchParams }: { searchParams: Promise<{ a?: string; b?: string }> }) {
  const [sp, settings, expenses, payments, categories, darets, savingsMoves, goals, loans, { lang, t }] = await Promise.all([
    searchParams,
    getSettings(),
    getAllExpenses(),
    getAllPayments(),
    getAllCategories(),
    getAllDarets(),
    getAllSavingsMoves(),
    getAllGoals(),
    getAllLoans(),
    getI18n(),
  ]);
  const a = monthFromSearchParams(sp.a, todayMonth());
  const b = monthFromSearchParams(sp.b, addMonths(a, -1));
  const input = { expenses, payments, categories, darets, savingsMoves, goals, loans };

  // Every group paid in either month, the largest first.
  const rows = new Map<string, { slice: CategorySlice; a: number; b: number }>();
  for (const s of categoryBreakdown(input, a)) rows.set(s.key, { slice: s, a: s.amount, b: 0 });
  for (const s of categoryBreakdown(input, b)) {
    const row = rows.get(s.key);
    if (row) row.b = s.amount;
    else rows.set(s.key, { slice: s, a: 0, b: s.amount });
  }
  const list = [...rows.values()].sort((x, y) => Math.max(y.a, y.b) - Math.max(x.a, x.b));
  const totalA = round(list.reduce((sum, r) => sum + r.a, 0));
  const totalB = round(list.reduce((sum, r) => sum + r.b, 0));

  const money = (n: number) => formatMoney(n, settings.currency);
  const href = (nextA: MonthId, nextB: MonthId) => `/bilan/comparer?a=${monthKey(nextA)}&b=${monthKey(nextB)}`;
  const shortA = monthLabelShort(a, lang);
  const shortB = monthLabelShort(b, lang);

  return (
    <>
      <PageHeader title={t("Comparaison")} back info="compare" />
      <main className="flex flex-col gap-4 px-4 py-5">
        <div className="grid grid-cols-2 gap-2">
          <MonthPicker label={shortA} prev={href(addMonths(a, -1), b)} next={href(addMonths(a, 1), b)} t={t} />
          <MonthPicker label={shortB} prev={href(a, addMonths(b, -1))} next={href(a, addMonths(b, 1))} t={t} />
        </div>
        <p className="-mt-1 px-1 text-xs text-slate-500 dark:text-slate-400">
          {t("Ce qui a été payé dans chaque catégorie : le plus élevé en rouge, le plus bas en vert.")}
        </p>

        {list.length === 0 ? (
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
              {list.map((row) => (
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
                    month: monthLabel(totalA > totalB ? a : b, lang),
                    amount: money(round(Math.abs(totalA - totalB))),
                    other: monthLabel(totalA > totalB ? b : a, lang),
                  })}
            </p>
          </div>
        )}
      </main>
    </>
  );
}

/** ‹ month › for one side of the comparison. */
function MonthPicker({ label, prev, next, t }: { label: string; prev: string; next: string; t: T }) {
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
