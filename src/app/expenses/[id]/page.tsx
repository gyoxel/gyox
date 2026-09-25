import { notFound } from "next/navigation";
import { getAllExpenses, getAllPayments, getExpenseById, getSettings } from "@/lib/repository";
import { getCreditDisplayProgress, getCreditRealState, getEffectiveEndMonth, getMonthPaymentStatus } from "@/lib/engine";
import { compareMonths, monthLabelFr, monthOfDateStr, todayMonth } from "@/lib/date";
import { PageHeader } from "@/components/page-header";
import { ExpenseForm } from "@/components/expense-form";
import { DeleteExpenseButton } from "@/components/delete-expense-button";
import { Card, CardContent } from "@/components/ui/card";
import { formatMoney } from "@/lib/utils";
import { TYPE_LABELS_FR } from "@/lib/category";
import type { Expense, Payment } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ExpenseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const expense = await getExpenseById(id);
  if (!expense) notFound();

  const settings = await getSettings();
  const allExpenses = await getAllExpenses();
  const payments = await getAllPayments();
  const currentMonth = todayMonth();

  let isPaidNow: boolean;
  let hasCurrentPeriod: boolean;
  if (expense.type === "credit") {
    const state = getCreditRealState(expense, payments, currentMonth);
    hasCurrentPeriod = state.status !== "not-started";
    isPaidNow = state.pendingAmount <= 0 && hasCurrentPeriod;
  } else {
    hasCurrentPeriod = compareMonths(currentMonth, monthOfDateStr(expense.startDate)) >= 0;
    isPaidNow = hasCurrentPeriod && getMonthPaymentStatus(expense, currentMonth, payments, currentMonth) === "paid";
  }

  return (
    <>
      <PageHeader title={expense.name} backHref="/" action={<DeleteExpenseButton id={expense.id} name={expense.name} />} />
      <main className="flex flex-col gap-5 px-4 py-5">
        {expense.type === "credit" && (
          <CreditInfo expense={expense} payments={payments} currency={settings.currency} />
        )}
        {expense.type !== "credit" && expense.frequency === "monthly" && (
          <LinkedInfo expenseId={expense.id} allExpenses={allExpenses} />
        )}

        <Card>
          <CardContent className="pt-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {TYPE_LABELS_FR[expense.type]}
            </p>
            <ExpenseForm
              expense={expense}
              allExpenses={allExpenses}
              initialPaidStatus={isPaidNow}
              showPaidToggle={hasCurrentPeriod}
            />
          </CardContent>
        </Card>
      </main>
    </>
  );
}

function CreditInfo({ expense, payments, currency }: { expense: Expense; payments: Payment[]; currency: string }) {
  const state = getCreditRealState(expense, payments, todayMonth());
  return (
    <Card className="border-sky-200 bg-sky-50/50 dark:border-sky-900 dark:bg-sky-950/20">
      <CardContent className="grid grid-cols-2 gap-3 pt-4 text-sm">
        <div>
          <p className="text-xs text-slate-500">Payé</p>
          <p className="font-semibold text-slate-900 dark:text-white">{formatMoney(getCreditDisplayProgress(expense, state).paid, currency)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">Restant</p>
          <p className="font-semibold text-slate-900 dark:text-white">{formatMoney(state.remaining, currency)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">En attente</p>
          <p className="font-medium text-slate-800 dark:text-slate-200">
            {state.pendingAmount > 0 ? formatMoney(state.pendingAmount, currency) : "—"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">Fin prévue</p>
          <p className="font-medium text-slate-800 dark:text-slate-200">
            {state.projectedEndMonth ? monthLabelFr(state.projectedEndMonth) : "—"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function LinkedInfo({ expenseId, allExpenses }: { expenseId: string; allExpenses: Expense[] }) {
  const expense = allExpenses.find((e) => e.id === expenseId);
  if (!expense) return null;
  const byId = new Map(allExpenses.map((e) => [e.id, e]));
  const end = getEffectiveEndMonth(expense, byId);
  return (
    <Card>
      <CardContent className="flex items-center justify-between pt-4 text-sm">
        <span className="text-slate-500 dark:text-slate-400">Fin calculée</span>
        <span className="font-semibold text-slate-900 dark:text-white">
          {end ? monthLabelFr(end) : "Permanent"}
        </span>
      </CardContent>
    </Card>
  );
}
