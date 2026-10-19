import { cookies } from "next/headers";
import { getAllBudgetMonths, getAllBudgets, getAllCategories, getAllDarets, getAllExpenses, getAllGoals, getAllLoans, getAllPayments, getAllSalaryAdvances, getAllSavingsMoves, getSettings } from "@/lib/page-data";
import { addMonths, monthKey, todayDateStr, todayMonth } from "@/lib/date";
import { categoryBreakdown } from "@/lib/category-stats";
import { BILAN_COOKIE, BILAN_DAYS, buildMonthBilan, type MonthBilanData } from "@/lib/month-bilan";
import { monthLabel } from "@/lib/i18n/dates";
import { getLang } from "@/lib/i18n/server";

import { loanState } from "@/lib/loans";
import { getDaretState } from "@/lib/daret";
import { getWallet } from "@/lib/wallet-data";
import { HomeHeader } from "@/components/home-header";
import { currentAccount } from "@/lib/accounts";
import { HomeDashboard } from "@/components/home-dashboard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [settings, expenses, payments, categories, advances, wallet, loans, darets, account, lang] = await Promise.all([
    getSettings(),
    getAllExpenses(),
    getAllPayments(),
    getAllCategories(),
    getAllSalaryAdvances(),
    getWallet(),
    getAllLoans(),
    getAllDarets(),
    currentAccount(),
    getLang(),
  ]);
  const categoryEmoji = Object.fromEntries(categories.map((c) => [c.id, c.emoji]));
  const currentMonth = todayMonth();
  const bilan = await monthBilan(categories, expenses, darets, loans, lang);
  const dueRepayments = loans.flatMap((loan) =>
    loanState(loan, currentMonth).due.map((s) => ({
      loanId: loan.id,
      name: loan.name,
      slot: s.slot,
      expected: s.amount,
      received: s.received,
      monthLabel: monthLabel(s.month, lang),
    })),
  );

  // Darets whose turn has come (this month or before) and whose pot isn't
  // confirmed yet.
  const dueDaretPayouts = darets.flatMap((d) => {
    if (d.payoutMethod || !d.expense.active) return [];
    const state = getDaretState(d, payments, currentMonth);
    if (state.turnStatus === "upcoming") return [];
    return [
      {
        daretId: d.id,
        name: d.expense.name,
        icon: d.expense.icon ?? "🤝🏻",
        payout: state.payout,
        monthLabel: monthLabel(state.turn, lang),
      },
    ];
  });

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
          dueDaretPayouts={dueDaretPayouts}
          bilan={bilan}
        />
      </main>
    </div>
  );
}

/** The first days of a month: the bilan of the one just over, unless it
 *  was closed on this device. */
async function monthBilan(
  categories: Awaited<ReturnType<typeof getAllCategories>>,
  expenses: Awaited<ReturnType<typeof getAllExpenses>>,
  darets: Awaited<ReturnType<typeof getAllDarets>>,
  loans: Awaited<ReturnType<typeof getAllLoans>>,
  lang: Awaited<ReturnType<typeof getLang>>,
): Promise<MonthBilanData | null> {
  if (Number(todayDateStr().slice(8, 10)) > BILAN_DAYS) return null;
  const month = addMonths(todayMonth(), -1);
  const key = monthKey(month);
  if ((await cookies()).get(BILAN_COOKIE)?.value === key) return null;
  const [wallet, savingsMoves, goals, budgets, budgetMonths] = await Promise.all([
    getWallet(month),
    getAllSavingsMoves(),
    getAllGoals(),
    getAllBudgets(),
    getAllBudgetMonths(),
  ]);
  const slices = categoryBreakdown({ expenses, categories, darets, savingsMoves, goals, budgets, budgetMonths, loans }, month);
  return buildMonthBilan(wallet, slices, key, monthLabel(month, lang));
}
