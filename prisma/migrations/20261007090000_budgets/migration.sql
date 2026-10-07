-- Budgets: an amount for something, its spending noted day by day (see schema.prisma).
-- CreateTable
CREATE TABLE "budgets" (
    "id" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL,
    "userId" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_entries" (
    "id" TEXT NOT NULL,
    "budgetId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "method" TEXT NOT NULL DEFAULT 'cash',
    "createdAt" TEXT NOT NULL,
    "userId" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "budget_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_months" (
    "id" TEXT NOT NULL,
    "budgetId" TEXT NOT NULL,
    "monthKey" TEXT NOT NULL,
    "overflowExpenseId" TEXT,
    "resteIncomeId" TEXT,
    "userId" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "budget_months_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "budgets_expenseId_key" ON "budgets"("expenseId");

-- CreateIndex
CREATE INDEX "budgets_userId_idx" ON "budgets"("userId");

-- CreateIndex
CREATE INDEX "budget_entries_userId_idx" ON "budget_entries"("userId");

-- CreateIndex
CREATE INDEX "budget_entries_budgetId_idx" ON "budget_entries"("budgetId");

-- CreateIndex
CREATE UNIQUE INDEX "budget_months_overflowExpenseId_key" ON "budget_months"("overflowExpenseId");

-- CreateIndex
CREATE UNIQUE INDEX "budget_months_resteIncomeId_key" ON "budget_months"("resteIncomeId");

-- CreateIndex
CREATE INDEX "budget_months_userId_idx" ON "budget_months"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "budget_months_budgetId_monthKey_key" ON "budget_months"("budgetId", "monthKey");

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_entries" ADD CONSTRAINT "budget_entries_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "budgets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_entries" ADD CONSTRAINT "budget_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_months" ADD CONSTRAINT "budget_months_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "budgets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_months" ADD CONSTRAINT "budget_months_overflowExpenseId_fkey" FOREIGN KEY ("overflowExpenseId") REFERENCES "expenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_months" ADD CONSTRAINT "budget_months_resteIncomeId_fkey" FOREIGN KEY ("resteIncomeId") REFERENCES "incomes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_months" ADD CONSTRAINT "budget_months_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

