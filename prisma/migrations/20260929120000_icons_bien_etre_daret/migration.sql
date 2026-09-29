-- User request: "Bien-être" category shows ✨; daret icon becomes 🤝🏻.
UPDATE "categories" SET "emoji" = '✨' WHERE "name" = 'Bien-être';
UPDATE "expenses" SET "icon" = '🤝🏻' WHERE "icon" = '🤝';
