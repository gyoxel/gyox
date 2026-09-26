-- AlterTable
ALTER TABLE "expenses" ADD COLUMN     "categoryId" TEXT;

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TEXT NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Default categories, in the user's order. Only inserted when the table is
-- empty so re-running (or an import) never duplicates them.
INSERT INTO "categories" ("id", "name", "emoji", "position", "createdAt")
SELECT gen_random_uuid()::text, c.name, c.emoji, c.position, now()::text
FROM (VALUES
  ('Fast Food', '🍔', 1),
  ('Courses', '🛒', 2),
  ('Carburant', '⛽', 3),
  ('Transport', '🚖', 4),
  ('Dacia', '🚗', 5),
  ('Dar', '🏠', 6),
  ('Abonnements', '📱', 7),
  ('Crédits', '💳', 8),
  ('Prêts', '💸', 9),
  ('Achats', '🛍️', 10),
  ('Loisirs', '🎉', 11),
  ('Santé', '🏥', 12),
  ('Vêtements', '👕', 13),
  ('Autres', '📦', 14)
) AS c(name, emoji, position)
WHERE NOT EXISTS (SELECT 1 FROM "categories");
