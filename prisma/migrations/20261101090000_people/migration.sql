-- CreateTable
CREATE TABLE "people" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TEXT NOT NULL,
    "userId" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "people_pkey" PRIMARY KEY ("userId","id")
);

-- AddForeignKey
ALTER TABLE "people" ADD CONSTRAINT "people_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Everyone already lent to or borrowed from (loans, debts), once per name,
-- the most recent first.
INSERT INTO "people" ("id", "name", "position", "createdAt", "userId")
SELECT gen_random_uuid()::text, "name", (ROW_NUMBER() OVER (PARTITION BY "userId" ORDER BY "last" DESC) - 1)::int, to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), "userId"
FROM (
  SELECT "userId", MIN(TRIM("name")) AS "name", MAX("at") AS "last"
  FROM (
    SELECT "userId", "name", "createdAt" AS "at" FROM "loans"
    UNION ALL
    SELECT "userId", "name", "createdAt" AS "at" FROM "expenses" WHERE "type" = 'credit'
  ) AS used
  WHERE TRIM("name") <> '' AND "userId" <> ''
  GROUP BY "userId", LOWER(TRIM("name"))
) AS names;
