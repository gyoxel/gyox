-- User request: new person icons (women: Dnya, Zineb; man: Solaih; Dar).
UPDATE "expenses" SET "icon" = '👩🏻‍🦰' WHERE "name" IN ('Dnya', 'Zineb');
UPDATE "expenses" SET "icon" = '👨🏻‍🦰' WHERE "name" = 'Solaih';
UPDATE "expenses" SET "icon" = '🧔🏻‍♂️' WHERE "name" = 'Dar';
