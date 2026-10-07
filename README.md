# CreatorDeck — collectionne les créateurs Twitch

Jeu mobile de cartes à collectionner façon TCG basé sur le classement Twitch
(1000 chaînes, périmètre configurable : monde entier par défaut, ou une langue
précise). **Le jeu se joue en ligne**, avec un compte : c'est le serveur qui
**tire les boosters** (`open_pack()`), donc les cartes ne sont pas falsifiables —
c'est le prérequis des échanges, de l'hôtel et des classements. Taux de drop
**publiés**, événement « Perfect », atelier de recyclage et d'artisanat,
saisons de collection par famille de langue.

Le cloud (Supabase) porte le jeu à plusieurs : compte (invité, e-mail ou Twitch),
sauvegarde pour retrouver sa collection sur un autre appareil, échanges entre
joueurs, amis, hôtel des ventes, carnet de notifications, **notifications de
direct** (le téléphone sonne quand un créateur de ta collection passe en live),
**Last Pack** (le paquet qu'un ami vient d'ouvrir reste exposé dix minutes),
classement mondial —
global ou par famille de collection —, profils publics avec vitrine, badge
**EN LIVE** sur les cartes des chaînes en direct, et **Arène** hebdomadaire.
Trois mécaniques de progression complètent le tirage : un **plancher de
malchance publié** (80 boosters sans Légendaire et le 5ᵉ slot en garantit une),
des **jetons** (5 par booster, 400 = la carte au choix — jamais une Légendaire),
et des **missions du jour** avec une **série de sept jours**.

**Le cloud reste facultatif à la compilation** : un build sans les deux
variables publiques (`docs/cloud-supabase.md`) se compile et se joue **seul, sur
l'appareil, sans compte** — c'est le mode de développement et des tests, où le
moteur local tire les cartes. L'APK et le site distribués, eux, sont compilés
**avec** le cloud : boosters serveur, comptes, échanges et classements.

Next.js 16 (App Router, export statique) · React 19 · Tailwind CSS 4 ·
Capacitor 8 (Android) · Supabase · Vitest · Playwright.

## Prérequis

- Node.js ≥ 20
- Pour l'APK Android : Android Studio (ou le SDK + JDK 21) — voir plus bas.

## Démarrage rapide

```bash
npm install
npm run dev        # http://localhost:3000 (rechargement à chaud)
```

Aucune variable d'environnement n'est nécessaire pour jouer : sans elles, la
partie vit sur l'appareil et l'écran de compte affiche « cloud non configuré ».
Copier `.env.example` vers `.env.local` et y coller l'**URL du projet Supabase**
et la **clé publishable** active le mode à plusieurs (comptes, sauvegarde,
échanges, hôtel, classement…) — marche à suivre : `docs/cloud-supabase.md`.

## Suivi des livraisons

**Cette section est mise à jour à chaque livraison.** C'est le suivi écrit du
projet : ce qui est livré, où c'est écrit dans le code, et ce qui reste. Si tu
reprends ce dépôt, tu sais ici ce qui est en place et à quoi t'attendre — le
détail est dans les docs citées, jamais seulement dans ce tableau.

| # | Chantier | État | Où c'est écrit |
|---|---|---|---|
| 1 | Boosters tirés côté serveur (jamais de repli silencieux hors ligne) | **livré** | `src/lib/cloud/cloud-store.ts`, § « Le tirage est décidé par le serveur » |
| 2 | Refonte & migration en ligne (échanges, classements, profils, hôtel, Twitch, carnet) | **livré** | `docs/cloud-supabase.md` § 8 et 9 |
| 3 | Audit externe | **fait** | ce README, section « Tests » |
| 4 | Refonte visuelle | **livrée** | `src/app/globals.css`, `src/lib/cosmetics.ts` |
| 5 | Twitch : statut « en direct » | **livré** | `supabase/functions/refresh-live`, `docs/cloud-supabase.md` § « Le direct » |
| 6 | Amis | **livré** | `0008_friends.sql`, `src/lib/social/` |
| 7 | Complétion par famille | **livré** | `docs/cloud-supabase.md` § « La complétion par famille » |
| 8 | Classement par famille | **livré** | `docs/cloud-supabase.md` § « Le classement par famille » |
| 9 | Carnet de notifications | **livré** | `src/lib/social/inbox.ts`, `src/components/notifications-sheet.tsx` |
| 10.1 | Direct → taux + variante Live | **livré** | `0011_direct.sql`, `src/lib/live.ts` |
| 10.2 | Last Pack (5 cartes, 10 min, un ami en vole une) | **livré** | `0012_last_pack.sql`, `src/lib/last-pack.ts` |
| 10.3 | Pity, jetons, missions, série, Prime Time | **livré** | `0013_progression.sql`, `src/lib/progression.ts` |
| 10.4 | Paquet Scène + wishlist publique épinglée | **livré** | `0014_scene_pack.sql`, `0015_wishlist.sql` |
| 10.8 | Notifications de direct (push FCM) | **livré** | `0023_notifications.sql`, `0024_push_state.sql`, `supabase/functions/notify-live`, `src/lib/push.ts` |
| 10.5 | Overlay 16:9 + révélation sadique | **livré** | `src/lib/reveal.ts`, `src/components/reveal-overlay.tsx`, `/overlay` |
| 10.6 | Catalogue désirable : Top 1000 + les Sortants | **livré** | `src/lib/retired.ts`, `0016_sortants.sql`, `docs/catalogue-twitch.md` § « Les Sortants » |
| 10.7 | Arena : 5 cartes, 1 L maximum, 1 Direct, score aux viewers réels, classement hebdo, draft du week-end | **livrée** | `src/data/arena.json`, `src/lib/arena.ts`, `0018_arena.sql`, `src/components/arena-sheet.tsx`, `docs/cloud-supabase.md` § « L'Arène » |
| 11 | Intégrité côté serveur : la sauvegarde, la réserve de boosters et les raretés déclarées ne s'écrivent plus depuis le client | **livrée** | `0019_integrite.sql`, `docs/cloud-supabase.md` § « L'intégrité côté serveur » |
| 11.1 | Deux joueurs ne portent pas le même pseudo (à une majuscule près) | **livrée** | `0020_identite.sql`, `docs/cloud-supabase.md` § « L'intégrité côté serveur » |
| 11.2 | L'ouverture d'un paquet décidée à un seul endroit (jeu **et** overlay 16:9) | **livrée** | `src/hooks/use-pack-opening.ts`, `src/components/overlay-stage.tsx` |
| 11.3 | Réveil du direct anti-course ; `?check=1` réservé au rôle de service | **livrée** | `supabase/functions/refresh-live/index.ts`, `docs/cloud-supabase.md` § « Le direct » |
| 11.4 | Provenance des cartes : le serveur sait d'où vient chaque carte (tirage, échange, hôtel, vol) | **livrée** | `0021_provenance.sql`, `docs/cloud-supabase.md` § « L'intégrité côté serveur », `scripts/verify-supabase-migrations.mjs` |
| 11.5 | Le tirage écrit la collection dans la même transaction ; le blanchiment est fermé aux quatre portes ; l'envoi de sauvegarde n'arbitre plus avec l'horloge de l'appareil | **livrée** | `0022_pack_dans_saves.sql`, `e2e/pack-crash.spec.ts`, `docs/cloud-supabase.md` § « La sauvegarde ne se perd plus (`0022`) » |
| 12 | Revue externe d'octobre 2026 | **traitée** | `docs/revue-externe-2026-10.md` : ce qui est corrigé, ce qui est refusé et pourquoi, ce qui reste ouvert |

Deux règles qui tiennent tout le reste :

- **une livraison met à jour ce tableau, la doc concernée et — s'il y a du
  SQL — la ligne de `docs/cloud-supabase.md` § 3.** Un changement qui n'est
  écrit qu'ici n'existe pas pour la personne d'après ;
- **aucun chiffre du jeu n'existe seulement dans le code** : les taux sont dans
  `src/data/pull-rates.json`, la progression dans `src/data/progression.json`,
  l'arène dans `src/data/arena.json`, et les tests vérifient que le code dit la
  même chose que ces fichiers.

## Scripts

| Commande | Rôle |
|---|---|
| `npm run dev` | serveur de développement Next.js |
| `npm run build` | export statique dans `out/` (PWA + source de l'APK) |
| `npm run start` | sert `out/` tel qu'il sera embarqué (`serve`) |
| `npm run lint` / `typecheck` / `test` | ESLint · `tsc --noEmit` · Vitest (moteur, sauvegarde, store) |
| `npm run e2e` | tests de bout en bout : le jeu dans un vrai navigateur (Playwright). Première fois : `npx playwright install chromium` |
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
| `npm run supabase:verify` | joue les migrations `0001` → `0024` sur un **Postgres jetable** et contrôle les règles côté serveur (tirage, Direct, échanges, amis, hôtel, carnet, Last Pack, pity, Paquet Scène, wishlist, Sortants, réinitialisation, Arène, intégrité, identité, provenance, tirage rangé dans la collection, blanchiment, arbitrage de l'envoi, notifications, état de l'interrupteur). Dépendances en `--no-save` : rien de plus dans l'APK ni dans la CI |

## Tests

Trois étages, trois vitesses :

* **`npm test`** (Vitest) : le moteur, la sauvegarde, les stores, les grilles de
  prix, les retours de connexion, le carnet de notifications — tout ce qui se
  calcule sans navigateur. C'est là que vit l'essentiel des règles
  (**695 tests**, 46 fichiers aujourd'hui).
* **`npm run e2e`** (Playwright) : le jeu **réellement ouvert** dans Chromium, sur
  un écran de bureau et sur un écran de téléphone (412 × 915). Cinq gestes par
  écran : les quatre onglets, le marquage de l'onglet actif, l'accès au compte
  depuis « Toi », la barre du bas toujours cliquable, et **zéro erreur console**
  sur un tour complet — une requête ratée y est nommée par son adresse, ce qui
  distingue un bug du jeu d'un réseau coupé. S'y ajoute `e2e/pack-crash.spec.ts` :
  un booster ouvert, la page rechargée, **les cinq mêmes cartes** — et, quand un
  cloud est configuré (`.env.local`), la preuve que le client ne renvoie plus sa
  collection derrière un tirage (le serveur l'a déjà écrite, `0022`).
* **`npm run supabase:verify`** (Postgres jetable) : les migrations jouées pour
  de vrai, puis rejouées — catalogue, tirage (distribution du slot garanti),
  échanges à trois joueurs, vitrine, profils, amis, hôtel des ventes, carnet,
  **bonus Direct** — poids ×1,5 vérifié sur des boosters réellement ouverts,
  variante Live impossible quand le cache est périmé — et **Last Pack** — vol
  réel des deux côtés, refus d'un inconnu, fenêtre de dix minutes, garde-fou
  contre la résurrection d'une carte volée — et le **plancher de malchance** :
  un journal amorcé à 79 boosters sans Légendaire, le 80ᵉ qui en sort une, la
  série de jours cassée puis raccommodée, la récompense du 7ᵉ jour — puis le
  **Paquet Scène** — un tirage conforme accepté, le même annoncé en Holo ou en
  Légendaire refusé, le journal qui ne fait pas monter le plancher de
  malchance — et la **wishlist** — un second épinglé qui remplace le premier,
  la lecture par un autre joueur, l'écriture directe fermée
  (**347 contrôles** aujourd'hui, dont le blanchiment fermé aux quatre portes,
  le tirage rangé dans la collection et les notifications — jetons fermés,
  intéressés seuls, une par heure).

```powershell
npm test          # rapide, à chaque changement
npm run e2e       # avant de livrer (installe d'abord : npx playwright install chromium)
```

L'aperçu du jeu est servi sur `http://localhost:3000` : si `npm run dev` tourne
déjà, la suite le réutilise au lieu d'en lancer un second.

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
src/lib/cloud/           cloud : config, client Supabase (api/, un module par
                         domaine : compte, boosters, échanges, hôtel, arène),
                         décisions de synchronisation (sync.ts), store React
                         (cloud-store.ts) qui assemble store/ (état et
                         synchronisation dans la façade, actions par domaine),
                         échanges, amis, marché, Twitch, transport HTTP, et
                         mojibake.ts (répare un message du serveur mal collé)
src/lib/social/          échanges et amis côté règles pures + carnet de
                         notifications (inbox.ts : les phrases, testées)
src/lib/market.ts        grille des prix de l'hôtel (miroir de market_payout() SQL)
src/lib/regions.ts       familles de collection (langues) et leurs teintes
src/lib/live.ts          statut EN LIVE : lecture du cache, fraîcheur, libellés
src/lib/push.ts          notifications côté appareil : permission, jeton FCM,
                         canal Android, appui sur une notification (testé)
src/lib/supabase-notify.test.ts  garde-fou : jetons fermés, fenêtres de 0023,
                         son et canal du direct, état relu en 0024,
                         Edge Function réservée au service, réglages Android
src/lib/supabase-direct.test.ts  garde-fou : les taux du Direct dans pull-rates.json
                         doivent être ceux de 0011_direct.sql
src/lib/reveal.ts        la mise en scène d'une révélation : silence, refus de
                         la dernière carte, verrou du Perfect (testé)
src/lib/last-pack.ts     Last Pack côté écran : fenêtre de dix minutes, compte
                         à rebours, ce qui reste à prendre (testé)
src/lib/supabase-last-pack.test.ts  garde-fou : le contrat entre 0012 et l'écran
src/lib/progression.ts   jetons, missions du jour, série de sept jours, Prime
                         Time (source unique : src/data/progression.json)
src/lib/supabase-progression.test.ts  garde-fou : le contrat entre 0013 et le
                         seuil publié dans pull-rates.json
src/lib/supabase-scene.test.ts  garde-fou : les poids du Paquet Scène dans
                         pull-rates.json doivent être ceux de 0014
src/lib/supabase-wishlist.test.ts  garde-fou : la wishlist de 0015 (écriture par
                         fonctions, une ligne par joueur, épinglé dans le profil)
src/lib/supabase-reset.test.ts  garde-fou : « recommencer sa partie » (0017) —
                         ce qui s'efface, ce qui survit, qui a le droit
src/lib/retired.test.ts  les Sortants : hors complétion, artisanables le temps
                         d'une édition, jamais une Légendaire
src/lib/poster.ts        affiche de partage 1080×1350 dessinée sur l'appareil
src/components/          UI (creator-deck-app, creator-card, atelier-view,
                         seasons-section, pack-odds-sheet, market-sheet,
                         notifications-sheet, friends-sheet, public-profile-sheet,
                         account-sheet, leaderboard…)
src/app/                 layout, page, styles globaux
src/data/creators.json   les créateurs du catalogue (Top 1000 mondial aujourd'hui)
src/data/retired.json    les Sortants : hors tirage et hors complétion, mais
                         leurs cartes restent valides (voir src/lib/retired.ts)
src/data/pull-rates.json les tables de tirage par slot (source des taux publiés)
src/data/seasons.config.json le découpage des saisons
src/data/catalog.config.json taille attendue du catalogue (vérifiée par catalog:check)
supabase/migrations/     SQL à coller dans le SQL Editor de Supabase (0001 à 0022)
supabase/functions/     Edge Function `refresh-live` : seul endroit qui connaît le secret Twitch
public/creators/         portraits (600×600 via `npm run assets:regen`)
scripts/                 génération des données et des avatars (scripts/lib/ = pipeline
                         image, échelle de raretés), build du catalogue,
                         seed Supabase (build-supabase-catalogue.mjs),
                         vérificateur des migrations (verify-supabase-migrations.mjs)
e2e/ + playwright.config.ts les gestes rejoués sur bureau et téléphone (dont le tirage
                         qui survit à un rechargement de page)
docs/taux-de-drop.md     comment lire, vérifier et modifier les taux de drop
docs/catalogue-twitch.md construire le catalogue : périmètre, taille, budget images, runbook
supabase/migrations/     la pile SQL, `0001` → `0024` (réelles, rejouables, vérifiées)
supabase/functions/      les Edge Functions : refresh-live (Twitch → `live_streams`),
                         notify-live (direct → Firebase), secrets côté serveur
docs/cloud-supabase.md   tout le cloud : projet Supabase, comptes, migrations (§8),
                         direct, amis, hôtel, carnet, notifications (§9 et 9.1), dépannage
docs/depot-et-github.md  la vie du dépôt : branches, APK de test, publications
android/                 projet Capacitor Android (canal de notification et
                         son du jeu, app/src/main/res/raw/creatordeck.wav)
```

Principes :

- **Le moteur est pur et isomorphe** (`game-engine.ts`) : chaque fonction
  prend un état + un instant `now` et renvoie un nouvel état. Il ne dépend ni
  de Node, ni du DOM, ni du stockage, ce qui le rend testable unitairement —
  et vérifiable face aux **mêmes règles écrites en SQL** côté serveur
  (`0004_tirage.sql`, `0005_echanges.sql`, `0009_marche.sql`), rejouées sur un
  Postgres jetable par `npm run supabase:verify`. Un écart entre les deux se
  voit en local, pas en production.
- **La sauvegarde est locale et versionnée** (`creatordeck.save.v6`), validée
  au chargement (valeurs bornées, cartes inconnues ignorées). Les sauvegardes
  v1 → v5 sont **migrées automatiquement** (aucune collection perdue) puis
  relues sous la nouvelle clé. L'onglet Profil permet de la copier / importer
  (transfert entre téléphones) et de la réinitialiser ; une copie Cloud la
  double dès qu'un compte est connecté.
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
- **Les Sortants** (rotation du catalogue) : une régénération ne jette personne.
  Un créateur qui quitte le Top passe dans `src/data/retired.json`, avec
  l'édition de son départ. Il n'est **plus tiré** en booster et ne compte plus
  dans la complétion (« X / 1000 » se mesure sur le catalogue courant, sinon
  100 % deviendrait inatteignable), mais ses cartes restent valables partout —
  classeur (tag « Sortant »), échange, hôtel, Last Pack, vitrine. Il reste
  **artisanable pendant l'édition de son départ** (jamais une Légendaire), et
  l'accueil annonce la fenêtre : « 2 Sortants encore artisanables · dernière
  édition ». Un créateur qui revient au classement l'emporte sur sa ligne de
  Sortant ; côté serveur, le drapeau `retired` de `0003_catalogue.sql` fait
  exactement la même chose (`0016_sortants.sql`). Runbook : `docs/catalogue-twitch.md`.
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
- **L'ordre de révélation compte** : le slot garanti — Rare ou mieux — ferme
  toujours le booster, dans le moteur local comme dans `open_pack()`. Aucun
  mélange après tirage : la dernière carte est le moment fort de l'ouverture,
  et l'écran la nomme.
- **Le Direct fait tomber plus** : quand l'app sait qui streame (cache du
  serveur, moins de dix minutes), les créateurs en direct **pèsent ×1,5** dans
  leur rareté, leur carte a **20 %** de chance d'être en variante Live, et la
  carte garantie est Live quand son créateur streame. Sans information fraîche,
  le bonus est neutre et **aucune** variante Live ne sort : un « Live » qui
  désignerait quelqu'un qui ne streame pas ne vaudrait rien. C'est déclaré dans
  `pull-rates.json` (section `direct`), publié dans l'écran « Taux de drop »,
  et appliqué des deux côtés (`0011_direct.sql`).
- **Jalons du collectionneur** (écran Objectifs) : sept jalons — premier
  booster, **10, 25, 50 puis 100** créateurs découverts, **premier
  Légendaire**, catalogue complet — chacun payé **une fois** (+40 points et
  1 sablier, puis 120/1, 260/2, 500/3, 1 200/5, 400/2 pour le Légendaire, et
  3 000/10 pour le catalogue). Les paliers sont des nombres fixes : une
  fraction du catalogue se déplacerait le jour où le catalogue grandit. Les
  seuils vivent dans `MILESTONES` (`src/lib/game-engine.ts`) : l'écran ne peut
  plus annoncer un chiffre et en compter un autre. Le jalon « premier
  Légendaire » compte les créateurs **distincts** — deux exemplaires du même
  n'en font pas deux.
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

## Ouvrir ses boosters en direct (overlay 16:9)

Une page faite pour être collée en **source navigateur** dans OBS (ou équivalent) :
`/overlay`. Elle n'affiche qu'une chose — la scène de révélation, plein cadre 16:9 —
et elle ouvre de vrais boosters, avec les mêmes règles que le jeu (tirage serveur
quand un compte est connecté, moteur local sinon).

```url
http://localhost:3000/overlay
```

- **Espace** ouvre un Live Drop, **Entrée** révèle la carte suivante (ou range) ;
  aucun bouton ne traîne à l'écran pendant la révélation ;
- **aucun raccourci** : le « ×5 » qui existe dans le jeu (hors overlay) n'est pas là.
  Devant un public, les cinq cartes se montrent une par une ;
- la mise en scène est la même partout, et elle est décidée par un module pur
  (`src/lib/reveal.ts`, testé) : le **dernier emplacement refuse de se retourner**
  (une fois, deux si la carte est Épique ou mieux) ; une Épique ou une Légendaire
  arrive après **400 ms de silence** puis un bang ; un **Perfect** montre les cinq
  cartes d'un coup et verrouille l'écran deux secondes, avec la vibration la plus
  longue du jeu. Un Légendaire ou un Perfect passe en plein écran, avec le titre du
  direct, le nombre de spectateurs et un bouton vers l'affiche ;
- le son se coupe (`creatordeck.muted`) et **coupe aussi les vibrations** — c'est le
  même interrupteur, dans « Toi → Son ».

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
`localStorage`, catalogue embarqué. Le cloud (Supabase) ajoute onze choses, et
rien d'obligatoire — les six premières sont décrites juste après, les dernières
au §8 de la marche à suivre :

1. un **compte** : invité (un appui, aucun e-mail), adresse e-mail + mot de
   passe, ou « Continuer avec Twitch » ;
2. la **sauvegarde cloud** de la partie, pour retrouver sa collection sur un
   autre appareil ;
3. le **tirage des boosters décidé par le serveur** (les cartes sont
   infalsifiables — prérequis des échanges) ;
4. les **échanges de cartes** entre joueurs, tranchés par le serveur ;
5. la **vitrine de quatre cartes** et le **profil public** de chacun ;
6. le **classement mondial**, recalculé par le serveur — tri global, tri Gold
   ou tri **par famille de collection** ;
7. les **amis**, avec demandes à accepter ;
8. l'**hôtel des ventes** : on y dépose un doublon contre des points, d'autres
   joueurs l'achètent plus tard ;
9. le **carnet de notifications** (« Toi → Notifications », avec sa pastille) :
   ce qui est arrivé pendant l'absence ;
10. le **Last Pack** (« Toi → Last Pack ») : le paquet qu'un joueur vient
    d'ouvrir reste exposé dix minutes, un ami peut y prendre une carte, une par
    jour — et le carnet le dit au propriétaire ;
11. le badge **EN LIVE**, allumé sur les cartes des chaînes en direct.

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

Hors périmètre (volontaire) : les points, l'XP, le niveau **et les jetons**
restent calculés sur l'appareil ; seul le contenu des boosters (et donc les
cartes) devient serveur.

Le **plancher de malchance** et la **série de jours**, eux, sont calculés des
deux côtés — et le serveur ne croit personne sur parole : il les relit depuis
son propre journal des tirages (`pack_draws`), que seule `open_pack()` écrit.
Un compteur rangé dans la sauvegarde de l'appareil serait à la portée du premier
joueur qui sait l'éditer ; là, il n'y a rien à trafiquer. `pack_status()` publie
les deux chiffres pour que l'écran affiche exactement celui qui décidera du
tirage.

### Le plancher de malchance, les jetons, les missions

Trois mécaniques, une intention : qu'une série malchanceuse ne dure pas des
mois, et que la partie ait un geste à faire **aujourd'hui**.

* **Le plancher de malchance** (« pity ») est écrit dans
  `src/data/pull-rates.json` et publié dans « Taux de drop » : après
  **80 boosters d'affilée sans Légendaire**, le 5ᵉ slot en garantit une. Le
  compteur repart de zéro dès qu'un Légendaire tombe, quel que soit le slot, et
  l'accueil affiche « Légendaire garanti dans N boosters ». Moteur local et
  `open_pack()` appliquent la même règle (`0013_progression.sql`).
* **Les jetons** : 5 par booster ouvert, 7 pendant le **Prime Time** (20 h –
  23 h, heure locale), et **400** pour rejoindre la carte de son choix à
  l'Atelier (« Atelier → Jetons »). Jamais une Légendaire — elle se tire en
  booster, ou tombe au plancher. Les jetons doublent le recyclage : les points
  paient vite, les jetons paient sûr.
* **Les missions du jour** (écran Progression) : ouvrir un booster, recycler un
  doublon, toucher sa famille ou un Direct — une par jour, **un sablier**
  chacune. La journée de jeu commence à **6 h UTC** (pas à minuit : une soirée
  de streaming ne doit pas être coupée en deux), et la **série** paie au
  **7ᵉ jour d'affilée** un **Perfect garanti** — ou 3 sabliers, au choix.

Les règles vivent dans un seul fichier, `src/data/progression.json`, et leur
logique pure dans `src/lib/progression.ts` ; l'écran et le moteur lisent le
même seuil, donc aucun chiffre n'est recopié à la main.

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
  - `api/` est un client Supabase minimal (compte, code à 6 chiffres,
    envoi/lecture de la sauvegarde, classement) — pas de SDK embarqué dans
    l'APK. Le dossier suit les domaines : `core.ts` (transport, rafraîchissement
    du jeton, session) et un module par domaine (`account`, `pack`, `social`,
    `market`, `arena`), `index.ts` étant la façade ;
  - `credentials.ts` valide l'adresse et le mot de passe côté écran (les mêmes
    règles qu'à l'inscription) et porte l'avertissement « mot de passe non
    récupérable sans SMTP » ;
  - `sync.ts` contient les décisions (envoyer, charger, ne rien faire, demander
    au joueur) sous forme de fonctions pures, testées ;
  - `cloud-store.ts` expose l'état à React et programme l'envoi automatique
    ~20 s après la dernière action quand un compte est connecté. Il garde
    **l'état, la synchronisation et les helpers** et assemble les actions de
    `store/` (`account.ts`, `pack.ts`, `social.ts`, `market.ts`, `arena.ts`) ;
    la signature publique est inchangée ;
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
  `supabase/migrations/0009_marche.sql` ajoute l'**hôtel des ventes** : on dépose
  un doublon, l'hôtel le paie **tout de suite** en points (la carte quitte la
  collection, donc elle ne peut pas être vendue deux fois) et la met au comptoir ;
  un autre joueur l'achète plus tard, au prix de l'étiquette. Deux joueurs n'ont
  jamais besoin d'être connectés en même temps. Les prix sont ceux de l'hôtel
  (`market_payout()` : rareté × variante, miroir testé dans `src/lib/market.ts`),
  l'étiquette vaut une fois et demie le payout — sans cette marge, on vendrait et
  rachèterait la même carte en boucle. Jamais la dernière copie, jamais sa propre
  annonce, jamais deux fois la même (verrou sur l'annonce), et une annonce
  oubliée quitte le comptoir après trente jours. La table est fermée aux clients :
  tout passe par les RPC `market_sell()` / `market_buy()` / `market_shelf()` /
  `market_listings_of()`. L'écran vit dans « Profil → Hôtel des ventes » ; la
  fiche publique montre « En vente à l'hôtel ». Mise en place :
  `docs/cloud-supabase.md` §8, « L'hôtel des ventes ».
  Un **carnet de notifications** (« Toi → Notifications », avec sa pastille)
  rassemble ce qui est arrivé au joueur : offres d'échange reçues, réponses à ses
  offres, demandes d'ami, amitiés acceptées, cartes vendues à l'hôtel. Aucune
  table dédiée côté serveur : chaque ligne vient d'un fait déjà enregistré
  (échanges, amis, annonces), relu et mis en français par
  `src/lib/social/inbox.ts`. La « dernière visite » vit sur l'appareil, par
  joueur, et le carnet ne raconte jamais au joueur ce qu'il vient de faire.
  Mise en place : `docs/cloud-supabase.md` §8, « Le carnet de notifications ».
  Le **Last Pack** : les cinq cartes du booster qu'un joueur vient d'ouvrir
  restent **exposées dix minutes**, et un ami peut y prendre une carte — **une
  par jour**. La carte quitte vraiment la collection du propriétaire (le serveur
  réécrit sa sauvegarde) et entre dans celle du voleur ; une vieille sauvegarde
  ne peut pas la faire revenir (`push_save()` la refuse avec son message).
  Le paquet d'un inconnu n'est jamais exposé, et la fenêtre est celle du
  serveur : reculer l'horloge de son téléphone ne la rallonge pas. L'écran vit
  dans « Toi → Last Pack », avec la pastille sur l'onglet et le compte à
  rebours ; le carnet annonce « X t'a piqué ton légendaire ». Mise en place :
  `docs/cloud-supabase.md` §8, « Le Last Pack ».
  `supabase/migrations/0013_progression.sql` porte le **plancher de
  malchance** et la **série de jours** côté serveur : le seuil de 80 boosters,
  le slot garanti qui devient Légendaire, la récompense du 7ᵉ jour, et les deux
  compteurs publiés par `pack_status()`. Elle remplace `open_pack()` (l'ancienne
  signature sans argument est supprimée : sinon un appel sans argument aurait
  continué d'ignorer la garantie).
  La **connexion Twitch** passe par le fournisseur Twitch intégré de Supabase
  (`provider=twitch`) : le bouton « Continuer avec Twitch » ouvre le dialogue dans
  le navigateur, et le retour installe une session ordinaire — le secret du
  client Twitch ne quitte jamais Supabase, l'appareil ne connaît que l'adresse
  du dialogue. Sur le site, le jeton arrive dans le fragment de l'adresse et
  l'adresse est nettoyée aussitôt ; dans l'APK, le retour passe par
  `com.creatordeck.app://auth` (`AndroidManifest.xml` + plugin `@capacitor/app`).
  Mise en place (trois déclarations) : `docs/cloud-supabase.md` §3.
- Sans `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` (voir
  `.env.example`), le build est **le mode local** : rien de réseau, le moteur de
  l'appareil tire les cartes, et l'écran de compte affiche « cloud non
  configuré ». C'est ce mode qui sert au développement et aux tests — la version
  distribuée (APK, site) est compilée **avec** le cloud. Ces deux valeurs sont
  publiques par conception ; la clé **`service_role`** ne doit jamais entrer
  dans l'app.
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
