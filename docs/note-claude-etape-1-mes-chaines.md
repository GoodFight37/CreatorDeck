# Note de Claude — étape 1 « Mes chaînes » (17 octobre 2026)

Statut : **code prêt sur la branche `etape-1-mes-chaines`, non fusionné dans `main`.**
Cette note est la seule chose ajoutée sur `main`. Elle dit ce qui a été fait, pour que Codex puisse l'intégrer.

## Pour intégrer

`main` n'a pas bougé depuis la base de la branche (`c3b239e`) : une fusion simple suffit.

```
git fetch origin
git merge origin/etape-1-mes-chaines      # 2 commits : 23d1c86, 4155c55
```

Un seul écrivain par branche : rien n'a été poussé sur la branche de Codex.

## Ce qui a changé (demande : audit UX du 17 octobre, étape 1)

- **Question d'accueil** « Quelles chaînes regardes-tu déjà ? » (5 à 15 chaînes) à la place du tutoriel en 3 écrans. Réponse gardée sur l'appareil (`creatordeck.circle.v1`).
- **Premier booster tiré dans ce cercle** : 5 chaînes différentes, dernière carte Rare ou mieux *dans le cercle*. La carte enregistrée garde la rareté du catalogue (aucun effet sur l'économie) ; la rareté « du cercle » n'est qu'affichée (`DrawnCard.displayRarity`).
  - Joueur sans compte : aperçu `circlePreviewPack`, rien n'est écrit.
  - Build sans cloud : `openPack(..., { circle })` pour le tout premier booster de la partie.
  - Joueur connecté : RPC `open_circle_gift_pack`, avec repli sur `open_return_gift_pack` si le booster de cercle est déjà ouvert. Seul le 1er des 5 boosters cadeau est tiré dans le cercle.
- **Accueil épuré** quand un cercle existe : pack, bouton, 5 dernières cartes, un seul panneau « Réserve, taux et sabliers ». Sans cercle, l'ancien accueil est inchangé. Mèmes, Tribunal, objectif du jour, Scène, amis et arène ne sont plus sur l'accueil d'un joueur avec cercle.
- Le message « Malik a décidé… » n'est plus affiché.

## Fichiers

Nouveaux : `src/lib/circle.ts`, `circle-store.ts`, `circle.test.ts`, `supabase-cercle.test.ts`, `game-engine-circle.test.ts`, `ecrans-circle-pack.test.tsx`, `src/components/circle-onboarding.{tsx,css}`, `supabase/migrations/0054_cercle.sql`, `docs/plan-premiere-session.md` (sur la branche).
Modifiés : `creator-deck-app.tsx`, `drop-view.tsx`, `booster-carousel.tsx`, `reveal-overlay.tsx`, `use-pack-opening.ts`, `tutorial-pack.ts`, `game-engine.ts`, `game-store.ts`, `cloud/api/{pack,index}.ts`, `cloud/store/pack.ts`, tests `ecrans*.test.tsx`, `e2e/{fixtures,onboarding-gift,pack-crash,hourglass-online}`.

## Migration 0054 — à connaître

- **Appliquée à la main** dans le SQL Editor de la base utilisée pour l'essai, par le propriétaire du projet, sans erreur. Elle n'a été passée ni par `verify-supabase-migrations.mjs` ni par un déploiement outillé : à rejouer/valider côté dépôt.
- N'ajoute que du neuf : table `player_circles`, fonctions `_circle_tier`, `_circle_clean`, `_circle_pick`, `set_circle`, `open_circle_gift_pack`. Aucune fonction existante modifiée. Rejouable.
- Miroir TS ↔ SQL : `src/lib/supabase-cercle.test.ts`.
- **Poids du premier booster** (30/30/22/14/4 ; dernière carte 45/35/20) hors `pull-rates.json` : à publier avec les taux avant mise en ligne, et à régler à l'essai.

## Vérifié / non vérifié

Lancés et verts : `tsc --noEmit`, `eslint` (fichiers touchés), Vitest unitaire (1210 tests, avant le dernier correctif moteur), Vitest écrans (192 tests), tests moteur ciblés (106), `scripts/check-jargon.mjs`, rendu de l'écran à 390×844.
**Non lancés** : Playwright (e2e adaptés à la lecture seulement), la suite unitaire complète après le dernier correctif, le SQL via le script de vérification du dépôt, un test sur téléphone avec compte réel.

## Limites connues

- Joueurs existants sans cercle : ils gardent l'ancien accueil ; il manque un bouton « Définir mes chaînes » (l'écran sait déjà fonctionner en mode `edit`, et `set_circle` existe).
- Pour un joueur avec cercle, Tribunal/Scène/arène sont atteignables par Missions et les feuilles existantes, mais plus mis en avant.
- Jetons : accordéon imbriqué encore présent dans le panneau secondaire.

## Pas fait (étapes 2 à 5 du plan `docs/plan-premiere-session.md`, sur la branche)

Verbe « qui est en direct dans mon cercle », Binder centré sur le cercle, rétention honnête (série protégée, états vides sociaux), finition visible. Aucune de ces étapes n'est commencée dans le code.
