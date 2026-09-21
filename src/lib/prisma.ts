import { PrismaClient } from "@prisma/client";

declare global {
  var __budgetPrisma: PrismaClient | undefined;
}

export const prisma = globalThis.__budgetPrisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalThis.__budgetPrisma = prisma;
