// What the pages read: all of the signed-in user's data in ONE database
// query per page render (React's cache() shares it between everything the
// render asks for), instead of one query per table — about 20 per page.
// Prisma Postgres bills per query, and pages are rendered often (tabs
// prefetched, refreshed after every change), so this is most of the usage.
//
// Same names and results as the repository's readers. Only for pages:
// changes (API routes) keep reading through the repository, fresh.
import { cache } from "react";
import { prisma } from "./prisma";
import { requireUserId } from "./user-scope";
import {
  asMethod,
  getSettings as readOrCreateSettings,
  mapAdvance,
  mapCategory,
  mapDaret,
  mapExpense,
  mapGoal,
  mapIncome,
  mapPayment,
  mapSettings,
} from "./repository";
import { mapLoan, mapRepayment } from "./loans-repo";
import { mapMove } from "./savings-repo";
import type {
  Category,
  DaretWithExpense,
  DayNote,
  Expense,
  Goal,
  GoalDeposit,
  GoalIdea,
  Income,
  Loan,
  LoanRepayment,
  Payment,
  SalaryAdvance,
  SalaryReceipt,
  SavingsMove,
  Settings,
  WalletOp,
} from "./types";

// One JSON object, a list per table, each in the order the repository uses.
// $1: the user.
const TABLES: [key: string, table: string, order: string | null][] = [
  ["settings", "settings", null],
  ["expenses", "expenses", `"createdAt"`],
  ["payments", "payments", null],
  ["darets", "darets", `"createdAt"`],
  ["categories", "categories", `"position", "createdAt"`],
  ["goals", "goals", `"position", "createdAt"`],
  ["goalDeposits", "goal_deposits", null],
  ["goalIdeas", "goal_ideas", `"createdAt"`],
  ["dayNotes", "day_notes", `"date"`],
  ["salaryAdvances", "salary_advances", `"date"`],
  ["salaryReceipts", "salary_receipts", `"createdAt"`],
  ["walletOps", "wallet_ops", `"createdAt"`],
  ["incomes", "incomes", `"date" DESC, "createdAt" DESC`],
  ["incomeCategories", "income_categories", `"position", "createdAt"`],
  ["savingsMoves", "savings_moves", `"date" DESC, "createdAt" DESC`],
  ["loans", "loans", `"date" DESC, "createdAt" DESC`],
  ["loanRepayments", "loan_repayments", null],
];

const SNAPSHOT_SQL = `SELECT json_build_object(${TABLES.map(
  ([key, table, order]) =>
    `'${key}', (SELECT COALESCE(json_agg(t${order ? ` ORDER BY ${order.replace(/"(\w+)"/g, 't."$1"')}` : ""}), '[]'::json) FROM "${table}" t WHERE t."userId" = $1)`,
).join(", ")}) AS data`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

const withoutUser = (rows: Row[]) =>
  rows.map((row) => {
    const rest = { ...row };
    delete rest.userId;
    return rest;
  });

/** Everything, mapped once per page render. */
const snapshot = cache(async () => {
  const userId = await requireUserId();
  const [{ data }] = await prisma.$queryRawUnsafe<{ data: Record<string, Row[]> }[]>(SNAPSHOT_SQL, userId);
  const t = Object.fromEntries(Object.entries(data).map(([key, rows]) => [key, withoutUser(rows)])) as Record<string, Row[]>;

  const expenses: Expense[] = t.expenses.map((r) => mapExpense(r as Parameters<typeof mapExpense>[0]));
  const expenseById = new Map(expenses.map((e) => [e.id, e]));
  const deposits = t.goalDeposits;
  const repayments = t.loanRepayments;

  return {
    settings: t.settings[0] ? mapSettings(t.settings[0] as Parameters<typeof mapSettings>[0]) : null,
    expenses,
    expenseById,
    payments: t.payments.map((r) => mapPayment(r as Parameters<typeof mapPayment>[0])),
    darets: t.darets
      .filter((d) => expenseById.has(d.expenseId))
      .map((d) => ({ ...mapDaret(d as Parameters<typeof mapDaret>[0]), expense: expenseById.get(d.expenseId)! }) as DaretWithExpense),
    categories: t.categories.map((r) => mapCategory(r as Category)),
    goals: t.goals.map((g) =>
      mapGoal({ ...(g as Omit<Goal, "deposits">), deposits: deposits.filter((d) => d.goalId === g.id) as GoalDeposit[] }),
    ),
    goalIdeas: t.goalIdeas as GoalIdea[],
    dayNotes: t.dayNotes as DayNote[],
    salaryAdvances: t.salaryAdvances.map((r) => mapAdvance(r as Parameters<typeof mapAdvance>[0])),
    salaryReceipts: t.salaryReceipts.map((r) => ({ ...r, method: r.method === "cash" ? "cash" : "card" }) as SalaryReceipt),
    walletOps: t.walletOps.map(
      (r) =>
        ({
          ...r,
          kind: r.kind === "adjust" ? "adjust" : "transfer",
          fromAccount: asMethod(r.fromAccount),
          toAccount: asMethod(r.toAccount),
        }) as WalletOp,
    ),
    incomes: t.incomes.map((r) => mapIncome(r as Parameters<typeof mapIncome>[0])),
    incomeCategories: t.incomeCategories.map(({ id, name, emoji, position }) => ({ id, name, emoji, position }) as Category),
    savingsMoves: t.savingsMoves.map((r) => mapMove(r as Parameters<typeof mapMove>[0])),
    loans: t.loans.map((l) =>
      mapLoan({ ...(l as Parameters<typeof mapLoan>[0]), repayments: repayments.filter((r) => r.loanId === l.id) as never }),
    ),
    loanRepayments: repayments.map((r) => mapRepayment(r as Parameters<typeof mapRepayment>[0])),
  };
});

export async function getSettings(): Promise<Settings> {
  // No row yet (shouldn't happen: made at sign-up): the repository makes it.
  return (await snapshot()).settings ?? readOrCreateSettings();
}

export const getAllExpenses = async (): Promise<Expense[]> => (await snapshot()).expenses;
export const getAllPayments = async (): Promise<Payment[]> => (await snapshot()).payments;
export const getAllDarets = async (): Promise<DaretWithExpense[]> => (await snapshot()).darets;
export const getAllCategories = async (): Promise<Category[]> => (await snapshot()).categories;
export const getAllGoals = async (): Promise<Goal[]> => (await snapshot()).goals;
export const getAllGoalIdeas = async (): Promise<GoalIdea[]> => (await snapshot()).goalIdeas;
export const getAllDayNotes = async (): Promise<DayNote[]> => (await snapshot()).dayNotes;
export const getAllSalaryAdvances = async (): Promise<SalaryAdvance[]> => (await snapshot()).salaryAdvances;
export const getAllSalaryReceipts = async (): Promise<SalaryReceipt[]> => (await snapshot()).salaryReceipts;
export const getAllWalletOps = async (): Promise<WalletOp[]> => (await snapshot()).walletOps;
export const getAllIncomes = async (): Promise<Income[]> => (await snapshot()).incomes;
export const getIncomeCategories = async (): Promise<Category[]> => (await snapshot()).incomeCategories;
export const getAllSavingsMoves = async (): Promise<SavingsMove[]> => (await snapshot()).savingsMoves;
export const getAllLoans = async (): Promise<Loan[]> => (await snapshot()).loans;
export const getAllLoanRepayments = async (): Promise<LoanRepayment[]> => (await snapshot()).loanRepayments;

export const getExpenseById = async (id: string): Promise<Expense | null> => (await snapshot()).expenseById.get(id) ?? null;
export const getGoalById = async (id: string): Promise<Goal | null> => (await getAllGoals()).find((g) => g.id === id) ?? null;
export const getIncomeById = async (id: string): Promise<Income | null> => (await getAllIncomes()).find((i) => i.id === id) ?? null;
export const getDaretById = async (id: string): Promise<DaretWithExpense | null> =>
  (await getAllDarets()).find((d) => d.id === id) ?? null;
export const getLoan = async (id: string): Promise<Loan | null> => (await getAllLoans()).find((l) => l.id === id) ?? null;
export const getSavingsMove = async (id: string): Promise<SavingsMove | null> =>
  (await getAllSavingsMoves()).find((m) => m.id === id) ?? null;

export async function getGoalDeposit(goalId: string, depositId: string): Promise<GoalDeposit | null> {
  return (await getGoalById(goalId))?.deposits.find((d) => d.id === depositId) ?? null;
}

/** The daret an expense backs (its monthly contribution), if any. */
export const getDaretOfExpense = async (expenseId: string): Promise<DaretWithExpense | null> =>
  (await getAllDarets()).find((d) => d.expenseId === expenseId) ?? null;

/** The goal deposit an expense stands for, if any. */
export async function getDepositOfExpense(
  expenseId: string,
): Promise<{ deposit: GoalDeposit; goal: { id: string; name: string; emoji: string } } | null> {
  for (const goal of await getAllGoals()) {
    const deposit = goal.deposits.find((d) => d.expenseId === expenseId);
    if (deposit) return { deposit, goal: { id: goal.id, name: goal.name, emoji: goal.emoji } };
  }
  return null;
}

export const getLoanOfExpense = async (expenseId: string): Promise<Loan | null> =>
  (await getAllLoans()).find((l) => l.expenseId === expenseId) ?? null;

/** The loan an income is a repayment of. */
export const getLoanOfIncome = async (incomeId: string): Promise<Loan | null> =>
  (await getAllLoans()).find((l) => l.repayments.some((r) => r.incomeId === incomeId)) ?? null;

export const getSavingsMoveOfExpense = async (expenseId: string): Promise<SavingsMove | null> =>
  (await getAllSavingsMoves()).find((m) => m.expenseId === expenseId) ?? null;

export const getSavingsMoveOfIncome = async (incomeId: string): Promise<SavingsMove | null> =>
  (await getAllSavingsMoves()).find((m) => m.incomeId === incomeId) ?? null;
