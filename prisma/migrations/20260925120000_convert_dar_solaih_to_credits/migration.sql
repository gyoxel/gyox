-- One-time data migration requested by the user: "Dar" and "Solaih" are
-- money being paid back to someone, so they become credits (shown on the
-- Crédits page). Each was a one-time temporary expense; it becomes a credit
-- of the same amount repaid in a single installment in the same month, so
-- the budget, dashboard and Disponible behave exactly as before.
-- Guarded by name + current type/frequency: a no-op if already converted,
-- renamed or edited in the meantime.

-- Existing confirmed payments move to the credit addressing scheme
-- (sequential slot) before the type changes; monthKey is kept as the month
-- the payment was recorded in, like any credit payment.
UPDATE "payments" p
SET "slotIndex" = 1
FROM "expenses" e
WHERE p."expenseId" = e."id"
  AND e."name" IN ('Dar', 'Solaih')
  AND e."type" = 'temporary'
  AND e."frequency" = 'one-time'
  AND p."slotIndex" IS NULL;

UPDATE "expenses"
SET "type" = 'credit',
    "frequency" = 'monthly',
    "creditInitialAmount" = "amount",
    "endDate" = NULL,
    "linkedExpenseId" = NULL,
    "color" = 'blue'
WHERE "name" IN ('Dar', 'Solaih')
  AND "type" = 'temporary'
  AND "frequency" = 'one-time';
