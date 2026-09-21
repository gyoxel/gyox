import { randomUUID } from "crypto";
import { db } from "./db";
import type { Expense, ExpenseInput, Settings } from "./types";

interface ExpenseRow {
  id: string;
  name: string;
  amount: number;
  type: string;
  frequency: string;
  startDate: string;
  endDate: string | null;
  active: number;
  color: string;
  notes: string | null;
  creditInitialAmount: number | null;
  linkedExpenseId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SettingsRow {
  salary: number;
  currency: string;
  savingsTarget: number;
  startMonth: string;
  theme: string;
}

function mapExpense(row: ExpenseRow): Expense {
  return {
    id: row.id,
    name: row.name,
    amount: row.amount,
    type: row.type as Expense["type"],
    frequency: row.frequency as Expense["frequency"],
    startDate: row.startDate,
    endDate: row.endDate,
    active: !!row.active,
    color: row.color as Expense["color"],
    notes: row.notes,
    creditInitialAmount: row.creditInitialAmount,
    linkedExpenseId: row.linkedExpenseId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function getAllExpenses(): Expense[] {
  const rows = db.prepare("SELECT * FROM expenses ORDER BY createdAt ASC").all() as ExpenseRow[];
  return rows.map(mapExpense);
}

export function getExpenseById(id: string): Expense | null {
  const row = db.prepare("SELECT * FROM expenses WHERE id = ?").get(id) as ExpenseRow | undefined;
  return row ? mapExpense(row) : null;
}

export function createExpense(input: ExpenseInput): Expense {
  const id = randomUUID();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO expenses
      (id, name, amount, type, frequency, startDate, endDate, active, color, notes, creditInitialAmount, linkedExpenseId, createdAt, updatedAt)
     VALUES
      (@id, @name, @amount, @type, @frequency, @startDate, @endDate, @active, @color, @notes, @creditInitialAmount, @linkedExpenseId, @createdAt, @updatedAt)`,
  ).run({
    id,
    name: input.name,
    amount: input.amount,
    type: input.type,
    frequency: input.frequency,
    startDate: input.startDate,
    endDate: input.endDate ?? null,
    active: input.active ? 1 : 0,
    color: input.color,
    notes: input.notes ?? null,
    creditInitialAmount: input.creditInitialAmount ?? null,
    linkedExpenseId: input.linkedExpenseId ?? null,
    createdAt: now,
    updatedAt: now,
  });
  return getExpenseById(id)!;
}

export function updateExpense(id: string, input: Partial<ExpenseInput>): Expense | null {
  const existing = getExpenseById(id);
  if (!existing) return null;
  const merged: Expense = { ...existing, ...input };
  db.prepare(
    `UPDATE expenses SET
      name=@name, amount=@amount, type=@type, frequency=@frequency, startDate=@startDate,
      endDate=@endDate, active=@active, color=@color, notes=@notes,
      creditInitialAmount=@creditInitialAmount, linkedExpenseId=@linkedExpenseId, updatedAt=@updatedAt
     WHERE id=@id`,
  ).run({
    id,
    name: merged.name,
    amount: merged.amount,
    type: merged.type,
    frequency: merged.frequency,
    startDate: merged.startDate,
    endDate: merged.endDate ?? null,
    active: merged.active ? 1 : 0,
    color: merged.color,
    notes: merged.notes ?? null,
    creditInitialAmount: merged.creditInitialAmount ?? null,
    linkedExpenseId: merged.linkedExpenseId ?? null,
    updatedAt: new Date().toISOString(),
  });
  return getExpenseById(id);
}

export function deleteExpense(id: string): boolean {
  // Any expense linked to this one (e.g. Zineb -> Dnya) loses its link
  // rather than being deleted, so it doesn't silently vanish.
  db.prepare("UPDATE expenses SET linkedExpenseId = NULL WHERE linkedExpenseId = ?").run(id);
  const result = db.prepare("DELETE FROM expenses WHERE id = ?").run(id);
  return result.changes > 0;
}

export function getSettings(): Settings {
  const row = db.prepare("SELECT * FROM settings WHERE id = 1").get() as SettingsRow;
  return {
    salary: row.salary,
    currency: row.currency,
    savingsTarget: row.savingsTarget,
    startMonth: row.startMonth,
    theme: row.theme as Settings["theme"],
  };
}

export function updateSettings(input: Partial<Settings>): Settings {
  const merged = { ...getSettings(), ...input };
  db.prepare(
    `UPDATE settings SET salary=@salary, currency=@currency, savingsTarget=@savingsTarget, startMonth=@startMonth, theme=@theme WHERE id=1`,
  ).run(merged);
  return merged;
}

export interface BackupData {
  version: 1;
  exportedAt: string;
  settings: Settings;
  expenses: Expense[];
}

export function exportData(): BackupData {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: getSettings(),
    expenses: getAllExpenses(),
  };
}

export function importData(data: BackupData): void {
  const tx = db.transaction(() => {
    db.prepare("DELETE FROM expenses").run();
    const insert = db.prepare(
      `INSERT INTO expenses
        (id, name, amount, type, frequency, startDate, endDate, active, color, notes, creditInitialAmount, linkedExpenseId, createdAt, updatedAt)
       VALUES
        (@id, @name, @amount, @type, @frequency, @startDate, @endDate, @active, @color, @notes, @creditInitialAmount, @linkedExpenseId, @createdAt, @updatedAt)`,
    );
    for (const e of data.expenses) {
      insert.run({
        id: e.id,
        name: e.name,
        amount: e.amount,
        type: e.type,
        frequency: e.frequency,
        startDate: e.startDate,
        endDate: e.endDate ?? null,
        active: e.active ? 1 : 0,
        color: e.color,
        notes: e.notes ?? null,
        creditInitialAmount: e.creditInitialAmount ?? null,
        linkedExpenseId: e.linkedExpenseId ?? null,
        createdAt: e.createdAt ?? new Date().toISOString(),
        updatedAt: e.updatedAt ?? new Date().toISOString(),
      });
    }
    updateSettings(data.settings);
  });
  tx();
}
