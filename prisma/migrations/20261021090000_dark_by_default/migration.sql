-- The premium look: dark is everyone's theme unless they chose another.
ALTER TABLE "settings" ALTER COLUMN "theme" SET DEFAULT 'dark';
UPDATE "settings" SET "theme" = 'dark' WHERE "theme" = 'system';
