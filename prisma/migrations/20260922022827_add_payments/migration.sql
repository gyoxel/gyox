-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "monthKey" TEXT,
    "slotIndex" INTEGER,
    "amountDue" DOUBLE PRECISION NOT NULL,
    "amountPaid" DOUBLE PRECISION NOT NULL,
    "paidAt" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payments_expenseId_monthKey_key" ON "payments"("expenseId", "monthKey");

-- CreateIndex
CREATE UNIQUE INDEX "payments_expenseId_slotIndex_key" ON "payments"("expenseId", "slotIndex");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
