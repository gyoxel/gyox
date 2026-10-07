import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { getAllBudgetEntries, getAllBudgetMonths, getAllPayments, getBudgetById, getSettings } from "@/lib/page-data";
import { budgetMonthState, entriesOf } from "@/lib/budgets";
import { monthKey, parseMonthKey, todayDateStr, todayMonth } from "@/lib/date";
import { HEADER_BUTTON } from "@/components/header-button";
import { PageHeader } from "@/components/page-header";
import { MonthSwitcher } from "@/components/month-switcher";
import { BudgetDetail } from "@/components/budget-detail";

export const dynamic = "force-dynamic";

/** A budget's month: what it is, taken or not, what's spent (add a line), left or gone past. */
export default async function BudgetPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [settings, budget, entries, payments, months] = await Promise.all([
    getSettings(),
    getBudgetById(id),
    getAllBudgetEntries(),
    getAllPayments(),
    getAllBudgetMonths(),
  ]);
  if (!budget) notFound();
  const current = monthKey(todayMonth());
  const key = sp.month && /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.month) ? sp.month : current;
  const own = entries.filter((e) => e.budgetId === id);
  const state = budgetMonthState(budget.expense, own, payments, key, current);
  const month = months.find((m) => m.budgetId === id && m.monthKey === key);

  return (
    <>
      <PageHeader
        title={budget.expense.name}
        back
        action={
          <Link href={`/budgets/${id}/edit`} prefetch aria-label="Modifier le budget" className={HEADER_BUTTON}>
            <Pencil className="h-5 w-5" />
          </Link>
        }
      />
      <main className="flex flex-col gap-4 px-4 py-5">
        <MonthSwitcher month={parseMonthKey(key)} basePath={`/budgets/${id}`} />
        <BudgetDetail
          key={key}
          budget={budget}
          state={state}
          entries={entriesOf(own, key)}
          today={todayDateStr()}
          currentMonthKey={current}
          overflowExpenseId={month?.overflowExpenseId ?? null}
          resteIncomeId={month?.resteIncomeId ?? null}
          currency={settings.currency}
        />
      </main>
    </>
  );
}
