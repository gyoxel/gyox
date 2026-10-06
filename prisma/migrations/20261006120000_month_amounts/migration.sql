-- Months with their own amount, just for that month: { "YYYY-MM": amount }.
ALTER TABLE "expenses" ADD COLUMN "monthAmounts" JSONB;
