import { notFound } from "next/navigation";
import { getAllCategories, getAllExpenses, getAllPayments, getSettings } from "@/lib/repository";
import { getCreditDisplayProgress, getCreditRealState, getEffectiveEndMonth, getOccurrenceForMonth } from "@/lib/engine";
import { compareMonths, monthKey, monthLabelFr, monthOfDateStr, monthsBetween, todayMonth } from "@/lib/date";
import { PageHeader } from "@/components/page-header";
import { ExpenseEditor, type PaymentStatusInit, type RecurrenceInit } from "@/components/expense-editor";
import { DeleteExpenseButton } from "@/components/delete-expense-button";
import { Card, CardContent } from "@/components/ui/card";
import { formatMoney } from "@/lib/utils";
import type { Expense, Payment } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ExpenseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [settings, allExpenses, payments, categories] = await Promise.all([
    getSettings(),
    getAllExpenses(),
    getAllPayments(),
    getAllCategories(),
  ]);
  const expense = allExpenses.find((e) => e.id === id);
  if (!expense) notFound();
  const byId = new Map(allExpenses.map((e) => [e.id, e]));
  const recurrenceInit = getRecurrenceInit(expense, byId);
  const paymentStatus = getPaymentStatusInit(expense, payments, byId);

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

        <ExpenseEditor
          expense={expense}
          categories={categories}
          recurrenceInit={recurrenceInit}
          paymentStatus={paymentStatus}
        />
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

/** Which recurrence option the form should open on for this expense. */
function getRecurrenceInit(expense: Expense, byId: Map<string, Expense>): RecurrenceInit {
  if (expense.type === "credit") {
    return { recurring: true, kind: "until", months: "", until: String(expense.creditInitialAmount ?? "") };
  }
  if (expense.type === "permanent") return { recurring: true, kind: "permanent", months: "", until: "" };
  if (expense.frequency === "one-time") return { recurring: false, kind: "months", months: "", until: "" };
  const end = getEffectiveEndMonth(expense, byId);
  if (!end) return { recurring: true, kind: "permanent", months: "", until: "" };
  const count = Math.max(1, monthsBetween(monthOfDateStr(expense.startDate), end) + 1);
  return { recurring: true, kind: "months", months: String(count), until: "" };
}

/** Payment status of the period that matters: the expense's own month for a
 *  one-time expense, this month otherwise. Null when nothing is due then. */
function getPaymentStatusInit(
  expense: Expense,
  payments: Payment[],
  byId: Map<string, Expense>,
): PaymentStatusInit | null {
  const current = todayMonth();
  const currentKey = monthKey(current);

  if (expense.type === "credit") {
    const state = getCreditRealState(expense, payments, current);
    const paid = payments.some((p) => p.expenseId === expense.id && p.slotIndex != null && p.monthKey === currentKey);
    if (state.status === "not-started" || (state.status === "completed" && !paid)) return null;
    return { monthKey: currentKey, paid, hint: "(ce mois-ci)" };
  }

  const target = expense.frequency === "one-time" ? monthOfDateStr(expense.startDate) : current;
  if (!getOccurrenceForMonth(expense, target, byId)) return null;
  const key = monthKey(target);
  const paid = payments.some(
    (p) => p.expenseId === expense.id && p.monthKey === key && p.amountPaid >= p.amountDue - 0.005,
  );
  const hint = compareMonths(target, current) === 0 ? "(ce mois-ci)" : `(${monthLabelFr(target)})`;
  return { monthKey: key, paid, hint };
}
