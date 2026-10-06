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
| `npm run catalog:ci` | contrôle renforcé utilisé par la CI Android : portrait manquant ou orphelin = échec (voir « Embarquer le catalogue dans l'APK ») + vérifie que `0003_catalogue.sql` est à jour |
| `npm run assets:regen` | complète les portraits manquants ; `--prune` supprime les orphelins avant un commit |
| `npm run supabase:catalogue` | régénère `supabase/migrations/0003_catalogue.sql` depuis `src/data/creators.json` (fichier de données à coller dans le SQL Editor de Supabase) |

## Architecture

```
src/lib/catalog.ts       catalogue (créateurs, raretés, boosters, économie) + constantes d'UI
src/lib/pull-rates.ts    lecture des tables de tirage + calcul des probabilités publiées
src/lib/seasons.ts       saisons de collection (complétion par famille de langue)
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
supabase/migrations/     SQL à coller dans le SQL Editor de Supabase (0001 à 0008)
supabase/functions/     Edge Function `refresh-live` : seul endroit qui connaît le secret Twitch
public/creators/         portraits (600×600 via `npm run assets:regen`)
scripts/                 génération des données et des avatars (scripts/lib/ = pipeline
                         image, échelle de raretés), build du catalogue,
                         seed Supabase (build-supabase-catalogue.mjs)
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
- **Saisons** (écran Objectifs) : les créateurs sont répartis en familles **par
  langue de diffusion** (`src/data/seasons.config.json`, 9 familles + « Sans
  frontière »). Pourquoi la langue : un streameur change de jeu toutes les
  semaines, pas de langue, et Twitch ne publie aucun jeu pour une chaîne hors
  direct — c'est le seul axe qui reste juste pour les 1000 chaînes. Chaque
  famille est jalonnée de **quatre paliers** (Bronze → Arc-en-ciel, à
  25/50/75/100 %) qui créditent leurs points en cours de route ; le dernier
  palier donne les sabliers et l'**emblème** de la famille (un monogramme coloré
  dérivé de la famille, affiché dans le bandeau « Emblèmes »).
- **Une famille trop grande est découpée**, jamais supprimée : l'anglophonie
  réunit plusieurs centaines de chaînes et devient `S04-1`, `S04-2`…, par ordre
  de classement — la première vague d'une famille, ce sont ses têtes d'affiche.
  Les vagues gardent l'identité de leur famille : **une seule teinte, un seul
  emblème, un seul thème** — l'emblème s'obtient quand toutes les vagues de la
  famille sont refermées. Le découpage vit dans `scripts/lib/seasons-split.mjs`,
  partagé par l'application et par `npm run catalog:check`, donc le rapport ne
  peut pas afficher autre chose que ce que l'application fait.
- La répartition des paliers est vérifiée par les tests : leur somme vaut
  exactement l'ancienne récompense unique, donc l'économie du jeu ne bouge pas.
- **« Perfect »** : avec une probabilité faible (pour mille, déclarée dans les
  tables), un booster bascule entièrement en cartes Épique ou mieux. Le tirage
  devient un moment rare, pas une promesse marketing : il est à **1 ‰** depuis
  le 6 oct. 2026 (un booster sur mille ; c'était un sur deux-cents).
- **L'ordre de révélation compte** : le slot garanti — Rare ou mieux, variante
  Live — ferme toujours le booster, dans le moteur local comme dans
  `open_pack()`. Aucun mélange après tirage : la dernière carte est le moment
  fort de l'ouverture, et l'écran la nomme.
- **Jalons du collectionneur** (écran Objectifs) : quatre jalons — premier
  booster, 5 % puis 20 % du catalogue, catalogue complet — chacun payé **une
  fois** (+40 points et 1 sablier, +150 et 1, +500 et 2, +3 000 et 10). Les
  seuils vivent dans `MILESTONES` (`src/lib/game-engine.ts`) : l'écran ne peut
  plus annoncer un chiffre et en compter un autre.
- **Saison affichée** : la barre du haut montre la famille **que le joueur
  remplit en ce moment** (la plus avancée non terminée), pas un « S01 » écrit en
  dur — le catalogue est mondial, une partie sans carte française ne doit pas
  s'annoncer française.
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
- **Sons** : synthétisés en Web Audio (`src/lib/sfx.ts`) — ouverture de booster,
  accord qui monte avec la rareté, carillon de palier. Aucun fichier, aucun
  octet ajouté à l'APK, aucune licence ; bouton on/off dans le profil.
- **Thèmes de collection** (Profil → Thème) : chaque famille complétée débloque
  la teinte de son emblème, et toutes les compléter débloque « Grand chelem ».
  Un thème repeint toute l'application — fond, panneaux, bordures, textes,
  accents, dégradés — via ~20 variables CSS dérivées de la teinte de la famille
  (`src/lib/cosmetics.ts`) : aucune image, aucun téléchargement, et un thème
  verrouillé retombe sur le thème d'origine même dans une sauvegarde trafiquée.
  `globals.css` ne code plus aucune couleur d'interface en dur ; les seules
  couleurs figées sont celles qui portent un sens (or des légendaires, vert de
  réussite, rouge d'erreur, couleurs de rareté).

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
- L'identifiant **`com.creatordeck.app`** (`capacitor.config.ts`, `build.gradle`,
  `strings.xml`, package Java) est fixé depuis le 6 oct. 2026 : il ne changera
  plus. En changer obligerait Android à voir une **autre application** — la
  partie locale de l'appareil serait perdue (la collection du cloud, elle,
  reste accessible en se reconnectant).

Le même export `out/` est aussi une PWA installable (manifeste inclus) ; pour
un usage hors ligne dans le navigateur, il faudra ajouter un service worker
(non inclus pour l'instant — l'APK, lui, embarque tout).

## Compte, cloud et classement (facultatif)

L'application est jouable **sans aucun serveur** : partie dans le
`localStorage`, catalogue embarqué. Le cloud (Supabase) ajoute six choses :
un compte (invité par défaut, e-mail + code à 6 chiffres en option), la
sauvegarde pour retrouver sa partie sur un autre appareil, une vitrine de quatre
cartes sur le profil public, un classement mondial recalculé par le serveur,
le **tirage des boosters décidé par le serveur** (les cartes sont
infalsifiables, prérequis des échanges) et les **échanges de cartes** entre
joueurs.
Marche à suivre : **`docs/cloud-supabase.md`**.

### Le tirage est décidé par le serveur

Quand le cloud est configuré, ouvrir un booster demande une connexion : la
fonction `open_pack()` de Supabase tire les 5 cartes avec le même algorithme
que le moteur local, et le client ne peut ni les choisir ni les inventer. Hors
ligne, le bouton « Ouvrir un booster » explique qu'il faut se connecter (avec
un raccourci vers l'écran Compte) — **pas de repli silencieux**.

Dès qu'un compte est connecté, la réserve affichée est celle du serveur :
`pack_status()` la relit sans rien consommer (compteur et date du prochain
booster ne dépendent plus de l'horloge de l'appareil). Le sablier, qui ne sait
avancer qu'une réserve locale, est donc désactivé quand le cloud est configuré ;
il reste utilisable dans les builds sans cloud (dev, tests).

Hors périmètre (volontaire) : les points, l'XP et le niveau restent calculés
sur l'appareil ; seul le contenu des boosters (et donc les cartes) devient
serveur.

### Les échanges sont tranchés par le serveur

Profil → **Échanges** : cherche un joueur par son pseudo, choisis une de tes
cartes et une carte qu'il possède (l'app demande au serveur les variantes qu'il
a pour ce créateur), puis propose. Une carte contre une carte, jusqu'à cinq de
chaque côté.

Rien de tout cela n'est décidé par les téléphones : `respond_trade()`
(`supabase/migrations/0005_echanges.sql`) relit les deux collections, retire les
cartes données et ajoute les cartes reçues **dans la même transaction**, sous
verrou. Si une carte a disparu entre-temps, l'exception annule tout : personne
ne perd rien. Les points, l'XP, le niveau et les boosters ne bougent pas — un
troc ne fait que déplacer des cartes, et les cartes reçues portent un numéro
d'échange qui empêche de l'appliquer deux fois. Une carte épinglée qui part en
échange quitte la vitrine publique (elle n'y serait plus défendable). La collection des autres joueurs
reste privée : le serveur ne dit que les variantes possédées d'un créateur
donné, jamais la collection entière.

### Le profil public et le classement enrichi

Touche une ligne du classement : la fiche du joueur s'ouvre en plein écran —
vitrine, **complétion du catalogue** (« 137 / 1000 », le serveur fait la
division), rang (complétion et total de cartes), répartition par rareté
(« 12 / 50 légendaires »), cartes, Holo et Gold. Un bouton fabrique une
**affiche de partage** (1080×1350) directement sur l'appareil : pas besoin d'un
serveur pour une image dynamique, le canvas s'en charge (`src/lib/poster.ts`).

Côté base, `0006_profil_public.sql` ajoute `player_profile()` et une
**projection** : `public.user_cards` reçoit une ligne par carte possédée,
recalculée par un trigger à chaque écriture de sauvegarde. La sauvegarde JSON
reste la source de vérité ; la table n'est qu'un index — RLS active, **aucune
politique**, donc aucun client ne peut la lire, seules les fonctions du serveur
la consultent. C'est elle qui portera le marché entre joueurs.

Trois garde-fous sur les chiffres publics : les compteurs ne retiennent que les
créateurs **du catalogue** (sinon 900 slugs inventés fabriquaient 90 % de
complétion), la rareté est relue au catalogue et non dans la sauvegarde, et un
joueur dont la sauvegarde est jugée invraisemblable n'est pas classé.

Le **lien de partage** est `…/?profil=<identifiant>` : un export statique ne
peut pas créer une page par joueur, donc une seule adresse avec un paramètre.
Dans l'APK, où l'app tourne sur `https://localhost`, l'écran propose l'affiche
plutôt que le lien — pour que le lien marche pour quelqu'un d'autre, il faut la
version web hébergée.

- Trois façons d'avoir un compte : **compte invité** (un appui, aucun e-mail,
  aucun SMTP — le compte vit avec la session de l'appareil) ; **invité + adresse
  et mot de passe** (« Garder ce compte », récupérable sur un autre appareil
  **sans SMTP** : le mot de passe n'envoie aucun e-mail, à condition de
  désactiver « Confirm email » côté Supabase) ; **e-mail + code à 6 chiffres**
  (récupérable aussi, mais il faut brancher un SMTP : le service d'e-mail
  intégré de Supabase est réservé aux tests). Voir « Trois façons d'avoir un
  compte » dans `docs/cloud-supabase.md`.
- **Nouveau téléphone, partie vierge** : à la connexion par mot de passe ou par
  code, si la partie locale n'a ni carte ni ouverture, la collection du cloud
  est reprise automatiquement (rien à perdre, et cela évite qu'un premier envoi
  écrase le cloud). Dès que la partie locale a servi, rien n'est remplacé sans
  un « Charger le cloud » explicite.
- Côté application : `src/lib/cloud/`
  - `config.ts` lit les deux variables publiques et désactive tout si elles
    manquent ;
  - `api.ts` est un client Supabase minimal (compte, code à 6 chiffres,
    envoi/lecture de la sauvegarde, classement) — pas de SDK embarqué dans
    l'APK ;
  - `credentials.ts` valide l'adresse et le mot de passe côté écran (les mêmes
    règles qu'à l'inscription) et porte l'avertissement « mot de passe non
    récupérable sans SMTP » ;
  - `sync.ts` contient les décisions (envoyer, charger, ne rien faire, demander
    au joueur) sous forme de fonctions pures, testées ;
  - `cloud-store.ts` expose l'état à React et programme l'envoi automatique
    ~20 s après la dernière action quand un compte est connecté ;
  - `trades.ts` applique aux parties locales les échanges acceptés (fonctions
    pures, testées) — un troc accepté pendant que l'appareil était ailleurs
    entre dans la collection au chargement suivant ;
  - `transport.ts` envoie les appels par le client HTTP natif dans l'APK
    (le WebView sert l'app depuis `https://localhost`, origine que Supabase peut
    refuser en CORS) et par `fetch` dans le navigateur.
  - `public/diagnostic.html` rejoue les appels un par un pour situer une panne
    (voir la fin de `docs/cloud-supabase.md`).
- Côté base : `supabase/migrations/0001_comptes_cloud.sql` — tables `profiles`,
  `saves`, `stats`, politiques RLS, statistiques **recalculées par le serveur**
  (on ne peut pas mentir sur les chiffres sans publier des cartes) et fonction
  `leaderboard()`. `push_save()` arbitre les conflits entre appareils.
  `supabase/migrations/0002_vitrine.sql` ajoute `set_showcase()` : la fonction
  contrôle les 4 slugs et leur possession avant de les publier sur le profil.
  `supabase/migrations/0003_catalogue.sql` peuple la table `creators` (fichier
  généré par `scripts/build-supabase-catalogue.mjs`) et la passe en lecture
  seule pour les clients. `supabase/migrations/0004_tirage.sql`
  ajoute `open_pack()` et `pack_status()` : le tirage des boosters est décidé
  par le serveur, les cartes sont infalsifiables.
  Côté comptes, l'appel `PUT /auth/v1/user` (adresse + mot de passe) et
  `POST /auth/v1/token?grant_type=password` complètent le code à 6 chiffres :
  c'est le chemin de récupération qui ne dépend d'aucun envoi d'e-mail.
  `supabase/migrations/0006_profil_public.sql` ajoute `player_profile()`, la
  projection `user_cards` (une ligne par carte, recalculée par trigger) et les
  compteurs Gold/Holo du classement.
  `supabase/migrations/0005_echanges.sql` ajoute la table `trades` (lecture
  réservée aux deux joueurs concernés, **aucune** écriture directe possible) et
  les fonctions d'échange : `search_players()`, `player_variants()`,
  `create_trade()`, `respond_trade()`, `cancel_trade()`, `list_trades()`.
  `supabase/migrations/0007_direct.sql` ajoute le **statut EN LIVE** : table
  `live_streams` (cache lisible par tous, écriture impossible depuis un client)
  et `live_publish()`, réservée au rôle de service. C'est l'Edge Function
  `refresh-live` qui interroge Twitch (jeton d'application, `GET /helix/streams`
  par lots de 100) — la clé secrète Twitch ne quitte jamais le serveur, et un
  APK se dézippe. L'app lit la table sans compte, garde un cache local daté et
  **ne montre rien au-delà de dix minutes** : un badge « en direct » périmé
  mentirait. Mise en place : `docs/cloud-supabase.md` §8, « Le direct ».
  Le catalogue porte aussi la **famille de collection** de chaque créateur
  (`region` dans `0003_catalogue.sql`) et `player_profile()` renvoie
  `by_region` : la fiche publique d'un joueur montre donc sa complétion famille
  par famille (« 97 / 402 en Anglophonie »), ce qu'aucun appareil ne peut
  calculer pour quelqu'un d'autre. `leaderboard()` accepte en plus un tri
  `family` : « qui complète le mieux l'Anglophonie ? », calculé sur `user_cards`,
  que les clients n'ont pas le droit de lire.
  Mise en place : `docs/cloud-supabase.md` §8.
  `supabase/migrations/0008_friends.sql` ajoute les **amis** : tables
  `friend_requests` et `friends` (lecture réservée aux joueurs concernés,
  aucune écriture directe), et les RPC `send`/`accept`/`reject`/`cancel`/
  `remove_friend`, `list_friends()`, `has_friendship()`. Une amitié n'existe
  qu'après **acceptation du destinataire** : un appareil ne peut pas décider
  qu'il est l'ami de quelqu'un. L'écran vit dans « Profil → Amis » ; on ajoute
  par recherche de pseudo, et l'écran recharge les listes après chaque geste
  plutôt que de les bricoler localement. Mise en place :
  `docs/cloud-supabase.md` §8, « Les amis ».
- Sans `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` (voir
  `.env.example`), tout se compile et fonctionne hors ligne : l'écran de compte
  affiche « cloud non configuré ». Ces deux valeurs sont publiques par
  conception ; la clé **`service_role`** ne doit jamais entrer dans l'app.
- Deux appareils qui ont joué en même temps : l'app ne fusionne **jamais**
  toute seule, elle propose d'envoyer la partie locale ou de charger celle du
  cloud (« Charger le cloud » demande deux appuis).

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
  Chaque chaîne est classée par **langue de diffusion** (`Stream.language`),
  avec repli sur le groupe de la liste curée hors direct : les familles de
  saisons sont des langues, jamais des genres de jeu. Le jeu joué n'est affiché
  que s'il a été observé en direct — hors direct, l'étiquette vaut « Variété &
  Live » (`scripts/lib/regions.mjs`, testé).
