import { getAllExpenses, getSettings } from "@/lib/repository";
import { defaultViewMonth, monthFromSearchParams } from "@/lib/date";
import { getMonthSummary } from "@/lib/engine";
import { MonthSwitcher } from "@/components/month-switcher";
import { ExpenseListItem } from "@/components/expense-list-item";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

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

export default async function BudgetPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const sp = await searchParams;
  const settings = await getSettings();
  const expenses = await getAllExpenses();
  const viewMonth = monthFromSearchParams(sp.month, defaultViewMonth());
  const summary = getMonthSummary(expenses, viewMonth, settings.salary);

  const savingsAchieved = summary.remaining >= settings.savingsTarget;

  return (
    <>
      <PageHeader title="Budget mensuel" />
      <main className="flex flex-col gap-5 px-4 py-5">
        <MonthSwitcher month={viewMonth} basePath="/budget" />

        <Card>
          <CardContent className="pt-4">
            <Row label="Salaire" value={summary.salary} currency={settings.currency} strong />
            <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
            <Row label="🔴 Dépenses permanentes" value={summary.totalPermanent} currency={settings.currency} />
            <Row label="🔵 Crédits" value={summary.totalCredit} currency={settings.currency} />
            <Row label="🟡 Autres temporaires" value={summary.totalTemporary} currency={settings.currency} />
            <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
            <Row label="Total dépenses" value={summary.totalExpenses} currency={settings.currency} strong />
            <div className="my-2 border-t border-dashed border-slate-200 dark:border-slate-700" />
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Reste</span>
              <span className={`text-2xl font-bold ${summary.remaining < 0 ? "text-rose-600" : "text-emerald-600"}`}>
                {formatMoney(summary.remaining, settings.currency)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className={savingsAchieved ? "border-emerald-200 dark:border-emerald-900" : "border-amber-200 dark:border-amber-900"}>
          <CardContent className="pt-4">
            <Row label="Objectif d'épargne" value={settings.savingsTarget} currency={settings.currency} />
            <Row
              label={savingsAchieved ? "Épargne potentielle atteinte" : "Il manque"}
              value={savingsAchieved ? summary.remaining - settings.savingsTarget : settings.savingsTarget - summary.remaining}
              currency={settings.currency}
              strong
            />
          </CardContent>
        </Card>

        <section className="flex flex-col gap-2.5">
          <h2 className="px-1 text-sm font-semibold text-slate-500 dark:text-slate-400">Détail des dépenses</h2>
          {summary.occurrences.length === 0 ? (
            <Card>
              <CardContent className="py-6 text-center text-sm text-slate-500">
                Aucune dépense prévue pour ce mois.
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-2">
              {summary.occurrences.map((occ) => (
                <ExpenseListItem key={occ.expense.id} occurrence={occ} currency={settings.currency} />
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
