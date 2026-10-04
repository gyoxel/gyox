import { getAllCategories, getAllExpenses, getAllPayments, getAllSalaryAdvances, getSettings } from "@/lib/repository";
import { todayMonth } from "@/lib/date";
import { getWallet } from "@/lib/wallet-data";
import { HomeHeader } from "@/components/home-header";
import { CountdownNextSalary } from "@/components/countdown-next-salary";
import { HomeDashboard } from "@/components/home-dashboard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [settings, expenses, payments, categories, advances, wallet] = await Promise.all([
    getSettings(),
    getAllExpenses(),
    getAllPayments(),
    getAllCategories(),
    getAllSalaryAdvances(),
    getWallet(),
  ]);
  const categoryEmoji = Object.fromEntries(categories.map((c) => [c.id, c.emoji]));
  const currentMonth = todayMonth();

  return (
    <>
      <HomeHeader />

      <main className="flex flex-col gap-4 px-4 py-5">
        <HomeDashboard
          solde={wallet.balance}
          currency={settings.currency}
          expenses={expenses}
          payments={payments}
          currentMonth={currentMonth}
          categoryEmoji={categoryEmoji}
          countdown={<CountdownNextSalary settings={settings} advances={advances} />}
        />
      </main>
    </>
  );
}
