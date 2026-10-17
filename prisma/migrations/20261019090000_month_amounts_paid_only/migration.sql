-- "Montant d'un mois" is gone: a month is now paid in part or more as it
-- happens (payment parts). Months that were given their own amount but
-- not paid yet go back to the usual amount; paid ones keep theirs, since
-- a credit's history counts on it.
UPDATE "expenses" e
SET "monthAmounts" = (
  SELECT CASE WHEN count(*) = 0 THEN NULL ELSE jsonb_object_agg(t.key, t.value) END
  FROM jsonb_each(e."monthAmounts") AS t
  WHERE EXISTS (SELECT 1 FROM "payments" p WHERE p."expenseId" = e.id AND p."monthKey" = t.key)
)
WHERE e."monthAmounts" IS NOT NULL;
