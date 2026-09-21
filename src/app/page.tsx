import Link from "next/link";
import { Plus, Sparkles } from "lucide-react";
import { getAllExpenses, getSettings } from "@/lib/repository";
import { addMonths, compareMonths, defaultViewMonth, monthFromSearchParams } from "@/lib/date";
import { getForecast, getMonthSummary } from "@/lib/engine";
import { MonthSwitcher } from "@/components/month-switcher";
import { ExpenseListItem } from "@/components/expense-list-item";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

const COLOR_ORDER: Record<string, number> = { blue: 0, red: 1, yellow: 2 };
const FORECAST_MONTHS = 6;

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const sp = await searchParams;
  const settings = getSettings();
  const expenses = getAllExpenses();
  const viewMonth = monthFromSearchParams(sp.month, defaultViewMonth());

  const summary = getMonthSummary(expenses, viewMonth, settings.salary);
  const forecast = getForecast(expenses, settings.salary, viewMonth, FORECAST_MONTHS);

  const orderedOccurrences = [...summary.occurrences].sort((a, b) => {
    const colorDiff = COLOR_ORDER[a.expense.color] - COLOR_ORDER[b.expense.color];
    return colorDiff !== 0 ? colorDiff : b.amount - a.amount;
  });

  // Automatically detect the moment temporary credits/obligations finish and
  // the budget frees up, per the "future scenario" requirement.
  let transition: { monthLabel: string; totalPermanent: number; totalExpenses: number; remaining: number } | null =
    null;
  if (summary.totalCredit > 0 || summary.totalTemporary > 0) {
    let cursor = addMonths(viewMonth, 1);
    for (let i = 0; i < 36; i++) {
      const s = getMonthSummary(expenses, cursor, settings.salary);
      if (s.totalCredit === 0 && s.totalTemporary === 0) {
        transition = {
          monthLabel: s.label,
          totalPermanent: s.totalPermanent,
          totalExpenses: s.totalExpenses,
          remaining: s.remaining,
        };
        break;
      }
      cursor = addMonths(cursor, 1);
    }
  }

  return (
    <>
      <PageHeader
        title="Budget & Crédits"
        action={
          <Button asChild size="sm">
            <Link href="/expenses/new">
              <Plus className="h-4 w-4" />
              Ajouter
            </Link>
          </Button>
        }
      />

      <main className="flex flex-col gap-5 px-4 py-5">
        <MonthSwitcher month={viewMonth} basePath="/" />

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500 dark:text-slate-400">Salaire</span>
              <span className="text-lg font-semibold text-slate-900 dark:text-white">
                {formatMoney(summary.salary, settings.currency)}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-sm text-slate-500 dark:text-slate-400">Dépenses prévues</span>
              <span className="text-lg font-semibold text-rose-600">
                -{formatMoney(summary.totalExpenses, settings.currency)}
              </span>
            </div>
            <div className="my-3 border-t border-dashed border-slate-200 dark:border-slate-700" />
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Reste</span>
              <span
                className={`text-2xl font-bold ${summary.remaining < 0 ? "text-rose-600" : "text-emerald-600"}`}
              >
                {formatMoney(summary.remaining, settings.currency)}
              </span>
            </div>
          </CardContent>
        </Card>

        <section className="flex flex-col gap-2.5">
          <h2 className="px-1 text-sm font-semibold text-slate-500 dark:text-slate-400">Dépenses du mois</h2>
          {orderedOccurrences.length === 0 ? (
            <Card>
              <CardContent className="py-6 text-center text-sm text-slate-500">
                Aucune dépense prévue pour ce mois.
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-2">
              {orderedOccurrences.map((occ) => (
                <ExpenseListItem key={occ.expense.id} occurrence={occ} currency={settings.currency} />
              ))}
            </div>
          )}
        </section>

        {transition && (
          <Card className="border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/30">
            <CardContent className="flex gap-3 pt-4">
              <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              <div className="text-sm text-emerald-900 dark:text-emerald-200">
                <p className="font-semibold">Dès {transition.monthLabel}</p>
                <p className="mt-1 text-emerald-800/90 dark:text-emerald-300/90">
                  Vos crédits et obligations temporaires seront terminés. Dépenses permanentes:{" "}
                  {formatMoney(transition.totalPermanent, settings.currency)} — Reste estimé:{" "}
                  <span className="font-semibold">{formatMoney(transition.remaining, settings.currency)}</span>
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <section className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400">Prévisions</h2>
            <Link href="/budget" className="text-xs font-medium text-slate-500 underline-offset-2 hover:underline">
              Voir tout
            </Link>
          </div>
          <Card>
            <CardContent className="divide-y divide-slate-100 pt-2 dark:divide-slate-800">
              {forecast.map((s) => (
                <Link
                  key={s.monthKey}
                  href={`/budget?month=${s.monthKey}`}
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
                    <span className="text-slate-400">{formatMoney(s.totalExpenses, settings.currency)}</span>
                    <span
                      className={`font-medium ${s.remaining < 0 ? "text-rose-600" : "text-emerald-600"}`}
                    >
                      {formatMoney(s.remaining, settings.currency)}
                    </span>
                  </span>
                </Link>
              ))}
            </CardContent>
          </Card>
        </section>
      </main>
    </>
  );
}
