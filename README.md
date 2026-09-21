# Budget & Crédits

Application web personnelle de suivi du salaire, des dépenses (permanentes,
temporaires) et des crédits, avec calculs automatiques et prévisions
mensuelles. Interface en français, mobile-first, montants en MAD/DH.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS
- Radix UI primitives + Lucide icons
- better-sqlite3 (base de données locale persistante, fichier `data/app.db`)
- PWA (manifest + service worker basique)

## Démarrer

```bash
npm install
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

Au premier lancement, la base est automatiquement créée et pré-remplie avec
les données de départ (salaire 5 500 DH, crédit Dnya, Zineb, Tomobil, Makla,
Abonnements, Dar, Solaih).

## Architecture

- `src/lib/db.ts` — connexion SQLite + création du schéma + seed initial.
- `src/lib/repository.ts` — accès aux données (CRUD dépenses, réglages, export/import).
- `src/lib/engine.ts` — moteur de calcul pur (échéancier des crédits, totaux
  mensuels, prévisions). Rien n'est codé en dur : tout est dérivé des
  dépenses et du salaire enregistrés.
- `src/app` — pages (Accueil, Crédits, Budget mensuel, Timeline, Réglages,
  ajout/édition de dépense) et routes API (`/api/expenses`, `/api/settings`,
  `/api/export`, `/api/import`).

La couche de données est isolée dans `repository.ts`, ce qui permet de la
remplacer par Supabase plus tard sans toucher au moteur de calcul ni à
l'interface.

## Sauvegarde

Depuis Réglages : export JSON complet (dépenses + réglages) et import JSON
(remplace les données actuelles).
