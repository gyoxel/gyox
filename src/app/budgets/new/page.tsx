import { getAllCategories, getAllExpenses, getAllPayments, getSettings } from "@/lib/page-data";
import { spentByCategory } from "@/lib/category-budgets";
import { addMonths, todayMonth } from "@/lib/date";
import { monthLabel } from "@/lib/i18n/dates";
import { getI18n } from "@/lib/i18n/server";
import { PageHeader } from "@/components/page-header";
import { BudgetForm } from "@/components/budget-form";

export const dynamic = "force-dynamic";

/** Ajouter un budget: a category (?category= preselects it) and the most to spend in it a month. */
export default async function NewBudgetPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const [sp, settings, categories, expenses, payments, { lang, t }] = await Promise.all([
    searchParams,
    getSettings(),
    getAllCategories(),
    getAllExpenses(),
    getAllPayments(),
    getI18n(),
  ]);
  const current = todayMonth();
  const previous = addMonths(current, -1);
  const preselected = categories.some((c) => c.id === sp.category) ? sp.category! : null;
  return (
    <>
      <PageHeader title={t("Ajouter un budget")} back info="budget-new" />
      <main className="px-4 py-5">
        <BudgetForm
          categories={categories}
          preselected={preselected}
          spent={Object.fromEntries(spentByCategory(expenses, payments, current, current))}
          previous={Object.fromEntries(spentByCategory(expenses, payments, previous, current))}
          spentLabel={t("Ce mois-ci")}
          previousLabel={monthLabel(previous, lang)}
          currency={settings.currency}
        />
      </main>
    </>
  );
}
