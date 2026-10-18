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
      <div aria-hidden className="gx-home-glow pointer-events-none absolute inset-x-0 top-0 -z-0 h-[440px]" />
      <HomeHeader name={account?.name || account?.email.split("@")[0] || ""} />

      <main className="relative flex flex-col gap-5 px-4 pb-5 pt-3">
        <HomeDashboard
          solde={wallet.balance}
          savings={wallet.savings}
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
