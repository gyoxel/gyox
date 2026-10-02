-- Solde starts from what's already there: the salary already confirmed
-- received (in its account, dated on its pay day), and the expenses paid
-- since that pay day before cash / card was asked (counted in the salary's
-- account; changeable on the expense).
INSERT INTO "salary_receipts" ("id", "period", "amount", "method", "createdAt")
SELECT
    gen_random_uuid()::text,
    s."salaryReceivedMonth",
    GREATEST(0, s."salary" - COALESCE((SELECT SUM(a."amount") FROM "salary_advances" a WHERE a."period" = s."salaryReceivedMonth"), 0)),
    s."salaryMethod",
    to_char(
        to_date(s."salaryReceivedMonth", 'YYYY-MM')
            + (LEAST(s."payDay", EXTRACT(DAY FROM to_date(s."salaryReceivedMonth", 'YYYY-MM') + INTERVAL '1 month - 1 day')::int) - 1),
        'YYYY-MM-DD'
    ) || 'T08:00:00.000Z'
FROM "settings" s
WHERE s."salaryReceivedMonth" IS NOT NULL
ON CONFLICT ("period") DO NOTHING;

UPDATE "payments" p
SET "method" = s."salaryMethod"
FROM "settings" s
JOIN "salary_receipts" r ON r."period" = s."salaryReceivedMonth"
WHERE p."method" IS NULL AND p."paidAt" >= r."createdAt";
