-- Solde (cash / card accounts): how each advance and daret payout was
-- received, one row per salary received, and transfers / adjustments.
ALTER TABLE "salary_advances" ADD COLUMN "method" TEXT NOT NULL DEFAULT 'card';
ALTER TABLE "darets" ADD COLUMN "payoutMethod" TEXT;
ALTER TABLE "darets" ADD COLUMN "payoutReceivedAt" TEXT;

-- CreateTable
CREATE TABLE "salary_receipts" (
    "id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "method" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL,

    CONSTRAINT "salary_receipts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "salary_receipts_period_key" ON "salary_receipts"("period");

-- CreateTable
CREATE TABLE "wallet_ops" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "fromAccount" TEXT,
    "toAccount" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "createdAt" TEXT NOT NULL,

    CONSTRAINT "wallet_ops_pkey" PRIMARY KEY ("id")
);
