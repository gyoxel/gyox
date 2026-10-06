// Épargne in the database. Money put aside is also a paid one-time expense
// (Dépenses) and money taken back an income (Revenus): those are what move
// cash / the card in the Solde, and they're deleted with their move. Savings
// held already ("existing") are neither: they only add to the savings.
import { randomUUID } from "crypto";
import { prisma } from "./prisma";
import type { PaymentMethod, SavingsMove } from "./types";

export function mapMove(row: {
  id: string;
  kind: string;
  amount: number;
  method: string;
  note: string | null;
  date: string;
  expenseId: string | null;
  incomeId: string | null;
  createdAt: string;
}): SavingsMove {
  return {
    ...row,
    kind: row.kind === "out" ? "out" : row.kind === "existing" ? "existing" : "in",
    method: row.method === "card" ? "card" : "cash",
  };
}

export interface SavingsInput {
  kind: "in" | "out" | "existing";
  amount: number;
  method: PaymentMethod;
  note: string | null;
  date: string;
}

const expenseName = (note: string | null) => (note ? `Épargne · ${note}` : "Épargne");
const incomeName = (note: string | null) => (note ? `Retrait d'épargne · ${note}` : "Retrait d'épargne");

export async function getAllSavingsMoves(): Promise<SavingsMove[]> {
  const rows = await prisma.savingsMove.findMany({ orderBy: [{ date: "desc" }, { createdAt: "desc" }] });
  return rows.map(mapMove);
}

export async function getSavingsMove(id: string): Promise<SavingsMove | null> {
  const row = await prisma.savingsMove.findUnique({ where: { id } });
  return row ? mapMove(row) : null;
}

export async function getSavingsMoveOfExpense(expenseId: string): Promise<SavingsMove | null> {
  const row = await prisma.savingsMove.findUnique({ where: { expenseId } });
  return row ? mapMove(row) : null;
}

export async function getSavingsMoveOfIncome(incomeId: string): Promise<SavingsMove | null> {
  const row = await prisma.savingsMove.findUnique({ where: { incomeId } });
  return row ? mapMove(row) : null;
}

export async function createSavingsMove(input: SavingsInput): Promise<SavingsMove> {
  const now = new Date().toISOString();
  const id = randomUUID();
  if (input.kind === "existing") {
    // Already saved before: only adds to the savings, the Solde doesn't move.
    const move = await prisma.savingsMove.create({ data: { id, ...input, expenseId: null, incomeId: null, createdAt: now } });
    return mapMove(move);
  }
  if (input.kind === "in") {
    const expenseId = randomUUID();
    const [, , move] = await prisma.$transaction([
      prisma.expense.create({
        data: {
          id: expenseId,
          name: expenseName(input.note),
          amount: input.amount,
          type: "temporary",
          frequency: "one-time",
          startDate: input.date,
          endDate: null,
          active: true,
          color: "yellow",
          notes: input.note,
          creditInitialAmount: null,
          creditPriorPaid: null,
          linkedExpenseId: null,
          icon: "🐷",
          categoryId: null,
          createdAt: now,
          updatedAt: now,
        },
      }),
      prisma.payment.create({
        data: {
          id: randomUUID(),
          expenseId,
          monthKey: input.date.slice(0, 7),
          slotIndex: null,
          amountDue: input.amount,
          amountPaid: input.amount,
          paidAt: now,
          method: input.method,
          createdAt: now,
        },
      }),
      prisma.savingsMove.create({ data: { id, ...input, expenseId, incomeId: null, createdAt: now } }),
    ]);
    return mapMove(move);
  }
  const incomeId = randomUUID();
  const [, move] = await prisma.$transaction([
    prisma.income.create({
      data: {
        id: incomeId,
        name: incomeName(input.note),
        amount: input.amount,
        date: input.date,
        category: "epargne",
        method: input.method,
        notes: input.note,
        expenseId: null,
        createdAt: now,
      },
    }),
    prisma.savingsMove.create({ data: { id, ...input, expenseId: null, incomeId, createdAt: now } }),
  ]);
  return mapMove(move);
}

/** Edits a move; its expense (and payment) or income follows. */
export async function updateSavingsMove(
  id: string,
  input: Omit<SavingsInput, "kind">,
): Promise<SavingsMove | null> {
  const move = await prisma.savingsMove.findUnique({ where: { id } });
  if (!move) return null;
  const now = new Date().toISOString();
  if (move.expenseId) {
    await prisma.$transaction([
      prisma.expense.update({
        where: { id: move.expenseId },
        data: { name: expenseName(input.note), amount: input.amount, notes: input.note, startDate: input.date, updatedAt: now },
      }),
      prisma.payment.updateMany({
        where: { expenseId: move.expenseId },
        data: { amountDue: input.amount, amountPaid: input.amount, method: input.method, monthKey: input.date.slice(0, 7) },
      }),
    ]);
  }
  if (move.incomeId) {
    await prisma.income.update({
      where: { id: move.incomeId },
      data: { name: incomeName(input.note), amount: input.amount, method: input.method, notes: input.note, date: input.date },
    });
  }
  return mapMove(await prisma.savingsMove.update({ where: { id }, data: input }));
}

/** Removes a move with its expense / income; gives the app pages gone with it. */
export async function deleteSavingsMove(id: string): Promise<string[] | null> {
  const move = await prisma.savingsMove.findUnique({ where: { id } });
  if (!move) return null;
  const gone = [`/epargne/${id}`];
  if (move.expenseId) {
    gone.push(`/expenses/${move.expenseId}`);
    await prisma.expense.deleteMany({ where: { id: move.expenseId } });
  }
  if (move.incomeId) {
    gone.push(`/incomes/${move.incomeId}`);
    await prisma.income.deleteMany({ where: { id: move.incomeId } });
  }
  await prisma.savingsMove.deleteMany({ where: { id } });
  return gone;
}
