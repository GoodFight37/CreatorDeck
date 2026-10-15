# Reprise rapide — 15 octobre 2026

## Checkpoint courant — finition du rituel D-108, Vercel vérifié

- Main local et GitHub identiques au départ (`887f55a4cdc533d6a1e48583b091ce4dc5aef51a`),
  arbre propre, aucune PR ouverte. Demande de Malik limitée au rituel
  d’ouverture et au polish du pack hero ; Drop accueil, trades, Story, Twitch,
  Objectifs, BGM et économie exclus.
- Constat dans le code : PackTear avait déjà TIRE / RELÂCHE et rien une fois
  ouvert ; `PACK_TEAR_MS` était à 1 200 ms ; Rare+ avait déjà sa pause
  d’impact et son glow/stinger ; les cinq cartes avaient déjà un récapitulatif.
  Le retour de ce récap ne tenait que 650 ms. D-108 le verrouille 1 500 ms
  pour tous les modes, sans fermeture automatique ; côtés 24 px plus contrastés,
  sheen un peu renforcé et largeur de l’ombre mobile alignée en CSS.
- `npm run ecrans -- src/ecrans-effets.test.tsx src/ecrans-tactile.test.tsx` :
  31/31. `npm test -- src/lib/reveal.test.ts src/lib/release-notes.test.ts` :
  21/21. Typecheck, ESLint ciblé et build : réussis. Build local sans
  Supabase, compilation seulement. Playwright initial bloqué par le binaire
  Chromium absent ; installé puis relancé : 2/2 géométrie/accueil, 6/6
  sachet CSS/peel/cinquième carte sur bureau et viewport téléphone.
  Ressenti tactile réel sur téléphone non vérifié.
- Note joueur ajoutée, décisions D-108, roadmap et problème connu actualisés.
  Code, tests, note et docs au commit `36490080192b90cffaa479fb2c7cf29558cb1c14`,
  push normal sur main, SHA GitHub confirmé. Déploiement Production
  `7088095958` du même SHA `success`, statut Vercel `success` ; site
  public HTTP 200. Chromium sur le site : Toi → Nouveautés affiche en tête
  « Un booster qui prend son temps » à 390 × 844, sans erreur JS ni
  débordement. Aucun peel au doigt sur appareil réel ni booster consommé.
- CI GitHub `38708119278` terminée en échec. Le job « Unitaires, écrans,
  statique et build » échoue à l’étape unitaires sur `src/lib/jargon.test.ts`
  (1 échec, 1 185 réussites localement). Cause reproduite : le texte « le
  serveur la vérifiera » dans `src/components/account/trades-panel.tsx:379`,
  issu du lot Trade Radar antérieur. Malik exclut explicitement les échanges
  du présent chantier ; aucun changement de ce fichier. Les contrôles
  suivants de ce job sont sautés, malgré leurs passes locales ciblées.
- Le job cloud simulé échoue sur `e2e/hourglass-online.spec.ts:65`, qui
  attend zéro ancêtre `<details>` autour du bouton sablier ; reproduit localement
  sur bureau et téléphone (8 autres scénarios simulés réussis). Le SQL jetable
  réussit. Les trois shards E2E GitHub échouent aussi ; les journaux de ces
  jobs n’ont pas été récupérés par `gh`. Les scénarios E2E du présent lot
  réussissent localement : 2/2 Drop, 6/6 sachet/peel/cinquième carte et 2/2
  extraction/récapitulatif. Aucun sablier, trade ou cloud modifié.
- Commit documentaire `54af49af1198858c05881a1a0995ddeb2a717d0d`, push
  normal et SHA distant confirmés. Ce SHA a aussi son déploiement Production
  `7088161915` et son contrôle Vercel `success` ; arbre local propre.


## Checkpoint courant — Trade Radar publié, Vercel vérifié

- Base `main` propre `13f26d5045685f18514e1b18dbfc24afe48fed94`,
  identique à GitHub par `ls-remote` et fetch ; aucune PR ouverte retournée.
- D-107 : dans Compte → Échanges, scan manuel des amis acceptés et de leurs
  souhaits publics existants, par quatre lectures parallèles. Une piste existe
  si le joueur possède deux cartes de même créateur **et même variante**.
  Préparer choisit partenaire et carte offerte, filtre cette carte puis place
  le focus sur la contrepartie ; aucune offre envoyée automatiquement.
  Chargement, vide, erreurs partielles, changement de partenaire et de compte
  traités. Aucun RPC nouveau, migration, économie ou collection tierce exposée.
  Note joueur, D-107 et `docs/trade-radar.md` ajoutés ; guide lié.
- `npm test -- src/lib/trade-radar.test.ts src/lib/cloud/cloud-store.test.ts
  src/lib/release-notes.test.ts` : 172/172 à la passe finale.
  `npm run ecrans -- src/ecrans-echanges.test.tsx
  src/ecrans-release-notes.test.tsx` : 7/7 ; le premier passage ciblé Échanges
  a échoué 3/4 car l'ancien helper de test appuyait le premier « Chercher »
  après l'ajout du radar. Sélecteur précisé, libellé radar différencié, relance
  4/4. Passe finale après ajout des scénarios brouillon et sans doublon :
  Échanges 6/6, notes 3/3, Compte 4/4, soit 13/13.
  Typecheck/ESLint ciblés réussis. HTML de l'état piste capturé, puis
  rendu avec les CSS dans Chromium à 320 et 390 px ; largeur conforme,
  bouton visible après défilement à 320. Captures
  `/tmp/trade-radar-320.png` et `/tmp/trade-radar-390.png` inspectées.
  Fixtures : aucune lecture d'amis réels en Production. `npm run build`
  réussi, cinq pages exportées ; variables Supabase locales absentes, donc
  compilation seulement.
- Code/tests/note joueur/docs publiés au commit
  [`6816e9e58604f92b3b625d866d6ff2a2ced9cb0e`](https://github.com/GoodFight37/CreatorDeck/commit/6816e9e58604f92b3b625d866d6ff2a2ced9cb0e),
  push normal, SHA local et GitHub confirmés par `ls-remote` après une coupure
  du transport de commande au retour du commit. Déploiement GitHub Production
  `7087789472` du même SHA terminé `success`, contrôle
  [Vercel](https://vercel.com/hafsi37-2386/creator-deckk/6bVjSU7LuZPieFZyRiwiqfKcKiqJ)
  `success`. Site public HTTP 200 ; Chromium 390 × 844 : Toi → Nouveautés,
  note « Des pistes pour échanger avec tes amis » visible, aucune erreur JS.
  Aucun compte réel utilisé pour lancer le radar en Production : les lectures
  réseau et l'offre sont couvertes par fixtures locales seulement. Pas de
  transaction ni de migration. Lot clos.


## Checkpoint courant — identité du Perfect publiée, Vercel vérifié

- Base `main` propre `762ff5126921a4d8323e7dfea9769194cffa8277`,
  identique à GitHub par `ls-remote` et fetch ; aucune PR ouverte retournée.
- D-106 : noms, raretés et nouveautés sous les cinq cartes du Perfect ;
  récapitulatif conservant le titre Perfect, « cinq cartes d'exception »,
  cinq Épiques ou mieux et le nombre réel de nouvelles cartes. Aucun taux,
  gain, verrou, son, geste ou timing modifié. Note joueur ajoutée.
- `npm run ecrans -- src/ecrans-effets.test.tsx
  src/ecrans-release-notes.test.tsx` : 28/28 ; TypeScript et ESLint ciblé
  réussis. HTML du Perfect et de son récapitulatif capturé par le banc DOM,
  puis rendu avec les CSS de l'application dans Chromium à 320, 390 et
  1024 px. Captures `/tmp/perfect-*.png` et `/tmp/perfect-recap-*.png`
  inspectées : largeur conforme, CTA visible, récapitulatif défilable à
  320 × 568 jusqu'aux deux dernières cartes. Portraits fictifs absents de la
  capture : celle-ci vérifie la disposition, pas la qualité des images.
  `npm run build` réussi, cinq pages exportées ; variables Supabase locales
  absentes, donc compilation seulement. ESLint, typecheck et diff-check finaux
  réussis.
- Code/tests/note joueur/docs publiés au commit
  [`7a0b182e178ea145178e8cb41afbf36f1a66cd29`](https://github.com/GoodFight37/CreatorDeck/commit/7a0b182e178ea145178e8cb41afbf36f1a66cd29),
  push normal et SHA confirmé par `ls-remote`. Déploiement GitHub Production
  `7087479879` du même SHA terminé `success`, contrôle
  [Vercel](https://vercel.com/hafsi37-2386/creator-deckk/3cBov7MaR75foEggnPg9NQWUcHbF)
  `success`, site public HTTP 200. Aucun Perfect réel tiré sur un compte en
  production ; preuves d'interface via fixtures DOM et rendu Chromium du HTML
  capturé. Ressenti tactile du peel et APK non vérifiés. Lot clos.


## Checkpoint courant — export Story de profil publié, Vercel vérifié

- Base `main` propre `f21fa090d9f8098aa4174360f9735a0254da2ede`,
  identique à GitHub par `ls-remote` et fetch ; aucune PR ouverte retournée.
- D-105 : la fiche publique propose l'affiche 4:5 existante et une Story PNG
  9:16 (1080 × 1920), issues du même modèle serveur. Quatre cartes de vitrine
  au plus, noms bornés par largeur, repli coloré si portrait manquant, vitrine
  vide prévue. Aperçu limité en hauteur pour garder les commandes accessibles ;
  focus retenu dans l'aperçu puis rendu au bouton de format.
  Note joueur du 15 octobre ajoutée ; aucune économie ou base modifiée.
- `npm test -- src/lib/poster.test.ts src/lib/release-notes.test.ts` : 16/16.
  `npm run typecheck`, ESLint ciblé et `git diff --check` réussis. Canvas Story
  rendu dans Chromium avec quatre cartes fictives à 390 px : PNG 1080 × 1920,
  largeur document 390 px, capture inspectée à
  `/tmp/creatordeck-story-check.png` ; titres et statistiques lisibles, aucune
  coupure observée. Portraits réels et téléchargement sur compte connecté non
  vérifiés par cette capture. `npm run ecrans --
  src/ecrans-release-notes.test.tsx src/ecrans-profile-complete.test.tsx` :
  10/10 ; test dédié `npm run ecrans -- src/ecrans-profile-story.test.tsx`
  1/1 (format, nom de fichier, focus). Build final après ce test réussi,
  cinq pages exportées ; variables Supabase locales absentes, donc compilation
  seulement.
- Code, test, note joueur et docs publiés au commit
  [`e61bca4edae0cc48190b48366f8032c6188dae23`](https://github.com/GoodFight37/CreatorDeck/commit/e61bca4edae0cc48190b48366f8032c6188dae23)
  par push normal, SHA confirmé par `ls-remote`. GitHub Production
  `7087223814` du même SHA terminée `success`, contrôle
  [Vercel](https://vercel.com/hafsi37-2386/creator-deckk/5uJDLfZxEMwocRtgSkHy9iHmyHrE)
  `success` ; site public HTTP 200. Profil connecté et téléchargement réel
  depuis Vercel non essayés ; format/rendu validés sur la fixture Chromium et
  le parcours d'interface en DOM. APK et ressenti tactile du peel non testés.
  Lot clos.


## Checkpoint courant — lien permanent Twitch publié, Vercel vérifié

- Base GitHub `main` `7e8f83e564df7f668617b3281033c620a2371ee6`,
  vérifiée par `ls-remote` et fetch. Checkout local initial `work` à
  `51323720`, deux commits distants examinés, puis nouvelle branche locale
  `main` créée à la pointe distante ; aucun fichier initial modifié.
- D-104 : lien permanent de chaîne dans la fiche de carte du Binder et de la
  vitrine Toi, avec ou sans direct ; l'indication Live reste distincte.
  Login encodé, nouvel onglet annoncé et sécurisé. Note joueur ajoutée.
- `npm ci` réussi, lockfile inchangé. Passe finale `npm run ecrans --
  src/ecrans-live-provenance.test.tsx src/ecrans-profile-complete.test.tsx
  src/ecrans-release-notes.test.tsx` : 13/13, dont fiche avec/sans direct,
  carte manquante du Binder et entrée vitrine. `npm run typecheck`, ESLint ciblé et
  `npm run build` réussis, cinq pages exportées. Build local sans variables
  Supabase : preuve de compilation uniquement. La première passe avant
  `npm ci` ne pouvait pas lancer jsdom et signalait des dépendances absentes ;
  relance après installation réussie.
- Code, test, note joueur et documentation publiés au commit
  [`a48cf341561b25f70094039a9bacb69ec9a11e53`](https://github.com/GoodFight37/CreatorDeck/commit/a48cf341561b25f70094039a9bacb69ec9a11e53),
  push normal, SHA confirmé par `ls-remote`. Déploiement GitHub Production
  `7086754599` du même SHA terminé `success`, contrôle Vercel `success`,
  [déploiement](https://vercel.com/hafsi37-2386/creator-deckk/4gfRm3xduCZWES6xhcBTVMXDMbVN).
  Site public répond HTTP 200. Aucune navigation de fiche en compte réel sur
  Production ; le test DOM couvre les états de fiche. Aucun ressenti tactile
  du peel ou de l'APK déduit de ce changement. Lot clos.


## Checkpoint courant — Objectifs et saisons publié, Vercel vérifié

- Demande : lot complet autorisé par « go », puis reprise après capture montrant
  une limite d’usage Codex. Ce message n’était pas une erreur du jeu. Base
  `main` `5132372077b5dc635d5d8872d27ff0946e74f5c1`, identique à GitHub
  via ls-remote/fetch ; reprise sans perte des fichiers locaux, distant inchangé.
- D-103 : sections quotidien/collection/saisons, accès directs, jauges natives,
  gains issus du moteur, planning 4 + 3 lisible sur mobile, saisons filtrables
  et paginées par huit avec paliers repliés et prochaines étapes.
- Cause corrigée : les callbacks parent affichaient un refus puis retournaient
  `void`, donc Tout réclamer poursuivait et annonçait les familles prévues comme
  reçues. Ils retournent maintenant le résultat réel (`PointsOutcome`). Le lot
  traite missions, jalons et saisons en série, verrou synchrone partagé avec
  les commandes individuelles et le choix de série, arrêt sur refus et bilan
  persistant des réponses déjà reçues. Le jackpot reste un choix séparé.
- Aucun seuil, gain, monnaie, moteur, SQL ou fichier audio modifié. Les SFX
  existants restent appelés dans le parent aux mêmes réussites ; aucun nouvel
  audio. Les emblèmes ne sont annoncés qu'après constat dans l'état obtenu.
- Tests exécutés : DOM Objectifs 10/10 (2 existants + 8 nouveaux), notes 8/8,
  typecheck/ESLint ciblés réussis. Chromium : trois scénarios uniques réussis
  (deux nouveaux et entrée depuis Toi). Premier essai 3 connexions refusées :
  serveur précédent absent, redémarré. Puis 2/3 : fixture 12 cartes ne débloquait
  aucun palier réel. Fixture corrigée pour choisir une saison depuis SEASONS,
  sans changer ses seuils ; rerun deux nouveaux 2/2. Le test de réclamation
  double l’activation dans le même tour JS et vérifie les soldes exacts ainsi
  que leur conservation après rechargement. Refus/réseau/partiel simulés en DOM.
- Captures finales jour/saisons/bilan inspectées à 390×844 ; contrôles de largeur
  320/390 passent. Note joueur `2026-10-15-objectifs` ajoutée avec le code.
  Build final `npm run build` réussi, cinq pages exportées. Variables Supabase
  locales absentes : compilation validée, pas de réclamation cloud réelle.
  Publication code/tests/patch note/docs :
  [`5f96ab587297ba23ccca78174a967fcb685bca8a`](https://github.com/GoodFight37/CreatorDeck/commit/5f96ab587297ba23ccca78174a967fcb685bca8a),
  push normal sur `main`, SHA confirmé par ls-remote. Vercel Production du même
  SHA [`EtbzjW6ShGanathyNwv664cfNv91`](https://vercel.com/hafsi37-2386/creator-deckk/EtbzjW6ShGanathyNwv664cfNv91)
  `READY`, contrôle `success`. Aucun run Actions retourné pour ce commit ;
  aucune CI complète déclarée verte.
- [Site publié](https://creator-deckk.vercel.app/) parcouru dans Chromium :
  empreinte Web `5f96ab5`, entrée depuis Toi, quatre missions, absence de
  récompense en attente pour le visiteur neuf, filtres de saison et état vide,
  détail des gains/paliers, pagination 8 + 4, largeurs 320/390 conformes et
  nouvelle note joueur au premier rang. Aucune erreur JavaScript observée.
  Aucune récompense réelle réclamée, aucun compte ou donnée factice injectée
  en Production. Lot clos ; réservation libérée après ce checkpoint final.
- Fichiers : MissionsView, SeasonsSection, callbacks CreatorDeckApp, CSS
  `objectives.css`, tests DOM/navigateur (titre d'arrivée Toi mis à jour),
  `release-notes.ts` et docs. Publication et preuves ci-dessus.
- Limites : aucune réclamation serveur réelle effectuée ; le bilan reçoit la
  réponse finale de chaque saison, pas le détail des RPC internes de ses
  paliers. Pas de changement de la caisse serveur. Ressenti tactile/APK non
  certifiés. Ne pas relancer les suites déjà réussies sans nouveau changement.

## Checkpoint précédent — lot Nouveautés complet publié, Vercel vérifié

- Demande : gros lot autonome jusqu’à publication. Choix : système de patch
  notes proposé juste avant, accepté par l’autorisation générale de Malik.
  Base `main` propre `bf0dcbabd29753d0620d675cf46b40d489d712d3`, GitHub
  identique via ls-remote/fetch ; contrôle Vercel précédent réussi.
- D-102 : entrée Toi → Nouveautés, sept notes joueur récentes, historique,
  détail/filtre non lu, marquage individuel/global explicite, repère sur Toi.
  Aucun popup au lancement. Store local indépendant, même onglet/autres onglets,
  stockage mal formé toléré, stockage bloqué → lecture session avec message.
- Focus captif/portail, app inerte, fermeture Escape/Retour, focus et défilement
  restaurés ; focus remis au dialogue quand une commande disparaît/se désactive.
  Last Pack conserve son indicateur séparé. Aucun compte/monnaie/carte/audio
  modifié ; notes statiques livrées avec le code, sans serveur supplémentaire.
- AGENTS exige désormais une note pour chaque livraison joueur, même commit
  que le code ; exemption pour documentation/tests seuls. Procédure dans
  `docs/nouveautes.md`, ajoutée au guide. Ne pas changer les IDs publiés.
- Fichiers : données/store `release-notes.ts`, hook `use-release-notes.ts`,
  feuille/CSS `release-notes-sheet.tsx`/`release-notes.css`, entrées ProfileView
  et CreatorDeckApp, tests logique/DOM/navigateur et documentation.
- Tests : logique 8/8 ; DOM ciblés journal + profil 21/21 ; trois scénarios
  navigateur lecture/persistance/focus, responsive/mouvement réduit et stockage
  refusé 3/3, puis propagation entre deux onglets 1/1. Typecheck et ESLint
  ciblés réussis. Aucun test échoué dans ces runs. Captures liste/détail à
  390×844 inspectées, lisibles sans coupure. Build final `npm run build`
  réussi, cinq pages exportées ; variables Supabase locales absentes : preuve
  de compilation, pas de cloud.
- Publication : [`3fe32e8dba3b5020d07c63662179784b1ea1b5fa`](https://github.com/GoodFight37/CreatorDeck/commit/3fe32e8dba3b5020d07c63662179784b1ea1b5fa),
  push normal `main`, SHA vérifié par ls-remote, procédure `nouveautes.md`
  confirmée sur GitHub. Vercel Production du même SHA
  [`B8s1mwbBoWMxgusrfoUGG6hFGVht`](https://vercel.com/hafsi37-2386/creator-deckk/B8s1mwbBoWMxgusrfoUGG6hFGVht)
  `READY`, contrôle `success`. Aucun run GitHub Actions retourné pour ce SHA ;
  pas de CI générale déclarée verte.
- [Site publié](https://creator-deckk.vercel.app/) parcouru dans Chromium :
  empreinte Web `3fe32e8`, sept notes, badge et entrée Toi, détail puis lecture
  individuelle (7 → 6), état conservé après rechargement, lecture globale,
  disparition du repère, fermeture/focus/restauration de l’app et largeurs
  320/390 conformes. Aucune erreur JavaScript observée. Le script écrit
  seulement les marqueurs locaux de son navigateur neuf, aucun compte ou
  sauvegarde de jeu réelle modifié. Lot clos, réservation libérée après
  le checkpoint documentaire de clôture.
- Limites : les marqueurs de lecture sont locaux, non synchronisés entre
  appareils ; aucune garantie d’écriture atomique entre onglets concurrents.
  Les notes initiales ne constituent pas un historique exhaustif du dépôt.
  Ressenti tactile et APK non certifiés par Chromium.

## Checkpoint précédent — lot Toi complet publié, Vercel vérifié

- Demande : « Fait tout d'un coup » pour le pilier Toi complet. Base `main`
  propre `ae8dfacd04286851149ca1601154ede8c5d008d3`, GitHub identique par
  ls-remote/fetch ; contrôle Vercel précédent réussi. Aucun écrivain concurrent
  observé. D-101, règles D-044/D-045 conservées.
- Lot : vitrine physique avec noms entiers et trois places, épinglées dédupliquées,
  vides décoratifs, inspection réutilisant le modal Binder (variantes/quantités,
  portail/focus/retour/Escape). Niveau/XP, collection et objectifs visibles,
  Tribunal accessible hors menu en ligne. Compte, réglages/crédits/version
  regroupés ; reset replié avec sa confirmation existante. États compte,
  sauvegarde, conflit et erreur réels ; wishlist bloquée pendant le retrait.
- Fichiers : `profile-view.tsx`, nouveau `profile-collection.css`, tests
  `ecrans-profile-complete.test.tsx` et `e2e/profile-complete.spec.ts`, docs.
  Aucun moteur, migration, prix, audio ou autre pilier modifié.
- `npm run ecrans -- src/ecrans-profile-complete.test.tsx
  src/ecrans-scene-profile.test.tsx` : **18/18**. Typecheck/ESLint ciblés réussis.
- Chromium mobile : cinq scénarios uniques du profil passent (trois nouveaux,
  deux existants), largeur 320/390 + test existant 412. Premier lancement
  5 échecs de connexion : second serveur refusé par le verrou Next ; reprise
  sur le serveur déjà actif 3000. Ensuite 4/5, puis retest du cinquième 1/1 :
  assertion attendait « Objectifs et saisons » alors que l'écran existant est
  titré « Progression ». Test corrigé sans changer cet écran. Aucun scénario
  cloud ignoré compté comme réussi. Variantes, quantités et reset annulé testés
  localement ; pas de transaction réelle nécessaire.
- Captures vide et vitrine partielle inspectées ; noms complets, dos décoratifs
  et hiérarchie lisibles. Capture pleine page recadre les barres fixes :
  ce n’est pas une mesure de leur position dans la page défilée. Build final
  `npm run build` réussi, cinq pages exportées. Variables Supabase absentes
  localement : preuve de compilation seulement.
- Publication : [`261625f52f2f64081758df500048daf92b424d66`](https://github.com/GoodFight37/CreatorDeck/commit/261625f52f2f64081758df500048daf92b424d66),
  push normal `main` et SHA vérifiés par ls-remote. Documentation distante
  relue via GitHub. Vercel Production du même SHA
  [`4stHp9TVH6a77KQ4x4giRTwmg59w`](https://vercel.com/hafsi37-2386/creator-deckk/4stHp9TVH6a77KQ4x4giRTwmg59w)
  `READY`, contrôle `success`. Aucun run GitHub Actions retourné pour ce
  commit ; aucune CI générale déclarée verte.
- Site [creator-deckk.vercel.app](https://creator-deckk.vercel.app/) parcouru
  dans Chromium mobile : empreinte Web `261625f`, profil vide, XP, collection,
  objectif ouvrant Progression, réglages repliés puis accessibles, deux
  interrupteurs audio conservés et reset replié. Largeurs 320/390 conformes,
  aucune erreur JavaScript observée. Aucune donnée factice injectée ni compte
  réel modifié en Production ; collection possédée, variantes, conflits et
  attentes couverts par fixtures locales/DOM seulement. Ressenti tactile non
  certifié. Lot Toi clos ; réservation libérée après le checkpoint de clôture.

## Checkpoint précédent — lot Atelier complet publié, Vercel vérifié

- Demande : lot Craft complet autorisé par « Go », après Binder clos. Base
  `main` propre `f9cee11fd285194782666791d02553bedfac09bb`, identique à GitHub
  via ls-remote/fetch. Un seul écrivain observé ; aucune divergence.
- D-100 : aperçu physique Standard, monnaie/coût/solde, confirmation création,
  recyclage individuel/groupé (Live explicite), attente verrouillée, résultat
  persistant avec accès classeur ou recettes. Le hook existant décide des
  transactions ; aucun changement audio, économie, moteur ou SQL.
- Fichiers : `atelier-view.tsx`, nouveaux `atelier-transaction.tsx` et
  `atelier-ritual.css`, test DOM `ecrans-atelier-transaction.test.tsx`, navigateur
  `atelier-ritual.spec.ts`, README/roadmap/known-issues/decisions/passation.
- Tests : `npm run ecrans -- src/ecrans-atelier-transaction.test.tsx
  src/ecrans-atelier-preview.test.tsx src/ecrans-drop-craft-priorites.test.tsx`
  **14/14**. Typecheck et ESLint ciblé réussis. Chromium via configuration
  temporaire mobile 390×844 : trois scénarios uniques passent, dont recette
  existante et parcours recyclage → points → création → classeur, puis focus
  et aperçu sans financement. Un premier échec E2E était un sélecteur ambigu
  entre notification et résultat, corrigé ; un test jetons utilisait un solde
  inférieur au coût et a été corrigé (prix inchangé).
- Captures inspectées et mesures : 320/390 px, dialogue/CTA accessibles,
  aucune largeur dépassée ; focus captif et retour, Escape, OFF/réduit prévus.
  Captures Playwright après redimensionnement parfois en retard de composition
  GPU ; capture fraîche 390 et mesures DOM confirment le contenu non coupé.
- Build final `npm run build` réussi (export des cinq pages).
  Build local sans variables Supabase : preuve de compilation, pas de cloud.
- Publication code/tests/docs : [`88d5cfa107657933eea692461525c8f1740df8c5`](https://github.com/GoodFight37/CreatorDeck/commit/88d5cfa107657933eea692461525c8f1740df8c5),
  push normal `main` et SHA confirmés par ls-remote ; documentation relue via
  GitHub. Vercel Production du même SHA
  [`GuTJRqohoChEav6FcgGg3ZnVcAa6`](https://vercel.com/hafsi37-2386/creator-deckk/GuTJRqohoChEav6FcgGg3ZnVcAa6)
  `READY`, contrôle `success`. Aucun run Actions retourné pour ce commit :
  aucune CI générale revendiquée.
- Site [creator-deckk.vercel.app](https://creator-deckk.vercel.app/) contrôlé
  dans Chromium mobile : aperçu, achat bloqué si solde insuffisant, app inerte,
  Escape/focus restauré, recyclage vide et largeurs 320/390 passent ; aucune
  erreur JavaScript observée. Premier script attendait un tutoriel absent dans
  ce parcours invité ; rendu prêt attendu puis étape traitée comme facultative.
  Aucune transaction réelle ni donnée factice injectée en production.
  Transactions testées localement et refus/partiels simulés ; le ressenti
  tactile reste non certifié. Lot clos, pas de sous-lot Craft restant proposé.
  Réservation libérée après ce checkpoint documentaire.

## Checkpoint précédent — lot Binder complet publié, Vercel vérifié

- Malik refuse les petites passes successives : terminer un ensemble cohérent
  avec interface, états, gestes, accessibilité, responsive, docs et publication,
  puis changer de chantier. Préférence ajoutée dans `AGENTS.md`, décision D-099.
- Base `main` propre `2f15ea60464624a50e053be9a5d4552baef22df1`, confirmée par
  ls-remote et fetch avant édition. Feuilletage précédent conservé et inclus
  dans la validation de ce lot : pas un nouveau cycle de micro-chantiers.
- Lot : matières mates/foil par rareté et variante ; lumière au geste sur les
  pochettes, aucun balayage permanent ; finition des protecteurs, dos avec
  l'emblème du pack ; carte agrandie dans une chambre de consultation Binder,
  focus captif/retour à la carte et fermeture Escape. 12 cartes montées.
- Variantes déjà possédées consultables dans la fiche. La vue précédente
  affichait la meilleure variante avec le nombre total de copies toutes
  variantes confondues, puis disait que ce total appartenait à cette variante.
  Le Binder garde le total et calcule les quantités par variante depuis les
  cartes existantes. Aucun compte, règle de possession ou craft modifié.
- Fiche Binder seulement (`presentation="binder"`) : portail, fond de scène,
  grande carte au geste, variantes et informations réelles. Les autres fiches
  gardent leur présentation ; CreatorCard ne change de comportement qu'avec
  l'opt-in de la fiche Binder. OFF/réduit : reflets et inclinaison coupés.
- Validation : DOM ciblés 31/31, typecheck/ESLint réussis. Premier lot Chromium
  11/12 : le test flèches envoyait son deuxième clic après la fin de l'animation
  sous charge. Corrigé en envoyant les deux activations dans le même tour JS
  et observant le sens au changement DOM ; retest 1/1. Cinq cas de finition
  passent (matières, compteurs, focus, manquantes, responsive, OFF/réduit),
  passe finale finitions 5/5 après ajustement visuel des faits. Build final
  `npm run build` réussi, export statique sans variables Supabase locales
  (donc aucune validation cloud revendiquée). Typecheck, ESLint ciblé et
  `git diff --check` réussis.
- Captures locales inspectées : `test-results/binder-matieres-téléphone.png`,
  `binder-fiche-téléphone.png` et dos. Les libellés des faits sont séparés des
  valeurs ; la photo et le nom restent lisibles sous le foil. Aucune boucle
  décorative ni dépendance, audio, gameplay, Drop ou ouverture modifiés.
- Fichiers applicatifs : `binder-view.tsx`, `creator-card.tsx`,
  `card-inspect-modal.tsx`, `drop-binder.css`. Tests navigateur Binder et docs.
  Publication : code/tests/docs au commit
  [`7d127c0ffaa35709b3db55e5951c1ae2fc48aa16`](https://github.com/GoodFight37/CreatorDeck/commit/7d127c0ffaa35709b3db55e5951c1ae2fc48aa16),
  push normal sur `main` confirmé par ls-remote. Vercel Production du même SHA
  [`7bXeQ9WwPa95J4Uo2i6TSGRHSUSd`](https://vercel.com/hafsi37-2386/creator-deckk/7bXeQ9WwPa95J4Uo2i6TSGRHSUSd)
  `READY`, contrôle `success`. Aucun run GitHub Actions retourné au relevé,
  donc aucune CI complète déclarée verte.
- Contrôle du site [creator-deckk.vercel.app](https://creator-deckk.vercel.app/)
  à 390 × 844 en invité, sans fausse carte injectée ni compte connecté :
  Obtenues par défaut puis Toutes, 12 dos, flèches/verrou/swipe/retour, noms
  longs, fiche plein écran avec emblème, fond inert, focus et fermeture Escape
  avec retour à la carte. Largeur 320/390 conforme. Capture inspectée :
  `/tmp/creatordeck-binder-final-production-390.png`. Les matières et variantes
  possédées sont validées dans les fixtures locales seulement (5 cas navigateur
  de finition réussis), pas dans la collection serveur d'un joueur.
- Lot UI Binder clos : feuilletage, matières, protecteurs, dos, variantes,
  compteurs, fiche et accessibilité traités ensemble. Réservation libérée.
  Ne plus proposer des micro-retouches du même lot ; prochaine livraison sur
  un autre chantier complet autorisé. Retour Binder seulement pour défaut
  concret ou nouvelle demande. Ressenti tactile non certifié par Chromium.
  SHA du checkpoint : `git log -1 --format=%H -- docs/agent-handoff.md`.

## Historique — Binder : feuilletage et lisibilité publiés, Vercel vérifié

- Malik autorise la suite UI Binder après le rituel livré. Périmètre retenu :
  feuilletage plus physique et lisibilité ; pas de refonte Drop, audio, gameplay,
  monnaies, portraits ou tirages. Base `main` propre et identique à GitHub
  `2e3c4396a53915e6809a89378e4a5e324edbd087` (ls-remote et fetch).
- Observation avant : page déplacée de 8 px en 180 ms, noms longs tronqués ;
  région parfois sur quatre lignes sur les petits portraits. Capture avant :
  `/tmp/creatordeck-binder-before-390.png`, collection factice de 24 cartes.
- Livré : feuille directionnelle en perspective 340 ms, tranche et pochettes
  plus lisibles. Glissement horizontal à seuil max(48 px, 18 % de largeur),
  résistance aux bords, capture seulement après intention horizontale. Le
  scroll vertical reste natif. Taps après un glissement supprimés pour ne pas
  ouvrir une fiche ; tap normal et clavier conservés. Flèches et son existants.
- Une page garde 12 cartes ; vue Obtenues, tris, recherche, objectifs et règles
  de possession inchangés. Noms complets/rareté sous la pochette, pas de région
  recouvrant les portraits compacts. Dos des non-obtenues conservés, marque
  ajustée pour tenir. Styles limités à `.collection-view`.
- Verrou court pendant le tour de feuille (secours 420 ms), annulé par les
  filtres ; OFF/mouvement réduit : passage immédiat sans animation. Aucun
  écouteur global ni dépendance ajoutés. Une seule feuille est montée.
- Vérifications : DOM Binder/catalogue/son 29/29, TypeScript et ESLint ciblé
  réussis (`npm run typecheck`, ESLint ciblé, `git diff --check`). Ancienne
  assertion audio adaptée pour attendre le tour de feuille avant Précédent
  (jsdom ne joue pas CSS), aucun son modifié.
- E2E Chromium 390 × 844 : `e2e/binder-feuilletage.spec.ts` 7/7 (flèches/sens,
  répétition, swipes/tap, bords/filtres/clavier, scroll tactile CDP, OFF/réduit,
  noms longs 320/390). Scénarios Binder existants de `e2e/drop-binder.spec.ts`
  3/3 (objectif mémorisé, manquantes/obtenues, géométrie 320 px). Pas de suite
  E2E globale revendiquée. `npm run build` réussi : export statique sans les
  variables Supabase locales ; pas une preuve cloud. Captures avant/après
  inspectées, noms entiers et régions retirées des vignettes seulement.
- Fichiers : `src/components/binder-view.tsx`, `src/app/drop-binder.css`,
  `src/ecrans-drop-binder.test.tsx`, `src/ecrans-sons.test.tsx`,
  `e2e/binder-feuilletage.spec.ts`, docs. Capture locale après :
  `/tmp/creatordeck-binder-after-390.png`, comparée à l'avant.
- Publication : commit code/tests/docs
  [`da48f70ca2e1f07770031f1bc7d41dca41bb28b1`](https://github.com/GoodFight37/CreatorDeck/commit/da48f70ca2e1f07770031f1bc7d41dca41bb28b1)
  poussé normalement sur `main`, confirmé par `git ls-remote`. Vercel Production
  [`55rio7hVNG29G668LNVGt3CPZgUz`](https://vercel.com/hafsi37-2386/creator-deckk/55rio7hVNG29G668LNVGt3CPZgUz)
  `READY`, contrôle `success`, SHA identique. GitHub Actions : aucun run retourné
  au relevé pour ce SHA ; ne pas déclarer la CI globale verte.
- Production [creator-deckk.vercel.app](https://creator-deckk.vercel.app/) parcourue
  avec Chromium, profil invité vierge : Obtenues par défaut puis Toutes,
  12 dos/page et leurs libellés, flèches/sens/verrou, swipe sans fiche ouverte,
  retour et tap qui ouvre la fiche. Nom `streameruniversitario` entier ;
  `scrollWidth` égal à 320 puis 390. Aucun compte ni collection serveur touchés,
  aucune fausse carte injectée en Production. Les cartes possédées ont été
  contrôlées uniquement dans les fixtures locales. Capture Production inspectée :
  `/tmp/creatordeck-binder-production-390.png` (non versionnée).
- Réservation libérée. Le feuilletage et la lisibilité de ce lot sont livrés ;
  reflets par rareté et sleeves restent au backlog, sans nouvelles règles ou
  récompenses décidées. Ressenti sur appareil non certifié par Chromium.
  Avant une prochaine reprise, relire HEAD/CI/déploiement ; ne pas rouvrir Drop,
  peel, audio ou économie sans demande. Retrouver le SHA du checkpoint par
  `git log -1 --format=%H -- docs/agent-handoff.md`.

## Historique — rituel peel → extraction → reveal publié et vérifié sur Vercel

- Demande : chantier UI du rituel, sans refaire l'accueil ni toucher au moteur,
  aux tirages ou à la BGM. Base `main` propre `283f408632009b606833cdc664fb3aefc910648c`,
  confirmée via l'API GitHub puis `git ls-remote`/fetch. Le premier échec Git
  provenait du sandbox réseau ; la commande autorisée hors sandbox fonctionne.
- Correction locale : titre « LE DROP » redondant retiré ; ticket tutoriel
  conservé. Rabat à résistance progressive, progression visuelle alignée sur
  les deux seuils existants (64 % / 0,22), lueur et vibration unique au seuil,
  « TIRE / RELÂCHE ». Le tracé libre et l'ouverture au relâchement restent.
- Extraction : ancien timer 720 ms interrompant une animation 920 ms ; source
  commune `PACK_TEAR_MS = 1200` pour JS/CSS, cinq dos en éventail puis posés au
  centre/à la taille du reveal. OFF/mouvement réduit : passage immédiat.
- Reveal : commune sobre ; Rare/Épique/Légendaire ont un hit-stop de 12 % du
  flip (101/115/134 ms), lumière et SFX existants calés sur l'impact, y compris
  après les 360 ms de pose de la cinquième carte. Aucun fichier audio modifié.
  Le verrou des appuis pendant le flip est conservé. Résumé mobile en 3 + 2,
  noms lisibles, sachet masqué et arrivée courte ; fermeture par action du joueur
  après une garde de 650 ms contre le double tap (sans attente si effets OFF/réduit).
- Vérifications locales : `npm test -- src/lib/reveal.test.ts src/lib/peel-geometry.test.ts`
  16/16 ; `npm run ecrans -- src/ecrans-effets.test.tsx src/ecrans-drop-binder.test.tsx
  src/ecrans-pack-pending.test.tsx src/ecrans-tutorial-pack.test.tsx` 40/40 avant
  les nouveaux scénarios ; derniers passages effets/tutoriel 28/28 et
  `src/ecrans.test.tsx` 11/11. TypeScript, ESLint ciblé et diff-check réussis.
  Build final `npm run build` réussi (export statique sans variables Supabase,
  donc pas une validation cloud). Aucun SQL ni asset audio touché.
- Chromium système à 390 × 844 : comparaison Commune/Rare/Légendaire,
  extraction à 1 s/résumé et modes OFF/réduit 6/6 ; après le dernier ajustement
  du résumé, lot ciblé extraction/résumé/OFF/réduit/double-appui/peel 8/8.
  Continuité taille/centre, peel courbe, avance horizontale, cinquième carte
  et titre également passés dans les lots précédents. Captures inspectées.
- Échecs intermédiaires corrigés : priorité CSS qui laissait l'animation rare
  active en mouvement réduit ; assertion de matrices 3D trop exacte (résidu
  numérique ~10⁻¹⁵) ; test jsdom qui simulait un animationend non pris en charge.
  Le snapshot scellé testé par erreur en 390 px différait d'un attendu en
  412 px : retest avec dimensions/projets de CI et Chromium Playwright 1243.
  Les seuls snapshots déchirés sont actualisés après inspection (74/130 pixels
  changés avec le nouveau rythme à 700 ms). Les scellés restent inchangés.
  Retest `CSS-only pouch` avec les projets bureau/téléphone et Chromium
  Playwright prévu : 2/2 réussis.
- Publication : code + tests + docs poussés normalement sur `main` au SHA
  [`aabd4169c98ed1d67579ee52e7074b11f9ce198c`](https://github.com/GoodFight37/CreatorDeck/commit/aabd4169c98ed1d67579ee52e7074b11f9ce198c),
  confirmé par `git ls-remote`. Contenu distant du checkpoint relu via GitHub.
  Vercel Production du même SHA
  [`AAuaYzBGVe3ZMbnkwF6sDG7yKfib`](https://vercel.com/hafsi37-2386/creator-deckk/AAuaYzBGVe3ZMbnkwF6sDG7yKfib)
  `READY`, contrôle `success`. GitHub Actions : aucun run retourné pour ce SHA
  lors du relevé ; aucun succès de CI complète revendiqué.
- Vérification réelle du site [creator-deckk.vercel.app](https://creator-deckk.vercel.app/)
  avec Chromium à 390 × 844, profil vierge : titre unique, ESSAYER et détails
  repliés ; petit trait annulé sans trace ; coupe large armée/scellée jusqu'au
  relâchement ; cinq dos opaques à 1 s, première face à 1209,6 ms ; cinq cartes
  suivies une à une, Rare avec animation d'impact ; résumé 3 + 2, sachet masqué,
  `scrollWidth = 390`, pas de fermeture automatique. Aucun compte connecté ni
  booster consommé : tutoriel gratuit seulement. Capture locale inspectée :
  `/tmp/creatordeck-ritual-production-390.png` (non versionnée).
- Limites : Chromium mobile est une émulation ; le ressenti tactile et l'écoute
  des SFX sur appareil restent ouverts. Les tests ne certifient pas la sensation.
  Une interruption de quota avait eu lieu pendant le diagnostic, avant édition.
- Fichiers : `pack-tear.tsx`, `reveal-overlay.tsx`, `drop-view.tsx`,
  `booster-continuity.css`, timings `lib/reveal.ts`, tests et snapshots déchirés,
  README, roadmap, décisions D-097, problèmes connus et guide de peel actualisés.
  Réservation libérée. Prochaine reprise : vérifier HEAD/CI/déploiement courants,
  conserver ce rituel et attendre un retour précis avant de retoucher le seuil.
  Le SHA du checkpoint documentaire se retrouve par `git log -1 --format=%H --
  docs/agent-handoff.md` ; il peut être plus récent que le code vérifié ci-dessus.

## Historique — Drop mobile corrigé et déployé

- Depuis `main` / `52afc5ca69971f4c1b913c2ace6fc8ca435efcc6`, une capture
  Chromium de la Production à 390 × 844 a montré que les plans latéraux CSS
  étaient inversés : ils partaient vers l'arrière et restaient sous la face.
- Correctif publié sur `main` au SHA
  [`08785e43`](https://github.com/GoodFight37/CreatorDeck/commit/08785e43a813857ee0de4819cbac3abc7c6c974c).
  `git ls-remote` confirme ce HEAD. Déploiement Vercel Production du même SHA
  `READY`, contrôle `success`, URL stable
  [creator-deckk.vercel.app](https://creator-deckk.vercel.app/).
- Vérification du rendu Production à 390 × 844 avec Chromium : sachet entier,
  face latérale foil visible (rectangle transformé 14,4 px), `scrollWidth` 390,
  CTA tutoriel « Essayer », volet « Plus d’infos » fermé. Le label « LIVE DROP ·
  5 cartes » reste visible. Les lignes taux/sablier/jetons s’ouvrent dans le
  volet. Aucun APK.
- Tests du patch avant publication : tests d'écran Drop 14/14, E2E téléphone
  ciblés 4/4 (Drop compact, Drop 390 × 844, continuité et extraction PackTear),
  typecheck, ESLint ciblé et `git diff --check` réussis. Aucun workflow Actions
  n'est retourné pour ce SHA.
- Cause/fix : rotation des deux faces latérales corrigée et épaisseur portée à
  20 px; sheen 5 s renforcé; infos secondaires du tutoriel repliées. Changements
  UI seulement. Les critères géométriques et de hiérarchie observés sont
  satisfaits; le goût visuel global reste propre au joueur.

## Historique — diagnostic local des côtés avant publication

- Reprise depuis `main` au SHA `52afc5ca69971f4c1b913c2ace6fc8ca435efcc6`.
  J'ai capturé la Production Vercel en Chromium à 390 × 844 : dimensions et
  placement du pack corrects, mais ses plans latéraux étaient orientés vers
  l'arrière et se peignaient sous la face. Dans le ticket tutoriel, garantie,
  sablier et jetons restaient en trois lignes secondaires visibles.
- Correctif local : inverser la rotation Y des côtés gauche/droit, garder
  l'inclinaison demandée, porter leur profondeur à 20 px et éclaircir le foil;
  renforcer le passage de lumière sans changer sa boucle de 5 s. Regrouper les
  informations secondaires sous « Plus d’infos » uniquement en tutoriel. Elles
  restent directement visibles pour le joueur normal et réapparaissent au clic.
- Portée UI seulement : aucune modification audio, économie, tirage, opening
  flow ou gameplay.
- Validation locale : écran Drop 14/14, TypeScript et ESLint ciblé passent.
  Chromium mobile ciblé : Drop compact + 390 × 844 2/2; cohérence de la
  pochette et extraction PackTear 2/2. L'observation de production et la
  publication sont consignées dans le checkpoint courant ci-dessus.

## Historique — première passe visuelle du Drop

- Demande de Malik : rendre le Drop tactile/TCG et réduire les éléments qui
  ressemblent à un formulaire. Base de départ vérifiée : `main` /
  `7667dae973dec1f5cb8902bdf168e7e087bbe7e6`. Correctif commité et poussé sur
  `main` au SHA `47f5f4fa27ba1c44e03e8261af21ff2b43d6e97f` ; le SHA distant a
  été vérifié par `git ls-remote` après publication.
- Changements locaux : taille `min(58vw, 220px, 34dvh)` gardée sur écrans
  courts, bouton sans filtre pour préserver `preserve-3d`, faces foil plus
  lisibles, sheen léger 5 s, ombre au sol et vignette de scène ; phrase tuto
  retirée, label « LIVE DROP · 5 cartes » gardé, CTA « Essayer » et bouton
  principal remontés au-dessus des infos secondaires. Jetons dans `<details>`.
- Portée : CSS et structure visuelle légers uniquement. Aucun audio, nouvelle
  feature gameplay, règle d'économie ou WebGL.
- Validation locale : tests d'écrans Drop 13/13, `npm run typecheck`, ESLint
  ciblé et `git diff --check` réussis. E2E tenté pour les deux cas téléphone
  (viewport compact et 390 × 844), mais Playwright s'arrête avant les tests car
  son binaire Chromium headless requis est absent. Pas de rendu navigateur ni
  capture. GitHub Actions n'a retourné aucun run associé à ce SHA; le contrôle
  Vercel est `success` et le déploiement Production `READY`, lié au même SHA.
  Le rendu est disponible sur [creator-deckk.vercel.app](https://creator-deckk.vercel.app/).
- Le contrôle mobile ultérieur a révélé les côtés trop discrets et a déclenché
  le correctif documenté dans le checkpoint courant en tête de fichier.

## Checkpoint courant — fondus audio et effets de carte renforcés

- Révision du 14 octobre : BGM préchargée/décodée au montage sans autoplay, puis
  démarre au premier geste autorisé par le navigateur avec fondu de 1,4 s. Le
  raccord cyclique a un fondu croisé de 1,2 s. Mute/unmute garde la position et
  fait un fondu de 0,35/1,4 s sans créer une autre source. Le préchargement
  réduit l'attente après le geste, mais le navigateur interdit l'autoplay sonore
  sur mobile. Les gains musicaux restent `0,08` hub / `0,04` pack.
- Les cibles des seuls SFX de carte sont remontées : pioche `-29 → -25 dBFS`,
  retournement `-30 → -28,6 dBFS` (borne de crête `-6 dBFS` conservée).
- Validation ciblée : SFX/audio 23/23, typecheck, ESLint des fichiers touchés,
  régénération des niveaux SFX et `git diff --check` réussis. Aucun E2E complet
  relancé ; l'écoute subjective reste ouverte.

- Reprise locale depuis `main` / `origin/main` au SHA documentaire
  `86871af7cb50ae95ef7481ea9d3e2ed2e9afb790`. L'API GitHub confirme ce HEAD ;
  `git ls-remote` ne passe pas actuellement le proxy de cet environnement.
- Audio : l'asset bourdonnant de 24 s est remplacé par la piste provisoire
  `springly_sprigs` fournie par Malik (OpenGameArt CC0), 142 s, compressée en MP3
  mono 24 kHz/48 kbit/s (~834 KiB). Les gains initiaux `0,32` au hub et `0,16`
  en pack ont ensuite été abaissés au quart (`0,08`/`0,04`) à la demande du
  joueur. Le démarrage se fait à l'entrée du jeu, pas à l'ouverture du booster.
  La boucle reste unique et les réglages Son de l'application et Musique sont
  distincts.
- Cartes : une avance demandée pendant le retournement était mise en file puis
  exécutée au flip end ; un tap suivant pouvait donc avancer la carte suivante.
  Le bouton est maintenant désactivé jusqu'à la fin de l'animation, et les taps
  reçus pendant ce délai ne sont pas conservés. Le raccourci de révélation totale
  reste disponible.
- Tests locaux : audio 22/22, écrans concernés 33/33, typecheck et ESLint ciblé
  réussis. Le serveur E2E local s'est arrêté avant les tests (exit 1 sans autre
  diagnostic), mais le run GitHub Actions
  [38613807945](https://github.com/GoodFight37/CreatorDeck/actions/runs/38613807945)
  est vert : unitaires 1 171/1 171, écrans 130/130, Playwright 105/105, cloud
  simulé, migrations, lint et build.
- Vercel status check `success` pour `00a52bb3`. L'API Vercel détaillée renvoie
  403 dans cette session ; statut `READY` indépendant non vérifié. URL de test :
  [creator-deckk.vercel.app](https://creator-deckk.vercel.app/). L'écoute réelle
  reste à faire par Malik.
- Asset confirmé côté dépôt par ffprobe (142,272 s, 48 kbit/s) ; source mesurée à
  `-15,5 LUFS` / `-0,6 dBTP`. Il reste à confirmer le niveau et la préférence sur
  Vercel. Ne pas modifier les SFX : la demande concerne la musique.

## Historique — audit audio et composition Drop

- Branche `main`, base auditée `d19471fe89b8e7ecda21fc7cce53f6ddeab4d683` ;
  audit audio/Drop publié sur `main` en trois commits : correctif applicatif
  [`ab740821`](https://github.com/GoodFight37/CreatorDeck/commit/ab740821724773c2b2a0a1f874a30f6f7e10a80a),
  bornes et snapshots d'ouverture `823cdfb8`, puis snapshots déchirés et limite
  de placement de soudure `348ec6943d8f17e62d02739096a1a6b632abed0a`.
  GitHub `main` a été relu après chaque push ; son HEAD est `348ec694`.
- Audio : le préchargement SFX crée un `AudioContext` dès le montage, mais ne
  doit pas lancer la BGM. Auparavant le démarrage au premier contrôle incluait
  des actions d'onboarding/navigation, et `PackTear` commandait lui-même le
  duck puis restaurait le hub au démontage, ce qui pouvait rendre la scène
  incohérente. Une seule boucle Web Audio est maintenant lancée par l'action
  réelle d'ouverture (booster ou cadeau tutoriel) ; l'app reste propriétaire
  de la scène. `setMusicScene` ne démarre jamais de source. Un mute durant le
  chargement interdit le démarrage tardif ; mute puis unmute et stop/redémarrage
  recréent une source unique. Gain testé : hub `0.9`, pack/reveal `0.018`,
  Tribunal `0`. Son de l'application et Musique restent indépendants.
- Drop : les règles courtes qui réduisaient la pochette à 52/48/44vw
  contredisaient la taille mobile voulue. Leur retrait conserve la taille
  commune `min(58vw, 220px, 34dvh)` ; le contenu et les CTA restent accessibles
  par défilement. À 390 × 844, le test vérifie les labels, l'indication de geste,
  l'absence de débordement horizontal et au moins 12 px entre scène et ticket.
  Capture Playwright disponible dans `test-results/`; elle ne remplace pas le
  rendu d'un téléphone physique.
- Validation finale : GitHub Actions
  [`38610672014`](https://github.com/GoodFight37/CreatorDeck/actions/runs/38610672014)
  verte, 6/6 jobs : 1 171 unitaires, écrans 130/130, 103 E2E réussis et 11
  scénarios cloud conditionnels ignorés, chemin cloud à RPC simulés, migrations
  SQL jetables, ESLint, typecheck et build. `src/lib/sfx.test.ts` 22/22 ; E2E
  audio/Drop ciblé téléphone 7/7. Le run précédent a exposé le seuil 65 % et
  trois captures de pochette obsolètes ; critères/snapshots ajustés aux captures
  CI inspectées sans réduire le sachet. Le test d'ouverture valide le grand
  pack, les labels, le hint, le scroll compact et le jeu sans débordement.
- Le test unitaire local isolé donnait 1 154 réussis et 17 erreurs dues au
  sandbox (`spawnSync git EPERM`, et sorties silencieuses des vérificateurs de
  seeds) ; la suite entière passe sur le runner CI. Le build local turbopack est
  resté suspendu et Webpack n'a pas lu `tsc --showConfig`, limites non reproduites
  en CI. Vercel Production `READY` sur
  [`348ec694`](https://vercel.com/hafsi37-2386/creator-deckk/8Kq1MuCaYuU7XeQG6ARjKrorhXSQ),
  alias [creator-deckk.vercel.app](https://creator-deckk.vercel.app). Le contenu
  du site n'a pas pu être lu par le connecteur (403), bien que le build/deploy
  soit `READY`.
- Restent ouverts : choix final de la musique, écoute sur haut-parleur réel,
  contrôle physique des biseaux/côtés 3D, et sensation du peel. Malik teste le
  web Vercel, jamais l'APK. Les E2E ne closent aucun de ces retours subjectifs.


- Projet : CreatorDeck, application web testée sur Vercel. Malik n’utilise pas
  l’APK pour ses validations. Lire `AGENTS.md`, `docs/README.md`, la roadmap,
  le périmètre et ce checkpoint avant de reprendre.
- Git : `main` est la branche de travail et de publication. Base vérifiée de
  cette reprise : `99fc67ca2d76e1e743b8d50ffd9f4042083e74d7`, checkout local
  propre et identique à `origin/main`. Le commit qui contient ce checkpoint
  est retrouvable par `git log -1 --format=%H -- docs/agent-handoff.md`.
- Dernier changement applicatif : peel libre au commit
  `3fec7895fae6bbed0eb05bf4baa6e246f55fefdc` ; zone Y 6–26 %, couverture
  64 %, tracé X/Y du doigt conservé, ouverture au relâchement, extraction des
  cartes automatique. Le SHA plus récent `c16992c7` ne contient qu’une mise à
  jour documentaire : l’indicateur de version web peut donc être plus récent
  que le code de jeu.
- CI du code : GitHub Actions [run 38573481379](https://github.com/GoodFight37/CreatorDeck/actions/runs/38573481379),
  6/6 jobs verts sur le code `3fec7895`. Le check Vercel du commit documentaire
  `99fc67ca` est `success` ; Vercel Production est `READY` sur ce SHA, URL
  [creator-deckk.vercel.app](https://creator-deckk.vercel.app).
- Peel : après le test du pack tutoriel sur Vercel, Malik confirme que le pack
  s'ouvre normalement, mais trouve encore le geste perfectible. Aucun défaut
  précis supplémentaire n'a été décrit ; garder le ressenti ouvert et ne pas
  le déclarer résolu grâce aux seuls tests automatisés. Ne pas revenir à un
  rail linéaire ni remettre un tracé blanc agressif.
- Audio : Malik a fourni `snow_day.mp3` et `springly_sprigs.mp3` de
  [Fantasy Song Pack Volume 1](https://opengameart.org/content/fantasy-song-pack-volume-1)
  (CC0), comme références provisoires et non comme choix final. La shortlist
  synthwave/techno précédente ne correspond pas à son goût. Chercher une
  mélodie d'aventure console/JRPG chaleureuse et mémorable, sans reprendre de
  musique Nintendo/Pokémon. Fichiers non ajoutés au dépôt ; aucune piste
  retenue. Les morceaux unreleased de Juice WRLD ne sont pas libres par défaut :
  ne rien intégrer sans autorisation écrite pour composition/synchronisation et
  master/enregistrement. Voir [audio-assets.md](audio-assets.md).
- Pas de fichiers applicatifs à réserver : le prochain chat peut poursuivre
  selon la roadmap. Après chaque livraison vérifiée, mettre à jour les docs,
  pousser normalement sur `main`, puis confirmer le SHA distant, CI et Vercel.

## Checkpoint historique — reprise au 14 octobre 2026

Les paragraphes ci-dessous documentent la reprise antérieure avant l'audit audio/Drop.
Le checkpoint courant ci-dessus est la référence pour les SHA, CI et déploiement actuels.

## Peel libre sur la bande haute — publié, ressenti joueur à confirmer, 14 octobre 2026

Malik a testé le web Vercel et décrit un rabat « dur comme du bois » : la coupe
restait une ligne, le doigt ne guidait pas le tracé et un swipe franc ne
suffisait souvent pas. L'ancienne géométrie triait les échantillons par X,
prenait leurs médianes et lissait la soudure en forme monotone ; le seuil de
couverture était de 88 %. La préférence joueur est désormais explicite : le
path doit garder son ordre tactile, ses retours en X et ses variations en Y ;
ne pas re-trier ou contraindre le geste pour satisfaire une capture CI.

Implémentation locale sur `main` depuis `eb12a1b9` : zone Y élargie à 6–26 %,
couverture minimale abaissée à 64 %, effort minimal anti-tap conservé (`0,22`).
Le filtre n'enlève qu'une faible part de jitter et préserve les retracés ; le
rabat suit le déplacement X/Y du doigt. Une lueur fine et quelques points
animés suivent la coupe ; l'animation de ces points s'arrête avec
`prefers-reduced-motion`. Le booster s'ouvre toujours au relâchement après
seuil. Les cartes commencent leur extraction automatiquement ensuite, sans
bouton « Afficher les cartes » bloquant. Aucun changement au Drop, Binder,
Craft, Toi, SQL, pity math ou PackFoil3D.

Vérifications locales : géométrie 3/3, typecheck, ESLint ciblé, E2E
`e2e/pack-tear.spec.ts` 49 réussis / 1 scénario cloud conditionnel ignoré,
`npm run ecrans` 130/130, build réussi. Le build local n'avait pas de variables
Supabase, donc il ne valide pas le cloud. Code publié sur `main` au SHA
`3fec7895fae6bbed0eb05bf4baa6e246f55fefdc`. La CI GitHub
[`38573481379`](https://github.com/GoodFight37/CreatorDeck/actions/runs/38573481379)
est verte (6/6 jobs). Vercel Production est `READY` pour ce SHA, déploiement
[`68vZFVuDBdVQ6YMoLie3BVFSiBYj`](https://vercel.com/hafsi37-2386/creator-deckk/68vZFVuDBdVQ6YMoLie3BVFSiBYj),
alias `https://creator-deckk.vercel.app`. La version web au départ était
`eb12a1b9`. La sensation du geste dans les mains de Malik reste à confirmer ;
ne pas déclarer le problème résolu sur la base des tests. Le checkpoint
documentaire qui inscrit ces statuts ne change aucun fichier applicatif ; son
SHA peut donc être plus récent que le commit de code `3fec7895` affiché ici.

Retest rapide sur Vercel après déploiement : ouvrir le pack tutoriel ; tracer
une diagonale ou un petit retour sur la bande striée ; vérifier que le trait et
le rabat suivent le doigt ; faire un swipe large (~2/3 du haut), relâcher et
confirmer que les cartes commencent sans second clic. Un tap ou trait court
doit replier le sachet sans consommation. Le rendu E2E confirme une trajectoire
courbe et un retour en X en bureau/téléphone simulé, pas la sensation au toucher
sur l'appareil de Malik.

## Peel local, seuil de coupe complète et repli sans trace — publié, 14 octobre 2026

Les captures de Malik montrent deux défauts : une coupe courte peut laisser son
trait après relâchement ; le soulèvement d'une petite zone peut armer le geste,
alors que l'animation replie la totalité du rabat. `isPeelOpenable()` exige
maintenant au moins 88 % de la largeur effective de la zone tactile et
l'ouverture minimale déjà requise. Le tracé et le bord clipé restent guidés
par le doigt ; une tentative incomplète efface la trace, réinitialise la coupe et
replie le sachet avec une transition courte. L'ouverture reste déclenchée au
relâchement après ce seuil. Code publié sur `main`, SHA
`8619f461792bc55f77aab826907e4025f866f097`, vérifié sur la branche distante ;
Vercel Production `READY` sur ce commit. Les contrôles à seuils unitaires
passent (3/3), le
typecheck et ESLint ciblé passent ; E2E `e2e/pack-tear.spec.ts` : 47 réussis,
1 scénario cloud conditionnel ignoré. Les 4 parcours ciblés passent en bureau
et téléphone simulé (8/8). `npm run build` réussit ; le garde-cloud indique
que les variables Supabase ne sont pas présentes, donc ce build local est
statique sans cloud. La CI GitHub [`38569239104`](https://github.com/GoodFight37/CreatorDeck/actions/runs/38569239104)
est terminée avec 5 jobs réussis et un échec dans le banc d'écrans : une
ancienne assertion refusait le libellé « Version … » du profil alors que cette
version est déjà affichée et testée ailleurs. Assertion réalignée sur le
format attendu ; le test isolé passe (11/11) et toute la suite `npm run ecrans`
passe (130/130). Correctif du test publié au commit `13f471e5`. CI de reprise
[`38569853793`](https://github.com/GoodFight37/CreatorDeck/actions/runs/38569853793)
verte, 6/6 jobs. Aucun téléphone physique testé.

Fichiers applicatifs : `src/components/pack-tear.tsx`,
`src/lib/peel-geometry.ts`, son test, `src/app/booster-continuity.css` et
`e2e/pack-tear.spec.ts`. Aucun changement aux piliers, à l'économie ou aux
timings des reveals.

## Tracé du peel lissé et limité à la soudure — publié, 14 octobre 2026

Malik montre un tracé lumineux en zigzag pendant des va-et-vient sur le sachet,
et juge le blanc trop agressif. La cause est dans la reconstruction de la coupe :
garder le dernier Y par tranche X puis trier les X transforme les retours du
doigt en dents dans le contour. Le code utilise maintenant les médianes par
tranches de 2 % et un lissage pondéré court ; seuls les échantillons dans la
bande de soudure alimentent le contour. Les mouvements vers le bas dans l’art
sont ignorés ; lever le doigt au-dessus de la soudure reste valide et continue
de compter dans l’effort, sans dessiner hors zone. La ligne est passée d’un
blanc/halo fort à un trait champagne fin avec halo rose assourdi. Le seuil et
l’ouverture au relâchement ne changent pas.

Code publié sur `main`, commit `0c4c7b9f808838484b9ece1dbe6bd752831b1395` ; SHA
distant vérifié. Contrôles : `npm test -- src/lib/peel-geometry.test.ts` 2/2 ;
`npm run e2e -- e2e/pack-tear.spec.ts` 45 réussis, 1 test cloud conditionnel
ignoré ; `npm run typecheck`, ESLint ciblé et build statique réussis. Le build
local sans variables Supabase n’est pas une validation cloud. Les modifications
du fichier CSS CRLF ont été contrôlées avec `git -c core.whitespace=cr-at-eol
diff --check`. Vercel Production est `READY` sur le même SHA ; check GitHub
Vercel `success`. Aucun test sur téléphone physique revendiqué.

Fichiers : `src/lib/peel-geometry.ts` (médiane/lissage), son test unitaire,
`src/components/pack-tear.tsx`, les CSS premium/continuity et
`e2e/pack-tear.spec.ts` (contour contenu dans la soudure malgré le glissement
hors zone). Aucun changement au Drop, à l’économie ou au flux de révélation.

## Identifier clairement le build installé — publié, Vercel READY, 14 octobre 2026

Malik rapporte que le champ du code cadeau et son solde de boosters test ont
disparu puis réapparu. Le premier est du code d’interface ; le second est une
donnée du compte Supabase. Leur changement ensemble ne prouve donc pas que
Vercel sert aléatoirement plusieurs versions. En particulier, Vercel met à jour
le site web, mais ne remplace jamais les fichiers déjà embarqués dans une APK
Capacitor. Un retour à une ancienne interface peut venir d’une APK ancienne ou
d’un autre contexte/build ; les cadeaux peuvent aussi varier avec le compte et
sa synchronisation.

Le dépôt avait déjà `src/lib/build-version.ts` et le style `.profile-build-version`,
mais aucun rendu JSX : la décision D-018 était donc documentée sans indicateur
visible. Le correctif ajoute dans Toi → Réglages l’empreinte « Version Android/Web ·
<7 caractères du commit> », avec le SHA complet au survol et un test écran. Cela
identifie le code, pas la version des données distantes. Le SHA courant avant ce
changement était `89b95b0f2d366879aa39e23ed54e60c2170c995d`, confirmé identique à
`origin/main`. Le code et son test sont publiés sur `main` au commit
`7e5ecbd2859ae734c772703b1e291650d18c5b1e` ; SHA distant vérifié. Test écran
`npm run ecrans -- src/ecrans-scene-profile.test.tsx` : 11/11 ;
`npm run typecheck`, ESLint ciblé et `git diff --check` réussis ; `npm run build`
réussi. Avertissement attendu : les variables Supabase ne sont pas configurées
dans ce checkout, donc ce build local ne valide pas le cloud.

Vercel Production a créé le déploiement
[`5tfxiyrLTrhTPsLXPC9Qco7KhD7d`](https://vercel.com/hafsi37-2386/creator-deckk/5tfxiyrLTrhTPsLXPC9Qco7KhD7d)
pour le SHA `7e5ecbd2` ; état `READY`, alias de production
`https://creator-deckk.vercel.app`. Le statut GitHub visible est Vercel
`success` ; le connecteur ne rapporte pas de workflow runs pour ce SHA,
ce qui ne permet pas de conclure qu’aucune CI ne tourne. Vérifier ces statuts
avant d’annoncer le déploiement terminé. L’indicateur ne sera visible qu’après
le déploiement web, ou la reconstruction/réinstallation Android correspondante.

## Peel trop tôt figé après le seuil — corrigé, 14 octobre 2026

Malik précise que depuis le correctif du va-et-vient, le peel paraît rigide,
plus linéaire et moins pilotable. Cause trouvée dans le code publié : le simple
parcours de 38 % de largeur armait l'ouverture, puis `onPointerMove` ignorait
tous les mouvements suivants. Le profil de coupe gardait aussi le premier
point de chaque tranche X, ce qui rendait les retours en Y sans effet.
Maintenant, seul le seuil d'ouverture combinée (étendue X + variation Y +
soulèvement) arme le relâchement ; le doigt continue de guider le rabat et le
profil jusqu'à `pointerUp`. Le profil conserve le dernier Y de chaque tranche,
trié sur X, afin que la forme reste une fente unique sans polygone auto-croisé.
Une annulation replie toujours le sachet et n'ouvre pas le booster.

Code : `src/components/pack-tear.tsx`, test : `e2e/pack-tear.spec.ts`.
Commit `abcd2d0ad5b5c4d896a21f9b68496c9af4a4b832` poussé sur `main` après la
base `69fe48ca`. La suite `e2e/pack-tear.spec.ts` passe : 45 réussis, 1 scénario
cloud ignoré ; typecheck, ESLint ciblé et build statique réussis. CI GitHub
[`38563130307`](https://github.com/GoodFight37/CreatorDeck/actions/runs/38563130307)
et le déploiement Vercel Production du SHA `abcd2d0a` étaient en cours au
dernier relevé. Vérifier leur état avant de conclure ; le test sur téléphone
physique reste à faire. Le contour SVG corrigé au commit `269ec4d7` est conservé.

## Tracé de coupe invisible sur téléphone — corrigé localement, 14 octobre 2026

La vidéo `Screenrecorder-2026-10-14-13-55-50-261.mp4` confirme le défaut :
« Relâche pour ouvrir » apparaît alors que la face du sachet semble intacte,
puis les cartes sortent sans fente visible. Cause trouvée : les classes de
l'ancienne barre HTML étaient appliquées à une `polyline` SVG, sans `stroke`
ni SVG positionné sur le sachet. Le calcul du geste fonctionnait ; son trait
était invisible. Le correctif positionne le SVG sur toute la scène et dessine
la trajectoire en trait clair avec halo. Il ne change ni le seuil, ni le
relâchement obligatoire, ni les tirages et timings. Un E2E vérifie maintenant
le contour SVG ; une capture téléphone simulé montre la fente sur la soudure.

Fichiers : `src/components/pack-tear.tsx`,
`src/app/booster-premium.css`, `src/app/booster-continuity.css`,
`e2e/pack-tear.spec.ts`, `docs/decisions.md`, `docs/known-issues.md` et
`docs/roadmap.md`. Commit de code `269ec4d7` et passation publiée sur `main`
au SHA `c2277ac53900e18c6b3c64cc33408e093c7679aa`. Vérifications : la
suite `e2e/pack-tear.spec.ts` passe (45 réussis, 1 scénario cloud conditionnel
ignoré), typecheck, ESLint ciblé, build statique et `git diff --check` passent.
Vercel Production est `READY` pour ce SHA. La CI GitHub
[`38561091030`](https://github.com/GoodFight37/CreatorDeck/actions/runs/38561091030)
était encore en cours au relevé suivant le push. Aucun déploiement physique
Android revendiqué.

## Audio — interrupteurs publiés, sélection d'une BGM en attente, 14 octobre 2026

Malik préfère deux options indépendantes (« Son de l’application » et
« Musique ») et le volume média du téléphone au choix Discret/Normal/Fort. Le
code publié implémente ces deux interrupteurs, persistés séparément ; le son
actuel reste le prototype de nappe de 24 s. Une shortlist à écouter (Neon Noir,
Resonance, Assembly Not Required, Nightchaser) et les crédits/licences requis
sont dans [audio-assets.md](audio-assets.md). N'intègre pas de candidat avant
son choix. Tests locaux ciblés : `src/lib/sfx.test.ts` 22/22,
`ecrans-sons.test.tsx` 6/6, typecheck, ESLint ciblé, build statique cloudless
et `git diff --check` réussis. Publié sur `main` au SHA
`ee62de9e95fdccad513a0435956bf816927a345a`. Vercel Production READY pour
https://creator-deckk.vercel.app . CI GitHub
[`38499177407`](https://github.com/GoodFight37/CreatorDeck/actions/runs/38499177407)
avait signalé une assertion E2E obsolète qui attendait l'ancien nom exact
« Son ». La mise à jour de l'E2E au nom « Son de l’application » passe en local
sur téléphone simulé (2 passés, 1 scénario cloud ignoré). L'assertion est
corrigée et publiée au SHA `28af5919f1565e9867db13fe4d6f9e7032607c7c`.
Nouvelle CI `38499499108` en attente/en cours lors du dernier relevé ; à relire.
L'ancien
choix global Son OFF est migré vers les deux interrupteurs OFF au premier
démarrage, pour ne pas rallumer l'audio d'un joueur existant.
SHA de départ `b5e240363fb841df6e1a4d8c541e592e0c6301f9`, branche `main`.
Un seul écrivain : Codex.

## Pulsation de la BGM — nouvel asset local à vérifier, 14 octobre 2026

Après que Malik a décrit une pulsation « tac-tac » rapprochée, j'ai comparé
l'asset local et celui servi par `https://creator-deckk.vercel.app/music/hub-late-night.mp3` :
les SHA-256 correspondaient, et la réponse Vercel était 200 `audio/mpeg`. La
source prototype contenait la pulsation ; le nœud Web Audio ne boucle qu'à la
fin du fichier de 24 s. Asset remplacé localement par une nappe sans percussion,
générée par `scripts/generate-hub-music.py` puis compressée en MP3. Mesures du
nouveau fichier : `-22,7 LUFS`, crête vraie `-11,5 dBFS`. Tests ciblés et suite
projet passent (1 169/1 169), E2E audio 2/2, typecheck, lint et build réussis.
Publié sur `main` au SHA `67a9319452e27cb792032584e28448a6c6cc7fe7`. CI
[`38497830790`](https://github.com/GoodFight37/CreatorDeck/actions/runs/38497830790)
verte (6/6), Vercel Production READY ; SHA-256 du fichier distant identique.
Écoute physique reste à faire. Détails : [D-086](decisions.md) et
[audio-assets.md](audio-assets.md).

## BGM du hub — double atténuation corrigée et publiée, 14 octobre 2026

La boucle était chargée, mais le mix avait deux défauts : le gain hub `0,24`
était trop bas et le volume Normal `0,75` était appliqué deux fois à la BGM
(canal musical puis bus), donnant environ `-43,8 LUFS` depuis une source à
`-26,4 LUFS`. Le code local porte le gain de scène à `0,9` et applique le volume
global une seule fois sur le bus : environ `-29,8 LUFS`, crête estimée
`-14,1 dBFS`. Ducking pack `0,018`, silence Tribunal, autoplay, mute et assets
inchangés. Le test AudioContext vérifie une boucle unique, les trois scènes,
les crans globaux et le mute. Vérifications locales après correction : tests
projet 1 169/1 169, écrans 129/129, E2E audio 2/2 sur bureau/téléphone simulé,
typecheck, ESLint ciblé, build cloudless et `git diff --check` réussis. Correctif
publié sur `main` au SHA `861870ee66054646b3215bb360ca48b74ab1ff01`. CI GitHub
[`38496749379`](https://github.com/GoodFight37/CreatorDeck/actions/runs/38496749379)
verte, 6/6 jobs ; Vercel Production `READY` pour ce SHA :
https://creator-deckk.vercel.app . Écoute physique non effectuée ; la valeur
LUFS estime un niveau, elle ne remplace pas le test sur haut-parleur réel.
Voir [D-085](decisions.md) et [la fiche audio](audio-assets.md).

## Peel stable après va-et-vient — corrigé et publié, 14 octobre 2026

Malik a reproduit un sachet visuellement cassé en gardant le doigt posé et en
faisant des allers-retours. `pack-tear.tsx` garde le premier point de coupe de
chaque tranche X et réutilise cette silhouette pour la fente ; une fois le
seuil atteint, le tracé, le rabat et l'inclinaison ne bougent plus sous le doigt.
Le booster s'ouvre uniquement au relâchement ; cancel/perte de capture replient.
En complément, un E2E dédié vérifie qu'une annulation après le seuil ne tire pas
de cartes.

Fichiers : `src/components/pack-tear.tsx`, `e2e/pack-tear.spec.ts`,
`docs/decisions.md`, `docs/known-issues.md`, `docs/roadmap.md`.
Publié sur `main` au SHA `b6a3605ce8b77e41244f4fef9f8e9300fd7ec634`.
GitHub Actions [`38494377386`](https://github.com/GoodFight37/CreatorDeck/actions/runs/38494377386)
verte, 6/6 jobs ; Vercel Production `READY` pour ce SHA :
https://creator-deckk-p31u9pp8f-hafsi37-2386.vercel.app . E2E ciblés : 6/6
(bureau et téléphone simulé) ; suite `e2e/pack-tear.spec.ts` : 43 réussis et un
scénario conditionnel ignoré. `npm run ecrans` 129/129, `npm run typecheck`,
ESLint ciblé et `git diff --check` réussis. Aucun test physique sur téléphone
n'est revendiqué ; Malik doit encore essayer le geste sur son appareil.

## Fenêtre « J'ai un code booster » invisible sur mobile — corrigée et publiée, 14 octobre 2026

La capture de Malik montrait le profil assombri et flou, sans panneau du code.
Cause : `ProfileView` utilise une animation `transform`; le `position: fixed` de
`PromoCodeSheet`, enfant de cette vue, prenait le long écran du profil pour
repère et était ensuite rogné par la coque de l'application. Le composant monte
maintenant la feuille dans `document.body`, comme modale indépendante de la vue.
Publié sur `main` au SHA `7413d47bbc0f2aefeac47afcbeb749b366db8bb0`. CI GitHub
[`38492822813`](https://github.com/GoodFight37/CreatorDeck/actions/runs/38492822813)
verte, 6/6 jobs ; Vercel Production READY pour ce SHA. Tests locaux :
`npm run ecrans` (22 fichiers, 129/129), TypeScript et ESLint ciblé réussis ;
`npm run e2e -- e2e/scene-profile.spec.ts` (6 réussis, deux scénarios cloud
ignorés) vérifie le panneau dans le viewport bureau et téléphone.
`git diff --check` réussi. Aucune donnée ou crédit Supabase modifié. Une APK Capacitor
installée doit être reconstruite pour embarquer le changement ; le site web est
à jour.

## Crédits booster de test personnels — publiés et migration appliquée, 14 octobre 2026

Demande de Malik : un code facile à saisir (`MALIK`) donnant 50 boosters pour
tester l'ouverture sur son compte sans réinitialiser sa progression. La réserve
rechargeable reste plafonnée normalement. Ajout local : nouveau champ
serveur `pack_state.promo_packs`, code promo jusqu'à 50 ouvertures et liaison
optionnelle à `recipient_id`, ouverture des boosters bonus quand la réserve est
vide, et affichage distinct dans le Drop. Le code prévu est personnel (une
utilisation, sans expiration) et le guide donne une requête qui le lie à l'email
du compte Supabase.

Fichiers concernés : migration `0051_boosters_promo_personnels.sql`, API et
store cloud, écran Drop, tests et guide `booster-test-access.md`. Code publié sur
`main` au SHA `5bdf9f21317a2d6b6557c1cc70f968a3379236e6`. La CI GitHub
[`38490854882`](https://github.com/GoodFight37/CreatorDeck/actions/runs/38490854882)
est verte (6/6 jobs). Le déploiement automatique Supabase
[`38491098387`](https://github.com/GoodFight37/CreatorDeck/actions/runs/38491098387)
a appliqué 0051 et vérifié l'historique et les objets attendus. Vercel Production
est READY pour ce SHA :
https://creator-deckk-mfqwzlhel-hafsi37-2386.vercel.app .

Vérifications locales : `npm run supabase:verify` (Postgres jetable, migrations
0001–0051, compte propriétaire, refus d'un autre compte, crédit de 50 et ouverture
réelle), `npm test` (73 fichiers, 1 168 tests), `npm run ecrans` (22 fichiers,
129 tests), `npm run typecheck`, ESLint ciblé, `npm run build`,
`node scripts/supabase-deploy.mjs --check` et `git diff --check`. Le build local
était cloudless ; la migration de production, elle, a été déployée et vérifiée.
Aucun code promo personnel n'a encore été créé. Malik doit insérer `MALIK` dans
le SQL Editor avec l'adresse exacte de son compte Supabase, selon
[le guide](booster-test-access.md). Le code est désormais disponible dans
l'application après actualisation/rechargement ; pour une APK Capacitor, une
nouvelle APK reste nécessaire.

## Synchronisation du compte et codes de test — code local, 14 octobre 2026

À la demande de Malik, le cloud devient la référence lorsqu'un compte connecté
possède déjà une sauvegarde : le démarrage, la connexion, le retour au premier
plan et le retour du réseau la rechargent automatiquement. Les conflits issus
d'un push automatique adoptent aussi l'état renvoyé par le serveur ; ils ne
bloquent plus le sablier. Un compte cloud neuf peut toujours être initialisé par
la partie locale. Les actions sensibles qui exigent une collection synchronisée
gardent leur refus si leur push explicite échoue. Conséquence assumée : des
progrès faits hors ligne sont remplacés au retour en ligne.

Le composant de code promo existait mais n'était relié à aucun bouton ; il est
maintenant accessible dans Toi → Fonctionnalités en ligne. Le guide
[booster-test-access.md](booster-test-access.md) explique comment créer 25 codes
privés de quatre boosters dans le SQL Editor (100 ouvertures cumulées), sans
modifier les cartes ou les règles de tirage directement. Aucun code n'a été
créé dans la base et aucun compte utilisateur n'a été modifié depuis cette
session : elle ne dispose pas d'accès administrateur Supabase.

Vérifications locales : `npm test` 73 fichiers / 1 168 tests ;
`npm run ecrans` 22 fichiers / 128 tests ; typecheck, ESLint ciblé et build de
production réussis. Le build est cloudless (variables Supabase absentes), donc
il ne valide pas le compte réel. Aucun code promo créé et aucune donnée de
production changée. Publié sur `main` au SHA
`c5ac85c6da72f02073d5cd8d31e6adeb5d030ce9` ; CI GitHub
[`38487628741`](https://github.com/GoodFight37/CreatorDeck/actions/runs/38487628741)
en cours (6 jobs au dernier contrôle). Vercel reste à vérifier. Aucun test sur
le compte de Malik ni accès administrateur Supabase.

### Correctif CI : missions locales après un tirage serveur — 14 octobre 2026

La première CI du changement ci-dessus a révélé que le rechargement cloud,
désormais prioritaire, pouvait écarter les missions mises à jour localement
après le tirage. Le RPC avait déjà enregistré les cinq cartes et la réserve,
mais pas les compteurs de missions. `openPack()` envoie donc maintenant l'état
fusionné juste après le tirage avec le contrôle de version normal (`force=false`)
après relecture serveur. Les cartes conservent leurs identifiants serveur ; une
écriture concurrente n'est jamais forcée. Le test cloud simulé vérifie les IDs,
le push normal, les missions, puis l'absence de second push au rechargement.

Validation : `npm test` 73 fichiers / 1 168 tests ; `npm run ecrans` 22 fichiers /
128 tests ; E2E cloud simulé 2/2 bureau/téléphone ; TypeScript, ESLint ciblé,
`git diff --check` et build production réussis. Le build local reste cloudless,
sans variables Supabase. Correctif publié sur `main` au SHA
`fc5b47ff0793e8ff273dfccd381f50b158bd4fa4`. Sa première CI a échoué sur le
typage de deux nouvelles assertions de tests ; annotations ajoutées au commit
`c3ab397e614307c222acd3817c474e05113f225f`. Vercel pour ce dernier SHA est
**READY** ; CI GitHub
[`38488559202`](https://github.com/GoodFight37/CreatorDeck/actions/runs/38488559202)
verte, **6/6 jobs**. Vercel est également READY pour le code et le checkpoint
documentaire. Aucun test sur le compte réel et aucune donnée de production
modifiée.

## Visuel Drop et démarrage de la musique — publié, Vercel actif, CI verte, 13 octobre 2026

Malik voyait encore la façade violette au hub et n’entendait pas la BGM. Les deux
causes étaient distinctes : `drop-view.tsx` chargeait encore `live-foil.svg`,
alors que seule la scène de déchirure chargeait `live-opening.svg` ; et
`startGameAudio` n’était appelé qu’au début d’un tirage. Avec une réserve vide,
aucun geste ne débloquait donc la musique. Le Drop pointe maintenant vers le
sachet mat de l’ouverture ; le premier appui clavier/tactile sur un contrôle du
jeu (pas les étapes « Continuer/Terminer » du tutoriel) démarre la musique du
hub, et l’ouverture passe ensuite au mix très atténué du pack. La navigation
reste sans bruitage. Un test CI initial avait des attentes obsolètes et
capturait la requête après le clic ; `8bf36ba0` corrige l’assertion et évite
que le tutoriel consomme le premier démarrage audio.

Code publié sur `main` au SHA `8bf36ba0e931a721690cb1eab9d996d2473328fd` ;
`git ls-remote` confirme ce SHA. Vercel Production a terminé avec succès :
https://creator-deckk-pjc4vo305-hafsi37-2386.vercel.app . CI GitHub
[`38485767846`](https://github.com/GoodFight37/CreatorDeck/actions/runs/38485767846)
verte, 6/6 jobs. Le premier run `38485191463` avait échoué sur le test
musique (requête chargée dans les contrôles du tutoriel) et une URL attendue
obsolète ; le correctif a été vérifié localement puis la CI complète est passée.
Vérifications locales : `npm test` 73 fichiers / 1 168 tests,
`npm run ecrans` 22 fichiers / 127 tests, typecheck, ESLint ciblé et build de
production réussis. L’écoute sur un téléphone physique reste à faire ; les
vérifications navigateur ne valident pas le niveau perçu. La lecture automatisée
des URL de fichiers Vercel est restée bloquée par un 403 de l’intégration ; le
statut de déploiement Vercel, lui, est `success`.

## Sablier — nouvelle vérification avant refus, 13 octobre 2026

Le message « Deux parties sont différentes… » vient d’une garde qui empêche de
débiter un sablier tant que la sauvegarde locale et celle du cloud divergent.
Le parcours relisait désormais le cloud au démarrage, mais un conflit mémorisé
était ensuite traité comme définitif lors de la tentative suivante. Le sablier
demande maintenant une nouvelle comparaison automatique avant de rester bloqué.
Cette relecture ne force ni push, ni pull, ni fusion ; si la divergence persiste,
le choix dans Mon compte reste requis. Ça peut lever un ancien blocage si les
parties ont été resynchronisées entre-temps, mais ne résout pas un vrai conflit
multi-appareil.

Tests locaux : `src/lib/cloud/cloud-store.test.ts` **159/159** ; E2E cloud à RPC
simulés `e2e/hourglass-online.spec.ts` **2/2** (bureau/téléphone) ; ESLint ciblé
et `npm run typecheck` réussis. Publié sur `main` au SHA
`1ebc6415fe87625f767d1730f4b351ece60c7190` ; [CI `38482257038`](https://github.com/GoodFight37/CreatorDeck/actions/runs/38482257038)
verte, 6/6 jobs. [Vercel](https://vercel.com/hafsi37-2386/creator-deckk/JATRcGfhWmVykfnRUT2VYX9eiE6U)
success. Le contrôle Supabase [`38482501752`](https://github.com/GoodFight37/CreatorDeck/actions/runs/38482501752)
a confirmé que la base est déjà à jour ; aucun SQL de migration exécuté. Aucun
test ni débit de sablier sur le compte de Malik.

## Réparation des tests E2E après CI — publiée et vérifiée, 13 octobre 2026

Le run `38477480148` du SHA `00b22d4b` a révélé des attentes obsolètes dans les
tests, sans régression produit : le bouton d’avancement du reveal s’appelle
« Carte suivante » ; « Mon compte » se trouve dans le panneau en ligne replié ;
et le Binder démarre sur une collection alors que les portraits vérifiés sont
dans « Dernières reçues ». Le scénario cloud cadeau utilisait lui aussi
l’ancien libellé d’action. Les trois tests ont été alignés sur l’interface
existante, en gardant les assertions de comportement et de chargement d’image.

Vérification locale : `npm run lint` réussi ; E2E complets **89 réussis / 11
ignorés** (scénarios cloud non configurés dans la suite normale, zéro échec).
Le parcours cloud cadeau, lancé avec les valeurs factices prévues par le
workflow, passe **2/2** sur bureau et téléphone ; les appels RPC restent
interceptés. Aucun fichier produit, animation ou donnée n’a été modifié. Les
changements sont publiés (`754bde21`, puis passation `15b6ec45`) ; CI
[`38480069643`](https://github.com/GoodFight37/CreatorDeck/actions/runs/38480069643)
verte, 6/6 jobs.

## Sensation de jeu A → E — publiée, CI verte, 13 octobre 2026

Base contrôlée : `736c3f7d4e7ee0f44cc70c59ed05a0f24216e7d1`. Publié sur `main`
par le commit `00b22d4be01f9999c6e0bb155d893cf146fc1bcd`. `git ls-remote` a
confirmé le même SHA sur `origin/main`. Aucun SQL ni taux de tirage modifié.

- **Audio :** boucle prototype originale `public/music/hub-late-night.mp3`
  (24 s, MP3 mono 64 kbit/s, 188 Ko), lancée seulement au premier geste pour
  respecter l’autoplay. Gain faible au hub, ducking pack/reveal, silence au
  Tribunal ; son et crans globaux pilotent BGM/SFX/synthèse. Stingers Légendaire,
  Perfect et bilan Tribunal n’altèrent aucun timing. Reflets et Son actifs par
  défaut ; mouvement réduit continue à neutraliser les animations. Remplacement
  de l’asset : [audio-assets.md](audio-assets.md).
- **Booster :** sachet maintenu en CSS, aucune initialisation WebGL ; le vieux
  paramètre `?opening3d=1` est sans effet. Glow générique retiré. Peel libre,
  flaps et cinq dos conservés ; tests confirment le reveal et les gestes sans
  changement des timings. Portrait en erreur de chargement remplacé par un
  placeholder sombre cohérent ; aucun détecteur automatique de flou n’est
  prétendu.
- **Tribunal :** son de fin ajouté au paiement ; daily, karma, effets de verdict
  et bilan existants conservés.
- **Drop/Toi :** thème actif du Binder appliqué au Drop ; vitrine/streak remontés
  et statistiques/fonctions en ligne repliées.
- **Binder :** 12 cartes/page, son de page sur les flèches seulement, entrée de
  page supprimée sous `prefers-reduced-motion`, filtre Obtenues inchangé.

Vérifications locales : `npm test` 73 fichiers / 1 166 tests ; `npm run ecrans`
22 fichiers / 127 tests ; typecheck, ESLint et build de production réussis.
E2E ciblés : 43 réussis / 1 ignoré dans la suite pack/reveal et E2E sans WebGL
4/4 sur bureau et téléphone simulé. CI GitHub `38480069643`
(https://github.com/GoodFight37/CreatorDeck/actions/runs/38480069643) verte,
6/6 jobs ; aucun téléphone physique n’a été utilisé.
Build local sans variables Supabase :
le warning cloud est attendu ; les routes statiques compilent.

Limites et prochain contrôle : faire écouter la BGM sur téléphone et examiner
les portraits à l’œil. Le placeholder ne repère pas les images techniquement
nettes mais mauvaises/obscures.

## Mix BGM — réglage publié et CI verte, 13 octobre 2026

Après CI verte du checkpoint précédent (`15b6ec4529ef3718e370bc6d75a1daab45656abf`,
run `38480069643`), le gain hub a été remonté de `0,14` à `0,24` : l’asset a
un niveau moyen de `-22 dBFS`, donc l’ancien gain atténuait trop le fond. Le gain
pack reste `0,018` et le Tribunal reste à zéro. Le volume global/SFX, les timings
reveal et le comportement autoplay ne changent pas. Test de contrat ajouté.
Publié par `9c625747` (code), avec mise à jour documentaire `35ca7f7b` ; CI
[`38481257763`](https://github.com/GoodFight37/CreatorDeck/actions/runs/38481257763)
verte, 6/6 jobs. L’audition sur téléphone réel reste attendue avant de déclarer
l’asset fini.

## Portraits manuels — ZIP `portraits-01.zip` — 13 octobre 2026

Import du lot fourni par Malik : 154 WebP carrés 450 × 450, décodables, tous
correspondant à des slugs connus. Le manifeste inclus est un exemple fictif et
n’a pas été utilisé. Les 300 choix manuels précédents restent inchangés ; le
registre passe à 454 images. `9pasha` remplace une photo auparavant créditée ;
les crédits n’affichent plus sa source précédente comme celle de l’image active.
542 créateurs restent candidats selon le filtre du pilote. Fichiers et tests
détaillés dans [le rapport d’import](portrait-import-manuel-lot-2026-10-13.md).
Vérifications locales : portrait 33/33, `npm test` 73 fichiers / 1 164 tests,
`npm run ecrans` 21 fichiers / 124 tests, typecheck, ESLint ciblé et build
réussis. Le premier CI sur `a621417c` a échoué uniquement sur des attentes E2E
de crédits qui ne correspondaient plus aux portraits remplacés ; ces attentes
ont été corrigées dans `fd6d35270d196f1deba0d0a1a8f65f6b508242e2`. CI finale
[`38469322128`](https://github.com/GoodFight37/CreatorDeck/actions/runs/38469322128)
verte, 6/6 jobs, incluant unitaires/écrans/build, trois shards Playwright,
migrations Postgres jetable et chemin cloud à RPC simulés. Le HEAD distant
`main` a été vérifié identique à `fd6d3527`.

## Beat automatique sur la cinquième carte — 13 octobre 2026

Après le retrait du corner peek jugé peu naturel, la cinquième carte d’un
reveal séquentiel ordinaire reste face cachée 360 ms supplémentaires, puis
joue le retournement automatique habituel. Pas de languette, flèche ou geste
additionnel ; le Perfect n’est pas concerné. Reflets désactivés et mouvement
réduit suppriment l’attente. Arena a livré `1ae5f2c8244090597c0271849174476fc64521f8`
sur `arena/6c5a89f2-creatordeck`, basé sur `a8c8e800`. Diff limité à
`src/components/reveal-overlay.tsx`, `src/app/globals.css`,
`src/ecrans-effets.test.tsx` et `e2e/pack-tear.spec.ts`. CI
[`38464097660`](https://github.com/GoodFight37/CreatorDeck/actions/runs/38464097660)
verte, 6/6 jobs, incluant build et E2E bureau/téléphone simulé. Intégré à
`main` par fast-forward ; le ressenti en jeu reste à valider par Malik. Si la
pause déplaît, revert ciblé du commit `1ae5f2c8`.

## CI navigateur répartie en trois shards — 13 octobre 2026

Workflow `.github/workflows/verification.yml` : Playwright est réparti sur
trois lots équilibrés par nombre de tests (35/35/34 instances, aucun scénario
retiré). Publié sur `main` en `ebf57e8e809b00e83c1eeb7586d43ca76b4337af`.
CI [`38453353488`](https://github.com/GoodFight37/CreatorDeck/actions/runs/38453353488)
verte, 6/6 jobs, 3 min 04 s ; le run précédent à deux shards avait pris
3 min 21 s. Gain observé : 17 secondes sur ce run, à confirmer sur d’autres
exécutions car le temps varie. Les trois shards Playwright ont réussi ; leur
job le plus long a pris 180 s. Aucune suppression de tests. Le détail reste
dans K-049.

## Languette de reveal retirée — 13 octobre 2026

À la demande de Malik après essai, suppression complète du corner peek : la
languette paraissait artificielle et son apparition variable prêtait à
confusion. La cinquième carte garantie reprend le retournement automatique
ordinaire ; aucun geste additionnel n’est requis. Publié sur `main` par
`1f4deadb13d1e146f66d838d7248e5cb04ed2e84`. CI
[`38450915873`](https://github.com/GoodFight37/CreatorDeck/actions/runs/38450915873)
success, 5/5 jobs. Vérifications locales : `npm run ecrans` 123/123,
`npm run typecheck`, `npm run lint -- --no-warn-ignored`, `npm run build`,
`git diff --check` réussis ; E2E téléphone ciblé 1 réussi / 1 ignoré (variante
bureau hors du scénario). Aucun essai sur téléphone physique.

## Provenance Live distinguée du stream actif — 13 octobre 2026

Reprise du problème K-048 après la clôture du Corner Peek. La carte garde sa
variante persistée `live` pour son futur habillage, mais le libellé n’annonce
plus un direct en cours : carte complète « Obtenue en direct », format compact
« Acquis live », fiche détaillant la provenance. Le badge « En direct maintenant »
vient uniquement du `liveStream` frais ; le badge actif comme le lien dans la
fiche ouvrent `https://www.twitch.tv/<login>`. Avec un stream terminé/périmé, la
provenance reste mais ni statut courant ni lien actif ne sont affichés. Aucune
migration, aucune modification à l’économie.

Fichiers : `src/components/creator-card.tsx`,
`src/components/card-inspect-modal.tsx`, `src/app/globals.css`, nouveau
`src/ecrans-live-provenance.test.tsx`; docs : décisions D-073, K-048, roadmap.
Tests adaptés : test nouveau 2/2 ; `npm run ecrans` 21 fichiers / 124 tests ;
`npm run typecheck`, `npm run lint` et `npm run build` passent. La fiche ouvre
un URL HTTPS Twitch (qui laisse l’OS ouvrir l’app Twitch si ses liens universels
sont configurés), aucun schéma `twitch://` n’est forcé ni vérifié sur téléphone.
Reprise autorisée par Malik pour rendre aussi le badge compact « Direct » de la
carte cliquable : s’il a un snapshot frais, il ouvre la même URL HTTPS Twitch
dans un nouvel onglet avec `noopener noreferrer`. Les badges de provenance
restent non cliquables ; ni chaîne ancienne ni stream périmé ne sont proposés.
Le lancement de l’app Twitch dépend des liens universels configurés sur le
téléphone, et n’est pas garanti. Ce choix de lien public n’est pas un avis
juridique ni une confirmation officielle de Twitch. Test écran adapté 2/2 ;
voir D-074. Le correctif du badge compact est publié avec le commit
[`0e53fa6c`](https://github.com/GoodFight37/CreatorDeck/commit/0e53fa6cc383353eb63f5c16dcb676956d985f83).
HEAD distant `main` vérifié identique. CI
[`38411066062`](https://github.com/GoodFight37/CreatorDeck/actions/runs/38411066062)
**success, 5/5 jobs** (3 min 26 s) ; le workflow Supabase
[`38411556260`](https://github.com/GoodFight37/CreatorDeck/actions/runs/38411556260)
**success** (25 s) ; Vercel **success** :
[`EmvsSBTbyvsSjoY1RgyHbRcvZ13o`](https://vercel.com/hafsi37-2386/creator-deckk/EmvsSBTbyvsSjoY1RgyHbRcvZ13o).

## Audit de pistes portraits — branche séparée, 13 octobre 2026

La branche
[`fcc/revue-portraits-50`](https://github.com/GoodFight37/CreatorDeck/tree/fcc/revue-portraits-50)
est poussée jusqu’au commit
[`297f049b`](https://github.com/GoodFight37/CreatorDeck/commit/297f049b0a27f192b3a757ff0df3ba6578317d30),
qui descend de `main` `0e53fa6c`. Elle conserve l’audit de 50 pistes dans
`manifeste.csv`, son brief et un index de revue. Vérification du registre local :
**les 50 slugs de cet audit sont tous déjà dans les 300 choix manuels**. Ils sont
protégés et ne font pas partie du lot à refaire. Garder la branche comme archive
de recherche seulement ; ne pas remplacer ces choix. Les catégories de source du
manifeste ne sont jamais un filtre visuel.

## Reprise du lot portraits non manuels — 13 octobre 2026

Le filtre réel de `tools/portrait-pilot/pilot.mjs` protège les 300 manuels, les
30 portraits déjà validés, Diverron et trois avatars explicitement acceptés ;
**694 créateurs restent candidats** dans le catalogue de 1 000. Aucun des 300
choix manuels n’est modifié. Le pilote existant sur 20 de ces profils a été
rejoué depuis son cache : 1 925 résultats enregistrés, zéro nouvelle recherche
facturée, 33 images téléchargées/décodées. La sélection qualité-first expose
15 profils avec une image à comparer et 5 sans nouvelle image. Cela ne veut pas
dire que les 15 sont bonnes : la revue visuelle a repéré des graphiques, photos
de groupe, doublons ou cadrages faibles parmi les suggestions ; TheViper paraît
une amélioration nette, Mmorpg a du texte dans l’image, les autres doivent être
choisies à l’œil. Le brouillon local est
`/workspace/artifacts/portrait-review/CreatorDeck-revue-visuelle-20.zip` ; il
n’est pas versionné et n’a changé aucun asset du jeu.

Le pilote n’écarte plus une image parce que son titre ne cite pas le créateur,
qu’aucun visage n’a été détecté ou qu’aucune page source n’est fournie. Les
dimensions, visages détectés et netteté restent visibles comme indices ; Malik
choisit à l’œil et peut garder l’actuel. Tests outil : 7/7 Node/Playwright,
3/3 Python. Aucun remplacement n’a été intégré.

La recherche des 674 profils restants nécessite une clé SerpApi disponible dans
l’environnement qui lance l’outil. `SERPAPI_API_KEY` est absente de cette
session ; ne pas coller de secret dans le chat. La dernière observation de quota
est ancienne et ne garantit pas le solde actuel. Pour continuer, entrer la clé
renouvelée dans le terminal selon le README du pilote, puis lancer des lots de
20–50 vers un dossier de revue hors dépôt. Ne jamais utiliser d’upscaler qui
reconstruit les visages ; conserver l’avatar actuel lorsqu’aucune meilleure
photo n’est trouvée.

## Corner peek retiré — 13 octobre 2026

Après essai, Malik a trouvé la languette peu naturelle et a demandé son retrait.
Le composant, le geste tactile, l’affichage conditionnel et le CSS associé ont
été supprimés. La cinquième carte reprend le retournement automatique ordinaire ;
il n’y a plus de pause nécessitant un geste pour continuer. Une alternative est
à concevoir séparément avec Arena ; aucune nouvelle interaction n’est décidée.

Fichiers concernés : `src/components/reveal-overlay.tsx`,
`src/components/creator-deck-app.tsx`, `src/app/booster-continuity.css`,
`src/ecrans-effets.test.tsx`, `e2e/pack-tear.spec.ts`. Le build local sans
configuration Supabase n’atteste pas les fonctions cloud.

Les résultats et contrôles qui suivent sont historiques : ils validaient
l’ancienne languette et ne valident pas son retrait. À cette date, le navigateur
téléphone simulé exerçait le geste, sans remplacer un essai physique. Le premier
commit `64114bd7` avait une CI rouge uniquement sur les deux variantes du scénario
cadeau (les quatre autres jobs étaient verts). Correctif publié dans `95db6b6f`.
Nouvelle CI GitHub
[`38408591588`](https://github.com/GoodFight37/CreatorDeck/actions/runs/38408591588)
**success, 5/5 jobs** ; Vercel **success** sur le même SHA, déploiement
[`BFrPJ7iFMSin4mf11D47MUTG1KGJ`](https://vercel.com/hafsi37-2386/creator-deckk/BFrPJ7iFMSin4mf11D47MUTG1KGJ).
Le SHA distant `main` a été vérifié à `95db6b6f` avant ce checkpoint documentaire.

Suite : Arena peut étudier une nouvelle proposition de game feel pour le reveal
de la cinquième carte, sans réintroduire le corner peek. La feuille de route
produit reste consignée comme idées non commencées :
soundbites de streameurs et hype Perfect ; feuilletage, reflets et sleeves du
Binder ; deep-link Twitch et événements de drop ; Trade Radar, Last Pack et
export Story. Ces idées restent distinctes du reveal actuel ; aucune n’est incluse.

## Contrôle de stabilisation des quatre piliers — 13 octobre 2026

Audit local du SHA `c21684377dfcc4f54c5864fb3a37a21149d35b9d` (`main`, distant
vérifié égal), sans modification de code : `npm test` passe 73 fichiers / 1 164
tests ; `npm run ecrans` passe 20 fichiers / 119 tests ; `npm run e2e` passe
82 scénarios sur 92 en 3 min 54 s, avec 10 scénarios cloud ignorés faute de
configuration serveur. Les E2E bureau/téléphone vérifient notamment les quatre
onglets, les vues Drop/Binder/Craft/Toi, le contenu à 320 px, le CTA Drop avant
navigation, les recettes à portée, le recyclage vide, et l’absence d’erreur
console lors du tour des onglets. Aucun défaut reproductible trouvé dans ces
contrôles. Les avertissements WebGL du navigateur d’essai déclenchent le
fallback 2D prévu et les scénarios correspondants réussissent. Limite : les
captures DOM/E2E ne remplacent pas une appréciation visuelle sur téléphone réel.
État du checkout propre après les tests ; aucun code ou test affaibli.

## CI Playwright accélérée et provenance Live — 13 octobre 2026

Main publié : `ac6ff4b6dd9eadf858afdc8dac3007670deed2cd`, SHA distant vérifié.
Le run `38397134313` sur `5eba4275` a échoué après 10 min 12 s, dont 8 min 42 s
pour 92 cas Playwright séquentiels. Six lignes rouges représentaient trois
causes : l’aide `.pull-hint` avait disparu du Drop, le test Scène attendait
l’ancien texte, et le test Tribunal exigeait sa présence au premier écran
320×568 malgré la nouvelle priorité sachet/CTA.

Correction publiée : aide gestuelle restaurée ; texte Scène testé avec son
libellé actuel ; le test mobile contrôle sachet + CTA au premier écran, garde le
Tribunal visible à 412×915 et le vérifie après défilement à 320×568. Rien n’a
été retiré du produit. Les deux partitions locales complètes ont réussi :
41 passés / 5 cloud ignorés chacune, en 1 min 48 s et 2 min. Le workflow lance
maintenant bureau et téléphone dans deux jobs Playwright parallèles, 46 tests
chacun ; les noms d’artefacts sont distincts. Les poussées ne contenant que des
Markdown/docs ignorent la CI produit ; les pull requests restent vérifiées.
Run GitHub `38400588529` : **success, 5/5 jobs**. Durée totale 2 min 31 s, shard
1 en 2 min 12 s, shard 2 en 2 min 25 s, contre 10 min 12 s au run précédent
(environ 75 % de moins). Aucun test retiré. Le gain est mesuré sur ce run, pas
une promesse pour chaque charge GitHub. Vercel est aussi **success** sur ce SHA ;
check de déploiement : https://vercel.com/hafsi37-2386/creator-deckk/95H42uLRVMjkzJEoZqnykMEL3duk.
Le workflow Supabase `38400913537` est success ; aucun SQL n’a changé dans ce lot.

Retour Malik sur Étoile : conserver la trace d’une carte obtenue pendant un
direct, car elle pourra servir à un design/portrait alternatif. Lecture du code :
`variant === "live"` est cette variante persistée et produit le badge « Live » ;
`liveStream` séparé sert au direct réel et aux détails du stream actuel, avec
fraîcheur limitée. Le libellé du badge de variante peut donc prêter à confusion
après la fin du direct. Aucun code Binder modifié ; prochaine discussion produit
possible : distinguer « obtenue en direct » du statut « en direct maintenant »,
sans effacer la variante ni la provenance.

## CI ouverture : assertion de consigne corrigée — 13 octobre 2026

Autorisation explicite de Malik pour corriger mon travail antérieur malgré la
réservation des fichiers d’ouverture. Les runs 38390390205 et 38393724063 ont
échoué uniquement sur le scénario fallback 2D (bureau/téléphone) : assertion
restée sur l’ancienne consigne, alors que le peel affiche « GUIDE LA COUPE SUR
LA BANDE STRIÉE ». Assertion exacte actualisée dans e2e/pack-tear.spec.ts ;
aucune modification d’animation, aucun snapshot régénéré ni contrôle retiré.
Playwright ciblé 2/2 réussi sur fbac626d + correction, captures strictes incluses.
ESLint/diff-check réussis. Nouveau commit distant 010a929b sur profile-view
intégré par fast-forward sans écrasement ; seul le test et ces docs sont édités.
Publication normale avec ce checkpoint, nouvelle CI à relever après push.

## Lot Drop + Craft uniquement — 13 octobre 2026

Malik réserve Binder/profil/Toi à Gemini. UI limitée à drop-view, atelier-view
et nouvelle feuille drop-craft.css (scopée aux deux vues, pas de globals partagé).
Drop : sachet/CTA entièrement avant navigation à 360×740 et 320×568, garantie
après CTA en une ligne, textes/statut Scène neutres et objectifs compacts.
Craft : à portée par défaut, coûts les moins chers si rien n’est finançable,
exploration explicite, règles/raretés repliées, pager après liste, Recycler vide
avec retour Drop. Aucun fichier interdit, SQL, économie ou pity modifié.
26/26 DOM, 8/8 E2E ciblés, types/lint/build statique sans cloud réussis.
[Rapport autonome et fichiers](drop-craft-priorites-2026-10-13.md).
Base main `fda166f7`, distante vérifiée égale ; publication avec ce checkpoint,
CI à relever après push, ressenti sur téléphone physique encore à vérifier.
Respecter la répartition des fichiers avec Gemini lors de la reprise.

## Peel : ouverture au relâchement — 13 octobre 2026

Retour Malik après `180827ba` : ouverture avant lever le doigt et languette
saccadée. Le seuil arme seulement l’ouverture ; seul pointerUp du pointeur
capturé la déclenche. Annulation/perte de capture replient même après le seuil.
Coordonnées figées à pointerDown, angle fondé sur le déplacement total plutôt
que la tangente entre deux événements ; interpolation visuelle 50 ms, aucune
transition si effets désactivés/mouvement réduit. Une consigne invite à relâcher.
Référence Pocket originale absente de ce workspace ; analyse écrite conservée,
vidéo locale retrouvée = validation CreatorDeck, pas référence Pocket.
10/10 scénarios navigateur ciblés, types/lint/build statique sans cloud et
diff-check réussis ; publication avec ce checkpoint après vérification distante ;
ressenti physique encore à confirmer. Base main `180827ba`, distant identique.

## Peel guidé en deux axes — 13 octobre 2026

Demande unique de Malik : remplacer la jauge horizontale par une coupe guidée
sur la bande haute. Zone 2D, trace SVG échantillonnée X/Y, découpe des deux
pièces sur cette trace ; rabat piloté par déplacement/angle. Ouverture par
largeur fendue × soulèvement, pas distance X depuis l’origine ; petits gestes
interrompus, annulation et perte de capture replient sans ouvrir. Même portail,
GPU opt-in inchangé, aucun changement Drop/Binder/Craft/profil.
[Livrable, seuils et preuves](booster-peel-guide-2026-10-13.md). Base main
`c6e85a4c`, propre et égale au distant au départ. 11/11 DOM, 8/8 E2E ciblés
puis 4/4 après correction CSS, typecheck/lint/build statique sans cloud et
diff-check réussis. Publication normale main avec ce checkpoint ; CI à relever
après push. Validation du ressenti sur téléphone physique encore attendue.
Aucune réservation concurrente observée, réservation libérée après publication.

## Pilote automatique portraits livré — 13 octobre 2026

Après recherche, carte blanche de Malik pour un pilote de vingt créateurs.
Outil local `tools/portrait-pilot/`, SerpApi réellement appelé, MediaPipe CPU,
galerie autonome et ZIP de revue. Aucun asset/sélecteur/registre du jeu changé.
300 choix manuels et remplacements déjà validés protégés. 1 925 résultats,
100 candidates sélectionnées, 33 téléchargées/décodées, six propositions
techniques, quatorze avatars actuels conservés. Aucun portrait prêt à publier
par défaut : l’identité et les droits ne sont pas certifiés par le détecteur.
[Bilan et procédure de revue](portrait-pilot-2026-10-13.md).
7/7 Node, 3/3 Python, ESLint ciblé/diff-check, galerie réelle bureau/mobile
simulé et export/ZIP réussis. Base main `34fdf0b2`, HEAD distant vérifié avant
publication des outils. Pas de nouvelle suite du jeu relancée localement, code
jeu inchangé. Pilote publié : [`ed20ebd8`](https://github.com/GoodFight37/CreatorDeck/commit/ed20ebd842dcea65acdf5e9b7ebb48f89a5a5e55).
CI GitHub [38388400407](https://github.com/GoodFight37/CreatorDeck/actions/runs/38388400407)
success ; Vercel success. Aucun succès Android physique revendiqué.

Compte SerpApi Free Plan : trente recherches comptées, 220 restantes au relevé.
La clé reçue a servi uniquement à ce pilote, puis son fichier temporaire a été
supprimé ; aucun secret versionné, aucun achat. Remplacement de la clé conseillé
après envoi dans le chat. Prochaine action : Malik extrait le ZIP, ouvre index,
revoit les six propositions et renvoie son JSON de choix avant une extension.
Réservation libérée. Modèle : si changement conseillé, annoncer puis s’arrêter
jusqu’au « go » ; ne pas supposer le modèle sélectionné dans l’interface.

## Retour aux originaux de la vague Upscayl — 13 octobre 2026

Malik signale des visages artificiels sur plusieurs portraits passés par IA.
Comparaison de sept paires : effet visible notamment sur 2lew et asmongold247.
Le sélecteur affiche maintenant `/creators/<slug>.webp` pour les entrées Upscayl,
sauf si un choix manuel, Commons crédité ou photo fournie a priorité. Les 699
WebP Upscayl et leur registre restent présents, mais sont identifiés comme
archivés/non affichés dans les crédits.

Contrôles adaptés réussis : 51/51 unitaires portraits, 2/2 DOM crédits, 2/2 E2E
bureau/téléphone simulé ; E2E charge l’original 600 px de 2lew. TypeScript,
ESLint ciblé, catalogue, jargon et build statique sans cloud réussis.
Publication sur `main` en préparation après nouveau contrôle du HEAD distant.
[Rapport](portrait-upscale-review-2026-10-13.md). Branche `main`, base locale
et distante `d1f1ce6` égales au départ ; modification ciblée, non commitée tant
que le build n’est pas relevé. Publication normale sur main autorisée, aucune
suppression des images. Téléphone physique non testé. Aucune collecte relancée.

## Reprise intégrale du ZIP — 13 octobre 2026

Les deux lots locaux sont récupérés : 40 fichiers contrôlés par empreinte,
patch appliqué sans conflit sur main distant à la base `6f63374`. Git HTTPS
et API `gh` fonctionnent dans cette session ; l’ancien environnement n’est pas
réparé. Branche locale initiale `work` propre, puis `main` créée à la même base.

Portraits commités dans `cf25f665dd217ea8e6689502d08dca85d07f9c36` : 20 images,
sources/suivi/script conservés, priorité manuelle inchangée (18 en réserve,
Livibee/9pasha actifs). Booster restauré sans nouvelle refonte, GPU toujours off.
51/51 unitaires portraits, 32/32 DOM, 44/44 navigateur dont 42 ouverture et
2 portraits, captures strictes, types/lint ciblé/catalogue/vocabulaire/build verts.
Build et parcours locaux sans cloud ; téléphone physique non testé.
[Rapport autonome de reprise](reprise-zip-2026-10-13.md),
[passation portraits](passation-portraits.md). Code audité **publié et vérifié sur GitHub** :
`93626653d8f3cc34412b4a752b9f0a5455918d2a` (booster), avec le commit portraits ci-dessus.
Push normal et SHA distant confirmés ; aucun reset ni force-push.
Au 13 octobre 2026 à 09:54:12 UTC : [CI 38379579144](https://github.com/GoodFight37/CreatorDeck/actions/runs/38379579144)
in_progress (4 jobs), Vercel pending. Le checkpoint documentaire déclenche
une nouvelle CI ; aucun succès distant de la reprise annoncé avant conclusion.
Les sections d’export et checkpoints antérieurs ci-dessous sont historiques.
Aucune nouvelle collecte, aucun agent délégué, réservation libérée.

## Vague visuelle ouverture — 13 octobre 2026, checkpoint local

Demande unique : progrès visible en dix secondes, fermé + peel avant tout,
menus exclus, GPU off. [Rapport autonome](booster-visible-2026-10-13.md), D-064.
Base locale 6f63374 ; artworks Live/Scène contrastés, rabat sous le doigt,
repli au relâchement, départ de fin depuis la position atteinte, coque visible
à la première face et indication swipe après flip. Taille ergonomique initiale
conservée, aucun menu/règle/SQL/dépendance modifié. Preuves avant/après et vidéo
9 s dans /workspace/artifacts/booster-visible-2026-10-13.

30/30 DOM ; 40 succès dans le passage complet des 42 E2E, puis 2/2 retests de
swipe après correction du séparateur de texte ; 6/6 répétitions mouvement réduit.
Typecheck/lint ciblé/build/diff-check réussis. Captures strictes actualisées puis
contrôlées. Cette vague n'est ni commitée ni poussée : API GitHub 401 et Git
HTTPS sans identité, runtime sans liaison d'identité déclarée. Malik indique
n'avoir rien désactivé ; aucune faute utilisateur supposée. Un incident transport
exec passager s'est résolu sans perte de fichiers. Le HEAD distant doit être
vérifié avant intégration/publication. Les anciennes preuves CI/Vercel vertes
concernent 6f63374, pas cette nouvelle vague. Préserver les portraits locaux.
Prochaine action : rétablir l'accès, fetch/inspecter main, intégrer uniquement
les fichiers listés dans le rapport sans écraser les menus, puis publier et
vérifier sa CI. Pas d'agent délégué ni de réservation concurrente connue.

## Clôture autonome validée — 13 octobre 2026

Produit publié : 6f63374bc38f2746fb5e4c73db5dea50243d5274. CI finale
38321561095 terminée **success, 4/4 jobs**, confirmé par la dernière page du
journal de suivi conservé dans /workspace/artifacts/validation-finale-2026-10-13.
Unitaires/DOM/statique/build, SQL jetable, navigateur et cloud simulé verts.
42/42 tests d'ouverture locaux, captures strictes comprises. Vercel success
sur ce même commit, relevé avant interruption des accès ; bilan.md contient
les liens et limites. Aucun correctif supplémentaire ni test à relancer.
Les mentions de CI encore attendue ci-dessous sont historiques.

Après reprise, API GitHub HTTP 401 et Git HTTPS sans authentification ; runtime
sans secrets/identités configurés. Ce checkpoint final est **local, non publié**,
les correctifs produit ont été publiés auparavant et leur CI a terminé verte.
Aucun agent/veille active. Portraits préexistants et leurs 26 lignes conservés.
Reste l'appréciation du rendu sur téléphone réel, sans promesse d'équivalence
Pocket ; 3D off par défaut. Ne reprendre le code que sur demande ou nouvel échec.

## Reprise autonome : finaliser la CI — 13 octobre 2026

Malik demande désormais de finir et vérifier de bout en bout. Sur base main
5e9f67f, les contrôles distants unitaires/DOM/statique/build/SQL/cloud simulé
passent ; Vercel success. L'ancienne CI complète 38320145804 révélait encore
un test de peel obsolète sur bureau/téléphone : attente d'un sheen supprimé.
Il vérifie maintenant l'absence du sheen et du GPU par défaut, en gardant tous
les contrôles du geste et du continuum. Suite ouverture complète 42/42 locale,
lint ciblé et diff-check réussis. [Rapport actualisé](correctifs-interface-2026-10-13.md).
Aucune autre modification produit. Nouvelle CI à suivre jusqu'à son résultat
pour clôturer cette mission ; pas d'audit hors sujet. Les 26 lignes/portraits
préexistants restent hors commit. Aucune réservation concurrente détectée.

## Checkpoint corrections CI interface — 13 octobre 2026

Malik délègue à Codex tous les échecs après les changements Gemini. Sur base
main 6a206b0, cinq échecs DOM corrigés sans revenir sur le layout compact :
accès Thème du classeur, découverte du catalogue depuis Binder vide, indication
Live, marquage Tribunal unique. Titres intentionnels Atelier/Cinq créateurs
conservés et assertions exactes adaptées, aucun contrôle affaibli.
[Rapport](correctifs-interface-2026-10-13.md). 116/116 DOM, typecheck/lint/build
réussis ; 24 succès navigateur + 2/2 retests de titre Drop. Deux cas cloud
conditionnels non exécutés localement. CI précédente 38320145804 : 1144 unités,
SQL/cloud simulé verts, cinq DOM rouges avant correction, navigateur encore en
cours au relevé ; aucune affirmation sur la nouvelle CI/Vercel.
Publication main ciblée autorisée, portraits préexistants/26 lignes locales
préservés hors commit, aucune réservation active. Prochaine action : laisser
la CI nouvelle tourner, analyser seulement un échec signalé, essai Vercel après
déploiement. Aucun changement supplémentaire du booster ou SQL.

## Compilation débloquée — 13 octobre 2026

Malik autorise désormais la réparation du fichier Drop laissé à Gemini, dont
le contexte est épuisé. Une seule accolade superflue supprimée dans le ternaire
de drop-view.tsx:263 ; aucun changement de layout ou règle. Base main b7970dc,
HEAD distant vérifié identique avant publication. Typecheck, lint ciblé Drop,
build statique et diff-check réussis. Le correctif 2D/continuum précédent est
inclus et peut maintenant compiler. CI/Vercel non surveillés, mode économie.
[Rapport actualisé](booster-clean-2026-10-13.md). Les paragraphes de blocage
ci-dessous sont historiques. Travail portraits local préservé hors commit.
Aucune réservation active ; prochaine action utilisateur : tester après
le déploiement Vercel. Le commit du checkpoint se retrouve dans le journal.

## Checkpoint ouverture propre, GPU off par défaut — 13 octobre 2026

Retour téléphone/Vercel de Malik : sachet trop brillant, GPU intermittent,
attente parfois bloquée. [Diagnostic et livrable](booster-clean-2026-10-13.md),
D-063. 3D désactivée par défaut, aperçu explicite opening3d=1 ; paramètres
GPU fortement réduits. Impression dédiée plus mate pour Live/Scène, aucun
sheen CSS ajouté. Art d'accueil et fichiers Drop/Binder/Tribunal non édités.

Continuum et swipe conservés. Secours armé avant son/vibration, animationcancel
et absence d'effets terminent aussi. Reprise manuelle Afficher les cartes.
Retour volontaire au jeu pendant attente réseau, sans rejouer le tirage ;
réponse tardive conservée dans le Binder sans overlay tardif. Aucun SQL ou
changement d'économie/dépendances. 30/30 DOM et 16/16 E2E ciblés bureau/mobile
simulé réussis sur base b073dcb + correctif, avant les deux derniers commits
Gemini. Peel et lien sans déchirure testés avec le timer de secours figé.
Captures adaptées à l'impression changée, puis passage strict réussi.

Main synchronisé par fast-forward jusqu'à 7dcc672 (six commits Gemini sur
Drop/Binder conservés). Ce dernier état contient une faute de JSX introduite
par 692f0a9 dans drop-view.tsx:263–265 : TS1005/TS1381. Typecheck et build
échouent à cette faute ; lint ciblé du lot passe. Malik est invité à transmettre
la correction à Gemini ; interdiction explicite de toucher ce fichier respectée.
Une publication du correctif seul est autorisée, mais ne prouve PAS déploiement
Vercel réussi tant que ce JSX n'est pas réparé. Aucun suivi CI en boucle.

Travail portraits et ses 26 lignes de passation locales préexistantes préservés,
non stagés. Pas d'agent lancé, aucune réservation active. Prochaine action :
Gemini corrige son JSX puis Malik teste le paquet tutoriel sur Vercel après
compilation/déploiement. Le commit du checkpoint se retrouve via git log -1
-- docs/agent-handoff.md.

## Checkpoint sachet 3D limité — 13 octobre 2026

Nouvelle demande de Malik : Three.js autorisé pour l'ouverture uniquement ;
restriction 3D de D-061 remplacée par D-062. Base vérifiée `1069ba5`, main.
Le continuum reste monté à la première face. Sachet courbé et rabat piloté
par le glissé, matériau physique et reflet collé à la géométrie. Dos/faces HTML
conservés : résultat hybride, pas simulation de plastique équivalente à Pocket.
Import GPU différé ; 2D pour mouvement réduit/effets coupés et perte WebGL.
[Livrable, fichiers et limites](booster-3d-2026-10-13.md).

Vérifications de ce lot : 27/27 DOM existants, 10/10 E2E ciblés bureau/mobile
(simulé), typecheck, ESLint ciblé, build statique et diff-check réussis.
La capture bureau d'extraction précédente montrait parfois une face ; horloge
et animations figées avant reveal, assertion extracting renforcée, référence
corrigée sans modifier la tolérance. Nouveau passage strict des captures réussi.
Three.js est l'unique nouvelle dépendance 3D de production ; @types/three en dev.
Aucun SQL ni changement Drop/Binder/Craft/économie. Travail portraits préexistant
préservé et non publié. Publication directe main autorisée ; CI/Vercel de ce
nouveau lot laissés sans surveillance, selon le mode économie demandé.
Prochaine action utilisateur : essai 30 secondes du peel/repli/sortie/swipe sur
site après déploiement, puis vidéo si le geste/raccord ne convient pas. Aucun
agent actif/réservation à conserver. Le commit contenant ce checkpoint est
retrouvable via git log -1 -- docs/agent-handoff.md.

## Checkpoint ouverture continue — 12 octobre 2026

Demande exclusive de Malik : continuum avant polish, matière et geste, sans
nouvelle dépendance 3D, refonte du jeu ni SQL. Les quatre points sont implémentés :
PackTear reste monté et contient la révélation ; coque en fondu, reflet masqué
sur ses morceaux, swipe planaire après flip, repli du peel incomplet.
[Rapport détaillé et preuves](booster-continuum-2026-10-12.md), D-061/K-047.
Unitaires complets 1 164/1 164 localement, écrans complets 112/112 puis fichier
final effets 19/19, E2E ouverture 30/30, lint/typecheck/build réussis. Les
compteurs CI seront propres au commit publié ; les 20 portraits locaux restent
hors commit. Captures et vidéo hors Git dans /workspace/artifacts/booster-continuum.
Le téléphone physique et le jugement esthétique restent non validés.
Les fichiers de sélection portraits préexistants sont préservés sans publication.

## Checkpoint courant — 12 octobre 2026, bilan pour revue Grok

Le code produit vérifié est `10699eb` sur main : CI complète et déploiement
Vercel Production success. Usage actuel de Malik : Vercel, aucun git pull requis
sur son PC pour recevoir la mise à jour du site. [Bilan actuel et preuves](etat-projet-2026-10-12.md),
[plan actif](roadmap.md#plan-actif), [brief Grok](revue-grok-2026-10-12.md).
Les entrées précédentes ci-dessous sont historiques. Les avatars génériques
sans photo de profil sont acceptés par Malik (SolaryHS/j0niq/toaststix) : aucun
remplacement requis. Retour Paquet Scène confirmé bon par Malik le 12 octobre.
Revue externe visuelle des boosters et extension du catalogue restent à cadrer. Les 20 anciens portraits Commons et
leurs modifications locales sont préservés, non publiés, sans bloquer le lot.
Actualisation documentaire seulement, aucun changement de gameplay/SQL.

## Reprise économique du chantier portraits — 12 octobre 2026

Lire **[la passation courte](passation-portraits.md)** pour ce seul chantier,
selon l'exception de lecture ajoutée à AGENTS.md à la demande de Malik.
Ne pas relire les archives ci-dessous ni refaire les briefs déjà réalisés.
Code portraits `433ee065f98c8ff2956d90c480acfb59f0890b86` publié sur main,
[CI 38186329103](https://github.com/GoodFight37/CreatorDeck/actions/runs/38186329103)
**success : 4/4 jobs**, et
[workflow automatique 38186571263](https://github.com/GoodFight37/CreatorDeck/actions/runs/38186571263)
success, résultats lus par API. Portraits/attributions/remplacements individuels
implémentés ; recherche générale encore ouverte. Google/Phosphore toujours
bloqués dans l'ancienne session après le changement d'environnement : nouveaux
tests directs CONNECT 403 ; aucun besoin de refaire les réglages. Utiliser le
nouveau chat avec les accès activés, recherche seule sans réapprendre le dépôt.
Le checkpoint de cette passation est le commit qui contient ce paragraphe.
Sa CI documentaire sera distincte de la CI produit verte référencée ci-dessus.

## Portraits sélectionnés et crédits — 12 octobre 2026

- Accord : intégrer Rubius/Shroud, crédits discrets dans les réglages ; recherche
  du reste ouverte, aucune promesse de 50 remplacements. Base locale `work`
  et main identiques `ab4c5f8`, départ propre, aucune PR ouverte. API : CI
  précédente `38181695989` et contrôle Supabase `38181947616` success.
- Deux ZIP fournis : 10 originaux décodables, manifeste/index identiques aux
  fichiers joints séparément. Quatre licences documentées, six droits à vérifier,
  39 sans candidate, une organisation. AdinRoss non retenu pour qualité ; Rivers
  reste à comparer ; fichiers Flickr tous droits réservés non intégrés.
- Rubius/Shroud recadrés au nord en carré WebP 900 px qualité 90 sans
  agrandissement (210 762 octets). Captures de cartes bureau/téléphone simulé
  inspectées. Registre `src/data/portrait-overrides.json`, sources/auteurs/licences
  et modifications selon le manifeste fourni, pas revérifiés à distance.
  CC BY 2.0 / CC BY-SA 4.0 ; adaptation Shroud sous même licence.
- `creator-portraits.ts` résout carte/affiche/préchargement ensemble. Avatars
  Twitch conservés, `public/creators/curated` ignoré par régénération/élagage.
  Mode d'emploi dans `docs/catalogue-twitch.md`. Un remplacement reste une
  modification embarquée à publier, pas un changement instantané sur téléphone.
- « Crédits des images » replié dans Toi → Réglages. Aucun crédit sur les
  cartes ; description accessible « Portrait de », sans prétendre « officiel ».
- Tests ciblés : creator-portraits/preload/credits **13/13** unitaires ;
  ecrans-credits/ecrans-scene-profile **11/11** DOM ; portrait-credits.spec.ts
  **2/2** E2E bureau/téléphone simulé. Premier E2E bloqué avant scénario par
  cache home absent ; relance réussie avec
  `PLAYWRIGHT_BROWSERS_PATH=/workspace/.cache/ms-playwright` (cache déjà présent).
  Typecheck, ESLint ciblé, jargon, catalog:ci et diff-check verts ; build statique
  local réussi sans cloud. Téléphone physique non testé.
- Publication normale main autorisée ; SHA du lot via
  `git log -1 --format=%H -- src/data/portrait-overrides.json`.
  CI de ce lot désormais success (4/4 jobs), voir le checkpoint en tête.
  Réservation libérée à publication.
- Suite : l’ancien réseau reste actif ici ; ne pas refaire la configuration.
  Nouveau chat = recherche/téléchargement seulement, sans relire le dépôt.
  Essayer un vrai navigateur pour Google Images si disponible : le HTML non
  exploitable du rapport ne prouve pas un échec au navigateur. Aucun catalogue
  universel alternatif établi ; sélection ciblée, images de créateurs/kits presse
  et provenance conservée. Les petits gardent leurs avatars actuels.

## Portraits du Top 50 — recherche de sources alternatives (12 octobre 2026)

- Malik souhaite remplacer en priorité les portraits des grands créateurs ; les
  petits restent provisoirement avec les images actuelles. Il veut des images
  individuelles plus intéressantes que les avatars Twitch, et pouvoir ajuster
  une image par créateur ensuite.
- Scan local de `public/creators/` : 1 000 fichiers, tous décodables et sortis
  en 600×600. Le score Laplacien classe des candidats peu détaillés mais ne
  prouve pas la pixellisation : le contenu (logos, dessins, memes, photos de
  groupe, portraits) change fortement le score. Une planche du Top 50 a été
  inspectée ; le besoin inclut la cohérence/choix des images, pas seulement le
  flou.
- Recommandation convenue : rechercher des portraits individuels issus de pages
  officielles/sites de presse pour les 50 premiers du classement, garder les
  petites chaînes inchangées, valider visuellement avant élargissement. Garder
  chaque source et laisser un remplacement manuel par créateur.
- Blocage observé : l’API Openverse répond au proxy par HTTP CONNECT 403 ; aucun
  outil de recherche web n’est disponible dans cette session et seuls les hôtes
  autorisés par l’environnement sont accessibles. La mise à jour de la liste
  ciblée a été refusée avec `draft_not_editable`; relecture confirme que les six
  domaines initiaux sont inchangés. Proposition préservée dans
  `/tmp/creator-image-network-access-proposal.json` pour l’onboarding. Aucune
  image téléchargée ou remplacée. L’accès du domaine source exact devra être
  permis avant extraction.
- Suite : ouvrir une nouvelle session d’onboarding depuis les réglages pour
  appliquer la liste ciblée, ou recevoir les fichiers/URLs
  sélectionnés ; rechercher les 50 images, noter provenance/licence, produire
  une planche de validation, puis ajouter des overrides manuels sans écraser
  les fichiers Twitch par défaut. Aucun changement applicatif ni test produit
  dans cette passe.

## Reflet du sachet, continuité et pity — 11 octobre 2026

- Demande basée sur la vidéo jointe : rendre le reflet foil collé au contour du
  sachet, arrêter le balayage perpétuel, faire émerger les dos depuis l’enveloppe,
  corriger le compteur pity après tirage serveur et vérifier les sabliers. Pas de
  WebGL/Three.js, SQL, changement de règles ni refonte Drop.
- Départ vérifié : branche locale `work`, HEAD distant `main` `ce729b1`. Le remote
  contenait un commit CSS provisoire et son revert (`00ef8c2`, `ce729b1`) ; leur
  diff net est vide par rapport au checkpoint documentaire `f66c36a`. Avance
  intégrée par fast-forward, sans reset ni réécriture.
- Modifications locales : CSS du reflet limité au même polygone que le chemin de
  `live-foil.svg`; passage discret unique de 1,25–1,35 s, coupé en mouvement
  réduit, Reflets off, geste, ouverture, reveal ou Perfect. Chamber relevée au
  dessus du corps et maintenue sous le rabat pour que la pile commence à sortir
  avant que l’enveloppe se retire. Consigne clarifiée sur la soudure. À
  `openPack`, adoption du compteur pity serveur en même temps que la sauvegarde.
- Pity reproduite : état local compteur 5 (7 à venir), réponse serveur après
  tirage sans Légendaire = 6, sauvegarde RPC encore à 0. Avant le correctif,
  adoption de cette sauvegarde écrasait le compteur visible à 0 (12 à venir).
  Nouveau test vérifie aussi la vue UI restante = 6. Sablier J2 vérifié dans les
  tests existants : max local/serveur = 3 et `GameView.player.hourglasses` suit.
- Vidéo vérifiée : attente immobile sur la soudure et carte #341 SolaryHS avec
  silhouette violette vide. `creatorImage` construit bien
  `/creators/solaryhs.webp`; le WebP décode mais contient le modèle-avatar
  générique. Comparaison d’images sur les 1 000 WebP : aucun décodage raté ; seuls
  `j0niq`, `solaryhs`, `toaststix`, `xari` correspondent au même modèle vide.
  Impossible de fournir un vrai visage à partir de l’image disponible : garder
  l’asset ouvert au lieu de substituer le logo d’un autre créateur. Il faudra une
  source officielle pour fermer ce point.
- Tests locaux : cloud store **158/158** ; E2E pack tear complet **30/30** avant
  l’assertion finale de consigne, puis cas principal **2/2** après cette assertion
  (bureau/téléphone simulé) ; typecheck, ESLint ciblé et diff-check code 0.
  Capture visuelle intermédiaire contrôlée à 700 ms : rabat au-dessus des cartes,
  cartes au-dessus du corps de l’enveloppe, enveloppe toujours visible.
- Téléchargement GoFile bloqué par la politique réseau observée (domaine absent,
  état réseau `unknown`) ; la vidéo jointe a permis l’analyse. Aucun contournement.
  Aucune donnée, clé, migration ou règle de jeu modifiée.
- Publié normalement sur `main` : `1439e44de55272a7accbceef9b66758e0ed60cbb`.
  CI [`38178996093`](https://github.com/GoodFight37/CreatorDeck/actions/runs/38178996093)
  verte, **4/4 jobs** : unitaires/écrans/build, E2E bureau/téléphone, migrations
  PostgreSQL jetable et cloud simulé. Aucune migration de production lancée.
  Le portrait SolaryHS et les trois autres avatars génériques restent ouverts,
  uniquement faute de sources d’image réelles.

## Ergonomie courte et swipe de révélation — 11 octobre 2026

Lot précédent : code `674fc1d`, CI [`38176673799`](https://github.com/GoodFight37/CreatorDeck/actions/runs/38176673799) verte (4/4 jobs). Le checkpoint documentaire est `f66c36a`. Drop/Binder compactés, swipe post-flip et notice de sablier ; l’heure, le Perfect et les règles de déchirure n’ont pas changé. Tests ciblés : écrans 28/28, E2E mouvement réduit/continuité 4/4, annulation mi-course 2/2, swipe 2/2 ; typecheck/lint/build statique verts. Validation physique téléphone non faite.

## Reprise cloud automatique — 11 octobre 2026

- Demande : un compte déjà connecté doit retrouver sa partie automatiquement,
  sans détour par Compte avant le sablier. Base locale/distance contrôlée propre
  `86baacc7c390a53126f6be91f2e862d2213b79a4`, branche `work`, publication normale
  directe vers `main` autorisée. Aucun autre écrivain détecté.
- Cause du message exact retrouvée dans `_guard_hourglass_spends` de 0047 :
  ancien compteur de dépenses renvoyé par la copie locale. La session était
  restaurée sans lire la sauvegarde ; les lectures de réserve/solde pouvaient
  rendre cette copie artificiellement récente.
- Implémentation : sync automatique avant compteurs ; référence de version et
  empreinte par compte ; reprise des changements cloud seuls / envoi des
  changements locaux seuls sans forçage. Compteur de dépenses périmé repris
  depuis le serveur. Conflits et actions pendant lecture protégés ; sablier
  attend une sync en cours et conserve sa clé de rejeu. Choix Compte retiré
  après résolution, envois automatiques bloqués tant qu’il reste à résoudre.
- Tests locaux : magasin+sync **167/167**, Compte/Drop/profil **28/28**, E2E
  cloud à RPC simulées **10/10** bureau/téléphone simulé. Le test pack-crash
  conserve zéro renvoi immédiat après tirage et vérifie maintenant l’envoi
  normal des missions locales au rechargement, avec les mêmes IDs serveur et
  sans forçage. TypeScript, ESLint ciblé, diff-check et build production : code 0
  (build local sans configuration cloud réelle). La limite téléphone physique
  reste distincte des tests Playwright.
- Publication vérifiée : commit `878f7e9e3d9bc792ad3f4c893728e03ca3b36d17`
  publié normalement sur `main`, SHA distant concordant. CI GitHub
  [`38175177087`](https://github.com/GoodFight37/CreatorDeck/actions/runs/38175177087)
  terminée avec succès. Les détails locaux précèdent ce constat historique.

## Archive — tri documentaire avant les retours après publication, 11 octobre 2026

`main` et `origin/main` étaient au même SHA
`980bdf8bc9f12f995702abbdd2270f429927d7aa` au début du tri. CI
`38164889818` terminée avec succès : Playwright, qualité/build, SQL jetable et
cloud simulé (4/4 jobs). Statut Vercel du commit : succès, déploiement terminé.
PR #7 fusionnée ; PR #8 et #3 fermées ; aucune PR ouverte.

La roadmap distingue maintenant les chantiers livrés, les validations humaines
et l’historique ancien. Aucun nouveau chantier de code issu des suggestions
archivées n’est planifié. Le parcours sablier 4/4 → 5/4 → ouverture → 4/4 est
confirmé par Malik. Ses retours encore à rapprocher sont groupés A–F dans la
roadmap : ouverture visuelle, scroll, Paquet Scène, objectif Live, cadeau/tutoriel
et confirmation de la version visible. Malik a répondu qu’il transmettra les
lettres et statuts ; aucun résultat A–F n’est encore consigné. Ils sont des
vérifications, pas des bugs actifs.

Documents actualisés : la roadmap porte la liste A–F, le registre mappe K-003,
K-005, K-006, K-012, K-020/21/27/28/36/37/38 sur cette liste ; l’ancien tableau
de décisions de l’atelier, la revue externe et les pistes « Ta chaîne » sont
marqués historiques ; le périmètre indique le vrai statut des PR et migrations.
Les décisions D-022/023/024/032/034/035/048 reflètent leur issue réelle.
À cette date, la réponse A–F de Malik était attendue. `git diff --check` réussi. CI
`38165486381` est verte sur `b3828d5` (quatre jobs). Le SHA du commit de ce checkpoint se consulte dans
`git log -1 --format=%H -- docs/agent-handoff.md` après publication.

## UX-03 — activité sociale visible depuis le Drop — 11 octobre 2026

Base propre vérifiée `e3de716b563c99fc0753dc1e7c5749b297d559f8`, `work` égale
à `origin/main`. Le nombre d’amis ayant ouvert récemment était déjà calculé,
mais le CTA vers le Carnet se trouvait dans le repli « Progression, taux et
activités ». Déplacement seul : ligne conditionnelle sous le Paquet Scène,
visible hors repli, même action vers le Carnet. Rien n’apparaît à zéro. La
vitrine du profil reste visible en haut de Toi ; aucun badge ou mécanisme serveur
n’est ajouté.

Vérifications déjà exécutées après la modification :
`npm run ecrans -- src/ecrans-scene-profile.test.tsx` **7/7** ; `npm run
typecheck` et ESLint ciblé code 0. `git -c core.whitespace=cr-at-eol diff --check`
code 0. CI GitHub `38164889818` terminée avec succès (4 jobs) sur `980bdf8`.
Aucun SQL, donnée ou
récompense modifié. Le test physique du sablier confirmé par Malik est noté dans
le checkpoint K-031 ci-dessous.

## K-031 — ancre de recharge corrigée et téléphone vérifié — 11 octobre 2026

Base vérifiée `ebed1aea3136b3fdca7ec088f3835ed83398ec8a`, branche `work` égale
à `origin/main`, checkout propre au départ. K-031 est maintenant traité dans
0049 additive, sans réécrire 0048 ni modifier le baseline. La 0048 calculait
`anchor + N milliseconds` après avoir accordé N boosters ; 0049 avance de
`N × p_interval_ms`, garde la fraction d’intervalle restante et préserve
plafond, comportement à stock plein et droits privés.

Tests locaux : `npm test -- src/lib/game-engine.test.ts` **103/103** ;
`npm run supabase:verify` terminé avec toutes assertions vertes, migrations
0001–0049 dans Postgres jetable (pas production) ; `npm run typecheck`, ESLint
ciblé, `node scripts/supabase-deploy.mjs --check` et `git diff --check` code 0.
Le test SQL couvre 35 min (1 booster, ancre à 30 min), 60 min (plafond à 4,
ancre à maintenant), et appels répétés sans gain supplémentaire. Le test moteur
vérifie également les 5 min restantes puis le prochain intervalle.

Fichiers : migration `supabase/migrations/0049_pack_refresh_ancre.sql`, vérifieur
SQL et scénario sabliers, test `refreshBalances`, roadmap, problèmes connus,
décision D-048, journal, cloud-supabase. Migration `automatic` ; aucun lancement
manuel. Commit publié normalement :
[`76e8a62`](https://github.com/GoodFight37/CreatorDeck/commit/76e8a623282dc4faeca9482d687be7682b3de9bb),
`main` vérifié au même SHA. CI
[38163674938](https://github.com/GoodFight37/CreatorDeck/actions/runs/38163674938)
success, quatre jobs verts (Postgres jetable, unitaires/écrans/statique/build,
cloud simulé et Playwright bureau/téléphone). Workflow Supabase
[38163920425](https://github.com/GoodFight37/CreatorDeck/actions/runs/38163920425)
success. Log lu : projet CreatorDeck, TLS et historique vérifiés ; seule
0049 appliquée ; « Historique et objets attendus vérifiés après application. »
Aucun reset, repair, déploiement manuel ni changement réseau. Malik confirme
que le parcours sur téléphone est testé et que tout est bon. Réservation libérée
après vérification des liens, logs et SHA distant.

## Ouverture visuelle du sachet — cartes dégagées, 11 octobre 2026

Base vérifiée `e3a6cb9a5a282f1249456f60f971bba45fd71fae`, branche `work` =
`origin/main`, checkout propre avant cette tâche. Le défaut visuel vient de la
coexistence des animations : enveloppe/couvercle conservaient 1250/1550 ms,
flancs toujours visibles, alors que les dos finissent leur montée en moins d’une
seconde. Reflets désactivés et mouvement réduit laissaient aussi une enveloppe
fantôme. Correctif : capuchon 980 ms, corps 1150 ms, profondeur et ombre
1080 ms, puis disparition complète du sachet ; modes sans effets coupent ces
animations et cachent l’emballage en gardant les cinq dos. Temporisation fixe de
1900 ms avant Reveal inchangée, aucune modification Reveal/Perfect/silence/tear,
JS, tirage ou SQL.

Vérification finale locale : `PLAYWRIGHT_BROWSERS_PATH=/tmp/creator-deck-playwright
npx playwright test e2e/pack-tear.spec.ts --grep 'reduced motion and the
card-reflection switch|finger cuts the plastic where it passes'` : **4/4**,
bureau et téléphone simulé. `npx eslint e2e/pack-tear.spec.ts` et
`git -c core.whitespace=cr-at-eol diff --check` code 0. Chromium installé sous
`/tmp`, aucun changement de dépendance. Téléphone physique non testé. Le run
[38159920539](https://github.com/GoodFight37/CreatorDeck/actions/runs/38159920539)
a réellement eu 8 réussites et 2 échecs dans le scénario invité cloud : le test
ne trouvait pas le bouton de connexion à `product-audit.spec.ts:50`, pas une
ambiguïté strict-mode. L’assertion a été resserrée au panneau Live dans
`9ea2384`, présent sur main ; aucun run de suivi n’a été vérifié ici.
Configuration réseau laissée intacte ; état d’application du preset
`package_managers` rapporté `unknown`, mais `git ls-remote`, `gh run view` et le
téléchargement du log ont chacun effectivement fonctionné. Code et documents
publiés sur main ; Malik suit les contrôles GitHub et signalera un échec. Le
SHA du checkpoint documentaire se retrouve avec
`git log -1 --format=%H -- docs/agent-handoff.md`. Réservation libérée après
publication.

## Missions quotidiennes : quatre, et le Tribunal expliqué — 11 octobre 2026

Depuis `a8f14d60e1814bc030aa3a7ec553e55b90979865`, correction limitée à
Progression : le bilan terminé ne prétend plus qu’il n’y a que trois missions ;
la mission Tribunal indique cinq dossiers distincts et reçoit une icône claire.
Le type GameView ne fige plus le nombre de missions dans son commentaire. Aucune
règle, cible, récompense ou SQL modifiée. `npm run ecrans --
src/ecrans-missions.test.tsx` : 2/2 ; ESLint ciblé et diff-check verts.
Contrôles GitHub laissés à Malik selon son souhait : il signale les erreurs.
Réservation libérée après publication.

## Accès Arène/Hôtel — 11 octobre 2026

Base de départ `9ea238459c6feaf31be770f1b2274b9d7fabb6f7`, main vérifié égal,
checkout propre. Petit complément de l’identité du profil : les deux lignes
indiquent maintenant leurs conditions et données utiles. Arène : équipe de cinq
cartes distinctes (progression réelle X/5), au moins un créateur en direct au
moment du dépôt. Hôtel : compte requis en ligne ; compte connecté, nombre de
doublons réellement vendables et solde réel en points. Les feuilles restent
consultables avant de remplir ces conditions. Aucune règle ou SQL changée.
DOM ciblé `npm run ecrans -- src/ecrans-scene-profile.test.tsx` : 6/6 ; ESLint
ciblé et diff-check réussis. Sur `38160206441`, SQL, tests/statique/build, RPC
simulées success ; E2E encore in_progress au dernier relevé. Ce complément n’a
pas encore déclenché de contrôles GitHub. Téléphone physique non vérifié.
Réservation libérée après publication ; prochain travail à choisir après état
final du run.

## Correctif CI du lot Scène/profil — 11 octobre 2026

Base a106fde982733a4a0d8d6df3c61a678b788d1411, main vérifié identique.
[Run 38159920539](https://github.com/GoodFight37/CreatorDeck/actions/runs/38159920539)
terminé en échec : SQL jetable, unitaires/écrans/statique/build et E2E ordinaires
success ; seul le job cloud simulé échoue. Lecture directe de son log : le
scénario invité échoue sur bureau et téléphone car l’assertion ligne 50 ne trouve
pas le bouton « Se connecter pour ouvrir » ; ce n’est pas une erreur strict-mode.
Le commit `9ea2384` resserre ensuite la recherche au panneau Live, sans changement
produit ni SQL. Rejeu local uniquement
`npm run e2e -- e2e/product-audit.spec.ts --grep 'avec le serveur'`, avec variables
publiques factices du job cloud : **2/2** passent, sortie 0, zéro tirage serveur.
Diff-check passe. Publication normale main autorisée ; suivi du nouveau run
transmis après push, sans attendre les suites longues. Réservation libérée après
publication. SHA de cette passation : `git log -1 --format=%H -- docs/agent-handoff.md`.
Téléphone physique non validé ; prochain chantier proposé : accès Arène/marché,
non engagé. Mode ultra économie conservé.

## Profil et K-037 — Paquet Scène faussement disponible, 11 octobre 2026

Demande Malik : poursuivre le profil, avec priorité au Paquet Scène qui s’affiche
« Disponible », lance brièvement la déchirure puis refuse « déjà ouvert ». Il juge
également le paquet isolé et son rôle peu clair. Base propre
`b64d178111ba48ad1328afbf794e4d98b77ebc69`, branche work et main identiques,
aucune PR ouverte, Git fetch/API accessibles, réseau inchangé. Craft confirmé
par API : [CI 38157646859](https://github.com/GoodFight37/CreatorDeck/actions/runs/38157646859)
et [Supabase 38157840967](https://github.com/GoodFight37/CreatorDeck/actions/runs/38157840967)
success. Malik confirme également les contrôles verts. Logs complets non relus.

Cause K-037 prouvée : pack_status expose scene_day/scene_ready, mais fetchPackStatus
n’utilisait pas ces champs, et HomeView se fiait uniquement au JSON local.
Correctif : statut Scène serveur lié au compte et à la journée, état de vérification
explicite et aucune ouverture annoncée avant confirmation. Le jour serveur est
adopté sans gain/cartes ; réponse ancienne ignorée, panne remet la disponibilité
à inconnue. Statut rechargé au changement de journée et revérifié au clic avant
la scène de déchirure. Un refus déjà ouvert recale le statut et devient une notice
« Déjà ouvert aujourd’hui. Le prochain arrive à 6 h UTC. », sans préfixe répété.
Après un tirage réussi, la disponibilité ferme immédiatement. Ouvertures Live
et Scène ne peuvent plus se superposer pendant la vérification. Timings reveal,
Perfect, déchirure et règle quotidienne inchangés. Aucune migration nécessaire.

Scène : section visible après le panneau Live, avant les activités secondaires,
sans details ni opacité de punition. Rôle expliqué : cinq cartes de la famille,
un paquet par jour, sans Légendaire ; statut et bouton cohérents, famille actuelle
et progression existantes conservées. Les tests de focus Scène restent verts.

Profil : pseudo du compte en tête, trois cartes possédées épinglées prioritaires
puis meilleures cartes automatiques pour compléter, sans doublon. Éditeur existant
Compte réutilisé pour personnaliser pseudo/vitrine ; les quatre emplacements du
profil public ne sont pas modifiés. Pages réunies et Légendaires uniques, série
existante, collection Binder en cours ou complétée et accès au Binder. État vide
avec CTA première carte. Version technique déplacée près des crédits ; menus et
réglages restent dessous. Aucun compteur inventé ni nouvelle récompense.

Vérifications locales sur le diff basé sur b64d178 :
- `npm test -- src/lib/cloud/cloud-store.test.ts` : **146/146**, cinq cas Scène
  ajoutés (adoption, panne, refus, réponse ancienne, succès). Après ajustement de
  la fixture aux raretés réelles, le cas succès est retesté seul.
- `npm run ecrans -- src/ecrans-scene-profile.test.tsx src/ecrans-drop-binder.test.tsx`
  : **16/16**, six nouveaux cas état Scène/profil, dix garde-fous Binder/Drop.
- E2E ciblés Scène/profil/focus : **6/6**, bureau/téléphone simulé ; rôle visible,
  consommation unique/rechargement, réserve Live conservée, vitrine/pages, lien
  Binder et absence de débordement à 320/412 px.
- E2E `avec le serveur` de scene-profile.spec.ts : **2/2** avec configuration
  publique factice en variables de commande, toutes les RPC simulées. Vérification
  initiale retardée, puis ouverture ailleurs : zéro appel de tirage, zéro scène
  de déchirure. Pas une preuve de comportement de la base réelle.
- Typecheck, ESLint ciblé, jargon et diff-check passent. Pas de suites générales
  SQL/build locales répétées ; confiées aux contrôles GitHub. 0047/0048 ne sont
  pas réappliquées, pas de déploiement manuel, K-031 séparé. Téléphone physique
  et contenu Vercel servi restent non vérifiés.

Code/docs préparés pour publication normale main dans un seul commit. SHA du lot :
`git log -1 --format=%H -- docs/agent-handoff.md` ; comparer au main distant.
[Actions main](https://github.com/GoodFight37/CreatorDeck/actions?query=branch%3Amain)
reste le suivi ; l’agent transmettra le run et son état observé après push,
sans surveillance des longues suites. Ne pas déclarer leurs résultats verts
avant observation. Malik peut transmettre le contrôle rouge et son erreur.
Réservation libérée après publication ; pas de chantier produit additionnel
engagé dans ce lot.

## Craft — aperçu utile avant dix doublons, 11 octobre 2026

Demande Malik : enchaîner sur Craft pendant qu’il suit les contrôles Binder et
renvoie les logs si nécessaire. Base propre `9635ad7529487cf6dca2b0a7d8f43f4d1c65f7ef`,
branche work, main identique, aucune PR ouverte. Git fetch/API réussis, runtime
connecté, réseau inchangé. Instructions AGENTS et mode économie conservés.
Les contrôles Binder observés par API ont terminé **success** :
[CI 38157114952](https://github.com/GoodFight37/CreatorDeck/actions/runs/38157114952),
[Supabase 38157321349](https://github.com/GoodFight37/CreatorDeck/actions/runs/38157321349).
Logs complets de ces runs non relus dans ce lot, pas de nouveaux compteurs annoncés.

Avant dix copies recyclables : compteur/gate conservés, explication dernière
copie gardée, solde actuel, valeur possible du recyclage groupé (hors Live),
avertissement pour les Live à décider individuellement. Trois vrais aperçus de
cartes Standard manquantes et artisanables, prix des métadonnées existantes,
points encore nécessaires au solde actuel. Priorité au choix Binder ou à sa
suggestion automatique ; si cette page n’a plus de manquantes artisanables,
le texte l’annonce et propose d’autres cartes. Accès Binder pour choisir sa
collection et retour Drop. Les aperçus n’ont aucun bouton d’achat/recyclage.
À dix doublons, listes et actions existantes restent inchangées.

Aucune règle d’économie modifiée, aucune migration nécessaire, aucun SQL de
production lancé ; les contrôles SQL complets sont laissés à GitHub. Pas de
changement Drop/tear/Perfect, son ou Reflets. K-031 séparé, téléphone physique
et contenu Vercel servi non testés. Prochain chantier produit : identité du profil.

Vérifications sur le diff basé sur 9635ad7 :
- `npm run ecrans -- src/ecrans-atelier-preview.test.tsx src/ecrans-mille-cartes.test.tsx`
  : **13/13** (5 nouveaux, 8 garde-fous de pagination/gate existants).
- Après clarification du cas « page déjà réunie », retest
  `npm run ecrans -- src/ecrans-atelier-preview.test.tsx` : **6/6**.
- `npm run e2e -- e2e/craft-preview.spec.ts` : **2/2**, bureau/téléphone simulé,
  neuf doublons, +108 points possibles pour neuf copies Standard communes,
  aperçu sans dépense, navigation Binder/Craft/Drop, pas de débordement à 320/412 px.
  Capture du panneau sur téléphone simulé inspectée.
- Typecheck, ESLint ciblé, jargon et diff-check passent. Aucun audit général
  ni répétition des suites SQL/build locales sans changement correspondant.

Code et docs préparés dans un seul commit pour publication autorisée sur main.
SHA : `git log -1 --format=%H -- docs/agent-handoff.md` ; comparer au main distant.
Les nouvelles suites complètes CI/build/SQL sont confiées à GitHub et leur résultat
n’est pas encore établi ici. L’agent transmet le lien et l’état observé après push,
sans surveillance prolongée. Suivi :
[Actions main](https://github.com/GoodFight37/CreatorDeck/actions?query=branch%3Amain).
Malik ouvre le run Vérification, attend les quatre contrôles verts et transmet
le nom/message d’un contrôle rouge. Le workflow Supabase automatique suit la CI ;
aucun déploiement manuel ni replay de 0047/0048. Réservation libérée après publication.

## Binder — petites collections, 11 octobre 2026

Demande Malik : commencer l’amélioration du Binder, puis Craft, puis identité du
profil. Mode économie accepté : tests locaux ciblés, publication autorisée,
contrôles longs laissés à GitHub sans surveillance jusqu’à leur fin ; fournir
au joueur les liens et les étapes compréhensibles pour suivre les résultats.
Consigne permanente enregistrée dans AGENTS.md dans le même lot.

Base vérifiée propre `31be9aeb9fc38360517933977a6493a027be5b99`, branche work,
main identique, aucune PR ouverte. Git fetch/API accessibles, derniers contrôles
38155969838 et 38156196649 success. Runtime connecté ; preset package_managers
et six domaines configurés, état d’application réseau unknown, aucune modification.

Implémentation : les familles existantes, fondées sur les langues de diffusion,
sont présentées en pages de 12 créateurs maximum. Compteur par créateur unique,
progression, aperçu de trois noms manquants et accès direct aux manquantes.
Suggestion automatique d’une page commencée proche de la fin ; choix explicite
par famille, enregistré sur cet appareil et pour cette édition du catalogue.
« Obtenues » reste la vue initiale même après rechargement. Page complète :
mention explicite et accès aux cartes réunies. Aucun gain pour une petite page,
les saisons/paliers serveur restent inchangés. Aucun SQL/migration nécessaire,
0047/0048 non réappliquées, K-031 séparé. Pas de modification Drop/tear/Perfect,
son ou Reflets. Le chantier Craft reste le prochain lot, puis le profil.

Vérifications sur le diff basé sur 31be9ae :
- `npm test -- src/lib/binder-collections.test.ts` : **4/4**, partition exhaustive
  sans doublon, familles conservées, compteurs/suggestion exacts.
- `npm run ecrans -- src/ecrans-drop-binder.test.tsx` : **10/10** au dernier run.
  Un run intermédiaire avait 8 réussis et 2 échecs : liste initiale comparée à
  un état null au lieu de la famille affichée. Même valeur résolue désormais
  pour le select et sa liste, retest entier réussi.
- `npm run e2e -- e2e/drop-binder.spec.ts` avec Chromium local : premier run
  **6/8**, puis **8/8** après regroupement réel des familles (le scénario
  attendait 12 cartes sur une vague de cinq). Après correction de la liste
  initiale, retest du choix/persistance **2/2** réussi. Capture du bloc collection
  sur téléphone simulé inspectée ; aucun débordement à 320 px.
- Typecheck, ESLint des six fichiers TS/TSX concernés, jargon et diff-check
  passent. Pas de nouvelle suite générale locale, ni de SQL production lancé.
  Les suites complètes, le build et les contrôles SQL sont confiés à GitHub.

Publication autorisée directe main, code et documentation dans un seul commit.
SHA du lot : `git log -1 --format=%H -- docs/agent-handoff.md` ; comparer à main
avant reprise. Suivi : [Actions main](https://github.com/GoodFight37/CreatorDeck/actions?query=branch%3Amain).
Le résultat des nouvelles CI n’est pas encore établi dans ce checkpoint ; ne
pas le présenter vert sur la base des runs précédents. Après la CI de vérification,
le workflow Supabase automatique contrôle la base, sans migration nouvelle
attendue. Ne pas lancer de déploiement manuel ni rejouer 0047/0048.
Malik suit les suites longues et peut renvoyer un échec ; l’agent donnera le lien
du run observé après push, sans surveillance jusqu’à la fin. Réservation libérée
après publication. Prochain lot : Craft utile avant le seuil, puis profil.
Appareil physique et contenu Vercel servi non testés.


## K-036 publié et contrôles verts — ouverture involontaire pendant le scroll — 11 octobre 2026

Demande Malik : le scroll de Drop ne doit pas ouvrir de booster. Base propre
`caee41c2bff3eebe6845aee9e0fc68419168b9d2`, branche work et main identiques,
Git/API/logs Actions accessibles ; aucune modification réseau. Dernières CI
38154126175 et Supabase 38154322446 success avant ce correctif.

Cause confirmée : `.pack-stage` capturait le pointeur, `touch-action: none`
et un tirage vertical armé lançait `onOpen` sur tout le bloc. Suppression des
handlers de tirage et autorisation du scroll vertical/pincement. Le bouton sachet
ignore les clics générés après glissement ; appui/clavier ouvrent la scène dédiée,
où la déchirure reste disponible. Consigne et aria-label mis à jour. Aucun timing
Perfect/reveal/tear ni règle de tirage modifié. Aucun nouveau SQL nécessaire ;
0047/0048 ne sont pas réappliquées, K-031 séparé, téléphone réel non testé.

Diff : drop-view.tsx, globals.css, ecrans-tactile.test.tsx, pack-tear.spec.ts
et docs de coordination. Local : 12/12 DOM ciblés, typecheck et ESLint ciblé
code 0, SQL jetable **645** contrôles, code 0. Premier E2E : 9 réussis, 1 échec de remise à zéro du
scroll à cause de l’inertie entre deux gestes. Scénarios tactile séparés dans des
pages indépendantes ; retest ciblé **4/4** réussi. Les 8 autres scénarios du
premier run passent (appui/focus/clavier, glissements souris, dimensions et
déchirure dans les deux sens). Publication normale vérifiée sur main :
[`0d860d61fac0763972e2433967452de444c72616`](https://github.com/GoodFight37/CreatorDeck/commit/0d860d61fac0763972e2433967452de444c72616).
Contenu distant de cette passation comparé byte à byte. CI
[38155656424](https://github.com/GoodFight37/CreatorDeck/actions/runs/38155656424)
**success**, quatre jobs ; logs téléchargés et lus : **1118/1118** unitaires
(71 fichiers), **86/86** DOM (16 fichiers), **645** contrôles SQL jetables,
**50 E2E** sans cloud réussis, 8 ignorés dédiés au cloud, puis **8/8** cloud
simulés. Typecheck/lint/jargon/catalogue et build export passent. Contrôle
Supabase automatique
[38155870699](https://github.com/GoodFight37/CreatorDeck/actions/runs/38155870699)
**success** ; log lu : cible CreatorDeck, TLS et historique vérifiés, base déjà à
jour, **aucun SQL de migration exécuté**. Statut GitHub Vercel success ; contenu
servi et appareil physique non testés. Aucun déploiement manuel lancé.

Complément documentaire uniquement : le SHA de ce checkpoint se retrouve par
`git log -1 --format=%H -- docs/agent-handoff.md`. Aucun travail code restant
sur K-036 ; vérifier le geste sur téléphone physique. Réservation libérée après
publication du checkpoint. Les documents ci-dessous restent des preuves datées
des livraisons précédentes.

## Checkpoint courant — audit produit P0/P1 publié et confirmé — 11 octobre 2026

Demande Malik : implémenter P0 puis P1 de l’audit produit, publication autorisée.
Base vérifiée : `bbef1227bafb050dd024f77ea15c1bb3384e8aee`, branche `work`,
main distant identique, checkout initial propre, aucune PR ouverte. Un seul écrivain
observé. Git fetch, API GitHub et téléchargement des logs Actions réussissent ;
aucune configuration réseau changée. Chromium 1243 téléchargé via Playwright.

- Modifications locales : un pack tutoriel invité fixe, sans écriture de cartes,
  points, jetons, réserve ni RPC de tirage ; un essai par navigateur puis compte.
  Tribunal et objectif placés au-dessus du sachet ; pastille de dossiers, karma
  pendant la séance, tampon/marteau, cinquième réaction conservée, bilan et CTA.
  Quatrième mission « Juge 5 dossiers », compteur distinct/idempotent ; après
  le premier booster elle devient l’objectif prioritaire. Taux/activités et
  Paquet Scène repliés. Profil : vitrine/série déjà présentes préservées, entrée
  Tribunal, mentions de connexion pour menus sociaux, Reflets accessible même
  sans gyroscope. Son/reflets ON sans préférence étaient déjà implémentés.
  Sachet : faces, flaps, cascade 960 ms, hiérarchie rare et cadrage existants
  conservés ; ombre rendue plus nette. Aucun timing JS reveal/tear modifié.
- Pas de migration nouvelle nécessaire : la mission utilise les compteurs JSON
  et les gains de sabliers déjà locaux. 0047/0048 restent appliquées, aucun reset,
  repair ou SQL manuel en production. K-031 et le chantier P2 restent séparés.
- Vérifications sur le diff basé sur bbef122 : `npm test` **1118/1118**, 71
  fichiers ; `npm run ecrans` **86/86**, 16 fichiers ; `supabase:verify` **645**
  contrôles réussis dans PostgreSQL jetable, migrations 0001–0048 seulement.
  Typecheck, lint complet, jargon, catalog:ci, diff-check et politique migrations
  passent ; 28 tests du déploiement passent. Build webpack/export statique réussi,
  sans cloud local (ce build ne valide pas le bundle Vercel configuré).
- Navigateur : premier run complet sans cloud 43 réussis, 8 ignorés, 3 échecs
  (CTA sous le pli bureau court, focus Scène, sélecteur devenu obsolète pendant
  une édition). Les 8 scénarios ciblés finaux passent sur bureau/téléphone simulé,
  dont CTA dans la fenêtre, focus Scène, Tribunal accessible en un appui sans
  scroll à 320×568 et 412×915, defaults ON et OFF conservés. Premiers 6 scénarios
  cloud simulés verts ; le nouveau test invité attendait à tort le tutoriel à
  trois étapes pour un visiteur non connecté. Attente corrigée, **2/2 invités**
  passent. Aucun RPC réel en production utilisé pour ces scénarios.
- Les suites initiales avaient aussi une attente « trois missions », le sélecteur
  de l’ancien Tribunal et le bilan immédiat. Assertions adaptées à la quatrième
  mission et à la réaction du cinquième verdict, puis suites finales vertes.
  Le mock de statut cloud et le setState dans effect ont été corrigés ; le choix
  tutoriel utilise useSyncExternalStore et conserve sa limite au rechargement.
- Première publication vérifiée sur main :
  [`e33ac0a5145264d90772ae63b9cccb942c912157`](https://github.com/GoodFight37/CreatorDeck/commit/e33ac0a5145264d90772ae63b9cccb942c912157).
  CI [38153473136](https://github.com/GoodFight37/CreatorDeck/actions/runs/38153473136)
  **success**, quatre jobs : qualité, SQL jetable, 46 E2E sans cloud (8 ignorés
  dédiés au cloud), puis 8/8 cloud simulés. Logs téléchargés et lus. Statut
  GitHub Vercel success, sans preuve du contenu servi ni du téléphone réel.
- Une capture locale du build statique à 412×915 a révélé le bouton sablier
  partiellement sous la navigation. Ajustement final CSS : sachet 140 px maximum
  et espacements réduits, mêmes faces/gestes/timings. Les **4 E2E** ciblés
  `le Drop garde|home pack artwork` passent : bouton sablier entièrement au-dessus
  de la navigation sur bureau/téléphone simulé, sachet/titre/consigne sans recouvrement.
  Build complet précédent testé sur e33ac0a ; cet ajustement n’a touché que CSS
  et assertion navigateur. Aucune suite SQL/logique répétée pour cette retouche.
- Code final publié et vérifié sur main :
  [`3d3ef31988373287d22451df7aee065064300594`](https://github.com/GoodFight37/CreatorDeck/commit/3d3ef31988373287d22451df7aee065064300594).
  CI [38153757540](https://github.com/GoodFight37/CreatorDeck/actions/runs/38153757540)
  **success**, quatre jobs. Logs lus : **1118/1118** unitaires (71 fichiers),
  **86/86** DOM (16 fichiers), **645** contrôles SQL jetables, statique/build
  verts, **46 E2E** réussis et 8 ignorés dans le build sans cloud, puis
  **8/8 cloud simulés**, dont le nouveau pack invité. L’assertion du sablier
  entier au-dessus de la navigation passe sur bureau et téléphone simulé.
- Contrôle automatique Supabase final
  [38153978544](https://github.com/GoodFight37/CreatorDeck/actions/runs/38153978544)
  **success** sur 3d3ef31. Logs lus : connexion TLS, projet CreatorDeck et
  historique vérifiés ; « La base est déjà à jour et vérifiée. Aucun SQL de
  migration exécuté. » Le premier automatique
  [38153644482](https://github.com/GoodFight37/CreatorDeck/actions/runs/38153644482)
  avait confirmé la même absence de SQL sur e33ac0a. Aucun secret modifié.
- Statut GitHub Vercel **success** sur 3d3ef31. Ce statut ne démontre pas le
  contenu actuellement servi. Les captures/tests étaient locaux ou dans CI,
  jamais un téléphone physique. Validation téléphone toujours à faire.
- P0/P1 terminés pour ce lot ; P2/K-031 restent séparés. Pas de migration à
  appliquer, pas de réapplication 0047/0048, reset ou réparation. Réservation
  de travail libérée après publication documentaire. Pour reprendre : comparer
  HEAD/main et lire ce checkpoint ; prochain travail produit sur téléphone
  consiste à vérifier le sablier, l’accès Tribunal et le pack tutoriel réel.

---

## Checkpoint courant — sablier visible, migration appliquée — 11 octobre 2026

Dernier déploiement SQL : [run 38146774310](https://github.com/GoodFight37/CreatorDeck/actions/runs/38146774310)
**success** sur le commit main `ef3a6ed47d473c187f4113e4eb9e5b38264274dc`.
Logs lus : connexion TLS, projet CreatorDeck et historique vérifiés ; une seule
migration en attente, `0048_sablier_booster_bonus.sql` ; « Applying migration
0048_sablier_booster_bonus.sql... » puis « Historique et objets attendus
vérifiés après application. » L’application serveur de 5/4 est donc confirmée.
La CI de ce SHA [38146175554](https://github.com/GoodFight37/CreatorDeck/actions/runs/38146175554)
était verte, quatre jobs. L’autorisation permanente D-038 est publiée.
Checkpoint documentaire [9768d1a85bc5d24f3c0664a98cb3738903d104ed](https://github.com/GoodFight37/CreatorDeck/commit/9768d1a85bc5d24f3c0664a98cb3738903d104ed)
validé par la CI [38146941670](https://github.com/GoodFight37/CreatorDeck/actions/runs/38146941670)
(quatre jobs verts). Le contrôle automatique Supabase
[38147141158](https://github.com/GoodFight37/CreatorDeck/actions/runs/38147141158)
est aussi **success** : connexion TLS, CreatorDeck et historique vérifiés,
base déjà à jour ; aucun SQL rejoué.
Le statut GitHub du check Vercel sur `ef3a6ed` était `success`. Cela ne vérifie
pas le contenu actuellement servi ni le parcours réel sur téléphone.

- Demande : afficher l’action sablier sans menu, alléger l’accueil Drop et, à
  4/4, permettre un booster unique à 5/4. Malik a confirmé explicitement le
  comportement 5/4. Malik autorise de façon permanente la publication et les
  migrations nécessaires après CI automatique verte.
- État avant édition : branche `work`, HEAD `06a31d43ad21ad7b9439dea31481da1eebb98711`,
  `origin/main` identique via `git ls-remote`; aucun commit local préexistant,
  modifications de cette tâche uniquement. Aucun reset/force.
- Changements locaux : bouton sablier visible, garanties/taux superflus retirés
  de l’accueil, jetons repliés séparément ; moteur et sauvegarde acceptent un
  unique excédent 5/4 ; migration `0048_sablier_booster_bonus.sql` (manual)
  met le même comportement dans le serveur et les protections d’idempotence,
  compte synchronisé, réserve et autorité serveur. Vérificateurs et attentes
  de tests adaptés. K-031 non modifié.
- Vérifications locales : `npm run supabase:verify` **code 0**, migrations
  0001–0048 rejouées dans PostgreSQL jetable et toutes les vérifications passent,
  y compris les scénarios sablier mis à jour ; `npm test -- src/lib/game-engine.test.ts
  src/lib/save-store.test.ts src/lib/supabase-hourglasses.test.ts` **119 tests**
  passent (le fichier supabase-hourglasses n’était pas présent et Vitest n’a
  exécuté que les deux fichiers trouvés : 102 + 17) ; `npm run ecrans --
  src/ecrans-drop-binder.test.tsx` **8/8** ; `npm run typecheck` code 0 ; ESLint
  ciblé code 0 ; `git diff --check` code 0. `npm install --no-save` a ajouté les
  deux dépendances temporaires embedded-postgres/pg avec cache `/tmp` et changé
  deux paquets de node_modules seulement ; aucun changement suivi/lockfile.
- Publication sur main : commits `402df83` (feature), `c3799de` (assertion de
  révélation), `67d6fe9` (sélecteurs des deux E2E), `6bc6be7` (nom accessible).
  Main et HEAD local confirment `6bc6be7f329f7ecf6fc44237447ea39237d357e1`.
  Premier run 38144539343 échoué sur l’assertion UI ancienne ; run 38144662542
  a encore révélé les deux sélecteurs E2E obsolètes. Le run final
  [38145382045](https://github.com/GoodFight37/CreatorDeck/actions/runs/38145382045)
  est **success**, quatre jobs verts : unitaires 71 fichiers, écrans 15,
  statique/build, SQL jetable (« Toutes les vérifications passent »), E2E
  42 réussis et 6 cloud ignorés dans le job sans config, puis cloud simulé 6/6.
- Les workflows automatiques antérieurs 38145593723, 38145880229,
  38146124176 et 38146374907 ont tous refusé 0048 `manual` avant SQL ; leurs
  logs portaient le refus prévu. Après l’autorisation permanente de Malik, le
  workflow dispatch manuel 38146774310 a appliqué 0048 seule et a confirmé
  l’historique après application. 0047 reste intacte. K-031 reste séparé.
- Malik demande de ne plus attendre un nouvel accord pour les modifications
  ciblées du dépôt, pushes normaux sur `main` et migrations Supabase nécessaires
  après CI verte. `AGENTS.md` et D-038 enregistrent cette autorisation. Aucune
  migration hors périmètre, réparation ou reset n’a été effectué.
- Contrôle visuel/téléphone non effectué. E2E ciblés locaux non démarrés, faute
  de Chromium 1243 installé ; CI distante fait foi pour ces scénarios simulés.
- Publication initiale `402df83a57c545ce823bf145bc036a33209214a6` : run CI
  38144539343, SQL jetable vert mais job UI échoué sur l’ancienne assertion
  `src/ecrans.test.tsx` ; corrigée dans `c3799decbc0edfa8d4095af78549cba2fdc05f39`.
  Second run 38144662542 : unitaires/écrans/statique/build et SQL verts ; E2E
  échoue car deux scénarios pointaient encore vers l’ancien menu. Logs lus :
  `drop-binder.spec.ts` ciblait le bouton dans les détails, et le scénario
  sablier (cloud simulé) attendait « Jetons et sabliers ». Ces sélecteurs sont
  corrigés localement. E2E ciblé local impossible : navigateur Chromium 1243
  absent (`browserType.launch: Executable doesn't exist`), et téléchargement
  Playwright non tenté. Aucun contournement proxy/TLS.
- Suite : vérifier la version effectivement servie et tester le parcours sur
  téléphone (4/4, sablier → 5/4, ouverture du bonus → 4/4). La migration et
  l’historique serveur sont vérifiés ; le test physique n’a pas été effectué.

---

## K-034 — corrigé, publié et confirmé par le run automatique — 11 octobre 2026

- Demande : corriger uniquement la prévalidation Supabase et publier sur main,
  autorisation explicite de Malik ; K-031 séparé, téléphone réel non validé.
- Reprise : checkout `work` propre à `7b73b1864d122dd0cecd1ce5dba99da0c4b60899`,
  avance rapide vers main `d7a257c6e19b0d04cea9b744e56721f65a84582f` après
  inspection du seul commit documentaire manquant. Aucun travail local perdu,
  aucune PR ouverte ni nouvelle activité distante observée.
- Environnement : preset `package_managers`, six domaines demandés, politique
  `enforced` et observations courantes. `git ls-remote`, fetch, API REST et
  `gh run view 38140833700 --log-failed` réussis. Le log distant désormais lu
  contient « Validation manuelle requise : 0047_sabliers_en_ligne.sql. », puis
  exit code 1. L'ancienne hypothèse est donc confirmée par cette nouvelle lecture.
  Aucun réglage réseau, secret ou TLS modifié.
- Correctif : `validateMigrationFiles` contrôle doublons, empreintes du baseline,
  versions nouvelles et modes déclarés sans historique synthétique. Le plan
  utilise uniquement l'historique réel ; manual déjà enregistrée n'est pas en
  attente, manual absente exige toujours approbation pour appliquer. `--check`
  reste hors réseau ; dry-run reste en lecture seule. Cible, TLS, historique,
  workdir CLI et relecture finale des versions/objets sont conservés.
- Vérification sur le diff basé sur d7a257c :
  `node scripts/supabase-deploy.test.mjs` **28/28**, aucun ignoré, code 0 ;
  `node scripts/supabase-deploy.mjs --check`, `node --check` des deux scripts,
  ESLint ciblé sur les deux scripts et `git diff --check` : code 0.
  Les quatre nouveaux tests couvrent validation locale manual, manual enregistrée
  avec/sans nouvelle automatic, politique même sur version enregistrée et
  point d'entrée sans secret atteignant le contrôle de connexion. Tests locaux
  sans production ; suites produit non répétées localement, exécutées par la CI.
- Code publié normalement sur main :
  [`ee10a6d46dcf8f91e585d77493f48271b981e31e`](https://github.com/GoodFight37/CreatorDeck/commit/ee10a6d46dcf8f91e585d77493f48271b981e31e),
  SHA distant et contenu du premier checkpoint confirmés. Checkout `work`.
- [Vérification 38142506934](https://github.com/GoodFight37/CreatorDeck/actions/runs/38142506934)
  **success**, quatre jobs verts. Logs téléchargés : outil **28/28**,
  `npm test` **1117/1117** (71 fichiers), `npm run ecrans` **83/83** (15 fichiers),
  `npm run supabase:verify` **643 assertions ✅** sur Postgres jetable,
  `npm run e2e` **42 réussis / 6 ignorés** sans cloud, puis les **6/6** scénarios
  cloud passent séparément avec RPC simulées. Typecheck, lint, jargon, catalogue
  et build de production réussis. Ce ne sont pas des tests sur compte réel.
- [Automatisation Supabase 38142681999](https://github.com/GoodFight37/CreatorDeck/actions/runs/38142681999)
  **success**, événement `workflow_run`, même SHA ee10a6d, sans approbation manual.
  Log distant lu : « Connexion TLS, projet CreatorDeck et historique vérifiés. »
  puis « La base est déjà à jour et vérifiée. Aucun SQL de migration exécuté. »
  le 11 octobre à 15 h 19 (Europe/Paris). Le chemin base à jour a donc relu les
  versions et table/RPC/trigger de 0047 sans appeler db push. **K-034 résolu**.
- Statut GitHub Vercel sur ee10a6d : **success** ; version réellement servie et
  téléphone non inspectés. Les résultats ci-dessus concernent le code ee10a6d.
  Cette actualisation est documentaire ; son SHA se retrouve par Git ci-dessous.
  Après sa publication, consulter ses contrôles GitHub sans répéter les tests
  locaux ni lancer un workflow manuel. Réservation libérée, aucun autre chantier
  réservé ; vérifier main courant à la prochaine reprise.
- 0047 demeure appliquée (38140515537) et vérifiée (38140562490). Aucun SQL,
  baseline ou workflow modifié, aucun reset/repair/réapplication/déploiement manuel.
  Le risque sans sauvegarde accepté concerne seulement l'application passée.
  Prochaine validation produit : essai sablier sur téléphone par Malik.

Les blocs suivants sont historiques et leurs limites d'accès datées ont été
remplacées par les observations ci-dessus. SHA du checkpoint par
`git log -1 --format=%H -- docs/agent-handoff.md`.

---

## Complément de reprise — 11 octobre 2026, après la passation initiale

État du code inspecté : `7b73b1864d122dd0cecd1ce5dba99da0c4b60899` sur main.
**0047 reste appliquée et vérifiée ; ne pas la réappliquer.**

- **K-034, non corrigé** : la première prévalidation de
  `scripts/supabase-deploy.mjs` utilise les versions du baseline 0001–0046,
  puis refuse 0047 manual avant de consulter l'historique réel. Reproduction
  locale sans connexion : `SUPABASE_DB_URL='' node scripts/supabase-deploy.mjs`
  renvoie « Validation manuelle requise : 0047_sabliers_en_ligne.sql. ».
  Le run automatique [38140833700](https://github.com/GoodFight37/CreatorDeck/actions/runs/38140833700)
  a échoué ; son erreur détaillée distante n'a pas été lue, donc le lien avec
  cette cause reste un diagnostic cohérent avec la reproduction locale.
- Prochaine correction : distinguer validation des fichiers et plan réellement
  en attente ; exiger l'approbation des migrations manual seulement lorsqu'elles
  sont absentes de l'historique réel. Tester le cas déjà appliqué et conserver
  les protections baseline, cible, TLS, historique et contrôle des objets.
  Aucune correction de code ni nouvelle application n'a été faite ici.
- Le chat précédent pouvait lire la configuration et disposait d'un outil de
  brouillon, mais aucun outil d'activation/publication. Malik signale que le
  bouton Edit ne fonctionne plus ; cause interface non déterminée. Il choisit
  de créer un nouvel environnement. Ne pas promettre que l'édition sera ensuite
  toujours disponible.
- Réseau initial recommandé : preset `package_managers`, domaines existants
  `*.vercel.app`, `api.github.com`, `cdn.playwright.dev`,
  `playwright.download.prss.microsoft.com`, `storage.googleapis.com`, plus
  `results-receiver.actions.githubusercontent.com` pour les logs Actions.
  Ce dernier domaine n'a pas été ajouté dans l'ancien environnement. Tester un
  vrai téléchargement de logs avant d'annoncer cet accès actif ; d'autres
  redirections peuvent nécessiter un diagnostic. Git/API fonctionnaient lors
  du diagnostic précédent ; cela doit être revérifié dans le nouvel environnement.
- Restent aussi l'essai sur téléphone et K-031, chantier séparé. L'acceptation
  du risque sans sauvegarde concernait uniquement l'application passée de 0047.
- Aucun agent ne réserve de travail pour cette reprise documentaire. Lire les
  entrées courantes avant les checkpoints historiques conservés plus bas.

## Checkpoint courant — 0047 appliquée et vérifiée — 11 octobre 2026

Rapport autonome pour transfert à l’autre chat : [déblocage Cloud et 0047](passation-chat-temporaire-0047.md). Il explique les causes, les corrections et les preuves sans dépendre de cette conversation.

- Demande de Malik satisfaite pour l’application serveur : migration **0047_sabliers_en_ligne.sql** appliquée au projet CreatorDeck `yzxchpybqrfegvecihxf`. Absence de sauvegarde et risque explicitement acceptés par Malik avant exécution. Aucun reset, repair, include-all ni modification/rejeu de 0001–0046 ; aucun changement SQL de 0047 pendant cette reprise.
- Correctif d’outil publié : [`5832b5d5584f62d915e6724afbdd323a0bccc5a5`](https://github.com/GoodFight37/CreatorDeck/commit/5832b5d5584f62d915e6724afbdd323a0bccc5a5), SHA distant confirmé. [CI 38140313000](https://github.com/GoodFight37/CreatorDeck/actions/runs/38140313000) **success**, quatre jobs verts ; [dry-run courant 38140323824](https://github.com/GoodFight37/CreatorDeck/actions/runs/38140323824) **success** avant application. Dossier temporaire compatible CLI 2.39.2, mêmes SQL exacts, configuration locale intacte, contrôle post-application ajouté (D-034).
- [Application manuelle 38140515537](https://github.com/GoodFight37/CreatorDeck/actions/runs/38140515537) **success** sur le même SHA, dry_run=false / approve_manual=true. Étape de contrôle/application effectivement exécutée et réussie. Le script ne réussit qu’après relecture de toutes les versions attendues et présence de hourglass_spends, use_hourglass(uuid), trigger actif guard_hourglass_spends sur saves. **0047 et ses objets sont donc vérifiés en base**, pas seulement dans le dépôt. Seul candidat nouveau hors baseline : 0047 ; empreinte inchangée `bf50fd9644f184db56d4bd4257d187539a9900edbb4a5849f0574f35afacfa3a`.
- [Contrôle final en lecture seule 38140562490](https://github.com/GoodFight37/CreatorDeck/actions/runs/38140562490) **success** après application, même SHA. Aucun débit de sablier, test compte réel ni reset effectué par l’agent. Logs détaillés toujours inaccessibles via le proxy ; preuves par résultat/étapes du workflow et vérifications obligatoires du script exact publié. Aucune clé/URI/valeur secrète consultée ou modifiée.
- Échec précédent 38139794012 : configuration rejetée avant SQL, selon log expurgé fourni par Malik ; cause reproduite localement et résolue (K-033). Runs automatiques sans approve_manual refusés lorsque 0047 était en attente, conformément à sa classification manual. Pas de relance aveugle : correctif testé, nouvelle CI/dry-run, puis nouvelle application explicite.
- Vérifications locales du correctif : binaire officiel 2.39.2 et checksum vérifié, erreur invalid keys reproduite puis configuration minimale acceptée avec connexion locale factice ; tests outil **24/24**, politique/syntaxe/ESLint/diff-check réussis. Aucun test SQL local de production ; tests SQL jetables dans la CI verte.
- Statut Vercel GitHub du code 5832b5d : **success**. Version réellement servie et téléphone non inspectés. **Seule action utilisateur restante** : recharger/mettre à jour le jeu, vérifier la version dans Toi, se connecter, réserve non pleine et au moins 1 sablier ; utiliser 1 sablier → débit unique de 1 et recharge avancée de 15 min, recharger puis vérifier le solde/la réserve et ouvrir le booster lorsqu’il est disponible. Ne pas annoncer ce test physique réussi avant le retour de Malik.
- K-031 (report du helper historique) reste un chantier séparé, inchangé. Gains de sabliers toujours calculés localement ; aucune certification serveur globale de l’économie. Cadeau/tutoriel/taux inchangés.
- Passation commune Cloud/PC actualisée dans roadmap, problèmes, journal et docs Supabase. Publication documentaire : SHA par `git log -1 --format=%H -- docs/agent-handoff.md`. Réservation libérée ; suivre main courant à la prochaine reprise. Les sections ci-dessous sont historiques.

---

## Reprise 0047 — incompatibilité CLI corrigée — 11 octobre 2026

- Malik a fourni l’erreur du run manuel 38139794012 : connexion TLS/projet/historique validés, plan uniquement 0047, puis **failed to parse config / invalid keys** (health_timeout, orioledb_version, stockage récent, auth, local_smtp, pgdelta). Le CLI 2.39.2 a échoué **avant l’exécution SQL**. Autorisation d’appliquer uniquement 0047 et acceptation explicite sans sauvegarde toujours valides ; aucune nouvelle permission demandée.
- Reprise sur `work`, HEAD/distant main `c76693a8a41b42780939a1a5564277a04a3b236f`, checkout propre, aucun autre écrivain observé. Aucun SQL/baseline, variable, secret, réseau ou réglage local Supabase modifié.
- Correctif `scripts/supabase-deploy.mjs` : db push utilise `--workdir` dans un dossier temporaire, config minimale CreatorDeck / Postgres 17, copie exacte des SQL déjà contrôlés. CLI 2.39.2 conservé ; config.toml locale intacte. Dossier et CA supprimés dans finally après succès/échec. Contrôles cible/TLS/historique, refus des anciens fichiers et validation manual maintenus.
- Contrôle réel après CLI : lecture des versions attendues et des objets 0047 (table hourglass_spends, RPC use_hourglass(uuid), trigger actif guard_hourglass_spends sur saves). Même contrôle si la base est déjà à jour ; aucune réussite d’application annoncée si un objet/version manque. Requêtes SELECT uniquement ; aucun débit sablier ni test sur compte réel.
- Vérification locale avec binaire officiel **2.39.2**, empreinte SHA-256 officielle vérifiée `bd13b5afa5bdb06a254b8b24f63bc3ef679e1fb1bb245ee6e842d40955a7b2a5` : original config → invalid keys reproduit ; dossier temporaire avec les 47 SQL → config acceptée, erreur attendue connection refused sur 127.0.0.1:1 en dry-run. Aucun SQL exécuté ni accès production dans cet essai.
- `node scripts/supabase-deploy.test.mjs` : **24/24**, code 0 (copies exactes, nettoyage succès/échec, rejet version/objets manquants, lecture seule). Premier passage 22/24 : assertion test SELECT suivie d’espace au lieu de tout blanc ; expression corrigée, requêtes/contrôles conservés. `node scripts/supabase-deploy.mjs --check`, syntaxe Node, ESLint ciblé et diff-check : code 0. Suites produit non relancées localement pour ce correctif d’outil ; CI complète à attendre sur le nouveau SHA.
- Prochaine action autorisée : publier ce correctif, attendre les quatre jobs CI, dry-run du SHA courant, puis application manuelle uniquement 0047. Confirmer le succès du contrôle post-application ; téléphone réel ensuite. Aucune application de ce correctif n’a encore eu lieu au moment de ce checkpoint.
- Checkpoint préparé pour publication, SHA par git log sur ce document. Les blocs précédents sont historiques.

---

## Reprise 0047 — CI verte, application en échec — 11 octobre 2026

- Correctif CI/code et checkpoint publiés sur main : [`1dd5b537ef7ebf3b72cfa40b1448819a74d92395`](https://github.com/GoodFight37/CreatorDeck/commit/1dd5b537ef7ebf3b72cfa40b1448819a74d92395), SHA distant vérifié ; checkout local `work`. Un seul écrivain observé. Aucun SQL/baseline/workflow modifié.
- [Vérification 38139620497](https://github.com/GoodFight37/CreatorDeck/actions/runs/38139620497) **success**, quatre jobs verts (qualité/build, SQL jetable, navigateur, cloud simulé). Local : 42 tests navigateur réussis / 6 cloud ignorés, six cloud simulés réussis séparément, typecheck/lint/diff-check réussis.
- [Dry-run 38139632409](https://github.com/GoodFight37/CreatorDeck/actions/runs/38139632409) **success** sur le même SHA, étape connexion/projet/historique exécutée ; aucune application. Seul fichier hors baseline 0001–0046 : 0047. Empreinte SHA-256 : `bf50fd9644f184db56d4bd4257d187539a9900edbb4a5849f0574f35afacfa3a`.
- Malik a demandé toutes les étapes, accepté explicitement le risque sans sauvegarde sur forfait gratuit et confirmé CreatorDeck. Application manuelle déclenchée une seule fois avec dry_run=false / approve_manual=true : [38139794012](https://github.com/GoodFight37/CreatorDeck/actions/runs/38139794012) **failure**. CI/révision, CLI et pilote installés avec succès ; échec à « Contrôler le projet et appliquer les nouvelles migrations ». Aucune relance de l’application effectuée. **0047 ne peut pas être annoncée appliquée** ; effet réel du CLI à déterminer.
- Exécution automatique issue de la CI [38139778240](https://github.com/GoodFight37/CreatorDeck/actions/runs/38139778240) également failure ; erreur détaillée non accessible. Le plan manual est refusé sans validation selon le script lu ; ne pas attribuer définitivement la cause du run sans son log.
- [Dry-run après échec 38139855092](https://github.com/GoodFight37/CreatorDeck/actions/runs/38139855092) **success** sur le même SHA : contrôle TLS/projet/schéma minimal/historique encore valide. Cela ne dit pas si 0047 est présente ou toujours en attente, les logs du plan n’étant pas accessibles.
- `gh run view --log-failed` : refus Forbidden lors du téléchargement hébergé hors api.github.com. Annotations API : seulement exit code 1. Aucune règle réseau élargie, aucun contournement du proxy/TLS, aucun secret consulté ni modifié. Demande envoyée à Malik : copier uniquement l’erreur SQL/CLI expurgée de l’étape du run manuel ; ne transmettre ni URL de connexion ni mot de passe/token.
- Statut Vercel GitHub du commit 1dd5b53 : success ; aucune inspection de la version réellement servie ni essai sur compte/téléphone réel. Pas de déploiement Vercel déclenché manuellement.
- Prochaine action : lire cette erreur, confirmer l’état exact de 0047 et de son schéma avant toute nouvelle application ; corriger uniquement la cause prouvée, refaire CI/dry-run sur le SHA courant si le code change. Ne pas lancer repair/include-all, reset, rejouer 0001–0046 ou modifier le helper historique K-031. Publication documentaire de ce checkpoint se retrouve par `git log -1 --format=%H -- docs/agent-handoff.md` ; réservation libérée si cette reprise reste bloquée.

---

## Reprise 0047 — correctif CI et dry-run — 11 octobre 2026

- Malik demande de faire toutes les étapes proposées, y compris publication du correctif CI et application ciblée après contrôles. Il confirme CreatorDeck, l’absence de sauvegarde Supabase sur son forfait gratuit et accepte explicitement le risque de perte des données actuelles. Cette consigne remplace le blocage sauvegarde de la section précédente ; aucune sauvegarde/restauration ne peut être annoncée disponible.
- Base GitHub vérifiée : `97882085cd46ec314a543081f7d426ff6df18339`, branche locale `work`, distant main stable, aucun autre changement distant observé. Publication sur main comprise dans la reprise demandée ; aucun worktree, merge de PR ou historique réécrit.
- 0047 relue : aucune suppression, remise à zéro ou modification de lignes à l’installation. Ajout registre/fonctions/trigger/droits ; DROP TRIGGER remplace seulement son propre trigger. ON DELETE CASCADE ne s’exécute que lors d’une suppression ultérieure de pack_state. RPC use_hourglass modifie le solde/la réserve seulement lors de son appel. Aucune migration SQL ou baseline modifiée dans cette reprise.
- K-032 reproduit : `npm run e2e -- e2e/hourglass-online.spec.ts e2e/onboarding-gift.spec.ts --project=bureau --timeout=20000 --reporter=line` sans variables publiques → code 1, 2 échecs (tutoriel présent / cadeau absent). Correctif : helper cloudUrl partagé, chargement des fichiers/env comme Next dev, skip explicite sans cloud ; noms « avec le serveur » sélectionnés par le job cloud existant. Aucune assertion retirée, workflow inchangé.
- Scénarios cloud : `NEXT_PUBLIC_SUPABASE_URL=https://e2e.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=local-e2e-placeholder-key-01234567890123456789 XDG_CONFIG_HOME=/tmp/creatordeck-xdg PLAYWRIGHT_BROWSERS_PATH=/workspace/.cache/ms-playwright NEXT_TELEMETRY_DISABLED=1 npm run e2e -- --grep 'avec le serveur' --reporter=line` → code 0, **6/6** (tirage/cadeau/sablier × bureau/téléphone simulé), RPC factices uniquement.
- Contrôle ciblé des deux nouveaux tests sans cloud → code 0, **4 ignorés**, aucune réussite fonctionnelle revendiquée. Typecheck, lint et diff-check : code 0. Suite générale : `XDG_CONFIG_HOME=/tmp/creatordeck-xdg PLAYWRIGHT_BROWSERS_PATH=/workspace/.cache/ms-playwright NEXT_TELEMETRY_DISABLED=1 npm run e2e -- --reporter=line` → code 0, **42 réussis / 6 cloud ignorés**, 1,7 min. Les six cloud ont passé séparément avec configuration factice.
- Dry-run réel [38139346769](https://github.com/GoodFight37/CreatorDeck/actions/runs/38139346769), main `9788208` → **success**, étape de connexion/projet/historique exécutée et réussie, CLI d’application ignoré. Cible contrôlée par le script : `yzxchpybqrfegvecihxf` ; seul candidat nouveau hors baseline : 0047. Logs détaillés restent refusés par le proxy ; preuve par statut/étapes du workflow et script exact lu, aucun accès aux secrets.
- Prochaine étape : publier le correctif et ce checkpoint après contrôles locaux ; attendre les quatre jobs CI du nouveau SHA, refaire un dry-run sur ce SHA stable, puis workflow main dry_run=false / approve_manual=true. Ne pas appliquer une autre migration ni réparer l’historique. La vérification sur téléphone réel et la version servie restent distinctes.
- Checkpoint préparé pour publication avec le correctif ; son SHA se retrouve par `git log -1 --format=%H -- docs/agent-handoff.md`. Les sections précédentes sont historiques.

---

## Reprise 0047 suspendue avant application — 11 octobre 2026

- Demande : continuer selon le checkpoint GitHub. Dernière consigne de Malik : **ne pas appliquer la migration** ; sauvegarde récente/restaurable non confirmée, fournir les vérifications à effectuer.
- GitHub lu et fetché : main `97882085cd46ec314a543081f7d426ff6df18339`, seule branche distante. Checkout propre avant reprise, branche locale `work`, mise à jour fast-forward depuis `39d0625` ; aucun fichier utilisateur écrasé. Aucune édition de main, aucun push, workflow déclenché, migration, repair ou déploiement.
- API GitHub accessible (HTTP 200). Vérification run [38136289714](https://github.com/GoodFight37/CreatorDeck/actions/runs/38136289714) : SQL jetable, qualité/build et cloud simulé réussis ; navigateur Playwright en échec. Mises à jour Supabase suivantes skipped. Logs refusés par le proxy ; annotations donnent seulement exit code 1. Hypothèse non reproduite : tests cadeau/sablier exécutés dans le job sans configuration cloud factice. Ne pas présenter cette hypothèse comme cause prouvée.
- `node scripts/supabase-deploy.mjs --check` : code 0 ; `node scripts/supabase-deploy.test.mjs` : 21/21, code 0, aucun accès production. `npm ci --cache /workspace/.npm --no-audit --no-fund` : code 0, lockfile inchangé. Installation Chromium/FFmpeg dans le cache local ; téléchargement headless shell interrompu après consigne utilisateur, aucun E2E exécuté. Aucun changement produit/SQL/workflow.
- Référence dans le dépôt : `yzxchpybqrfegvecihxf`. La réponse utilisateur contient `yzxchpybqrfegecihxf` : comparer la référence exacte dans le tableau de bord ; ne pas substituer silencieusement la cible.
- Prochaine action opérateur : Supabase CreatorDeck → Database → Backups ; vérifier une sauvegarde terminée, sa date UTC et le mode de récupération proposé (daily/PITR), ou établir un dump complet et tester sa restauration dans une base isolée. Ne pas cliquer Restore sur la production pour tester. En l'absence de point récupérable confirmé, aucune application de 0047. Ensuite résoudre la CI navigateur, vérifier à nouveau cible/schéma/historique et plan limité à 0047 avant toute nouvelle autorisation d'application.
- Checkpoint **local uniquement**, non commité/non publié ; réservation libérée. Les preuves antérieures ci-dessous restent historiques.

---

## Checkpoint courant — sabliers reliés à la réserve en ligne — 11 octobre 2026

Malik a autorisé le correctif et sa publication sur `main`, dans ce checkout
Cloud. Base vérifiée avant édition : `1d5bd26c77d31f6ebc5265429d6b4c3a93fc7e15`,
local/distant identiques et checkout propre. Aucun worktree, merge, effacement
ou accès Supabase production. Code publié :
[`aded8ff`](https://github.com/GoodFight37/CreatorDeck/commit/aded8ffa83446544065225e05922a42e5073be55),
SHA distant confirmé. Le commit de cette passation se retrouve avec
`git log -1 --format=%H -- docs/agent-handoff.md`.

### Réalisé

- Le Drop connecté propose à nouveau « Utiliser 1 sablier » : synchronisation
  des gains avant dépense, puis RPC `use_hourglass(uuid)` ; aucune dépense
  locale de repli en ligne. Hors cloud, moteur local conservé.
- Migration additive/idempotente
  [`0047_sabliers_en_ligne.sql`](../supabase/migrations/0047_sabliers_en_ligne.sql),
  classée **manual** pour empêcher une application automatique à la production.
  Verrous réserve puis sauvegarde, débit exact de 1 et avance de 15 minutes
  atomiques ; refus sans compte, sans solde ou réserve pleine. Le registre
  privé interdit les écritures clients. Même UUID = même dépense.
- La clé de rejeu est conservée par compte dans le stockage de l'appareil :
  une réponse perdue, même suivie d'un rechargement, peut être récupérée sans
  nouveau débit ni envoi préalable de l'ancienne partie. Un refus HTTP explicite
  libère la clé pour synchroniser de nouveaux gains lors du prochain essai.
- Champ additif `hourglassesSpent`, valeur 0 pour les anciennes sauvegardes ;
  garde SQL contre la restauration d'un solde d'avant dépense, même par envoi
  forcé. Reset individuel : registre supprimé par cascade avec `pack_state`,
  nouvelle progression à compteur 0 acceptée ; cadeau/tutoriel inchangés.
- Les **gains** de sabliers restent calculés localement et synchronisés comme
  auparavant. Le serveur contrôle la dépense du solde enregistré, mais ne
  certifie pas l'origine de chaque gain : ceci n'est pas une migration complète
  de l'économie sous autorité serveur. XP/niveau, récompenses et taux inchangés.
- Découverte connexe K-031 : `_pack_refresh` reporte N millisecondes au lieu
  de N intervalles. Le contrôle automatique a rejeté son remplacement global
  comme dépassant la portée. Alternative retenue : helper privé
  `_hourglass_refresh`, employé uniquement par le nouveau RPC, avec report
  correct des minutes restantes. Le helper historique n'est **pas modifié** ;
  sa correction générale reste un chantier séparé, sans essai production.

### Contrôles réellement exécutés

Sur le contenu produit du commit `aded8ffa83446544065225e05922a42e5073be55` :

| Commande | Résultat final |
|---|---|
| `npm test -- --maxWorkers=2` | code 0, 71 fichiers, **1117/1117** tests |
| `npm run ecrans -- --maxWorkers=2` | code 0, 15 fichiers, **83/83** tests DOM |
| `npm run typecheck` | code 0 |
| `npm run lint` | code 0 |
| `XDG_CONFIG_HOME=/tmp/creatordeck-xdg NEXT_TELEMETRY_DISABLED=1 npm run build -- --webpack` | code 0, export statique `/`, `/_not-found`, `/overlay` ; variables cloud absentes, build local sans cloud |
| `npm run supabase:verify` | code 0, **643** assertions réussies, dont **19** scénarios sabliers ; Postgres jetable, aucune production |
| `node scripts/supabase-deploy.mjs --check` | code 0, politique valide, aucun accès réseau |
| `node scripts/check-jargon.mjs` | code 0, aucun jargon détecté |
| `npm run catalog:ci` | code 0, 1000 créateurs, seeds catalogue/saisons à jour |
| `git diff --check` | code 0 |

Commande navigateur exacte :
```sh
NEXT_PUBLIC_SUPABASE_URL=https://e2e.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=local-e2e-placeholder-key-01234567890123456789 NEXT_TELEMETRY_DISABLED=1 PLAYWRIGHT_BROWSERS_PATH=/workspace/.cache/ms-playwright npm run e2e -- e2e/hourglass-online.spec.ts --reporter=line
```
Résultat code 0, **2/2**, bureau et téléphone **simulé**. Réponses RPC factices :
recharge, réponse perdue, rechargement avant rejeu, un seul débit et réserve
conservée après une seconde reprise. SQL : deux connexions concurrentes se
partageant un dernier sablier → une seule dépense ; booster rechargé ouvre
réellement cinq cartes, refus/ancienne sauvegarde/rejeu/reset testés.

Incidents pendant vérification : première suite locale 17 échecs de lancement
`spawnSync git EPERM`/sous-processus Node, résolus par exécution autorisée sans
changer les tests ; premier build refus de `TypeScript --showConfig`, même
commande réussie avec exécution autorisée. Premier scénario SQL : cast JSON du
fixture corrigé ; deux assertions ont ensuite révélé K-031, résolu **dans le
nouveau parcours seulement**. Première tentative E2E interrompue volontairement
pour corriger le libellé du `<summary>`, puis parcours complet réussi. Aucun
contrôle échoué présenté comme une réussite initiale.

### Reste à faire et reprise Cloud/PC

1. **0047 non appliquée en production.** Vérifier la cible réelle, le schéma et
   le statut de sauvegarde/récupération avant toute application réelle ; ne pas
   inférer ces points de la réussite du Postgres jetable. Ne pas déclencher
   `--approve-manual` ni déployer automatiquement. Migration nouvelle uniquement,
   aucune retouche de 0001–0046 ou de leur baseline.
2. Après application et version servie vérifiées : téléphone réel, réserve
   non pleine, solde positif → 1 sablier débité, recharge avancée de 15 min,
   puis rechargement et ouverture du booster disponible. Aucun test téléphone,
   compte réel, CI distante ou déploiement confirmé par cette session.
3. K-031 : traiter séparément le report général de recharge, après revue de
   portée et test de l'ouverture naturelle ; ne pas réécrire une migration déjà
   appliquée. K-028 : prochain Live Drop réel → objectif quotidien 1/1 reste
   à confirmer. Taux/cadeau/reset global inchangés.
4. Git HTTPS marche avec `require_escalated` et le proxy hérité ; API `gh`
   bloquée auparavant. Ne pas recréer l'environnement ni changer les règles
   réseau. Consulter ce checkpoint depuis Cloud **ou PC** avant de reprendre,
   vérifier le HEAD GitHub actuel. Réservation libérée à la publication.

---

## Checkpoint courant — diagnostic des sabliers en ligne — 11 octobre 2026

- Demande de Malik : retrouver pourquoi les sabliers, utilisables auparavant,
  affichent maintenant « Sablier indisponible en ligne ». Diagnostic seulement,
  aucune modification produit/SQL et aucune opération Supabase.
- Reprise sur `main`, local/distant `1efbf5772be71aeba2ffc15e11a0760d97db29e0`,
  checkout propre ; `git ls-remote --heads origin main` réussi avec l'exécution
  réseau autorisée et le proxy hérité.
- Cause historique prouvée : commit
  [`5c120f3`](https://github.com/GoodFight37/CreatorDeck/commit/5c120f3488a83b71a4216e86bc1b6a69cc726469),
  5 octobre 2026, « Écran : ouvrir un booster passe par le serveur ».
  Dans le même diff, l'ouverture passe de `gameStore.openPack()` à
  `cloudStore.openPack()`, la réserve est relue par `pack_status()`, et le
  bouton des sabliers reçoit `disabled={serverReserve || ...}` avec
  `serverReserve={cloud.configured}`. Le commit explique explicitement que
  le sablier local ne peut pas avancer une réserve serveur.
- Avant ce commit, le bouton était actif et appelait déjà
  `gameStore.useHourglass()` → `spendHourglass()` : débit local d'un sablier
  et recul de `lastPackRegen` de 15 minutes. Cette opération n'est toujours
  reliée à aucun RPC de dépense/accélération de recharge. Le serveur lit
  `pack_state.last_regen_at` ; modifier l'ancre locale n'avance pas sa réserve.
- Le découpage `b365450` du 8 octobre transporte le verrou dans
  `drop-view.tsx` et emploie le message court actuel. La refonte Drop/Binder
  `4f91c71` conserve ce comportement ; elle n'introduit pas le blocage.
- Les sabliers restent attribués par les missions, jalons, niveaux et certains
  gains d'arène alors que leur dépense est bloquée dans le jeu en ligne :
  intégration fonctionnelle incomplète, K-030. L'ancienne conservation locale
  était une décision d'architecture, pas une preuve d'un parcours en ligne
  complet. La version anciennement servie au téléphone n'a pas été identifiée.
- Preuves : `git show 5c120f3` et parent, historique `git log -S`, lecture du
  handler actuel, du moteur et des migrations. Aucun test/build relancé :
  diagnostic par code/historique, aucun comportement modifié.
- Prochaine étape proposée, non implémentée : définir puis tester une dépense
  de sablier reliée à la recharge serveur, avec validation du solde et une
  opération atomique évitant les doubles dépenses. Réactiver seulement le
  bouton actuel pourrait dépenser un sablier sans avancer la réserve réelle.
  Aucun déplacement global XP/niveau/sabliers adopté dans ce diagnostic.
  Diagnostic enregistré dans les documents partagés ; réservation libérée.

---

## Checkpoint courant — mission après un Live Drop en ligne — 11 octobre 2026

- Demande de Malik : l'accueil affiche « Sablier indisponible en ligne » et
  l'objectif du jour reste 0/1 après des ouvertures. Reprise locale sur `main`,
  base `39d0625fa0d4662651ef2bcc5c7bf43b8bce7751`, checkout propre avant
  édition. La première exécution de `git ls-remote --heads origin main` dans
  le bac à sable échouait : connexion au proxy refusée sur le port 8080.
  **Diagnostic rectifié lors de la publication** : la même commande avec
  `sandbox_permissions: require_escalated`, autorisée par le contrôle de la
  plateforme, réussit immédiatement via le même proxy. Le HEAD distant était
  bien identique ; fetch puis push normal réussis. L'erreur provenait des
  restrictions réseau d'exécution, pas d'une panne du proxy démontrée.
- Les captures montrent le Paquet Scène ouvert puis déjà consommé. La règle
  existante ne compte pas Scène dans « Ouvre un booster » : cet objectif suit
  le Live Drop. Un défaut distinct est confirmé pour un vrai Live Drop en
  ligne : le client calcule la mission puis adopte le JSON du serveur, qui
  contient les cartes/réserve mais pas le compteur local de mission.
- Correctif dans `src/lib/cloud/store/pack.ts` : conserver `missionDay`
  et `missions` calculés pour le Live Drop tout en adoptant le reste de la
  sauvegarde serveur. Régression ajoutée à
  `src/lib/cloud/cloud-store.test.ts`. Aucun changement de taux, récompense,
  règle SQL ou donnée Supabase.
- Vérification exécutée sur cette modification :
  `npm test -- src/lib/cloud/cloud-store.test.ts` → code 0, 135/135 ;
  `npm run typecheck`,
  `npx eslint src/lib/cloud/store/pack.ts src/lib/cloud/cloud-store.test.ts`,
  `git diff --check` → code 0. Pas de suite complète, écrans, build ou contrôle
  SQL lancés. Aucun test sur téléphone, compte réel, CI ou déploiement.
- Les sabliers restent indisponibles dans le chemin en ligne conformément au
  périmètre : ils sont locaux, la réserve est autorité Supabase. Les rendre
  utilisables demanderait une décision et une évolution d'autorité serveur ;
  ne pas présenter le libellé comme une panne de réseau.
- **Code publié sur main et SHA distant vérifié** :
  [`bd97f71`](https://github.com/GoodFight37/CreatorDeck/commit/bd97f710d65d6ce59b9415726a3cab2e9011a8cb).
  Les contrôles ci-dessus portent sur le même contenu code/test avant commit.
  Ce checkpoint et les registres communs Cloud/PC sont mis à jour pour la
  publication ; leur commit se retrouve par
  `git log -1 --format=%H -- docs/agent-handoff.md`.
- Reprise réseau : le runtime est running/connected, GitHub figure dans la
  politique souhaitée ; son état rapporté reste unknown, ce qui ne prouve pas
  l'application de toutes les règles. Pour Git, l'essai concret fetch/push
  réussit avec l'exécution réseau autorisée. Conserver proxy/CA et demander
  cette autorisation d'exécution via l'outil en cas de refus du bac à sable ;
  ne pas supprimer le proxy, changer les règles ou recréer l'environnement.
- Contrôle CI tenté après le push :
  `gh run list --repo GoodFight37/CreatorDeck --commit bd97f710d65d6ce59b9415726a3cab2e9011a8cb --limit 3 --json databaseId,status,conclusion,url,headSha`
  → code 1, Forbidden sur api.github.com. Git HTTPS et son push sont confirmés,
  mais cette lecture API distincte reste refusée ; CI distante non consultée.
- Prochaine action : vérifier la CI et la version servie avant le contrôle
  sur téléphone d'un nouveau Live Drop → objectif 1/1. Le correctif n'ajoute
  pas de récupération rétroactive pour les ouvertures passées. Pas de tâche
  produit supplémentaire lancée, réservation de branche libérée.

---

## Checkpoint courant — parcours cadeau après le tutoriel — 11 octobre 2026

- Reprise sur `main` au SHA local/distant `a0eeb7750153e9a1563e67505f384349850d1cd3`. Demande de Malik : trouver un travail autonome pendant qu’il attendra demain pour examiner le Drop/Binder. Le brouillon E2E ancien a servi de base ; le scénario cadeau est maintenant terminé et passe bureau/téléphone simulé.
- Bug d’interface révélé en l’essayant : après « Réclamer mes 5 boosters », un toast vert persistant recouvrait le bouton « Ouvrir un booster cadeau » au retour de la révélation. Le message cadeau et le solde actualisés indiquent déjà le résultat. Toast redondant retiré de `claimAndOpenWelcomeGift`; le bouton reste directement utilisable et le message cadeau conservé. Aucun code tirage/solde/SQL modifié. D-030, K-027.
- Test définitif `e2e/onboarding-gift.spec.ts` : étapes du tutoriel, message absent avant finition, premier claim après fin du tutoriel, **un claim**, cinq RPC d’ouverture ; cinq cartes révèlées pour chacun des cinq boosters, retour au Drop entre eux ; cadeau disparaît à épuisement, réserve normale reste à 2. Chaque réponse RPC est simulée par `page.route`. Le seul hôte configuré est la fixture de format `e2e.supabase.co`; toutes les RPC REST sont interceptées. Aucune connexion au projet CreatorDeck ni écriture production.
- Vérification : `NEXT_PUBLIC_SUPABASE_URL=https://e2e.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=local-e2e-placeholder-key-01234567890123456789 NEXT_TELEMETRY_DISABLED=1 PLAYWRIGHT_BROWSERS_PATH=/workspace/.cache/ms-playwright npm run e2e -- e2e/onboarding-gift.spec.ts --reporter=line` → **code 0, 2/2**, bureau et téléphone simulé, 12,5 s. Premier essai avec `https://example.invalid` n’activait pas le code cloud (URL refusée par le validateur) ; configuration corrigée. Une première assertion vérifiait l’ordre avant l’appel claim, corrigée pour attendre le RPC ; la fixture marque maintenant le cadeau indisponible à 0 ; le toast produit est retiré après qu’il empêchait le clic. Tests définitifs après ces corrections : tous passent.
- `npm run typecheck`, `npm run lint`, `git diff --check` : code 0. `XDG_CONFIG_HOME=/tmp/creatordeck-xdg NEXT_TELEMETRY_DISABLED=1 npm run build -- --webpack` : code 0, export `/`, `/_not-found`, `/overlay`; variables publiques Supabase absentes du build, RPC factices seulement dans E2E. Aucun accès ni changement sur la vraie base.
- La section précédente décrit le checkpoint `4f91c71` avant ce travail et garde son historique. Le test initial non suivi est désormais suivi par Git et plus une tâche suspendue ; sa copie d’archive a été retirée.

**Code publié et distant vérifié** : [`1070153`](https://github.com/GoodFight37/CreatorDeck/commit/1070153eec094be2629025546befa00a1670b761). La vérification précédente comparait `main` au parent `a0eeb77`, puis le push normal et `git ls-remote` confirment ce SHA. Le checkpoint est prêt sur le même HEAD ; la prochaine session doit encore vérifier la CI courante et la version Vercel, non consultées ici. Aucune migration réelle appliquée.

---

## Checkpoint courant — accueil Drop et Binder — 11 octobre 2026

- **Demande active satisfaite côté code** : Malik autorise pendant son sommeil
  l’accueil d’abord, puis la collection, avec une identité visuelle personnelle
  et sans nouvelle confirmation. Retour au PC prévu ensuite : ce document est
  la passation commune Cloud/local. Pas de nouvelle dépendance ou de mécanique.
- Reprise du checkout existant sur `main`, HEAD local/distant vérifié
  `37e34e63b3013e60bd9fa0db9693079cece8049c`. Travail/push sur main autorisés ;
  aucun worktree, merge de PR, branche supprimée ou opération Supabase réelle.
  Aucun autre écrivain observé ; le HEAD distant est resté identique pendant le
  chantier. Relire GitHub actuel à la prochaine reprise.
- **Drop** : titre « Un sachet. Cinq créateurs. », véritable sachet au centre,
  ticket crème pour réserve/compte à rebours/ouverture/garanties, jetons/sabliers
  dépliables. Objectif et activités après l’ouverture, dernières cartes
  consultables avec accès direct au Binder. Tactile sachet, glissement, animation
  d’ouverture et tirage existants conservés. Adaptation aux téléphones courts :
  bouton visible dès l’arrivée à 320 × 568. Fiche récente dans un portail,
  application inert pendant la consultation, focus rendu à la carte après.
- **Binder** : « Dernières reçues », vrais doublons, page partielle avec le
  moins de manquantes d’abord, autres pages repliées. Clic de page affiche les
  slugs réellement manquants de cette saison ; filtre « À découvrir », filtre
  de page explicite/retirable, recherche/tri et pagination 12 conservés. Vide :
  « Retour au Drop ». Pourcentage tronqué : 999/1 000 affiche 99 %, pas 100 %.
- Fichiers produit : `src/components/drop-view.tsx`, `binder-view.tsx`,
  `creator-deck-app.tsx`, `src/app/drop-binder.css`, import dans `layout.tsx`.
  Tests nouveaux : `src/ecrans-drop-binder.test.tsx`, `e2e/drop-binder.spec.ts`.
  `e2e/pack-tear.spec.ts` attend les contrôles déverrouillés avant le test de
  boucle Tab (Perfect verrouille temporairement les boutons). ESLint ignore
  les seuls rapports générés Playwright, déjà hors Git. Décision D-029, K-025/026.

### Vérifications locales de cette livraison

Tests exécutés sur le contenu modifié du checkout, base Git `37e34e6` ; le
commit de livraison enregistré ci-dessous contient ce même contenu vérifié.

| Commande | Résultat réel | Limite |
|---|---|---|
| `XDG_CONFIG_HOME=/tmp/creatordeck-xdg npm test -- --maxWorkers=2` | Code 0, 71 fichiers, 1 109/1 109 | Logique/fixtures, aucune production |
| `npm run ecrans -- --maxWorkers=2` | Code 0, 15 fichiers, 78/78 | jsdom, pas de rendu physique |
| `npm run typecheck` | Code 0 | TypeScript |
| `npm run lint` | Code 0 | Rapports générés exclus, produit contrôlé |
| `node scripts/check-jargon.mjs` | Code 0, aucun jargon d’infrastructure affiché | Textes vérifiés par le script existant |
| `XDG_CONFIG_HOME=/tmp/creatordeck-xdg NEXT_TELEMETRY_DISABLED=1 npm run build -- --webpack` | Code 0, export `/`, `/_not-found`, `/overlay` | Variables publiques Supabase absentes ; compilation sans cloud |
| `git diff --check` | Code 0 | Diff source |

**Navigateur final : code 0, 42 réussis / 2 ignorés, 1,6 minute.** Les deux
scénarios « avec le serveur » demandent une configuration publique Supabase
absente ici ; aucune preuve cloud réelle ou simulée nouvelle pour ces deux.
Les six scénarios nouveaux passent, ainsi que navigation, crash local et
déchirure. Le scénario cadeau ajouté au checkpoint courant est distinct et a ensuite passé 2/2 avec RPC factices.
Commande : `PLAYWRIGHT_BROWSERS_PATH=/workspace/.cache/ms-playwright npm run e2e -- e2e/navigation.spec.ts e2e/pack-crash.spec.ts e2e/pack-tear.spec.ts e2e/drop-binder.spec.ts --reporter=line`.
Serveur réutilisé : `npm run start -- --listen 3000`, export compilé.

Captures locales finales : `/workspace/scratch/drop-binder-polish/final-*.png` :
320 × 568, 412 × 915 et 1280 × 900, accueil vide/rempli, fiche et Binder
possédé/manquant. Captures examinées, pas de débordement horizontal ni pageerror
sur les trois formats. Ce sont des formats simulés Chromium ; aucune nouvelle
validation sur téléphone réel, de son/haptique natifs, Vercel ou compte réel.
Les captures ne sont pas des snapshots versionnés.

Essais intermédiaires : première commande navigateur sans le chemin Chromium
correct a échoué avant les parcours ; avec le bon chemin, 40 réussis/2 ignorés/
2 échecs liés au bouton dev de Next sur un clic inutile de l’onglet déjà actif.
Premier passage export : 39 réussis/2 ignorés/3 échecs : sélecteur Fermer ambigu
dans la fiche et test Tab trop précoce lors d’un Perfect. Sélecteur de l’en-tête
précisé et attente `toBeEnabled` ajoutée, assertions conservées, pas de clic
forcé. Le rerun final à 42/42 exécutés établit la correction. Lint initial : 188 erreurs
dans le visualiseur JS généré des traces, exclu ensuite, lint produit réussi.
Pas de SQL modifié : `supabase:verify` non relancé sur ce chantier d’interface.

### Supabase : état confirmé depuis le checkpoint précédent

Après `37e34e6` et la CA publique intégrée, Malik a répondu **« C’est passé »**
au nouveau dry_run. Succès du contrôle connexion/TLS/projet/historique selon
ce retour ; aucun log final consulté directement par l’agent. Le dry_run ne
applique aucune migration. Ne pas redemander certificat/mot de passe/historique
sans nouvel échec. Une future migration effective reste protégée par CI verte
et le plan de déploiement ; ce chantier n’en ajoute aucune. Ne pas confondre
ce succès avec l’accès réseau de la session Cloud. API GitHub Actions refusée
(`Forbidden`) auparavant : CI/Vercel courants ne peuvent pas être annoncés verts.

### Passation partagée Cloud → PC

1. Lire AGENTS et ce checkpoint sur [main GitHub](https://github.com/GoodFight37/CreatorDeck/blob/main/docs/agent-handoff.md). Vérifier état, branche, HEAD et HEAD distant avant de changer le checkout PC. Ne pas écraser de changements locaux ; fetcher/examiner toute divergence avant mise à jour normale.
2. Prendre le SHA actuel de main, pas un ancien checkout ni le SHA de base mentionné ci-dessus. Les mêmes docs servent au Cloud et au PC ; pas de copie concurrente de la roadmap. Le commit documentaire se retrouve par `git log -1 --format=%H -- docs/agent-handoff.md`.
3. Tester la nouvelle version servie sur le téléphone de Malik : ouverture par tap/glissement, réserve, fiche récente/fermeture/retour, Binder Dernières reçues/page/manquantes ; comparer à l’identité proposée. L’esthétique et la prise en main restent une validation utilisateur. Ne pas déclarer le déploiement déjà fait sans contrôle de la version servie.
4. Le test du cadeau est maintenant suivi dans `e2e/onboarding-gift.spec.ts` et passe en navigateur bureau/téléphone simulé. Le code utilise seulement des URL et RPC factices ; il ne valide pas la base de production.
5. Aucun chantier supplémentaire lancé après ces deux priorités. Ajustements tutoriel/cadeau évoqués restent pour plus tard ; ne pas refaire le reset global. Réservation Cloud libérée à la fin de cette livraison.

**Code publié et SHA distant vérifié** : [4f91c71](https://github.com/GoodFight37/CreatorDeck/commit/4f91c71ff72dd0428044bbc33fce5a47c4cbacfa).
Checkpoint documentaire destiné au commit suivant ; son SHA se retrouve avec
`git log -1 --format=%H -- docs/agent-handoff.md`. CI distante et état Vercel non
consultés, aucune annonce de déploiement effectif. À la fin, seul le brouillon
original non suivi reste dans le checkout ; sa copie documentaire est partagée.

---

## Checkpoint courant — CA Supabase intégrée — 11 octobre 2026

- Reprise main local/distant `4108486ad76bd698be52ab01705ead4e8fd9ff00`, vérifié via ls-remote. Fichier e2e/onboarding-gift.spec.ts non suivi conservé, chantier suspendu, hors commit.
- Malik transmet prod-ca-2021.crt téléchargé de Supabase. Certificat public ajouté à supabase/certificates/prod-ca-2021.crt ; sujet/émetteur Supabase Root 2021 CA, CA:TRUE, expiration 26 avril 2031. OpenSSL verify sur la CA et elle-même : OK ; cela valide sa signature, pas une connexion production ni une chaîne serveur actuelle.
- SHA-256 certificat : 80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA.
- Chargement automatique de la CA depuis le dépôt lorsque SUPABASE_DB_CA_CERT est absent/vide. Aucun nouveau secret à créer. Override PEM conservé si explicitement configuré ; Node et CLI utilisent la même CA, TLS vérifié maintenu. Pas de données/base/secret/réseau modifiés.
- Tests `node scripts/supabase-deploy.test.mjs` **21/21**, code 0 ; ESLint ciblé, --check et diff-check code 0. Empreinte/date, fallback sans secret, override et refus PEM invalide couverts. Aucun build/UI/SQL de jeu relancé, aucun accès production réel ; test navigateur suspendu non publié.
- Prochaine action après publication : nouveau Run workflow [Mise à jour Supabase](https://github.com/GoodFight37/CreatorDeck/actions/workflows/supabase-deploy.yml), main, dry_run cochée, approve_manual décochée, sans attendre CI complète. Ne pas Re-run l’ancien commit. Succès seulement si le log vérifie connexion TLS/projet/historique ; une éventuelle nouvelle erreur d’authentification devra être traitée d’après son code.

## Checkpoint courant — certificat TLS Supabase — 11 octobre 2026

- Malik fournit le nouveau dry_run GitHub : SELF_SIGNED_CERT_IN_CHAIN. Cause désormais prouvée : chaîne TLS non reconnue par le runner ; ce run ne valide pas le mot de passe. Ne plus proposer de changer mot de passe/URL sans une autre erreur.
- Reprise main local/distant `db0c2484cb8e02e65aef33b887fc6f42aef9cd4f`, vérifié via ls-remote. Test cadeau non suivi conservé et suspendu, hors commit.
- Support `SUPABASE_DB_CA_CERT` (contenu PEM) ajouté au workflow/script : certificat CA vérifié avec X509Certificate, transmis à pg avec rejectUnauthorized=true puis au CLI via sslrootcert temporaire privé supprimé même sur erreur. sslmode=verify-full conservé. Aucun certificat reçu ni TLS production validé.
- Documentation officielle Supabase consultée dans GitHub raw : guides database/connecting-to-postgres et platform/ssl-enforcement, section SSL Configuration de /dashboard/project/_/database/settings, Download Certificate. Ne pas changer Enforce SSL (réinitialise la base). Prochaine action : télécharger le certificat officiel du projet, joindre le fichier public à cette session pour installation ou enregistrer son PEM entier dans le secret GitHub SUPABASE_DB_CA_CERT ; nouveau dry_run après configuration.
- Tests `node scripts/supabase-deploy.test.mjs` : **20/20**, code 0 ; ESLint ciblé et --check/diff-check code 0. Test CA système de fixture, mode fichier 0600, même CA Node/CLI, nettoyage réussite/échec, maintien TLS vérifié. Pas d’essai connexion réelle ; aucune migration, donnée, politique réseau ou secret modifié par l’agent. Pas de build/UI/SQL de jeu, produit inchangé.

## Checkpoint courant — diagnostic connexion Supabase — 11 octobre 2026

- Reprise main local/distant `713aea4df6b888a3c2730569698da0ff97cca24d`, vérifié via git ls-remote. Fichier préexistant non suivi `e2e/onboarding-gift.spec.ts` conservé, inachevé, hors commit ; chantier explicitement suspendu par Malik. Aucun autre fichier préexistant modifié.
- Malik confirme mot de passe de base changé (sans caractères spéciaux), secret GitHub mis à jour, puis dry_run échoué avec « Connexion PostgreSQL impossible ; vérifier le secret et l’accès réseau du runner. » Ne pas lui demander de refaire la même configuration sans cause nouvelle.
- Défaut prouvé du script : toutes les erreurs avec `error.code` étaient masquées sous ce texte, empêchant de distinguer mot de passe, TLS, DNS, réseau ou pooler. Ajout de messages fixes classés, sans erreur brute ni paramètre de connexion. Cause réelle du run précédent encore inconnue, car son code a été supprimé du log.
- Diagnostic manuel dry_run sur main courant peut maintenant s’exécuter sans attendre CI et sans CLI Supabase. Il effectue uniquement les lectures de schéma/historique existantes. Les migrations restent derrière CI complète verte ; aucun reset, repair ou SQL produit nouveau.
- Vérifications : `node scripts/supabase-deploy.test.mjs` **17/17**, code 0 avec exécution autorisée (premier run sandbox 16/17 : sous-processus masqué) ; `npx eslint scripts/supabase-deploy.mjs scripts/supabase-deploy.test.mjs`, `node scripts/supabase-deploy.mjs --check`, parsing `yaml.safe_load` du workflow et `git diff --check` : code 0. Aucun build/UI/SQL de jeu relancé : produit inchangé. Aucun accès PostgreSQL production effectué par cette session. Correctif destiné à main ; publication et SHA vérifiables dans Git.
- Environnement Cloud : aucun secret configuré, TCP sans domaine/IP autorisé, politique HTTP état unknown. API Actions : gh run list renvoie Forbidden ; Git HTTPS fonctionne. Ne pas confondre le réseau Cloud avec celui du runner GitHub.
- Prochaine action après publication : [workflow précis](https://github.com/GoodFight37/CreatorDeck/actions/workflows/supabase-deploy.yml) → Run workflow → main, dry_run cochée, approve_manual décochée. Utiliser un nouveau run (Re-run d’un ancien garde son ancien script). Le résultat précis permettra de choisir une correction sans deviner le mot de passe.

## Checkpoint courant — CI navigateur après tutoriel — 11 octobre 2026

- Reprise `main` local/distant `15b0693ff45e2c923a889f8ead658b0e672f8956`, checkout propre. Malik fournit l'échec CI navigateur-cloud : deux scénarios bureau/téléphone échouent (et retries) au clic sur Ouvrir le booster ; la fenêtre Tutoriel CreatorDeck intercepte les événements.
- Cause prouvée : les anciens tests supposent un joueur accueilli ; le mock RPC onboarding_status renvoyait `{}`, interprété tutoriel non terminé. Aucune erreur de connexion Supabase établie par ce job : toutes ses RPC sont simulées.
- Correction des tests uniquement : helper `e2e/fixtures.ts` effectue les trois étapes réelles du tutoriel dans les scénarios locaux, navigation et déchirure. Scénario cloud annonce un joueur ayant terminé le tutoriel avec réponse RPC valide. Assertions d'identifiants serveur, absence de push et persistance conservées ; aucun clic forcé, aucun changement produit ou migration.
- Essai initial du cloud : `CI=true PLAYWRIGHT_BROWSERS_PATH=/workspace/.cache/ms-playwright npm run e2e -- --grep "avec le serveur"` **2/2**, code 0, configuration factice identique à la CI. Fichier factice `.env.local` créé uniquement pour ce run puis supprimé ; aucune clé réelle reçue/lue/committée. Premier essai du helper basé sur marqueurs locaux restait instable au premier chargement dans la suite locale ; abandonné au profit du tutoriel réel. Run interrompu, serveur de ce run arrêté pour libérer le port (aucun autre serveur touché).
- Vérification finale locale : `CI=true PLAYWRIGHT_BROWSERS_PATH=/workspace/.cache/ms-playwright npm run e2e` **36 réussis, 2 ignorés** (scénarios cloud sans configuration), code 0, aucun retry, 2,4 min. `npm run typecheck` code 0 ; `npm run lint` code 0. Même commande ciblée cloud sur le helper final : **2/2**, code 0, aucun retry, 13,7 s, RPC simulées et fichier factice supprimé. Tests Node/UI/build/SQL de jeu non relancés : produit inchangé. Chromium bureau/téléphone simulés, aucune nouvelle validation physique.
- Suite : attendre la CI verte du **nouveau commit**, puis lancer Mise à jour Supabase sur main avec dry_run cochée et approve_manual décochée. Historique 0001–0046 enregistré après preuves et secret GitHub configuré selon Malik ; connexion réelle encore non validée. Ne pas refaire de reset ni toucher au secret pour cet échec navigateur.

## Checkpoint courant — automatisation Supabase — 11 octobre 2026

- Reprise vérifiée sur `main` local/distant `475fdff58f2dcefa15c6d16b3702f51ee34556d1`, checkout propre. Demande utilisateur : préparer maintenant les mises à jour automatiques, publication GitHub autorisée. Aucun autre écrivain détecté.
- Malik indique 0046 appliquée puis confirme le tutoriel sur téléphone. Ajustements remis à demain ; ouverture des quatre cadeaux non explicitement confirmée. Ne plus demander de recoller 0046 sans nouveau contrôle contradictoire.
- Code préparé/testé et publié : [`5be07cedf2e844a6c155902fec1dbcc53f527583`](https://github.com/GoodFight37/CreatorDeck/commit/5be07cedf2e844a6c155902fec1dbcc53f527583). CI GitHub déclenchée par push mais résultat non consulté.
- Préparé : workflow `.github/workflows/supabase-deploy.yml`, script `scripts/supabase-deploy.mjs`, empreintes historiques `supabase/deploy-baseline.json`, 15 tests Node et contrôle ajouté au job quality existant. Déploiement uniquement après CI verte de main, révision courante, cible CreatorDeck vérifiée, TLS ; CLI officiel, historique standard, nouvelles migrations uniquement. Mode manual nécessite lancement explicite. Pas de SQL appliqué lors de la préparation.
- Retour opérateur : table standard présente, versions 0001–0042. Contrôle lecture seule des empreintes des fonctions finales 0043–0046 : toutes conformes ; marqueur/reset/tables cadeau déjà établis par les contrôles précédents. Malik a enregistré uniquement les versions manquantes 0043–0046 (`insert version on conflict do nothing`) et fourni les quatre lignes ; aucun SQL produit rejoué. Il indique avoir enregistré le secret GitHub SUPABASE_DB_URL. Aucun secret reçu dans le chat.
- **Activation à valider par connexion réelle** : ajout d'une option `dry_run` cochée par défaut pour les lancements manuels. Ce mode force la connexion et lit schéma/historique même sans nouvelle migration, sans appel du CLI de déploiement. Summary GitHub affiche la réussite de connexion/TLS/projet/historique. Sans nouveau fichier le chemin automatique reste sans accès base.
- Commandes : `node scripts/supabase-deploy.test.mjs` **15/15**, code 0 avec exécution autorisée (premier run sandbox : 14/15, sortie du sous-processus masquée) ; `node scripts/supabase-deploy.mjs --check` code 0 ; `node scripts/supabase-deploy.mjs` code 0 (aucune nouvelle migration/aucun SQL) ; `npm run lint` code 0 ; parsing Python `yaml.safe_load` des deux workflows valide. UI/typecheck/build/SQL de jeu non relancés, produit inchangé. Aucun test réel du CLI ni run GitHub observé.
- Prochaine action : après CI verte du HEAD courant, Actions → Mise à jour Supabase → Run workflow sur main, **dry_run cochée**, approve_manual décochée. Attendre le log « Connexion TLS, projet CreatorDeck et historique vérifiés » : une simple coche verte/no-op ne suffisait pas. Aucun run GitHub réel déclenché/observé par l'agent ; accès Actions API non disponible ici. Instructions/liens : [mises à jour automatiques](mises-a-jour-automatiques.md).
- Vercel reste indépendant ; configuration réellement active et ordre SQL/publication non contrôlés. Pas de promesse que le déploiement attend Supabase. Les futures migrations doivent être compatibles avec le client actuellement servi.

## Checkpoint courant — replay du tutoriel après reset — 11 octobre 2026

- Reprise sur `main` local et distant `5053dbba7869f2897b70f8fa8c3e6543e82c8252`, checkout propre. Session Cloud seule, travail/push sur main autorisés ; aucune PR fusionnée, branche supprimée ou migration production exécutée par l'agent.
- Contrôle SQL transmis par Malik : 0045 active ; le compte ayant ouvert le premier cadeau conserve **4 boosters**, claim acquis et une ouverture ; les autres comptes ont 5 non réclamés. Aucun cadeau perdu établi. Ne plus demander de recoller 0045 ni rejouer 0044.
- Demande nouvelle : le bouton « Réinitialiser la progression » doit permettre de rejouer le tutoriel puis retrouver le message cadeau. Cause confirmée : `reset_progress()` (0017) ne touchait pas `onboarding_state`, et les deux marqueurs locaux restaient « done ».
- Code testé et publié : [`f179362dc94327750cd058768602eb11f23e4041`](https://github.com/GoodFight37/CreatorDeck/commit/f179362dc94327750cd058768602eb11f23e4041). Le checkpoint documentaire se retrouve avec `git log -1 --format=%H -- docs/agent-handoff.md`. Aucun autre écrivain détecté.
- Correction : migration additive/idempotente `0046_reset_rejoue_tutoriel.sql` remplace `reset_progress()` en conservant son comportement et efface uniquement la fin du tutoriel du compte connecté. Son application ne réinitialise personne. Aucun solde cadeau, claim ou journal cadeau modifié. Pas de nouveaux cinq boosters après reset, y compris cadeau épuisé.
- Le store relit le statut après reset ; l'écran rejoue l'étape 1 sur Drop après réussite (ou reset local), efface les deux marqueurs locaux, et garde le tutoriel inchangé en cas d'échec serveur. Une fois terminé, le cadeau restant et son message sont accessibles ; les ouvertures utilisent le moteur existant.
- Vérifications locales : `XDG_CONFIG_HOME=/tmp/creatordeck-xdg npm test` **71 fichiers, 1109/1109**, code 0 ; `npm run ecrans` **14 fichiers, 75/75**, code 0 (dont reset local et compte connecté simulé : tutoriel puis message/quatre cadeaux, sans nouveau claim) ; `npm run typecheck` code 0 ; `npm run lint` code 0 ; `npm run build -- --webpack` code 0, export /, /_not-found, /overlay, sans variables publiques Supabase. Premiers essais de développement ont détecté un callback mal placé et un mock incomplet, corrigés avant ces résultats. `npm run supabase:verify` **624/624 contrôles**, code 0, PostgreSQL jetable (exécution autorisée pour ses sockets locales). Aucun essai sur téléphone réel ni validation Vercel.
- L'environnement runtime ne possède aucun secret configuré ; réseau restreint, état d'application de la politique `unknown`. Git HTTPS fonctionne avec exécution autorisée. Ne pas annoncer l'accès production Supabase ou le déploiement.
- Prochaine action opérateur après publication : copier **0046 uniquement** depuis GitHub dans le SQL Editor du projet CreatorDeck déjà vérifié `yzxchpybqrfegvecihxf`, attendre `Success`, puis utiliser le nouveau build : Toi → Réinitialiser la progression → tutoriel trois étapes → message cadeau et quatre boosters restants. Vérifier le compte connecté et la version servie. L'agent n'a appliqué aucune migration réelle.

## Checkpoint courant — bug claim cadeau en production — 11 octobre 2026

- Retour de Malik : après le tutoriel, « Réclamer » lance le premier booster ; les clics suivants affichent « cadeau déjà réclamé » malgré quatre boosters restants.
- Cause reproduite par inspection : `claimAndOpenWelcomeGift()` appelle toujours `claim_return_gift()` avant `open_return_gift_pack()`. Le RPC 0044 rejette un second claim. Ce n'est pas un défaut du solde `boosters_remaining` ni du tirage.
- Malik indique avoir collé la migration 0043 puis 0044 dans le SQL Editor. Le contrôle lecture seule reçu : marqueur `tutoriel-cadeau-2026`, `tutoriels=16`, `cadeaux=16`, `tirages_restants=0`, `cartes_restantes=0`, `echanges_ouverts=0`, `annonces_ouvertes=0`. Le reset est confirmé par les compteurs transmis. Le forfait gratuit ne propose pas de snapshots de projet.
- Branche `main`, commit local et distant vérifié `9710bafd0c7400874e3c904ca9aff0d87abae29e` (`fix: allow opening remaining return gift packs`), dépôt propre. Le push vers GitHub a réussi. Statut Vercel/déploiement non vérifié ; ne pas prétendre que le build est déjà servi aux joueurs.
- Correction préparée localement : nouvelle migration `0045_cadeau_claim_rejouable.sql` rend le RPC de claim idempotent sans recréditer, et renvoie `gift_claimed` d'après `claimed_at`. Le client met ensuite le bouton en mode « Ouvrir un booster cadeau ». Le SQL 0045 résout le blocage même pour le build client actuel ; le nouveau client apporte le libellé clair.
- Vérifications locales sur le code modifié : `XDG_CONFIG_HOME=/tmp/creatordeck-xdg npm test` **71 fichiers, 1 109/1 109** ; `npm run ecrans` **13 fichiers, 73/73** ; `npm run typecheck` code 0 ; `npm run lint` code 0 ; `npm run supabase:verify` PostgreSQL jetable : « Toutes les vérifications passent », y compris claim répété après l'ouverture 1, stock à 4, puis cinq ouvertures valides ; `npm run build -- --webpack` code 0 après autorisation d'écrire le fichier de config Next dans `$HOME`. Build sans variables publiques Supabase : compilation UI seulement, sans cloud embarqué. Premier build sandbox bloqué EROFS, première SQL sandbox bloquée par les sockets ; les reruns approuvés ont réussi.
- Prochaine action opérateur : ouvrir [0045 sur GitHub](https://github.com/GoodFight37/CreatorDeck/blob/main/supabase/migrations/0045_cadeau_claim_rejouable.sql), copier son contenu dans SQL Editor du projet `yzxchpybqrfegvecihxf`, obtenir `Success`, puis vérifier que `onboarding_status()` renvoie `gift_claimed=true` et que `claim_return_gift()` après le premier tirage répond sans erreur avec `boosters_remaining=4`. Ne pas rejouer 0044. Le code client est publié ; vérifier le déploiement Vercel séparément.

## Passation vers la session Cloud — 11 octobre 2026

### Où reprendre

- **État GitHub vérifié via l’application GitHub** : le dépôt ne contient qu’une branche, `main`. Le dernier commit observé est `7ec7bfa84addc70781ea96409031c64eda831169` (« Document commit-based app version »), après le code `152c2173606037460f01b8de66f94b24bb720dc6`. PR #7 est intégrée et PR #8 fermée comme obsolète. La page et les fichiers de coordination sur `main` ont été lus.
- Le shell du présent environnement ne résout pas `github.com` (`git ls-remote` échoue DNS). La consultation et la mise à jour de cette passation se font par le connecteur GitHub ; ne pas prétendre que le checkout local est synchronisé.
- **Checkout local de cette session** : branche `main`, HEAD ancien `2c9b6c4ae98898711bb6041c2297b17ac2a1a312`, en retard sur GitHub. Il contient dix fichiers modifiés non commités (AGENTS.md, e2e/pack-tear.spec.ts, CSS et composants/sons du chantier booster). Ils ne sont pas inclus dans GitHub ; ne pas les écraser ni les considérer comme base de reprise Cloud. Le dossier est `work/CreatorDeck` dans l’espace Codex Documents.
- Cette session n’a réalisé **aucun changement applicatif** pour la demande ci-dessous. Seuls les documents de passation, roadmap et décisions sont actualisés ; aucune migration de production n’a été lancée, aucune clé ni donnée de joueur consultée.

### Demande en cours — à implémenter

L’utilisateur a autorisé directement le travail sur `main` et veut :

1. Un tutoriel de première partie dans une fenêtre moderne, court et clair, qui explique la boucle de départ.
2. Remettre à zéro la progression de **tous** les comptes, y compris celui de Malik, pour que tous repartent comme des nouveaux joueurs ; garder les comptes/identités/profils et amis. Garder l’historique des échanges terminés et des ventes terminées ; annuler les échanges en attente et retirer les annonces de marché encore actives. La progression de jeu à remettre à zéro comprend collection/cartes, réserve et tirages, monnaie et ressources, missions/série/jours, Paquet Scène et progression d’arène.
3. Après le tutoriel seulement, envoyer à chaque compte un cadeau unique de **cinq boosters**, dans une boîte/carte cadeau ou le carnet. Texte à afficher : « Malik a décidé de réinitialiser la progression de tout le monde pour implémenter le tutoriel et vous offre 5 boosters. » Le cadeau doit être réclamable une seule fois, ne pas apparaître dans le tutoriel et être indépendant de la réserve normale.
4. Corriger la fin d’ouverture illustrée par le screenshot utilisateur : retirer « Rouvrir un booster » comme action immédiate ; afficher **« Retour au Drop »** après le récapitulatif, sans ouvrir le booster suivant depuis la révélation.

Aucun changement de taux, récompenses existantes ou règles de tirage. Le cadeau est la récompense nouvelle explicitement demandée. Ne pas supprimer les comptes/profils/amis ni les historiques terminés. Le reset global est une opération irréversible : implémenter une migration additive et la vérifier entièrement sur PostgreSQL jetable avant toute application. L’utilisateur a explicitement demandé le reset de tous, y compris lui-même ; avant une exécution réelle, vérifier le projet Supabase cible et son état, et s’arrêter si l’identité de la cible ou la possibilité de sauvegarde/récupération est incertaine. Aucune clé de service côté client et ne pas lire `.env.local`.

### Point d’attention sur la base de code

La passation précédente de la première boucle UX mentionne que le résumé de révélation appelle actuellement « Rouvrir un booster » lorsque la réserve le permet (code d’alors `1769636`). Vérifier ce comportement dans le code **courant** de `main` avant de corriger ; ne pas supposer que le vieux checkout représente le HEAD GitHub. L’interface doit retourner au Drop et laisser le joueur lancer une autre ouverture depuis l’accueil.

Pour le cadeau, garder l’autorité serveur : RPC protégées, stock cadeau distinct, claim idempotent et ouverture qui utilise le moteur actuel sans contourner le tirage normal. Ajouter des tests UI/API et des régressions SQL montrant le reset exact, la conservation des identités/historiques, l’ordre tutoriel puis cadeau, l’unicité du claim et cinq ouvertures valides. Si l’ouverture du stock cadeau ne peut pas être raccordée proprement au moteur existant, résoudre et vérifier ce point avant de déclarer le chantier terminé.

### Prompt prêt à coller dans la session Cloud

> Reprends CreatorDeck depuis GitHub sur `main`, synchronise d’abord le checkout sur le HEAD courant (la dernière tête vérifiée était `7ec7bfa84addc70781ea96409031c64eda831169`, mais vérifie à nouveau), puis lis `AGENTS.md`, `docs/agent-handoff.md`, `docs/roadmap.md`, `docs/decisions.md`, `docs/known-issues.md`, `docs/perimetre.md` et `docs/historique-livraisons.md`. Préserve les changements locaux déjà présents dans ton checkout.
>
> Implémente le tutoriel de première partie, le reset global one-shot de toute la progression (y compris mon compte), et le cadeau serveur unique de cinq boosters, disponible seulement après le tutoriel avec une boîte de réception/carte cadeau affichant le message de Malik. Garde comptes, identités, profils, amis et historiques de ventes/échanges terminés ; annule les échanges en attente et retire les annonces actives. Le reset inclut collection, réserves/tirages, monnaies/ressources, missions/série, Paquet Scène et progression d’arène. Corrige aussi le récapitulatif post-ouverture : CTA « Retour au Drop », sans « ouvrir le prochain booster ». Aucun autre taux, récompense ou règle de tirage ne change.
>
> Fais une migration SQL additive, testée sur Postgres jetable, avec vérification explicite des tables et de tous les compteurs remis à zéro et conservés. Le cadeau doit utiliser le moteur de tirage actuel, être distinct de la réserve normale et être réclamable une fois. Mets les tests, docs de décisions, roadmap, known issues et cette passation à jour. Exécute les tests projet, écrans, typecheck, lint, build et `npm run supabase:verify`, en donnant commandes, SHA et résultats exacts. Aucun accès à la production ni déploiement automatique : avant d’appliquer la migration à la vraie base, revérifie le projet cible, le schéma courant et la sauvegarde ; arrête-toi si une incertitude subsiste. N’intègre pas une PR et ne supprime aucune branche.

### Suite immédiate

La session Cloud doit créer/actualiser son checkout depuis le `main` GitHub courant, puis commencer par le diff actuel de `reveal-overlay.tsx`, `creator-deck-app.tsx`, le flux cloud des boosters et les migrations `0043`+. Elle ne doit pas récupérer les dix modifications non commitées de l’ancien checkout sans les examiner séparément.

---

## Checkpoint courant — version visible du build, 10 octobre 2026

- Branche `main`, tête locale [`152c2173606037460f01b8de66f94b24bb720dc6`](https://github.com/GoodFight37/CreatorDeck/commit/152c2173606037460f01b8de66f94b24bb720dc6), enfant de `7b2d89a7ebffa5ba102867393357d1aab3931021`. Le commit code est local et reste à pousser avec cette passation après re-fetch/compare. Aucun autre fichier applicatif modifié.
- Toi affiche « Version abc1234 » sous l’édition du catalogue, en gris discret. La version provient de `VERCEL_GIT_COMMIT_SHA` ou `GITHUB_SHA`, avec repli sur `git rev-parse HEAD` pour un build local/Android. Sans SHA valide, le libellé affiche « Version locale ». Le SHA complet est dans l’infobulle ; aucune clé ni variable secrète n’est incluse. D-018 consigne le choix.
- Vérifications sur le code du commit `152c217` : écran Toi **5/5** ; `src/lib/build-version.test.ts` **2/2** ; `npm run typecheck`, `npm run lint`, `npm run build` réussis. Le bundle local généré contient bien `152c217`, vérifié dans `.next/static/chunks` et `out/_next/static/chunks`. Pas de nouvelle suite complète (quatre échecs préexistants `K-015` restent consignés). Vercel n’a pas encore construit ce SHA ; la build locale ne prouve pas le déploiement.
- Après push : contrôler le statut Vercel et que le commit SHA du déploiement correspond au SHA distant ; ensuite la valeur visible attendue est `Version 152c217` (ou les sept caractères du commit final si le commit documentaire est inclus dans le déploiement). Les workflows GitHub Actions ne sont pas établis pour ce commit.

## Historique — deuxième passe UX de démarrage, 10 octobre 2026

- Branche `main`. Code UX au commit [`09487de4791058db7f09e30f4dd00ebde8b9bcb7`](https://github.com/GoodFight37/CreatorDeck/commit/09487de4791058db7f09e30f4dd00ebde8b9bcb7), enfant de `3b4a56867b98f763d29f157c659562ed82454d9f`. L’utilisateur a explicitement autorisé le travail direct sur `main`. Fetch avant édition : local et distant étaient égaux à `3b4a568`; le code est commit local, la documentation de ce checkpoint reste à publier. Aucun `gh`/contrôle Actions exécuté ici. Aucun secret lu, aucune production Supabase consultée ou modifiée.
- Deuxième passe UX : Atelier réduit à une progression `N / 10` jusqu’à dix copies recyclables, sans listes vides ni catalogue de 1000 ; raccourci Retour au Drop. Toi cache les statistiques à zéro, montre une vitrine locale des trois meilleures cartes possédées et l’état de série. Drop expose en haut une mission quotidienne déjà présente dans le moteur et renvoie à l’écran de missions existant. Aucune récompense, règle d’économie, dépendance ou règle serveur n’a changé. D-017 consigne ces choix.
- Première passe au commit `1769636dab8069486f64dff3ed81404eb0e86bb6` : Binder « Obtenues », catalogue 12 cartes/page, invitation d’ouverture à zéro, résumé de fin de paquet avec CTA de réouverture ; son/reflets actifs par défaut si le joueur n’a pas enregistré OFF, avec `prefers-reduced-motion` conservé.
- Fichiers du second lot : `src/components/atelier-view.tsx`, `creator-deck-app.tsx`, `drop-view.tsx`, `profile-view.tsx`, `src/app/globals.css`, tests `src/ecrans-mille-cartes.test.tsx` et `src/ecrans.test.tsx`. `docs/decisions.md` D-017, roadmap et présente passation documentent l’état.
- Vérifications après le second lot : `npm run ecrans` **72/72** ; tests ciblés après ajout des assertions profil vide **13/13** ; `npm run typecheck`, `npm run lint`, `npm run build` passent. `npm test` : **1102/1106**, quatre échecs : rejouabilité `supabase-profil.test.ts` (3 occurrences contre 2), seed saisons désynchronisé, seed catalogue désynchronisé et assertion de forme du SQL catalogue. `npm run catalog:ci` code 1 : `0003_catalogue.sql` dérive de `creators.json`. Ces incohérences de données/migrations restent hors du chantier UX ; aucun fichier généré n’a été réécrit.
- Les choix simples du retour produit sont couverts par deux passes. Restent UX-03 : rendre plus évidents les éléments sociaux déjà existants, évaluer badges/avatar et uniformité des portraits sans inventer de contenu ou de règles, puis vérifier les rappels déjà configurés avant d’ajouter quoi que ce soit. K-005/VIS-01 nécessite toujours un avis sur téléphone réel. Vercel a construit le commit `427229f` en prévisualisation READY (`target: null`), alias `creator-deckk-git-main-hafsi37-2386.vercel.app`, et son statut combiné est `success`. L’outil de workflow GitHub ne retourne aucun run associé ; les Actions restent donc non vérifiées. Ce n’est pas une preuve de déploiement Production.
- Prochaine action technique autonome : publier le commit code et le checkpoint documentaire sur `main` après re-fetch/compare du HEAD distant, puis vérifier `ls-remote` et l’état propre. Le SHA code est explicite ci-dessus ; le SHA contenant ce handoff sera trouvé avec `git log -1 --format=%H -- docs/agent-handoff.md`.

## Historique — première boucle UX de collection, 10 octobre 2026

- Branche `main` ; le chantier UX est publié au commit [`1769636`](https://github.com/GoodFight37/CreatorDeck/commit/1769636dab8069486f64dff3ed81404eb0e86bb6), enfant de `81e964443673951bccc84af0b9b01354c1b63f25`. Le SHA distant a été vérifié identique après le push et le dépôt est propre. L’utilisateur a autorisé le travail direct sur `main`. `gh` n’est pas installé et les pages Actions n’étaient pas accessibles : l’état CI n’a pas été vérifié. Aucun accès à Supabase de production, aucun secret consulté.
- Retour produit traité : le Binder démarre sur « Obtenues » ; à zéro carte, il n’affiche ni `0 / 1000` ni pager, propose d’ouvrir un booster et garde un bouton explicite vers le catalogue. Le catalogue utilise 12 cartes par page.
- Après la dernière révélation, le jeu affiche un résumé avec les cinq cartes et le nombre de nouvelles. « Rouvrir un booster » appelle le vrai flux de tirage quand `game.player.packs > 0` ; sinon le bouton revient au Drop. L’overlay OBS conserve sa fermeture actuelle. Les silences, le verrou Perfect, les animations d’ouverture et les sons ne changent pas.
- Le son est actif par défaut lorsqu’aucune préférence n’est enregistrée ; les reflets sont actifs par défaut si `prefers-reduced-motion` ne les coupe pas. Les choix locaux explicites restent respectés. La prévisualisation Vercel déjà observée peut mémoriser un ancien choix OFF ; ne pas l’effacer automatiquement.
- Fichiers applicatifs : `src/components/binder-view.tsx`, `src/components/reveal-overlay.tsx`, `src/components/creator-deck-app.tsx`, `src/app/booster-continuity.css`, `src/app/globals.css` et tests UI/son. D-016 consigne le choix.
- Validation : tests ciblés écrans 20/20 et son/reflets 32/32 ; écrans complets 71/71 ; typecheck, lint, build Next OK. `npm test` complet a quatre échecs hors de ce chantier : test de rejouabilité `supabase-profil` (3 occurrences contre 2 attendues), synchronisation du seed saisons, synchronisation du seed catalogue et assertion de forme du SQL catalogue. Ces contrôles ne sont pas corrigés ici. Build local sans variables cloud utilisables ; aucun flux serveur réel testé.
- Suite proposée déjà autorisée par le retour fourni : UX-02, limiter le bruit du Craft avant dix doublons, renforcer l’identité collectionneur dans Toi, et montrer un objectif court sur Drop ; préserver les règles d’économie et les contrats serveur. La validation au téléphone réel reste distincte des tests UI.

## Historique — polish d’ouverture des boosters, 10 octobre 2026

- Le code applicatif est sur `main` au commit `d0f4765ed050db54b4f85626ea7f2c03fd7e9f68` ; l’utilisateur a autorisé le travail direct sur `main`. Le stash `préserver état local avant chantier visuel main` reste intact. Aucun secret n’a été lu et aucune base Supabase n’a été consultée ou modifiée.
- Chantier demandé : volume CSS du sachet d’accueil et du sachet ouvert, inclinaison au doigt soumise à `cardEffectsAllowed()`, specular CSS, plis physiques et fente lumineuse, cascade 3D des cinq dos en 765 ms environ, carte révélée plus grande/plus profonde et hiérarchie commune → rare → épique → légendaire. Le Rare a un halo bordeaux sans flash blanc. Aucun changement de taux, récompense, économie ou de dépendance.
- Le son de déchirure a une descente de fréquence longue ; son départ et le bang restent attachés au geste et au `--rare-delay` existants. Les constantes 520 ms de silence Épique, 2,6 s de verrou Perfect et 1,9 s avant RevealOverlay n’ont pas changé.
- Validations sur le dépôt original : typecheck OK ; tests UI **70/70** ; build Next OK. E2E Playwright bureau **11/11** a passé avant le dernier ajustement de pose CSS ; les relances focalisées après cet ajustement sont restées suspendues au serveur Playwright local et ont été interrompues sans résultat. La suite complète affiche 4 échecs hors des fichiers du chantier : graines catalogue/saisons non synchronisées et comptage `add column if not exists` Supabase. Le run mobile et le rendu réel sur téléphone restent à confirmer avant de clôturer VIS-01.
- Le commit `d0f4765` a un déploiement Vercel `READY` accessible par l’alias de branche `creator-deckk-git-main-hafsi37-2386.vercel.app`. C’est une prévisualisation (`target: null`). Le déploiement Production du projet pointe toujours vers `arena/01a10c75-creatordeck` ; aucun domaine de production n’a été remplacé dans ce chantier.
- Aucun changement serveur ni cloud ; le contrôle cloud du build indique que les variables publiques ne sont pas injectées dans ce build local.

## Checkpoint courant — roadmap et parité Scène, 10 octobre 2026

### État GitHub et portée

- Branche de référence : `main` ; la liste GitHub ne contient que cette branche. Tête du code consolidé : `2c9b6c4ae98898711bb6041c2297b17ac2a1a312`. PR #7 intégrée ; PR #8 fermée comme obsolète. Les commits documentaires de ce checkpoint suivent ce commit sans changer l'arbre applicatif.
- L'utilisateur demande une collaboration autonome : consulter l'état courant et la roadmap, faire d'office les tâches ordinaires à faible risque, ne pas demander un « go » à chaque étape. Demander seulement lorsqu'un vrai choix produit est nécessaire ou qu'une action touche la sécurité, les secrets, une base en production, ou une opération destructive/irréversible. Travailler directement sur main est autorisé dans le cadre de cette demande.
- Aucune base Supabase en production, clé ou donnée de joueur n'a été consultée ou modifiée.

### Résultats établis

- Parité Paquet Scène : la migration additive 0043 et le moteur local suivent les règles de cinq créateurs distincts d'une famille, sans Légendaire ; événement Scène pleine à 3/1000 ; Épiques disponibles utilisés puis autres raretés autorisées ; candidat Rare/Épique réservé au cinquième emplacement ; familles incompatibles refusées.
- Le dépôt consigne 35/35 tests ciblés et 559 contrôles SQL réussis sur PostgreSQL jetable sous WSL, migrations 0001–0043 comprises. Le test inclut familles avec peu ou zéro Épique, ouvertures du paquet et refus des familles incompatibles. Résultat fourni par l'utilisateur et repris dans la passation/roadmap ; cette session n'a pas exécuté ces tests.
- Audit local de progression : 12 scénarios × 1 000 trajectoires, graine `20261010`, zéro paquet manquant, sur le code `7da3d1c301c949e6cbeaef6aecd6ec0c94ffe2f1`. Il reste un audit TypeScript local, pas une comparaison des RPC de progression.
- Sur l'arbre applicatif de `53e6127d21a8e5d5ec173bfbe1b29e79d5f097c0` (identique à l'arbre de code consolidé), 70 fichiers / 1 104 tests, typecheck et build ont réussi. Le workflow GitHub Actions #261 a réussi sur le commit documentaire `1b4efef` avec ses quatre jobs (qualité/build, E2E, SQL jetable, cloud simulé) ; le contrôle Vercel de ce commit est vert. Le run #260 avait également réussi sur le même arbre applicatif. Les commits depuis la consolidation sont documentaires ; le code du jeu n'a pas changé.
- La roadmap et le rapport de progression ont été actualisés pour séparer l'état historique du premier audit des validations postérieures. Le SHA courant du document de passation sera retrouvé dans Git par `git log -1 --format=%H -- docs/agent-handoff.md` ; ne pas l'auto-référencer ici.

### Ce qui reste réellement ouvert

- VIS-01 : verdict humain sur téléphone réel (soudure accessible à une main, rendu/rythme, reflets et animations réduites). Les tests automatisés ne remplacent pas cette appréciation.
- CI GitHub courante : statut Vercel vert, mais résultat GitHub Actions complet non établi.
- CLOUD-01 (schéma/parcours du vrai projet Supabase) reste en attente d'une autorisation explicite ; ne pas contacter ni modifier la production spontanément.
- Aucun nouveau taux, récompense ou chantier produit n'est décidé. Si la suite nécessite une préférence de gameplay ou une validation subjective, présenter ce choix une seule fois, après avoir terminé le travail indépendant.

### Actions de documentation effectuées

- `docs/roadmap.md` : commit `1b4efef12987d504c8caefb451d92a5fbb3a04bd` ; les cases déjà couvertes par l'audit et les tests automatisés sont cochées, les dépendances externes restent ouvertes.
- `docs/audit-progression.md` : commit `7a89ece59931656da7e2ea71b20e5550e2349f70`.
- Résultat GitHub Actions #261 vérifié après écriture : quatre jobs réussis sur `1b4efef` ; le contrôle Vercel est aussi vert. Le run #260 sur le code courant avait déjà réussi ses quatre jobs.
- Modifications limitées à la documentation ; aucun test de code n'a été lancé dans cette session, car aucun checkout du dépôt n'est présent dans l'espace local.

---

## Point de reprise SQL - validation locale terminee, 10 octobre 2026

Branche design/booster-reveal-polish. Le correctif SQL et les deux ajustements du banc sont valides ; ils sont inclus dans le commit de finalisation de cette reprise.

Validation executee dans la distribution WSL Ubuntu de l'utilisateur, sous creator : tests cibles 35/35 ; migrations 0001 a 0043 appliquees sur PostgreSQL jetable ; tous les controles du script reussissent, sortie finale "Toutes les verifications passent." Les cas S02/S03/S05/S07/S08 (branches normale et Scene pleine), fixture sans Epique, cinq cartes distinctes, interdiction du Legendaire, garantie finale et ouvertures open_scene_pack sont couverts. Aucun acces de production ni secret utilise.

Le run a expose deux problemes de fixture : le nom depassait la contrainte du profil, puis un refus SQL attendu annulait la transaction de fixture. Les deux sont corriges ; le savepoint isole maintenant le refus. Tests, typecheck, build, syntaxe Node et diff-check reussis. Le code et la documentation sont commit/push sur la branche ; ne pas fusionner la PR ni toucher main ou production.

## Audit final reçu — 10 octobre 2026

L'utilisateur a fourni `audit-1000.txt` après `git pull` du commit `7da3d1c301c949e6cbeaef6aecd6ec0c94ffe2f1`. Vérification : commande et graine attendues, TZ Europe/Paris, Mulberry32, 12/12 scénarios à 1 000, 12 000 trajectoires, zéro `missingPacks`. Résultats détaillés et SHA dans [audit-progression.md](audit-progression.md) et [progression-manifest.json](audits/progression-manifest.json). Supabase local reste non vérifié ; aucun changement de production.

# Passation opérationnelle CreatorDeck

## Checkpoint courant — retours après publication, 11 octobre 2026, Europe/Paris

Malik a confirmé dans la conversation : défilement sans ouverture accidentelle
(K-036), progression de l’objectif après Live Drop (K-028), cadeaux restants
sans toast gênant (K-020/K-027) et visibilité des changements récents dans
l’application (K-003). Pour le Paquet Scène (K-037), la fausse disponibilité et
le refus clignotant sont corrigés ; reste une demande UX distincte : le texte
« Reviens demain (nouvelle journée à 6 h UTC) » est jugé trop long et trop rouge.
Ne pas traiter comme bug de disponibilité. Pour l’ouverture visuelle du booster
(K-005/K-038), Malik demande une analyse externe par Grok avant de demander une
modification ; avis subjectif encore ouvert, aucun résultat Grok connu.

L’état produit décrit dans ce retour correspond au code `980bdf8` et au checkpoint
documentaire `b3828d5` publiés sur `main` ; CI référencées vertes. Les notes de
roadmap et de problèmes connus ont ensuite reçu les statuts ci-dessus dans le
checkout local `d263756` et ses modifications non encore publiées. Pour tout
travail ultérieur, vérifier l’état Git courant avant de supposer que ce dernier
checkpoint documentaire a été publié.

## Archive — sachet compact et appui accueil, 10 octobre 2026, Europe/Paris

- Demande utilisateur après essai sur son téléphone : paquet d'ouverture trop
  grand, soudure difficile à atteindre à une main ; appui sur le sachet de
  l'accueil sans effet. Cinq vidéos Pokémon TCG Pocket reçues et examinées
  (main.mp4, main (1/2/3).mp4, Pokemon-TCG-Pocket-figure1-2.mp4) : références
  de cadrage, déchirure horizontale et manipulation des cartes. Aucun média
  Pokémon ajouté au produit. Correction autorisée par le « Go » après pause
  pour changement de modèle. Réservation libérée.
- Checkout existant `/workspace/CreatorDeck`, branche `design/booster-reveal-polish`,
  initialement propre. Base locale/distante identique `34ffd32dda2e1f0941d674e813f4dbc4a9591b98`.
  PR #8 relue via HTML : DRAFT, base `arena/01a10c75-creatordeck`, même tête.
  Aucun main, worktree, merge, changement d'économie ou de règles réseau.
- Code corrigé et testé : `0beb6b37027ced0630ed828604754aed17f7ffb7`.
  [Commit](https://github.com/GoodFight37/CreatorDeck/commit/0beb6b37027ced0630ed828604754aed17f7ffb7).
  Le sachet accueil est un bouton accessible ; appui/clavier et tirage vers le
  haut ouvrent le même parcours. Les clics générés après un glissement sont
  ignorés, le geste annulé reste sans ouverture. Le focus revient au sachet,
  ou au titre Live Drop quand le dernier booster a été consommé.
- Cause du paquet géant prouvée dans le CSS : sa largeur était la largeur carte
  divisée par .72, soit environ 94 % de l'écran téléphone. Largeur maintenant
  indépendante : min(64vw, 280px, 30dvh). À 412×915 : paquet 263,67×386,72 px,
  soudure centrée à y=451,97 px (49,4 % de la hauteur). Les cartes grandissent
  pendant l'extraction et finissent à la taille/position de la révélation.
  Tracé accepté dans les deux sens, seuil 55 % de la largeur, zone haute de
  58 px et bouton de secours conservés. Accueil plus compact sur petit écran.
- Vérification finale : `PLAYWRIGHT_BROWSERS_PATH=/workspace/.cache/ms-playwright
  NEXT_TELEMETRY_DISABLED=1 node node_modules/@playwright/test/cli.js test
  e2e/pack-tear.spec.ts --reporter=line` : **code 0, 20/20**, 1,2 min,
  bureau et téléphone. Appui touch réel Chromium, clavier, réserve diminuée
  une seule fois, tirage abandonné/armé, tracés touch CDP dans les deux sens,
  cancel de soudure, géométrie 320×568/360×800/412×915, continuité, animations
  réduites et focus Live/Scène. Test de continuité mesure désormais le dos
  extrait à la fin de son animation, plutôt que le centre du sachet scellé.
- `npm run ecrans -- src/ecrans-tactile.test.tsx --maxWorkers=2` : code 0,
  **4/4**, 1 fichier, 5,40 s (reflets/vibrations simulés). `npm run typecheck`
  et ESLint direct sur drop-view, pack-tear et e2e/pack-tear : code 0.
  `git diff --check` : code 0. Pas de build de production, SQL, suite complète
  ou nouveau parcours serveur. Next 16.3.6, Playwright 1.63.0 et Vitest 3.2.7
  installés identiques au lock ; aucun manifeste/lock modifié.
- Runs intermédiaires : 14/20, six attentes erronées de réserve initiale 3
  au lieu de 2 ; attentes corrigées pour comparer à la réserve affichée.
  Ensuite 18/20, deux échecs du vrai tirage souris : `dragstart` sur IMG puis
  `pointercancel` sur BUTTON prouvés par les événements Chromium. Image
  accueil désormais draggable=false ; run final 20/20. Ces runs échoués ne
  constituent pas une preuve de réussite. Premier lancement E2E refusé avant
  tests : serveur local listen EPERM ; relance avec autorisation d'exécution.
- Captures bureau/téléphone examinées ; visite 412×915 HTTP 200, zéro pageerror.
  Artifacts hors Git : `/workspace/scratch/creatordeck-thumb-polish/`
  (first-results, second-results, final-results, final-e2e.log, home-412.png,
  sealed-412.png, reveal-412.png, visual-report.json). Captures uniquement
  locales, pas une mesure de fluidité/appareil réel ; conservation entre
  environnements non garantie. Serveur dev arrêté ; seul bloc Next automatique
  ajouté à AGENTS retiré, contenu original restauré.
- Réseau : environnement connecté/en marche, observations actuelles, politique
  déclarée restricted avec *.vercel.app et les trois hôtes Playwright ; état
  d'application rapporté unknown. En sandbox Git refuse le proxy:8080 ; le
  même contrôle autorisé répond correctement, SHA distant vérifié. Aucun
  besoin démontré de recréer l'environnement. Vercel non revisité ici ; son
  ancien blocage SSO ne constitue pas une nouvelle preuve d'accès au preview.
- K-012 implémenté et vérifié automatiquement ; VIS-01/K-005 restent ouverts
  pour appréciation à une main sur téléphone réel, fluidité, sons/reflets.
  CI du nouveau SHA et nouveau preview non vérifiés. CLOUD-01 non repris.
- Prochaine étape : Luna / Faible suffit pour vérifier la CI du SHA publié et
  recueillir l'essai humain : appui sur sachet accueil, puis tracé de soudure
  droite/gauche à une main. Revenir à GPT-6.1 Sol / Moyen avant autre correction.
  Commit contenant cette passation : `git log -1 --format=%H -- docs/agent-handoff.md` ;
  recontrôler le HEAD distant et le contenu des docs avant prochaine reprise.

## Historique — K-011 corrigé, 10 octobre 2026, Europe/Paris

- Correction ciblée autorisée après visite locale ; réservation libérée.
  Base locale/distante propre et identique `96209d23799dd14717a4e7e219e0ccbbcf9ccd5a`,
  checkout existant sur `design/booster-reveal-polish`, aucun worktree/main/merge.
- Code corrigé et testé : `d87b72c35d887de6ddd5a14c53b69a5a9c5b184c`.
  Si le déclencheur connecté ne reçoit plus le focus après fermeture, le hook
  utilise la cible explicitement marquée dans sa section. Le titre Scène est
  cette cible (`tabIndex=-1`, hors de l'ordre Tab). Le paquet consommé reste
  désactivé ; aucun changement d'économie, de tirage ou de mise en scène.
- Nouveau scénario E2E « closing a consumed Scene pack returns focus to its
  section heading » : avant correctif, code 1, 2/2 échecs bureau/téléphone sur
  l'assertion de focus du titre ; bouton déjà désactivé. Après correctif, même
  scénario plus « the revealed card keeps » existant : code 0, **4/4 réussis**,
  16,9 s. Le scénario Live conserve ses assertions de focus/inert et dimensions.
  Commande ciblée : `PLAYWRIGHT_BROWSERS_PATH=/workspace/.cache/ms-playwright
  node node_modules/@playwright/test/cli.js test --grep
  'closing a consumed Scene pack|the revealed card keeps' --reporter=line`.
- `npm run typecheck` : code 0. ESLint direct sur les deux fichiers produit et
  `e2e/pack-tear.spec.ts` : code 0, aucun diagnostic. `git diff --check` : code 0.
  Pas de build de production, suite complète ou nouvelle visite Vercel ; CI
  du nouveau correctif non vérifiée, ancienne CI verte `2d933c9` historique.
- Serveur dev arrêté après vérification ; seul ajout automatique Next à AGENTS
  sauvegardé puis retiré. Aucun manifeste/lock modifié. Artifacts et résumé
  locaux : `/workspace/scratch/creatordeck-scene-focus/{before-results,after-results,results.txt}`,
  non publiés et conservation entre environnements non garantie.
- K-011 corrigé et vérifié automatiquement ; VIS-01/K-005 restent ouverts pour
  validation humaine sur téléphone réel (fluidité, sons, vibrations, reflets).
  CLOUD-01 non repris ; aucune production Supabase touchée.
- Prochaine étape simple : passer à Luna / Faible pour consulter la CI du bon
  SHA et guider la validation humaine. Revenir à GPT-6.1 Sol / Moyen avant un
  nouveau diagnostic/correctif produit. Pas de nécessité démontrée de recréer
  l'environnement. Commit contenant cette passation à retrouver via git log,
  puis comparer au HEAD distant avant de reprendre.

## Historique — visite Chromium locale, 10 octobre 2026, 12 h 41 Europe/Paris

- Reprise autorisée après choix de la visite locale, puis validation sur téléphone réel.
  Checkout `/workspace/CreatorDeck` initialement propre sur `work` à `ae5016f` ;
  HEAD distant design vérifié à `66b78d583a33e7f135307ac371f2485e4654a2d6`, objets
  récupérés puis switch explicite sur `design/booster-reveal-polish`, sans worktree,
  reset, modification de main ni perte de travail. SHA du code visité : `66b78d5` ;
  différence avec `2d933c9` uniquement documentaire. Réservation libérée.
- Correction des conclusions de conversation : AGENTS et ce checkpoint existent
  bien à `66b78d5`, et `2d933c9` est son ancêtre. La première lecture utilisait
  un FETCH_HEAD ancien malgré un fetch `--no-write-fetch-head`. Les erreurs curl 7
  et Python `Operation not permitted` en sandbox ne prouvaient pas une panne proxy.
  La même requête avec autorisation d'exécution, proxy/CA inchangés, répond HTTP 302
  vers `vercel.com/sso-api` ; suivre la redirection échoue avec curl 56,
  `CONNECT tunnel failed, response 403`. Protection Vercel et domaine SSO non
  autorisé ; aucune nécessité démontrée de recréer l'environnement. Aucune règle
  réseau changée, aucun accès authentifié ou rendu Vercel obtenu.
- Le nouvel environnement n'avait conservé ni Playwright ni Chromium. `npm ci
  --cache /workspace/.npm --no-audit --no-fund` : code 0, 602 paquets ; Next 16.3.6
  et Playwright 1.63.0 comparés au lock, identiques. Installation Chromium par le
  CLI verrouillé : code 0, Chromium/Headless Shell 153.0.8010.12, révision 1243.
  Serveur `NEXT_TELEMETRY_DISABLED=1 npm run dev -- --hostname 127.0.0.1` arrêté
  après visite. Aucun build de production ni suite de tests relancé.
- Visites directes via scripts temporaires, pas le runner E2E : Live bureau
  1280×900, téléphone 412×915 avec vrais événements touch Chromium simulés,
  réduction d'animations 320×568 ; HTTP 200, aucun pageerror, fermeture rend le
  focus au bouton Live et enlève inert. Cartes et actions restent dans l'écran ;
  face sans animation/transform en mode réduit. Captures scellé/coupure/dos/face
  examinées ; vidéos enregistrées, pas de mesure de fluidité sur appareil réel.
- Scène 412×915 : ouverture puis progression jusqu'à la cinquième carte observées.
  Perfect à 320×568 et 1280×900 : cinq cartes visibles, captures examinées.
  Perfect provoqué uniquement dans un contexte navigateur local isolé, en remplaçant
  les tirages Uint32Array(1) par zéro ; aucune modification du moteur ou des taux,
  aucun parcours serveur réel ni preuve probabiliste. Les autres contextes sont
  indépendants. Audio/haptique et reflets coupés non validés par cette visite.
- Nouveau point K-011 : après fermeture Scène, focus sur BODY, bouton Scène
  désactivé « Reviens demain ». Reproduit deux fois ; inert=false, aucun pageerror.
  Le hook tente de focaliser la cible capturée, mais le bouton consommé ne peut
  plus recevoir le focus. K-010 Live reste corrigé ; ne pas rouvrir son symptôme.
- Artifacts locaux hors dépôt : `/workspace/scratch/creatordeck-visual-66b78d5/`
  (captures, vidéos, scripts, report.json, special-report.json, scene-focus-report.json).
  Pas publiés, conservation entre environnements non garantie. Bloc Next ajouté
  automatiquement à AGENTS sauvegardé avec les artifacts puis seul ce bloc retiré ;
  aucun fichier produit, manifeste ou lock modifié.
- CI verte à `2d933c9` conservée comme preuve historique, pas relue/rejouée ici.
  VIS-01/K-005 restent ouverts pour appréciation au pouce, sons/vibrations et
  fluidité sur téléphone réel. CLOUD-01 hors périmètre, aucune production touchée.
- Prochaine action : corriger K-011 avec un retour clavier vers une cible disponible
  après consommation Scène, puis visiter ce parcours ; valider sur téléphone réel
  le même code (preview protégé accessible au joueur connecté ou APK).
  Publication de ce checkpoint : retrouver son SHA via git log et comparer au distant.

## Historique — CI vérifiée, preview bloqué, 10 octobre 2026, 11 h 57 Europe/Paris

- Agent : Codex Cloud ; contrôle ciblé après le « go », réservation libérée.
  Branche `design/booster-reveal-polish`, HEAD local et distant identiques :
  `2d933c92caa8bef0e08672239232e7da114620b8` ; checkout propre. Aucun changement produit ni nouveau test local.
- PR #8 relue sur GitHub : DRAFT, base `arena/01a10c75-creatordeck`, tête
  `2d933c92caa8bef0e08672239232e7da114620b8`. Workflow « Vérification »
  [run #235](https://github.com/GoodFight37/CreatorDeck/actions/runs/38042993215)
  **terminé avec succès** pour ce SHA. Les quatre jobs sont verts : unitaires/
  écrans/statique/build, SQL sur Postgres jetable, E2E Playwright, chemin cloud
  à RPC simulés. Leurs compteurs précis n'ont pas été extraits des logs ; ne
  pas réutiliser les chiffres des runs locaux comme chiffres CI.
- Le journal de la PR relie explicitement le même SHA au preview Vercel
  [deployed](https://creator-deckk-rapfm1ejk-hafsi37-2386.vercel.app), daté du 10 octobre à 09 h 54 UTC ; le commentaire
  Vercel signale « Ready ». Cette preuve porte sur le déploiement, pas sur la
  qualité visuelle de l'ouverture.
- `curl` vers le domaine du preview et l'alias
  `https://creator-deckk-dev.vercel.app` : **code 56, CONNECT 403**.
  Aucun rendu du preview n'a donc été chargé dans le navigateur de cet agent.
  VIS-01 et K-005 restent ouverts : continuité et gestes au pouce, dos/faces,
  halo/Perfect, réduction des animations, sons/reflets et bureau/téléphone
  requièrent encore le verdict humain sur le lien ci-dessus.
- `gh run list` et `gh pr view` : Forbidden ; `api.github.com` via curl :
  CONNECT 403. Contrôle CI fait par les pages HTML GitHub publiques, reliées
  au SHA exact, sans déduire les résultats d'une ancienne passation.
- Skill cloud-onboarding `setup` consulté pour l'accès. Configuration active :
  règles personnalisées Playwright, aucun domaine Vercel. Le brouillon renvoyé
  a une `base_version_id` plus ancienne que la version active de l'environnement ;
  aucun enregistrement n'a été tenté pour ne pas écraser un brouillon périmé.
  Si l'agent doit visiter le preview, l'opérateur peut ajouter le domaine exact
  `creator-deckk-rapfm1ejk-hafsi37-2386.vercel.app` dans les paramètres réseau de
  l'environnement actuel, puis Save et Publish ; recontrôler l'accès après
  activation. L'alias `creator-deckk-dev.vercel.app` n'est pas nécessaire
  pour l'URL liée à ce commit. Cette configuration n'a pas été sauvegardée.
- Fichiers : passation, roadmap, problèmes, journal. Publication documentaire
  à retrouver avec `git log -1 --format=%H -- docs/agent-handoff.md`, puis
  comparer au HEAD distant. Aucun merge ni modification de main.
- Prochaine action : recueillir l'avis visuel du joueur sur le preview du SHA
  ci-dessus ; si l'accès réseau est ouvert, lancer la visite Chromium sur cette
  URL et noter le statut HTTP et les gestes observés. Ensuite reprendre CLOUD-01
  uniquement avec le projet Supabase autorisé. Ne pas marquer VIS-01 terminé
  sur la seule base de la CI ou du statut Vercel.

## Historique — K-010 corrigé, 10 octobre 2026, 11 h 53 Europe/Paris

- Agent : Codex Cloud ; correction ciblée autorisée (« let's go »), réservation
  libérée à la passation. Modèle conseillé pour cette correction : Sol / Moyen.
- Branche `design/booster-reveal-polish`, base locale/distante propre
  `2765179cfe93c26dc23160cb432d1404e3235c87`, fetch design sans divergence.
  PR #8 relue via HTML : DRAFT, base `arena/01a10c75-creatordeck`.
  CI/commentaires distants non vérifiés. Aucun audit complet rejoué.
- Correctif et SHA du code testé : `4b9fcca3b8e980fe5173535413d1a7bf036030a0`.
  [Commit](https://github.com/GoodFight37/CreatorDeck/commit/4b9fcca3b8e980fe5173535413d1a7bf036030a0).
  La cible de retour du focus est capturée dans le gestionnaire d'ouverture,
  avant le commit React qui désactive le bouton, puis transmise à PackTear et
  RevealOverlay. Le hook conserve son comportement habituel sans cible explicite.
  Les ouvertures Live et Scène partagent cette capture ; la variante OBS
  conserve la désactivation de la gestion du focus. Décision D-009.
- Cause prouvée dans Chromium : bouton focalisé avant clic, désactivé pendant
  la déchirure, focus sur BODY après fermeture. Le hook capturait trop tard
  `document.activeElement` ; la transition ne conservait pas le déclencheur.
- Contre-épreuve avant édition : `PLAYWRIGHT_BROWSERS_PATH=/workspace/.cache/ms-playwright
  NEXT_TELEMETRY_DISABLED=1 npm run e2e -- --grep "the revealed card keeps"` :
  **code 1, 2/2 échecs**, bureau et téléphone à `e2e/pack-tear.spec.ts:46`.
- Même commande sur le correctif final : **code 0, 2/2 réussis**, 12,6 secondes.
  Le test existant conserve ses assertions de focus, inert, navigation Tab,
  dimensions et fermeture ; aucune assertion affaiblie, aucun nouveau test.
- `npm run ecrans -- src/ecrans.test.tsx src/ecrans-tactile.test.tsx --maxWorkers=2` :
  **code 0, 9/9 tests, 2 fichiers**. Rendus et haptique, pas un verdict visuel
  sur téléphone réel. `npm run typecheck` : code 0. ESLint direct sur les quatre
  fichiers produit modifiés : code 0, aucun diagnostic.
- Première version locale utilisait une ref lue pendant le rendu : E2E 2/2,
  mais lint refusé (`react-hooks/refs`, deux erreurs). Remplacée par un état
  React pour la cible transmise ; E2E/typecheck/lint relancés et réussis.
  Cette première version n'a jamais été commitée ou poussée.
- Dépendances et navigateurs verrouillés de la reprise précédente réutilisés ;
  aucun changement de branche/dépendances, aucun nouveau npm ci nécessaire.
  AGENTS.md retrouve son contenu commité après retrait du seul bloc Next auto.
  Logs locaux : `/tmp/creatordeck-focus/{before,after,screens}.log`.
- Fichiers : quatre fichiers produit, passation, problèmes, roadmap, décisions
  et journal. Commit documentaire à retrouver via
  `git log -1 --format=%H -- docs/agent-handoff.md`, puis comparer au distant.
  Publication à vérifier après push normal ; aucun merge ni modification de main.
- Limites : suite E2E complète et cloud simulé non rejoués dans cette correction ;
  leurs runs du checkpoint précédent restent historiques. Tests SQL/unitaires/
  build non rejoués. Le scénario E2E cible le booster Live ; pas de nouveau
  scénario Scène/OBS exécuté. Validation humaine Vercel/mobile et CI restent
  en attente, aucune production Supabase sollicitée.
- Prochaine étape : valider VIS-01 sur le preview Vercel correspondant au commit
  publié (geste, continuité, halo/Perfect, réduction d'animations), consulter la
  CI au bon SHA puis CLOUD-01 avec accès autorisé. K-010 est corrigé et vérifié
  automatiquement ; ces validations restantes ne sont pas déclarées terminées.

## Historique — E2E exécutés, 10 octobre 2026, 11 h 45 Europe/Paris

- Agent : Codex Cloud ; reprise courte demandée, réservation libérée.
- Branche `design/booster-reveal-polish`, code testé et HEAD distant vérifié :
  `c7c0f846838b26581052ef8df8d70e23b48fdafb`. Checkout initial propre sur
  `work` (ancien main), fetch design puis switch explicite ; aucun travail perdu.
  PR #8 relue via HTML : DRAFT, base `arena/01a10c75-creatordeck`.
  CI distante/commentaires non vérifiés ; aucun audit complet rejoué.
- `npm ci --cache /workspace/.npm --no-audit --no-fund` : code 0,
  602 paquets. Next 16.3.6 / Playwright 1.63.0 comparés au lock : identiques,
  manifeste et lockfile inchangés. Un essai Chromium lancé trop tôt pendant
  npm ci a échoué (SyntaxError sur fichier en cours d'installation) ; relancé
  seulement après la fin réussie de npm ci.
- `PLAYWRIGHT_BROWSERS_PATH=/workspace/.cache/ms-playwright node
  node_modules/@playwright/test/cli.js install chromium` : **code 0**.
  Chromium et Headless Shell 153.0.8010.12 / révision 1243, FFmpeg 1011 installés.
  K-008 résolu : les trois domaines et redirections sont accessibles.
- `PLAYWRIGHT_BROWSERS_PATH=/workspace/.cache/ms-playwright
  NEXT_TELEMETRY_DISABLED=1 npm run e2e` : **code 1, 24 réussis,
  2 échoués, 2 ignorés, 28 scénarios listés**, 1,7 minute.
  Les échecs bureau/téléphone sont la même assertion de retour du focus après
  fermeture : `e2e/pack-tear.spec.ts:46`. Le bouton « Ouvrir le booster »
  reste inactif au sens du focus. K-010 ouvert ; cause non diagnostiquée.
  Déchirure, continuité géométrique avant fermeture, réduction des animations,
  navigation et persistance locale passent. Aucun correctif produit entrepris.
- Recette `.github/workflows/verification.yml` : `.env.local` temporaire avec
  URL `https://verification-test.supabase.co` et clé factice, puis même commande
  avec `-- --grep "avec le serveur"` : **code 0, 2/2 réussis**, 14,4 secondes.
  RPC interceptés par Playwright ; aucune preuve de production Supabase.
  Fichier factice supprimé après le run ; aucun fichier utilisateur remplacé.
- `next dev` a ajouté son bloc automatique dans AGENTS.md ; origine vérifiée
  dans `node_modules/next/dist/server/lib/generate-agent-files.js`, seul ce bloc
  retiré après arrêt du serveur. AGENTS retrouve son contenu commité.
- Rapports, captures et logs des deux runs préservés séparément sous
  `/tmp/creatordeck-e2e/{local-results,local-report,cloud-results,cloud-report}`,
  `local.log` et `cloud.log`. Artifacts locaux, non publiés.
- Fichiers du checkpoint : passation, problèmes, roadmap et journal.
  Publication à retrouver par `git log -1 --format=%H -- docs/agent-handoff.md`
  et à comparer au HEAD distant. Aucun merge ni modification de main.
- Prochaine action : diagnostiquer K-010 sur la branche vérifiée et rejouer
  `npm run e2e -- --grep "the revealed card keeps"` après correctif autorisé.
  Validation humaine Vercel/mobile et CI distante restent en attente ; suites
  unitaires/SQL/build historiques, non rejouées dans cette reprise.

## Historique — reprise réseau, 10 octobre 2026, 11 h 25 Europe/Paris

- Agent : Codex Cloud ; reprise courte, réservation libérée à la passation.
- Demande : l’utilisateur a ajouté `cdn.playwright.dev`, lancé la publication et
  demande de retester immédiatement. Objectif : installer Chromium puis jouer E2E.
- Base locale/distance propre et identique :
  `7126cd88884694c5cfabc0512507088b140208d9`, branche
  `design/booster-reveal-polish`. Pas de nouveau commit, aucun réaudit du jeu.
  PR #8 / base arena : dernier état vérifié dans le checkpoint précédent,
  pas de nouvelle lecture PR/CI dans cette reprise réseau.
- Réalisé : deux tentatives de `PLAYWRIGHT_BROWSERS_PATH=/workspace/.cache/ms-playwright
  node node_modules/@playwright/test/cli.js install chromium`, code 1 (403).
  La première précédait la propagation ; ensuite HEAD sur le CDN répond 307.
- `curl -sS -I --max-time 15` sur l’URL Chromium du CDN : code 0, HTTP 307
  vers `https://storage.googleapis.com/chrome-for-testing-public/153.0.8010.12/linux64/chrome-linux64.zip`.
  Même contrôle direct de cette destination : code 56, CONNECT 403.
- HEAD sur `https://cdn.playwright.dev/dbazure/download/playwright/builds/ffmpeg/1011/ffmpeg-linux.zip` :
  code 0, HTTP 307 vers `playwright.download.prss.microsoft.com` ; HEAD direct
  sur cette destination : code 56, CONNECT 403. Révisions lues dans le
  `browsers.json` de Playwright verrouillé : Chromium 1243, FFmpeg 1011.
- Conclusion vérifiée : le premier domaine est désormais accessible ; les
  deux hôtes de redirection doivent aussi être autorisés. Aucun navigateur
  installé, aucun E2E exécuté ; pas de nouveau test unitaire/SQL/build.
- Lecture du brouillon lié à cette conversation : règle personnalisée
  `cdn.playwright.dev`, preset `package_managers`. Tentative de sauvegarder
  les trois domaines ci-dessous : **refus CONFLICT / stale_base**. La publication
  ou un changement a périmé sa version de base. Sauvegarde de cet ajout
  **non confirmée** ; ne pas relire/resoumettre le même brouillon en boucle.
- Proposition réseau complète (règles personnalisées ; conserver les presets
  et toute nouvelle règle utilisateur) : `cdn.playwright.dev`,
  `storage.googleapis.com`, `playwright.download.prss.microsoft.com`.
  Aucun script/secret/dépôt à modifier pour cette proposition.
- Action opérateur : dans l’éditeur de l’environnement **actuel**, conserver
  le premier domaine et ajouter les deux destinations, appuyer sur Entrée après
  chacune, Save puis Publish. Pas besoin de recréer l’environnement. Si un
  nouvel agent utilise les outils de brouillon, ouvrir une nouvelle session de
  configuration liée à la version actuelle et réconcilier avant toute écriture.
- Prochaine commande : retenter l’installation Chromium ci-dessus après
  activation, puis `PLAYWRIGHT_BROWSERS_PATH=/workspace/.cache/ms-playwright
  npm run e2e`. Ensuite chemin cloud simulé selon le workflow. Vercel/mobile
  et production restent à valider, aucune fusion ni modification de main.
- Fichiers de cette reprise : uniquement `docs/agent-handoff.md` et
  `docs/known-issues.md`. Retrouver ce checkpoint par
  `git log -1 --format=%H -- docs/agent-handoff.md` et comparer à la tête distante.
  Publication Git à vérifier avant reprise, quota inconnu.

## Historique — correction K-007, 10 octobre 2026, 11 h 03 Europe/Paris

| Champ | Valeur |
|---|---|
| Dernier agent | Codex Cloud |
| Session / réservation | Correction SQL terminée ; réservation libérée à la remise de cette passation |
| Branche | `design/booster-reveal-polish` |
| Base de cette correction | `dedb03bed2b7442b2c841643cd06aace103ed4a6`, vérifiée identique au distant avant édition |
| Commit contenant le correctif et cette passation | Correctif `245742fb42972558a57cd57febd7dd7ba773f372` ; checkpoint documentaire : `git log -1 --format=%H -- docs/agent-handoff.md` |
| PR vérifiée à la reprise | [#8](https://github.com/GoodFight37/CreatorDeck/pull/8), DRAFT ; base `arena/01a10c75-creatordeck`, tête design |
| Publication | Correctif `245742fb42972558a57cd57febd7dd7ba773f372` poussé : SHA distant identique, les six fichiers relus au SHA depuis GitHub et comparés au commit ; retrouver puis vérifier le HEAD documentaire courant avant reprise |

### Demande, objectif et réalisation

L’utilisateur choisit Codex Cloud + GitHub + Vercel et demande de poursuivre
les priorités annoncées. Première étape réalisée : corriger K-007 sans changer
les règles du jeu. Le banc attendait toujours un refus du draft, même le samedi.
Il impose maintenant une fenêtre fermée puis ouverte sur le Postgres jetable.
La définition originale de `_arena_draft_open(timestamptz)` est sauvegardée avant
les overrides et restaurée dans `finally`, y compris si un appel lance une erreur.
Les contrôles calendaires à dates explicites et les vraies RPC sont conservés.
Aucun fichier produit, migration, dépendance ou lockfile n’est modifié.

Fichiers : `scripts/verify-supabase-migrations.mjs`, `docs/roadmap.md`,
`docs/agent-handoff.md`, `docs/decisions.md`, `docs/known-issues.md`,
`docs/historique-livraisons.md`. Décision D-008 ; K-007 corrigé ; QA-01 SQL
livré, navigateur/CI toujours incomplets. Les historiques ci-dessous sont conservés.

### Vérifications réellement exécutées

Node 24.19.0 ; Next 16.3.6 / Playwright 1.63.0 inchangés, dépendances du lock
réutilisées ; embedded-postgres 18.4.0-beta.17 / pg 8.23.1 disponibles.
Logs temporaires : `/tmp/creatordeck-arena/` ; cette synthèse est autonome.

| Commande / contrôle | Résultat |
|---|---|
| Status, ls-remote, fetch design explicite, lecture HTML de PR #8 | Checkout initial propre, distant/local `dedb03be` ; aucun nouveau commit, PR toujours DRAFT et base arena |
| `node --check scripts/verify-supabase-migrations.mjs` | Code 0 |
| `node node_modules/eslint/bin/eslint.js scripts/verify-supabase-migrations.mjs` | Code 0, aucun diagnostic |
| `npm run supabase:verify` | **Code 0, 559 contrôles réussis, 0 échec**, samedi 10 octobre ; fenêtres fermée/ouverte et restauration vérifiées, dates mercredi/samedi/dimanche/lundi contrôlées explicitement |
| `node /tmp/creatordeck-arena/negative-control.mjs` | **Code 1 attendu, 558 réussis / 1 échec**, précisément « arène · draft : hors du week-end, c’est refusé » ; restauration de la fenêtre réussie |
| `PLAYWRIGHT_BROWSERS_PATH=/workspace/.cache/ms-playwright node node_modules/@playwright/test/cli.js install chromium` | Code 1 : HTTP 403 « Domain forbidden », URL `https://cdn.playwright.dev/builds/cft/153.0.8010.12/linux64/chrome-linux64.zip` ; navigateur toujours absent |
| `git diff --check`, cohérence/liens des docs | Code 0 ; 22 liens relatifs vérifiés sans cible absente après correction du lien historique vers `ta-chaine.md`, ne prouvent pas le gameplay |

Contre-épreuve reproductible : copier le vérifieur hors dépôt, adapter ROOT vers
le checkout et rendre ses imports accessibles (symlink `node_modules` local).
Juste après la fixture `select false`, lire `pg_get_functiondef` de
`public.arena_draft_choices()` puis retirer uniquement le bloc
`if not public._arena_draft_open(now()) then … end if` et réinstaller cette
fonction sur la **base jetable**. Exécuter toute la copie et vérifier l’unique
échec et le code 1. La copie temporaire n’est pas commise ; migrations et runner
normal n’ont jamais reçu cette mutation. Il n’y a pas eu d’exécution avec
l’horloge machine avancée à un jour ouvré : l’indépendance vient des fixtures,
la règle calendaire est testée avec les dates explicites.

Le premier contrôle des liens a trouvé un ancien lien relatif cassé dans le
journal (`docs/ta-chaine.md` depuis `docs/`) ; il est corrigé vers `ta-chaine.md`,
puis le contrôle a passé. Aucun contenu historique supprimé.

Les suites unitaires/écrans/build/typecheck n’ont pas été rejouées pour ce
changement ciblé du runner SQL. Leurs résultats de l’audit précédent sont
historiques, pas de nouveaux runs. Aucun E2E exécuté ni CI distante confirmée.

### Incomplet, préférences et prochaine action exacte

- K-008 : téléchargement navigateur bloqué malgré une nouvelle tentative.
  Le brouillon Cloud a été lu : réseau restreint, aucune règle personnalisée,
  preset `package_managers`. Ajout du seul domaine `cdn.playwright.dev`
  enregistré par l’outil de configuration : `status: saved`,
  `requires_publish: true` ; autres champs et presets conservés.
  **Ce brouillon n’est pas activé/publié.** Dans les paramètres de
  l’environnement, revoir et enregistrer cet ajout puis publier l’environnement.
  Ensuite relancer la commande Chromium ci-dessus et `npm run e2e`.
  Pour le chemin cloud simulé, suivre `.github/workflows/verification.yml` ;
  aucune clé réelle nécessaire. Ne pas confondre ces mocks avec la production.
- Sur le preview Vercel correspondant au nouveau HEAD, faire valider au pouce
  VIS-01 (ouverture continue, dos puis faces, halos/Perfect, réduction des
  animations). Une appréciation utilisateur ne peut pas être inventée.
- Consulter les contrôles GitHub du commit poussé ; K-006/CI non vérifiés par
  cette session. Vérifier Supabase réel (CLOUD-01) uniquement avec accès autorisé.
- Préférences : GitHub référence, Cloud développement, Vercel essais ; pas de
  refonte générale, aucun merge/main, aucun changement de règle pour obtenir
  des tests verts. Le quota restant n’est pas connu.
- Avant toute reprise : lire AGENTS et ces quatre docs, vérifier status/HEAD,
  fetcher design et examiner tout nouveau commit. Puis reprendre le navigateur
  si son accès a changé ; sinon validation du preview Vercel et schéma distant
  autorisé. Aucun déploiement ou test de production n’est affirmé ici.

## Historique — audit documentaire du 10 octobre 2026

### Checkpoint antérieur — 10 octobre 2026, 10 h 48, Europe/Paris

| Champ | Valeur |
|---|---|
| Dernier agent | Codex Cloud |
| Session / réservation | Audit documentaire terminé ; réservation libérée à la remise de cette passation |
| Branche de travail | `design/booster-reveal-polish` |
| SHA du code audité | `4955d9bbd489777c6ffd74229613075a332cc9e9` |
| Commit contenant cette passation | `git log -1 --format=%H -- docs/agent-handoff.md` ; le SHA de code ci-dessus est la base, pas le futur commit documentaire |
| PR | [#8](https://github.com/GoodFight37/CreatorDeck/pull/8), brouillon, titre « Polish lumineux des ouvertures de boosters et révélations » |
| Base de la PR constatée | `arena/01a10c75-creatordeck`, SHA `6c46e4bec37dc91a32f368b586e59ce109a44784` |
| main constaté | `ae5016f093c977e68943d92f5a7c3da17bca8021`, aucune modification autorisée |
| Publication | Checkpoint initial `beb1261a0f17a1b384f302ef2d3c685a7ae2b945` poussé et cinq contenus relus sur GitHub ; retrouver le commit du complément courant avec la commande ci-dessus et vérifier la tête distante avant reprise |

## Demande et objectif compris

L'utilisateur demande une coordination permanente entre Codex Cloud, Codex PC
et ChatGPT, indépendante de la conversation : audit réel, roadmap, passation,
décisions, bugs, règles pour protéger les branches et sauvegardes régulières
avant interruption/quota, puis commit et push GitHub. Ne pas réécrire le jeu.
La reprise doit fonctionner même si Codex devient indisponible.

## Réalisé

- Checkout initial propre sur `work` au SHA de main ; branches distantes et refs
  `refs/pull/8/{head,merge}` consultées. La branche de travail et la tête de PR
  pointaient sur `4955d9b`. PR lue depuis la page GitHub (données embarquées) :
  état DRAFT, non fermée/non fusionnée, base arena, 112 commits dans la PR.
- `gh pr view … --json …` et REST `api.github.com/repos/…/pulls/8` refusés (403).
  Cela ne bloque pas les lectures Git HTTPS ni la page GitHub. Aucun statut CI
  ou déploiement déduit de l'existence d'un workflow.
- Fetch explicite des références design et arena ; checkout aligné proprement
  sur design. Le clone ne suivait initialement que main ; la configuration
  locale de fetch/upstream design a été ajoutée. Un essai de switch avec
  tracking a échoué après avoir rempli l'index ; corrigé avec `--no-track`,
  vérification de HEAD et retour à un status propre. Ce n'était pas un changement
  de l'application ni une bascule automatique prouvée.
- Documents existants lus : périmètre, roadmap, journal, revue externe,
  dossier d'atelier, README, CI, scripts et composants du chantier.
- Cinq documents de coordination préparés ; roadmap antérieure conservée.
- Premier checkpoint commité et poussé, SHA distant égal au local ; les cinq
  fichiers téléchargés depuis GitHub au SHA `beb1261a` sont identiques au commit.
  Compléments d'audit enregistrés dans une seconde révision documentaire.
  Aucun merge, aucune modification de main/arena ou de fichiers d'application.
- Suites actuelles exécutées, défaut de test SQL K-007 et obstacle navigateur
  K-008 documentés ; l'ancien bug SQL du main est déjà corrigé sur design.

## État du projet et chantier

Application Android/Web Next.js exportée, React, Capacitor, Supabase. Le mode
sans cloud est un **mode dev/test**, pas le produit distribué. Les fonctionnalités
multijoueurs et l'économie vont bien au-delà de l'ancien main : 42 migrations,
échanges, hôtel, amis/Last Pack, arène, jetons, direct/notifications et Tribunal.
La simulation de streameur est retirée de l'interface.

Derniers commits du code : `4955d9b` unifie ouverture/révélation dans une scène,
`c7a9263` corrige chevauchement des labels et portabilité des tests Windows,
`beadb63` supprime les styles du canvas WebGL retiré. La PR développe un sachet
imprimé (microphone plutôt que chevron refusé), une soudure tactile, cinq dos
avant les faces et un fallback clairement indiqué pour DIVERRON.

Repères d'architecture : coque/vues dans `src/components/` ;
`src/hooks/use-pack-opening.ts` arbitre serveur/appareil ;
`src/lib/{game-engine,save-store,game-store,reveal}.ts` porte moteur, sauvegarde et
présentation ; `src/lib/cloud/{api,store}/` sépare les domaines réseau ;
`src/data/` porte catalogue/taux/économie ; migrations `0001` à `0042` et
`supabase/functions/` portent SQL et fonctions Edge. `/overlay` présente les
tirages dans OBS. Tests `.test.ts`, `.test.tsx`, SQL et `e2e/` : runners distincts.

## Fichiers concernés

Cette mission : `AGENTS.md`, `docs/roadmap.md`, `docs/agent-handoff.md`,
`docs/decisions.md`, `docs/known-issues.md`. Aucun composant, migration, manifeste
ou lockfile ne doit être modifié par cette mission documentaire.

Pour reprendre la mise en scène : `src/components/{pack-tear,reveal-overlay,
creator-deck-app,drop-view,overlay-stage}.tsx`, `src/hooks/use-presentation-focus.ts`,
`src/app/{booster-continuity,booster-premium,reveal-premium}.css`,
`src/lib/reveal.ts`, `public/packs/`, les suites `src/ecrans*.test.tsx` et `e2e/`.

## Commandes et résultats de l'audit

Code testé : `4955d9bbd489777c6ffd74229613075a332cc9e9`, dans le checkpoint
documentaire `beb1261a` (aucun changement d'application entre les deux).
Node 24.19.0, npm 11.9.0. Logs locaux : `/tmp/creatordeck-coordination/`,
temporaires et non publiés ; les résultats autonomes sont ci-dessous.
Les 181 tests de l'ancien main ne prouvent rien pour cette branche.

| Commande | Résultat réellement observé |
|---|---|
| Lectures Git, fetch explicite design/arena, lecture HTML PR #8 | Succès ; état et SHAs en tête de ce document |
| `gh pr view 8 --repo GoodFight37/CreatorDeck --json …`, REST `/pulls/8` | Refus 403 ; CI et déploiement non vérifiés |
| `npm ci --cache /workspace/.npm --no-audit --no-fund` | Succès, 602 paquets ; lockfile inchangé |
| Premier `npm_config_package_lock=false npm_config_cache=/workspace/.npm npm run dev:setup` | Installe les vérificateurs SQL mais fait flotter Next 16.4.0/Playwright 1.64.0 ; premiers tests non attribués au lock (K-009) |
| Correction : `npm ci …` puis `npm_config_cache=/workspace/.npm npm run dev:setup` sans désactiver le lock | Succès ; Next 16.3.6, React 19.2.6, Vitest 3.2.7, Playwright 1.63.0, eslint-config-next 16.3.6 comparés au lock : identiques |
| `npm test -- --maxWorkers=2` après correction | Code 0 ; **1 080 tests, 69 fichiers réussis** |
| `npm run ecrans -- --maxWorkers=2` après correction | Code 0 ; **69 tests, 13 fichiers réussis** ; jsdom/DOM, pas un essai visuel sur téléphone |
| `npm run supabase:verify` | Code 1 ; **559 contrôles exécutés : 558 réussis, 1 échec** arène hors week-end ; Postgres jetable, aucune base distante touchée |
| `npm run lint -- --ignore-pattern 'android/**/build/**'` après correction | Code 0 ; **0 erreur, 1 avertissement** de navigation dans un chunk Android généré localement (hors code édité) |
| `node scripts/check-jargon.mjs` | Code 0 ; aucun jargon d'infrastructure dans les textes affichés |
| `npm run catalog:ci` | Code 0 ; catalogue/portraits/SQL catalogue et saisons cohérents |
| `npm run build` après correction | Code 0 ; export `/`, `/_not-found`, `/overlay` ; avertissement attendu : variables publiques cloud absentes, build de test sans cloud |
| `npm run typecheck` après le build verrouillé | Code 0 |
| `node node_modules/@playwright/test/cli.js test --list` | Code 0 ; **28 tests listés, 3 fichiers**, aucune exécution E2E |
| `PLAYWRIGHT_BROWSERS_PATH=/workspace/.cache/ms-playwright node node_modules/@playwright/test/cli.js install chromium` avec Playwright verrouillé | Code 1 ; Chrome 153.0.8010.12 / build 1243 refusé, HTTP 403 « Domain forbidden » sur `cdn.playwright.dev` ; E2E non exécutés |
| `git diff --check`, liens relatifs des cinq docs, comparaison du contenu GitHub | Vérification documentaire avant publication ; pas une preuve du gameplay |

Les premiers passages unitaires/écrans avaient aussi passé sous Next 16.4.0,
mais les runs après remise au lock sont les preuves retenues. Le vérifieur SQL
n'utilise pas Next/Playwright ; son échec a été diagnostiqué dans le script et
le SQL, pas masqué par un nouveau run à une autre date. Aucune assertion supprimée.

## Incomplet / erreurs / points de vigilance

Statut CI et déploiement courant, E2E et validation humaine des animations
restent à établir. Aucun accès de production Supabase n'est utilisé.
K-007 est un **défaut du banc** : le 10 octobre à 08 h 43 UTC, samedi après
6 h UTC, `arena_draft_choices()` est autorisé par le produit, mais le script
ligne 4600 attend toujours un refus. Ne pas changer la règle week-end pour du
vert. Voir [problèmes](known-issues.md).
L'erreur `unnest()` de l'ancien checkout est corrigée dans le code design ;
ne pas la diagnostiquer à nouveau à partir de l'ancienne conversation.

## Prochaines actions exactes

1. Lire AGENTS et les quatre documents, exécuter `git status --short`,
   `git branch --show-current`, `git rev-parse HEAD`, puis
   `git ls-remote origin refs/heads/design/booster-reveal-polish` et fetcher cette
   référence explicite. Examiner tout commit poussé depuis cette passation.
2. Sur une branche vérifiée, corriger uniquement K-007 dans
   `scripts/verify-supabase-migrations.mjs` autour de la ligne 4600 : scénario
   hors week-end déterministe, override SQL restaurée dans un `finally`,
   contrôles à dates explicites conservés. Lancer `npm run supabase:verify`,
   obtenir **559 contrôles sans échec** et prouver que le test hors week-end
   échoue si la règle est volontairement violée sur la base jetable.
3. Autoriser le téléchargement Chromium (paramètres réseau :
   `cdn.playwright.dev`), installer le navigateur du lock et lancer
   `npm run e2e`. Distinguer scénarios locaux et cloud simulés (recette dans
   `.github/workflows/verification.yml`) ; consulter la CI du bon SHA.
4. Faire valider VIS-01 au pouce (scène, timings, halos, Perfect, réduction
   d'animations), puis vérifier le projet Supabase autorisé via
   `schema_versions()` et ses parcours avant toute modification de production.

Mettre à jour les quatre documents et faire un checkpoint. Ne pas fusionner
la PR ni toucher main. La coordination est livrée ; ces priorités de
développement/validation **ne sont pas terminées**.

## Préférences et décisions

Échanges en français ; téléphone d'abord ; conserver les refus historiques ;
un seul écrivain par branche ; aucune fusion automatique ; observations et
avis séparés. Le quota restant n'est pas connu par l'agent : ne pas en inventer
une estimation. Sauvegarder ce document après chaque étape importante.

## Modèle pour les prochaines passations

Ajouter une entrée datée dans le journal ci-dessous et remplacer le checkpoint
courant : agent/réservation, demande/objectifs, réalisé/incomplet, fichiers,
commandes + résultats + SHAs, erreurs, décisions/préférences, risques,
prochaine action exécutable, branche/commit/PR, état réel de publication.
Libérer la réservation en fin de session ; ne pas marquer terminé un travail
qui reste bloqué. Le prochain agent vérifie GitHub avant d'agir.

## Journal des passations

- 2026-10-10 — Codex Cloud : initialisation documentaire sur le code `4955d9b` ;
  historique conservé. Checkpoint `beb1261a` poussé, SHA et cinq contenus
  GitHub vérifiés ; aucun fichier d'application modifié.
- 2026-10-10, 10 h 48 Europe/Paris — Codex Cloud : complément d'audit, versions
  remises au lock, 1 080 unitaires / 69 écrans réussis, 558/559 contrôles SQL,
  statique/build réussis ; E2E bloqués. K-007/008/009 ajoutés, réservation libérée.

## Liens pour reprendre sans cette conversation

- [Branche](https://github.com/GoodFight37/CreatorDeck/tree/design/booster-reveal-polish)
- [PR #8](https://github.com/GoodFight37/CreatorDeck/pull/8)
- [Code audité](https://github.com/GoodFight37/CreatorDeck/commit/4955d9bbd489777c6ffd74229613075a332cc9e9)
- [Checkpoint initial](https://github.com/GoodFight37/CreatorDeck/commit/beb1261a0f17a1b384f302ef2d3c685a7ae2b945)
- [Règles](../AGENTS.md), [roadmap](roadmap.md), [décisions](decisions.md), [problèmes](known-issues.md)

## Synchronisation de la base de la PR #8 — 10 octobre 2026

La PR #8 cible toujours `arena/01a10c75-creatordeck`, base choisie à sa création le 9 octobre (SHA initial `6fd966eb`). Cette branche a depuis avancé de quatre commits jusqu'à `6c46e4b`, ce qui rendait la PR non fusionnable. Les quatre commits ont été intégrés à `design/booster-reveal-polish` par une fusion normale ; le seul conflit était `AGENTS.md`, résolu en gardant la version de coordination plus récente déjà présente sur la branche de travail. Les changements de la base (notamment le retrait des cinq sons inutilisés de la simulation de streameur) sont conservés. Aucun changement à `main`, aucune fusion de la PR ni accès à Supabase de production.


## Chantier tutoriel, remise à zéro et cadeau — checkpoint local, 10 octobre 2026

- Cette session Cloud a repris sur `main`, propre avant modification, `HEAD=aa35227872cbec094b7509b28b7f3139814eb3d4`. `origin/main` était au même SHA lors du contrôle initial. Aucun changement existant n'a été écrasé. Le code est commité localement au SHA `f97ea42` ; la mise à jour documentaire de ce checkpoint reste à commiter séparément. Aucun push, PR, merge, suppression de branche, accès ou changement Supabase de production, ni déploiement n'a eu lieu.
- Implémentation locale : tutoriel en trois écrans, mémoire locale et RPC de fin pour compte connecté ; carte cadeau séparée et disponible après tutoriel ; API/store et RPC serveur pour réclamer et tirer jusqu'à cinq boosters serveur, indépendants de la réserve normale ; CTA de fin « Retour au Drop ». Les cinq boosters insèrent les cartes avec provenance cadeau, sans récompenser XP/points/jetons ni entamer la réserve normale. La réserve cadeau reste distincte et s'épuise ouverture par ouverture.
- Migration additive `0044_tutoriel_reset_cadeau.sql` : reset one-shot protégé par marqueur transactionnel ; provisionne cinq boosters par compte existant ; conserve utilisateurs, profil/identité, amis et historiques terminés ; annule les trades `open`, retire les annonces `open`, remet les compteurs/sauvegardes/ressources de progression à leurs valeurs de départ. Le tirage cadeau passe par les fonctions SQL de tirage/poids/garantie existantes, reste séparé du pity et du Last Pack normaux, et n'est pas payé par les triggers économiques. La commande SQL a été exercée sur PostgreSQL jetable local uniquement.
- Résultats vérifiés : `npm test` réussi **71 fichiers / 1 109 tests** (rerun local autorisé après les limites sandbox Git/processus) ; `npm run ecrans` réussi **13 fichiers / 73 tests** ; `npm run typecheck` code 0 ; `npm run lint` code 0 ; `npm run supabase:verify` réussi, journal final « Toutes les vérifications passent », y compris reset/preservation, migration idempotente, ordre tutoriel→cadeau, message exact, claim unique et 5×5 cartes sans paiement/réserve normale. `XDG_CONFIG_HOME=/tmp/creatordeck-xdg npm run build -- --webpack` réussi : compilation webpack/TS, export statique (`/`, `/_not-found`, `/overlay`). Build produit sans variables cloud ; aucun secret n'a été lu.
- La commande `npm run build` par défaut (Turbopack) a échoué dans ce Cloud à `creating new process / binding to a port / Operation not permitted`. Le build webpack a abouti, sans modifier la config du projet. Aucune validation sur téléphone réel n'a été faite ; les tests d'écran sont DOM/écran simulés. Pas d'E2E Playwright ajouté ou exécuté pour ce lot.
- Avant toute vraie application de 0044, **arrêt obligatoire** : confirmer le projet Supabase cible, lire le schéma courant et prouver une sauvegarde récupérable ; si un de ces éléments est incertain, ne pas appliquer. L'utilisateur a interdit le toucher production et le déploiement automatique dans cette étape ; cette interdiction reste active.


## Reprise accès Supabase — 11 octobre 2026

- Code et documentation précédents poussés sur `main` : `f97ea42` puis `30490b4`. Le HEAD GitHub `30490b4064b6cc2169b64b053d6a4e782661d7d3` a été vérifié par `git ls-remote` dans cette reprise. Checkout initialement propre. Aucune PR fusionnée ni branche supprimée.
- Malik autorise désormais l'application réelle du reset ; la condition de vérifier cible, schéma et sauvegarde récupérable reste active. Aucune migration réelle exécutée par cette session ; l'état actuel de production n'est pas vérifié.
- Tests réseau concrets : les deux destinations Supabase refusées par le proxy, HTTP CONNECT 403, curl 56. Aucun accès de gestion prêt. Brouillon configuré et lisible, mais non publié ; liste des environnements en erreur sur le navigateur mobile. Aucun outil disponible pour publier ou envoyer un ticket de support.
- Voie indépendante de cette interface : tableau de bord Supabase sur téléphone, avec requête SQL de lecture seulement et vérification des sauvegardes. Voir [le guide d'accès](supabase-reset-access.md). Les outils Cloud ne peuvent pas obtenir des identifiants depuis le PC éteint ni contourner la politique du proxy.
- Préparation avant application : défaut détecté dans 0044, qui remplaçait `_save_add_pack_cards` en supprimant la synchronisation des compteurs ordinaires. Correction par helper cadeau séparé `_save_add_gift_cards`, sans droits d'exécution clients. Contrôles SQL de conservation du helper normal et de ses droits ajoutés. Validation du 11 octobre : `XDG_CONFIG_HOME=/tmp/creatordeck-xdg npm test` code 0, 71 fichiers / 1 109 tests ; `npm run supabase:verify` code 0, « Toutes les vérifications passent », dont les deux nouveaux contrôles. Pas de changement UI/TS, ni nouveau build ou essai téléphone pour ce correctif SQL.

## Ergonomie Drop mobile, Atelier et robustesse visuelle — 11 octobre 2026

- Code ciblé : commit `28084a92d91ce9b7747f84c2c460092398632cdc`, basé sur
  `main` `c9e15ebb43a9e1125c631512deff0e44a0da59b9`. L’Atelier montre les
  recettes dès le départ avec barème de prix visible et pagination catalogue
  conservée ; chaque paiement reste bloqué par le coût réel. Drop compacté à 360×740 ; Tribunal
  n’a qu’un CTA quand il est l’objectif du jour ; streak annoncé au récap ;
  le verdict passe après 600 ms. Binder compacté. Studio de tirages exclu du
  bundle joueur de production. Reflets au pointeur, sans `deviceorientation`.
- CSS : `booster-premium.css`, `reveal-premium.css`, `booster-continuity.css`
  n’ont plus aucun sélecteur ni `@keyframes` dupliqué exactement avec
  `globals.css` (analyse PostCSS). La vieille règle CSS `.booster-foil-webgl`
  inutilisée a été supprimée. La brillance continue du sachet s’arrête quand le
  sachet est déchiré et pendant la révélation/Perfect. Le mouvement du paquet
  conserve ses durées ; les arrivées utilisent `transform`/`opacity`.
- Portraits : 1 000 raster décodés, 0 invalide ; SVG de remplacement DIVERRON
  valide ; contrôle catalogue strict vert. `ernesingame.webp`, seul visuel à
  dominante verte détecté, est un logo vert valide.
- Vérification locale : 52 tests d’écran ciblés + 61 unitaires ciblés ; E2E
  Drop/Binder et déchirure : 34/34 sur bureau et téléphone simulé ; typecheck,
  lint, build production et `catalog:ci` réussis. Captures Playwright scellé /
  déchiré ajoutées. Aucun SQL, migration, secret ou déploiement manuel touché.
- L’essai sur téléphone physique reste à faire ; K-031 reste séparé. Contrôles
  GitHub du commit publié à renseigner après leur exécution réelle.

### Vérification finale — 11 octobre 2026

- État source publié sur `main` : `c6e38eda18f73698091c449c7b5dfb93bacda66c`.
  Vérification GitHub `38172486592` : succès pour unitaires/écrans/statique/build,
  E2E Playwright bureau+téléphone simulé, parcours cloud à RPC simulés et
  migrations sur PostgreSQL jetable. La compilation de production et les
  scénarios d’écran sont donc vérifiés sur ce SHA.
- Workflow automatique « Mise à jour Supabase » `38172742924` : succès ; le
  journal dit « La base est déjà à jour et vérifiée. Aucun SQL de migration
  exécuté. » Aucune migration n’a été appliquée à la production dans ce lot.
- Le premier essai E2E localement avait passé Drop/Binder et pack-tear (34/34),
  puis Craft (2/2). Les assertions Craft obsolètes ont été réécrites pour
  vérifier recettes/coûts accessibles et paiement encore bloqué par le solde ;
  elles n’ont pas été supprimées. Le contrôle GitHub final sur le SHA publié
  passe intégralement.
- Audit B : aucun doublon exact de sélecteur ou de `@keyframes` entre les trois
  feuilles visuelles dédiées et `globals.css` après scoping ; animations
  décoratives stoppées quand le sachet est ouvert / révélation affichée ;
  aucune lecture gyroscopique restante. Le parcours physique Android et sa
  mesure de performances réelles restent non vérifiés ; l’E2E téléphone est
  une émulation Playwright.


## Ergonomie courte / swipe de révélation — clôture CI, 11 octobre 2026

Le commit de suivi `674fc1df26a5976b5c60c74852bb8b0061434fbf` est publié sur
`main` ; `git ls-remote` a confirmé le même SHA. Le suivi capture le pointeur
pendant le swipe, y compris si le doigt sort des limites de la carte. CI
`38176673799` sur ce SHA : `success`, quatre jobs réussis (unitaires/écrans/
statique/build, Playwright, cloud RPC simulés, Postgres jetable).

Preuves locales : DOM Drop/Binder et révélation 28/28, puis révélation après le
suivi de capture 16/16 ; E2E mouvement réduit/continuité 4/4, abandon à mi-course
2/2, swipe horizontal 2/2 sur bureau et téléphone simulé. Typecheck, ESLint ciblé,
build statique et diff-check réussis. Le build local n’avait pas les variables
Supabase et ne constitue pas un test cloud réel ; les tests cloud de CI utilisent
des RPC simulées. Scan Sharp : les 1 000 portraits WebP se décodent ;
`diverron.webp` est le seul visuellement vert selon le filtre de luminance et
l’application utilise déjà `diverron-fallback.svg`. Les quatre feuilles CSS ne
partagent aucun sélecteur exact ni nom de keyframe. Le test Playwright mobile
est une émulation, pas une validation sur téléphone physique. Aucun SQL, donnée,
secret ou règle de jeu modifiés.

## Checkpoint recherche portraits — 12 octobre 2026

Reprise ciblée autorisée par Malik depuis `929d9af`, sans relire les archives.
Six fichiers originaux pour cinq créateurs examinés ; aucun nouveau remplacement.
Voir [la passation courte](passation-portraits.md#recherche-reprise-dans-la-nouvelle-session--12-octobre-2026)
et [le manifeste](portrait-recherche-2026-10-12.csv) pour les sources, licences,
réserves, SHA-256, accès testés et prochaine action. ZIP local dans
`/workspace/artifacts/portraits-2026-10-12.zip`, non versionné : à conserver.
Décodage/dimensions Sharp des 6 fichiers et intégrité ZIP réussis ; aucun test
applicatif exécuté pour ce diff documentaire. Réservation libérée. Publication
normale vers main ; SHA du checkpoint par `git log -1 --format=%H -- docs/passation-portraits.md`.

## Changement de périmètre portraits — instruction explicite de Malik

Refaire les portraits des 1 000 créateurs avec de belles images, petits compris.
Style confirmé : photos nettes, visage visible, cadrage individuel cohérent.
Voir D-055, passation-portraits.md et portrait-suivi-complet.csv. Les cinq noms
précédents sont un premier lot seulement. Ces changements sont locaux : Git
HTTPS échoue à cette reprise avec une demande de Username non interactive ;
aucun push ni état GitHub vérifié. Ne pas publier avant resynchronisation sûre.

## Lancement autonome des 998 portraits restants

Autorisation explicite de Malik avant son sommeil : avancer au maximum sur
les belles photos, conserver les deux portraits déjà intégrés. Accès GitHub
rétabli et main synchronisé à `32697cf` après le refus précédent. Pilote Commons
20 recherches/20 réussi ; traitement complet en cours, caches et originales
`/workspace/artifacts/portraits-complet-2026-10-12`. Script reprenable
`scripts/research-portraits.mjs`, aucun remplacement automatique. npm ci réussi
avec cache writable, lockfile inchangé. Voir la passation courte pour la suite.
Réservation portraits active dans cette session.

## Premier lot autonome : huit nouveaux portraits

Gotaga, Amouranth, Mastu, Maghla, ZeratoR, Nadeshot, Valkyrae, Doublelift intégrés
au registre et en WebP 900 px, source et cadrage consignés dans
portrait-selection-2026-10-12.json. Unitaires ciblés 21/21, DOM crédits 2/2,
typecheck, catalogue, ESLint ciblé et diff-check réussis depuis `54b1bc4`.
Collecte des 998 encore active, build/E2E final restant à exécuter.

## Pause demandée par Malik — bilan local avant changement de méthode

Malik signale une consommation de quota trop élevée et demande le bilan avant
une autre méthode. Suspendre les nouvelles recherches et contrôles coûteux.
HEAD publié vérifié précédemment : `f8474f1`, huit nouveaux portraits publiés
(avec Rubius/Shroud : dix), CI 38194626649 et Supabase 38194869061 success.
Le registre local contient désormais 30 portraits : 28 nouveaux, les deux
anciens strictement conservés. Les 20 nouveaux du dernier lot sont **locaux,
non commités, non poussés**. Leurs images sont dans public/creators/curated,
les sources/cadrages dans docs/portrait-selection-2026-10-12.json ; autres
fichiers locaux : registre, E2E crédits, script de collecte et suivi complet.

998 recherches Commons réussies ; 998 tentatives Flickr, 918 réponses
exploitables et 80 non exploitables. 274 fichiers originaux récupérés, dont
beaucoup de résultats hors sujet : ne pas annoncer 274 portraits utilisables.
Les tableaux distinguent recherche, téléchargement et sélection. Les grosses
images évincées du tampon Chromium ont été récupérées avec le client HTTP du
même contexte ; quelques URL restent en HTTP 429. YouTube refuse le tunnel :
licences Squeezie/Amine non confirmées, aucun remplacement pour ces deux.

Archives/galerie préparées dans /workspace/artifacts/portraits-livraison-2026-10-12
et ZIP voisins, pas publiées sur une Release. Ne pas redémarrer une collecte
complète. Prochaine étape : décider une méthode plus économique avec Malik,
puis reprendre uniquement la publication des 20 images locales si retenue.
Réservation de recherche libérée ; préserver tous les fichiers locaux.

## Audit indépendant de la progression — 13 octobre 2026

Pendant que le pilote portraits est traité séparément, correction documentaire
et locale du simulateur : les profils de `scripts/progression-bilan.ts` sont
maintenant générés en heure locale Europe/Paris, la même référence que le
Prime Time, au lieu d'heures UTC qui changeaient l'habitude simulée à l'automne.
Aucune règle du jeu, économie, écran, ni donnée portrait touchée.

Branche de travail `codex/progression-local-time`, partie de `main`
`1ced6cc1147e598d305ee830721b793fd54eeae4`. Commit publié normalement sur
`main` : `e184f5d6064e8fd836045b44e1f531b3c1014c4c`, confirmé par `git ls-remote`.
La CI GitHub
[`38441932774`](https://github.com/GoodFight37/CreatorDeck/actions/runs/38441932774)
est maintenant **success, 5/5 jobs**. Le suivi documentaire `f93ffcc` a été
publié sur `main` ; le workflow Supabase
[`38442505857`](https://github.com/GoodFight37/CreatorDeck/actions/runs/38442505857)
est également **success**. 100 parties × 12 scénarios
(1 200 au total), seed `20261010`, zéro paquet manquant. JSONL et comparaison
avec l'ancien calendrier dans `docs/audit-progression.md` et
`docs/audits/progression-local-time-100.jsonl` (SHA-256
`02ca7260e116bd9d50c8bd0a3fecc8e5374534b968bbe529da25a7e96fe693e1`).
Exécution complète `--seed=20261010` (une trajectoire par scénario) également
réussie. ESLint ciblé, typecheck (après mise de côté temporaire du cache `.next`
stale de l'autre branche) et `git diff --check` réussis. Pas de test Supabase.
Le prototype catalogue d'Arena et le pilote portraits restent séparés.

## Étude d'agrandissement du catalogue — 13 octobre 2026

À la demande de Malik, comparer le catalogue actuel à 1 500, 2 000 et 3 000
cartes avec les taux inchangés, pour éclairer les futurs ajouts. Branche de
travail `codex/catalog-growth-study`, basée sur `main` vérifié à
`f93ffcc8ed2f31c6def11e14f08f14a105d41865`. Quatre éléments locaux :
`scripts/catalogue-growth-simulation.ts`, commande `npm run catalogue:growth`,
`docs/audit-croissance-catalogue.md` et les résultats bruts
`docs/audits/catalogue-growth-300.jsonl`. Aucune entrée/identité/image n'a été
ajoutée au catalogue du jeu et aucun taux, économie ou RPC n'a été modifié.

Le modèle réutilise les tables de rareté actuelles et les familles ; les ajouts
sont des identifiants synthétiques répartis au prorata. 300 parties seedées par
cas, soit 7 200 trajectoires (4 tailles × 3 rythmes × 2 durées), simulent 2, 6
ou 12 Live par jour et une Scène par jour pendant 30/90 jours. Il suit les
cartes uniques, la part de collection, la complétion des familles et les chances
d'acquérir une cible choisie au hasard dans une rareté. Limites : outil Monte
Carlo indépendant, ni moteur par carte ni RPC Supabase ; pas de Craft, échanges,
missions, récompenses, Direct, variantes ou recharge de réserve. Les paquets
quotidiens sont supposés ouverts.

Résultat principal : avec les règles inchangées, un grand catalogue augmente le
nombre absolu de cartes collectées, mais réduit la part complétée et les chances
de trouver une cible précise, surtout pour le profil occasionnel. À 3 000 cartes,
la cible Légendaire tirée au hasard est obtenue avant 90 jours dans 23,3 % des
parties occasionnelles contre 54 % à 1 000 cartes. Recommandation exploratoire :
ne pas verser plusieurs milliers de cartes d'un seul coup sans présenter des
objectifs/saisons lisibles et sans décider si de nouvelles familles/contenus
ont une progression distincte. Ce n'est pas une décision d'équilibrage.
La famille S09, deux cartes aujourd'hui, atteint six dans le scénario 3 000 et
devient admissible au Paquet Scène ; c'est une conséquence de l'hypothèse de
répartition, pas une promesse de contenu.

Contrôles locaux : `npm run catalogue:growth -- --runs=300 --seed=20261013`
(24 lignes JSON, 300 parties chacune), `npx eslint
scripts/catalogue-growth-simulation.ts`, `npm run typecheck` (cache `.next`
stale déplacé temporairement puis restauré), validation JSONL et
`git diff --check`. Résultats SHA-256
`00a2b06754e0aacbdd3f36dc946543c787520e0cd198bcce1e9625cc67f1afa1`.
Comparaison de cohérence avec le moteur de progression précédent : les moyennes
sur 30 jours diffèrent de moins de deux cartes uniques. Pas de test de bout en
bout ou cloud requis pour cette analyse autonome.

Publié normalement sur `main` après vérification du parent distant. Commit
`b4d08e5802b72f6d75e44bc31be853dae4ea0c26`, SHA distant confirmé par
`git ls-remote`. La vérification GitHub
[38444258514](https://github.com/GoodFight37/CreatorDeck/actions/runs/38444258514)
est terminée avec 5/5 blocs réussis : SQL jetable, tests unitaires/écrans/
statique/build, deux lots Playwright et parcours cloud à RPC simulés. Le
workflow émet un avertissement d'obsolescence Node 20 des actions, mais aucun
échec. L’étude chiffrée, le prototype d’interface et le chantier portraits sont
des livrables distincts ; le rapport ne modélise pas les personnages fictifs et
ne prescrit aucune règle de progression produit.

## Comparateur de catalogue multi-univers — 13 octobre 2026

### Demande, décision et périmètre

Prototype unique à `/catalogue-demo` pour comparer un classeur mêlant des
créateurs Twitch fictifs et des personnages fictifs, avec progression et
classement séparés par univers. La recherche et les filtres sont interactifs ;
la page est responsive. Tous les noms/comptes sont inventés. Les portraits sont
des illustrations CSS abstraites, chacune marquée « Visuel temporaire ».
Décision D-076 : l’expérience sert à évaluer l’interface, sans décider les
identités, licences ou règles d’une version produit. Route isolée ; aucun
changement au jeu de production, aux portraits existants, à Supabase, aux
boosters ou à l’économie. `package-lock.json` est inchangé.

### État Git et fichiers

Branche fixe `arena/6c5a89f2-creatordeck`. La branche partait de
`1ced6cc1147e598d305ee830721b793fd54eeae4`; à la vérification, `main` avait
avancé à `f93ffcc8ed2f31c6def11e14f08f14a105d41865` par les commits
`e184f5d` (correction d’un simulateur local de progression) et `f93ffcc`
(checkpoint documentaire). Ces commits ont été examinés, puis la branche a été
mise à jour par fast-forward avant l’ajout du prototype ; ils sont des ancêtres
amont, pas des changements de ce prototype. Le commit fonctionnel est
[`2816ac6b04c8b217bf57c248e6648e13710409d2`](https://github.com/GoodFight37/CreatorDeck/commit/2816ac6b04c8b217bf57c248e6648e13710409d2). Le
premier checkpoint documentaire (`aac0f57c2614e0ec3bf01beba9ef19382e005b29`)
a été poussé normalement et vérifié par `git ls-remote` sur la branche.
CI GitHub [`38444219083`](https://github.com/GoodFight37/CreatorDeck/actions/runs/38444219083)
**success, 5/5 jobs**. Les migrations ont été vérifiées sur Postgres jetable et
le test de chemin cloud utilise des RPC simulés ; aucune migration ni écriture
sur Supabase de production.

`main` a avancé de `f93ffcc` au commit fonctionnel
`b4d08e5802b72f6d75e44bc31be853dae4ea0c26` (étude de croissance), puis aux
checkpoints documentaires `26def354` et `5dbdb4c`; la base demandée pour cette
reprise est `5dbdb4ca4d5102f7663a77ff9c27c584c0afd699`. Les changements amont
ont été fusionnés normalement dans Arena, sans réécrire l’historique. Le rapport,
le JSONL, `scripts/catalogue-growth-simulation.ts` et la commande
`npm run catalogue:growth` sont conservés tels quels. Il s’agit d’une simulation
locale à identifiants synthétiques, sans modification du catalogue publié, des
taux, de l’économie ou des RPC ; elle reste distincte du prototype d’interface.
La CI du commit fonctionnel `b4d08e5` (`38444258514`) et le workflow Supabase
(`38444683090`) étaient verts avant cette réconciliation ; les contrôles de la
branche après fusion restent à relancer.

Fichiers du prototype :
- `src/app/catalogue-demo/page.tsx` — entrée de route statique ;
- `src/app/catalogue-demo/catalogue-demo.tsx` — interface, recherche et filtres ;
- `src/app/catalogue-demo/demo-data.ts` — jeu de données fictif ;
- `src/app/catalogue-demo/page.module.css` — visuels temporaires et responsive ;
- `e2e/catalogue-demo.spec.ts` — scénarios navigateur ;
- `docs/decisions.md` — D-076 ; `docs/roadmap.md` — statut et prochaine étape.

### Vérifications finales sur le code du commit `2816ac6`

- `LD_LIBRARY_PATH=/tmp/al2023/lib npm run e2e -- --config=/tmp/catalogue-demo.playwright.config.mjs` : **8/8**, bureau et téléphone simulé ; le contrôle responsive couvre 320, 360, 390 et 412 px. Port 3000 étant occupé par la prévisualisation, le serveur E2E a choisi 3001 (avertissement non bloquant).
- `npm test` : **73 fichiers, 1 164/1 164**. Messages stderr liés aux fixtures négatives de génération ; code de sortie 0.
- `npm run ecrans` : **21 fichiers, 124/124**.
- `npm run typecheck` : succès ; lint ciblé
  `npx eslint src/app/catalogue-demo/page.tsx src/app/catalogue-demo/catalogue-demo.tsx src/app/catalogue-demo/demo-data.ts e2e/catalogue-demo.spec.ts` : succès ; `node scripts/check-jargon.mjs` : succès ; `npm run catalog:ci` : succès, sans écriture.
- `npm run build` : succès, `/catalogue-demo` exportée en statique. Avertissement attendu : les variables publiques Supabase ne sont pas définies dans ce build local ; aucune configuration Supabase n’a été ajoutée.
- Audit axe-core **4.14.0**, tags WCAG 2.0/2.1/2.2 A/AA, à 1280×900, 390×844 et 320×844 : **0 violation**, 28 règles en succès par fenêtre. Les 149 éléments de contraste restent marqués « à vérifier » par axe à cause des fonds dégradés ; des ratios représentatifs ont été vérifiés manuellement entre **8,46:1 et 18,10:1**. Ce contrôle n’est pas un audit RGAA exhaustif ni un test avec lecteur d’écran.
- `git diff --check` : succès.

`npm ci` a réussi (610 paquets ; lockfile inchangé) mais a signalé 16 vulnérabilités des dépendances (4 modérées, 10 élevées, 2 critiques) ; aucun audit correctif ni changement de dépendance n’a été fait dans ce prototype.

### Réconciliation avec `main` `5dbdb4c`

La branche publiée a été mise à jour par un merge normal, sans réécriture
d’historique ; les conflits étaient limités à `docs/roadmap.md` et
`docs/agent-handoff.md`. La roadmap conserve l’état du jalon de croissance de
`main` et le prototype comme expérience d’interface distincte. La passation
conserve l’étude complète, ses hypothèses, résultats, limites et empreinte
JSONL, puis le checkpoint du prototype. Les fichiers amont de l’étude et la
commande `npm run catalogue:growth` sont restés inchangés.

Revalidation locale après intégration :
- `npm test` : **73 fichiers, 1 164/1 164** ; les diagnostics stderr des
  fixtures négatives de génération restent attendus, code de sortie 0.
- `npm run ecrans` : **21 fichiers, 124/124**.
- E2E ciblé : **8/8**, bureau et téléphone simulé, fenêtres 320–412 px ; le
  serveur de test a utilisé le port 3001, le port 3000 étant réservé à l’aperçu.
- `npm run typecheck`, lint ciblé du prototype et du script de croissance,
  `node scripts/check-jargon.mjs`, `npm run catalog:ci` : succès.
- `npm run catalogue:growth -- --runs=300 --seed=20261013` : 24 lignes JSONL ;
  sortie identique à `docs/audits/catalogue-growth-300.jsonl`, SHA-256
  `00a2b06754e0aacbdd3f36dc946543c787520e0cd198bcce1e9625cc67f1afa1`.
- `npm run build` : succès ; `/catalogue-demo` est pré-rendue en statique. Seul
  avertissement : variables publiques Supabase absentes dans l’environnement
  local, sans configuration ajoutée.
- Axe-core 4.14.0 : 0 violation, 28 règles passées à 1280×900, 390×844 et
  320×844 ; les 149 éléments de contraste en arrière-plan dégradé restent à
  vérifier manuellement. Ratios représentatifs : 8,46:1–18,10:1 ; ce n’est pas
  un audit RGAA exhaustif.
- `git diff --check` : succès après résolution des conflits et de la documentation.

Le merge a été commité en
`b662f0abd9ee8ec30c4f42df93290e5fc3971f01` (parent `main` :
`5dbdb4ca4d5102f7663a77ff9c27c584c0afd699`) et poussé normalement ; `git ls-remote`
a confirmé ce SHA sur `arena/6c5a89f2-creatordeck`. CI GitHub
[`38446898234`](https://github.com/GoodFight37/CreatorDeck/actions/runs/38446898234)
**success, 5/5 jobs** : unitaires/écrans/statique/build, deux lots Playwright,
Postgres jetable et chemin cloud à RPC simulés. Aucune migration ou écriture
sur Supabase de production.

### Prévisualisation et suite

Prévisualisation statique active sur le port 3000, processus
`prototype-catalogue-creatordeck-f0b9c5bf` ; `GET /catalogue-demo` répond 200.
L’ouvrir depuis le Live Preview puis ajouter `/catalogue-demo`. En local :
`npm run dev`, puis `http://localhost:3000/catalogue-demo`. Captures mobiles,
ignorées par Git : `test-results/catalogue-demo-320-téléphone.png` et
`test-results/catalogue-demo-390-téléphone.png`.

Avant toute prochaine publication, revérifier le SHA distant de
`arena/6c5a89f2-creatordeck` et suivre les contrôles GitHub réellement déclenchés.
Prochaine étape produit : recueillir le retour sur l’interface et cadrer
explicitement les univers/règles avant tout branchement en production ; ne pas
ajouter de vrais comptes ou licences dans cette tâche.
