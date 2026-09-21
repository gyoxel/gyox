import Database from "better-sqlite3";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const dbPath = path.join(dataDir, "app.db");

declare global {
  var __budgetDb: Database.Database | undefined;
}

export const db = globalThis.__budgetDb ?? new Database(dbPath);
if (process.env.NODE_ENV !== "production") globalThis.__budgetDb = db;

db.pragma("busy_timeout = 5000");
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  amount REAL NOT NULL,
  type TEXT NOT NULL,
  frequency TEXT NOT NULL,
  startDate TEXT NOT NULL,
  endDate TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  color TEXT NOT NULL,
  notes TEXT,
  creditInitialAmount REAL,
  linkedExpenseId TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  salary REAL NOT NULL,
  currency TEXT NOT NULL,
  savingsTarget REAL NOT NULL,
  startMonth TEXT NOT NULL,
  theme TEXT NOT NULL DEFAULT 'system'
);
`);

// Multiple Next.js build/dev workers can open this same file concurrently.
// Running the check-then-insert as a single IMMEDIATE transaction acquires
// the write lock up front, so concurrent processes serialize instead of
// racing between their COUNT(*) check and their INSERT.
const seedIfNeeded = db.transaction(() => {
  const expenseCount = (db.prepare("SELECT COUNT(*) as c FROM expenses").get() as { c: number }).c;
  if (expenseCount === 0) seedExpenses();

  const settingsCount = (db.prepare("SELECT COUNT(*) as c FROM settings").get() as { c: number }).c;
  if (settingsCount === 0) seedSettings();
}).immediate;

function seedExpenses() {
  const now = new Date().toISOString();
  const insert = db.prepare(`
    INSERT INTO expenses
      (id, name, amount, type, frequency, startDate, endDate, active, color, notes, creditInitialAmount, linkedExpenseId, createdAt, updatedAt)
    VALUES
      (@id, @name, @amount, @type, @frequency, @startDate, @endDate, @active, @color, @notes, @creditInitialAmount, @linkedExpenseId, @createdAt, @updatedAt)
  `);

  const dnyaId = randomUUID();

  const rows = [
    {
      id: dnyaId,
      name: "Dnya",
      amount: 1500,
      type: "credit",
      frequency: "monthly",
      startDate: "2026-10-01",
      endDate: null,
      active: 1,
      color: "blue",
      notes: "Crédit en cours de remboursement.",
      creditInitialAmount: 13000,
      linkedExpenseId: null,
    },
    {
      id: randomUUID(),
      name: "Zineb",
      amount: 500,
      type: "temporary",
      frequency: "monthly",
      startDate: "2026-10-01",
      endDate: null,
      active: 1,
      color: "blue",
      notes: "Se termine en même temps que Dnya.",
      creditInitialAmount: null,
      linkedExpenseId: dnyaId,
    },
    {
      id: randomUUID(),
      name: "Tomobil",
      amount: 700,
      type: "permanent",
      frequency: "monthly",
      startDate: "2026-10-01",
      endDate: null,
      active: 1,
      color: "red",
      notes: null,
      creditInitialAmount: null,
      linkedExpenseId: null,
    },
    {
      id: randomUUID(),
      name: "Makla",
      amount: 500,
      type: "permanent",
      frequency: "monthly",
      startDate: "2026-10-01",
      endDate: null,
      active: 1,
      color: "red",
      notes: null,
      creditInitialAmount: null,
      linkedExpenseId: null,
    },
    {
      id: randomUUID(),
      name: "Abonnements",
      amount: 400,
      type: "permanent",
      frequency: "monthly",
      startDate: "2026-10-01",
      endDate: null,
      active: 1,
      color: "red",
      notes: null,
      creditInitialAmount: null,
      linkedExpenseId: null,
    },
    {
      id: randomUUID(),
      name: "Dar",
      amount: 1200,
      type: "temporary",
      frequency: "one-time",
      startDate: "2026-10-01",
      endDate: null,
      active: 1,
      color: "yellow",
      notes: null,
      creditInitialAmount: null,
      linkedExpenseId: null,
    },
    {
      id: randomUUID(),
      name: "Solaih",
      amount: 200,
      type: "temporary",
      frequency: "one-time",
      startDate: "2026-10-01",
      endDate: null,
      active: 1,
      color: "yellow",
      notes: null,
      creditInitialAmount: null,
      linkedExpenseId: null,
    },
  ];

  const tx = db.transaction(() => {
    for (const row of rows) {
      insert.run({ ...row, createdAt: now, updatedAt: now });
    }
  });
  tx();
}

function seedSettings() {
  db.prepare(
    `INSERT INTO settings (id, salary, currency, savingsTarget, startMonth, theme) VALUES (1, 5500, 'MAD', 2000, '2026-09', 'system')`,
  ).run();
}

seedIfNeeded();
