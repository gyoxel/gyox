import { getAllExpenses, getAllGoals, getAllPayments, getAllSavingsMoves, getSettings } from "@/lib/page-data";
import { monthlyPlan } from "@/lib/monthly-plan";
import { todayMonth } from "@/lib/date";
import { getWallet } from "@/lib/wallet-data";
import { isMoveCounted } from "@/lib/savings";
import { PageHeader } from "@/components/page-header";
import { getI18n } from "@/lib/i18n/server";
import { HeaderAdd } from "@/components/header-add";
import { EpargneView } from "@/components/epargne-view";

export const dynamic = "force-dynamic";

/** Épargne: what's put aside, putting more / taking some back, the history. */
export default async function EpargnePage() {
  const [settings, wallet, moves, payments, goals, expenses, { t }] = await Promise.all([
    getSettings(),
    getWallet(),
    getAllSavingsMoves(),
    getAllPayments(),
    getAllGoals(),
    getAllExpenses(),
    getI18n(),
  ]);
  const expenseById = new Map(expenses.map((e) => [e.id, e]));
  const current = todayMonth();
  // Given to a goal: it opens that deposit, on the goal.
  const depositHref = new Map(goals.flatMap((g) => g.deposits.map((d) => [d.id, `/goals/${g.id}/deposits/${d.id}`] as const)));
  return (
    <>
      <PageHeader title={t("Épargne")} back info="epargne" action={<HeaderAdd label={t("Mettre de côté")} />} />
      <main className="flex flex-col gap-5 px-4 py-5">
        <EpargneView
          moves={moves.map((m) => ({
            ...m,
            counted: isMoveCounted(m, payments),
            href: (m.goalDepositId && depositHref.get(m.goalDepositId)) || `/epargne/${m.id}`,
            plan: m.monthly && m.expenseId && expenseById.has(m.expenseId) ? monthlyPlan(expenseById.get(m.expenseId)!, payments, current) : null,
          }))}
          balance={wallet.balance}
          savings={wallet.savings}
          currency={settings.currency}
        />
      </main>
    </>
  );
}
