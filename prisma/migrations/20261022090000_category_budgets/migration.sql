-- The old Budgets (an amount taken at once, spending noted inside it) are
-- gone. Their expenses, payments and "- Reste" incomes stay as they are,
-- ordinary ones, so the Solde's history doesn't change.
DROP TABLE IF EXISTS "budget_months";
DROP TABLE IF EXISTS "budget_entries";
DROP TABLE IF EXISTS "budgets";

-- Budgets now: the most to spend in a category a month.
ALTER TABLE "categories" ADD COLUMN "budget" DOUBLE PRECISION;
