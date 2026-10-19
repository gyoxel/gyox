import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllCategories, getAllExpenses, getAllPayments, getSettings } from "@/lib/page-data";
import { monthCost, spentByCategory } from "@/lib/category-budgets";
import { getMonthSummary } from "@/lib/engine";
import { addMonths, compareMonths, monthFromSearchParams, todayMonth } from "@/lib/date";
import { monthLabel } from "@/lib/i18n/dates";
import { categoryName, localName } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";
import { budgetDelete } from "@/lib/delete-specs";
import { formatMoney } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { DeleteButton } from "@/components/delete-button";
import { BudgetForm } from "@/components/budget-form";

export const dynamic = "force-dynamic";

/**
 * A category's budget: its amount (changed or removed here), what's spent
 * of it the month shown (?month=, this month by default) and the expenses
 * that make it up.
 */
export default async function BudgetPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ month?: string }> }) {
  const [{ id }, sp, settings, categories, expenses, payments, { lang, t }] = await Promise.all([
    params,
    searchParams,
    getSettings(),
    getAllCategories(),
    getAllExpenses(),
    getAllPayments(),
    getI18n(),
  ]);
  const category = categories.find((c) => c.id === id);
  if (!category?.budget) notFound();
  const current = todayMonth();
  const month = monthFromSearchParams(sp.month, current);
  const previous = addMonths(month, -1);
  const money = (n: number) => formatMoney(n, settings.currency);
  const items = getMonthSummary(expenses, month, 0)
    .occurrences.filter((o) => o.expense.categoryId === id && o.expense.type !== "credit")
    .map((o) => ({ expense: o.expense, amount: monthCost(o.expense, o.amount, month, payments, current) }))
    .sort((a, b) => b.amount - a.amount);
  const label = compareMonths(month, current) === 0 ? t("Ce mois-ci") : monthLabel(month, lang);

  return (
    <>
      <PageHeader title={categoryName(category.name, t)} back info="budget-edit" action={<DeleteButton variant="icon" {...budgetDelete(category, t)} />} />
      <main className="flex flex-col gap-6 px-4 py-5">
        <BudgetForm
          categories={categories}
          category={category}
          spent={Object.fromEntries(spentByCategory(expenses, payments, month, current))}
          previous={Object.fromEntries(spentByCategory(expenses, payments, previous, current))}
          spentLabel={label}
          previousLabel={monthLabel(previous, lang)}
          currency={settings.currency}
        />

        <section className="flex flex-col gap-2">
          <h2 className="px-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
            {t("Dépenses de {month}", { month: monthLabel(month, lang) })}
          </h2>
          {items.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-200 px-3 py-6 text-center text-sm text-slate-400 dark:border-slate-700">
              {t("Aucune dépense dans cette catégorie ce mois-là.")}
            </p>
          ) : (
            <ul className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              {items.map(({ expense, amount }) => (
                <li key={expense.id} className="border-t border-slate-100 first:border-t-0 dark:border-slate-800">
                  <Link href={`/expenses/${expense.id}`} className="flex items-center gap-3 px-4 py-3 active:bg-slate-50 dark:active:bg-slate-800/60">
                    <span className="text-lg leading-none">{category.emoji}</span>
                    <span className="min-w-0 flex-1 truncate text-sm text-slate-700 dark:text-slate-200">{localName(expense.name, t)}</span>
                    <span className="text-sm font-semibold tabular-nums text-slate-900 dark:text-white">{money(amount)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}
