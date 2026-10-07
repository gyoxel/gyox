// Budgets in the database. A budget is its expense (name, emoji, amount,
// recurrence) plus the lines spent inside it; each month's "<name> +"
// expense and "<name> - Reste" income are kept in step by reconcileBudget
// (see lib/budgets.ts for what they are).
import { randomUUID } from "crypto";
import { prisma } from "./prisma";
import { getPaymentsForExpense, mapExpense, mapPayment } from "./repository";
import { addMonths, monthKey as toMonthKey, monthOfDateStr, todayMonth } from "./date";
import { lastDayOfMonth } from "./daret";
import {
  RESTE_CATEGORY,
  budgetMonthKeys,
  budgetMonthState,
  overflowName,
  plannedAmount,
  resteDate,
  resteName,
} from "./budgets";
import type { BudgetEntry, BudgetMonth, BudgetWithExpense, Expense, PaymentMethod } from "./types";

export type BudgetRecurrence = { kind: "once" } | { kind: "monthly" } | { kind: "months"; months: number };

export interface BudgetInput {
  name: string;
  emoji: string | null;
  amount: number;
  recurrence: BudgetRecurrence;
}

export const asMethod = (m: string | null | undefined): PaymentMethod => (m === "card" ? "card" : "cash");

export function mapBudgetEntry(row: {
  id: string;
  budgetId: string;
  date: string;
  amount: number;
  note: string | null;
  method: string;
  createdAt: string;
}): BudgetEntry {
  return { ...row, method: asMethod(row.method) };
}

export function mapBudgetMonth(row: BudgetMonth): BudgetMonth {
  return {
    id: row.id,
    budgetId: row.budgetId,
    monthKey: row.monthKey,
    overflowExpenseId: row.overflowExpenseId,
    resteIncomeId: row.resteIncomeId,
  };
}

/** The expense fields of a recurrence, starting `startDate`. */
function recurrenceFields(recurrence: BudgetRecurrence, startDate: string) {
  if (recurrence.kind === "monthly") {
    return { type: "permanent", frequency: "monthly", endDate: null, color: "red" };
  }
  if (recurrence.kind === "months" && recurrence.months > 1) {
    const end = addMonths(monthOfDateStr(startDate), recurrence.months - 1);
    return { type: "temporary", frequency: "monthly", endDate: lastDayOfMonth(end), color: "yellow" };
  }
  return { type: "temporary", frequency: "one-time", endDate: null, color: "yellow" };
}

export async function getBudget(id: string): Promise<BudgetWithExpense | null> {
  const row = await prisma.budget.findUnique({ where: { id }, include: { expense: true } });
  if (!row) return null;
  const { expense, ...budget } = row;
  return { ...budget, expense: mapExpense(expense) };
}

/** A new budget, starting this month (its expense: not ticked yet). */
export async function createBudget(input: BudgetInput): Promise<BudgetWithExpense> {
  const now = new Date().toISOString();
  const startDate = `${toMonthKey(todayMonth())}-01`;
  const expenseId = randomUUID();
  const [expense, budget] = await prisma.$transaction([
    prisma.expense.create({
      data: {
        id: expenseId,
        name: input.name,
        amount: input.amount,
        ...recurrenceFields(input.recurrence, startDate),
        startDate,
        active: true,
        notes: null,
        creditInitialAmount: null,
        creditPriorPaid: null,
        linkedExpenseId: null,
        icon: input.emoji,
        categoryId: null,
        createdAt: now,
        updatedAt: now,
      },
    }),
    prisma.budget.create({ data: { id: randomUUID(), expenseId, createdAt: now } }),
  ]);
  return { ...budget, expense: mapExpense(expense) };
}

/** Edits a budget (its expense); the months follow. */
export async function updateBudget(id: string, input: BudgetInput): Promise<BudgetWithExpense | null> {
  const budget = await prisma.budget.findUnique({ where: { id }, include: { expense: true } });
  if (!budget) return null;
  const expense = await prisma.expense.update({
    where: { id: budget.expenseId },
    data: {
      name: input.name,
      icon: input.emoji,
      amount: input.amount,
      ...recurrenceFields(input.recurrence, budget.expense.startDate),
      updatedAt: new Date().toISOString(),
    },
  });
  await reconcileBudget(id);
  return { id: budget.id, expenseId: budget.expenseId, createdAt: budget.createdAt, expense: mapExpense(expense) };
}

/**
 * Deletes a budget with its expense (and ticks), its lines, and its months'
 * "+" expenses and "- Reste" incomes. Gives the app pages gone with it.
 */
export async function deleteBudget(id: string): Promise<string[] | null> {
  const budget = await prisma.budget.findUnique({ where: { id }, include: { months: true } });
  if (!budget) return null;
  const overflowIds = budget.months.flatMap((m) => (m.overflowExpenseId ? [m.overflowExpenseId] : []));
  const resteIds = budget.months.flatMap((m) => (m.resteIncomeId ? [m.resteIncomeId] : []));
  await prisma.$transaction([
    prisma.expense.deleteMany({ where: { id: { in: overflowIds } } }),
    prisma.income.deleteMany({ where: { id: { in: resteIds } } }),
    prisma.expense.deleteMany({ where: { id: budget.expenseId } }),
  ]);
  return [
    `/budgets/${id}`,
    `/budgets/${id}/edit`,
    `/expenses/${budget.expenseId}`,
    ...overflowIds.map((e) => `/expenses/${e}`),
    ...resteIds.map((i) => `/incomes/${i}`),
  ];
}

/** Why a line can't be on `date` (the budget doesn't run that month), else null. */
export async function outsideBudget(expense: Expense, date: string): Promise<string | null> {
  const key = date.slice(0, 7);
  if (plannedAmount(expense, key) > 0) return null;
  const taken = (await getPaymentsForExpense(expense.id)).some((p) => p.monthKey === key && p.amountPaid > 0);
  return taken ? null : "Ce budget ne court pas ce mois-là.";
}

export async function addBudgetEntry(
  budgetId: string,
  input: { date: string; amount: number; note: string | null; method: PaymentMethod },
): Promise<BudgetEntry> {
  const row = await prisma.budgetEntry.create({
    data: { id: randomUUID(), budgetId, ...input, createdAt: new Date().toISOString() },
  });
  await reconcileBudget(budgetId);
  return mapBudgetEntry(row);
}

export async function updateBudgetEntry(
  budgetId: string,
  entryId: string,
  input: { date: string; amount: number; note: string | null; method: PaymentMethod },
): Promise<BudgetEntry | null> {
  const { count } = await prisma.budgetEntry.updateMany({ where: { id: entryId, budgetId }, data: input });
  if (count === 0) return null;
  await reconcileBudget(budgetId);
  const row = await prisma.budgetEntry.findUnique({ where: { id: entryId } });
  return row ? mapBudgetEntry(row) : null;
}

export async function deleteBudgetEntry(budgetId: string, entryId: string): Promise<boolean> {
  const { count } = await prisma.budgetEntry.deleteMany({ where: { id: entryId, budgetId } });
  if (count === 0) return false;
  await reconcileBudget(budgetId);
  return true;
}

/** Its budget's id when this expense is a budget's ("+" included). */
export async function budgetIdOfExpense(expenseId: string): Promise<string | null> {
  const own = await prisma.budget.findFirst({ where: { expenseId }, select: { id: true } });
  if (own) return own.id;
  return (await prisma.budgetMonth.findFirst({ where: { overflowExpenseId: expenseId }, select: { budgetId: true } }))?.budgetId ?? null;
}

/** Its budget's id when this income is what was left of a budget. */
export async function budgetIdOfIncome(incomeId: string): Promise<string | null> {
  return (await prisma.budgetMonth.findFirst({ where: { resteIncomeId: incomeId }, select: { budgetId: true } }))?.budgetId ?? null;
}

/**
 * Brings a budget's months in step with its lines and ticks: each month's
 * "<name> +" expense (paid) and "<name> - Reste" income are created,
 * updated or removed so they match what lib/budgets.ts says.
 */
export async function reconcileBudget(budgetId: string): Promise<void> {
  const budget = await prisma.budget.findUnique({
    where: { id: budgetId },
    include: {
      expense: true,
      entries: true,
      months: { include: { overflowExpense: { include: { payments: true } }, resteIncome: true } },
    },
  });
  if (!budget) return;
  const expense = mapExpense(budget.expense);
  const entries = budget.entries.map(mapBudgetEntry);
  const payments = (await prisma.payment.findMany({ where: { expenseId: expense.id } })).map(mapPayment);
  const current = toMonthKey(todayMonth());
  const now = new Date().toISOString();

  for (const key of budgetMonthKeys(expense.id, entries, payments, budget.months.map((m) => m.monthKey))) {
    const state = budgetMonthState(expense, entries, payments, key, current);
    let row = budget.months.find((m) => m.monthKey === key) ?? null;
    const needsRow = state.over > 0 || state.reste > 0;
    if (!row && !needsRow) continue;
    if (!row) {
      const made = await prisma.budgetMonth.upsert({
        where: { budgetId_monthKey: { budgetId, monthKey: key } },
        create: { id: randomUUID(), budgetId, monthKey: key },
        update: {},
      });
      row = { ...made, overflowExpense: null, resteIncome: null };
    }

    // Spent past the budget: one paid expense for the month.
    const over = row.overflowExpense;
    if (state.over > 0 && state.overDate) {
      const fields = { name: overflowName(expense.name), amount: state.over, startDate: state.overDate, icon: expense.icon };
      const paid = { amountDue: state.over, amountPaid: state.over, method: state.overMethod };
      if (over) {
        const payment = over.payments[0];
        const changed =
          over.name !== fields.name ||
          over.amount !== fields.amount ||
          over.startDate !== fields.startDate ||
          over.icon !== fields.icon ||
          !payment ||
          payment.amountPaid !== state.over ||
          payment.method !== state.overMethod ||
          payment.monthKey !== key;
        if (changed) {
          await prisma.expense.update({ where: { id: over.id }, data: { ...fields, updatedAt: now } });
          await prisma.payment.deleteMany({ where: { expenseId: over.id, NOT: { monthKey: key } } });
          await prisma.payment.upsert({
            where: { expenseId_monthKey: { expenseId: over.id, monthKey: key } },
            update: { ...paid, paidAt: now },
            create: { id: randomUUID(), expenseId: over.id, monthKey: key, slotIndex: null, ...paid, paidAt: now, createdAt: now },
          });
        }
      } else {
        const id = randomUUID();
        await prisma.$transaction([
          prisma.expense.create({
            data: {
              id,
              ...fields,
              type: "temporary",
              frequency: "one-time",
              endDate: null,
              active: true,
              color: "yellow",
              notes: null,
              creditInitialAmount: null,
              creditPriorPaid: null,
              linkedExpenseId: null,
              categoryId: expense.categoryId,
              createdAt: now,
              updatedAt: now,
            },
          }),
          prisma.payment.create({
            data: { id: randomUUID(), expenseId: id, monthKey: key, slotIndex: null, ...paid, paidAt: now, createdAt: now },
          }),
        ]);
        // Linked only if no one else did meanwhile; else ours goes.
        const { count } = await prisma.budgetMonth.updateMany({ where: { id: row.id, overflowExpenseId: null }, data: { overflowExpenseId: id } });
        if (count === 0) await prisma.expense.deleteMany({ where: { id } });
      }
    } else if (over) {
      await prisma.expense.deleteMany({ where: { id: over.id } });
    }

    // Left at the month's end: an income on the 1st of the next.
    const reste = row.resteIncome;
    if (state.reste > 0) {
      const fields = {
        name: resteName(expense.name),
        amount: state.reste,
        date: resteDate(key),
        method: state.takenMethod ?? "cash",
      };
      if (reste) {
        if (reste.name !== fields.name || reste.amount !== fields.amount || reste.date !== fields.date || reste.method !== fields.method) {
          await prisma.income.update({ where: { id: reste.id }, data: fields });
        }
      } else {
        const id = randomUUID();
        await prisma.income.create({
          data: { id, ...fields, category: RESTE_CATEGORY, notes: null, expenseId: null, createdAt: now },
        });
        const { count } = await prisma.budgetMonth.updateMany({ where: { id: row.id, resteIncomeId: null }, data: { resteIncomeId: id } });
        if (count === 0) await prisma.income.deleteMany({ where: { id } });
      }
    } else if (reste) {
      await prisma.income.deleteMany({ where: { id: reste.id } });
    }
  }
}

/**
 * Whether a budget's "+" expenses and "- Reste" incomes are out of step
 * with its lines and ticks (a month just ended, a tick changed…), from data
 * already loaded: no query when everything matches.
 */
export function budgetOutOfStep(
  budget: BudgetWithExpense,
  data: {
    entries: BudgetEntry[];
    months: BudgetMonth[];
    payments: { expenseId: string; monthKey: string | null; amountPaid: number; method?: PaymentMethod | null }[];
    expenses: Map<string, Expense>;
    incomes: Map<string, { name: string; amount: number; date: string; method: PaymentMethod }>;
    currentMonthKey: string;
  },
): boolean {
  const entries = data.entries.filter((e) => e.budgetId === budget.id);
  const months = data.months.filter((m) => m.budgetId === budget.id);
  const payments = data.payments.filter((p) => p.expenseId === budget.expenseId) as Parameters<typeof budgetMonthState>[2];
  for (const key of budgetMonthKeys(budget.expenseId, entries, payments, months.map((m) => m.monthKey))) {
    const state = budgetMonthState(budget.expense, entries, payments, key, data.currentMonthKey);
    const row = months.find((m) => m.monthKey === key);
    const over = row?.overflowExpenseId ? data.expenses.get(row.overflowExpenseId) : undefined;
    if (state.over > 0) {
      if (!over || over.amount !== state.over || over.name !== overflowName(budget.expense.name)) return true;
      const paid = data.payments.find((p) => p.expenseId === over.id);
      if (!paid || paid.amountPaid !== state.over || paid.monthKey !== key || (paid.method ?? "cash") !== state.overMethod) return true;
    } else if (over) return true;
    const reste = row?.resteIncomeId ? data.incomes.get(row.resteIncomeId) : undefined;
    if (state.reste > 0) {
      if (
        !reste ||
        reste.amount !== state.reste ||
        reste.name !== resteName(budget.expense.name) ||
        reste.date !== resteDate(key) ||
        reste.method !== (state.takenMethod ?? "cash")
      )
        return true;
    } else if (reste) return true;
  }
  return false;
}
