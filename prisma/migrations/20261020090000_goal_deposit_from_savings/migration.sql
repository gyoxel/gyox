-- A goal deposit taken from the savings comes off them as a "goal" move.
ALTER TABLE "savings_moves" ADD COLUMN "goalDepositId" TEXT;
CREATE UNIQUE INDEX "savings_moves_goalDepositId_key" ON "savings_moves"("goalDepositId");
ALTER TABLE "savings_moves" ADD CONSTRAINT "savings_moves_goalDepositId_fkey" FOREIGN KEY ("goalDepositId") REFERENCES "goal_deposits"("id") ON DELETE CASCADE ON UPDATE CASCADE;
