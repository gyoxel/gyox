-- A goal deposit is also a paid one-time expense, and a new credit's money
-- comes in as an income: both linked to that expense (deleted with it).
ALTER TABLE "goal_deposits" ADD COLUMN "expenseId" TEXT;
ALTER TABLE "incomes" ADD COLUMN "expenseId" TEXT;

ALTER TABLE "goal_deposits" ADD CONSTRAINT "goal_deposits_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "incomes" ADD CONSTRAINT "incomes_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
