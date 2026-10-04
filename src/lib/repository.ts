import { randomUUID } from "crypto";
import { prisma } from "./prisma";
import { DEFAULT_CATEGORIES } from "./default-categories";
import { getAllSavingsMoves } from "./savings-repo";
import { getAllLoanRepayments, getAllLoans } from "./loans-repo";
import type { Category, Daret, DaretWithExpense, Expense, ExpenseInput, Payment, Settings, Goal, GoalDeposit, GoalIdea, DayNote, SalaryAdvance, Income, PaymentMethod, SalaryReceipt, WalletOp, SavingsMove, Loan, LoanRepayment } from "./types";

function mapExpense(row: {
  id: string;
  name: string;
  amount: number;
  type: string;
  frequency: string;
  startDate: string;
  endDate: string | null;
  active: boolean;
  color: string;
  notes: string | null;
  creditInitialAmount: number | null;
  creditPriorPaid: number | null;
  linkedExpenseId: string | null;
  icon: string | null;
  categoryId: string | null;
  createdAt: string;
  updatedAt: string;
}): Expense {
  return {
    id: row.id,
    name: row.name,
    amount: row.amount,
    type: row.type as Expense["type"],
    frequency: row.frequency as Expense["frequency"],
    startDate: row.startDate,
    endDate: row.endDate,
    active: row.active,
    color: row.color as Expense["color"],
    notes: row.notes,
    creditInitialAmount: row.creditInitialAmount,
    creditPriorPaid: row.creditPriorPaid,
    linkedExpenseId: row.linkedExpenseId,
    icon: row.icon,
    categoryId: row.categoryId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function getAllExpenses(): Promise<Expense[]> {
  const rows = await prisma.expense.findMany({ orderBy: { createdAt: "asc" } });
  return rows.map(mapExpense);
}

export async function getExpenseById(id: string): Promise<Expense | null> {
  const row = await prisma.expense.findUnique({ where: { id } });
  return row ? mapExpense(row) : null;
}

export async function createExpense(input: ExpenseInput): Promise<Expense> {
  const id = randomUUID();
  const now = new Date().toISOString();
  const row = await prisma.expense.create({
    data: {
      id,
      name: input.name,
      amount: input.amount,
      type: input.type,
      frequency: input.frequency,
      startDate: input.startDate,
      endDate: input.endDate ?? null,
      active: input.active,
      color: input.color,
      notes: input.notes ?? null,
      creditInitialAmount: input.creditInitialAmount ?? null,
      creditPriorPaid: input.creditPriorPaid ?? null,
      linkedExpenseId: input.linkedExpenseId ?? null,
      icon: input.icon ?? null,
      categoryId: input.categoryId ?? null,
      createdAt: now,
      updatedAt: now,
    },
  });
  return mapExpense(row);
}

export async function updateExpense(
  id: string,
  input: Partial<ExpenseInput>,
): Promise<Expense | null> {
  const existing = await getExpenseById(id);
  if (!existing) return null;
  const merged: Expense = { ...existing, ...input };
  const row = await prisma.expense.update({
    where: { id },
    data: {
      name: merged.name,
      amount: merged.amount,
      type: merged.type,
      frequency: merged.frequency,
      startDate: merged.startDate,
      endDate: merged.endDate ?? null,
      active: merged.active,
      color: merged.color,
      notes: merged.notes ?? null,
      creditInitialAmount: merged.creditInitialAmount ?? null,
      creditPriorPaid: merged.creditPriorPaid ?? null,
      linkedExpenseId: merged.linkedExpenseId ?? null,
      icon: merged.icon ?? null,
      categoryId: merged.categoryId ?? null,
      updatedAt: new Date().toISOString(),
    },
  });
  return mapExpense(row);
}

/**
 * The app pages that go away with these expenses: theirs, and those of what
 * they take along (a credit's income, the daret or goal deposit they back).
 * Read before deleting, so the app doesn't go back to one of them.
 */
export async function pagesGoneWithExpenses(ids: string[]): Promise<string[]> {
  if (ids.length === 0) return [];
  const [incomes, darets, deposits, moves, loans] = await Promise.all([
    prisma.income.findMany({ where: { expenseId: { in: ids } }, select: { id: true } }),
    prisma.daret.findMany({ where: { expenseId: { in: ids } }, select: { id: true } }),
    prisma.goalDeposit.findMany({ where: { expenseId: { in: ids } }, select: { id: true, goalId: true } }),
    prisma.savingsMove.findMany({ where: { expenseId: { in: ids } }, select: { id: true } }),
    prisma.loan.findMany({ where: { expenseId: { in: ids } }, select: { id: true } }),
  ]);
  return [
    ...ids.map((id) => `/expenses/${id}`),
    ...incomes.map((i) => `/incomes/${i.id}`),
    ...darets.map((d) => `/daret/${d.id}`),
    ...deposits.map((d) => `/goals/${d.goalId}/deposits/${d.id}`),
    ...moves.map((m) => `/epargne/${m.id}`),
    ...loans.map((l) => `/prets/${l.id}`),
  ];
}

export async function deleteExpense(id: string): Promise<boolean> {
  try {
    await prisma.$transaction([
      // Any expense linked to this one (e.g. a credit ending with another) loses its link
      // rather than being deleted, so it doesn't silently vanish.
      prisma.expense.updateMany({
        where: { linkedExpenseId: id },
        data: { linkedExpenseId: null },
      }),
      prisma.expense.delete({ where: { id } }),
    ]);
    return true;
  } catch {
    return false;
  }
}

export async function getSettings(): Promise<Settings> {
  const row = await prisma.settings.findUniqueOrThrow({ where: { id: 1 } });
  return {
    salary: row.salary,
    currency: row.currency,
    savingsTarget: row.savingsTarget,
    startMonth: row.startMonth,
    theme: row.theme as Settings["theme"],
    payDay: row.payDay,
    salaryReceivedMonth: row.salaryReceivedMonth,
    salaryMethod: row.salaryMethod === "cash" ? "cash" : "card",
  };
}

export async function updateSettings(input: Partial<Settings>): Promise<Settings> {
  const merged = { ...(await getSettings()), ...input };
  const row = await prisma.settings.update({ where: { id: 1 }, data: merged });
  return {
    salary: row.salary,
    currency: row.currency,
    savingsTarget: row.savingsTarget,
    startMonth: row.startMonth,
    theme: row.theme as Settings["theme"],
    payDay: row.payDay,
    salaryReceivedMonth: row.salaryReceivedMonth,
    salaryMethod: row.salaryMethod === "cash" ? "cash" : "card",
  };
}

export interface BackupData {
  version: 1;
  exportedAt: string;
  settings: Settings;
  expenses: Expense[];
  /** What was paid (ticks, credit installments, with cash / card).
   *  Optional: backups made before it was saved still import. */
  payments?: Payment[];
  /** Optional so backups made before darets existed still import. */
  darets?: Daret[];
  /** Optional so backups made before categories existed still import. */
  categories?: Category[];
  /** Optional so backups made before goals existed still import. */
  goals?: (Omit<Goal, "deposits"> & { deposits?: undefined })[];
  goalDeposits?: GoalDeposit[];
  goalIdeas?: GoalIdea[];
  dayNotes?: DayNote[];
  salaryAdvances?: SalaryAdvance[];
  incomes?: Income[];
  salaryReceipts?: SalaryReceipt[];
  walletOps?: WalletOp[];
  savingsMoves?: SavingsMove[];
  loans?: (Omit<Loan, "repayments"> & { repayments?: undefined })[];
  loanRepayments?: LoanRepayment[];
}

export async function exportData(): Promise<BackupData> {
  const goals = await getAllGoals();
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: await getSettings(),
    expenses: await getAllExpenses(),
    payments: await getAllPayments(),
    darets: (await getAllDarets()).map((d) => ({
      id: d.id,
      expenseId: d.expenseId,
      members: d.members,
      turnMonth: d.turnMonth,
      payoutMethod: d.payoutMethod,
      payoutReceivedAt: d.payoutReceivedAt,
      createdAt: d.createdAt,
    })),
    categories: await getAllCategories(),
    goals: goals.map((g) => ({ ...g, deposits: undefined })),
    goalDeposits: goals.flatMap((g) => g.deposits),
    goalIdeas: await getAllGoalIdeas(),
    dayNotes: await getAllDayNotes(),
    salaryAdvances: await getAllSalaryAdvances(),
    incomes: await getAllIncomes(),
    salaryReceipts: await getAllSalaryReceipts(),
    walletOps: await getAllWalletOps(),
    savingsMoves: await getAllSavingsMoves(),
    loans: (await getAllLoans()).map((loan) => ({ ...loan, repayments: undefined })),
    loanRepayments: await getAllLoanRepayments(),
  };
}

export async function importData(data: BackupData): Promise<void> {
  // A backup without categories keeps the current ones; any expense pointing
  // at a category that won't exist after import is left uncategorized.
  const categoryIds = new Set(
    (data.categories ?? (await getAllCategories())).map((c) => c.id),
  );
  const now = new Date().toISOString();
  const expenseIds = new Set(data.expenses.map((e) => e.id));
  // Incomes kept when the backup has none; savings / loans may point at them.
  const incomeIds = new Set(
    data.incomes ? data.incomes.map((i) => i.id) : (await prisma.income.findMany({ select: { id: true } })).map((i) => i.id),
  );
  const loanIds = new Set((data.loans ?? []).map((l) => l.id));
  const known = (id: string | null | undefined, ids: Set<string>) => (id && ids.has(id) ? id : null);
  await prisma.$transaction([
    prisma.expense.deleteMany({}),
    ...(data.categories
      ? [
          prisma.category.deleteMany({}),
          prisma.category.createMany({
            data: data.categories.map((c) => ({ id: c.id, name: c.name, emoji: c.emoji, position: c.position, createdAt: now })),
          }),
        ]
      : []),
    prisma.expense.createMany({
      data: data.expenses.map((e) => ({
        id: e.id,
        name: e.name,
        amount: e.amount,
        type: e.type,
        frequency: e.frequency,
        startDate: e.startDate,
        endDate: e.endDate ?? null,
        active: e.active,
        color: e.color,
        notes: e.notes ?? null,
        creditInitialAmount: e.creditInitialAmount ?? null,
        creditPriorPaid: e.creditPriorPaid ?? null,
        linkedExpenseId: e.linkedExpenseId ?? null,
        icon: e.icon ?? null,
        categoryId: e.categoryId && categoryIds.has(e.categoryId) ? e.categoryId : null,
        createdAt: e.createdAt ?? new Date().toISOString(),
        updatedAt: e.updatedAt ?? new Date().toISOString(),
      })),
    }),
    // (Deleting the expenses removed their payments.)
    prisma.payment.createMany({
      data: (data.payments ?? [])
        .filter((p) => expenseIds.has(p.expenseId))
        .map((p) => ({
          id: p.id,
          expenseId: p.expenseId,
          monthKey: p.monthKey,
          slotIndex: p.slotIndex,
          amountDue: p.amountDue,
          amountPaid: p.amountPaid,
          paidAt: p.paidAt,
          method: p.method ?? null,
          createdAt: p.createdAt,
        })),
    }),
    prisma.daret.deleteMany({}),
    prisma.daret.createMany({ data: (data.darets ?? []).filter((d) => expenseIds.has(d.expenseId)) }),
    ...(data.goals
      ? [
          prisma.goal.deleteMany({}),
          prisma.goal.createMany({ data: data.goals }),
          prisma.goalDeposit.createMany({
            data: (data.goalDeposits ?? []).map((d) => ({ ...d, expenseId: d.expenseId && expenseIds.has(d.expenseId) ? d.expenseId : null })),
          }),
        ]
      : []),
    ...(data.goalIdeas ? [prisma.goalIdea.deleteMany({}), prisma.goalIdea.createMany({ data: data.goalIdeas })] : []),
    ...(data.dayNotes ? [prisma.dayNote.deleteMany({}), prisma.dayNote.createMany({ data: data.dayNotes })] : []),
    ...(data.salaryAdvances
      ? [prisma.salaryAdvance.deleteMany({}), prisma.salaryAdvance.createMany({ data: data.salaryAdvances })]
      : []),
    ...(data.incomes
      ? [
          prisma.income.deleteMany({}),
          prisma.income.createMany({
            data: data.incomes.map((i) => ({ ...i, expenseId: i.expenseId && expenseIds.has(i.expenseId) ? i.expenseId : null })),
          }),
        ]
      : []),
    ...(data.salaryReceipts
      ? [prisma.salaryReceipt.deleteMany({}), prisma.salaryReceipt.createMany({ data: data.salaryReceipts })]
      : []),
    ...(data.walletOps ? [prisma.walletOp.deleteMany({}), prisma.walletOp.createMany({ data: data.walletOps })] : []),
    ...(data.savingsMoves
      ? [
          prisma.savingsMove.deleteMany({}),
          prisma.savingsMove.createMany({
            data: data.savingsMoves
              .map((m) => ({ ...m, expenseId: known(m.expenseId, expenseIds), incomeId: known(m.incomeId, incomeIds) }))
              // A move whose expense / income isn't there would count with nothing behind it.
              .filter((m) => (m.kind === "in" ? m.expenseId : m.incomeId)),
          }),
        ]
      : []),
    ...(data.loans
      ? [
          prisma.loan.deleteMany({}),
          prisma.loan.createMany({ data: data.loans.map((l) => ({ ...l, expenseId: known(l.expenseId, expenseIds) })) }),
          prisma.loanRepayment.createMany({
            data: (data.loanRepayments ?? [])
              .filter((r) => loanIds.has(r.loanId))
              .map((r) => ({ ...r, incomeId: known(r.incomeId, incomeIds) })),
          }),
        ]
      : []),
    prisma.settings.update({ where: { id: 1 }, data: data.settings }),
  ]);
}

function mapPayment(row: {
  id: string;
  expenseId: string;
  monthKey: string | null;
  slotIndex: number | null;
  amountDue: number;
  amountPaid: number;
  paidAt: string;
  method: string | null;
  createdAt: string;
}): Payment {
  return {
    id: row.id,
    expenseId: row.expenseId,
    monthKey: row.monthKey,
    slotIndex: row.slotIndex,
    amountDue: row.amountDue,
    amountPaid: row.amountPaid,
    paidAt: row.paidAt,
    method: row.method === "cash" || row.method === "card" ? row.method : null,
    createdAt: row.createdAt,
  };
}

export async function getAllPayments(): Promise<Payment[]> {
  const rows = await prisma.payment.findMany();
  return rows.map(mapPayment);
}

export async function getPaymentsForExpense(expenseId: string): Promise<Payment[]> {
  const rows = await prisma.payment.findMany({ where: { expenseId }, orderBy: { createdAt: "asc" } });
  return rows.map(mapPayment);
}

/** Non-credit expenses: one payment row per due month, upserted by month. */
export async function markMonthPaid(
  expenseId: string,
  monthKeyValue: string,
  amountDue: number,
  amountPaid: number,
  method: PaymentMethod | null = null,
): Promise<Payment> {
  const now = new Date().toISOString();
  const row = await prisma.payment.upsert({
    where: { expenseId_monthKey: { expenseId, monthKey: monthKeyValue } },
    update: { amountDue, amountPaid, paidAt: now, method },
    create: {
      method,
      id: randomUUID(),
      expenseId,
      monthKey: monthKeyValue,
      slotIndex: null,
      amountDue,
      amountPaid,
      paidAt: now,
      createdAt: now,
    },
  });
  return mapPayment(row);
}

export async function markMonthUnpaid(expenseId: string, monthKeyValue: string): Promise<boolean> {
  try {
    await prisma.payment.delete({ where: { expenseId_monthKey: { expenseId, monthKey: monthKeyValue } } });
    return true;
  } catch {
    return false;
  }
}

/**
 * Credits: each confirmed installment is a new row, numbered sequentially.
 * Never updates a prior slot — history is append-only, so a later mensualité
 * change can never rewrite what was already paid.
 */
export async function markCreditSlotPaid(
  expenseId: string,
  amountDue: number,
  amountPaid: number,
  recordedInMonthKey: string,
  method: PaymentMethod | null = null,
): Promise<Payment> {
  const now = new Date().toISOString();
  const existingCount = await prisma.payment.count({ where: { expenseId, slotIndex: { not: null } } });
  const row = await prisma.payment.create({
    data: {
      method,
      id: randomUUID(),
      expenseId,
      monthKey: recordedInMonthKey,
      slotIndex: existingCount + 1,
      amountDue,
      amountPaid,
      paidAt: now,
      createdAt: now,
    },
  });
  return mapPayment(row);
}

/** Undo: removes the most recently confirmed installment (highest slot). */
export async function undoLastCreditSlot(expenseId: string): Promise<boolean> {
  const last = await prisma.payment.findFirst({
    where: { expenseId, slotIndex: { not: null } },
    orderBy: { slotIndex: "desc" },
  });
  if (!last) return false;
  await prisma.payment.delete({ where: { id: last.id } });
  return true;
}

// ---------------------------------------------------------------------------
// Darets
// ---------------------------------------------------------------------------

export async function getAllDarets(): Promise<DaretWithExpense[]> {
  const rows = await prisma.daret.findMany({ include: { expense: true }, orderBy: { createdAt: "asc" } });
  return rows.map(({ expense, ...daret }) => ({ ...mapDaret(daret), expense: mapExpense(expense) }));
}

/** Creates the daret together with the temporary expense that carries its
 *  monthly contribution, atomically. */
export async function createDaret(input: {
  name: string;
  amount: number;
  members: number;
  startDate: string;
  endDate: string;
  turnMonth: string;
}): Promise<DaretWithExpense> {
  const now = new Date().toISOString();
  const expenseId = randomUUID();
  const [expense, daret] = await prisma.$transaction([
    prisma.expense.create({
      data: {
        id: expenseId,
        name: input.name,
        amount: input.amount,
        type: "temporary",
        frequency: "monthly",
        startDate: input.startDate,
        endDate: input.endDate,
        active: true,
        color: "yellow",
        notes: null,
        creditInitialAmount: null,
        creditPriorPaid: null,
        linkedExpenseId: null,
        icon: "🤝🏻",
        createdAt: now,
        updatedAt: now,
      },
    }),
    prisma.daret.create({
      data: { id: randomUUID(), expenseId, members: input.members, turnMonth: input.turnMonth, createdAt: now },
    }),
  ]);
  return { ...mapDaret(daret), expense: mapExpense(expense) };
}

const asMethod = (m: string | null): PaymentMethod | null => (m === "cash" || m === "card" ? m : null);

function mapDaret<T extends { payoutMethod: string | null }>(row: T): Omit<T, "payoutMethod"> & { payoutMethod: PaymentMethod | null } {
  return { ...row, payoutMethod: asMethod(row.payoutMethod) };
}

/** Confirms the daret's payout as collected in cash or card (now), or
 *  undoes it (null). */
export async function setDaretPayout(id: string, method: PaymentMethod | null): Promise<boolean> {
  const { count } = await prisma.daret.updateMany({
    where: { id },
    data: { payoutMethod: method, payoutReceivedAt: method ? new Date().toISOString() : null },
  });
  return count > 0;
}

/** Edits a daret and its backing expense together (contributions already
 *  ticked stay, by month). */
export async function updateDaret(
  id: string,
  input: { name: string; amount: number; members: number; startDate: string; endDate: string; turnMonth: string },
): Promise<DaretWithExpense | null> {
  const daret = await prisma.daret.findUnique({ where: { id } });
  if (!daret) return null;
  const [expense, updated] = await prisma.$transaction([
    prisma.expense.update({
      where: { id: daret.expenseId },
      data: {
        name: input.name,
        amount: input.amount,
        startDate: input.startDate,
        endDate: input.endDate,
        updatedAt: new Date().toISOString(),
      },
    }),
    prisma.daret.update({ where: { id }, data: { members: input.members, turnMonth: input.turnMonth } }),
  ]);
  return { ...mapDaret(updated), expense: mapExpense(expense) };
}

export async function getDaretById(id: string): Promise<DaretWithExpense | null> {
  const row = await prisma.daret.findUnique({ where: { id }, include: { expense: true } });
  if (!row) return null;
  const { expense, ...daret } = row;
  return { ...mapDaret(daret), expense: mapExpense(expense) };
}

/** The daret an expense backs (its monthly contribution), if any. */
export async function getDaretOfExpense(expenseId: string): Promise<DaretWithExpense | null> {
  const row = await prisma.daret.findFirst({ where: { expenseId }, include: { expense: true } });
  if (!row) return null;
  const { expense, ...daret } = row;
  return { ...mapDaret(daret), expense: mapExpense(expense) };
}

/** Deleting the backing expense cascades to the daret and its payments. */
export async function deleteDaret(id: string): Promise<boolean> {
  const daret = await prisma.daret.findUnique({ where: { id } });
  if (!daret) return false;
  return deleteExpense(daret.expenseId);
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

function mapCategory(row: { id: string; name: string; emoji: string; position: number }): Category {
  return { id: row.id, name: row.name, emoji: row.emoji, position: row.position };
}

export async function getAllCategories(): Promise<Category[]> {
  const rows = await prisma.category.findMany({ orderBy: [{ position: "asc" }, { createdAt: "asc" }] });
  return rows.map(mapCategory);
}

/** Categories that stay at the very end of the list, in this order (user
 *  request: "Santé" then "Autres", right before "+ Ajouter"). */
const PINNED_LAST = ["Santé", "Autres"];

/** Appends a category — before the pinned tail (Santé, Autres) when the list
 *  currently ends with it, so those two always stay last. */
export async function createCategory(input: { name: string; emoji: string }): Promise<Category> {
  const all = await prisma.category.findMany({ orderBy: [{ position: "asc" }, { createdAt: "asc" }] });
  let tailStart = all.length;
  while (tailStart > 0 && PINNED_LAST.includes(all[tailStart - 1].name)) tailStart--;
  const tail = all.slice(tailStart);
  const position = tail.length > 0 ? tail[0].position : (all.at(-1)?.position ?? 0) + 1;

  const [row] = await prisma.$transaction([
    prisma.category.create({
      data: { id: randomUUID(), name: input.name, emoji: input.emoji, position, createdAt: new Date().toISOString() },
    }),
    ...tail.map((c, i) => prisma.category.update({ where: { id: c.id }, data: { position: position + 1 + i } })),
  ]);
  return mapCategory(row);
}

export async function updateCategory(id: string, input: { name?: string; emoji?: string }): Promise<Category | null> {
  try {
    return mapCategory(await prisma.category.update({ where: { id }, data: input }));
  } catch {
    return null;
  }
}

/** Expenses in this category are kept, just uncategorized (FK SET NULL). */
export async function deleteCategory(id: string): Promise<boolean> {
  try {
    await prisma.category.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

/** Persists a new order: `ids` from first to last. Unknown ids are ignored. */
/**
 * Back to the original categories: each one gets its default name, emoji
 * and place back (found by id, else by name; recreated if it was deleted),
 * and every other category is removed — its expenses stay, uncategorized.
 */
export async function resetCategories(): Promise<Category[]> {
  const all = await prisma.category.findMany();
  const used = new Set<string>();
  const now = new Date().toISOString();
  const ops = DEFAULT_CATEGORIES.map((d, i) => {
    const match =
      all.find((c) => c.id === d.id && !used.has(c.id)) ??
      all.find((c) => c.name.trim().toLowerCase() === d.name.toLowerCase() && !used.has(c.id));
    const data = { name: d.name, emoji: d.emoji, position: i + 1 };
    if (match) {
      used.add(match.id);
      return prisma.category.update({ where: { id: match.id }, data });
    }
    const id = all.some((c) => c.id === d.id) ? randomUUID() : d.id;
    used.add(id);
    return prisma.category.create({ data: { id, ...data, createdAt: now } });
  });
  await prisma.$transaction([
    prisma.category.deleteMany({ where: { id: { notIn: [...all.map((c) => c.id).filter((id) => used.has(id))] } } }),
    ...ops,
  ]);
  return getAllCategories();
}

export async function reorderCategories(ids: string[]): Promise<void> {
  await prisma.$transaction(
    ids.map((id, index) => prisma.category.updateMany({ where: { id }, data: { position: index + 1 } })),
  );
}

// ---------------------------------------------------------------------------
// Goals (objectifs)
// ---------------------------------------------------------------------------

export type GoalInput = Omit<Goal, "id" | "position" | "createdAt" | "deposits">;

type GoalRow = Omit<Goal, "deposits"> & { deposits?: (Omit<GoalDeposit, "method"> & { method: string | null })[] };

const mapDeposit = (d: Omit<GoalDeposit, "method"> & { method: string | null }): GoalDeposit => ({
  ...d,
  method: d.method === "cash" || d.method === "card" ? d.method : null,
});

function mapGoal(row: GoalRow): Goal {
  const deposits = (row.deposits ?? []).map(mapDeposit).sort(
    (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
  );
  return { ...row, daretIds: row.daretIds ?? [], deposits };
}

export async function getAllGoals(): Promise<Goal[]> {
  const rows = await prisma.goal.findMany({
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    include: { deposits: true },
  });
  return rows.map(mapGoal);
}

export async function getGoalById(id: string): Promise<Goal | null> {
  const row = await prisma.goal.findUnique({ where: { id }, include: { deposits: true } });
  return row ? mapGoal(row) : null;
}

/** A daret can feed only one goal: attaching it here detaches it elsewhere. */
async function detachDarets(daretIds: string[], exceptGoalId?: string) {
  if (daretIds.length === 0) return;
  const others = await prisma.goal.findMany({
    where: { daretIds: { hasSome: daretIds }, NOT: exceptGoalId ? { id: exceptGoalId } : undefined },
  });
  for (const g of others) {
    await prisma.goal.update({ where: { id: g.id }, data: { daretIds: g.daretIds.filter((d) => !daretIds.includes(d)) } });
  }
}

export async function createGoal(input: GoalInput): Promise<Goal> {
  await detachDarets(input.daretIds);
  const last = await prisma.goal.aggregate({ _max: { position: true } });
  const row = await prisma.goal.create({
    data: { ...input, id: randomUUID(), position: (last._max.position ?? 0) + 1, createdAt: new Date().toISOString() },
  });
  return mapGoal(row);
}

export async function updateGoal(id: string, input: Partial<GoalInput>): Promise<Goal | null> {
  try {
    if (input.daretIds) await detachDarets(input.daretIds, id);
    return mapGoal(await prisma.goal.update({ where: { id }, data: input, include: { deposits: true } }));
  } catch {
    return null;
  }
}

/** Removes a goal with its deposits — and their expenses in Dépenses. */
export async function deleteGoal(id: string): Promise<boolean> {
  try {
    const deposits = await prisma.goalDeposit.findMany({ where: { goalId: id, expenseId: { not: null } } });
    const expenseIds = deposits.map((d) => d.expenseId!);
    if (expenseIds.length > 0) await prisma.expense.deleteMany({ where: { id: { in: expenseIds } } });
    await prisma.goal.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

export async function addGoalDeposit(
  goalId: string,
  input: { name: string; amount: number; date: string; method: PaymentMethod | null },
): Promise<GoalDeposit> {
  const now = new Date().toISOString();
  const goal = await prisma.goal.findUniqueOrThrow({ where: { id: goalId } });
  if (!input.method) {
    return mapDeposit(await prisma.goalDeposit.create({ data: { id: randomUUID(), goalId, ...input, createdAt: now } }));
  }
  // Taken from cash / the card: it also shows in Dépenses as a paid one-time
  // expense (that payment is what comes off the Solde).
  const expenseId = randomUUID();
  const [, , deposit] = await prisma.$transaction([
    prisma.expense.create({
      data: {
        id: expenseId,
        name: `Versement · ${goal.name}`,
        amount: input.amount,
        type: "temporary",
        frequency: "one-time",
        startDate: input.date,
        endDate: null,
        active: true,
        color: "yellow",
        notes: input.name && input.name !== "Versement" ? input.name : null,
        creditInitialAmount: null,
        creditPriorPaid: null,
        linkedExpenseId: null,
        icon: goal.emoji,
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
    prisma.goalDeposit.create({ data: { id: randomUUID(), goalId, ...input, expenseId, createdAt: now } }),
  ]);
  return mapDeposit(deposit);
}

/** The goal deposit an expense stands for, if any. */
export async function getDepositOfExpense(
  expenseId: string,
): Promise<{ deposit: GoalDeposit; goal: { id: string; name: string; emoji: string } } | null> {
  const row = await prisma.goalDeposit.findFirst({ where: { expenseId }, include: { goal: true } });
  if (!row) return null;
  const { goal, ...deposit } = row;
  return { deposit: mapDeposit(deposit), goal: { id: goal.id, name: goal.name, emoji: goal.emoji } };
}

export async function getGoalDeposit(goalId: string, depositId: string): Promise<GoalDeposit | null> {
  const row = await prisma.goalDeposit.findFirst({ where: { id: depositId, goalId } });
  return row ? mapDeposit(row) : null;
}

/**
 * Edits a deposit; for a newer one, its expense in Dépenses follows (amount,
 * note) and so does its payment: paid (cash / card) or not paid.
 */
export async function updateGoalDeposit(
  goalId: string,
  depositId: string,
  input: { name: string; amount: number; method: PaymentMethod | null; paid: boolean },
): Promise<GoalDeposit | null> {
  const deposit = await prisma.goalDeposit.findFirst({ where: { id: depositId, goalId } });
  if (!deposit) return null;
  const now = new Date().toISOString();
  const name = input.name || "Versement";
  if (deposit.expenseId) {
    const expenseId = deposit.expenseId;
    const monthKeyValue = deposit.date.slice(0, 7);
    const expenseUpdate = prisma.expense.update({
      where: { id: expenseId },
      data: { amount: input.amount, notes: name !== "Versement" ? name : null, updatedAt: now },
    });
    if (input.paid && input.method) {
      await prisma.$transaction([
        expenseUpdate,
        prisma.payment.upsert({
          where: { expenseId_monthKey: { expenseId, monthKey: monthKeyValue } },
          update: { amountDue: input.amount, amountPaid: input.amount, method: input.method },
          create: {
            id: randomUUID(),
            expenseId,
            monthKey: monthKeyValue,
            slotIndex: null,
            amountDue: input.amount,
            amountPaid: input.amount,
            paidAt: now,
            method: input.method,
            createdAt: now,
          },
        }),
      ]);
    } else {
      await prisma.$transaction([expenseUpdate, prisma.payment.deleteMany({ where: { expenseId } })]);
    }
  }
  return mapDeposit(
    await prisma.goalDeposit.update({
      where: { id: depositId },
      data: { name, amount: input.amount, method: input.method },
    }),
  );
}

/** Removes a deposit — with its expense in Dépenses, when it has one. */
export async function deleteGoalDeposit(goalId: string, depositId: string): Promise<boolean> {
  const deposit = await prisma.goalDeposit.findFirst({ where: { id: depositId, goalId } });
  if (!deposit) return false;
  if (deposit.expenseId) await prisma.expense.deleteMany({ where: { id: deposit.expenseId } });
  await prisma.goalDeposit.deleteMany({ where: { id: depositId } });
  return true;
}

export async function getAllGoalIdeas(): Promise<GoalIdea[]> {
  return prisma.goalIdea.findMany({ orderBy: { createdAt: "asc" } });
}

export async function createGoalIdea(input: { emoji: string; name: string }): Promise<GoalIdea> {
  return prisma.goalIdea.create({ data: { id: randomUUID(), ...input, createdAt: new Date().toISOString() } });
}

export async function deleteGoalIdea(id: string): Promise<boolean> {
  const { count } = await prisma.goalIdea.deleteMany({ where: { id } });
  return count > 0;
}

export async function getAllDayNotes(): Promise<DayNote[]> {
  return prisma.dayNote.findMany({ orderBy: { date: "asc" } });
}

/** Saves the note of a day; an empty text removes it. */
export async function setDayNote(date: string, text: string): Promise<DayNote | null> {
  const clean = text.trim();
  if (!clean) {
    await prisma.dayNote.deleteMany({ where: { date } });
    return null;
  }
  const updatedAt = new Date().toISOString();
  return prisma.dayNote.upsert({ where: { date }, create: { date, text: clean, updatedAt }, update: { text: clean, updatedAt } });
}

const mapAdvance = (row: Omit<SalaryAdvance, "method"> & { method: string }): SalaryAdvance => ({
  ...row,
  method: row.method === "cash" ? "cash" : "card",
});

export async function getAllSalaryAdvances(): Promise<SalaryAdvance[]> {
  return (await prisma.salaryAdvance.findMany({ orderBy: { date: "asc" } })).map(mapAdvance);
}

export async function createSalaryAdvance(input: {
  amount: number;
  date: string;
  period: string;
  method: PaymentMethod;
}): Promise<SalaryAdvance> {
  return mapAdvance(await prisma.salaryAdvance.create({ data: { id: randomUUID(), ...input, createdAt: new Date().toISOString() } }));
}

// ---------------------------------------------------------------------------
// Solde: salaries received, transfers and adjustments
// ---------------------------------------------------------------------------

export async function getAllSalaryReceipts(): Promise<SalaryReceipt[]> {
  const rows = await prisma.salaryReceipt.findMany({ orderBy: { createdAt: "asc" } });
  return rows.map((r) => ({ ...r, method: r.method === "cash" ? "cash" : "card" }));
}

/**
 * Keeps the salary receipts in line with "salaire reçu": confirming a pay
 * day records what came in (salary minus the advances taken on it) and
 * where; undoing it removes the receipts after the new last received one.
 */
export async function syncSalaryReceipts(previous: string | null, next: string | null, settings: Settings): Promise<void> {
  if (next === previous) return;
  if (next && (!previous || next > previous)) {
    const advanced = (await prisma.salaryAdvance.findMany({ where: { period: next } })).reduce((s, a) => s + a.amount, 0);
    const amount = Math.max(0, Math.round((settings.salary - advanced) * 100) / 100);
    await prisma.salaryReceipt.upsert({
      where: { period: next },
      update: {},
      create: { id: randomUUID(), period: next, amount, method: settings.salaryMethod, createdAt: new Date().toISOString() },
    });
  } else {
    await prisma.salaryReceipt.deleteMany({ where: next ? { period: { gt: next } } : {} });
  }
}

export async function getAllWalletOps(): Promise<WalletOp[]> {
  const rows = await prisma.walletOp.findMany({ orderBy: { createdAt: "asc" } });
  return rows.map((r) => ({
    ...r,
    kind: r.kind === "adjust" ? "adjust" : "transfer",
    fromAccount: asMethod(r.fromAccount),
    toAccount: asMethod(r.toAccount),
  }));
}

export async function createWalletOp(input: Omit<WalletOp, "id" | "createdAt">): Promise<WalletOp> {
  const row = await prisma.walletOp.create({ data: { id: randomUUID(), ...input, createdAt: new Date().toISOString() } });
  return { ...input, id: row.id, createdAt: row.createdAt };
}

export async function deleteWalletOp(id: string): Promise<boolean> {
  const { count } = await prisma.walletOp.deleteMany({ where: { id } });
  return count > 0;
}

export async function deleteSalaryAdvance(id: string): Promise<boolean> {
  const { count } = await prisma.salaryAdvance.deleteMany({ where: { id } });
  return count > 0;
}

export type IncomeInput = Omit<Income, "id" | "createdAt">;

const mapIncome = (row: Omit<Income, "method"> & { method: string }): Income => ({
  ...row,
  method: row.method === "card" ? "card" : "cash",
});

export async function getAllIncomes(): Promise<Income[]> {
  return (await prisma.income.findMany({ orderBy: [{ date: "desc" }, { createdAt: "desc" }] })).map(mapIncome);
}

export async function getIncomeById(id: string): Promise<Income | null> {
  const row = await prisma.income.findUnique({ where: { id } });
  return row ? mapIncome(row) : null;
}

export async function createIncome(input: IncomeInput): Promise<Income> {
  return mapIncome(await prisma.income.create({ data: { id: randomUUID(), ...input, createdAt: new Date().toISOString() } }));
}

export async function updateIncome(id: string, input: Partial<IncomeInput>): Promise<Income | null> {
  const { count } = await prisma.income.updateMany({ where: { id }, data: input });
  return count > 0 ? getIncomeById(id) : null;
}

export async function deleteIncome(id: string): Promise<boolean> {
  const { count } = await prisma.income.deleteMany({ where: { id } });
  return count > 0;
}

/** Changes how this month's payment of an expense was made (cash / card). */
export async function setPaymentMethod(expenseId: string, monthKeyValue: string, method: PaymentMethod): Promise<boolean> {
  const { count } = await prisma.payment.updateMany({ where: { expenseId, monthKey: monthKeyValue }, data: { method } });
  return count > 0;
}
