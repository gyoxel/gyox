import Link from "next/link";
import { Plus } from "lucide-react";
import { getAllCategories, getAllExpenses, getAllPayments, getSettings } from "@/lib/repository";
import {
  addMonths,
  compareMonths,
  defaultViewMonth,
  monthFromSearchParams,
  monthKey,
  monthLabelFr,
  monthLabelShortFr,
  todayMonth,
  type MonthId,
} from "@/lib/date";
import {
  getCreditDisplayProgress,
  getCreditRealState,
  getExpenseDisplayColor,
  getMonthPaymentStatus,
  getMonthSummary,
  carriesOver,
} from "@/lib/engine";
import { MonthSwitcher } from "@/components/month-switcher";
import { ExpenseAccordionItem, type AccordionItemData } from "@/components/expense-accordion-item";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/utils";
import { displayIcon } from "@/lib/category";
import type { Expense } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function BudgetPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const [sp, settings, expenses, payments, categories] = await Promise.all([
    searchParams,
    getSettings(),
    getAllExpenses(),
    getAllPayments(),
    getAllCategories(),
  ]);
  const categoryEmoji = new Map(categories.map((c) => [c.id, c.emoji]));
  const iconOf = (e: Expense) => displayIcon(e, categoryEmoji);
  const viewMonth = monthFromSearchParams(sp.month, defaultViewMonth());
  const currentOperatingMonth = todayMonth();
  const summary = getMonthSummary(expenses, viewMonth, settings.salary);

  const viewMonthKey = monthKey(viewMonth);
  const byId = new Map(expenses.map((e) => [e.id, e]));

  const items: AccordionItemData[] = summary.occurrences.map((occ) => {
    const expense = occ.expense;
    const status = getMonthPaymentStatus(expense, viewMonth, payments, currentOperatingMonth);

    if (expense.type === "credit") {
      const state = getCreditRealState(expense, payments, currentOperatingMonth);
      return {
        expenseId: expense.id,
        name: expense.name,
        icon: iconOf(expense),
        type: expense.type,
        color: getExpenseDisplayColor(expense, byId),
        amount: occ.amount,
        monthKey: viewMonthKey,
        status,
        isFinalCreditPayment: occ.isFinalCreditPayment,
        credit: {
          initialAmount: getCreditDisplayProgress(expense, state).total,
          paidTotal: getCreditDisplayProgress(expense, state).paid,
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
      icon: iconOf(expense),
      type: expense.type,
      color: getExpenseDisplayColor(expense, byId),
      amount: occ.amount,
      monthKey: viewMonthKey,
      status,
    };
  });

  // "Reportés / en retard": only credits (money owed to someone), for
  // months before the one viewed that were left unpaid — the current month
  // included once browsing ahead (it isn't paid yet), never a month that
  // hasn't come yet. A credit's missed months don't stack: one row with its
  // pending installment and every month since it fell due. Ordinary expenses
  // never appear here: unpaid in their month means gone (see carriesOver).
  const lastMissable = [addMonths(viewMonth, -1), currentOperatingMonth].sort(compareMonths)[0];
  const carriedItems: AccordionItemData[] = expenses
    .filter((e) => e.active && carriesOver(e))
    .flatMap((expense): AccordionItemData[] => {
      const state = getCreditRealState(expense, payments, currentOperatingMonth);
      if (state.status !== "in-progress" || !state.dueMonth || state.pendingAmount <= 0) return [];
      const months: MonthId[] = [];
      for (let m = state.dueMonth; compareMonths(m, lastMissable) <= 0; m = addMonths(m, 1)) months.push(m);
      if (months.length === 0) return [];
      return [
        {
          expenseId: expense.id,
          name: expense.name,
          icon: iconOf(expense),
          type: expense.type,
          color: getExpenseDisplayColor(expense, byId),
          status: "unpaid",
          amount: state.pendingAmount,
          monthKey: monthKey(months[0]),
          missedLabel: months.length === 1 ? monthLabelFr(months[0]) : months.map(monthLabelShortFr).join(", "),
        },
      ];
    });

  return (
    <>
      <PageHeader title="Dépenses" />
      <main className="flex flex-col gap-5 px-4 py-5">
        <MonthSwitcher month={viewMonth} basePath="/budget" />

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
          <Button asChild className="mt-1">
            <Link href="/expenses/new">
              <Plus className="h-4 w-4" />
              Ajouter une dépense
            </Link>
          </Button>
        </section>

      </main>
    </>
  );
}
