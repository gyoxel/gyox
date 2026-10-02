import {
  getAllCategories,
  getAllDarets,
  getAllExpenses,
  getAllIncomes,
  getAllPayments,
  getAllSalaryAdvances,
  getAllSalaryReceipts,
  getAllWalletOps,
  getSettings,
} from "@/lib/repository";
import { buildWallet } from "@/lib/wallet";
import { monthKey, todayMonth } from "@/lib/date";
import { PageHeader } from "@/components/page-header";
import { SoldeView } from "@/components/solde-view";

export const dynamic = "force-dynamic";

/** Solde: cash and card, transfers between them, and the full history. */
export default async function SoldePage() {
  const [settings, receipts, advances, incomes, darets, payments, expenses, ops, categories] = await Promise.all([
    getSettings(),
    getAllSalaryReceipts(),
    getAllSalaryAdvances(),
    getAllIncomes(),
    getAllDarets(),
    getAllPayments(),
    getAllExpenses(),
    getAllWalletOps(),
    getAllCategories(),
  ]);
  const wallet = buildWallet({
    receipts,
    advances,
    incomes,
    darets,
    payments,
    expenses,
    ops,
    categoryEmoji: new Map(categories.map((c) => [c.id, c.emoji])),
    month: monthKey(todayMonth()),
  });

  return (
    <>
      <PageHeader title="Solde" back />
      <main className="flex flex-col gap-5 px-4 py-5">
        <SoldeView wallet={wallet} currency={settings.currency} />
      </main>
    </>
  );
}
