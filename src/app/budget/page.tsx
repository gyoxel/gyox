import Link from "next/link";
import { Plus } from "lucide-react";
import { getAllCategories, getAllExpenses, getAllPayments, getSettings } from "@/lib/repository";
import { defaultViewMonth, monthFromSearchParams, monthKey, todayMonth } from "@/lib/date";
import { getExpenseDisplayColor, getMonthPaymentStatus, getMonthSummary } from "@/lib/engine";
import { MonthSwitcher } from "@/components/month-switcher";
import { ExpenseAccordionItem, type AccordionItemData } from "@/components/expense-accordion-item";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

  // Credits (Solaih, Zineb, Dnya, Dar…) live on the Crédits page only —
  // including their overdue state — so this page lists ordinary expenses.
  const items: AccordionItemData[] = summary.occurrences
    .filter((occ) => occ.expense.type !== "credit")
    .map((occ) => {
      const expense = occ.expense;
      return {
        expenseId: expense.id,
        name: expense.name,
        icon: iconOf(expense),
        type: expense.type,
        color: getExpenseDisplayColor(expense, byId),
        amount: occ.amount,
        monthKey: viewMonthKey,
        status: getMonthPaymentStatus(expense, viewMonth, payments, currentOperatingMonth),
      };
    });

  return (
    <>
      <PageHeader title="Dépenses" />
      <main className="flex flex-col gap-5 px-4 py-5">
        <MonthSwitcher month={viewMonth} basePath="/budget" />

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
