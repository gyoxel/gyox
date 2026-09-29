-- User request: money owed to people shows the person as its icon
-- (displayIcon puts a credit's / credit-linked expense's own icon first).
UPDATE "expenses" SET "icon" = '👩' WHERE "name" IN ('Dnya', 'Zineb');
UPDATE "expenses" SET "icon" = '👨' WHERE "name" = 'Solaih';
UPDATE "expenses" SET "icon" = '👵👴' WHERE "name" = 'Dar';
