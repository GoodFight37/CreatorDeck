# CreatorDeck — collectionne les créateurs francophones

PWA de cartes à collectionner façon TCG basée sur le Top 500 Twitch FR.
Next.js 16 (App Router) · React 19 · Tailwind CSS 4 · Drizzle ORM + PostgreSQL.

## Prérequis

- Node.js ≥ 20
- Un serveur PostgreSQL (ex. `postgresql://postgres:postgres@127.0.0.1:5432/app_db`)

## Démarrage rapide

```bash
npm install
cp .env.example .env        # puis renseigner DATABASE_URL
npm run db:migrate          # crée les tables (players, player_cards, pack_openings)
npm run dev                 # http://localhost:3000
```

Sans `DATABASE_URL`, l'app lève une erreur à l'import (`src/db/index.ts`) et l'UI
affiche « Connexion impossible ».

## Scripts

| Commande | Rôle |
|---|---|
| `npm run dev` / `build` / `start` | cycle de vie Next.js |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Vitest (logique de tirage, régénération des boosters) |
| `npm run db:generate` | génère les migrations Drizzle dans `drizzle/` |
| `npm run db:migrate` | applique les migrations (`scripts/db-migrate.mjs`) |
| `npm run db:push` | pousse le schéma sans fichier de migration |
| `npm run assets:regen` | régénère les 500 portraits 300×300 (`scripts/regen-avatars-300.mjs`) |

## Images des créateurs

- Le CDN Twitch ne sert **jamais plus de 300×300** (`profileImageURL(width: 300)`).
  C'est la résolution native conservée partout ; au-delà de ~150 px CSS sur écran
  Retina, aucune image Twitch ne peut être parfaitement nette.
- `scripts/regen-avatars-300.mjs` télécharge/encode les 500 portraits en 300×300
  (reprenable ; génère un portrait de secours pour une chaîne disparue).
  Les rapports vont dans `reports/` (hors `public/`, donc non exposés).
- Les poids affichés dans « APK & Profil » sont mesurés sur les fichiers réels via
  `GET /api/downloads` — plus de valeurs codées en dur.

## Structure

```
src/app            pages + routes API (game, packs, health, downloads)
src/components     UI (creator-deck-app, creator-card)
src/lib            logique métier (catalog, game-service, player-session)
src/db             schéma + connexion Drizzle
src/data           creators.json (500 créateurs)
scripts/           génération des données, avatars, APK & assets
drizzle/           migrations SQL
reports/           artefacts de génération (non servis)
```

## Livrables Android

`scripts/build-apk-and-assets.mjs` produit `public/downloads/creatordeck-top500.apk`
et le pack d'assets. Les portraits embarqués dans `photos.js` sont en 300×300
(`APK_PHOTO_SIZE` en haut du script) — contrepartie : `photos.js` ≈ 9 Mo.
