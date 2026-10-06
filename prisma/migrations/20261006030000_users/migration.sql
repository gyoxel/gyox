-- Accounts: everyone signs in with Google and sees only their own data.
-- Everything recorded so far belongs to the owner, gyoxel@gmail.com (linked
-- to their Google account on their first sign-in, by this email).

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "googleSub" TEXT,
    "name" TEXT,
    "image" TEXT,
    "createdAt" TEXT NOT NULL,
    "lastLoginAt" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_googleSub_key" ON "users"("googleSub");

-- The owner. A fixed id: a session stays valid when the test database is
-- emptied and filled again.
INSERT INTO "users" ("id", "email", "createdAt")
VALUES ('00000000-0000-4000-8000-000000000001', 'gyoxel@gmail.com', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'));

-- DropIndex
DROP INDEX "salary_receipts_period_key";

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "userId" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "darets" ADD COLUMN     "userId" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "day_notes" DROP CONSTRAINT "day_notes_pkey",
ADD COLUMN     "userId" TEXT NOT NULL DEFAULT '',
ADD CONSTRAINT "day_notes_pkey" PRIMARY KEY ("userId", "date");

-- AlterTable
ALTER TABLE "expenses" ADD COLUMN     "userId" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "goal_deposits" ADD COLUMN     "userId" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "goal_ideas" ADD COLUMN     "userId" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "goals" ADD COLUMN     "userId" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "income_categories" DROP CONSTRAINT "income_categories_pkey",
ADD COLUMN     "userId" TEXT NOT NULL DEFAULT '',
ADD CONSTRAINT "income_categories_pkey" PRIMARY KEY ("userId", "id");

-- AlterTable
ALTER TABLE "incomes" ADD COLUMN     "userId" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "loan_repayments" ADD COLUMN     "userId" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "loans" ADD COLUMN     "userId" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "userId" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "salary_advances" ADD COLUMN     "userId" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "salary_receipts" ADD COLUMN     "userId" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "savings_moves" ADD COLUMN     "userId" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "settings" DROP CONSTRAINT "settings_pkey",
DROP COLUMN "id",
ADD COLUMN     "userId" TEXT NOT NULL DEFAULT '',
ADD CONSTRAINT "settings_pkey" PRIMARY KEY ("userId");

-- AlterTable
ALTER TABLE "wallet_ops" ADD COLUMN     "userId" TEXT NOT NULL DEFAULT '';

-- Every existing row is the owner's.
UPDATE "categories" SET "userId" = (SELECT "id" FROM "users" WHERE "email" = 'gyoxel@gmail.com');
UPDATE "darets" SET "userId" = (SELECT "id" FROM "users" WHERE "email" = 'gyoxel@gmail.com');
UPDATE "day_notes" SET "userId" = (SELECT "id" FROM "users" WHERE "email" = 'gyoxel@gmail.com');
UPDATE "expenses" SET "userId" = (SELECT "id" FROM "users" WHERE "email" = 'gyoxel@gmail.com');
UPDATE "goal_deposits" SET "userId" = (SELECT "id" FROM "users" WHERE "email" = 'gyoxel@gmail.com');
UPDATE "goal_ideas" SET "userId" = (SELECT "id" FROM "users" WHERE "email" = 'gyoxel@gmail.com');
UPDATE "goals" SET "userId" = (SELECT "id" FROM "users" WHERE "email" = 'gyoxel@gmail.com');
UPDATE "income_categories" SET "userId" = (SELECT "id" FROM "users" WHERE "email" = 'gyoxel@gmail.com');
UPDATE "incomes" SET "userId" = (SELECT "id" FROM "users" WHERE "email" = 'gyoxel@gmail.com');
UPDATE "loan_repayments" SET "userId" = (SELECT "id" FROM "users" WHERE "email" = 'gyoxel@gmail.com');
UPDATE "loans" SET "userId" = (SELECT "id" FROM "users" WHERE "email" = 'gyoxel@gmail.com');
UPDATE "payments" SET "userId" = (SELECT "id" FROM "users" WHERE "email" = 'gyoxel@gmail.com');
UPDATE "salary_advances" SET "userId" = (SELECT "id" FROM "users" WHERE "email" = 'gyoxel@gmail.com');
UPDATE "salary_receipts" SET "userId" = (SELECT "id" FROM "users" WHERE "email" = 'gyoxel@gmail.com');
UPDATE "savings_moves" SET "userId" = (SELECT "id" FROM "users" WHERE "email" = 'gyoxel@gmail.com');
UPDATE "settings" SET "userId" = (SELECT "id" FROM "users" WHERE "email" = 'gyoxel@gmail.com');
UPDATE "wallet_ops" SET "userId" = (SELECT "id" FROM "users" WHERE "email" = 'gyoxel@gmail.com');

-- CreateIndex
CREATE INDEX "categories_userId_idx" ON "categories"("userId");

-- CreateIndex
CREATE INDEX "darets_userId_idx" ON "darets"("userId");

-- CreateIndex
CREATE INDEX "expenses_userId_idx" ON "expenses"("userId");

-- CreateIndex
CREATE INDEX "goal_deposits_userId_idx" ON "goal_deposits"("userId");

-- CreateIndex
CREATE INDEX "goal_ideas_userId_idx" ON "goal_ideas"("userId");

-- CreateIndex
CREATE INDEX "goals_userId_idx" ON "goals"("userId");

-- CreateIndex
CREATE INDEX "incomes_userId_idx" ON "incomes"("userId");

-- CreateIndex
CREATE INDEX "loan_repayments_userId_idx" ON "loan_repayments"("userId");

-- CreateIndex
CREATE INDEX "loans_userId_idx" ON "loans"("userId");

-- CreateIndex
CREATE INDEX "payments_userId_idx" ON "payments"("userId");

-- CreateIndex
CREATE INDEX "salary_advances_userId_idx" ON "salary_advances"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "salary_receipts_userId_period_key" ON "salary_receipts"("userId", "period");

-- CreateIndex
CREATE INDEX "savings_moves_userId_idx" ON "savings_moves"("userId");

-- CreateIndex
CREATE INDEX "wallet_ops_userId_idx" ON "wallet_ops"("userId");

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "darets" ADD CONSTRAINT "darets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settings" ADD CONSTRAINT "settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_deposits" ADD CONSTRAINT "goal_deposits_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_ideas" ADD CONSTRAINT "goal_ideas_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "day_notes" ADD CONSTRAINT "day_notes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_advances" ADD CONSTRAINT "salary_advances_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_receipts" ADD CONSTRAINT "salary_receipts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_ops" ADD CONSTRAINT "wallet_ops_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incomes" ADD CONSTRAINT "incomes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "income_categories" ADD CONSTRAINT "income_categories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "savings_moves" ADD CONSTRAINT "savings_moves_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_repayments" ADD CONSTRAINT "loan_repayments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
