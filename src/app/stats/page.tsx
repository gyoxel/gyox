import Link from "next/link";
import { Sparkles } from "lucide-react";
import { getAllCategories, getAllDarets, getAllExpenses, getAllPayments, getSettings } from "@/lib/repository";
import { addMonths, compareMonths, defaultViewMonth, monthFromSearchParams, monthLabelFr, todayMonth } from "@/lib/date";
import { getForecast, getMonthSummary, getPaidThisMonth } from "@/lib/engine";
import { MonthSwitcher } from "@/components/month-switcher";
import { PageHeader } from "@/components/page-header";
import { TimelineSection } from "@/components/timeline-section";
import { Card, CardContent } from "@/components/ui/card";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

const FORECAST_MONTHS = 6;

function Row({ label, value, currency, strong }: { label: string; value: number; currency: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className={strong ? "text-sm font-medium text-slate-700 dark:text-slate-300" : "text-sm text-slate-500 dark:text-slate-400"}>
        {label}
      </span>
      <span className={strong ? "text-base font-semibold text-slate-900 dark:text-white" : "text-sm text-slate-700 dark:text-slate-300"}>
        {formatMoney(value, currency)}
      </span>
    </div>
  );
}

/**
 * Statistiques et prévisions: this month's real salary use, the planned
 * budget of any month (month switcher), when the credits end, the forecast
 * for the coming months, and the credits / darets timeline.
 */
export default async function StatsPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const [sp, settings, expenses, payments, categories, darets] = await Promise.all([
    searchParams,
    getSettings(),
    getAllExpenses(),
    getAllPayments(),
    getAllCategories(),
    getAllDarets(),
  ]);
  const currency = settings.currency;
  const categoryEmoji = new Map(categories.map((c) => [c.id, c.emoji]));

  // This month, for real: only what has actually been paid.
  const currentMonth = todayMonth();
  const paidThisMonth = getPaidThisMonth(expenses, payments, currentMonth);
  const available = Math.max(0, settings.salary - paidThisMonth);
  const percentUsed = settings.salary > 0 ? Math.min(100, Math.round((paidThisMonth / settings.salary) * 100)) : 0;

  // Planned budget of the viewed month (next month by default).
  const viewMonth = monthFromSearchParams(sp.month, defaultViewMonth());
  const summary = getMonthSummary(expenses, viewMonth, settings.salary);
  const forecast = getForecast(expenses, settings.salary, defaultViewMonth(), FORECAST_MONTHS);

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

  return (
    <>
      <PageHeader title="Statistiques et prévisions" backHref="/" />
      <main className="flex flex-col gap-5 px-4 py-5">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">Salaire · {monthLabelFr(currentMonth)}</p>
            <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div className="h-full rounded-full bg-rose-400" style={{ width: `${percentUsed}%` }} />
            </div>
            <p className="mt-1.5 text-center text-xs text-slate-400">{percentUsed}% consommé</p>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-slate-500 dark:text-slate-400">Dépensé</p>
                <p className="font-semibold text-rose-600">{formatMoney(paidThisMonth, currency)}</p>
              </div>
              <div className="text-right">
                <p className="text-slate-500 dark:text-slate-400">Disponible</p>
                <p className="font-semibold text-emerald-600">{formatMoney(available, currency)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <section className="flex flex-col gap-2.5">
          <MonthSwitcher month={viewMonth} basePath="/stats" />
          <Card>
            <CardContent className="pt-4">
              <Row label="Salaire" value={summary.salary} currency={currency} strong />
              <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
              <Row label="🔴 Dépenses permanentes" value={summary.totalPermanent} currency={currency} />
              <Row label="🔵 Crédits" value={summary.totalCredit} currency={currency} />
              <Row label="🟡 Autres temporaires" value={summary.totalTemporary} currency={currency} />
              <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
              <Row label="Total dépenses" value={summary.totalExpenses} currency={currency} strong />
              <div className="my-2 border-t border-dashed border-slate-200 dark:border-slate-700" />
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Reste</span>
                <span className={`text-2xl font-bold ${summary.remaining < 0 ? "text-rose-600" : "text-emerald-600"}`}>
                  {formatMoney(summary.remaining, currency)}
                </span>
              </div>
            </CardContent>
          </Card>
        </section>

        {transition && (
          <Card className="border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/30">
            <CardContent className="flex gap-3 pt-4">
              <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              <div className="text-sm text-emerald-900 dark:text-emerald-200">
                <p className="font-semibold">Dès {transition.monthLabel}</p>
                <p className="mt-1 text-emerald-800/90 dark:text-emerald-300/90">
                  Vos crédits et obligations temporaires seront terminés. Dépenses permanentes:{" "}
                  {formatMoney(transition.totalPermanent, currency)} — Reste estimé:{" "}
                  <span className="font-semibold">{formatMoney(transition.remaining, currency)}</span>
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <section className="flex flex-col gap-2.5">
          <h2 className="px-1 text-sm font-semibold text-slate-500 dark:text-slate-400">Prévisions</h2>
          <Card>
            <CardContent className="divide-y divide-slate-100 pt-2 dark:divide-slate-800">
              {forecast.map((s) => (
                <Link
                  key={s.monthKey}
                  href={`/stats?month=${s.monthKey}`}
                  className="flex items-center justify-between py-2.5 text-sm first:pt-1 last:pb-1"
                >
                  <span
                    className={
                      compareMonths(s.month, viewMonth) === 0
                        ? "font-semibold text-slate-900 dark:text-white"
                        : "text-slate-600 dark:text-slate-300"
                    }
                  >
                    {s.label}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="text-slate-400">{formatMoney(s.totalExpenses, currency)}</span>
                    <span className={`font-medium ${s.remaining < 0 ? "text-rose-600" : "text-emerald-600"}`}>
                      {formatMoney(s.remaining, currency)}
                    </span>
                  </span>
                </Link>
              ))}
            </CardContent>
          </Card>
        </section>

        <TimelineSection
          expenses={expenses}
          darets={darets}
          payments={payments}
          currency={currency}
          categoryEmoji={categoryEmoji}
        />
      </main>
    </>
  );
}
