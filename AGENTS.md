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

- **Un seul écrivain à la fois.** Dis **quels fichiers** tu prends avant de
  commencer, et tire la branche avant de pousser (`git pull --rebase`). Pas de
  `--force`, pas de `worktree`, et **jamais `git add -A .`** : un ajout global
  peut rétablir l'ancien code en le faisant passer pour le tien — c'est arrivé
  neuf fois en deux jours, voir `docs/atelier-et-problemes.md` § 1.
- **Migrations SQL** : `NNNN_nom.sql` dans `supabase/migrations/`, et rien
  d'autre. Jamais `supabase migration new` (préfixe à 14 chiffres : `db push`
  refuse ensuite), jamais `0027_*` (le numéro est pris par `0027_wallet`), et
  jamais `supabase migration repair` **sans la liste des numéros** — sans liste,
  il marque tout le dossier comme posé et ta migration ne partira jamais.
- **Ne pose jamais de migration en production** : aucune route réseau ne sort
  d'ici vers Supabase. Les migrations sont collées **par le joueur**
  (`npx supabase db push`). Au 9 octobre 2026 : `0001` → `0039` sont posées,
  et **`0040`, `0041`, `0042` attendent**.
- **Les compteurs vivent à trois endroits** : `README.md`, `docs/perimetre.md`
  et le corps de la PR #7. Un test ajouté ou retiré se répercute dans les trois.
- **Ne touche pas sans demande** : `src/lib/streamer.ts`,
  `src/data/streamer.json`, `src/lib/swipe.ts`, les migrations déjà posées, et
  les sons (trois consignes du 8 octobre : plus aucun son de déplacement,
  plafond à −6 dBFS, ne pas ré-encoder les WAV).
- **Ne fusionne pas la PR #7** sans que le joueur le redemande.
- **Tant que `public/fx/eclat.png` sert**, la licence du pack d'effets exige que
  son crédit reste dans `src/lib/credits.ts`.

## Deux principes

Présenter un avis comme un résultat est la seule faute grave ici : une
affirmation se vérifie en lançant le code, jamais en relisant. Et une animation,
une couleur ou un son **ne se vérifient pas** depuis un terminal — dis « je ne
l'ai pas vu » plutôt que « ça marche » : c'est une information, pas un aveu
d'échec.
