# Périmètre : ce que ce dépôt attend de toi

Cette page est la **porte d'entrée** : pour une IA qui lit le code, un relecteur
externe, ou un humain pressé. Elle dit ce que le README raconte en cent lignes,
et surtout **ce qui a déjà été décidé** — reproposer un point tranché coûte une
passe de vérification pour rien, et chaque passe se paie en heures de jeu.

Elle existe parce qu'une relecture externe a reproposé cinq choses déjà
tranchées, en croyant les découvrir.

## Le jeu, en trois phrases

CreatorDeck est un jeu de cartes à collectionner sur les **1000 chaînes Twitch**
du classement mondial. **Le jeu, c'est l'APK Android** : c'est là qu'il se joue,
au pouce. GitHub n'est qu'un **bac** où les outils écrivent du code — ni
magasin, ni iOS, ni publication. Le serveur (Supabase) décide de ce qui compte :
le **tirage des boosters**, les **points**, les **jetons** ; l'XP, le niveau et
les sabliers restent sur l'appareil (ils ne valent rien pour un autre joueur).

## Les règles non négociables

- **Le téléphone d'abord.** Un changement se juge au pouce : ce qu'on voit, ce
  qu'on touche, ce que ça pèse. L'élégance du code ne vaut que si elle sert ça.
- **Le serveur décide de ce qui compte** (tirage, points, jetons). L'appareil ne
  fabrique **jamais** une valeur en ligne : pas de repli silencieux, un refus se
  dit avec la phrase qui explique quoi faire.
- **Quatre interdits d'architecture** : les Server Actions ; un secret de service
  (`sb_secret_…`, clé Firebase) dans l'APK ; une refonte relationnelle de la
  base ; et promettre « 100 % en ligne » (sans réseau, on consulte ce qui est
  déjà là, et les gestes serveur attendent).
- **Les règles vivent en double** : TypeScript **et** SQL. Une règle touchée d'un
  seul côté casse un test miroir (`src/lib/supabase-*.test.ts`) — c'est voulu.
  La dernière définition d'`open_pack()` est `0035_jetons.sql`.
- **On vérifie en lançant, pas en relisant** : `npm test` (**931**),
  `npm run ecrans` (les **22** captures), `npm run supabase:verify`
  (**501** contrôles). Pour un déménagement de code : capture avant
  (`ECRANS_DUMP=/tmp/avant`), `diff -r` après.
- **Les noms visibles** : Drop, Binder, Craft, Toi — et « Objectifs et saisons ».
  Un écran s'appelle comme le joueur le lit, pas comme le fichier s'appelle.
- **Jamais « hors ligne »** pour décrire le jeu : il est **en ligne**. Le build
  sans cloud est un mode de développement et de test, pas le jeu distribué.
- **En français**, aucun contenu Pokémon, clé **anon/publishable** seulement.
- **Un seul écrivain à la fois** sur la branche de travail, et **aucune PR n'est
  fusionnée**. Une branche d'essai se relit, jamais ne se fusionne.
- **Un avis n'est pas un résultat.** Les rapports externes — Gemini, Claude, Grok
  — se lisent dans le code avant d'être suivis : plusieurs ont produit des points
  faux, un SQL en collision avec une migration existante, et une capture
  d'écran non reproductible.

## Déjà proposé, déjà refusé

| Proposition | Réponse, et où c'est écrit |
|---|---|
| **i18n** (chaque chaîne en dur, `<html lang="fr">`) | **Pour plus tard, assumé** : un seul public aujourd'hui, et c'est une refonte de chaque composant, pas l'ajout d'un fichier de traduction |
| **Analytics de rétention** (funnels D1/D7, écran de décrochage) | **Plus tard** : décision du joueur. Le besoin immédiat (« aucune remontée ») est couvert par le **filet de sécurité** (`src/components/error-boundary.tsx`) |
| **Play Store, iOS, RGPD, droit à l'image, ToS Twitch** | **Hors sujet** : l'APK est le jeu, il n'est pas publié |
| **Découpage du JavaScript** (`next/dynamic` sur les feuilles) | **Mesuré puis refusé** : 85 Ko sur les 1 075 Ko analysés au démarrage (**8 %**), contre 13 fichiers de plus et un premier appui moins instantané (`README`, journal **11.27**) |
| **Partage automatique après un gros pull** | **Refusé** : l'affiche existe déjà, **à la demande** (« Faire une affiche », sur un Légendaire ou un Perfect) |
| **Un troisième transport réseau** pour le temps réel | **Rien à faire aujourd'hui** : le transport a déjà ses deux chemins (`fetch` sur le web, `CapacitorHttp` dans l'APK) et aucun besoin temps réel n'est prévu |
| **Un indicateur de malchance ajouté à l'onglet Drop** | **Rien à faire** : la ligne existe déjà sur l'accueil — « Légendaire garanti dans N boosters » (`src/components/drop-view.tsx`), cliquable vers les taux publiés. Un second compteur dirait la même chose en plus anxiogène |
| **Un rival hebdomadaire parmi ses amis** (écart de collection affiché) | **Refusé** : l'écart est déjà **public et comparable** (`player_profile()`, classements global / Gold / par famille, arène hebdomadaire). Le seul incrément serait une notification qui apprend à un joueur qu'un *ami* le dépasse — la comparaison sociale entre deux personnes qui se connaissent est la mécanique la plus toxique du lot (`supabase/migrations/0037_gardes.sql`, en-tête) |
| **Roue casino**, **« Streameur du Jour »** | **Refusés** (revue Gemini) : remplacés par le **Planning du Streamer** et les missions du jour |
| **Sabliers, XP et niveau au serveur** (au-delà des jetons) | **Refusés** : ils ne valent rien pour un autre joueur, et les déplacer casserait le jeu dans un build sans cloud |
| **`@capacitor/preferences` pour la session** | **Suggestion ouverte**, non faite : la sauvegarde est un blob trop gros pour `Preferences` — `docs/revue-externe-2026-10.md` §3 |
| **Une PR à fusionner** | **Non** : la PR #7 reste ouverte, aucune fusion — voir `docs/depot-et-github.md` |

## Où est le reste

- `README.md` — la **porte d'entrée** : l'architecture, les scripts, les tests,
  les principes. Le **journal daté** des livraisons (du plus récent au plus
  ancien) vit dans `docs/historique-livraisons.md` ; le présent et la suite,
  dans `docs/roadmap.md`.
- `docs/ta-chaine.md` — la **simulation de streameur**, retirée de
  l'application le 8 octobre 2026 : ses étapes, ses règles, et son état. Le
  reste, et le détail de chaque règle.
- `docs/assets-graphiques.md` — l'histoire de `public/streamer/` : ce qui a
  servi (le kit isométrique de la pièce du Studio, retirée le 8 octobre 2026),
  ce qui est en 3D, et ce qui est parti — en deux vagues.
- `docs/assets-sonores.md` — les sons : la sélection de bruitages embarqués, la
  licence du pack, le budget, et ce qu'on n'a pas pris.
- `docs/cloud-supabase.md` — tout le serveur, §8 : chaque règle, migration par
  migration, et la marche à suivre pour poser le SQL (`npx supabase db push`).
- `docs/revue-externe-2026-10.md` — les refus **techniques**, avec leur raison.
- `docs/atelier-et-problemes.md` — **les problèmes de l'atelier**, pour celui qui
  reprend le clavier : la **bascule du dépôt** et la recette qui la rattrape,
  l'environnement (node_modules, deux Vitest, pas de navigateur), ce qu'on **ne
  peut pas voir** d'ici (les captures du joueur n'arrivent jamais), et les
  décisions en attente.
- `docs/taux-de-drop.md` — les probabilités publiées, et comment les modifier.
- `docs/catalogue-twitch.md` — le catalogue : périmètre, taille, et la
  **cadence** (`npx supabase db push` pour `0003_catalogue.sql` **avant** de
  distribuer un APK).
- `docs/depot-et-github.md` — branches, APK de test, et la vie du dépôt.

## Vérifier une affirmation sur la base

Aucune affirmation sur le serveur ne se croit sur parole, la mienne comprise :

- **ce qui est collé** : `schema_versions()`, lisible **sans compte**
  (`POST /rest/v1/rpc/schema_versions` avec la clé anon) — les `true` attendus
  pour `0030` → `0039`, puis `0040`, `0041` et `0042` dès que le joueur les a
  posées
  (`npx supabase db push`) ;
- **une fonction existe** : `401`/`42501` = présente mais réservée au rôle de
  service ; `404`/`PGRST202` = absente.

Le détail de la marche à suivre est dans `docs/cloud-supabase.md`, § « Savoir ce
qui est collé ».
