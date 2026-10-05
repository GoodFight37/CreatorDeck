# CreatorDeck — collectionne les créateurs Twitch

Jeu mobile de cartes à collectionner façon TCG basé sur le classement Twitch
(périmètre configurable : monde entier par défaut, ou une langue précise).
**100 % hors ligne** : la logique de jeu tourne sur l'appareil et la
progression est sauvegardée localement — aucun compte, aucun serveur.
Boosters aux **taux de drop publiés**, événement « Perfect », atelier de
recyclage/artisanat et saisons de collection.

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
| `npm run assets:regen` | (re)télécharge les portraits en 600×600 (`scripts/regen-avatars.mjs`) |
| `npm run catalog:build` | valide les données du jeu et publie `dist/catalog/` (catalogue compact + métadonnées de version) |
| `npm run catalog:check` | validation seule des données, sans écriture (CI) |
| `npm run catalog:source` | régénère `src/data/creators.json` + les portraits depuis Twitch — **Top 1000 mondial** par défaut (`--count N`, `--languages FR` pour restreindre ; **sous Windows, passer par les variables d'environnement**, voir `docs/catalogue-twitch.md`) |
| `npm run catalog:ci` | contrôle renforcé utilisé par la CI Android : portrait manquant ou orphelin = échec (voir « Embarquer le catalogue dans l'APK ») |
| `npm run assets:regen` | complète les portraits manquants ; `--prune` supprime les orphelins avant un commit |

## Architecture

```
src/lib/catalog.ts       catalogue (créateurs, raretés, boosters, économie) + constantes d'UI
src/lib/pull-rates.ts    lecture des tables de tirage + calcul des probabilités publiées
src/lib/seasons.ts       saisons de collection (complétion par famille de jeux)
src/lib/random.ts        aléa cryptographique portable (Web Crypto)
src/lib/game-engine.ts   moteur de jeu PUR : tirage, recharge, XP, sabliers
src/lib/save-store.ts    (dé)sérialisation + validation de la sauvegarde
src/lib/game-store.ts    store client : charge, applique le moteur, persiste (localStorage)
src/hooks/use-game.ts    liaison React (useSyncExternalStore) + horloge
src/components/          UI (creator-deck-app, creator-card, atelier-view,
                         seasons-section, pack-odds-sheet)
src/app/                 layout, page, styles globaux
src/data/creators.json   les créateurs du catalogue (Top 1000 mondial aujourd'hui)
src/data/pull-rates.json les tables de tirage par slot (source des taux publiés)
src/data/seasons.config.json le découpage des saisons
src/data/catalog.config.json taille attendue du catalogue (vérifiée par catalog:check)
public/creators/         portraits (600×600 via `npm run assets:regen`)
scripts/                 génération des données et des avatars (scripts/lib/ = pipeline
                         image, échelle de raretés), build du catalogue
docs/taux-de-drop.md     comment lire, vérifier et modifier les taux de drop
docs/catalogue-twitch.md construire le catalogue : périmètre, taille, budget images, runbook
android/                 projet Capacitor Android
```

Principes :

- **Le moteur est pur et isomorphe** (`game-engine.ts`) : chaque fonction
  prend un état + un instant `now` et renvoie un nouvel état. Il ne dépend ni
  de Node, ni du DOM, ni du stockage, ce qui le rend testable unitairement et
  réutilisable côté serveur si un mode en ligne (sauvegarde cloud, classement)
  voit le jour.
- **La sauvegarde est locale et versionnée** (`creatordeck.save.v2`), validée
  au chargement (valeurs bornées, cartes inconnues ignorées). Les sauvegardes
  v1 sont **migrées automatiquement** (aucune collection perdue) puis relues
  sous la nouvelle clé. L'onglet Profil permet de la copier / importer
  (transfert entre téléphones) et de la réinitialiser.
- **Ni taille ni périmètre codés en dur** : libellés, métadonnées, audience,
  jalons d'objectifs et raretés dérivent du catalogue et de
  `src/data/catalog.config.json` (`CATALOG_SIZE`, `CATALOG_SCOPE`,
  `scripts/lib/rarity-ladder.mjs`). Basculer du Top 500 FR au Top 2000 mondial
  est un changement de données — voir `docs/catalogue-twitch.md`.
- **Les probabilités sont des données, pas du code** : le tirage lit
  `src/data/pull-rates.json` (une table par slot, slot garanti, événement
  « Perfect ») et l'écran « Taux de drop » recalcule ses chiffres depuis le
  même fichier — impossible que l'affichage mente sur le moteur.
- **La recharge des boosters est calculée à la lecture** : les boosters
  « arrivent » même si l'app était fermée. Un recul de l'horloge de l'appareil
  ne crédite rien.

## Économie, saisons et taux de drop

- **Atelier** (onglet dédié) : les doublons se recyclent en points, les points
  rejoignent un créateur manquant. Un doublon vaut toujours moins que le coût
  d'artisanat de sa rareté, et les **Légendaires ne s'artisanent pas** — elles
  se méritent en booster, comme les raretés hautes non échangeables de TCG
  Pocket.
- **Saisons** (écran Objectifs) : les créateurs sont répartis en familles de
  jeux (`src/data/seasons.config.json`, 7 groupes aujourd'hui). Chaque famille
  est jalonnée de **quatre paliers** (Bronze → Arc-en-ciel, à 25/50/75/100 %)
  qui créditent leurs points en cours de route ; le dernier palier donne les
  sabliers et l'**emblème** de la famille (un monogramme coloré dérivé de la
  famille, affiché dans le bandeau « Emblèmes »).
- **Une famille trop grande est découpée**, jamais supprimée : en périmètre
  mondial, « Accueil & IRL » réunit plus de 150 créateurs et devient
  `S01-1`/`S01-2`, le fourre-tout « Découverte » se découpe par paquets de 60.
  Les morceaux gardent l'identité de leur famille : **une seule teinte, un seul
  emblème, un seul thème** — l'emblème s'obtient quand tous les morceaux de la
  famille sont refermés. Le découpage vit dans `scripts/lib/seasons-split.mjs`,
  partagé par l'application et par `npm run catalog:check`, donc le rapport ne
  peut pas afficher autre chose que ce que l'application fait.
- La répartition des paliers est vérifiée par les tests : leur somme vaut
  exactement l'ancienne récompense unique, donc l'économie du jeu ne bouge pas.
- **« Perfect »** : avec une probabilité faible (pour mille, déclarée dans les
  tables), un booster bascule entièrement en cartes Épique ou mieux. Le tirage
  devient un moment rare, pas une promesse marketing.
- **Taux publiés** : `docs/taux-de-drop.md` explique comment lire et modifier
  les tables, et pourquoi les publier (Google Play et l'App Store imposent la
  divulgation des probabilités des objets aléatoires). Les chiffres affichés
  sont calculés à la volée par `src/lib/pull-rates.ts`.
- **Studio de tirages** (Profil → Studio) : ouvre 25, 100 ou 500 boosters **en
  mémoire** avec le moteur du jeu et compare la répartition obtenue aux taux
  publiés (observé / attendu / écart, dont les boosters « Perfect »). Rien n'est
  écrit dans la partie — même collection virtuelle, ni cartes, ni points, ni
  statistiques. Les tests vérifient que la simulation suit bien
  `pull-rates.json` à 3 points près sur 400 boosters.
- **Thèmes de collection** (Profil → Thème) : chaque famille complétée débloque
  la teinte de son emblème, et toutes les compléter débloque « Grand chelem ».
  Un thème n'est qu'un jeu de variables CSS appliqué à l'application (fond
  compris) : aucune image, aucun téléchargement, et un thème verrouillé retombe
  sur le thème d'origine même dans une sauvegarde trafiquée.

Les tables de tirage s'inspirent du format `pullRates.json` de
[pokemon-tcg-pocket-database](https://github.com/flibustier/pokemon-tcg-pocket-database)
(licence MIT) : même vocabulaire (slot, rareté garantie, Rare Pack) appliqué au
catalogue CreatorDeck. Les paliers de saison, les cosmétiques de collection et
le studio de tirages reprennent de la même façon les **structures** observées
dans [PTCGP-Private-Server](https://github.com/Layen-lang/PTCGP-Private-Server)
(licence MIT : jalons à quatre niveaux, cosmétiques, banc d'essai d'ouvertures).
Aucune donnée, image, animation ni illustration Pokémon n'est embarquée : tout
le contenu visuel de CreatorDeck est calculé (teintes dérivées des familles,
monogrammes) ou provient des portraits Twitch.

## Application Android (Capacitor)

### Installer l'APK de test

La CI publie une **pré-release roulante**, écrasée à chaque build : un lien de
téléchargement public, sans connexion GitHub.

```url
https://github.com/GoodFight37/test/releases/download/debug-apk/creatordeck-debug.apk
```

- l'APK embarque le catalogue **committé dans la branche** : portraits compris
  (voir « Embarquer le catalogue dans l'APK » dans `docs/catalogue-twitch.md`) ;
- signature **debug** : parfait pour tester sur un téléphone (activer
  « installer des applications inconnues »), **pas** publiable sur le Play Store ;
- reconstruit à chaque push sur `main` (`.github/workflows/android-apk.yml`) et
  à chaque déclenchement manuel ;
- l'artefact du run (`creatordeck-debug-apk`) reste disponible dans l'onglet
  Actions, mais son téléchargement exige d'être connecté à GitHub.

```bash
# déclencher un build à la demande (jeton GitHub avec la permission Actions: write)
gh workflow run "APK Android (debug)" --ref main
```

### Construire soi-même

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
  `reports/` (non versionné). Compter ~34 Ko par portrait 600 px (~18 Ko en
  300 px) : le budget images est détaillé dans `docs/catalogue-twitch.md`.
- `scripts/build-twitch-catalog.mjs` reconstruit `src/data/creators.json` depuis
  l'API GQL de Twitch (Client-ID public du site web : non officiel, peut casser
  sans préavis ; `--dry-run` pour mesurer avant d'écrire, `--count N` pour la
  cible, `--languages FR` pour restreindre le périmètre) ; `scripts/sync-creator-avatars.mjs` peut utiliser l'API Helix
  officielle si `TWITCH_CLIENT_ID` / `TWITCH_CLIENT_SECRET` sont renseignés.
  Une chaîne hors direct n'a pas de catégorie observable : son dernier jeu
  programmé n'est gardé que s'il correspond à une famille de
  `seasons.config.json`, sinon l'entrée prend « Variété & Live »
  (`scripts/lib/curated-category.mjs`, testé).
