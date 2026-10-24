# Optimisation après audits — 24 octobre 2026

Demande Malik : points 1 à 6 dans l'ordre, un lot à la fois, puis revue
d'animations du point 8. Le point 7 reste réservé à Malik. Base vérifiée :
`main` local et distant `481d27a3b97ba8d47a2472d4069fc9d76aecd6a0`, aucune PR ouverte,
derniers workflows de ce SHA réussis. Suivi : `CreatorDeck-Codex-blp`.

Les dix skills demandés sont installés globalement. Le moteur facultatif
Impeccable est absent ; contexte DESIGN.md et références lus directement.
La mémoire externe a été refusée par le contrôle de confidentialité : suivi local.

## Lot 1 — test contraire au retrait du sachet

- Avant : scénario bureau `finger cuts` réellement exécuté sur `481d27a3`,
  échec en 14,5 s : opacité reçue 0, attendue > .5.
- Après : attente conforme au plan 002, durée 300 ms, délai 120 ms,
  opacité finale 0 et révélation conservée. Aucun changement du jeu.
- Commande : `npm run e2e -- e2e/pack-tear.spec.ts -g "finger cuts"`
  (Playwright lancé via Node avec les deux variables publiques Supabase vides).
  **2/2 réussis**, bureau et téléphone simulé, 17,5 s.
- Préparation : `next dev --webpack`, variables injectées par Node ; affecter
  `''` dans PowerShell les supprime et recharge sinon `.env.local`.
- Limite : ce lot de test n'est pas une validation Android.

## Lot 2 — catalogues au moment de l'ouverture

- Les deux hooks chargent le catalogue et la RPC en parallèle dans `commit`.
  Validation des identifiants, clé persistée et garde de changement de compte conservées.
- Analyseur Next : `next build --experimental-analyze`, avant et après réussis.
  Scripts référencés par `out/index.html` : **2 872 291 → 1 368 982 octets**,
  gzip calculé fichier par fichier : **677 801 → 394 488 octets**.
  Les marqueurs des deux catalogues sont absents de tous ces scripts après.
  Gain de 1 503 309 octets bruts ; aucune prétention de gain temporel sur Redmi.
- Mesure reproductible locale : `node reports/optimisation-2026-10-24/measure-bundle.mjs <repère>`.
  Fichiers de mesures `bundle-avant-lot2.json` / `bundle-apres-lot2.json` dans ce dossier ignoré.
- `npm run ecrans -- src/ecrans-meme-booster.test.tsx src/ecrans-imgflip-booster.test.tsx --maxWorkers=2`
  : **16/16 réussis**, 22,37 s. Builds analysés réussis, TypeScript compris.

## Lot 3 — écrans et feuilles à la demande

- Dix-huit composants conditionnels passent par `next/dynamic` côté client.
  PackTear et RevealOverlay se préchargent à l'appui qui prépare le sachet.
  Les gardes de tirage et de retour restent identiques.
- Build analysé réussi. Même mesure des scripts de l'accueil :
  **1 368 982 → 1 135 000 octets**, gzip **394 488 → 327 382**.
  Gain propre au lot : 233 982 octets bruts et 67 106 gzip.
- Scénarios navigation Réglages (focus et compte) et déchirure :
  **6/6 E2E réussis**, deux formats, 34,2 s.
- L'ancien refus du découpage (85 Ko pour 1 075 Ko, périmètre historique)
  est remplacé pour ce lot demandé explicitement et mesuré sur cette version.

## Lot 4 — boucles et geste de déchirure

- Anneau : dégradé fixe sur un pseudo-élément tournant ; portrait immobile.
  La variante compacte de l'accueil, qui désactivait déjà cet anneau, reste fixe.
- Reflet MEMES : film découpé séparément, déplacement par transform ; tranche
  latérale préservée. Reflets coupés et mouvement réduit arrêtent les boucles.
- Déchirure : inclinaison directe sur la scène et mouvement direct sur le rabat,
  une écriture par image. Retrait de `setPull` et des variables d'inclinaison
  héritées. Trace et découpe restent des états React : la géométrie doit être
  repeinte. Les variables du rabat sont figées uniquement au relâchement.
- Le reflet `foil-material-sheen` n'est plus monté dans PackTear (déjà vérifié
  par l'E2E) : suppression des écritures de lumière inutilisées ; position de
  fond de cette ancienne règle rendue fixe. Aucun nouveau reflet inventé.
- Cartouche de révélation MEMES opaque, sans backdrop-filter.
- Mesures CDP : Chromium PC, 412×915, DPR 2,75, CPU ×4 ; cinq chaînes Live
  simulées dans le vrai DOM du cercle complet (variante compacte retirée pour
  exercer l'anneau). Traces et images dans `reports/optimisation-2026-10-24`.
  Sur 2 s d'anneaux, RasterTask **280,52 → 0 ms**, Paint **363,43 → 0 ms**.
  Sur 5,6 s de reflet MEMES, RasterTask **884,81 → 0 ms**, Paint **193,94 → 0 ms**.
  Pour la déchirure, premier relevé de recalcul des styles **1 700,28 → 947,86 ms**,
  mais second relevé concurrent avec les E2E : **1 471,79 ms**, RasterTask **312,41 ms**
  contre **290,81 ms** avant : ne pas annoncer de gain de rasterisation du geste.
- Typecheck réussi. Une course du test de commune a été constatée : l'animation
  de 280 ms pouvait finir avant que Playwright la fige. Pause dès animationstart ;
  relance **2/2 réussie**, 22 s. Suite boosters en cours à ce checkpoint.
- Capture de révélation examinée : carte centrée, sachet absent, commandes lisibles.
- Suite boosters : **79 réussis, 11 ignorés, 2 échecs** (commune observée trop tard,
  conflit de traces de deux exécutions concurrentes). Après correction de la
  commune et relance séquentielle des deux cas sur les deux formats : **4/4 réussis**.
- Android : `npm run android:sync`, puis `ANDROID_HOME=<SDK installé>`
  `node scripts/android-gradle.mjs assembleDebug` : build réussi, 156 tâches
  dont 33 exécutées. APK installée avec `adb install -r` (données préservées).
  Script local `android-review.mjs lot4` : bascule native Live→MEMES→Live sans
  ouverture, petit geste annulé, large déchirure, retrait de coque, glissement
  de révélation et ouverture en mouvement réduit, **toutes les assertions réussies**,
  aucune erreur JS. WebView 412×842, DPR 2,625, API 36. Coordonnées physiques
  calibrées sur ses limites natives (offset y=128 px, pas une simulation CDP).
  Captures Android enregistrées. Barre système blanche constatée avant lot 5.

## Lot 5 — confort mobile

- Banc de styles calculés à 390×844, pointeur tactile, vrais sélecteurs :
  ghost **36→44 px** ; recherche **24→44** ; fermeture toast **24→44** ;
  fermeture profil **30→44** ; révélation **34→44** ; récompense mission **40→44**.
  Champ d'échange **14→16 px**. `user-select` des commandes **auto→none**,
  texte des champs conservé sélectionnable ; racine overscroll **auto→none**.
- Feuilles et transaction Atelier en `overscroll-behavior: contain`.
  Unités vh des quatre feuilles de style de l'application remplacées par dvh
  (le prototype catalogue hors application est conservé tel quel).
- Capacitor 8 : `SystemBars.style = DARK` signifie icônes claires selon les
  types installés. Le plugin reprend `android:windowBackground` : fond aligné
  sur `#08080c` pour éviter les icônes blanches sur le fond blanc antérieur.
- `typecheck` réussi ; tests transaction Atelier **9/9** ; navigation et
  rituels Atelier **20/20 E2E réussis**, 1,5 min.
- Build/synchronisation Android réussis ; Gradle **156 tâches, 39 exécutées**,
  installation `-r`. Vérifié sur API 36 : fermeture Réglages **44×44**,
  défilement contenu (`contain`), retour matériel refermant la feuille,
  zéro erreur JS. Capture système examinée : fond sombre et icônes blanches,
  y compris la barre de navigation. Aucun essai Redmi revendiqué.

## Lot 6 — textes et petits détails visuels

- Compte invité identifié comme tel ; notification sans « hors ligne » ; thème
  décrit comme accents du classeur ; faute sur la Légendaire retirée.
- Drop : « More info » → « Réserve et sabliers », « ÉDITION », connexion au
  tutoiement, « passer à 5/4 » → « ajouter un sachet bonus ».
- Objectifs au même impératif ; boutons MEMES traduits (NEXT CARD, SEE THE 5
  CARDS, REVEALING supprimés). « Sons et vibrations » désigne le réglage d'effets,
  ordre et titres des groupes conservés (point 7).
- Confirmation explicite de Malik pendant le travail : harmonisation globale
  « Mèmes → MEMES » autorisée. Appliquée à l'interface, ses libellés accessibles,
  aux erreurs client et aux attentes des tests. Dernier contrôle : les libellés
  des anciennes nouveautés sont harmonisés aussi ; identifiants et faits historiques conservés.
- Cibles d'arrondi 3→4 px ; rareté du dos 8–11→12 px ; interrupteur actif en
  `--action` avec curseur `--action-ink` ; deux règles `.menu-count` fusionnées
  en une seule en préservant leur résultat de cascade.
- Avant : libellés et dimensions relus dans le code et captures Android du lot 5.
  Tests ciblés Drop/compte/boosters **34/34**, contrôle jargon réussi.
  Suite écrans complète : chargement différé du lot 3 incompatible avec plusieurs
  assertions synchrones du banc (242 réussis, 14 échecs). Les six fichiers
  concernés attendent désormais l'arrivée des imports : **44/44 réussis**.
  Deux cas compte invité/lié ajoutés ; fixture corrigée pour déclarer le cloud
  configuré avant la première souscription, puis **6/6 réussis**.

## Portes transversales en cours

- Unitaires : **1218/1218 réussis**, hors bac à sable (le premier run y
  échouait sur les dépôts Git temporaires, pas sur le jeu).
- Lint réussi : overrides limités aux builds Android, aux assets web générés
  copiés dans l'APK et aux anciens rapports contenant du JavaScript compilé :
  `npm run lint -- --ignore-pattern "android/**/build/**" --ignore-pattern "android/app/src/main/assets/public/**" --ignore-pattern "reports/**"`.
- Jargon et `catalog:ci` réussis. Build statique et synchronisation Android
  réussis ; dernière APK Gradle : **156 tâches, 33 exécutées**, 15 s.
- `git -c core.whitespace=cr-at-eol diff --check` réussi : CRLF préservés dans
  les CSS conformément au plan 002 ; aucune normalisation globale.
- Écrans complets après correction de la fixture : **258/258 réussis** ;
  typecheck et jargon relancés avec succès.
- Après le lot 8 : écrans complets **261/261 réussis**, incluant les trois
  régressions de geste MEMES ; build final et synchronisation réussis, fixture
  absente de src et de l'export. Gradle final réussi.
- Suite E2E complète, 238 scénarios : **205 réussis, 29 ignorés, 4 échecs**
  sur les anciennes attentes « Son de l'application » dans deux fichiers.
  Après mise à jour du libellé attendu, relance des deux tests sur les deux
  formats : **4/4 réussis**, 22,2 s. Les 29 ignorés ne sont pas des réussites ;
  les parcours cloud simulés se vérifient séparément.
- Cloud simulé (configuration factice exacte du workflow, sans .env modifié) :
  **21 réussis / 22**, aucun ignoré. Un dépassement de délai sur le dos MEMES
  téléphone, puis relance isolée **1/1 réussie**. Le test cherchait le dos après
  une capture PNG alors qu'il disparaît vers 148 ms : mesure capturée désormais
  par MutationObserver dès son insertion. Relance MEMES/IMGFLIP sur les deux
  formats : **4/4 réussis**, 26,6 s ; aucun seuil ni durée du jeu augmenté.
- APK finale : Gradle **156 tâches, 33 exécutées**, 11 s. Dernier export :
  **1 135 050 octets de scripts initiaux, 327 398 gzip**, contre 2 872 291 et
  677 801 au départ (60,5 % bruts et 51,7 % gzip retirés). Taille gzip calculée
  par fichier, pas un relevé du transfert réseau réel du téléphone.

## État de reprise

Lots 1 à 6 vérifiés, revue 8 terminée ; tests cloud simulés et publication effectués.
Code audité : [`2e48cd7633a35d20e130053ac37eb3ff8a5fe847`](https://github.com/GoodFight37/CreatorDeck/commit/2e48cd7633a35d20e130053ac37eb3ff8a5fe847),
poussé normalement sur `main`, SHA distant vérifié.
Vercel Production : déploiement GitHub `7298546779` de ce SHA, statut `success`
le 24 octobre à 12:24 UTC, [application](https://creator-deckk-pmkwwpp9v-hafsi37-2386.vercel.app).
[CI distante](https://github.com/GoodFight37/CreatorDeck/actions/runs/40093728855)
du code `2e48cd76` entièrement **réussie** : six jobs de vérification verts,
synthèse d'échec ignorée puisqu'aucun échec. Checkpoint documentaire `064a629f`
également poussé, Vercel Production du même SHA réussi (déploiement `7298597831`).

Complément à l'harmonisation globale : les **20** occurrences historiques de
« Mèmes » dans les nouveautés affichées deviennent MEMES, avec les **58**
identifiants inchangés. Contrôle du source : aucune occurrence résiduelle de
« Mèmes » ou « MÈMES ». Unitaires ciblés (nouveautés, MEMES et IMGFLIP) **12/12**,
écrans **261/261**, typecheck et lint réussis après ce complément.
Relance E2E complète finale (`npm run e2e`, CLI Playwright installée, variables
Supabase explicitement vides comme ci-dessus) : **209 réussis, 29 ignorés,
zéro échec et zéro instable**, sortie **0**, 21 min 5,7 s.
Résultat : `reports/optimisation-2026-10-24/e2e-harmonisation.json`.
Contrôle visuel supplémentaire dans l'application à 390×844 : ancienne note
« Les MEMES arrivent dans CreatorDeck », date du 16 octobre conservée,
ancien nom absent et zéro erreur JS. Capture examinée :
`reports/optimisation-2026-10-24/nouveautes-memes.png`.
Complément de code audité et poussé normalement sur `main` :
[`f9c2d9ea68d07929753447ba333401d3c3975593`](https://github.com/GoodFight37/CreatorDeck/commit/f9c2d9ea68d07929753447ba333401d3c3975593),
SHA distant vérifié. [CI de ce complément](https://github.com/GoodFight37/CreatorDeck/actions/runs/40096003985)
encore en cours au relevé après push, sans attendre de nouveau ses suites longues.
Vercel Production du code final `f9c2d9ea` vérifié **réussi** : déploiement GitHub
`7298901994` du même SHA, statut `success` le 24 octobre à 12:56 UTC,
[application](https://creator-deckk-mvznlof0x-hafsi37-2386.vercel.app).
Bead `CreatorDeck-Codex-blp` clôturé. Les fichiers Kyara, quatre PNG préexistants
et fichiers locaux non suivis restent hors des commits. Les deux fichiers Gradle
touchés par la synchronisation Android n'ont aucun changement de contenu et ne sont pas indexés.
Modifications préexistantes préservées : bloc Kyara de la passation, quatre
captures Windows et fichiers non suivis. AVD `CreatorDeck_API36` démarré avec
`-gpu host`, visible par ADB hors bac à sable.

## Lot 8 — revue des animations

[Revue complète](revue-animations-2026-10-24.md), avec tableau avant/après et avis.
Un défaut de pointeur MEMES est corrigé : capture et identifiant du premier
doigt, annulation à la perte de capture. **3/3 tests de régression réussis**.
Android Chrome sur le même émulateur, vrais composants et vraies cartes via
fixture locale : les trois modes normal/réduit/Reflets coupés passent, avec
déchirure native, glissement vers la deuxième carte, cinq cartes, récap et sortie.
Le harness attend chaque compteur après une entrée native et recalcule l'offset
avec le viewport visuel (la barre d'adresse Chrome change sa hauteur).
Captures examinées : nom masquant la légende intégrée sur la grande carte,
récapitulatif à cinq cartes lisibles ; aucun backdrop-filter sur le cartouche.
La fixture temporaire est archivée dans les rapports locaux et retirée de src.
Aucune consommation de booster serveur. APK Live et navigateur Android MEMES
sont deux supports distincts ; aucun essai physique Redmi revendiqué.
