-- Historique: what was done in the app, the last 60 per user.
CREATE TABLE "activities" (
    "id" TEXT NOT NULL,
    "at" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DOUBLE PRECISION,
    "detail" TEXT,
    "userId" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "activities_pkey" PRIMARY KEY ("userId","id")
);

CREATE INDEX "activities_userId_at_idx" ON "activities"("userId", "at");

ALTER TABLE "activities" ADD CONSTRAINT "activities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
