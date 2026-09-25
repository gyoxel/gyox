-- AlterTable
ALTER TABLE "expenses" ADD COLUMN     "creditPriorPaid" DOUBLE PRECISION;

-- User request: Dnya is a 17 000 DH credit of which 4 000 DH was already
-- repaid before it was tracked here; the 13 000 DH left stays in
-- creditInitialAmount, so schedules and all calculations are unchanged.
-- Guarded: only a credit named exactly "Dnya" with no value set yet.
UPDATE "expenses"
SET "creditPriorPaid" = 4000
WHERE "name" = 'Dnya' AND "type" = 'credit' AND "creditPriorPaid" IS NULL;
