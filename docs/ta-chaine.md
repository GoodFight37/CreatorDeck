# Suivi du chantier : Ta chaîne (Streamer Simulator)

> ## ⚠️ Cette fonctionnalité n'est plus dans l'application
>
> La simulation de streameur — l'écran « Ta chaîne » et son live de vingt
> secondes — a été **retirée de l'application le 8 octobre 2026 au soir**, sur
> décision de produit : il ne reste, côté joueur, que les **quatre piliers** du
> jeu de cartes (Drop, Binder, Craft, Toi).
>
> **Ce fichier reste la référence** de ce qui avait été construit : les étapes,
> les règles, les chiffres, les décisions. Rien n'a été perdu côté moteur —
> `src/lib/streamer.ts`, `src/data/streamer.json`, `src/lib/live-game.ts`,
> `src/lib/swipe.ts`, les migrations `0036` à `0041` et leurs tests sont
> **toujours dans le dépôt**, et **aucune migration n'est à recoller** si l'écran
> revient un jour. Ce qui n'existe plus : le composant (`studio-view.tsx`), le
> mini-jeu (`streamer-live-game.tsx`), la ligne de l'accueil qui les ouvrait, et
> leurs styles.
>
> Ce qui reste **vivant** dans la suite du jeu : les **bruitages** (tous sous
> l'interrupteur *Son*), les **cartes** et leurs effets de rareté, et l'**Arène**
> (l'emblème qui se gagnait dans l'Arène ne se pose plus nulle part : il se lit
> dans l'Arène).

> **Ce fichier est la feuille de route du chantier.** Les cases disent l'état
> **réel**, pas l'intention : une case se coche quand la chose est **livrée et
> poussée** sur la branche de travail, jamais avant. À chaque livraison ou
> modification du chantier, les cases de ce fichier sont mises à jour dans le
> même commit. Ce qui est décidé mais pas encore écrit se dit ici, en clair.
>
> Le détail des règles vit ailleurs, et c'est lui qui fait foi :
> `docs/cloud-supabase.md` § 8 « Les invités sur le bureau (`0039`) », « Les
> imprévus et le setup de la chaîne (`0038`) » et « La chaîne vit au serveur
> (`0036`) », plus le journal daté du `README.md`.

## 1. Ce qui est fait et fonctionnel

- [x] **Étape 1 : Mécanique pure (formats, notoriété, JSON)** — tout le réglage
  vit dans `src/data/streamer.json` (cinq paliers de notoriété, quatre formats,
  six imprévus, jetons, setup) et la mécanique dans `src/lib/streamer.ts` :
  croissance par **journées de jeu** (6 h UTC, la même que les missions), retour
  d'absence **plafonné à 7 journées** (une absence ne paie jamais mieux que le
  jeu), horloge reculée qui ne crédite rien. Testée sans navigateur
  (`src/lib/streamer.test.ts`).

- [x] **Étape 2 : Serveur Supabase et stockage des abonnés/vidéos** —
  `supabase/migrations/0036_streamer.sql` : `streamer_channels` (les abonnés, le
  dernier relevé) et `streamer_videos` (une vidéo par journée de jeu, index
  unique `(user_id, day)`), fermées au joueur comme les autres. Trois portes :
  `streamer_status()` lit, `streamer_visit()` paie le retour **une fois**,
  `streamer_publish(format)` **tire la vidéo du jour côté serveur** — le client
  n'envoie qu'un nom de format. Jetons **6** (+10 au buzz), **plafond 40 par
  journée**, versés par `_tokens_apply()` (`0035`).

- [x] **Étape 3 : Écran d'accueil et feuille de chaîne basique** — la porte
  « Ta chaîne » sur l'accueil ouvre l'écran de la chaîne (aujourd'hui
  `src/components/studio-view.tsx` — un **écran sans onglet** depuis le retrait
  du 8 octobre 2026, voir l'encadré du § 2) :
  abonnés, palier et ce qu'il reste à trouver, calendrier des formats avec
  leurs chances publiées, résumé du retour, jetons du jour (x / 40). Hors
  ligne, `src/lib/cloud/store/streamer.ts` renvoie au moteur local, qui
  applique les mêmes règles dans `state.streamer`.

- [x] **Étape 4 : Les imprévus à choix, et « Ton setup »** —
  `supabase/migrations/0038_imprevus_setup.sql`. Une **carte d'imprévu par
  journée de jeu** (six cartes, deux côtés chacune), tirée **par le serveur**
  (`md5(joueur, journée)` : la même toute la journée), jouée en glissant la
  carte à gauche ou à droite (`src/lib/swipe.ts`) ou en appuyant sur un bouton.
  Un imprévu ne paie **aucun jeton** et ne se rejoue pas.
  **« Ton setup »** : cinq paliers payés en **points** — webcam 120, micro 320,
  éclairage 780, déco 1 800, vrai studio 4 200 — **dans l'ordre et une seule
  fois**, +3 / +5 / +7 / +10 / +25 % de croissance **définitive** (+50 % au
  bout). Le débit passe par le wallet du serveur, le prix ne vient jamais du
  client, et la croissance du setup est payée **partout** (statut, absence et
  vidéo du jour) par la même fonction `_streamer_growth()`.

  > **Posée en production** (`0038`) avec `0036` et `0037`, le 8 octobre 2026.
  > Le geste est `npx supabase db push` ; pour vérifier après :
  > `npx supabase migration list` (les colonnes Local et Remote se répondent).

- [x] **Étape 5 : le live de 20 secondes (`StreamerLiveGame`)** — le premier
  mini-jeu de la chaîne : on passe en direct, **le chat défile** en bas du cadre
  et des **bulles d'alerte** tombent — un follower, un abonné, un raid, un
  message qui compte. On les attrape en appuyant dessus **avant qu'elles ne
  s'effacent** ; le bilan compte ce qui a été attrapé, puis propose de publier la
  vidéo du jour. Le réglage (vingt secondes, les cadences du chat, la durée de
  vie et le nombre des bulles par palier, les messages) vit dans
  `src/data/live-game.json` ; la mécanique pure dans `src/lib/live-game.ts` ; la
  scène dans `src/components/streamer-live-game.tsx`. Ce qui décide de tout :
  **le plan ne dépend que de `(journée de jeu, palier)`** — un générateur amorcé
  par ces deux valeurs — donc rouvrir l'écran **rejoue la même scène** : on ne
  relance pas le live pour tomber sur un tirage plus clément. La **cadence suit
  la notoriété** (8, 12, 18, 26, 36 messages/minute ; 1, 2, 3, 4, 5 bulles) :
  c'est le miroir des cinq paliers du serveur, et le vérificateur l'attrape si
  l'un des deux camps bouge sans l'autre. **Aucune monnaie ne tombe ici** — ni
  jeton, ni point, ni abonné — et l'écran le dit mot pour mot.

- [x] **Étape 6 : les invités sur le bureau** —
  `supabase/migrations/0039_invites_bureau.sql`. **Deux cartes de sa
  collection** tiennent le plateau (deux créateurs **différents**, une carte par
  créateur, et la carte doit être **vraiment au joueur** : `card_claim_covers`,
  la règle des échanges et de l'hôtel). Quand le créateur d'un invité est
  **réellement en direct** — fenêtre de dix minutes, la même que le badge de
  l'accueil (`live_state.refreshed_at`) — son passage amène un **raid** :
  `floor(croissance du jour × pour-mille / 1000)` abonnés, **15 / 25 / 40 / 60 /
  90** pour mille selon la rareté de la carte (Commune → Légendaire). Le raid se
  paie **dans le relevé de la chaîne**, **une seule fois par journée de jeu** :
  la ligne de `streamer_raids` est la preuve du paiement, donc changer d'invité,
  rouvrir l'écran ou reposer une carte **ne repaie jamais** — et un relevé qui ne
  paie rien n'écrit rien, ce qui laisse la journée ouverte si le direct n'était
  pas encore frais. **Gratuit** : ni jeton, ni point, ni monnaie nouvelle — le
  raid ne rapporte que des abonnés. Un invité **hors ligne** ne rapporte rien, et
  l'écran le dit. L'écran (`src/components/studio-view.tsx`, section
  « Le bureau ») montre les deux places, l'état du direct (allumé seulement si le
  créateur streame maintenant) et la liste des créateurs **en direct** de ta
  collection pour choisir ; hors ligne, le moteur local
  (`setStreamerGuestLocally`, `payStreamerRaidLocally`) applique les mêmes règles.

  > **Posée en production le 8 octobre 2026** — et c'est la **première
  > migration posée par le CLI** : l'historique de la base a d'abord été mis au
  > niveau de ce qu'elle portait déjà (`npx supabase migration repair --status
  > applied 0001 … 0038`, qui n'exécute rien), puis `npx supabase db push` a
  > appliqué `0039` seul. Plus rien ne se colle à la main ; pour **vérifier
  > après** : `npx supabase migration list` (les deux colonnes se répondent).

- [x] **Étape 7 : le studio, payé en doublons** —
  `supabase/migrations/0040_setup_doublons.sql`. La **seconde série** que la
  note du fichier annonçait (« cette première partie » devait d'abord
  accrocher) : trois paliers de plus (rangs 6 à 8), payés en **doublons** de la
  collection. **La rareté donne le prix** — un Rare vaut 1, un Épique vaut 2 —
  et une **Légendaire ne part jamais**, pas plus que la **dernière copie** d'un
  couple créateur + variante (la règle du recyclage). Le serveur relit la carte
  dans la sauvegarde, la rareté au catalogue, la valeur au barème : l'appel ne
  porte que des identifiants de cartes, et l'écran applique **le verdict** (les
  cartes réellement consommées), jamais la sélection. Une carte ne part qu'une
  fois : la table `streamer_sacrifices` en porte la preuve. Prix 2, 5 et 10
  points de sacrifice pour +100, +150 et +250 pour mille — **+100 % au bout des
  huit paliers**, soit une chaîne qui grandit deux fois plus vite qu'à ses
  débuts. L'écran ouvre le panneau **Le studio** : les doublons qui peuvent
  partir, la sélection comptée, et une **confirmation** avant le départ.

- [x] **Étape 8 : la scène du bureau, et le plateau sur la vidéo** —
  `supabase/migrations/0041_collab_plateau.sql` (`StreamerDeskStage`, remplacé
  depuis par la scène de l'étape 10 — **elle-même retirée** le 8 octobre 2026 au
  soir ; les invités, eux, sont restés : ils vivent dans le bureau en cartes, au
  même endroit de l'écran).
  Deux moitiés dans le même geste. **La scène d'abord** : le bureau n'est plus
  une liste de texte, c'est le **studio** — mur sombre, néon violet, sol, et
  **huit objets** qui s'allument un par un avec les paliers achetés (Caméra,
  Micro, Éclairage néon, Déco, Fond de studio, Seconde caméra, Régie, Plateau).
  Les deux places d'invités sont des **socles** : une carte posée est une
  **vraie carte du classeur** (`CreatorCard` compacte), une place libre est un
  socle **en pointillés** avec un « + » qui ouvre le classeur ; un invité dont le
  créateur streame **maintenant** porte une **aura rouge qui pulse** et un badge
  **LIVE**, et la scène passe en mode raid avec son bandeau **« RAID ! »**.
  **Le plateau ensuite** : les invités comptent sur la **vidéo du jour**, au
  moment de la publier — la **rareté donne le bonus** (2 % pour une Commune,
  3, 5, 8, **12 % pour une Légendaire**) et un invité **en direct** ajoute
  **+15 %** au gain et **+25 points de chance de buzz**. Le bonus de rareté
  s'applique **avant** le ×3 du buzz : une vidéo qui buzze sur un plateau rare
  paie **trois fois le plateau**. Le direct **s'ajoute** au total (rareté **plus**
  direct), et **tous les multiplicateurs vivent dans `src/data/streamer.json`** —
  la scène n'en invente aucun, le serveur les relit **au moment de publier**
  (`_streamer_collab()`, `_streamer_collab_values()`, `_streamer_collab_live()`),
  et `streamer_status()` annonce ce que le plateau vaut **maintenant**. Le raid
  (`0039`) et la collab ne paient pas la même chose : le raid paie le passage d'un
  invité **pendant l'absence** (une fois par journée, au relevé), la collab
  bonifie la vidéo **que tu publies**.

  > **Poser `0041` après `0040`** : `npx supabase db push`. Pour vérifier après :
  > `npx supabase migration list`, ou `select public.schema_versions() -> '0041';`
  > qui doit rendre `true`.

  > **Un mot sur la technique.** La scène est écrite dans le **système de
  > variables CSS du projet** (`src/app/globals.css`, blocs `.chaine-stage*`,
  > `.chaine-room`, `.chaine-stand*`, `.chaine-hud*` : lueurs ≤ 0,65, **une
  > seule animation perpétuelle** — l'aura du direct — que `prefers-reduced-motion`
  > **et** l'interrupteur « Reflets des cartes » coupent). **Tailwind n'est
  > toujours pas branché dans ce dépôt** : les paquets sont bien installés
  > (`tailwindcss`, `@tailwindcss/postcss`, postés par `postcss.config.mjs`),
  > mais `globals.css` n'importe jamais Tailwind — **aucune classe utilitaire ne
  > s'applique**. Brancher Tailwind serait un chantier à part (il toucherait
  > tous les écrans) et ne se fait pas en douce : la refonte ci-dessous suit
  > donc le système de tokens maison, celui du reste du jeu.


- [x] **Étape 9 : la refonte visuelle — l'écran devient un jeu** —
  `src/components/streamer-studio-stage.tsx`. La consigne est nette : « on
  arrête le mode tableau de bord en texte ». Ce qui a changé :

  * **le studio** est une **scène** dessinée en SVG (mur, panneaux acoustiques,
    bandeau néon, sol, bureau) — **remplacée par l'étape 10** : la pièce est
    aujourd'hui composée de **vraies images**, et un palier non acheté n'est
    plus une silhouette éteinte mais une **place vide** — où **huit objets
    s'allument un par un avec les paliers achetés** ;
  * **le HUD arcade** remplace les trois chiffres en texte : badge de rang
    (trophée + palier), **jauge** d'abonnés qui se remplit vers le palier suivant
    (« 0 / 2 500 »), pilule du rythme (« ⚡ +240 / jour »), compteur de jetons ;
  * **les deux socles** sont des supports d'acrylique sur le bureau : une
    **vraie carte** du classeur posée dessus (avec sa perspective), un
    **piédestal translucide** au halo quand la place est libre — plus aucune
    boîte pointillée « Place 1 libre / Choisir un invité » ;
  * **un invité en direct** vire au rouge : aura qui pulse, badge **EN DIRECT**
    et ses spectateurs, bandeau **« RAID ! »** ;
  * **plus de notices** : des **badges** (« Événement du jour », « Vidéo du
    jour », « Ton setup », « Vidéo publiée »), une **carte d'imprévu compacte**
    (icône, titre, deux lignes, **deux gros boutons arcade** avec leurs
    pourcentages), des tuiles de format, un **setup en cartes de palier** (rang,
    prix, gain, action) ;
  * ce qui reste écrit tient en **une ligne** : la journée de jeu (6 h UTC) et
    le plafond d'absence — deux chiffres publiés que le joueur doit pouvoir
    lire quelque part.

  **Ce qui n'a pas bougé : la logique.** Le moteur (`src/lib/streamer.ts`), les
  multiplicateurs (`src/data/streamer.json`) et le serveur (`0041`) sont
  **inchangés** — `src/lib`, `src/data` et `supabase/` ne sont pas touchés par
  ce commit. L'écran affiche toujours les chiffres que le serveur paiera.

- [x] **Étape 10 : le Studio devient un onglet, et la pièce passe aux vraies
  images** — `src/components/studio-view.tsx` + `src/lib/studio-room.ts` +
  `src/data/studio-room.json`. La consigne : « Ta chaîne » n'est plus une
  feuille posée par-dessus la barre, c'est **un lieu** — et il se dessine avec
  les vraies images de `public/streamer/`. Ce qui a changé :

  * **un cinquième onglet** (`Studio`, icône clapper) dans la barre du bas :
    `Tab` s'étend, `NAV_ITEMS` gagne sa ligne, `.bottom-nav` passe à cinq
    colonnes, la **modale disparaît** (`{streamerOpen ? <StreamerSheet … /> :
    null}`, `useBackHandler`, l'état et le bouton « X » sont supprimés) — et la
    porte de l'accueil (`onShowStreamer`) fait maintenant `setTab("studio")` ;
    la vue se rend **dans le flux** (`app-content`), exactement comme le drop et
    le classeur ;
  * **une vraie pièce isométrique**, composée d'**images** du kit Kenney
    « Isometric Miniature » (CC0) : neuf tuiles de sol, six segments de mur
    (assombris et bleutés en CSS — c'est un studio, pas un salon), le bureau
    d'angle, l'écran, le clavier, la souris, le siège, l'étagère, la plante.
    Plus rien n'est dessiné à la main : les rares formes CSS sont deux
    équipements que le kit ne fournit pas (une **webcam** à voyant REC, un
    **micro sur bras**) et les **néons** du mur ;
  * **les paliers entrent dans la pièce** : la table de la webcam, l'enceinte et
    l'enceinte de bureau, la lampe de sol et son halo chaud, le tapis et les
    **quatre panneaux acoustiques** (le kit les fournit), le canapé et les deux
    **tubes néon** violet et cyan, le portable, la console de régie, le meuble
    télé et le grand écran. Un palier non acheté **n'est pas là** : plus de
    silhouette éteinte, plus rien à cocher — et un test vérifie que **chacun des
    huit paliers** fait bien entrer quelque chose (un palier payé pour rien
    serait un mensonge du décor) ;
  * **les deux socles d'invités** sont posés **sur le devant du bureau** : une
    place libre est un **piédestal translucide** et son halo (jamais une boîte
    pointillée, jamais un « + », jamais « Place 1 libre ») ; une place occupée
    porte une **vraie `CreatorCard`** en miniature, inclinée en perspective, avec
    sa pastille de rareté et sa part de vidéo, et une croix pour la retirer ;
  * **l'invité en direct** garde son aura rouge qui pulse, son badge
    **EN DIRECT** (avec ses spectateurs) et le bandeau « RAID ! » — et le voyant
    REC de la webcam bat avec lui : c'est la pièce qui dit « on est en direct » ;
  * **le HUD arcade** est conservé tel quel (badge de rang, jauge d'abonnés vers
    le palier suivant, pilule du rythme, jetons du jour) : c'est un HUD, pas un
    tableau de bord — et **aucun pavé de texte** n'est venu s'y ajouter ;
  * **un fichier pour la pièce** : `src/data/studio-room.json` dit quoi poser et
    où (sol, murs, meubles, panneaux, néons, accessoires, socles),
    `src/lib/studio-room.ts` fait le calcul (pur), et
    `src/lib/studio-room.test.ts` **ouvre les vrais PNG** pour vérifier la taille
    annoncée, le point de contact de chaque sprite et la couverture des paliers.
    Une image remplacée par une autre casse le test, pas la pièce.

  **Ce qui n'a pas bougé : la logique.** `src/lib/streamer.ts`,
  `src/data/streamer.json`, `src/data/live-game.json` et `supabase/` sont
  **inchangés** : mêmes paliers, mêmes multiplicateurs, même serveur (`0041`).
  La pièce ne décide de rien — elle montre.

- [x] **Le jus : les moments rares se voient** (8 octobre 2026) — trois ajouts,
  aucune règle touchée, **aucune migration à coller**. **La révélation** :
  l'Épique a son **éclat**, la Légendaire et le Perfect le même **en plus grand**
  et leur écran blanc — des planches pixel-art (`public/fx/`, 44 Ko) découpées
  en CSS, calées sur le son (`src/lib/fx.ts` décide, `effect-burst.tsx`
  affiche) ; rien sous l'Épique, et tout se coupe avec le réglage des reflets.
  **L'achat d'un palier** : la pièce se **relit** après l'achat (elle ne le
  faisait qu'à l'ouverture de l'onglet — l'objet était payé et invisible), les
  objets du palier **tombent en place**, du fond du mur vers le devant du
  bureau, et une **bouffée de fumée** marque l'endroit où on vient de les
  brancher (`src/lib/studio-install.ts` : trois nuages au plus, posés sur la
  vraie pièce). Le récit du retour reste celui du premier relevé
  (`releveApres()`) : acheter un palier n'efface plus la paie du joueur.
  **L'emblème d'Arène** : la couronne gagnée dans l'Arène (top 10, une par
  semaine) attend **sur l'étagère du Studio** — le pont TCG → Studio, il se
  gagne dans l'Arène et se voit chez soi (`src/lib/studio-emblem.ts`).

- [x] **Étape 10 bis : la pièce s'habille, le Studio s'entend** — deux
  ajouts, sans une ligne de logique. **Les fenêtres** : le kit fournit chaque
  mur en deux versions (pleine, et percée d'une fenêtre) ; les deux fenêtres
  sont posées **exactement sur le mur de leur cellule** (même appui, même
  point : la fenêtre recouvre la face), et elles ne subissent pas le filtre des
  murs — c'est la seule lumière froide de la pièce. Le test de la pièce les
  apparie par leur **point de pose**, pas par leur nom : il a attrapé la
  première version, posée au centre de la cellule (la fenêtre ressortait du mur
  d'un demi-tile). **Le second écran** : le palier **régie** pose un moniteur de
  plus sur le bureau (le kit n'en a qu'un, posé deux fois — même image, autre
  endroit). **Les bruits du Studio** : l'achat d'un palier fait entrer
  l'équipement (puis la pièce qui monte), publier la vidéo sonne le carillon,
  poser un invité en direct déclenche la fanfare du raid, et le classeur
  d'invités s'ouvre et se ferme comme les autres feuilles. Tout passe par
  `src/lib/sfx.ts` et par l'interrupteur **Son** du profil — rien ne sonne si le
  joueur l'a coupé. Le détail de la sélection est dans
  [`assets-sonores.md`](assets-sonores.md).

- [x] **Retrait de la pièce visuelle et de l'onglet** (8 octobre 2026, le soir)
  — l'opération inverse de l'étape 10, et une décision de produit : le décor
  isométrique ne rentre pas dans la direction que prend le jeu. Ce qui est
  parti : le **cinquième onglet** (`NAV_ITEMS` revient à quatre piliers, Drop /
  Binder / Craft / Toi), la **pièce** (`streamer-studio-stage.tsx`), l'**emblème
  d'Arène sur l'étagère** (`studio-emblem.ts`), l'**arrivée des paliers** en
  fumée (`studio-install.ts`), la pose des 25 sprites
  (`studio-room.ts` + `studio-room.json`), les **2,7 Mo du kit Kenney** et deux
  fichiers d'effets (`fumee.png`, `couronne.png`). Ce qui **reste, à
  l'identique** : tout le moteur (`src/lib/streamer.ts`), les règles
  (`src/data/streamer.json`), les paliers et leur achat, les **invités** (le
  bureau est maintenant une grille de deux places, avec la vraie `CreatorCard`
  et son badge « EN DIRECT »), l'**imprévu** à deux réponses, la **vidéo du
  jour**, le **live de 20 s**, les **bruitages** (15 sons, tous sous
  l'interrupteur *Son*) et **toutes les migrations** (`0036`, `0038`, `0040`,
  `0041` — le serveur n'a pas bougé d'une ligne). L'écran s'ouvre par la ligne
  « Ta chaîne » de l'accueil, et il gagne un bouton **Retour** : sans onglet
  allumé, il fallait une sortie du même côté que l'entrée. Le HUD (rang, jauge
  d'abonnés, rythme du jour, jetons) est désormais **en texte** — mêmes
  chiffres, mêmes calculs, l'écran les écrit au lieu de les dessiner.
  **Aucune migration à coller** : retirer un décor ne touche aucune table.

## 2. En cours

- [x] **L'arbitrage du live de vingt secondes : la scène reste gratuite**
  (tranché le 8 octobre 2026, écrit sur la feuille de route). Le mini-jeu de
  l'étape 5 **précède** la publication et ne décide de rien : la vidéo reste
  payée et tirée par le serveur (`streamer_publish`), exactement comme avant, et
  la scène se rejoue tant qu'on veut sans rien fausser. La version « clip » où
  la précision du joueur poussait le buzz n'est **pas** livrée, et c'est
  volontaire : une précision mesurée sur le téléphone ne peut pas déplacer
  honnêtement un taux publié, et un score que le serveur ne peut pas vérifier ne
  doit pas payer. Si un jour la scène doit toucher à la vidéo, il faudra que le
  serveur puisse la juger — zone ou fenêtre de tir tirée par le serveur, stable
  toute la journée, tolérance affichée, une tentative par journée — et c'est une
  migration à part.

  > **Aucune migration à coller pour l'étape 5.** Le live ne paie rien, donc il
  > n'y a **rien à garder côté serveur** : pas de table, pas de porte, pas de
  > garde — et donc rien à coller. Le seul contrôle côté base est le **miroir
  > des paliers** (cinq cadences de chat, cinq nombres de bulles), joué par
  > `npm run supabase:verify`.

## 3. Ce qu'il reste à faire

> Les **invités sur le bureau** (étape 6), la **seconde série de paliers**
> (étape 7), la **scène du bureau avec le plateau** (étape 8), la **refonte
> visuelle** (étape 9), **l'onglet Studio en vraies images** (étape 10),
> **l'habillage + les bruitages** (étape 10 bis) et **le jus** (les moments
> rares qui se voient) sont livrés. La **pièce visuelle** de ces étapes — onglet,
> décor, emblème d'Arène, arrivée en fumée — a été **retirée** le 8 octobre 2026
> au soir (voir le § 1) : ce qui suit décrit le jeu d'aujourd'hui, et la pièce
> reviendra si et quand une direction visuelle est choisie.
> **Deux migrations attendent le joueur** : `0040` puis `0041`, en une commande
> (`npx supabase db push`). Il ne reste ensuite que l'équilibrage — et il se fait
> en jouant.

- [x] **Système d'améliorations de setup (Tycoon : micro, caméra, PC)** — livré
  en deux séries : les cinq paliers en **points** (étape 4) et les trois paliers
  en **doublons** (étape 7, § 1). La promesse de la note du fichier — « des
  paliers payés en DOUBLONS, la rareté donnant le palier, jamais une
  Légendaire » — est tenue : Rare = 1, Épique = 2, Légendaire jamais.

- [ ] **Un mode textuel ou immersif pour « Ta chaîne »** — la pièce visuelle est
  partie sans successeur : l'écran d'aujourd'hui est **sobre et complet** (HUD
  en texte, bureau, imprévu, vidéo, setup), et c'est un état acceptable pour
  jouer. La suite (une direction visuelle, un décor différent, ou un mode
  purement textuel assumé) est une décision de produit, pas une dette : rien
  n'attend derrière.

- [ ] **Bilan et équilibrage des gains** — relire les chiffres **avec les vrais
  joueurs** (l'outil pour les avoir sous les yeux est là : `npm run streamer:bilan`,
  voir l'encadré ci-dessous) (abonnés gagnés par journée, ce que paient les vidéos et les
  imprévus, ce que coûtent les paliers de setup), puis ajuster le fichier **et**
  le SQL dans le même geste, comme pour les taux de drop : une modification d'un
  seul côté fait mentir l'écran, et le test miroir est là pour l'attraper. Le
  **live de 20 s** entre dans ce bilan : c'est là qu'on décidera, en jouant, s'il
  reste une scène gratuite ou s'il touche à la vidéo du jour (voir § 2).

  > **L'outil de mesure : `npm run streamer:bilan`.** Il ne joue pas à ta place :
  > il **lit les règles** (le JSON par les fonctions de `src/lib/streamer.ts`,
  > aucun chiffre recopié) et met en tableau les paliers et leurs délais, ce
  > qu'une publication rapporte en moyenne (400 tirages par format et par
  > palier, hasard figé), ce que chaque réponse d'imprévu promet, ce que le
  > setup coûte et rapporte, puis **trente journées jouées** par une politique
  > déclarée — meilleur format, meilleur pari, aucun point dépensé — avec la
  > même courbe, setup complet payé, en regard. Les chiffres du 8 octobre 2026 :
  > 11 jours pour *Chaîne qui monte*, 36 pour *Gros streamer*, 170 pour *Star du
  > direct* ; une **Collab** rapporte en moyenne +380 abonnés à zéro abonné
  > contre +196 pour un *Let's Play* ; trente journées mènent à **313 690**
  > abonnés sans un point dépensé et à **3 363 428** avec tout le setup payé
  > (+100 % de croissance) ; et **150 jetons** seulement sur trente jours, quand
  > le plafond quotidien en autorise 40 — il ne se touche pas (une vidéo par
  > jour, 16 jetons au mieux) : c'est le genre de constat que l'outil sert à
  > voir avant de toucher aux multiplicateurs, et **il n'en décide aucun** :
  > ils vivent dans `src/data/streamer.json`, et la décision se prend en jouant.
