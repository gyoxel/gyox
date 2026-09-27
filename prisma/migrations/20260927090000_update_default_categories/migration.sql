-- User-requested category changes. Each step is guarded by the exact
-- current name so it's a no-op if the user already changed it in Réglages.

UPDATE "categories" SET "name" = 'Alimentation'
WHERE "name" = 'Fast Food' AND NOT EXISTS (SELECT 1 FROM "categories" WHERE "name" = 'Alimentation');

UPDATE "categories" SET "name" = 'Voiture'
WHERE "name" = 'Dacia' AND NOT EXISTS (SELECT 1 FROM "categories" WHERE "name" = 'Voiture');

UPDATE "categories" SET "name" = 'Famille'
WHERE "name" = 'Dar' AND NOT EXISTS (SELECT 1 FROM "categories" WHERE "name" = 'Famille');

-- Credits are added from their own entry point, so no "Crédits" category.
-- Expenses that had it simply become uncategorized (FK ON DELETE SET NULL).
DELETE FROM "categories" WHERE "name" = 'Crédits';

-- New "Bien-être", placed just before "Autres" (or last if there's none).
UPDATE "categories" SET "position" = "position" + 1
WHERE "name" = 'Autres' AND NOT EXISTS (SELECT 1 FROM "categories" WHERE "name" = 'Bien-être');

INSERT INTO "categories" ("id", "name", "emoji", "position", "createdAt")
SELECT gen_random_uuid()::text, 'Bien-être', '🧘', COALESCE(
  (SELECT "position" - 1 FROM "categories" WHERE "name" = 'Autres'),
  (SELECT COALESCE(MAX("position"), 0) + 1 FROM "categories")
), now()::text
WHERE NOT EXISTS (SELECT 1 FROM "categories" WHERE "name" = 'Bien-être');
