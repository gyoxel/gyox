-- Épargne (savings moves) and Prêts (loans given, with their repayments).
CREATE TABLE "savings_moves" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "method" TEXT NOT NULL,
    "note" TEXT,
    "date" TEXT NOT NULL,
    "expenseId" TEXT,
    "incomeId" TEXT,
    "createdAt" TEXT NOT NULL,
    CONSTRAINT "savings_moves_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "savings_moves_expenseId_key" ON "savings_moves"("expenseId");
CREATE UNIQUE INDEX "savings_moves_incomeId_key" ON "savings_moves"("incomeId");
ALTER TABLE "savings_moves" ADD CONSTRAINT "savings_moves_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "savings_moves" ADD CONSTRAINT "savings_moves_incomeId_fkey" FOREIGN KEY ("incomeId") REFERENCES "incomes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "loans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "priorRepaid" DOUBLE PRECISION,
    "date" TEXT NOT NULL,
    "method" TEXT,
    "monthly" DOUBLE PRECISION NOT NULL,
    "months" INTEGER NOT NULL,
    "startMonth" TEXT NOT NULL,
    "note" TEXT,
    "expenseId" TEXT,
    "createdAt" TEXT NOT NULL,
    CONSTRAINT "loans_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "loans_expenseId_key" ON "loans"("expenseId");
ALTER TABLE "loans" ADD CONSTRAINT "loans_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "loan_repayments" (
    "id" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "slot" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "method" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "incomeId" TEXT,
    "createdAt" TEXT NOT NULL,
    CONSTRAINT "loan_repayments_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "loan_repayments_incomeId_key" ON "loan_repayments"("incomeId");
CREATE UNIQUE INDEX "loan_repayments_loanId_slot_key" ON "loan_repayments"("loanId", "slot");
ALTER TABLE "loan_repayments" ADD CONSTRAINT "loan_repayments_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "loans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "loan_repayments" ADD CONSTRAINT "loan_repayments_incomeId_fkey" FOREIGN KEY ("incomeId") REFERENCES "incomes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
