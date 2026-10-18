import { getAllCategories, getAllExpenses, getAllLoans, getAllPayments, getAllSalaryAdvances, getSettings } from "@/lib/page-data";
import { monthLabelFr, todayMonth } from "@/lib/date";

import { loanState } from "@/lib/loans";
import { getWallet } from "@/lib/wallet-data";
import { HomeHeader } from "@/components/home-header";
import { currentAccount } from "@/lib/accounts";
import { HomeDashboard } from "@/components/home-dashboard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [settings, expenses, payments, categories, advances, wallet, loans, account] = await Promise.all([
    getSettings(),
    getAllExpenses(),
    getAllPayments(),
    getAllCategories(),
    getAllSalaryAdvances(),
    getWallet(),
    getAllLoans(),
    currentAccount(),
  ]);
  const categoryEmoji = Object.fromEntries(categories.map((c) => [c.id, c.emoji]));
  const currentMonth = todayMonth();
  const dueRepayments = loans.flatMap((loan) =>
    loanState(loan, currentMonth).due.map((s) => ({
      loanId: loan.id,
      name: loan.name,
      slot: s.slot,
      expected: s.amount,
      received: s.received,
      monthLabel: monthLabelFr(s.month),
    })),
  );

  return (
    <div className="relative">
      <HomeHeader name={account?.name || account?.email.split("@")[0] || ""} />

      <main className="relative flex flex-col gap-4 px-4 pb-5 pt-2">
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
    </div>
  );
}
