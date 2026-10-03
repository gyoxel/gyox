import Link from "next/link";
import { Sparkles } from "lucide-react";
import { getAllCategories, getAllExpenses, getAllIncomes, getAllPayments, getAllSalaryAdvances, getSettings } from "@/lib/repository";
import { incomesIn } from "@/lib/income";
import { addMonths, compareMonths, monthFromSearchParams, monthKey, monthLabelFr, todayMonth } from "@/lib/date";
import { salaryForMonth } from "@/lib/salary";
import { getExpenseDisplayColor, getForecast, getMonthSummary, getPaidThisMonth, type DisplayColor } from "@/lib/engine";
import { displayIcon } from "@/lib/category";
import { BudgetDonut, type DonutSegment } from "@/components/budget-donut";
import { MonthSwitcher } from "@/components/month-switcher";
import { getWallet } from "@/lib/wallet-data";
import { PageHeader } from "@/components/page-header";
import { cn, formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

const FORECAST_MONTHS = 6;

// Ring order (checked for colorblind separation between neighbours).
const SEGMENTS: { color: DisplayColor; label: string }[] = [
  { color: "orange", label: "Dépenses permanentes" },
  { color: "blue", label: "Crédits" },
  { color: "red", label: "Dépenses" },
];

/**
 * Statistiques et prévisions: this month's real salary use, the planned
 * budget of any month (month switcher), when the credits end, and the
 * forecast for the coming months.
 */
export default async function StatsPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const [sp, settings, expenses, payments, categories, advances, incomes, wallet] = await Promise.all([
    searchParams,
    getSettings(),
    getAllExpenses(),
    getAllPayments(),
    getAllCategories(),
    getAllSalaryAdvances(),
    getAllIncomes(),
    getWallet(),
  ]);
  const currency = settings.currency;
  const categoryEmoji = new Map(categories.map((c) => [c.id, c.emoji]));

  // This month, for real: only what has actually been paid.
  const currentMonth = todayMonth();
  const paidThisMonth = getPaidThisMonth(expenses, payments, currentMonth);
  // Advances on salary: added the month they're taken, off the salary they're taken on.
  // Extra incomes (prime, freelance…) add to the month they're received.
  const salaryNow = salaryForMonth(settings.salary, advances, monthKey(currentMonth)) + incomesIn(incomes, monthKey(currentMonth));
  // Disponible is the Solde (cash + card), the same figure as on Accueil.
  const available = wallet.total;
  const percentUsed = salaryNow > 0 ? Math.min(100, Math.round((paidThisMonth / salaryNow) * 100)) : 0;

  // Planned budget of the viewed month (this month by default).
  const viewMonth = monthFromSearchParams(sp.month, currentMonth);
  const summary = getMonthSummary(
    expenses,
    viewMonth,
    salaryForMonth(settings.salary, advances, monthKey(viewMonth)) + incomesIn(incomes, monthKey(viewMonth)),
  );
  const segments: DonutSegment[] = SEGMENTS.map(({ color, label }) => {
    const items = summary.occurrences
      .filter((o) => getExpenseDisplayColor(o.expense) === color)
      .map((o) => ({ id: o.expense.id, name: o.expense.name, icon: displayIcon(o.expense, categoryEmoji), amount: o.amount }))
      .sort((a, b) => b.amount - a.amount);
    return { color, label, amount: Math.round(items.reduce((s, i) => s + i.amount, 0) * 100) / 100, items };
  });
  const forecast = getForecast(expenses, settings.salary, currentMonth, FORECAST_MONTHS);

  // The moment credits and temporary obligations are all over.
  let transition: { monthLabel: string; totalPermanent: number; remaining: number } | null = null;
  if (summary.totalCredit > 0 || summary.totalTemporary > 0) {
    let cursor = addMonths(viewMonth, 1);
    for (let i = 0; i < 36; i++) {
      const s = getMonthSummary(expenses, cursor, settings.salary);
      if (s.totalCredit === 0 && s.totalTemporary === 0) {
        transition = { monthLabel: s.label, totalPermanent: s.totalPermanent, remaining: s.remaining };
        break;
      }
      cursor = addMonths(cursor, 1);
    }
  }

  const maxForecast = Math.max(1, ...forecast.map((f) => Math.max(f.salary, f.totalExpenses)));

  return (
    <>
      <PageHeader title="Statistiques" back />
      <main className="flex flex-col gap-5 px-4 py-5">
        {/* This month, for real */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-400 via-blue-600 to-indigo-700 px-5 pb-4 pt-5 text-white shadow-lg shadow-blue-600/20 dark:shadow-none">
          <span aria-hidden className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10" />
          <p className="relative text-[11px] font-semibold uppercase tracking-[0.16em] text-white/80">
            Salaire · {monthLabelFr(currentMonth)}
          </p>
          <div className="relative mt-1 flex items-baseline justify-between gap-2">
            <span className="text-4xl font-bold tabular-nums">{percentUsed}%</span>
            <span className="text-sm text-white/85">consommé</span>
          </div>
          <div className="relative mt-2 h-2.5 w-full overflow-hidden rounded-full bg-white/25">
            <div className="h-full rounded-full bg-white" style={{ width: `${percentUsed}%` }} />
          </div>
          <div className="relative mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-white/15 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-white/75">Dépensé</p>
              <p className="text-sm font-bold tabular-nums">{formatMoney(paidThisMonth, currency)}</p>
            </div>
            <div className="rounded-2xl bg-white/15 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-white/75">Disponible</p>
              <p className="text-sm font-bold tabular-nums">{formatMoney(available, currency)}</p>
            </div>
          </div>
        </div>

        {/* Planned budget of any month */}
        <section className="flex flex-col gap-2.5">
          <h2 className="px-1 text-sm font-semibold text-slate-600 dark:text-slate-300">Budget prévu</h2>
          <MonthSwitcher month={viewMonth} basePath="/stats" />
          <div className="rounded-3xl border border-slate-200 bg-white p-4 pt-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <BudgetDonut segments={segments} salary={summary.salary} currency={currency} />
          </div>
        </section>

        {transition && (
          <div className="flex gap-3 rounded-3xl bg-gradient-to-br from-emerald-50 to-teal-50 px-4 py-3.5 dark:from-emerald-950/40 dark:to-teal-950/40">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-sm">
              <Sparkles className="h-4 w-4" />
            </span>
            <div className="text-sm text-emerald-900 dark:text-emerald-200">
              <p className="font-semibold">Dès {transition.monthLabel}</p>
              <p className="mt-0.5 text-emerald-800/90 dark:text-emerald-300/90">
                Crédits et obligations temporaires terminés. Dépenses permanentes :{" "}
                {formatMoney(transition.totalPermanent, currency)} — reste estimé :{" "}
                <b>{formatMoney(transition.remaining, currency)}</b>
              </p>
            </div>
          </div>
        )}

        {/* Forecast: expenses against the salary, month by month */}
        <section className="flex flex-col gap-2.5">
          <h2 className="px-1 text-sm font-semibold text-slate-600 dark:text-slate-300">Prévisions</h2>
          <div className="flex flex-col gap-1 rounded-3xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            {forecast.map((f) => {
              const selected = compareMonths(f.month, viewMonth) === 0;
              return (
                <Link
                  key={f.monthKey}
                  href={`/stats?month=${f.monthKey}`}
                  replace
                  scroll={false}
                  className={cn(
                    "flex flex-col gap-1.5 rounded-2xl px-3 py-2.5 transition-colors active:bg-slate-50 dark:active:bg-slate-800/60",
                    selected && "bg-blue-50 dark:bg-blue-950/40",
                  )}
                >
                  <span className="flex items-center justify-between text-sm">
                    <span className={cn("capitalize", selected ? "font-semibold text-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-300")}>
                      {f.label}
                    </span>
                    <span className={cn("font-semibold tabular-nums", f.remaining < 0 ? "text-rose-600" : "text-emerald-600")}>
                      {f.remaining < 0 ? "" : "+"}
                      {formatMoney(f.remaining, currency)}
                    </span>
                  </span>
                  <span className="relative h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <span
                      className="absolute inset-y-0 left-0 rounded-full bg-emerald-200 dark:bg-emerald-900/60"
                      style={{ width: `${(f.salary / maxForecast) * 100}%` }}
                    />
                    <span
                      className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-sky-400 to-blue-600"
                      style={{ width: `${(Math.min(f.totalExpenses, maxForecast) / maxForecast) * 100}%` }}
                    />
                  </span>
                  <span className="text-[11px] text-slate-400">Dépenses {formatMoney(f.totalExpenses, currency)}</span>
                </Link>
              );
            })}
          </div>
        </section>
      </main>
    </>
  );
}
