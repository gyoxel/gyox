-- The pay time is gone (the salary counts from midnight of the pay day);
-- instead, remember the last pay day whose salary was confirmed received.
ALTER TABLE "settings" DROP COLUMN "payTime";
ALTER TABLE "settings" ADD COLUMN "salaryReceivedMonth" TEXT;
