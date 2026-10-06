// What a new account starts with: its settings and the default categories
// (expenses and incomes), as the app had them before accounts.
import { randomUUID } from "crypto";
import { prisma } from "./prisma";
import { monthKey, todayMonth } from "./date";
import { DEFAULT_CATEGORIES } from "./default-categories";
import { DEFAULT_INCOME_CATEGORIES } from "./income-categories-repo";

export function defaultSettings() {
  return {
    salary: 0,
    currency: "MAD",
    savingsTarget: 0,
    startMonth: monthKey(todayMonth()),
    theme: "system",
    payDay: 1,
    salaryReceivedMonth: null,
    salaryMethod: "card",
  };
}

/** Run for the new user (asUser): every row is theirs. */
export async function createUserDefaults(): Promise<void> {
  const now = new Date().toISOString();
  await prisma.$transaction([
    prisma.settings.create({ data: defaultSettings() }),
    // New ids: the default ones are the owner's categories.
    prisma.category.createMany({
      data: DEFAULT_CATEGORIES.map((c, i) => ({ id: randomUUID(), name: c.name, emoji: c.emoji, position: i + 1, createdAt: now })),
    }),
    prisma.incomeCategory.createMany({
      data: DEFAULT_INCOME_CATEGORIES.map((c, i) => ({ ...c, position: i + 1, createdAt: now })),
    }),
  ]);
}
