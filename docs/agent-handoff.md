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
