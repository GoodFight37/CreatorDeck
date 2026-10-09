# L'atelier : les problèmes ouverts au 9 octobre 2026

Ce fichier est écrit pour **celui qui reprend le clavier** — une autre IA, ou le
joueur lui-même. Il ne décrit pas le jeu : il décrit **ce qui ne marche pas dans
l'atelier**, ce qui coûte du temps, et ce qui attend une décision. Chaque ligne a
été rencontrée pour de vrai, souvent plusieurs fois.

Il existe parce que la moitié de ces problèmes sont **invisibles dans le code** :
on les découvre en perdant une heure, ou en détruisant une branche.

---

## 1. Le plus grave : la bascule du dépôt

**Le symptôme.** Sans prévenir, au milieu d'une série de modifications, `HEAD`
retombe sur la lignée **sœur** (`0861b55`, le parent de la branche de travail).
`git status` affiche alors **~2 276 entrées** : `android/`, `package.json`,
`public/creators/*` « supprimés », et tous mes fichiers en `??`. Rien n'a bougé
dans mon répertoire de travail — c'est l'index qui raconte une autre histoire.

**Le danger.** Un `git add -A .` à cet instant **détruirait la branche** : il
rétablirait le code d'avant le chantier en le faisant passer pour le mien. Ça
s'est produit trois fois en vingt-quatre heures (8 et 9 octobre 2026).

**La recette, éprouvée** (elle a sauvé les commits `15d4924`, `64d1243`,
`a951a67` et `00778ae`) :

1. ne **jamais** `git add -A .`, jamais `--force`, jamais de `worktree` ;
2. copier **uniquement les fichiers touchés** dans un dossier hors dépôt
   (`/tmp/…`), en recréant les sous-dossiers ;
3. `git fetch origin arena/01a10c75-creatordeck:refs/remotes/origin/arena/01a10c75-creatordeck`
   — sans ce `fetch`, `origin/…` peut lui aussi être en retard ;
4. `git reset --hard origin/arena/01a10c75-creatordeck` ;
5. **recopier** les fichiers par-dessus, puis `git status` : on doit retrouver
   exactement sa liste, et rien d'autre ;
6. relancer les suites **avant** de committer (`node_modules` a souvent disparu
   entre-temps, voir § 2) ;
7. committer avec `git add` **nommé**, fichier par fichier.

Un `git diff … | git apply` fonctionne aussi, mais un patch qui ne s'applique
plus après une bascule est plus difficile à réparer que des fichiers recopiés.

**La cause n'est pas identifiée.** C'est très probablement la sauvegarde
automatique de l'espace de travail (les instantanés excluent `node_modules`,
`.git` est partiellement capturé). Celui qui trouve la cause gagne des heures.

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
Le 9 octobre, « les 5 cartes sont révélées en même temps et le bouton ne fait
rien » a pu être résolu parce que le code ne produit cette scène **qu'à un seul
endroit** (le tirage Perfect) — mais ce n'est pas une méthode, c'est de la
chance.

Trois parades, par ordre d'utilité :

1. **poser la question qui départage** (« est-ce que tu voyais la bannière
   *Booster Perfect* ? ») plutôt que de deviner ;
2. **décrire ce que le code peut produire** et laisser le joueur trancher ;
3. **l'aperçu Vercel** : le joueur regarde, et décrit. Une URL par commit.

**Les animations CSS ne se vérifient pas.** Il n'y a pas de navigateur : je
contrôle la structure (le DOM, les classes, les variables inline) et je raisonne
sur la feuille de style. Le jugement — « est-ce que c'est beau ? » —
appartient au joueur, et il a déjà tranché deux fois (l'explosion dorée est
partie le 9 octobre pour cette raison).

## 4. Le piège des tests d'écrans

Les bancs (`src/ecrans-banc.tsx`, `npm run ecrans`) montent les composants **à la
main**, et les composants tiennent souvent **leur propre état**. Deux
conséquences, apprises à ses dépens :

- un banc qui monte `RevealOverlay` (ou `TribunalView`) seul **ne passe pas par
  le moteur** : un test d'appui y est sans dents. Le bug des boutons morts du
  Tribunal (8 octobre) et celui du Perfect (9 octobre) ont tous les deux
  nécessité de monter **l'application entière** — ou au moins le composant avec
  de vrais rappels `vi.fn()` — pour que le test voie quelque chose ;
- **toujours vérifier dans les deux sens** : rétablir la ligne fautive, lancer le
  test, constater qu'il **échoue**, puis le remettre. Un test qui n'a jamais rougi
  ne prouve rien. Les deux bugs ci-dessus ont chacun eu leur première version
  « verte pour rien ».

## 5. La chaîne des temps (fragile)

L'ouverture d'un booster est maintenant un enchaînement : suspense du tirage
**650 ms** → déchirure **700 ms** → silence **520 ms** devant une Épique ou
mieux → entrée de carte **720 ms** (**920 ms** en plein écran) → verrou du
Perfect **2 600 ms**. Chaque valeur vit dans un module (`OPENING_DELAY_MS`,
`PACK_TEAR_MS`, `EPIC_SILENCE_MS`, `PERFECT_LOCK_MS`) et le CSS **lit** certaines
d'entre elles en variable inline (`--lock-ms`, `--fx-duration`) — c'est voulu,
une seule vérité. Deux précautions :

- les tests avancent les minuteries **fictives** à la main, avec de la marge :
  toucher une valeur sans regarder les tests les fait tomber ;
- la durée totale ressentie est d'environ **2 s** avant la première carte sur un
  tirage local. Si le joueur la trouve longue, c'est `PACK_TEAR_MS` qu'on
  raccourcit, pas le silence — le silence est ce qui fait le bruit.

## 6. Ce qui attend une décision du joueur

| Sujet | État |
|---|---|
| **Migrations `0040`, `0041`, `0042`** | à coller par le joueur (`npx supabase db push`). Sans `0042`, le bilan du Tribunal affiche le refus du serveur au lieu de verser les points |
| **PR #7** | ouverte, **à ne pas fusionner** sans redemander |
| **Le retournement dos → face** | volontairement reporté : le joueur veut en reparler. L'entrée actuelle part sombre, floue et en miroir à 110°, ce qui *suggère* le dos sans le rendre. Un vrai dos demande un second élément en `backface-visibility` dans un conteneur `preserve-3d` — impossible sur `.creator-card` elle-même (elle rogne son contenu, ce qui aplatit la 3D), faisable sur un conteneur à elle |
| **L'éclat (seul effet restant)** | l'explosion dorée est partie le 9 octobre ; l'éclat est-il, lui aussi, à revoir ? Si oui, il ne restera que le flash blanc et le halo doré de l'entrée |
| **Pager du classement** | question ouverte, sans réponse |
| **« Tu demandes »** | plafonné à 8, question ouverte |
| **`src/lib/live-game.ts`** | seul orphelin réel hors tests, **gardé volontairement** (moteur de la simulation retirée) |
| **Le Tribunal** | 24 cartes + recherche, seuil de karma à 60 % — à confirmer à l'usage |
| **L'APK** | « rien pour l'instant » : Vercel suffit comme canal de test. À la main : `npm run android:debug` |

## 7. L'état du chantier au moment où ce fichier est écrit

- branche `arena/01a10c75-creatordeck`, HEAD `00778ae` — *Le Perfect se range
  d'un coup, et l'explosion dorée s'en va* ;
- suites : `npm test` **1 076 tests** (69 fichiers), `npm run ecrans` **66 tests**
  (13 fichiers, 56 captures), `npm run supabase:verify` **559 contrôles** ;
  `typecheck`, `eslint` et le scanner de vocabulaire muets ;
- déploiement Vercel du commit `00778ae` : **succès** ;
- migrations posées en production : `0001` → `0039`. **Manquent `0040`, `0041`,
  `0042`.**
