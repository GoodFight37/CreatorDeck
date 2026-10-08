# Pour les outils et les IA qui ouvrent ce dépôt

CreatorDeck est un jeu **Android** (Capacitor + Next.js, export statique) dont le
serveur est Supabase. **Le jeu, c'est l'APK** ; GitHub est le bac où le code
s'écrit. Tout l'échange est en français.

Avant de proposer quoi que ce soit :

1. **`docs/perimetre.md`** — les règles non négociables et **ce qui a déjà été
   refusé**, avec la raison : ne pas reproposer sans chiffre nouveau ;
2. le **tableau du suivi en haut du `README.md`** — le journal daté des
   livraisons, du plus récent au plus ancien ;
3. **`docs/revue-externe-2026-10.md` § 3** — les refus techniques et leurs
   raisons.

Pour vérifier de ton côté : `npm run dev:setup` (installe ce qu'il faut), puis
`npm test` (**931** tests), `npm run ecrans` (**22** captures d'écran),
`npm run supabase:verify` (**501** contrôles sur un Postgres jetable).

Deux choses à ne pas faire : écrire sur la branche de travail sans consigne
(**un seul écrivain à la fois**), et présenter un avis comme un résultat — ici,
une affirmation se vérifie en lançant le code.
