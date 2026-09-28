-- User request: "Achats" moves to the second row of the picker, right
-- after "Prêts" and before "+ Ajouter", so the first row ends at
-- "Abonnements". No-op if it's already last or doesn't exist.
UPDATE "categories"
SET "position" = (SELECT MAX("position") + 1 FROM "categories")
WHERE "name" = 'Achats'
  AND "position" < (SELECT MAX("position") FROM "categories");
