# Audit UI/UX mobile — CreatorDeck (23 octobre 2026)

> **Transmission à l'agent qui corrigera :** lis `AGENTS.md`, `DESIGN.md` et
> `docs/perimetre.md` avant de toucher quoi que ce soit. Traite les points dans
> l'ordre du plan d'action (§4) : Quick Wins d'abord, un lot par axe, preuves
> relancées à chaque lot (`npm run typecheck`, `npm run lint`, `npm test`,
> `npm run ecrans`, `npm run build` ; `npm run supabase:verify` si le SQL bouge
> — ici, aucun SQL ne devrait bouger). Vérifie chaque fait dans le code avant
> de corriger (les lignes citées datent du HEAD `01bb6df`). Ne change ni les
> taux ni l'économie. Note joueur pour toute livraison visible, décision dans
> `docs/decisions.md`, défaut consigné dans `docs/known-issues.md`.

**Posture d'évaluation :** jeu TCG de collection mobile tactile, pas un site web.
Base : `main` `01bb6df`. Toutes les affirmations sont relevées dans le code ou
mesurées sur le build du jour. *Limite : aucun navigateur dans le bac à sable —
les mesures d'exécution sont celles des tests et du build, pas de captures.*

**Cadrage honnête avant de critiquer :** CreatorDeck n'est pas un deckbuilder
type Hearthstone. C'est un TCG de collection (boosters → classeur → fabrication
→ arène). J'ai donc audité tes surfaces de « construction » réelles : le
**Binder**, l'**Atelier**, l'**Arène** et la **vitrine**. Ce qui tient déjà la
route : `viewport-fit: cover`, safe areas exploitées partout (`env()`), `100dvh`
systématique (19 usages), `touch-action: manipulation` global, haptique et sons
présents, `prefers-reduced-motion` pris en charge dans 10 feuilles de style,
pagination qui borne le DOM. La base est saine ; ce qui suit, ce sont les écarts
entre cette base et un jeu mobile moderne.

---

## 1. 🚨 À CORRIGER D'URGENCE

### 1.1 Cibles tactiles encore sous 44 px
Ta propre règle (DESIGN.md) est violée par endroits, relevés ligne par ligne :
- `.ghost-button` : 36 px de haut (`globals.css:1966`) ;
- bouton « effacer la recherche » du Binder : **24×24 px** (`globals.css:1686`) ;
- bouton fermer des toasts d'erreur : **24×24 px** (`globals.css:2250`) ;
- bouton fermer de la fiche profil : **30×30 px** (`globals.css:2828`) ;
- bouton fermer de l'en-tête de révélation : **34×34 px** (`globals.css:2317`).

Sur un téléphone tenu à une main, un bouton de 24 px, c'est un échec d'appui
une fois sur trois. Correction type : ne pas grossir le visuel — étendre la
zone de frappe (`padding` + `margin` négatif, ou pseudo-élément `inset: -10px`).

### 1.2 Champs de saisie à 12–14 px : zoom forcé et « effet formulaire »
- `.account-field input` : **12 px** (`globals.css:2692`) ;
- recherche Binder : 14 px (`:1684`), tri : 14 px (`:1706`), recherches Arène
  13 px (`:3285`) et Tribunal 14 px (`:3447`).

Sous 16 px, Safari iOS zoome d'office au focus et ne dézoome jamais : sur le
web/Vercel, chaque recherche déforme l'écran. Sur l'APK Android, pas de zoom,
mais un champ à 12 px reste illisible à bout de bras. Un jeu ne fait jamais
taper dans un champ minuscule : 16 px minimum, fond plein, hauteur 48 px.

### 1.3 Le premier chargement fait payer les deux catalogues d'un coup
Mesuré sur le build du jour : l'accueil charge **13 scripts, ~714 Ko gzip**
(JS + CSS), dont un chunk de **1 468 Ko brut** qui contient les données des
catalogues. `src/lib/memes.ts` construit `MEME_CARDS` en important
statiquement les JSON Mèmes FR **et** Imgflip (~3 150 cartes) dans le graphe
de l'écran d'accueil. Sur la web, c'est plusieurs secondes de 4G avant le
premier sachet ; sur l'APK, c'est du temps de parse sur les CPU d'entrée de
gamme — exactement les téléphones de ton public. Un joueur ne doit payer le
catalogue Mèmes que lorsqu'il ouvre l'univers Mèmes.

### 1.4 L'APK embarque 139 Mo d'assets
`out/` pèse **139 Mo** (dont `imgflip-web` 56 Mo et `creators` 33 Mo), et
Capacitor copie `out/` tel quel dans l'APK (`capacitor.config.ts:8`,
`webDir: "out"`). Un package de cette taille dégrade l'installation et les
mises à jour. Les images Imgflip doivent partir en pack téléchargeable à la
demande ou en CDN mis en cache, pas dans le binaire.

### 1.5 Zones de scroll imbriquées dans les feuilles
Trois sélecteurs internes défilent dans des boîtes de 190–260 px à l'intérieur
d'une feuille déjà scrollable : `.showcase-picker` 190 px (`globals.css:2756`),
`.trade-pick` 210 px (`:2802`), `.arena-picker` 260 px (`:3287`). Au doigt,
c'est le piège classique : le geste part dans la mauvaise zone, la feuille
bouge au lieu de la liste. Une feuille mobile = un seul axe de scroll, pleine
hauteur, avec en-tête et action principale épinglés.

### 1.6 Le Binder se feuillette… en 84 pages
1 000 créateurs à raison de 12 par page (`binder-view.tsx`, `perPage = 12`) :
**~84 pages** à tourner pour traverser le catalogue, et le **seul** outil de
navigation est la recherche texte. Pas de filtre rareté, famille, possédées /
manquantes / doublons, pas de tri. Le feuilletage est un charme d'album, mais
comme outil de construction c'est l'équivalent d'un classeur sans intercalaires.
Le pire : le classeur Mèmes, lui, a déjà filtres rareté + « Obtenues »
(`meme-deck.tsx:91-99`). Deux classeurs, deux niveaux d'outillage — le joueur
ne comprend pas pourquoi le principal est le moins bien outillé.

---

## 2. ✏️ À MODIFIER / OPTIMISER

### 2.1 Visualisation des cartes
- La grille 3 colonnes donne des cartes d'environ 118 px de large à 390 px :
  correct pour un album, limite pour juger une carte. Le libellé de rareté
  imprimé descend à **8 px** (`globals.css:4712`, `clamp(8px, 5.4cqw, 13px)`)
  et la région à 8 px aussi (`:4714`). La rareté se sauve par la couleur du
  cadre — bien — mais à cette taille, le texte ne sert plus à rien : autant
  l'assumer (pastille couleur seule en grille, texte réservé à la fiche).
- Aucun réglage de densité (2/3/4 colonnes) : les jeux de collection laissent
  le joueur choisir entre « voir beau » et « voir beaucoup ».
- La fiche carte (inspect) est bonne — grande, foil qui suit le doigt, copies
  par variante — mais elle s'ouvre en **modale centrée** type web, alors que
  tout le reste de l'app pense en feuilles basses. Unifier : fiche en feuille
  pleine hauteur ancrée en bas, photo en haut dans la zone sûre du regard,
  actions (Fabriquer, Vitrine, Souhait) en bas, dans la zone du pouce.

### 2.2 Manipulation
- **Zéro glisser-déposer** dans toute l'app : tout est tap → modale → bouton.
  Pas de pression longue sur une carte (aperçu rapide, menu contextuel), pas
  de multi-sélection. Pour gérer des doublons par dizaines, c'est rédhibitoire
  à terme : propose pression longue = sélection multiple, barre d'actions
  basse (Fabriquer les manquantes / Mettre en vitrine / Marquer).
- Le geste de feuilletage du Binder entre en concurrence avec le scroll
  vertical de la page (seuil `1.5×` diagonal, `binder-view.tsx:190-197`) :
  sur les petits écrans, un scroll un peu oblique tourne la page au lieu de
  descendre. À durcir : ne reconnaître le feuilletage que dans la bande de la
  grille, jamais pendant un scroll commencé.
- L'Arène construit son équipe par listes déroulantes internes (voir 1.5) :
  un vrai pattern de jeu serait des emplacements tactiles en bas + grille
  pleine largeur, ajout/retrait en un tap, compteur « 3/5 » toujours visible.

### 2.3 Feedback visuel et « courbe de mana » locale
- L'équivalent local de la courbe de mana — coût de fabrication par rareté et
  répartition de ta collection — n'existe nulle part en visuel : le coût n'est
  visible qu'au fond de la fiche (`craftQuote`), et l'avancement par famille
  vit dans Objectifs, pas dans le Binder. Un encadré « Collection : 3xx/1 000 ·
  12 % » + mini-barres par rareté en tête du Binder changerait le pilotage.
- États de chargement pauvres : « Lecture de ta réserve… » en texte nu, aucun
  squelette. Sur réseau lent, l'écran Drop a l'air cassé pendant que les RPC
  répondent. Squelettes pulsants sur sachet/réserve/classeur.
- Les changements d'onglet sont secs (aucune transition de vue) alors que les
  objets de nav sont animés : 150 ms de fondu/glissement entre vues
  suffiraient à donner une sensation d'app native.
- Points forts à conserver : haptique dosée, sons de rituel, foil, page-turn
  à 180 ms, badge LIVE honnête (jamais périmé). Ne pas y toucher.

### 2.4 Zone du pouce
- Le haut d'écran concentre badge de niveau, sabliers, points (`app-chrome.tsx:71-96`)
  et l'engrenage : sur un 6,7", tout cela est hors zone confortable à une main.
  Le niveau/profil mérite d'être atteignable d'en bas (appui long sur l'objet
  Binder, ou 4ᵉ accès dans la barre). La barre basse à 3 objets est, elle,
  exemplaire (centre élargi, `globals.css:2198`).
- Les feuilles centrées (profil, `globals.css:2825`) placent leurs fermetures
  en haut : en feuille basse, la fermeture tombe sous le pouce.

---

## 3. ➕ À AJOUTER

1. **Barre d'outils du Binder digne d'un deckbuilder** : chips tactiles
   Rareté / Famille / Possédées / Manquantes / Doublons + tri (rareté, récent,
   nom, plus de copies) en **feuille de filtres** ancrée en bas, compteurs en
   direct (« 37 cartes »). C'est LE manque numéro un.
2. **Statistiques rapides de collection** : en tête de Binder — % total, par
   famille, par rareté (mini-barres), doublons détenus, jetons. Version jeu :
   un anneau de complétion par famille, comme les saisons mais dans le classeur.
3. **Partage visuel** : générer une image (canvas) de la vitrine ou de la
   dernière Légendaire → feuille de partage native. C'est l'outil de fierté
   d'un TCG, et ton `showcase` a déjà la matière.
4. **Multi-sélection + actions de masse** (pression longue) : fabriquer les
   manquantes d'une famille, gérer les doublons en un flux.
5. **Rappel de réserve** : la réserve pleine (4/4) est l'équivalent d'une
   « main prête » : badge déjà là sur le Drop ; ajouter notification locale
   « Ton booster t'attend » (opt-in existant à brancher).
6. **Mode « voir grand »** : densité de grille réglable et aperçu par pression
   longue sans ouvrir la fiche (mi-chemin entre grille et inspect).
7. **Immersion à coût nul** : fond du Drop teinté par le direct en cours
   (le halo existe déjà), dos de carte animé au retour du premier plan,
   micro-vibration différenciée par rareté à la révélation (déjà partiel).

Ce qui existe déjà et qu'il ne faut **pas** réinventer : liste de souhaits,
aperçu d'Atelier, vitrine, thèmes de classeur, Last Pack, essai de booster
tutoriel (ton « simulateur ») — les briques sont là, il manque les coutures.

---

## 4. 🛠️ PLAN D'ACTION RECOMMANDÉ

### Quick Wins (aujourd'hui, fort impact / faible risque)
1. Zones de frappe à 44 px partout (1.1) — une passe CSS ciblée, liste fournie.
2. Champs à 16 px / 48 px de haut (1.2) — supprime le zoom iOS et l'effet formulaire.
3. Ligne de stats en tête de Binder (« N/1 000 · % · doublons ») — données déjà calculées.
4. Chips Rareté + Possédées/Manquantes dans le Binder — portage du pattern Mèmes existant.
5. Squelettes de chargement sur Drop et Binder (remplace les textes nus).
6. Sortir les données Imgflip du graphe initial (import dynamique à l'ouverture de l'univers) et verrouiller un budget de poids en CI (1.3).

### Prochaines étapes (structurel)
1. Feuille de filtres + tri complète du Binder ; densité de grille réglable ; durcir le geste de feuilletage (2.1, 2.2).
2. Fiches et sélecteurs en feuilles basses pleines, un seul scroll, actions épinglées en zone du pouce (1.5, 2.1, 2.4).
3. Pression longue : aperçu, multi-sélection, actions de masse (2.2, 3.4).
4. Partage d'image vitrine/révélation (3.3) ; statistiques de collection visuelles (3.2).
5. Diète d'assets : Imgflip hors du binaire APK, pack téléchargeable ou CDN caché (1.4).
6. Passe paysage + grands écrans (l'app est pensée portrait 560 px max ; à vérifier sur tablette et pliables).
