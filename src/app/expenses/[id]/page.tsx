import { notFound } from "next/navigation";
import { getAllExpenses, getExpenseById, getSettings } from "@/lib/repository";
import { getCreditProgress, getEffectiveEndMonth } from "@/lib/engine";
import { monthLabelFr, todayMonth } from "@/lib/date";
import { PageHeader } from "@/components/page-header";
import { ExpenseForm } from "@/components/expense-form";
import { DeleteExpenseButton } from "@/components/delete-expense-button";
import { Card, CardContent } from "@/components/ui/card";
import { formatMoney } from "@/lib/utils";
import { TYPE_LABELS_FR } from "@/lib/category";

export const dynamic = "force-dynamic";

export default async function ExpenseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const expense = getExpenseById(id);
  if (!expense) notFound();

  const settings = getSettings();
  const allExpenses = getAllExpenses();

  return (
    <>
      <PageHeader title={expense.name} backHref="/" action={<DeleteExpenseButton id={expense.id} name={expense.name} />} />
      <main className="flex flex-col gap-5 px-4 py-5">
        {expense.type === "credit" && (
          <CreditInfo expense={expense} currency={settings.currency} />
        )}
        {expense.type !== "credit" && expense.frequency === "monthly" && (
          <LinkedInfo expenseId={expense.id} allExpenses={allExpenses} />
        )}

        <Card>
          <CardContent className="pt-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {TYPE_LABELS_FR[expense.type]}
            </p>
            <ExpenseForm expense={expense} allExpenses={allExpenses} />
          </CardContent>
        </Card>
      </main>
    </>
  );
}

function CreditInfo({ expense, currency }: { expense: Parameters<typeof getCreditProgress>[0]; currency: string }) {
  const progress = getCreditProgress(expense, todayMonth());
  return (
    <Card className="border-sky-200 bg-sky-50/50 dark:border-sky-900 dark:bg-sky-950/20">
      <CardContent className="grid grid-cols-2 gap-3 pt-4 text-sm">
        <div>
          <p className="text-xs text-slate-500">Payé</p>
          <p className="font-semibold text-slate-900 dark:text-white">{formatMoney(progress.paid, currency)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">Restant</p>
          <p className="font-semibold text-slate-900 dark:text-white">{formatMoney(progress.remaining, currency)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Prochain paiement</p>
          <p className="font-medium text-slate-800 dark:text-slate-200">
            {progress.nextPaymentMonth ? monthLabelFr(progress.nextPaymentMonth) : "—"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">Fin prévue</p>
          <p className="font-medium text-slate-800 dark:text-slate-200">
            {progress.endMonth ? monthLabelFr(progress.endMonth) : "—"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function LinkedInfo({ expenseId, allExpenses }: { expenseId: string; allExpenses: ReturnType<typeof getAllExpenses> }) {
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
