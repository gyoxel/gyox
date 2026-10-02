-- Day of the month the salary arrives (drives the countdown on Accueil).
ALTER TABLE "settings" ADD COLUMN "payDay" INTEGER NOT NULL DEFAULT 1;
