import Link from "next/link";
import { Plus, Sparkles } from "lucide-react";
import { getAllExpenses, getAllPayments, getSettings } from "@/lib/repository";
import {
  addMonths,
  compareMonths,
  defaultViewMonth,
  monthFromSearchParams,
  monthKey,
  monthLabelFr,
  monthLabelShortFr,
} from "@/lib/date";
import { getCreditRealState, getForecast, getMonthPaymentStatus, getMonthSummary, getUnpaidMonths } from "@/lib/engine";
import { MonthSwitcher } from "@/components/month-switcher";
import { ExpenseAccordionItem, type AccordionItemData } from "@/components/expense-accordion-item";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

export default async function BudgetPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const sp = await searchParams;
  const settings = await getSettings();
  const expenses = await getAllExpenses();
  const payments = await getAllPayments();
  const viewMonth = monthFromSearchParams(sp.month, defaultViewMonth());
  const currentOperatingMonth = defaultViewMonth();
  const summary = getMonthSummary(expenses, viewMonth, settings.salary);
  const forecast = getForecast(expenses, settings.salary, currentOperatingMonth, FORECAST_MONTHS);

  const savingsAchieved = summary.remaining >= settings.savingsTarget;
  const viewMonthKey = monthKey(viewMonth);

  const items: AccordionItemData[] = summary.occurrences.map((occ) => {
    const expense = occ.expense;
    const status = getMonthPaymentStatus(expense, viewMonth, payments, currentOperatingMonth);

    if (expense.type === "credit") {
      const state = getCreditRealState(expense, payments, currentOperatingMonth);
      return {
        expenseId: expense.id,
        name: expense.name,
        icon: expense.icon,
        type: expense.type,
        amount: occ.amount,
        monthKey: viewMonthKey,
        status,
        isFinalCreditPayment: occ.isFinalCreditPayment,
        credit: {
          initialAmount: expense.creditInitialAmount ?? 0,
          paidTotal: state.paidTotal,
          remaining: state.remaining,
          pendingAmount: state.pendingAmount,
          isOverdue: state.isOverdue,
          monthlyAmount: expense.amount,
          endMonthLabel: state.projectedEndMonth ? monthLabelFr(state.projectedEndMonth) : null,
          statusLabel: state.status,
        },
      };
    }

    return {
      expenseId: expense.id,
      name: expense.name,
      icon: expense.icon,
      type: expense.type,
      amount: occ.amount,
      monthKey: viewMonthKey,
      status,
    };
  });

  // Carried-over debts: unpaid non-credit occurrences from months strictly
  // before the one being viewed. Shown as their own rows — never merged
  // into this month's own mensualité — since the rule is "le montant reste
  // dû jusqu'à ce qu'il soit payé", distinct from a new month's own due
  // amount. This is where that history lives (the Dashboard only shows the
  // combined total, per spec).
  const byId = new Map(expenses.map((e) => [e.id, e]));
  const carriedItems: AccordionItemData[] = expenses
    .filter((e) => e.active && e.type !== "credit")
    .flatMap((expense) =>
      getUnpaidMonths(expense, payments, addMonths(viewMonth, -1), byId).map((u) => ({
        expenseId: expense.id,
        name: `${expense.name} (reporté depuis ${monthLabelShortFr(u.month)})`,
        icon: expense.icon,
        type: expense.type,
        amount: Math.round((u.amountDue - u.amountPaid) * 100) / 100,
        monthKey: u.monthKey,
        status: "unpaid" as const,
      })),
    );

  // Automatically detect the moment temporary credits/obligations finish and
  // the budget frees up (relocated here from the Dashboard, which is now
  // real-situation-only).
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
      <PageHeader
        title="Budget"
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

        {carriedItems.length > 0 && (
          <section className="flex flex-col gap-2.5">
            <h2 className="px-1 text-sm font-semibold text-rose-600">Reportés / en retard</h2>
            <div className="flex flex-col gap-2">
              {carriedItems.map((item) => (
                <ExpenseAccordionItem key={`${item.expenseId}-${item.monthKey}`} item={item} currency={settings.currency} />
              ))}
            </div>
          </section>
        )}

        <section className="flex flex-col gap-2.5">
          <h2 className="px-1 text-sm font-semibold text-slate-500 dark:text-slate-400">Détail des dépenses</h2>
          {items.length === 0 ? (
            <Card>
              <CardContent className="py-6 text-center text-sm text-slate-500">
                Aucune dépense prévue pour ce mois.
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-2">
              {items.map((item) => (
                <ExpenseAccordionItem key={item.expenseId} item={item} currency={settings.currency} />
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
          <h2 className="px-1 text-sm font-semibold text-slate-500 dark:text-slate-400">Prévisions</h2>
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
                    <span className={`font-medium ${s.remaining < 0 ? "text-rose-600" : "text-emerald-600"}`}>
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
