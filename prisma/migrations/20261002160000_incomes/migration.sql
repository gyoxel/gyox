-- CreateTable
CREATE TABLE "incomes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TEXT NOT NULL,

    CONSTRAINT "incomes_pkey" PRIMARY KEY ("id")
);
