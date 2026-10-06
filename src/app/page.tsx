import { getAllCategories, getAllExpenses, getAllLoans, getAllPayments, getAllSalaryAdvances, getSettings } from "@/lib/page-data";
import { monthLabelFr, todayMonth } from "@/lib/date";

import { loanState } from "@/lib/loans";
import { getWallet } from "@/lib/wallet-data";
import { HomeHeader } from "@/components/home-header";
import { HomeDashboard } from "@/components/home-dashboard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [settings, expenses, payments, categories, advances, wallet, loans] = await Promise.all([
    getSettings(),
    getAllExpenses(),
    getAllPayments(),
    getAllCategories(),
    getAllSalaryAdvances(),
    getWallet(),
    getAllLoans(),
  ]);
  const categoryEmoji = Object.fromEntries(categories.map((c) => [c.id, c.emoji]));
  const currentMonth = todayMonth();
  const dueRepayments = loans.flatMap((loan) =>
    loanState(loan, currentMonth).due.map((s) => ({
      loanId: loan.id,
      name: loan.name,
      slot: s.slot,
      amount: s.amount,
      monthLabel: monthLabelFr(s.month),
    })),
  );

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
          settings={settings}
          advances={advances}
          dueRepayments={dueRepayments}
        />
      </main>
    </>
  );
}
