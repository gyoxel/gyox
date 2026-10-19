-- Épargne and goal deposits every month: their expense comes back each
-- month in Dépenses, and every month ticked there counts.
ALTER TABLE "savings_moves" ADD COLUMN "monthly" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "goal_deposits" ADD COLUMN "monthly" BOOLEAN NOT NULL DEFAULT false;
