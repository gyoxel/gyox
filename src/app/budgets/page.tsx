import Link from "next/link";
import { CaretRight, Plus } from "@phosphor-icons/react/ssr";
import { getAllCategories, getAllExpenses, getAllPayments, getSettings } from "@/lib/page-data";
import { categoryBudgets, budgetPercent, spentByCategory } from "@/lib/category-budgets";
import { compareMonths, monthFromSearchParams, monthKey, todayMonth } from "@/lib/date";
import { monthLabel } from "@/lib/i18n/dates";
import { categoryName } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";
import { cn, formatMoney } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { HeaderAdd } from "@/components/header-add";
import { MonthSwitcher } from "@/components/month-switcher";
import { BudgetBar, LEVEL_TEXT } from "@/components/budget-bar";

export const dynamic = "force-dynamic";

/**
 * Budgets: the most to spend in a category a month. Nothing leaves the
 * Solde: the month's expenses in it add up against it — green, orange from
 * 80%, red once gone past. Then the categories spent in without one.
 */
export default async function BudgetsPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const [sp, settings, categories, expenses, payments, { lang, t }] = await Promise.all([
    searchParams,
    getSettings(),
    getAllCategories(),
    getAllExpenses(),
    getAllPayments(),
    getI18n(),
  ]);
  const current = todayMonth();
  const month = monthFromSearchParams(sp.month, current);
  const key = monthKey(month);
  const money = (n: number) => formatMoney(n, settings.currency);
  const rows = categoryBudgets(categories, expenses, payments, month, current);
  const spent = spentByCategory(expenses, payments, month, current);
  const without = categories.filter((c) => !((c.budget ?? 0) > 0) && (spent.get(c.id) ?? 0) > 0);
  const total = rows.reduce((s, r) => s + r.budget, 0);
  const used = rows.reduce((s, r) => s + r.spent, 0);
  const watch = rows.filter((r) => r.level !== "ok").length;
  const left = Math.round((total - used) * 100) / 100;
  const query = compareMonths(month, current) === 0 ? "" : `?month=${key}`;

  return (
    <>
      <PageHeader title={t("Budgets")} back info="budgets" action={<HeaderAdd href="/budgets/new" label={t("Ajouter un budget")} />} />
      <main className="flex flex-col gap-5 px-4 py-5">
        <MonthSwitcher month={month} basePath="/budgets" />

        {rows.length === 0 ? (
          <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-slate-200 px-4 py-7 text-center text-sm text-slate-500 dark:border-slate-700">
            <p>{t("Un budget, c'est le maximum à dépenser dans une catégorie chaque mois : Alimentation 2 000 DH, Voiture 800 DH…")}</p>
            <p className="text-xs text-slate-400">
              {t("Rien ne sort de ton solde : tes dépenses de la catégorie s'additionnent, la barre passe à l'orange à 80 % et au rouge si tu dépasses.")}
            </p>
            <Link
              href="/budgets/new"
              className="gx-cta mx-auto inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold"
            >
              <Plus weight="bold" className="h-4 w-4" />
              {t("Ajouter un budget")}
            </Link>
          </div>
        ) : (
          <>
            {/* All budgets together: what's left of them this month */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-500 via-indigo-600 to-indigo-800 px-5 pb-4 pt-5 text-white shadow-lg shadow-indigo-600/20 dark:shadow-none">
              <span aria-hidden className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10" />
              <p className="relative text-[11px] font-semibold uppercase tracking-[0.16em] text-white/80">
                {t("Budgets")} · {monthLabel(month, lang)}
              </p>
              <p className="relative mt-1 text-4xl font-bold tabular-nums">
                {left < 0 ? "−" : ""}
                {money(Math.abs(left))}
              </p>
              <p className="relative text-xs text-white/85">
                {left < 0 ? t("au-delà de tes budgets") : t("restants sur {amount}", { amount: money(total) })} ·{" "}
                {t("{amount} dépensés", { amount: money(used) })}
              </p>
              <span aria-hidden className="relative mt-3 block h-2 overflow-hidden rounded-full bg-white/25">
                <span className="block h-full rounded-full bg-white" style={{ width: `${Math.min(100, budgetPercent(used, total))}%` }} />
              </span>
              {watch > 0 && (
                <p className="relative mt-2 text-xs font-medium text-white/90">
                  {t(watch > 1 ? "{n} catégories à surveiller" : "{n} catégorie à surveiller", { n: watch })}
                </p>
              )}
            </div>

            <ul className="flex flex-col gap-2.5">
              {rows.map((r) => {
                const rest = Math.round((r.budget - r.spent) * 100) / 100;
                return (
                  <li key={r.category.id}>
                    <Link
                      href={`/budgets/${r.category.id}${query}`}
                      prefetch
                      className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm active:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:active:bg-slate-800/60"
                    >
                      <span className="flex items-center gap-3">
                        <span className="gx-tile flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-xl">{r.category.emoji}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[15px] font-semibold text-slate-900 dark:text-white">{categoryName(r.category.name, t)}</span>
                          <span className="block text-xs tabular-nums text-slate-500 dark:text-slate-400">
                            {money(r.spent)} / {money(r.budget)} · {budgetPercent(r.spent, r.budget)}%
                          </span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span className={cn("block text-base font-bold tabular-nums", LEVEL_TEXT[r.level])}>{money(Math.abs(rest))}</span>
                          <span className="text-[10px] uppercase tracking-wide text-slate-400">{rest < 0 ? t("dépassé") : t("reste")}</span>
                        </span>
                        <CaretRight weight="bold" className="h-4 w-4 shrink-0 text-slate-300" />
                      </span>
                      <BudgetBar spent={r.spent} budget={r.budget} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {without.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="px-1 text-sm font-semibold text-slate-600 dark:text-slate-300">{t("Sans budget")}</h2>
            <ul className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              {without.map((c) => (
                <li key={c.id} className="border-t border-slate-100 first:border-t-0 dark:border-slate-800">
                  <Link
                    href={`/budgets/new?category=${c.id}`}
                    className="flex items-center gap-3 px-4 py-3 active:bg-slate-50 dark:active:bg-slate-800/60"
                  >
                    <span className="text-lg leading-none">{c.emoji}</span>
                    <span className="min-w-0 flex-1 truncate text-sm text-slate-700 dark:text-slate-200">{categoryName(c.name, t)}</span>
                    <span className="text-sm tabular-nums text-slate-500 dark:text-slate-400">{money(spent.get(c.id) ?? 0)}</span>
                    <span className="flex items-center gap-0.5 text-xs font-semibold text-violet-700 dark:text-violet-300">
                      <Plus weight="bold" className="h-3 w-3" />
                      {t("Budget")}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </>
  );
}
