-- CreateTable
CREATE TABLE "salary_advances" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL,

    CONSTRAINT "salary_advances_pkey" PRIMARY KEY ("id")
);
