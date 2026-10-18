-- Light is everyone's theme unless they chose another ("system", the old
-- default, wasn't a choice); dark stays for those who pick it.
ALTER TABLE "settings" ALTER COLUMN "theme" SET DEFAULT 'light';
UPDATE "settings" SET "theme" = 'light' WHERE "theme" = 'system';
-- Where a short-lived earlier version of this made everyone dark (only
-- ever on the test database), they go back to light.
UPDATE "settings" SET "theme" = 'light'
WHERE "theme" = 'dark'
  AND EXISTS (SELECT 1 FROM "_prisma_migrations" WHERE "migration_name" = '20261021090000_dark_by_default');
