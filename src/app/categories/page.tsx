import { getAllCategories, getAllExpenses, getSettings } from "@/lib/repository";
import { getMonthSummary } from "@/lib/engine";
import { monthLabelFr, todayMonth } from "@/lib/date";
import { PageHeader } from "@/components/page-header";
import { CategoryManager, type CategoryStats } from "@/components/category-manager";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const [categories, expenses, settings] = await Promise.all([getAllCategories(), getAllExpenses(), getSettings()]);
  const month = todayMonth();
  const summary = getMonthSummary(expenses, month, settings.salary);

  // Per category: how many active expenses, and what they cost this month.
  const stats: Record<string, CategoryStats> = {};
  for (const c of categories) stats[c.id] = { count: 0, monthTotal: 0 };
  for (const e of expenses) if (e.active && e.categoryId && stats[e.categoryId]) stats[e.categoryId].count += 1;
  for (const o of summary.occurrences) {
    const id = o.expense.categoryId;
    if (id && stats[id]) stats[id].monthTotal = Math.round((stats[id].monthTotal + o.amount) * 100) / 100;
  }

  return (
    <>
      <PageHeader title="Catégories" back />
      <main className="flex flex-col gap-5 px-4 py-5">
        <CategoryManager
          categories={categories}
          stats={stats}
          monthLabel={monthLabelFr(month)}
          currency={settings.currency}
        />
      </main>
    </>
  );
}
