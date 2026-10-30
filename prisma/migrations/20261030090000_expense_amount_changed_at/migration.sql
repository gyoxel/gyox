-- When an expense's amount was last changed: an edit dates it only then
-- (not a new name, account or category). Null for those never changed.
ALTER TABLE "expenses" ADD COLUMN "amountChangedAt" TEXT;
