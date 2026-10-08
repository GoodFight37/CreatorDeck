# Suivi du chantier : Ta chaîne (Streamer Simulator)

> **Ce fichier est la feuille de route du chantier.** Les cases disent l'état
> **réel**, pas l'intention : une case se coche quand la chose est **livrée et
> poussée** sur la branche de travail, jamais avant. À chaque livraison ou
> modification du chantier, les cases de ce fichier sont mises à jour dans le
> même commit. Ce qui est décidé mais pas encore écrit se dit ici, en clair.
>
> Le détail des règles vit ailleurs, et c'est lui qui fait foi :
> `docs/cloud-supabase.md` § 8 « Les imprévus et le setup de la chaîne (`0038`) »
> et § « La chaîne vit au serveur (`0036`) », plus le journal daté du `README.md`.

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
  « Ta chaîne » sur l'accueil ouvre `src/components/streamer-sheet.tsx` :
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

  > **À coller par le joueur : `0038_imprevus_setup.sql`.** `0036` et `0037`
  > sont collées en production (vérifié le 8 octobre 2026). Un bouton
  > « copier le contenu brut » et le SQL Editor suffisent ; pour **vérifier
  > après**, la même requête répond :
  > `select public.schema_versions() -> '0038';` doit rendre `true`.

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

## 2. En cours

- [ ] **Le live du jour et la vidéo : rien n'est encore jugé** — ce qui est
  **décidé et pas encore écrit**. Le mini-jeu livré à l'étape 5 ne fait
  **que précéder** la publication : la vidéo reste payée et tirée par le serveur
  (`streamer_publish`), exactement comme avant. La version « clip » initialement
  prévue — où la précision du joueur **poussait le buzz** de la vidéo du jour —
  n'est **pas** livrée, et c'est volontaire : une précision mesurée sur le
  téléphone ne peut pas déplacer honnêtement un taux publié, et un score que le
  serveur ne peut pas vérifier ne doit pas payer (la règle du projet : le tirage
  et le jugement restent au serveur). Deux suites possibles, à trancher après
  avoir joué :
  - **la scène reste gratuite** (l'état actuel) : elle se rejoue tant qu'on
    veut, elle ne paie rien, elle ne peut donc rien fausser ;
  - **elle touche à la vidéo** — et il faut alors que **le serveur puisse la
    juger** : une migration à part, avec la zone ou la fenêtre de tir tirée par
    le serveur, **stable toute la journée**, la tolérance **affichée**, et une
    seule tentative par journée. C'est là, et seulement là, qu'une `0039` (ou
    plus tard) devient nécessaire.

  > **Aucune migration à coller pour l'étape 5.** Le live ne paie rien, donc il
  > n'y a **rien à garder côté serveur** : pas de table, pas de porte, pas de
  > garde — et donc rien à coller. Le seul contrôle côté base est le **miroir
  > des paliers** (cinq cadences de chat, cinq nombres de bulles), joué par
  > `npm run supabase:verify`.

## 3. Ce qu'il reste à faire

- [ ] **Connecter 2 cartes TCG en « Invités sur le bureau » (bonus de Raid si le
  streamer est en direct)** — l'idée : choisir deux cartes de sa collection pour
  tenir le plateau, et qu'elles paient un bonus quand un créateur est **réellement
  en direct** (statut EN LIVE, § 8 du `cloud-supabase.md`). À concevoir : quelles
  cartes sont acceptées, ce que le bonus vaut, et si les invités se changent ou
  non. À noter : l'imprévu `raid` de l'étape 4 raconte déjà un raid, mais c'est
  une **carte d'événement** subie, pas des invités choisis par le joueur — les
  deux ne se remplacent pas.

- [x] **Système d'améliorations de setup (Tycoon : micro, caméra, PC)** — déjà
  livré à l'**étape 4** : les cinq paliers en points sont exactement ce système.
  **Reste, si cette première partie accroche** (décision écrite dans le JSON,
  pas encore engagée) : une seconde série de paliers payés en **doublons**, la
  rareté donnant le palier, **jamais une Légendaire** — la note de
  `src/data/streamer.json` le dit mot pour mot : « cette première partie » doit
  d'abord accrocher.

- [ ] **Bilan et équilibrage des gains** — relire les chiffres **avec les vrais
  joueurs** (abonnés gagnés par journée, ce que paient les vidéos et les
  imprévus, ce que coûtent les paliers de setup), puis ajuster le fichier **et**
  le SQL dans le même geste, comme pour les taux de drop : une modification d'un
  seul côté fait mentir l'écran, et le test miroir est là pour l'attraper. Le
  **live de 20 s** entre dans ce bilan : c'est là qu'on décidera, en jouant, s'il
  reste une scène gratuite ou s'il touche à la vidéo du jour (voir § 2).
