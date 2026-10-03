-- Goal deposits: put aside in cash or from the card (null for older ones),
-- so they come off the Solde.
ALTER TABLE "goal_deposits" ADD COLUMN "method" TEXT;
