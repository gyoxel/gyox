-- CreateTable
CREATE TABLE "darets" (
    "id" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "members" INTEGER NOT NULL,
    "turnMonth" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL,

    CONSTRAINT "darets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "darets_expenseId_key" ON "darets"("expenseId");

-- AddForeignKey
ALTER TABLE "darets" ADD CONSTRAINT "darets_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
