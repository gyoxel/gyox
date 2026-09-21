-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "type" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "color" TEXT NOT NULL,
    "notes" TEXT,
    "creditInitialAmount" DOUBLE PRECISION,
    "linkedExpenseId" TEXT,
    "createdAt" TEXT NOT NULL,
    "updatedAt" TEXT NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "salary" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "savingsTarget" DOUBLE PRECISION NOT NULL,
    "startMonth" TEXT NOT NULL,
    "theme" TEXT NOT NULL DEFAULT 'system',

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);
