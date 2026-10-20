import { cookies } from "next/headers";
import { getAllCategories, getAllExpenses, getAllPayments, getSettings } from "@/lib/page-data";
import { QUICK_COOKIE, readQuickCookie } from "@/lib/quick-expense";
import { spentByCategory } from "@/lib/category-budgets";
import { todayMonth } from "@/lib/date";
import { getWallet } from "@/lib/wallet-data";
import { getI18n } from "@/lib/i18n/server";
import { PageHeader } from "@/components/page-header";
import { QuickExpense } from "@/components/quick-expense";

export const dynamic = "force-dynamic";

/** Dépense rapide (a long press on the bar's +): an amount, a category,
 *  cash or card — paid today, in one tap. */
export default async function QuickExpensePage() {
  const [settings, categories, expenses, payments, wallet, jar, { t }] = await Promise.all([
    getSettings(),
    getAllCategories(),
    getAllExpenses(),
    getAllPayments(),
    getWallet(),
    cookies(),
    getI18n(),
  ]);
  const current = todayMonth();
  const last = readQuickCookie(jar.get(QUICK_COOKIE)?.value);
  return (
    <>
      <PageHeader title={t("Dépense rapide")} back info="expense-quick" />
      <main className="px-4 py-5">
        <QuickExpense
          categories={categories}
          spent={Object.fromEntries(spentByCategory(expenses, payments, current, current))}
          balance={wallet.balance}
          currency={settings.currency}
          lastCategoryId={last.categoryId}
          lastMethod={last.method}
        />
      </main>
    </>
  );
}
