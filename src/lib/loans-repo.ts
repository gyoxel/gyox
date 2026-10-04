// Prêts in the database. The money lent is a paid one-time expense
// (Dépenses) and each installment received an income (Revenus): those are
// what move cash / the card in the Solde, and they go with the loan.
import { randomUUID } from "crypto";
import { prisma } from "./prisma";
import { todayDateStr } from "./date";
import { loanSlots, loanToRepay } from "./loans";
import type { Loan, LoanRepayment, PaymentMethod } from "./types";

type RepaymentRow = {
  id: string;
  loanId: string;
  slot: number;
  amount: number;
  method: string;
  date: string;
  incomeId: string | null;
  createdAt: string;
};

function mapRepayment(row: RepaymentRow): LoanRepayment {
  return { ...row, method: row.method === "card" ? "card" : "cash" };
}

function mapLoan(row: {
  id: string;
  name: string;
  amount: number;
  priorRepaid: number | null;
  date: string;
  method: string | null;
  monthly: number;
  months: number;
  startMonth: string;
  note: string | null;
  expenseId: string | null;
  createdAt: string;
  repayments: RepaymentRow[];
}): Loan {
  return {
    ...row,
    method: row.method === "cash" || row.method === "card" ? row.method : null,
    repayments: row.repayments.map(mapRepayment).sort((a, b) => a.slot - b.slot),
  };
}

export interface LoanInput {
  name: string;
  amount: number;
  priorRepaid: number | null;
  date: string;
  /** Taken from cash / the card (null: it didn't leave the Solde). */
  method: PaymentMethod | null;
  monthly: number;
  months: number;
  startMonth: string;
  note: string | null;
}

const expenseName = (name: string) => `Prêt · ${name}`;

function expenseData(id: string, input: LoanInput, now: string) {
  return {
    id,
    name: expenseName(input.name),
    amount: loanToRepay(input),
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
    icon: "🤝",
    categoryId: null,
    createdAt: now,
    updatedAt: now,
  };
}

function paymentData(expenseId: string, input: LoanInput, now: string) {
  return {
    id: randomUUID(),
    expenseId,
    monthKey: input.date.slice(0, 7),
    slotIndex: null,
    amountDue: loanToRepay(input),
    amountPaid: loanToRepay(input),
    paidAt: now,
    method: input.method,
    createdAt: now,
  };
}

const include = { repayments: true } as const;

export async function getAllLoans(): Promise<Loan[]> {
  const rows = await prisma.loan.findMany({ include, orderBy: [{ date: "desc" }, { createdAt: "desc" }] });
  return rows.map(mapLoan);
}

export async function getLoan(id: string): Promise<Loan | null> {
  const row = await prisma.loan.findUnique({ where: { id }, include });
  return row ? mapLoan(row) : null;
}

export async function getLoanOfExpense(expenseId: string): Promise<Loan | null> {
  const row = await prisma.loan.findUnique({ where: { expenseId }, include });
  return row ? mapLoan(row) : null;
}

/** The loan an income is a repayment of. */
export async function getLoanOfIncome(incomeId: string): Promise<Loan | null> {
  const repayment = await prisma.loanRepayment.findUnique({ where: { incomeId } });
  return repayment ? getLoan(repayment.loanId) : null;
}

export async function createLoan(input: LoanInput): Promise<Loan> {
  const now = new Date().toISOString();
  const id = randomUUID();
  if (!input.method) {
    await prisma.loan.create({ data: { id, ...input, expenseId: null, createdAt: now } });
  } else {
    const expenseId = randomUUID();
    await prisma.$transaction([
      prisma.expense.create({ data: expenseData(expenseId, input, now) }),
      prisma.payment.create({ data: paymentData(expenseId, input, now) }),
      prisma.loan.create({ data: { id, ...input, expenseId, createdAt: now } }),
    ]);
  }
  return (await getLoan(id))!;
}

/** Edits a loan; its expense in Dépenses follows (or goes / comes). */
export async function updateLoan(id: string, input: LoanInput): Promise<Loan | null> {
  const loan = await prisma.loan.findUnique({ where: { id } });
  if (!loan) return null;
  const now = new Date().toISOString();
  if (input.method && loan.expenseId) {
    await prisma.$transaction([
      prisma.expense.update({
        where: { id: loan.expenseId },
        data: { name: expenseName(input.name), amount: loanToRepay(input), notes: input.note, startDate: input.date, updatedAt: now },
      }),
      prisma.payment.updateMany({
        where: { expenseId: loan.expenseId },
        data: { amountDue: loanToRepay(input), amountPaid: loanToRepay(input), method: input.method, monthKey: input.date.slice(0, 7) },
      }),
      prisma.loan.update({ where: { id }, data: input }),
    ]);
  } else if (input.method) {
    const expenseId = randomUUID();
    await prisma.$transaction([
      prisma.expense.create({ data: expenseData(expenseId, input, now) }),
      prisma.payment.create({ data: paymentData(expenseId, input, now) }),
      prisma.loan.update({ where: { id }, data: { ...input, expenseId } }),
    ]);
  } else {
    // No longer taken from the Solde: unlink first (deleting the expense
    // would take the loan with it).
    await prisma.loan.update({ where: { id }, data: { ...input, expenseId: null } });
    if (loan.expenseId) await prisma.expense.deleteMany({ where: { id: loan.expenseId } });
  }
  return getLoan(id);
}

/** Removes a loan with its expense and repayments; gives the pages gone with it. */
export async function deleteLoan(id: string): Promise<string[] | null> {
  const loan = await getLoan(id);
  if (!loan) return null;
  const incomeIds = loan.repayments.flatMap((r) => (r.incomeId ? [r.incomeId] : []));
  const gone = [`/prets/${id}`, ...incomeIds.map((i) => `/incomes/${i}`)];
  if (loan.expenseId) gone.push(`/expenses/${loan.expenseId}`);
  await prisma.$transaction([
    prisma.income.deleteMany({ where: { id: { in: incomeIds } } }),
    prisma.loan.delete({ where: { id } }),
    ...(loan.expenseId ? [prisma.expense.deleteMany({ where: { id: loan.expenseId } })] : []),
  ]);
  return gone;
}

/** Installment `slot` received in cash / on the card: an income in Revenus. */
export async function receiveRepayment(loanId: string, slot: number, method: PaymentMethod): Promise<LoanRepayment | null> {
  const loan = await getLoan(loanId);
  const target = loan && loanSlots(loan).find((s) => s.slot === slot);
  if (!loan || !target || target.repayment) return null;
  const now = new Date().toISOString();
  const date = todayDateStr();
  const incomeId = randomUUID();
  const [, row] = await prisma.$transaction([
    prisma.income.create({
      data: {
        id: incomeId,
        name: `Remboursement · ${loan.name}`,
        amount: target.amount,
        date,
        category: "pret",
        method,
        notes: null,
        expenseId: null,
        createdAt: now,
      },
    }),
    prisma.loanRepayment.create({
      data: { id: randomUUID(), loanId, slot, amount: target.amount, method, date, incomeId, createdAt: now },
    }),
  ]);
  return mapRepayment(row);
}

/** Undoes a received installment (its income goes with it). */
export async function cancelRepayment(loanId: string, slot: number): Promise<boolean> {
  const repayment = await prisma.loanRepayment.findUnique({ where: { loanId_slot: { loanId, slot } } });
  if (!repayment) return false;
  if (repayment.incomeId) await prisma.income.deleteMany({ where: { id: repayment.incomeId } });
  await prisma.loanRepayment.deleteMany({ where: { id: repayment.id } });
  return true;
}

export async function getAllLoanRepayments(): Promise<LoanRepayment[]> {
  return (await prisma.loanRepayment.findMany()).map(mapRepayment);
}
