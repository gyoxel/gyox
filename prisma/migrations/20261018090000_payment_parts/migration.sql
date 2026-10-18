-- A month (or credit installment) can be paid in several times: one row per part.
-- DropIndex
DROP INDEX "payments_expenseId_monthKey_key";

-- DropIndex
DROP INDEX "payments_expenseId_slotIndex_key";

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "part" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "payments_expenseId_monthKey_part_key" ON "payments"("expenseId", "monthKey", "part");

-- CreateIndex
CREATE UNIQUE INDEX "payments_expenseId_slotIndex_part_key" ON "payments"("expenseId", "slotIndex", "part");

