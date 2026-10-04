-- Income categories become a list like the expenses' (with the user's own).
-- The defaults keep their old keys as ids, so existing incomes still match.
CREATE TABLE "income_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TEXT NOT NULL,
    CONSTRAINT "income_categories_pkey" PRIMARY KEY ("id")
);

INSERT INTO "income_categories" ("id", "name", "emoji", "position", "createdAt") VALUES
    ('prime', 'Prime', '🏆', 1, '2026-10-04T21:00:00.000Z'),
    ('freelance', 'Freelance', '💻', 2, '2026-10-04T21:00:00.000Z'),
    ('heures-sup', 'Heures sup', '⏱️', 3, '2026-10-04T21:00:00.000Z'),
    ('vente', 'Vente', '🛍️', 4, '2026-10-04T21:00:00.000Z'),
    ('cadeau', 'Cadeau', '🎁', 5, '2026-10-04T21:00:00.000Z'),
    ('remboursement', 'Remboursement', '↩️', 6, '2026-10-04T21:00:00.000Z'),
    ('loyer', 'Loyer reçu', '🏠', 7, '2026-10-04T21:00:00.000Z'),
    ('investissement', 'Investissement', '📈', 8, '2026-10-04T21:00:00.000Z'),
    ('autre', 'Autre', '✨', 9, '2026-10-04T21:00:00.000Z');
