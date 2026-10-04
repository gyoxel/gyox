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
    ...(pinned ? [prisma.incomeCategory.update({ where: { id: pinned.id }, data: { position: position + 1 } })] : []),
  ]);
  return { id: row.id, name: row.name, emoji: row.emoji, position: row.position };
}
