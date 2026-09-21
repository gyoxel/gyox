import { randomUUID } from "crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const expenseCount = await prisma.expense.count();
  if (expenseCount === 0) {
    const now = new Date().toISOString();
    const dnyaId = randomUUID();

    await prisma.expense.createMany({
      data: [
        {
          id: dnyaId,
          name: "Dnya",
          amount: 1500,
          type: "credit",
          frequency: "monthly",
          startDate: "2026-10-01",
          endDate: null,
          active: true,
          color: "blue",
          notes: "Crédit en cours de remboursement.",
          creditInitialAmount: 13000,
          linkedExpenseId: null,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: randomUUID(),
          name: "Zineb",
          amount: 500,
          type: "temporary",
          frequency: "monthly",
          startDate: "2026-10-01",
          endDate: null,
          active: true,
          color: "blue",
          notes: "Se termine en même temps que Dnya.",
          creditInitialAmount: null,
          linkedExpenseId: dnyaId,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: randomUUID(),
          name: "Tomobil",
          amount: 700,
          type: "permanent",
          frequency: "monthly",
          startDate: "2026-10-01",
          endDate: null,
          active: true,
          color: "red",
          notes: null,
          creditInitialAmount: null,
          linkedExpenseId: null,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: randomUUID(),
          name: "Makla",
          amount: 500,
          type: "permanent",
          frequency: "monthly",
          startDate: "2026-10-01",
          endDate: null,
          active: true,
          color: "red",
          notes: null,
          creditInitialAmount: null,
          linkedExpenseId: null,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: randomUUID(),
          name: "Abonnements",
          amount: 400,
          type: "permanent",
          frequency: "monthly",
          startDate: "2026-10-01",
          endDate: null,
          active: true,
          color: "red",
          notes: null,
          creditInitialAmount: null,
          linkedExpenseId: null,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: randomUUID(),
          name: "Dar",
          amount: 1200,
          type: "temporary",
          frequency: "one-time",
          startDate: "2026-10-01",
          endDate: null,
          active: true,
          color: "yellow",
          notes: null,
          creditInitialAmount: null,
          linkedExpenseId: null,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: randomUUID(),
          name: "Solaih",
          amount: 200,
          type: "temporary",
          frequency: "one-time",
          startDate: "2026-10-01",
          endDate: null,
          active: true,
          color: "yellow",
          notes: null,
          creditInitialAmount: null,
          linkedExpenseId: null,
          createdAt: now,
          updatedAt: now,
        },
      ],
    });
  }

  const settingsCount = await prisma.settings.count();
  if (settingsCount === 0) {
    await prisma.settings.create({
      data: {
        id: 1,
        salary: 5500,
        currency: "MAD",
        savingsTarget: 2000,
        startMonth: "2026-09",
        theme: "system",
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
