// Menu → « Réinitialiser » : start again from zero — everything, or only
// this month — the categories and the people kept or not. Runs inside
// callApi's transaction (src/app/api-actions.ts): all of it, or nothing.
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { addMonths, monthKey, todayMonth } from "./date";
import { defaultSettings } from "./user-defaults";
import { getSettings, resetCategories } from "./repository";
import { resetIncomeCategories } from "./income-categories-repo";

/**
 * Everything goes: expenses and debts (their payments, darets, money
 * borrowed with them), incomes, loans, savings, goals, salary advances and
 * receipts, cash / card moves, day notes, the Historique; the settings back
 * to a new account's (the theme kept). `categories`: expense and income
 * categories back to the app's own. `people`: the Personnes list emptied.
 */
export async function resetAll({ categories, people }: { categories: boolean; people: boolean }): Promise<void> {
  const { theme } = await getSettings();
  // Deleting an expense takes what hangs on it (payments, a daret, a goal
  // deposit, a savings move, a loan, the income of a debt…).
  await prisma.expense.deleteMany({});
  await prisma.loanRepayment.deleteMany({});
  await prisma.loan.deleteMany({});
  await prisma.savingsMove.deleteMany({});
  await prisma.goalDeposit.deleteMany({});
  await prisma.goal.deleteMany({});
  await prisma.goalIdea.deleteMany({});
  await prisma.income.deleteMany({});
  await prisma.salaryAdvance.deleteMany({});
  await prisma.salaryReceipt.deleteMany({});
  await prisma.walletOp.deleteMany({});
  await prisma.dayNote.deleteMany({});
  await prisma.activity.deleteMany({});
  await prisma.settings.updateMany({ data: { ...defaultSettings(), theme } });
  if (categories) {
    await resetCategories();
    await resetIncomeCategories();
  }
  if (people) await prisma.person.deleteMany({});
}

/**
 * Only this month (Moroccan time) goes: what was added in it (expenses,
 * debts, loans, darets, goals), its payments, incomes, savings moves, goal
 * deposits, repayments, salary (advance, « reçu »), cash / card moves, day
 * notes, its Historique lines and « pas ce mois-ci ». Earlier months stay.
 */
export async function resetMonth(): Promise<void> {
  const key = monthKey(todayMonth());
  const inMonth = { startsWith: key };

  // Savings moves, goal deposits, loans of the month: with what they made.
  const [moves, deposits, loans, repayments, darets] = await Promise.all([
    prisma.savingsMove.findMany({ where: { date: inMonth }, select: { expenseId: true, incomeId: true } }),
    prisma.goalDeposit.findMany({ where: { date: inMonth }, select: { expenseId: true } }),
    prisma.loan.findMany({ where: { OR: [{ date: inMonth }, { createdAt: inMonth }] }, select: { expenseId: true } }),
    prisma.loanRepayment.findMany({ where: { date: inMonth }, select: { incomeId: true } }),
    prisma.daret.findMany({ where: { createdAt: inMonth }, select: { expenseId: true } }),
  ]);
  const ids = (list: (string | null)[]) => list.filter((x): x is string => x != null);
  const expenseIds = ids([...moves.map((m) => m.expenseId), ...deposits.map((d) => d.expenseId), ...loans.map((l) => l.expenseId), ...darets.map((d) => d.expenseId)]);
  const incomeIds = ids([...moves.map((m) => m.incomeId), ...repayments.map((r) => r.incomeId)]);

  await prisma.payment.deleteMany({ where: { OR: [{ monthKey: key }, { monthKey: null, paidAt: inMonth }] } });
  await prisma.expense.deleteMany({ where: { OR: [{ id: { in: expenseIds } }, { startDate: inMonth }] } });
  await prisma.income.deleteMany({ where: { OR: [{ id: { in: incomeIds } }, { date: inMonth }] } });
  await prisma.savingsMove.deleteMany({ where: { date: inMonth } });
  await prisma.goalDeposit.deleteMany({ where: { date: inMonth } });
  await prisma.loanRepayment.deleteMany({ where: { date: inMonth } });
  await prisma.loan.deleteMany({ where: { OR: [{ date: inMonth }, { createdAt: inMonth }] } });
  await prisma.goal.deleteMany({ where: { createdAt: inMonth } });
  await prisma.salaryAdvance.deleteMany({ where: { OR: [{ date: inMonth }, { period: key }] } });
  await prisma.salaryReceipt.deleteMany({ where: { period: key } });
  await prisma.walletOp.deleteMany({ where: { createdAt: inMonth } });
  await prisma.dayNote.deleteMany({ where: { date: inMonth } });
  await prisma.activity.deleteMany({ where: { at: inMonth } });

  // « Salaire reçu » this month: not any more.
  const settings = await getSettings();
  if (settings.salaryReceivedMonth === key) {
    await prisma.settings.updateMany({ data: { salaryReceivedMonth: monthKey(addMonths(todayMonth(), -1)) } });
  }
  // « Pas ce mois-ci » set on this month: gone.
  const skipped = await prisma.expense.findMany({ select: { id: true, monthAmounts: true } });
  for (const e of skipped) {
    const months = e.monthAmounts as Record<string, number> | null;
    if (!months || !(key in months)) continue;
    const { [key]: _gone, ...rest } = months;
    void _gone;
    await prisma.expense.updateMany({ where: { id: e.id }, data: { monthAmounts: Object.keys(rest).length > 0 ? rest : Prisma.DbNull } });
  }
}
