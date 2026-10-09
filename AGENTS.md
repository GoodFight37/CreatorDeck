# Pour les outils et les IA qui ouvrent ce dépôt

CreatorDeck est un jeu **Android** (Capacitor + Next.js, export statique) dont le
serveur est Supabase. **Le jeu, c'est l'APK** ; GitHub est le bac où le code
s'écrit. Tout l'échange est en français.

Avant de proposer quoi que ce soit :

1. **`docs/perimetre.md`** — les règles non négociables et **ce qui a déjà été
   refusé**, avec la raison : ne pas reproposer sans chiffre nouveau ;
2. la **feuille de route** ([`docs/roadmap.md`](docs/roadmap.md)) puis le
   **journal daté des livraisons**
   ([`docs/historique-livraisons.md`](docs/historique-livraisons.md)) — le
   passé, du plus récent au plus ancien ;
3. **`docs/revue-externe-2026-10.md` § 3** — les refus techniques et leurs
   raisons ;
4. **`docs/atelier-et-problemes.md`** — ce qui casse ici, écrit par celui qui
   l'a rencontré : la bascule du dépôt, l'environnement, ce qu'on ne peut pas
   voir, et la liste de ce qui attend une décision du joueur.

Pour vérifier de ton côté : `npm run dev:setup` (installe ce qu'il faut —
`node_modules` peut être vide au réveil, `tsc: not found` n'est pas une panne),
puis `npm test` (**1 079** tests), `npm run ecrans` (**66** tests, **56**
captures), `npm run supabase:verify` (**559** contrôles sur un Postgres
jetable).

## Si tu écris dans ce dépôt

**Ces règles lient l'IA, pas le joueur.** Elles ne protègent pas le code contre
lui : si le joueur signale un problème, c'est un fait nouveau et la question est
rouverte — il suffit de le dire. Et **une règle dont on ne dit pas la raison ne
vaut rien** : chaque verrou ci-dessous écrit ce qu'il évite. Si tu penses que
l'un d'eux est une erreur, dis-le avec ton argument — tu peux avoir raison, et
c'est même souhaitable.

### Les verrous : ils empêchent des dégâts, pas des idées

- **Un seul écrivain à la fois.** Dis **quels fichiers** tu prends avant de
  commencer, et tire la branche avant de pousser (`git pull --rebase`). Pas de
  `--force`, pas de `worktree`.
- **Jamais `git add -A .`** : l'index de ce dépôt peut raconter une autre
  histoire que le répertoire de travail (voir `docs/atelier-et-problemes.md`
  § 1) ; un ajout global rétablirait l'ancien code en le faisant passer pour le
  tien. On ajoute **fichier par fichier**.
- **Migrations SQL** : `NNNN_nom.sql` dans `supabase/migrations/`, et rien
  d'autre. `supabase migration new` écrit un préfixe à 14 chiffres, que
  `db push` refuse ensuite ; `0027_*` est déjà pris par `0027_wallet` ; et
  `supabase migration repair` **sans la liste des numéros** marque tout le
  dossier comme posé — la migration ne partira jamais, et rien ne le dira.
- **Ne pose jamais de migration en production** : aucune route réseau ne sort
  d'ici vers Supabase. Elles sont collées **par le joueur**
  (`npx supabase db push`). Au 9 octobre 2026 : `0001` → `0039` sont posées,
  **`0040`, `0041`, `0042` attendent**.
- **Le crédit du pack d'effets** reste dans `src/lib/credits.ts` tant que
  `public/fx/eclat.png` sert : c'est une obligation de licence, pas un usage.
- **Ne fusionne pas la PR #7** sans que le joueur le redemande.

### Les décisions de goût : réversibles en un mot

Celles-ci ne protègent aucun mécanisme. Ce sont des choix du joueur, datés,
écrits pour qu'on ne les défasse pas **par inadvertance** — un « je veux que ça
change » les lève, et une raison nouvelle les rouvre.

- **Plus aucun son de déplacement** (8 octobre) : onglets, portes, feuilles,
  interrupteur et reflets sont muets. Plafond à −6 dBFS, les WAV ne se
  ré-encodent pas.
- **L'explosion dorée a été supprimée** (9 octobre) : la hiérarchie des raretés
  se lit dans la **taille**, plus dans un second sprite.
- **`streamer.ts`, `streamer.json`, `swipe.ts`** : le joueur a demandé qu'on n'y
  touche pas pendant le nettoyage du 8 octobre. Ce n'est pas un interdit
  perpétuel — mais préviens avant d'y entrer.
- **Ni Redux ni `store.ts`**, **pas de vocabulaire cloud dans l'interface** :
  refusés avec leurs raisons dans `docs/revue-externe-2026-10.md` § 3.

### Et un compteur qui vit à trois endroits

`README.md`, `docs/perimetre.md` et le corps de la PR #7 portent les mêmes
chiffres. Un test ajouté ou retiré se répercute dans les trois, sinon le
suivant lira un compte faux.

## Deux principes

Présenter un avis comme un résultat est la seule faute grave ici : une
affirmation se vérifie en lançant le code, jamais en relisant. Et une animation,
une couleur ou un son **ne se vérifient pas** depuis un terminal — dis « je ne
l'ai pas vu » plutôt que « ça marche » : c'est une information, pas un aveu
d'échec.
