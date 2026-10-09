# L'atelier : les problèmes ouverts au 9 octobre 2026

> **À jour au 9 octobre 2026, commit `1060069`, branche
> `arena/01a10c75-creatordeck`.** Ce fichier peut être envoyé tel quel à un
> relecteur externe : il décrit **ce qui ne marche pas dans l'atelier**, pas le
> jeu. Pour le jeu : `README.md`. Pour ce qui est déjà tranché :
> `docs/perimetre.md`. Pour les refus techniques motivés :
> `docs/revue-externe-2026-10.md`.

Ce fichier est écrit pour **celui qui reprend le clavier** — une autre IA, ou le
joueur lui-même. Il ne décrit pas le jeu : il décrit **ce qui coûte du temps**,
ce qui **casse**, et ce qui **attend une décision**. Chaque ligne a été
rencontrée pour de vrai, souvent plusieurs fois.

Il existe parce que la moitié de ces problèmes sont **invisibles dans le code** :
on les découvre en perdant une heure, ou en détruisant une branche.

**Un avertissement, pour le relecteur pressé** : une autre IA a déjà produit sur
ce dépôt trois constats faux, un SQL en collision avec une migration existante
(`0027`) et une capture d'écran non reproductible. La règle est dans
`docs/perimetre.md` : *un avis n'est pas un résultat*. Toute affirmation se
vérifie en lançant (`npm test`, `npm run ecrans`, `npm run supabase:verify`),
jamais en relisant.

---

## 1. Le plus grave : la bascule du dépôt

**Le symptôme.** Sans prévenir, au milieu d'une série de modifications, `HEAD`
retombe sur la lignée **sœur** (`0861b55`, le parent de la branche de travail).
`git status` affiche alors **~2 276 entrées** : `android/`, `package.json`,
`public/creators/*` « supprimés », et tous mes fichiers en `??`. Rien n'a bougé
dans mon répertoire de travail — c'est l'index qui raconte une autre histoire.

**Variante encore plus nette, vue le 9 octobre** : l'espace de travail entier est
revenu à un **clone neuf et superficiel** — `git rev-list --count HEAD` valait
**1**, et la référence distante `refs/remotes/origin/arena/…` n'existait plus du
tout. Dans cet état, même `git fetch` ordinaire ne sait plus quoi rattraper.

**C'est un problème d'environnement, pas de manipulation** : le 9 octobre,
une bascule s'est produite alors qu'**aucune commande `git` n'avait été
lancée depuis une vingtaine de minutes** — j'écrivais un fichier en dehors
du dépôt. Rien de ce que je fais ne la déclenche, et rien ne l'annonce :
elle est là au réveil.

**Le danger.** Un `git add -A .` à cet instant **détruirait la branche** : il
rétablirait le code d'avant le chantier en le faisant passer pour le mien. Ça
s'est produit **sept fois** entre le 8 et le 9 octobre 2026.

**La recette, éprouvée** (elle a sauvé les commits `15d4924`, `64d1243`,
`a951a67`, `00778ae`, `333eeac`, `c9bf700`, `71f5097` et `1060069`) :

1. ne **jamais** `git add -A .`, jamais `--force`, jamais de `worktree` ;
2. copier **uniquement les fichiers touchés** dans un dossier hors dépôt
   (`/tmp/…`), en recréant les sous-dossiers ;
3. `git fetch origin arena/01a10c75-creatordeck:refs/remotes/origin/arena/01a10c75-creatordeck`
   — **avec le nom complet de la référence**, sinon la référence distante n'est
   pas recréée quand le clone est reparti de zéro. Si Git refuse parce que
   l'historique est superficiel : `git fetch --unshallow origin` ;
4. `git reset --hard origin/arena/01a10c75-creatordeck` ;
5. **recopier** les fichiers par-dessus, puis `git status` : on doit retrouver
   exactement sa liste, et rien d'autre. **Vérifier ensuite qu'un fichier du
   dernier commit est bien là** (par exemple `src/components/pack-tear.tsx`), et
   pas seulement le numéro de `HEAD` ;
6. relancer les suites **avant** de committer (`node_modules` a souvent disparu
   entre-temps, voir § 2) ;
7. committer avec `git add` **nommé**, fichier par fichier.

Un `git diff … | git apply` fonctionne aussi, mais un patch qui ne s'applique
plus après une bascule est plus difficile à réparer que des fichiers recopiés.

**La cause n'est pas identifiée.** C'est très probablement la sauvegarde
automatique de l'espace de travail (les instantanés excluent `node_modules`,
`.git` est partiellement capturé). Celui qui trouve la cause gagne des heures.

**Ce que ça coûte, concrètement** : à chaque bascule, `node_modules` repart à zéro
(≈ 25 s de `dev:setup`), les suites sont à rejouer (≈ 60 s), et le risque n'est
pas la perte de temps mais la perte du travail.

## 2. L'environnement

| Problème | Ce qui se passe | La parade |
|---|---|---|
| **`node_modules` disparaît** | entre deux appels, le dossier repart à zéro : `tsc: not found`, `vitest: not found` | `npm run dev:setup` en tête de chaque série de commandes (≈ 25 s) |
| **`npx vitest` / `npx tsc` seuls échouent** | paquets npm homonymes (`tsc@2.0.4`) | `npm test`, `npm run typecheck` — jamais `npx` direct |
| **Deux configurations Vitest** | `npm test` (69 fichiers) ne voit **pas** les bancs d'écrans ; `npm run ecrans` (13 fichiers) ne voit **pas** le reste. Un test ajouté dans le mauvais fichier ne tourne jamais | connaître les deux, et mettre à jour les deux compteurs (README + PR) |
| **`npm run check-jargon` n'existe pas** | c'est un script nu | `node scripts/check-jargon.mjs` |
| **`gh pr edit` échoue** | erreur GraphQL « Projects classic » | `gh api -X PATCH repos/GoodFight37/CreatorDeck/pulls/7 --input <fichier.json>` |
| **`curl` vers `*.vercel.app` rend `000`** | aucune route sortante | `gh api …/deployments?sha=<commit>` puis `…/statuses` |
| **Aucune route vers la production Supabase** | impossible de sonder, impossible de `npx supabase db push` | le **joueur** pose les migrations ; on vérifie par `schema_versions()` ou la page `docs/diagnostic.html` |
| **`npm run e2e` injouable ici** | pas de Chromium dans l'atelier | les tests Playwright (`e2e/pack-crash.spec.ts`) se lancent sur un poste avec `npx playwright install chromium` |
| **Le serveur d'aperçu meurt** | le processus `next dev` ne survit pas aux tours (ni aux `reset --hard`) | le relancer (`npm run dev`, `0.0.0.0:3000`) ; d'abord `pkill -f "next dev"`, sinon Next bascule sur 3001 et l'aperçu pointe ailleurs |
| **Deux lignes de commandes à ne pas mélanger** | `bash` exige `command` **et** `cwd` ; `/tmp` n'est **pas** persistant | les copies de secours servent dans le tour, jamais au suivant |

## 3. Ce que je ne vois pas

**Les captures du joueur n'arrivent jamais.** Les photos jointes depuis le
téléphone n'apparaissent à aucun endroit de l'espace de travail (vérifié : pas de
dossier d'envois, `read_file` répond « File not found »). Conséquence directe :
**chaque bug visuel est diagnostiqué à partir d'une phrase**, pas d'une image.

Deux exemples réels, à quelques heures d'intervalle :

* « les 5 cartes sont révélées en même temps et le bouton ne fait rien » —
  résolu parce que le code ne produit cette scène **qu'à un seul endroit** (le
  tirage *Perfect*). Ce n'est pas une méthode, c'est de la chance ;
* « les textes ne veulent rien dire » — il a fallu demander « les libellés de
  l'écran, ou les dossiers ? » pour découvrir que c'était les 26 dossiers du
  Tribunal, et non l'interface.

Trois parades, par ordre d'utilité :

1. **poser la question qui départage** (« est-ce que tu voyais la bannière
   *Booster Perfect* ? ») plutôt que de deviner ;
2. **décrire ce que le code peut produire** et laisser le joueur trancher ;
3. **l'aperçu Vercel** : le joueur regarde, et décrit. Une URL par commit.

**Les animations CSS ne se vérifient pas.** Il n'y a pas de navigateur : je
contrôle la structure (le DOM, les classes, les variables inline) et je raisonne
sur la feuille de style. Le jugement — « est-ce que c'est beau ? » — appartient
au joueur, et il a déjà tranché deux fois (le décor isométrique est parti le
8 octobre, l'explosion dorée le 9). Le retournement dos → face livré le 9 octobre
n'a donc **jamais été vu** : il est vérifié en structure (deux faces,
`backface-visibility`, un départ à plus de 90°), pas à l'œil.

## 4. Le piège des tests d'écrans

Les bancs (`src/ecrans-banc.tsx`, `npm run ecrans`) montent les composants **à la
main**, et les composants tiennent souvent **leur propre état**. Deux
conséquences, apprises à ses dépens :

* un banc qui monte `RevealOverlay` (ou `TribunalView`) seul **ne passe pas par
  le moteur** : un test d'appui y est sans dents. Le bug des boutons morts du
  Tribunal (8 octobre) et celui du Perfect (9 octobre) ont tous les deux
  nécessité de monter **l'application entière** — ou au moins le composant avec
  de vrais rappels `vi.fn()` — pour que le test voie quelque chose ;
* **toujours vérifier dans les deux sens** : rétablir la ligne fautive, lancer le
  test, constater qu'il **échoue**, puis le remettre. Un test qui n'a jamais rougi
  ne prouve rien. Les deux bugs ci-dessus ont chacun eu leur première version
  « verte pour rien ».

## 5. La chaîne des temps (fragile)

L'ouverture d'un booster est un enchaînement : suspense du tirage **650 ms** →
déchirure **700 ms** → silence **520 ms** devant une Épique ou mieux → entrée de
carte **720 ms** (**920 ms** en plein écran, dont ~330 ms de dos avant que la
carte se présente) → verrou du Perfect **2 600 ms**. Chaque valeur vit dans un
module (`OPENING_DELAY_MS`, `PACK_TEAR_MS`, `EPIC_SILENCE_MS`,
`PERFECT_LOCK_MS`) et le CSS **lit** certaines d'entre elles en variable inline
(`--lock-ms`, `--fx-duration`) — c'est voulu, une seule vérité. Deux précautions :

* les tests avancent les minuteries **fictives** à la main, avec de la marge :
  toucher une valeur sans regarder les tests les fait tomber ;
* la durée totale ressentie est d'environ **2 s** avant la première carte sur un
  tirage local. Si le joueur la trouve longue, c'est `PACK_TEAR_MS` qu'on
  raccourcit, pas le silence — le silence est ce qui fait le bruit.

## 6. Ce qui attend une décision du joueur

| Sujet | État |
|---|---|
| **Migrations `0040`, `0041`, `0042`** | à coller par le joueur (`npx supabase db push`). Sans `0042`, le bilan du Tribunal affiche le refus du serveur au lieu de verser les points |
| **PR #7** | ouverte, **à ne pas fusionner** sans redemander |
| **Le retournement dos → face** | livré le 9 octobre, **jamais vu** : deux réglages attendent un verdict au pouce — le dos est-il visible **assez longtemps** (~330 ms, `@keyframes reveal-flip`), et le halo doré de la Légendaire arrive-t-il au bon moment (`card-reveal-legendary`) ? |
| **L'éclat (seul effet restant)** | l'explosion dorée est partie le 9 octobre ; l'éclat est-il, lui aussi, à revoir ? Si oui, il ne restera que le flash blanc et le halo doré de l'entrée |
| **Le Perfect** | le bouton mentait (il proposait « Révéler la suivante » alors que les cinq cartes étaient à l'écran) : corrigé. Reste à savoir si le joueur **avait vu la bannière** « Booster Perfect » — si non, il y a autre chose |
| **Pager du classement** | question ouverte, sans réponse |
| **« Tu demandes »** | plafonné à 8, question ouverte |
| **`src/lib/live-game.ts`** | seul orphelin réel hors tests, **gardé volontairement** (moteur de la simulation retirée le 8 octobre) |
| **Le Tribunal** | 24 cartes + recherche, seuil de karma à 60 % — à confirmer à l'usage |
| **L'APK** | « rien pour l'instant » : Vercel suffit comme canal de test. À la main : `npm run android:debug` |
| **Suivre la branche depuis Windows** | un `git pull` sur `master` répond « no tracking information » : la marche à suivre est dans `docs/depot-et-github.md` § « Suivre la branche de travail depuis ton poste » |

## 7. L'état du chantier au moment où ce fichier est écrit

- branche `arena/01a10c75-creatordeck`, HEAD `1060069` — *Tout remettre à jour
  pour une relecture externe* ; le dernier livrable de jeu est `c9bf700` (*La carte
  se retourne vraiment : un dos, une face*) ;
- suites : `npm test` **1 077 tests** (69 fichiers), `npm run ecrans` **66 tests**
  (13 fichiers, 56 captures), `npm run supabase:verify` **559 contrôles** ;
  `typecheck`, `eslint`, le scanner de vocabulaire et `npm run build` verts ;
- déploiement Vercel du commit `1060069` : **succès** ;
- migrations posées en production : `0001` → `0039`. **Manquent `0040`, `0041`,
  `0042`.**
