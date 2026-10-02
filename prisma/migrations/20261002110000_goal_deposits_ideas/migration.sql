-- CreateTable
CREATE TABLE "goal_deposits" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL,

    CONSTRAINT "goal_deposits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goal_ideas" (
    "id" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL,

    CONSTRAINT "goal_ideas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "goal_deposits_goalId_idx" ON "goal_deposits"("goalId");

-- AddForeignKey
ALTER TABLE "goal_deposits" ADD CONSTRAINT "goal_deposits_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
