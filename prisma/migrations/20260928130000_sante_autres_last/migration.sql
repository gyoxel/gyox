-- User request: "Santé" then "Autres" are always the last two categories,
-- right before "+ Ajouter" (new categories are inserted before them, see
-- createCategory).
UPDATE "categories" SET "position" = (SELECT MAX("position") + 1 FROM "categories") WHERE "name" = 'Santé';
UPDATE "categories" SET "position" = (SELECT MAX("position") + 1 FROM "categories") WHERE "name" = 'Autres';
