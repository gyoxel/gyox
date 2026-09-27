-- User request: "Prêts" goes last (second row of the picker, right before
-- "+ Ajouter"). No-op if it's already last or doesn't exist.
UPDATE "categories"
SET "position" = (SELECT MAX("position") + 1 FROM "categories")
WHERE "name" = 'Prêts'
  AND "position" < (SELECT MAX("position") FROM "categories");
