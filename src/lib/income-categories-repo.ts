// Income categories in the database (Revenus): the defaults and the user's own.
import { randomUUID } from "crypto";
import { prisma } from "./prisma";
import type { Category } from "./types";

/** "Autre" stays last: a new category goes right before it. */
const PINNED_LAST = "autre";

export async function getIncomeCategories(): Promise<Category[]> {
  const rows = await prisma.incomeCategory.findMany({ orderBy: [{ position: "asc" }, { createdAt: "asc" }] });
  return rows.map(({ id, name, emoji, position }) => ({ id, name, emoji, position }));
}

export async function createIncomeCategory(input: { name: string; emoji: string }): Promise<Category> {
  const all = await prisma.incomeCategory.findMany({ orderBy: [{ position: "asc" }, { createdAt: "asc" }] });
  const last = all.at(-1);
  const pinned = last?.id === PINNED_LAST ? last : null;
  const position = pinned ? pinned.position : (last?.position ?? 0) + 1;
  const [row] = await prisma.$transaction([
    prisma.incomeCategory.create({
      data: { id: randomUUID(), name: input.name, emoji: input.emoji, position, createdAt: new Date().toISOString() },
    }),
    ...(pinned ? [prisma.incomeCategory.updateMany({ where: { id: pinned.id }, data: { position: position + 1 } })] : []),
  ]);
  return { id: row.id, name: row.name, emoji: row.emoji, position: row.position };
}

/** The default income categories (ids = the keys incomes used before). */
export const DEFAULT_INCOME_CATEGORIES = [
  { id: "prime", name: "Prime", emoji: "🏆" },
  { id: "freelance", name: "Freelance", emoji: "💻" },
  { id: "heures-sup", name: "Heures sup", emoji: "⏱️" },
  { id: "vente", name: "Vente", emoji: "🛍️" },
  { id: "cadeau", name: "Cadeau", emoji: "🎁" },
  { id: "remboursement", name: "Remboursement", emoji: "↩️" },
  { id: "loyer", name: "Loyer reçu", emoji: "🏠" },
  { id: "investissement", name: "Investissement", emoji: "📈" },
  { id: "autre", name: "Autre", emoji: "✨" },
];

export async function updateIncomeCategory(id: string, input: { name?: string; emoji?: string }): Promise<Category | null> {
  const { count } = await prisma.incomeCategory.updateMany({ where: { id }, data: input });
  if (count === 0) return null;
  const row = await prisma.incomeCategory.findFirstOrThrow({ where: { id } });
  return { id: row.id, name: row.name, emoji: row.emoji, position: row.position };
}

/** Its incomes are kept, moved to "Autre". "Autre" itself can't go. */
export async function deleteIncomeCategory(id: string): Promise<boolean> {
  if (id === PINNED_LAST) return false;
  const [, { count }] = await prisma.$transaction([
    prisma.income.updateMany({ where: { category: id }, data: { category: PINNED_LAST } }),
    prisma.incomeCategory.deleteMany({ where: { id } }),
  ]);
  return count > 0;
}

export async function reorderIncomeCategories(ids: string[]): Promise<void> {
  await prisma.$transaction(ids.map((id, index) => prisma.incomeCategory.updateMany({ where: { id }, data: { position: index + 1 } })));
}

/** Back to the defaults; the user's own go (their incomes move to "Autre"). */
export async function resetIncomeCategories(): Promise<Category[]> {
  const now = new Date().toISOString();
  const defaultIds = DEFAULT_INCOME_CATEGORIES.map((d) => d.id);
  await prisma.$transaction([
    prisma.income.updateMany({
      where: { category: { notIn: [...defaultIds, "credit", "epargne", "pret", "budget"] } },
      data: { category: PINNED_LAST },
    }),
    prisma.incomeCategory.deleteMany({}),
    prisma.incomeCategory.createMany({ data: DEFAULT_INCOME_CATEGORIES.map((d, i) => ({ ...d, position: i + 1, createdAt: now })) }),
  ]);
  return getIncomeCategories();
}
