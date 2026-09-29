-- User request: Zineb is a credit (money owed to someone), not an expense
-- linked to Dnya, and it ends in February 2027. Total to repay = monthly
-- amount x months from its start month through 2027-02. The link concept is
-- dropped altogether, so every link is cleared.

-- Existing month payments become credit installments (slots), in order.
UPDATE "payments" p
SET "slotIndex" = sub.rn
FROM (
  SELECT pay."id", ROW_NUMBER() OVER (ORDER BY pay."monthKey", pay."createdAt") AS rn
  FROM "payments" pay
  JOIN "expenses" e ON e."id" = pay."expenseId"
  WHERE e."name" = 'Zineb' AND e."type" <> 'credit' AND pay."slotIndex" IS NULL
) sub
WHERE p."id" = sub."id";

UPDATE "expenses"
SET "type" = 'credit',
    "frequency" = 'monthly',
    "endDate" = NULL,
    "linkedExpenseId" = NULL,
    "creditInitialAmount" = "amount" * GREATEST(1,
      (2027 * 12 + 2)
      - (CAST(SUBSTRING("startDate", 1, 4) AS INTEGER) * 12 + CAST(SUBSTRING("startDate", 6, 2) AS INTEGER))
      + 1)
WHERE "name" = 'Zineb' AND "type" <> 'credit';

UPDATE "expenses" SET "linkedExpenseId" = NULL WHERE "linkedExpenseId" IS NOT NULL;
