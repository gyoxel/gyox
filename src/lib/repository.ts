import { randomUUID } from "crypto";
import { prisma } from "./prisma";
import type { Category, Daret, DaretWithExpense, Expense, ExpenseInput, Payment, Settings } from "./types";

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

export async function deleteExpense(id: string): Promise<boolean> {
  try {
    await prisma.$transaction([
      // Any expense linked to this one (e.g. Zineb -> Dnya) loses its link
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
  };
}

export interface BackupData {
  version: 1;
  exportedAt: string;
  settings: Settings;
  expenses: Expense[];
  /** Optional so backups made before darets existed still import. */
  darets?: Daret[];
  /** Optional so backups made before categories existed still import. */
  categories?: Category[];
}

export async function exportData(): Promise<BackupData> {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: await getSettings(),
    expenses: await getAllExpenses(),
    darets: (await getAllDarets()).map((d) => ({ id: d.id, expenseId: d.expenseId, members: d.members, turnMonth: d.turnMonth, createdAt: d.createdAt })),
    categories: await getAllCategories(),
  };
}

export async function importData(data: BackupData): Promise<void> {
  // A backup without categories keeps the current ones; any expense pointing
  // at a category that won't exist after import is left uncategorized.
  const categoryIds = new Set(
    (data.categories ?? (await getAllCategories())).map((c) => c.id),
  );
  const now = new Date().toISOString();
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
    prisma.daret.deleteMany({}),
    prisma.daret.createMany({ data: data.darets ?? [] }),
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
): Promise<Payment> {
  const now = new Date().toISOString();
  const row = await prisma.payment.upsert({
    where: { expenseId_monthKey: { expenseId, monthKey: monthKeyValue } },
    update: { amountDue, amountPaid, paidAt: now },
    create: {
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
): Promise<Payment> {
  const now = new Date().toISOString();
  const existingCount = await prisma.payment.count({ where: { expenseId, slotIndex: { not: null } } });
  const row = await prisma.payment.create({
    data: {
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
  return rows.map(({ expense, ...daret }) => ({ ...daret, expense: mapExpense(expense) }));
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
        icon: "🤝",
        createdAt: now,
        updatedAt: now,
      },
    }),
    prisma.daret.create({
      data: { id: randomUUID(), expenseId, members: input.members, turnMonth: input.turnMonth, createdAt: now },
    }),
  ]);
  return { ...daret, expense: mapExpense(expense) };
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

export async function createCategory(input: { name: string; emoji: string }): Promise<Category> {
  const last = await prisma.category.aggregate({ _max: { position: true } });
  const row = await prisma.category.create({
    data: {
      id: randomUUID(),
      name: input.name,
      emoji: input.emoji,
      position: (last._max.position ?? 0) + 1,
      createdAt: new Date().toISOString(),
    },
  });
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
export async function reorderCategories(ids: string[]): Promise<void> {
  await prisma.$transaction(
    ids.map((id, index) => prisma.category.updateMany({ where: { id }, data: { position: index + 1 } })),
  );
}
