# CreatorDeck — collectionne les créateurs francophones

Jeu mobile de cartes à collectionner façon TCG basé sur le Top 500 Twitch FR.
**100 % hors ligne** : la logique de jeu tourne sur l'appareil et la
progression est sauvegardée localement — aucun compte, aucun serveur.

Next.js 16 (App Router, export statique) · React 19 · Tailwind CSS 4 ·
Capacitor 8 (Android) · Vitest.

## Prérequis

- Node.js ≥ 20
- Pour l'APK Android : Android Studio (ou le SDK + JDK 21) — voir plus bas.

## Démarrage rapide

```bash
npm install
npm run dev        # http://localhost:3000 (rechargement à chaud)
```

Aucune variable d'environnement n'est nécessaire pour l'application.
`.env.example` ne concerne que le script optionnel de synchronisation des avatars.

## Scripts

| Commande | Rôle |
|---|---|
| `npm run dev` | serveur de développement Next.js |
| `npm run build` | export statique dans `out/` (PWA + source de l'APK) |
| `npm run start` | sert `out/` tel qu'il sera embarqué (`serve`) |
| `npm run lint` / `typecheck` / `test` | ESLint · `tsc --noEmit` · Vitest (moteur, sauvegarde, store) |
| `npm run android:sync` | `build` puis copie `out/` dans le projet Android (`cap sync`) |
| `npm run android:open` | ouvre `android/` dans Android Studio |
| `npm run android:apk` | `android:sync` puis `./gradlew assembleRelease` |
| `npm run assets:regen` | régénère les 500 portraits 300×300 (`scripts/regen-avatars-300.mjs`) |

## Architecture

```
src/lib/catalog.ts       catalogue (500 créateurs, raretés, boosters) + constantes d'UI
src/lib/random.ts        aléa cryptographique portable (Web Crypto)
src/lib/game-engine.ts   moteur de jeu PUR : tirage, recharge, XP, sabliers
src/lib/save-store.ts    (dé)sérialisation + validation de la sauvegarde
src/lib/game-store.ts    store client : charge, applique le moteur, persiste (localStorage)
src/hooks/use-game.ts    liaison React (useSyncExternalStore) + horloge
src/components/          UI (creator-deck-app, creator-card)
src/app/                 layout, page, styles globaux
src/data/creators.json   les 500 créateurs
public/creators/         500 portraits 300×300
scripts/                 génération des données et des avatars
android/                 projet Capacitor Android
```

Principes :

- **Le moteur est pur et isomorphe** (`game-engine.ts`) : chaque fonction
  prend un état + un instant `now` et renvoie un nouvel état. Il ne dépend ni
  de Node, ni du DOM, ni du stockage, ce qui le rend testable unitairement et
  réutilisable côté serveur si un mode en ligne (sauvegarde cloud, classement)
  voit le jour.
- **La sauvegarde est locale et versionnée** (`creatordeck.save.v1`), validée
  au chargement (valeurs bornées, cartes inconnues ignorées). L'onglet Profil
  permet de la copier / importer (transfert entre téléphones) et de la
  réinitialiser.
- **La recharge des boosters est calculée à la lecture** : les boosters
  « arrivent » même si l'app était fermée. Un recul de l'horloge de l'appareil
  ne crédite rien.

## Application Android (Capacitor)

```bash
npm run android:sync     # build web + copie dans android/app/src/main/assets/public
npm run android:open     # puis Build > Generate Signed App Bundle / APK dans Android Studio
# ou, en ligne de commande :
npm run android:apk      # android/app/build/outputs/apk/release/
```

- `android/` est un projet Capacitor standard (Gradle). Les fichiers générés
  par `cap sync` (`assets/public`, `capacitor.config.json`) ne sont pas versionnés.
- Pour publier, crée une **clé de signature de release** et configure-la dans
  `android/app/build.gradle` (`signingConfigs`) ; ne commite jamais le keystore.
- Les APK/AAB produits sont à distribuer via **GitHub Releases**, pas dans Git
  (`*.apk`, `*.aab` et `public/downloads/` sont ignorés).
- L'identifiant `com.monnom.monapp` (`capacitor.config.ts`, `build.gradle`,
  `strings.xml`, package Java) est un nom provisoire : à fixer **avant** la
  première publication, il ne pourra plus changer ensuite.

Le même export `out/` est aussi une PWA installable (manifeste inclus) ; pour
un usage hors ligne dans le navigateur, il faudra ajouter un service worker
(non inclus pour l'instant — l'APK, lui, embarque tout).

## Images des créateurs

- Le CDN Twitch ne sert **jamais plus de 300×300** (`profileImageURL(width: 300)`).
  C'est la résolution native conservée partout ; au-delà de ~150 px CSS sur écran
  Retina, aucune image Twitch ne peut être parfaitement nette.
- `scripts/regen-avatars-300.mjs` télécharge/encode les 500 portraits en 300×300
  (reprenable ; génère un portrait de secours pour une chaîne disparue).
  Les rapports vont dans `reports/` (non versionné).
- `scripts/build-top500-fr.mjs` reconstruit `src/data/creators.json` depuis
  l'API GQL de Twitch (Client-ID public du site web : non officiel, peut casser
  sans préavis) ; `scripts/sync-creator-avatars.mjs` peut utiliser l'API Helix
  officielle si `TWITCH_CLIENT_ID` / `TWITCH_CLIENT_SECRET` sont renseignés.
