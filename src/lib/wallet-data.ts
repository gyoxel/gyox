import { getAllCategories, getAllDarets, getAllExpenses, getAllGoals, getAllIncomes, getAllLoans, getAllPayments, getAllSalaryAdvances, getAllSalaryReceipts, getAllSavingsMoves, getAllWalletOps, getIncomeCategories } from "./page-data";
// Server-side: the Solde built from the database (Solde page, Disponible
// maintenant on Accueil, Statistiques).

import { monthKey, todayMonth } from "./date";
import { buildWallet, type WalletSummary } from "./wallet";

export async function getWallet(): Promise<WalletSummary> {
  const [receipts, advances, incomes, darets, payments, expenses, ops, categories, goals, savingsMoves, loans, incomeCategories] = await Promise.all([
    getAllSalaryReceipts(),
    getAllSalaryAdvances(),
    getAllIncomes(),
    getAllDarets(),
    getAllPayments(),
    getAllExpenses(),
    getAllWalletOps(),
    getAllCategories(),
    getAllGoals(),
    getAllSavingsMoves(),
    getAllLoans(),
    getIncomeCategories(),
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
    savingsMoves,
    loans,
    incomeCategories,
    categoryEmoji: new Map(categories.map((c) => [c.id, c.emoji])),
    month: monthKey(todayMonth()),
  });
}
