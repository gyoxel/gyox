import { getAllCategories, getAllExpenses, getAllIncomes, getIncomeCategories, getSettings } from "@/lib/page-data";
import Link from "next/link";

import { getMonthSummary } from "@/lib/engine";
import { monthKey, monthLabelFr, todayMonth } from "@/lib/date";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { CategoryManager, type CategoryStats } from "@/components/category-manager";

export const dynamic = "force-dynamic";

/** Catégories: two tabs, the expenses' categories and the incomes'. */
export default async function CategoriesPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const income = (await searchParams).tab === "revenus";
  const month = todayMonth();
  const settings = await getSettings();
  let categories;
  const stats: Record<string, CategoryStats> = {};

  if (income) {
    const [list, incomes] = await Promise.all([getIncomeCategories(), getAllIncomes()]);
    categories = list;
    const key = monthKey(month);
    for (const c of list) stats[c.id] = { count: 0, monthTotal: 0 };
    for (const i of incomes) {
      const st = stats[i.category];
      if (!st) continue;
      st.count += 1;
      if (i.date.startsWith(key)) st.monthTotal = Math.round((st.monthTotal + i.amount) * 100) / 100;
    }
  } else {
    const [list, expenses] = await Promise.all([getAllCategories(), getAllExpenses()]);
    categories = list;
    const summary = getMonthSummary(expenses, month, settings.salary);
    // Per category: how many active expenses, and what they cost this month.
    for (const c of list) stats[c.id] = { count: 0, monthTotal: 0 };
    for (const e of expenses) if (e.active && e.categoryId && stats[e.categoryId]) stats[e.categoryId].count += 1;
    for (const o of summary.occurrences) {
      const id = o.expense.categoryId;
      if (id && stats[id]) stats[id].monthTotal = Math.round((stats[id].monthTotal + o.amount) * 100) / 100;
    }
  }

  const tab = (active: boolean) =>
    cn(
      "flex-1 rounded-full py-2 text-center text-sm font-semibold transition-colors",
      active ? "bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white" : "text-slate-500 dark:text-slate-400",
    );

  return (
    <>
      <PageHeader title="Catégories" back />
      <main className="flex flex-col gap-5 px-4 py-5">
        <nav aria-label="Type de catégories" className="flex gap-1 rounded-full bg-slate-100 p-1 dark:bg-slate-800">
          <Link href="/categories" replace scroll={false} aria-current={!income ? "page" : undefined} className={tab(!income)}>
            🧾 Dépenses
          </Link>
          <Link
            href="/categories?tab=revenus"
            replace
            scroll={false}
            aria-current={income ? "page" : undefined}
            className={tab(income)}
          >
            💰 Revenus
          </Link>
        </nav>
        <CategoryManager
          key={income ? "income" : "expense"}
          kind={income ? "income" : "expense"}
          categories={categories}
          stats={stats}
          monthLabel={monthLabelFr(month)}
          currency={settings.currency}
        />
      </main>
    </>
  );
}
