// Server-side: the Solde built from the database (Solde page, Disponible
// maintenant on Accueil, Statistiques).
import {
  getAllCategories,
  getAllDarets,
  getAllExpenses,
  getAllGoals,
  getAllIncomes,
  getAllPayments,
  getAllSalaryAdvances,
  getAllSalaryReceipts,
  getAllWalletOps,
} from "./repository";
import { monthKey, todayMonth } from "./date";
import { buildWallet, type WalletSummary } from "./wallet";

export async function getWallet(): Promise<WalletSummary> {
  const [receipts, advances, incomes, darets, payments, expenses, ops, categories, goals] = await Promise.all([
    getAllSalaryReceipts(),
    getAllSalaryAdvances(),
    getAllIncomes(),
    getAllDarets(),
    getAllPayments(),
    getAllExpenses(),
    getAllWalletOps(),
    getAllCategories(),
    getAllGoals(),
  ]);
  return buildWallet({
    receipts,
    advances,
    incomes,
    darets,
    payments,
    expenses,
    ops,
    goals,
    categoryEmoji: new Map(categories.map((c) => [c.id, c.emoji])),
    month: monthKey(todayMonth()),
  });
}
