# Budget & Crédits

Application web personnelle de suivi du salaire, des dépenses (permanentes,
temporaires) et des crédits, avec calculs automatiques et prévisions
mensuelles. Interface en français, mobile-first, montants en MAD/DH.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS
- Radix UI primitives + Lucide icons
- PostgreSQL + Prisma ORM (base de données persistante, prête pour la production)
- PWA (manifest + service worker basique)

## Démarrer en local

1. Avoir une base PostgreSQL accessible (locale ou hébergée) et définir son URL :

   ```bash
   cp .env.example .env
   # éditer .env et renseigner DATABASE_URL
   ```

2. Installer les dépendances, appliquer les migrations et semer les données de départ :

   ```bash
   npm install
   npx prisma migrate deploy
   npm run db:seed
   ```

3. Lancer le serveur de développement :

   ```bash
   npm run dev
   ```

Ouvrir [http://localhost:3000](http://localhost:3000).

Le seed initial (`prisma/seed.ts`) est idempotent : il ne remplit la base que
si elle est vide, avec les données de départ (salaire 5 500 DH, crédit Dnya,
Zineb, Tomobil, Makla, Abonnements, Dar, Solaih).

## Déploiement sur Vercel

1. Provisionner une base PostgreSQL (Vercel Postgres/Neon, Supabase, ou autre)
   et copier son URL de connexion.
2. Dans les réglages du projet Vercel, ajouter la variable d'environnement
   `DATABASE_URL` avec cette URL (Production + Preview).
   Connexion avec Google : `AUTH_GOOGLE_ID` et `AUTH_GOOGLE_SECRET` (client
   OAuth « Application Web » du projet Google Cloud `gx-salaire`, avec
   `<site>/api/auth/callback/google` dans ses URI de redirection) et
   `AUTH_SECRET` (une valeur aléatoire, qui signe les sessions).
3. Importer ce dépôt dans Vercel (Next.js est détecté automatiquement).
   `npm run build` exécute `prisma generate && next build`, et
   `postinstall` exécute déjà `prisma generate` après `npm install`.
4. Appliquer les migrations sur la base de production (une fois, ou à chaque
   déploiement si le schéma change) :

   ```bash
   npx prisma migrate deploy
   ```

   puis semer les données de départ si la base est neuve :

   ```bash
   npm run db:seed
   ```

   Ces deux commandes se lancent depuis un environnement ayant accès à la
   même `DATABASE_URL` que le déploiement Vercel (poste local avec la variable
   exportée, ou `vercel env pull` puis `vercel build`).

## Comptes

Chacun se connecte avec Google (`/connexion`) et ne voit que ses propres
données : chaque table a un `userId`, et l'extension Prisma de
`src/lib/prisma.ts` l'ajoute à chaque requête (`src/lib/user-scope.ts`). La
session est un cookie signé (`src/lib/session.ts`), vérifié par
`src/proxy.ts`. Les données d'avant les comptes appartiennent à
gyoxel@gmail.com.

## Architecture

- `prisma/schema.prisma` — modèles `Expense` et `Settings` (mêmes champs que
  `src/lib/types.ts`, dates gardées en chaînes `"YYYY-MM-DD"`).
- `prisma/seed.ts` — données de départ, idempotent.
- `src/lib/prisma.ts` — client Prisma singleton (requêtes limitées à l'utilisateur connecté).
- `src/lib/repository.ts` — accès aux données (CRUD dépenses, réglages,
  export/import), entièrement asynchrone.
- `src/lib/engine.ts` — moteur de calcul pur (échéancier des crédits, totaux
  mensuels, prévisions), indépendant de la base de données. Rien n'est codé
  en dur : tout est dérivé des dépenses et du salaire enregistrés.
- `src/app` — pages (Accueil, Crédits, Budget mensuel, Timeline, Réglages,
  ajout/édition de dépense) et routes API (`/api/expenses`, `/api/settings`,
  `/api/export`, `/api/import`).

La couche de données est isolée dans `repository.ts` : le moteur de calcul et
l'interface n'ont aucune dépendance directe à Prisma ou PostgreSQL.

## Sauvegarde

Depuis Réglages : export JSON complet (dépenses + réglages) et import JSON
(remplace les données actuelles).
