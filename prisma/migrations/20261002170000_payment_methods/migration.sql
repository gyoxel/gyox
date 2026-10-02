-- Cash or card: on payments, incomes, and the salary.
ALTER TABLE "payments" ADD COLUMN "method" TEXT;
ALTER TABLE "incomes" ADD COLUMN "method" TEXT NOT NULL DEFAULT 'cash';
ALTER TABLE "settings" ADD COLUMN "salaryMethod" TEXT NOT NULL DEFAULT 'card';
