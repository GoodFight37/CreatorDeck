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
| `npm run android:debug` | `android:sync` puis Gradle `assembleDebug` (APK de test, signé debug) |
| `npm run android:apk` | `android:sync` puis Gradle `assembleRelease` (non signé sans `signingConfigs`) |
| `npm run assets:regen` | (re)télécharge les 500 portraits en 600×600 (`scripts/regen-avatars.mjs`) |

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
public/creators/         500 portraits (600×600 via `npm run assets:regen`)
scripts/                 génération des données et des avatars (scripts/lib/avatars.mjs = pipeline image)
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
npm run android:sync     # 1. build web + copie dans android/app/src/main/assets/public
npm run android:debug    # 2a. APK de test : android/app/build/outputs/apk/debug/app-debug.apk
npm run android:apk      # 2b. APK release : android/app/build/outputs/apk/release/
npm run android:open     # ou Android Studio : Build > Generate Signed App Bundle / APK
```

**Toujours lancer `npm run android:sync` avant Gradle** (ou avant d'ouvrir
Android Studio après un `git clone`) : `cap sync` génère des fichiers dont
Gradle a besoin et qui ne sont pas versionnés — le module
`android/capacitor-cordova-android-plugins/`, `android/app/capacitor.build.gradle`
et le contenu web `android/app/src/main/assets/public/`. Sans eux, la
configuration Gradle échoue (« Project with path ':capacitor-cordova-android-plugins'
could not be found », `index.html` absent…). Les scripts `android:debug` /
`android:apk` refusent d'ailleurs de démarrer tant que ces fichiers manquent.

Chaîne d'outils (celle livrée par Capacitor 8.5) :

- **JDK 21** : sélectionné automatiquement par Gradle
  (`android/gradle/gradle-daemon-jvm.properties`, téléchargement via foojay si
  aucun JDK 21 n'est installé). Ne mets pas de `org.gradle.java.home` dans
  `android/gradle.properties` (chemin propre à ta machine) ; si tu y tiens,
  place-le dans `~/.gradle/gradle.properties`, hors du dépôt.
- **AGP 8.13 / Gradle 8.14.3** (`android/build.gradle`,
  `gradle-wrapper.properties`). Si Android Studio propose l'*AGP Upgrade
  Assistant* vers AGP 9, **décline** : Capacitor 8 n'est pas compatible (AGP 9
  est la cible de Capacitor 9, passage prévu via `npx cap migrate`).
- Le SDK Android (`compileSdk 36`) s'installe depuis Android Studio ; en ligne
  de commande, `android/local.properties` (ignoré par Git) ou `ANDROID_HOME`
  doit pointer dessus.

Publication :

- `android/` est un projet Capacitor standard (Gradle). Les fichiers générés
  par `cap sync` (`assets/public`, `capacitor.config.json`,
  `capacitor-cordova-android-plugins/`) ne sont pas versionnés.
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

- Le CDN Twitch sert chaque photo de profil en tailles fixes (28 → **600 px**) :
  l'URL renvoyée par les API se termine par `-300x300.png`, et la variante
  `-600x600.png` existe pour la quasi-totalité des chaînes. **Les portraits sont
  donc encodés en 600×600** (`scripts/lib/avatars.mjs`, pipeline commun aux
  trois scripts) — jamais agrandis artificiellement : une source qui n'existe
  qu'en 300 px reste en 300 px.
- Côté affichage, la photo est une **fenêtre carrée calée sur la largeur de la
  carte** (et non étirée sur toute sa hauteur) : c'est la taille minimale utile.
  Sur un écran 3x, la carte de révélation (~265 px CSS) affiche ~800 px
  physiques ; une source 600 px y est agrandie de 1,3× seulement, contre 3,7×
  avec l'ancien montage 300 px plein cadre.
- `npm run assets:regen` met à jour `public/creators/` (reprenable : un portrait
  déjà en 600 px est ignoré, `--force` pour tout ré-encoder). Le rapport va dans
  `reports/` (non versionné). Compter ~20 Mo pour les 500 fichiers.
- `scripts/build-top500-fr.mjs` reconstruit `src/data/creators.json` depuis
  l'API GQL de Twitch (Client-ID public du site web : non officiel, peut casser
  sans préavis) ; `scripts/sync-creator-avatars.mjs` peut utiliser l'API Helix
  officielle si `TWITCH_CLIENT_ID` / `TWITCH_CLIENT_SECRET` sont renseignés.
