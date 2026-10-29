# Checkpoint Claude — lot H : retour aux sons d'origine, 29 octobre 2026

Suivi `CreatorDeck-Codex-t6y`, base `1b298c51` (main). Malik, après test téléphone :
pas de bruit de carte, rien à l'ouverture, aigus agressifs, sons et musique trop bas.

- **10 WAV d'origine** restaurés depuis `87716db9~1` ; prises générées du 27/10
  (`reveal-*`, `impact-*`, `pack-tear*`, `perfect*`, `grace`, `gavel`, `craft*`, `*-alt`)
  retirées de `public/sfx/`, conservées dans l'historique Git.
- **`sfx.ts`** : corps d'avant le 27/10 pour tous les gestes (synthèse + bruitage :
  `pop` à l'ouverture, `card-draw` à chaque carte). Gardés : `setAudioBackground`,
  `activeEffects`, aperçus, D1. `playCraft` joue `playReward` (son d'avant).
- **Retouches** : `card-draw` cible −21 dB (+4 demandé, gain réel **+3,35 dB**,
  plafonné par la crête −6 dBFS). `card-turn` déjà au plafond, inchangé ; il joue au
  tour de page du Binder (`binder-view.tsx:161`, bug `6u3`, déjà le cas avant le 27/10). Passe-bas **4,5 kHz** sur la synthèse
  (`SYNTH_LOWPASS_HZ`). Musique hub 0,08 → **0,14**, pack 0,04 → **0,07**.
- **Aigus mesurés** (rendu des plans, FFT, part > 6 kHz) : avant passe-bas, 0 à 5,5 %
  (déchirure 5,5, Épique 4,7, Rare 3,8) ; après, ≤ 0,5 % partout, centroïde Rare
  1 541 → 1 077 Hz. Les prises rejetées faisaient 56 à 97 %. Rendu théorique, pas une
  écoute.

Validation : unitaires **1 223/1 223**, écrans **267/267**, typecheck, ESLint ciblé.
`e2e/audio-premium` réécrit (vérifie `pop` + `card-draw` + synthèse) : 2/2. Unique suite
E2E complète : **227 réussis / 49 ignorés / 4 échecs**, 11,1 min ; les 4 échecs étaient les
gains de musique en dur de `pack-tear.spec.ts` (0,08/0,04), corrigés et rejoués 4/4.
**Non fait** : APK/émulateur et écoute sur le Redmi ; Malik teste au téléphone.
Fichiers locaux de Codex (lot A, `audio-lab.tsx`, PNG, Android, bloc Kyara) laissés hors
commit ; `audio-lab.tsx` local pointe encore vers `pack-tear.wav`, retiré.

# Checkpoint Codex — lots E1/B/C/D et carrousel, 28 octobre 2026

Base visuelle `6c82d3ec6116727c194ee1410ba036809c2baedd`, branche réelle
`docs/agents-demarrage-rapide` au même SHA que main avant le lot. Malik demande
tout le travail de l'échange : E1 inventaire, B constantes, C images, D Android,
suivi carrousel 3nq. Réservations Beads prises avant chaque lot.

- E1 `4nw` : `docs/audio-inventaire-evenements.md`, code intact. Grâce=grace.wav,
  marteau=gavel.wav, parfait=perfect/alt ; aucun plan de synthèse actif.
- B `5sr` : uniquement reveal.ts, meme-reveal.tsx, reveal.test.ts ; mêmes valeurs,
  constantes partagées. Unitaires 16/16, écrans ciblés 20/20, lint/typecheck verts.
- C `vpb` : `docs/audit-images-2026-10-28.md` ; sous DPR2 à 390×844 : créateurs
  998/1000, Imgflip 987/999, MEMES171/2150. Aucune des699 archives Upscayl ne
  correspond aux170 créateurs Épiques/Légendaires. Aucun ajout dans public.
- D `3rs` et carrousel `3nq` : APK officielle **886271 / 6c82d3ec**, manifeste,
  taille et SHA256 conformes, installée sur AVD API36 headless muet GPU host.
  Quatre ouvertures, douze captures, six glissés adb et vidéo ; tranches non
  croisées sur les images inspectées, zéro erreur JS. P95 instrumentés 50–66,7 ms,
  pas de promesse de 60 fps ni de validation physique. APK existante réutilisée,
  pas de nouvelle publication native ; le refactor B n'est pas dans cette APK.

Suite E2E complète locale base + diff B : **231 réussis / 49 ignorés / 0 échec**,
21,4 min. CI source [40656194492](https://github.com/GoodFight37/CreatorDeck/actions/runs/40656194492)
entièrement verte, snapshot Linux compris ; aucune régénération requise.
Rapports détaillés et preuves locales : [Android](verification-android-lots-2026-10-28.md).
Les erreurs initiales du harnais Android et la commande d'écran sans fichiers
sont consignées sans les compter comme réussites. Bug Binder encore sonore :
`CreatorDeck-Codex-6u3`, hors inventaire en lecture seule.

**Exclusions** : A rejeté par Malik, fichiers/brief/scripts/ledger/labo restent
locaux non committés ; Kenney non touché, aucune génération supplémentaire.
Modifications Android générées, 4 PNG préexistants et ancien hunk Kyara de cette
passation préservés hors commit. Publication ciblée uniquement du lot terminé ;
SHA de ce checkpoint via `git log -1 --format=%H -- docs/agent-handoff.md`.

# Checkpoint Codex — adoption D1 et clôture audio, 28 octobre 2026

Malik approuve D1 et tous les effets et demande activation dans le jeu sur main.
Base `fe36b821745a01e346dfca2289a1982cb29695f0`, suivi `CreatorDeck-Codex-brl`.
La source BGM pointe maintenant vers `collection-electronique-v1.mp3` ; identifiant
historique conservé pour les préférences, libellé Collection lumineuse. Les 36
prises acoustiques étaient déjà intégrées et publiées. Note joueur ajoutée.
Aucun appel payant supplémentaire : cumul final 3 845, dernier solde 34 919.
Malik demande de ne plus subir de lecteur ou fenêtre de test laissés ouverts :
aucune page ouverte et aucune lecture audible pour cette livraison.
Décision D-178 ; les anciens choix en attente ci-dessous sont remplacés.
Validation sur cette base et le diff d'activation : `npx vitest run
src/lib/sfx.test.ts src/lib/audio-briefs.test.ts src/lib/release-notes.test.ts`
**37/37** ; lint ciblé et `tsc --noEmit` réussis. `playwright test
e2e/audio-premium.spec.ts --grep "les gestes du booster"` : **2/2**, bureau et
téléphone simulé, Chromium sans fenêtre avec `--mute-audio`. Une seule BGM D1
chargée/décodée, plus de 30 effets préchargés, gestes sans oscillateur brut ni
double déchirure. Décodage complet D1 par FFmpeg sans erreur.
Pas de nouvelle APK ni de validation physique ; suite E2E entière non répétée
pour ce remplacement de source audio. Publication normale de ce commit sur
main ; SHA et état final de Vercel/CI consignés dans `CreatorDeck-Codex-brl`.

# Checkpoint Codex — référence Pocket analysée et candidate D1, 28 octobre 2026

Malik refuse les directions A/B/C et demande d'analyser l'OST Pocket pour guider
un nouvel essai. Suivi `CreatorDeck-Codex-brl`, base `e99a02fa`. Deux modèles
publics (Music Flamingo et LP-MusicCaps) ont analysé le fichier My Cards de la
même OST, cohérent avec Library Menu sans empreinte confirmant l'identité.
Import YouTube direct refusé par le service ; lecteur conservé muet. Les
hallucinations de structure temporelle du premier rapport sont écartées.

Une seule candidate **D1**, 90 s demandées : synthés/claviers doux, nappes, basse,
percussion électronique, développement en phrases plus longues. Brief, preuves
et limites : [direction D1](audio-direction-pocket-2026-10-28.md). Le jeu conserve
sa piste actuelle ; aucune candidate n'est adoptée sans le choix de Malik.
Fichier `public/music/candidates/collection-electronique-v1.mp3`, 89,444 s,
−20 LUFS, −3,9 dBTP, master sous `reports/audio/raw/`.

Coût de cet appel : **1 125 crédits**, provision 1 800. Cumul **3 845/14 000**,
solde **34 919**, réserve 24 764 protégée. Journal étendu à 43 appels réussis.
Générateur et préparation réutilisés avec `--briefs` et rapport séparé ; anciens
fichiers et mesures préservés. Tests scripts 6/6 et lint ciblé réussis. Aucun
changement d'écran, aucune APK locale. Écoute humaine D1 attendue.

# Checkpoint Codex — audio livré et contrôlé en ligne, 28 octobre 2026

Suivi `CreatorDeck-Codex-4m4`. Source audio `87716db9`, tests corrigés
`629a293aa7974a1220276e8e5824722d993fd7b7`, code audité inchangé.
Vercel Production **READY**, SHA exact `629a293aa7974a1220276e8e5824722d993fd7b7`,
`dpl_8CpeLci5inBwmZ3xgtFMS6Hm5DzM`, alias du jeu confirmé.
Écoute : **https://creator-deckk.vercel.app/audio-ecoute** (sans `.html`).
Lecture réelle des six candidates, un lecteur à la fois, passage de boucle,
arrêt et décodage des 36 WAV mono vérifiés sur le site ; capture 375×812 relue.
L'export `out/` exclut le labo, mais Vercel Next sert aussi `/audio-lab` ; ne pas
confondre ces deux sorties. Aucun changement de configuration Vercel.

CI initiale : trois shards E2E, 1 221 unitaires, cloud simulé et SQL jetable
réussis ; deux assertions d'écrans audio obsolètes ont échoué. Tests corrigés
(noms des candidates, préchargement et prise unique par verdict, mute, six
lectures disponibles). Suite écrans complète **267/267**, 40 fichiers. Aucun
code joueur ni asset modifié à la reprise.
[Nouvelle CI 40617029314](https://github.com/GoodFight37/CreatorDeck/actions/runs/40617029314)
sur `629a293` : **qualité complète réussie** (unitaires, écrans, statique, build),
SQL jetable réussi ; trois shards E2E et cloud simulé encore en cours au dernier
relevé. Les laisser finir côté GitHub, sans les annoncer verts par avance.

Budget confirmé par GET le 28 octobre : **2 720 consommés, 36 044 restants**,
aucun dépassement facturé ni nouvelle génération. La piste du hub reste en place,
le choix A1/A2/B1/B2/C1/C2 appartient à Malik. Pas d'APK locale ni validation
auditive sur téléphone physique. Rapport : [livraison audio](audio-livraison-2026-10-27.md).
**ZIP final du code/tests `629a293`**, 120 fichiers, 13 409 129 octets :
`C:/Users/Administrator/.codex/visualizations/2026/10/27/01a17d95-a0ee-7561-87d3-6e691e39e826/CreatorDeck-audio-final-2026-10-28.zip`.
SHA-256 : `7cc6505502dd0ad37ced63d102ab64b353bb58411a010a50290722f1e986821b`.
Archive testée sans erreur, noms uniques, contrôle d'absence de clé et `.env`.
Les compléments de statut documentaire sont consultables dans ce checkpoint.
Choix musical suivi séparément dans **`CreatorDeck-Codex-brl`**, question d'écoute
transmise à Malik. Ne remplacer aucun morceau sans sa réponse ; aucun nouvel
appel de génération. Les modifications locales préexistantes restent exclues.

# Checkpoint Codex — audio prêt, arrêt demandé pour éteindre le PC, 27 octobre 2026

Demande de Malik : chantier audio complet, remplaçant le report précédent.
Suivi `CreatorDeck-Codex-4m4`, base `b3922daf`, `main`. Plafond 14 000 crédits,
réserve minimale 24 764, aucun achat ni APK locale. **42 fichiers obtenus,
2 720 crédits consommés, solde 36 044**. Facturation différée rapprochée par GET.
Journal persistant avant chaque POST ; ne jamais répéter un appel incertain.
Effets acoustiques par rareté et gestes, Atelier après résultat, pas de second
motif légendaire/Perfect, arrêt des effets en arrière-plan. Piste actuelle
conservée ; choix musical réservé à Malik. `/audio-lab` reste local ; page
statique `/audio-ecoute.html` pour Vercel. Tests scripts 5/5, logique audio 37/37,
écrans 50/50, E2E complet **231 réussis / 49 ignorés / zéro échec**, 13,2 min.
Typecheck, lint avec exclusions des fichiers générés et build réussis.
Jargon : zéro sur 167 fichiers suivis ; le test général bute sur le prototype
Kyara local non suivi, préservé. Détails : [livraison audio](audio-livraison-2026-10-27.md).
**Code poussé et vérifié sur GitHub** :
[`87716db96572447f7020e43a6e9a47263f042576`](https://github.com/GoodFight37/CreatorDeck/commit/87716db96572447f7020e43a6e9a47263f042576),
`main` distant identique. ZIP local vérifié : 117 fichiers, 13 395 624 octets,
`C:/Users/Administrator/.codex/visualizations/2026/10/27/01a17d95-a0ee-7561-87d3-6e691e39e826/CreatorDeck-audio-2026-10-27.zip`.
**CI et Vercel encore à confirmer** ; accès Vercel natif HTTP 403, CLI absente.
Au dernier relevé : [CI 40520674349](https://github.com/GoodFight37/CreatorDeck/actions/runs/40520674349)
`in_progress`, statut Vercel `pending` sur le SHA du code.
Ne pas annoncer déployé avant vérification du SHA. Aucun processus local requis
pour la suite des contrôles GitHub/Vercel ; réservation Beads libérée.
Prochaine action : contrôler `git status`, HEAD/distant et le commit audio,
puis GitHub CI et Vercel/site public ; enfin demander le choix A1 à C2.
Les modifications locales préexistantes (Android, snapshots, prototypes et
ancien complément de passation) sont conservées et exclues du lot audio.

# Checkpoint Codex — catalogue Manga Drop complet, 27 octobre 2026

Demande de Malik : vérifier les cartes Anime et ajouter toutes les manquantes.
Code publié : [`f9ec59fd`](https://github.com/GoodFight37/CreatorDeck/commit/f9ec59fd38409cbb8395d0f49027dc2f1cbcb357),
`main` distant vérifié. Vercel Production `READY`, même SHA,
`dpl_8bo3uzmGAvBzr1h2Jm1SpzGtAKDL`.
Base `42587749`, suivi `CreatorDeck-Codex-lij`. Le jeu avait 20 cartes ; le
catalogue importateur contient 1 020 IDs uniques. Les 1 000 absentes et médias
sont ajoutés, avec manifeste Anime distinct du prototype, compteur dynamique,
pagination de 12 et recherche nom/série. Les anciens IDs et exemplaires restent
conservés ; aucune règle de tirage ni possession serveur n'est modifiée.
Les 1 020 fichiers (30 925 914 octets) sont vérifiés par SHA-256 ; tests Anime
3/3 et nouveautés 8/8, typecheck/lint/jargon réussis. Quatre E2E ciblés
bureau/téléphone verts ; captures 375/768/1440 px examinées. Suite générale :
227 réussis, 49 ignorés, aucun échec (sans cloud, deux workers, 9,1 minutes).
Compilation réussie ; deux E2E téléphone réussis sur le site publié, dont
ouverture complète et classeur `1020`, capture examinée. ZIP complet vérifié.
[CI du code](https://github.com/GoodFight37/CreatorDeck/actions/runs/40505133038)
en cours au relevé. Aucune APK locale construite, aucun essai sur appareil physique.
État et preuves détaillés : [passation Kyara](passation-kyara.md).

# Checkpoint Codex — couleurs Manga Drop et premier tap, 27 octobre 2026

Code publié : [`82695241`](https://github.com/GoodFight37/CreatorDeck/commit/82695241d2997757610ba32a8c8aaa99e13cba10),
`main` distant vérifié. Vercel Production `READY`, même SHA,
`dpl_8wZLh4Uya5Jxj74T4Bf5HcEAKYcK`. Calque arc-en-ciel supprimé sur Anime ;
premier tap tactile après swipe validé une seule fois sur les quatre boosters.
Trois régressions Playwright réussies sur le site publié ; compte/RPC simulés,
aucun tirage réel. Compilation, DOM et contrôles ciblés réussis. Les résultats
et la précondition corrigée de quatre E2E sont dans [le suivi des boosters](drop-boosters.md).
[CI du code](https://github.com/GoodFight37/CreatorDeck/actions/runs/40499006220)
en cours au relevé. Aucune APK locale construite, aucun essai sur téléphone
physique. Les checkpoints suivants conservent leur statut historique.

# Checkpoint Codex — réserves des boosters et sachet recentré, 26 octobre 2026

**Code publié et vérifié sur GitHub** :
[`ea80907a0d364a1d97c1cca6b97477a8cbfdc1a0`](https://github.com/GoodFight37/CreatorDeck/commit/ea80907a0d364a1d97c1cca6b97477a8cbfdc1a0),
`main` distant identique. Vercel **Production success**, même SHA, deployment
GitHub `7344886157`, statut du 26 octobre à 22:13:42 UTC :
[déploiement](https://creator-deckk-415vdk2r0-hafsi37-2386.vercel.app).
[CI du code](https://github.com/GoodFight37/CreatorDeck/actions/runs/40410669744) :
six jobs **en cours** au relevé. L'APK officielle dépend de cette CI verte ; elle
n'est pas encore annoncée publiée. L'APK locale effectivement testée est décrite
ci-dessous. Les suites longues peuvent terminer sans surveillance.

Retour Malik : Live ouvre mais MEMES/IMGFLIP bloquent par intermittence, avec
« Lecture de ta réserve… », réessai et demande de connexion contradictoires ;
sachet préparé trop bas et apparemment plus petit. Suivi `CreatorDeck-Codex-pg1`,
base `main` locale/distante vérifiée `ecaf2907`, Ponytail full. Aucun coût, stock,
tirage ni règle serveur à modifier.

Reproduction avant correction : E2E téléphone, session expirée et réponses de
renouvellement espacées ; MEMES reste bloqué malgré la session renouvelée.
Les hooks MEMES/Imgflip créaient chacun un CloudApi, donc leurs propres verrous
de renouvellement. Le client principal gagne ; les autres réponses sont devenues
obsolètes et rendent un faux no_session. Géométrie : centre à 58 %, écart mesuré
47 px sur 320×568. Deux scénarios avant correction échouent comme prévu ;
captures/traces : `D:/CreatorDeck-preuves/booster-reserve-position/avant/`.

Correction locale : `cloudStore.getApi()` réutilise son client unique dans les
deux hooks, sans changer la validation de session. Un réessai efface le problème
précédent dès son lancement. Drop et classeur MEMES distinguent panne et lecture
en cours. Sachet à 50dvh, même formule de largeur que l'accueil, sans changer le
carrousel ou la révélation des cartes. Les deux tests de connexion passent après
correction ; test de taille ajusté pour attendre la fin du mouvement du carrousel
avant sa mesure (sinon l'ancienne taille mesurée est encore en transition).

Fichiers : cloud-store, deux hooks, drop-view/meme-deck, booster-continuity.css,
deux tests écrans, fixture activités (session expirée en option), nouveau
`e2e/booster-session.spec.ts` et note joueur `2026-10-26-boosters-session`.
Vérifié : `npm run ecrans -- src/ecrans-meme-booster.test.tsx
src/ecrans-imgflip-booster.test.tsx --maxWorkers=2` **16/16** ; `npm test --
src/lib/cloud/api.test.ts src/lib/cloud/cloud-store.test.ts src/lib/release-notes.test.ts
--maxWorkers=2 --pool=threads` **272/272**, dont déconnexion/changement de compte
et sessions concurrentes ; `npm run typecheck` réussi.

E2E cloud finaux : **38/38**, aucun ignoré/flaky, 2,8 minutes, rapport
`D:/CreatorDeck-preuves/booster-reserve-position/cloud.json`. Inclut session
expirée/renouvellement unique, deux pannes/reprises, cadrage des trois sachets
en 320×568, 390×844 et 844×390, vrais gestes de déchirure navigateur.
Suite écrans complète : premier passage 263/264 (mock Scène sans le nouveau
getApi), mock corrigé, **264/264** finaux (`ecrans-final.json`). Notes et tests
uniquement adaptés aux API réutilisées ; aucun scénario supprimé. Jargon réussi.

Build Next16.4.2/Android sync réussi avec configuration factice ; Gradle
`assembleDebug -PcdVersionName=ecaf290-boosters`, 156 tâches/33 exécutées, 9 s.
APK installée et testée avec `node reports/boosters-android.mjs` : 6 préparations
natives (trois sachets, deux tailles), gestes ADB et Retour Android, centre/largeur
mesurés, puis 2 déchirures natives MEMES/IMGFLIP, cinq cartes chacune et récap.
Un renouvellement pour la session expirée, un tirage par univers, zéro erreur JS.
Transport HTTP simulé dans le banc, pas de preuve serveur réel ni Redmi physique.
Captures natives relues, stockage/dimensions restaurés ; résultats et métadonnées
APK dans `D:/CreatorDeck-preuves/booster-reserve-position/android/resultats.json`.
Version effectivement installée : **883409 / ecaf290-boosters**.
Les 4 PNG sachets préexistants restent hors de ce lot, ne pas les écraser.

Suite E2E générale exécutée entièrement : **217 réussis, 45 ignorés, 4 échecs**,
13,1 min (`e2e-complet.json`). Ces quatre écarts attendent l'ancien cadrage :
deux comparaisons d'images et deux contraintes de hauteur de soudure. Le test
compact contrôle désormais le centre à 50 % et la soudure dans la zone 25–50 %,
avec gestes dans les deux sens toujours exécutés. Rejeu Windows sans mise à jour
des références : **4/4** (`replay-final-win.json`), donc 221 scénarios distincts
réussis après ce rejeu ; ne pas présenter le premier passage comme entièrement vert.

Huit nouvelles références `centered-*` (scellé/déchiré, bureau/téléphone,
Windows/Linux) : les anciennes restent intactes, hashes des 4 fichiers locaux
préexistants conservés dans `snapshots-preexistants.json`. Linux réellement joué
dans WSL/Chromium 153, références générées par le scénario : **4/4**. Captures
Windows et Linux relues. Premier essai Linux arrêté avant lancement du navigateur
(libnspr/nss/asound absentes), second bloqué à l'accueil par l'origine du serveur
de développement ; installation locale des dépendances système puis accès
localhost via relais TCP temporaire. Aucune configuration applicative ou CI
modifiée. Rejeu Linux sans régénération : **4/4**, 52,3 s (`linux.json`).

Typecheck et lint rejoués après les dernières adaptations, réussis ; lint exclut
uniquement `android/**/build/**`, `android/app/src/main/assets/**` et `reports/**`.
Jargon réussi. `git -c core.whitespace=cr-at-eol diff --check` réussi : le CSS
booster-continuity est déjà versionné en CRLF, son format est conservé. Aucun SQL
ni catalogue modifié. Émulateur arrêté, stockage et dimensions restaurés.
Implémentation, tests et publication du code achevés. Serveur de développement,
relais TCP Linux et émulateur de ce lot arrêtés. Un ancien `.git/index.lock` vide
(créé à 21:45:59 UTC, aucun Git actif Windows/WSL) empêchait l'indexation :
travail/index sauvegardés sous
`D:/CreatorDeck-preuves/booster-reserve-position/index-verrou-1793052692436`,
puis seul ce verrou abandonné retiré. HEAD et index
vérifiés avant reprise, aucun reset ni changement d'historique.
Prochaine action utile : lire le résultat final de la CI liée en tête et, si
nécessaire, diagnostiquer seulement son scénario et ses preuves. SHA documentaire :
`git log -1 --format=%H -- docs/agent-handoff.md`.
Aucun vrai compte/token dans les tests ni les docs.
Préserver le bloc Kyara préexistant dans cette
passation, les deux Gradle générés et quatre PNG sachets modifiés avant ce lot.

# Checkpoint Codex — lots 4 et 5, activités existantes, 26 octobre 2026

**Code publié et vérifié sur GitHub** :
[`839ff43c82393059821bfbca390c88b790c189af`](https://github.com/GoodFight37/CreatorDeck/commit/839ff43c82393059821bfbca390c88b790c189af),
`main` distant identique. Vercel **Production success** du même SHA, deployment
GitHub `7326963891`, statut du 26 octobre à 08:08:59 UTC :
[déploiement](https://creator-deckk-jujyeid0d-hafsi37-2386.vercel.app).
Connecteur Vercel hors périmètre de l'équipe (403 déjà constaté) ; preuve lue via
les deployments GitHub et leur statut, sans toucher à la configuration Vercel.
[CI du code](https://github.com/GoodFight37/CreatorDeck/actions/runs/40290214295) :
SQL jetable et unitaires/écrans/statique/build **réussis** ; trois shards E2E et
cloud simulé **en cours** au relevé. Ne pas les déclarer verts par anticipation.
L'APK officielle de ce lot dépend de cette CI ; l'APK locale ci-dessous est celle
effectivement installée et vérifiée. Les suites longues peuvent finir sans suivi.

Demande Malik : Last Pack compréhensible, sans changer coût/règle, conserver
son code s'il est déjà bon ; Tribunal, Arène, Hôtel et missions seulement pour
des bugs visibles. Aucun nouvel écran, monnaie, rappel ou pastille de retour.
Base `main` locale/distante `713fed02`, suivi `CreatorDeck-Codex-3co`, Ponytail full.

Last Pack : présentation déjà claire en consultation (ami, cinq cartes, propriété
explicitée), conservée. Corriger seulement les états de lecture : l'attente ne
montrait aucune indication, l'échec devenait une invitation à partager. Indication
de lecture et bouton Réessayer en cas d'échec ; les packs renvoyés par le serveur
priment sur une déduction faite depuis le classement global.
Lot 5 : Hôtel bloqué visuellement en « Chargement du comptoir… » après un échec ;
message d'indisponibilité, action Actualiser existante conservée. Arène « 150e sur
100 » reproduit : le SQL limite le classement aux 100 premiers, ce n'est pas un
total ; garder seulement le rang. Le lundi, la date d'ouverture du draft affichait
le samedi passé : afficher le prochain, sans changer la fenêtre ni le serveur.
Tribunal : le double montant est **déjà corrigé** par `2f5ca420` ; aucune réécriture.
Assertion de non-répétition ajoutée au test existant. Missions inchangées.

Avant : quatre E2E téléphone échouent sur les défauts attendus, captures et traces
dans `D:/CreatorDeck-preuves/lots-4-5/avant/`. Après : les 8 scénarios bureau/téléphone
passent, reprises Last Pack/Hôtel comprises. 33 tests écrans ciblés réussis,
puis Tribunal rejoué 15/15 après assertion ; 38 tests logiques ciblés (arène,
Last Pack et notes) réussis. Typecheck et lint réussis avec exclusions des seuls
rapports/assets compilés déjà utilisées au lot D. Build Next 16.4.2 et Android
sync réussis avec configuration cloud **factice** du workflow, aucun vrai RPC.
Gradle `assembleDebug -PcdVersionName=713fed0-activites` : 156 tâches,
33 exécutées, 18 s, APK installée sur API 36 (émulateur de test sur D).

Suite cloud simulée : 29/30 réussis, échec temporel du test MEMES téléphone
(contrôle du verrou de 360 ms après plusieurs mesures). Test seul rejoué : même
échec. Observation du verrou à son apparition via MutationObserver, contrôle
conservé et aucun code du booster changé ; MEMES rejoué bureau/téléphone **2/2**.
Rapport initial `D:/CreatorDeck-preuves/lots-4-5/cloud.json`, traces conservées.
Suite E2E générale complète : **221 réussis, 37 ignorés, zéro échec et zéro flaky**,
16 minutes, cloud explicitement vide et serveur webpack. Les 8 nouveaux scénarios
cloud sont ignorés ici, exécutés séparément avec la configuration factice du CI.
Rapport `D:/CreatorDeck-preuves/lots-4-5/e2e-complet.json`.
APK `883341`, nom `713fed0-activites` : gestes ADB, reprises Last Pack/Hôtel,
rang d'Arène et Retour natif réussis en **390×844 et 320×568**, sans débordement
horizontal. Captures natives relues ; 15 lectures RPC simulées, aucun vol de carte,
zéro erreur JS. `node reports/activities-android.mjs`, preuves sous
`D:/CreatorDeck-preuves/lots-4-5/android/` (dont `resultats.json`). Le premier banc
n'interceptait pas HTTP natif : corriger le banc, sans modifier le transport du
jeu. Le test redirige uniquement HTTP vers les réponses factices après démarrage,
puis restaure stockage et dimensions. Aucune preuve de réseau/serveur réel ni
de Redmi physique. Taille réelle du WebView, aucune émulation CDP de viewport.

Commandes ciblées : `npm test -- src/lib/arena.test.ts src/lib/last-pack.test.ts
src/lib/release-notes.test.ts --maxWorkers=2 --pool=threads` (38) ;
`npm run ecrans -- src/ecrans-retention.test.tsx src/ecrans-social-sync.test.tsx
src/ecrans-tribunal.test.tsx src/ecrans-missions.test.tsx --maxWorkers=2` (33),
puis `npm run ecrans -- src/ecrans-tribunal.test.tsx --maxWorkers=1` (15).
`npm run typecheck` et lint rejoués après les dernières modifications de tests,
réussis ; `node scripts/check-jargon.mjs` réussi. Pas de SQL modifié.

Fichiers applicatifs : last-pack-sheet, market-sheet, arena-sheet et note joueur
`2026-10-26-activites-lecture`. Tests : activities-fixture/activities-visible,
stabilisation memes.spec et assertion ecrans-tribunal. Aucun SQL, coût ou règle changé.
Tribunal payé vérifié dans le navigateur : cinq verdicts justes, karma 100 %,
une seule occurrence de « +40 points ». Captures missions et bilan sous
`D:/CreatorDeck-preuves/lots-4-5/navigateur/` ; aucun code de ces écrans changé.
Implémentation, essais et publication du code achevés. SHA du commit de ce
complément documentaire : `git log -1 --format=%H -- docs/agent-handoff.md`.
Prochaine action utile en cas de retour : lire le résultat final de la CI liée
ci-dessus et, en cas d'échec, examiner uniquement son scénario et ses preuves.
Préserver les fichiers préexistants du lot D : Kyara dans cette passation,
Gradle généré, quatre PNG sachets, fichiers d'échange et autres non suivis.

# Checkpoint Codex — LOT D, classeur pilote, 26 octobre 2026

Demande Malik : reprendre les filtres Mèmes dans le classeur créateurs (rareté,
obtenues/manquantes, cercle, tri), progression existante, bas de page dégagé,
contrôles tactiles de l'audit encore vrais seulement, export local de page si simple.
Le lot son est mis de côté : ElevenLabs plus tard. Aucun travail Last Pack.
Suivi `CreatorDeck-Codex-2g9`, base `main` locale/distante `628c15e7`.
CI du code carte `36839abb` et APK officielle du checkpoint `628c15e7` réussies
(runs 40275117746 et 40275586488 vérifiés le 26 octobre).

Implémentation locale : filtres cumulables, fonctions de tri existantes, ordre
album par défaut ; compteurs uniques sur le catalogue courant, barres par rareté.
PNG local de la page affichée **sur navigateur**, à la demande ; dos anonymes
pour les manquantes. Chargement des portraits de l'affiche existante réutilisé,
aucun envoi automatique, aucune dépendance ajoutée. L'APK ne propose pas de
téléchargement blob non pris en charge ; pas de nouveau pont natif pour cet export.
Marge basse portée à 132 px + zone sûre. Décision D-169, note joueur
`2026-10-26-classeur-pilote`. Aucun changement de taux, économie ou SQL.
Audit : les cinq cibles citées sont déjà à 44 px ; champs déjà à 16 px sous
`pointer: coarse`. Pas de retouche aveugle de leurs anciennes règles.
Validation finale de la base `628c15e7` + diff LOT D :
- `npm ci --cache D:/CreatorDeck-preuves/npm-cache --no-audit --no-fund` :
  installation réalignée sur le lockfile (Next 16.4.2, auparavant 16.3.6),
  aucun changement de package.json/lockfile. Bloc AGENTS Next régénéré (niveau de titre).
- `npm test -- --maxWorkers=2 --pool=threads` : **1 218/1 218**, 95 fichiers,
  sortie 0, 75,16 s. Deux runs avec forks avaient 1 218 assertions réussies
  mais une erreur RPC `onTaskUpdate` ; ne pas les compter comme runs verts.
- `npm run ecrans -- --maxWorkers=2` : **264/264**, 40 fichiers, sortie 0,
  187,58 s. Ancienne attente « pas de 0 / 1000 » actualisée selon la demande.
- `npm run e2e -- --workers=2 --reporter=list,json` : **221 réussis,
  29 ignorés**, aucun échec/instable, sortie 0, 17,5 min. Variables publiques
  Supabase explicitement à un espace, serveur webpack ; rapport
  `D:/CreatorDeck-preuves/lot-d-e2e-final.json`. Aucun RPC de production testé.
- `npm run typecheck`, jargon et `npm run catalog:ci` : réussis.
- `npm run lint -- --ignore-pattern "android/**/build/**" --ignore-pattern
  "android/app/src/main/assets/**" --ignore-pattern "reports/**"` : réussi.
  Le premier lint incluait rapports et assets compilés ; exclusions limitées
  à ces produits générés, aucune exclusion du code applicatif.
- `npm run android:sync` (cloud absent, essai local), puis
  `node scripts/android-gradle.mjs assembleDebug -PcdVersionName=628c15e-classeur-verifie` :
  build Next 16.4.2 et Gradle réussis, 156 tâches / 109 exécutées, 58 s.
  APK **883273 / 628c15e-classeur-verifie** installée sur émulateur API 36.

Parcours natifs réussis à 390×844 et 320×568 (vraies dimensions WebView via
`wm size`) : taps adb Binder/Drop/page/fiche, choix Obtenues dans le menu Android,
Retour Android, swipe vertical ; combinaisons filtres et remise à zéro de page
via WebView. Dernière rangée au-dessus du sachet, aucun débordement ni erreur JS.
Complément de captures stabilisées et réserve sans cercle réussi aux deux tailles :
10 captures produites, rendu des têtes, dernières rangées et réserves relu.
Dernière rangée à 397 px, objet Drop à 472 px sur le viewport 320×568 ; réserve
sans cercle à 118 px, objet à 467 px après défilement. Aucun recouvrement observé.
Pour les menus natifs, désactiver l'émulation de focus Playwright ; sinon elle
empêche leur affichage. Recentrer les contrôles avant un tap adb pour éviter
la barre fixe. Les essais interrompus pour préparation ne sont pas des preuves.
Commandes : `node reports/lot-d-android.mjs`, preuves natives et JSON dans
`D:/CreatorDeck-preuves/lot-d/`. Export web de 12 obtenues réellement enregistré
et inspecté (`export-12-obtenues.png`), export des 12 dos aussi testé en E2E.

Limite locale rencontrée au départ : C disposait d'environ 1,2 Go, l'émulateur existant
refuse le démarrage faute de place. Configuration API 36 copiée sur D, disque
émulateur neuf sur D, original préservé ; démarrage désormais effectif.
Code **commité et vérifié sur GitHub** :
[`51ba6be4`](https://github.com/GoodFight37/CreatorDeck/commit/51ba6be47af1b43bfc09fcfb57f41aa3012d432e),
push normal main, SHA distant identique. Déploiement Production GitHub
**7326068339**, SHA `51ba6be4`, statut `success`, « Deployment has completed »
le 26 octobre à 07:08:23 UTC :
[Vercel](https://creator-deckk-6gzl3q6m2-hafsi37-2386.vercel.app).
Le connecteur Vercel liste le projet mais refuse sa lecture de déploiement (403,
scope hafsi37-2386) ; preuve obtenue via l'API GitHub, aucune configuration changée.
[CI 40283897147](https://github.com/GoodFight37/CreatorDeck/actions/runs/40283897147)
en cours au relevé ; Postgres jetable réussi, autres jobs en cours. L'APK officielle
du lot attend la CI verte. Ne pas confondre l'APK locale 883273 avec une publication.
Checkpoint contenant les preuves : commit documentaire ultérieur au code ; SHA
retrouvable par `git log -1 --format=%H -- docs/agent-handoff.md`.
Lot son reporté, aucun développement ElevenLabs ni Last Pack. Aucun test physique Redmi.
Préserver les fichiers préexistants : bloc
Kyara non commité de cette passation, Gradle généré, quatre snapshots sachets,
fichiers d'échange et autres fichiers non suivis. Ne pas les indexer avec ce lot.

# Checkpoint Codex — lot 1, la carte seulement, 25 octobre 2026

Demande active Malik : carte comme objet, portrait dégagé, nom lisible,
matières par rareté, rendu commun révélation/fiche/classeur, tap pour agrandir.
Ne pas toucher à l'accueil des boosters, aux valeurs, tirages ni au SQL.
Lots son/classeur/Last Pack/autres écrans uniquement sur nouvelle demande.
Lot A précédent annulé avant modification du jeu ; PR Arena 23 fermée sans
fusion et cinq branches arena supprimées à sa demande. Main conservé.

Suivi `CreatorDeck-Codex-p62`, base locale et distante `2c8367cd`.
Changements locaux : CreatorCard, CardInspectModal, RevealOverlay, matière
partagée dans globals.css ; suppression des reflets spécifiques dans
drop-binder.css et booster-continuity.css (aucune règle de sachet modifiée).
Nom et rareté sous la photo ; trame supprimée ; lien Twitch hors carte.
Tap révélation vers la fiche existante, Retour ferme la fiche, glissé avance.
Note joueur `2026-10-25-carte-objet`, tests provenance/tactile adaptés et
nouveau `src/ecrans-carte-objet.test.tsx` ; e2e/binder-finitions complété.

Validation locale terminée, code publié : 67 tests écrans et
30 tests logique ciblés réussis ; typecheck, ESLint ciblé et jargon réussis.
E2E ciblés isolés : 25 réussis / 1 ignoré. Suite complète isolée : **215 réussis,
29 ignorés (18,8 min)**. Après le dernier réglage du nom : 21 ciblés réussis,
4 interrompus par l'arrêt du serveur local, puis les 4 relancés réussis.
Le contrôle de la fiche de révélation couvre aussi deux variantes possédées
avec leurs vrais compteurs : 2 tests carte rejoués après cet ajustement.
Première suite complète non concluante :
140 réussis / 89 échecs / 15 ignorés, environnement cloud mêlé au local et
disque C saturé lors du rapport. Rapports préservés sur
`D:/CreatorDeck-preuves/lot-1-carte-premier-run/`. Ne pas annoncer ce run vert.
Relance complète avec variables Supabase explicitement espace (la chaîne
vide laisse Windows recharger `.env.local`) et serveur webpack réussie.
APK finale isolée **882813 / `2c8367c-carte-verifie`**, installée et testée
(156 tâches / 33 exécutées, Gradle réussi en 43 s).
10 fiches et deux classeurs capturés, tap/Retour/glissé adb réussis, sans erreur
JS ; modes Reflets coupés et mouvement réduit vérifiés. Dimensions Android
390×844 et 320×568 vérifiées après redimensionnement natif `wm size` :
l'émulation CDP seule recadrait la capture sans changer la WebView.
Avant : APK 881885 / `59becdd-bords-local`, viewport réel 412×842
(les noms historiques des fichiers avant portent 390/320, ne pas les confondre).
La revue visuelle à 320 px a montré un nom long trop haut en miniature :
taille adaptée, contrôle vertical ajouté et captures finales revues avec le nom entier.
Preuves locales non commitées : `reports/lot-1-carte/`, notamment
`avant-390-legendary.png`, `apres-390-legendary.png`, `apres-320-classeur.png`,
`apres-tap-retour-glisse.mp4` et `apres-resultats.json` (dimensions et version).
Commandes : `npm run typecheck`, ESLint sur les composants/tests modifiés,
`node scripts/check-jargon.mjs` ; `npm run ecrans --` avec les six fichiers
effets, tactile, live-provenance, drop-binder, binder-cercle et carte-objet ;
`npm test -- src/lib/card-fx.test.ts src/lib/reveal.test.ts src/lib/tilt.test.ts src/lib/release-notes.test.ts`.
Navigateur : `npm run e2e -- --workers=2 --reporter=list`, puis
`e2e/binder-finitions.spec.ts` et `e2e/binder-feuilletage.spec.ts` ciblés.
Android : `npm run android:sync`, `node scripts/android-gradle.mjs assembleDebug
-PcdVersionName=2c8367c-carte-verifie`, `node reports/lot-1-carte/android-carte.mjs apres`.
Code testé : base `2c8367cd` + diff du présent lot. Les instantanés Windows
préexistants des sachets sont conservés localement, exclus du commit.
Code commité et **vérifié sur GitHub** : [36839abb](https://github.com/GoodFight37/CreatorDeck/commit/36839abb80ed79619e8142510db19bfc72e6d935),
push normal main, SHA distant identique. [Vercel Production](https://creator-deckk-81ig9m7iy-hafsi37-2386.vercel.app)
réussi pour ce SHA : déploiement GitHub 7324896011, état `success`,
description « Deployment has completed ». Le connecteur Vercel disponible
ne retourne aucun projet ; preuve obtenue via l'API de déploiement GitHub.
[CI 40275117746](https://github.com/GoodFight37/CreatorDeck/actions/runs/40275117746)
encore en cours au relevé : Postgres jetable vert, tests statiques/cloud/E2E
en cours. Ne pas annoncer la CI ni une APK officielle verte avant leur fin.
La passation seule peut avoir un commit ultérieur ; le code audité reste 36839abb.
Prochaine action joueur : attendre le retour de Malik sur le lot 1.
Redmi non connecté au relevé, aucune validation physique revendiquée.
Préserver les modifications préexistantes de cette passation et snapshots
sachets ; ne pas les indexer avec le lot. L'accueil et les lots suivants
restent hors du chantier.

# Checkpoint Codex — tranches du carrousel, 25 octobre 2026

Nouvelle demande : vidéo `D:/Download/Screenrecorder-2026-10-25-07-29-27-984.mp4`,
bords qui se traversent pendant les changements. Malik demande un diagnostic
ciblé et rapide. Suivi `CreatorDeck-Codex-3nq`, décision D-167.
Base `main` / distant vérifiés `59becdd75149a6626b1db2a851afbd3966121b1d`.

L'émulateur utilisait initialement l'ancienne APK locale de diagnostic. Après
le signalement de Malik, installation réelle de l'APK publiée **881801 /
`1f0f79a`**, version vérifiée par `dumpsys package`, empreinte SHA256
`5014c0b466c6f7177cdbd8d1d874278ce9bcf49e6e1eb676cbc9240d25bfb26b`.
Vidéo native de référence `android-bords-actuelle.mp4`, 11 gestes sans erreur JS.

Correctif local dans `src/components/booster-carousel.{tsx,css}` : distance
80 → 100 % pendant le geste et au repos ; chaque emplacement compose son
sachet en un plan, rotation conservée. Aplatir seul ne suffit pas à séparer
les tranches. Note joueur `2026-10-25-tranches-booster` ajoutée.
`npm run android:sync` hors cloud réussi ; Gradle `assembleDebug
-PcdVersionName=59becdd-bords-local` réussi (156 tâches, 33 exécutées).
Présence du nouvel espacement vérifiée dans le CSS embarqué de l'APK.
Essai natif final réussi sur APK locale **881885 / `59becdd-bords-local`** :
11 gestes adb dans les deux sens, aucune ouverture ni erreur JS. Vidéo
`android-bords-final.mp4`, 67 images à 4 images/s inspectées : bords séparés
aux croisements, pas de découpe observée. Référence publiée et essai corrigé
distincts ; pas de validation sur Redmi physique. ESLint ciblé réussi.
Suite E2E complète exécutée : **207 réussis, 29 ignorés, 6 échecs** sur les
Nouveautés (compteur attendu 60, réel 61 : la note joueur a été ajoutée après
le chargement des tests). Relance ciblée `e2e/release-notes.spec.ts` : **8/8
réussis en 50,5 s**, sans modifier les tests. Les six échecs sont résolus ;
213 scénarios distincts réussis au total, 29 ignorés, pas un run complet vert unique.
ESLint des deux fichiers TS et contrôle du jargon réussis.
**Publié et vérifié sur GitHub :**
[`879196e2`](https://github.com/GoodFight37/CreatorDeck/commit/879196e2266c6d268c5cfcdd1be8e06c45c9902f),
push normal sur `main`, SHA distant vérifié. Production Vercel **READY** avec
le même SHA : [déploiement](https://creator-deckk-meobz1rey-hafsi37-2386.vercel.app),
`dpl_3xcvKuMjmKNbpUWgSBtRYN4EFK4f`.
[CI 40173633079](https://github.com/GoodFight37/CreatorDeck/actions/runs/40173633079)
encore en cours au relevé ; APK officielle corrigée pas encore publiée.
L'émulateur reste sur l'APK locale corrigée 881885, plus récente que la version
officielle précédente 881801. Ne pas présenter cette APK locale comme publiée.
Prochaine vérification si nécessaire : état de cette CI puis workflow APK
associé à `879196e2`, manifeste de version et mise à jour depuis 881801.
Commandes : `node reports/decoupe-carrousel-2026-10-25/android-bascule.mjs bords-final`
et `npm run e2e -- --workers=2`, journal `reports/decoupe-carrousel-2026-10-25/e2e-bords.log`.
Relance des nouveautés : `npm run e2e -- e2e/release-notes.spec.ts --workers=2`,
journal `e2e-bords-nouveautes.log` dans le même répertoire.
Conserver les modifications préexistantes Android, snapshots, et le bloc Kyara
plus bas ; ne pas les indexer avec cette correction.

# Checkpoint précédent — découpe du carrousel Android, reprise du 25 octobre 2026

Malik confirme le défaut persistant de découpe pendant IMGFLIP → MEMES puis
MEMES → LIVE et fournit trois captures et une vidéo de 14,18 s, conservée dans
`D:/Download/Screenrecorder-2026-10-24-16-40-44-590.mp4` (original non modifié).
**Suivi `CreatorDeck-Codex-21e`, correction D-166.** Reprise sur `main`
`8278a57df69a645a85e7fa565a00ec3e99600dfe`, distant identique après fetch.
CI du lot précédent `75ad0c8c` et APK `8278a57d` désormais réussies sur GitHub.

**Publié et vérifié sur GitHub :** code et preuves dans
[`1f0f79a9`](https://github.com/GoodFight37/CreatorDeck/commit/1f0f79a9248e78bc2db788d3c60f23ba9debedae),
SHA `origin/main` vérifié après push normal. Production Vercel **READY**, même SHA
dans les métadonnées : [déploiement](https://creator-deckk-16hxox1ku-hafsi37-2386.vercel.app),
`dpl_7SAfKaNoDvfgSjfRrjDQUrW8F8N6`. [CI Vérification](https://github.com/GoodFight37/CreatorDeck/actions/runs/40167208302)
**entièrement verte** (six jobs de vérification réussis). [Construction APK](https://github.com/GoodFight37/CreatorDeck/actions/runs/40167525853)
réussie ; **APK officielle [v881801 / `1f0f79a`](https://github.com/GoodFight37/creatordeck-apk/releases/download/v881801/creatordeck.apk)
publiée**, manifeste `latest.json` vérifié : SHA complet `1f0f79a9248e78bc2db788d3c60f23ba9debedae`,
140 445 351 octets, SHA-256 `5014c0b466c6f7177cdbd8d1d874278ce9bcf49e6e1eb676cbc9240d25bfb26b`.
La release 881040 / `75ad0c8c` ne contient pas D-166 ; la mise à jour utile est 881801.
Les tests ci-dessous portent sur le code de `1f0f79a9` ; les seuls changements
suivants de ce checkpoint sont documentaires.

**Diagnostic et validation :** défaut reproduit sur
APK locale/émulateur API 36, WebView 133, 412 × 842 CSS et DPR 2,625 : zone MEMES
absente pendant un glissé, visible dans `android-avant-controle.mp4` vers 9,25 s.
Les gestes sont envoyés par adb et chaque changement d'univers est vérifié.
Ne pas confondre les bords du viewport avec les rectangles manquants dans l'image.
Les anciens tests de styles/état final ne prouvaient pas l'absence de ces trous.
La conversion WebP a réduit le coût CPU, sans établir cette correction sur le Redmi.

**Correction locale intégrée — D-166 :** supprimer le dessin à 150 % et sa
réduction 2/3 dans `.pack-3d-front` ; les WebP de 1 050 × 1 540 suffisent à la
définition native. Sur le même scénario de 19 gestes adb, traces Chromium :
5 201 → 2 638 tâches raster ; 1 245 → 241 événements de tuiles manquantes ;
328 → 5 défauts de budget mémoire. Surface des calques dessinés : 140 → 78,5 Mio
en RGBA brut (estimation de surface, **pas** allocation GPU mesurée).
Des événements résiduels restent : ne pas annoncer « zéro tuile manquante ».
Les essais supplémentaires `will-change`, masque voisin caché et face clipsée
n'apportent pas de gain décisif ; ils ne sont pas intégrés. Reflet plus petit
également essayé, non retenu pour préserver son mouvement.
Code modifié : `src/app/drop-binder.css` et nouveauté joueur dans
`src/lib/release-notes.ts`. Aucune nouvelle dépendance ni logique de geste.
`npm run android:sync` et Gradle `assembleDebug` réussis ; nouvelle APK installée,
nom `8278a57d-carrousel-local`, reconstruite à partir du HEAD et du correctif.
APK précédente `dev` 881021, release vérifiée 881040 / `75ad0c8c` : leurs bases
ne diffèrent que par tests/docs, sans écart du code carrousel. La nouvelle APK
locale reste un essai sans cloud, pas l'APK publiée signée.
Validation sur `8278a57d` + diff ciblé, le 25 octobre :
- `npm run e2e -- --workers=2` : **213 réussis, 29 ignorés, aucun échec**, 11,1 min,
  variables Supabase explicitement vides ; les cas cloud ignorés ne sont pas validés.
- APK locale **881767**, `8278a57d-carrousel-local` : **23 vrais gestes adb**,
  changements d'univers vérifiés dans les deux sens, aucune ouverture involontaire
  ni erreur JS ; 159 images à 4 images/s inspectées et six images transitoires
  prioritaires issues d'un décodage à 30 images/s. Plus de rectangle manquant
  observé sur ces preuves, contrairement à la vidéo native avant correction.
- `npx vitest run src/lib/release-notes.test.ts` : **8/8** ; ESLint du TS touché,
  `node scripts/check-jargon.mjs` et compilation/typecheck intégrée verts.
- `apksigner verify --print-certs` : succès, certificat Android Debug ; empreinte
  APK SHA-256 `33c4204022c6292216c73b4f307e1e979aee6ca2e6728f2d380b662f3f37d73d`.
Pas de validation physique sur Redmi. Essais natifs locaux sans cloud ; les
contrôles cloud simulés et SQL jetable de la CI sont verts, pas un essai de compte réel.
Scripts, vidéos, contacts et traces : `reports/decoupe-carrousel-2026-10-25/`.
Captures joueur copiées dans `docs/images/bugs/2026-10-25-carrousel-decoupe-*.png`.
Captures natives : [avant](images/bugs/2026-10-25-carrousel-avant-emulateur.png),
[après MEMES](images/bugs/2026-10-25-carrousel-apres-memes-emulateur.png),
[après LIVE](images/bugs/2026-10-25-carrousel-apres-live-emulateur.png).
Suivi `CreatorDeck-Codex-21e` fermé ; aucun contrôle long encore en attente sur
le commit de code. La validation physique sur Redmi reste non faite. Aucun
runner, surveillance ou nouvelle dépendance ajouté.
Préserver les deux Gradle générés, quatre PNG pack-tear et le bloc Kyara préexistants.

# Checkpoint Codex — récapitulatif du booster parfait (24 octobre 2026)

Malik demande de corriger le dernier problème commité, avec Ponytail. Lot
`CreatorDeck-Codex-ohb` repris sur `main` `2b30420865711577f9d6b3c301dd4b698d2da302`,
identique à `origin/main` après fetch ; aucune PR ouverte, CI précédente verte.
Le checkout `CreatorDeck-Codex` conserve son ancien chantier et n'est pas modifié.

**Publié et vérifié sur GitHub :** code fonctionnel
[`3937b84c`](https://github.com/GoodFight37/CreatorDeck/commit/3937b84cfce6662f01da2f4051bc9c1345ec3a1a).
Validation et captures finales publiées dans
[`75ad0c8c`](https://github.com/GoodFight37/CreatorDeck/commit/75ad0c8c832fe1adb590d6cf7a5e6bca497a5050),
SHA `origin/main` vérifié après push normal. Vercel Production de ce même SHA
**READY** : [déploiement](https://creator-deckk-o07par3pj-hafsi37-2386.vercel.app),
`dpl_6zzjvwDAdjhfNfH2nKnXNUJNmHq7`, métadonnée Git vérifiée le 24 octobre.
[CI Vérification](https://github.com/GoodFight37/CreatorDeck/actions/runs/40114707546)
de `75ad0c8c` **en cours** au relevé. APK automatique en attente de cette CI
(`apk.yml` démarre après Vérification verte) ; aucune nouvelle release APK
n'est encore annoncée publiée. Suivi Beads `CreatorDeck-Codex-ohb` fermé.
Problème reproduit sur APK debug sans
cloud, émulateur Android API 36, 412 × 842 CSS : cinq encarts de spectateurs
recouvrent les portraits, cinq noms répétés. Directs simulés par cache local,
tirage déterministe ; aucune modification de compte ou base distante.
Correction dans `reveal-overlay.tsx` et `booster-continuity.css` : cartes compactes
existantes, titre court, noms uniquement sur la carte, rareté/Nouvelle/cercle
conservés dessous, grille dimensionnée à la fenêtre, halos de fond retirés.
Pas de changement aux tirages, sons, verrou de 2,6 s ou à la fin vers Twitch.

**Vérifié sur le diff de travail :** tests d'écran ciblés
`src/ecrans-effets.test.tsx` **33/33**, nouveautés **8/8**, `npm run typecheck`,
ESLint des quatre fichiers TS/TSX touchés et `node scripts/check-jargon.mjs` verts.
APK avant/après compilées (`npm run android:debug`, variables publiques vides
explicitement pour cet essai local). Premier Gradle refusé faute de SDK :
`android/local.properties` local et ignoré ajouté. Un build lancé avec le serveur
dev a échoué sur ses types générés ; relance séquentielle réussie.
E2E ajouté dans `e2e/perfect-recap.spec.ts`, rouge avant correction sur les cinq
noms répétés. Relance navigateur **2/2** verte (quatre fenêtres, deux modes de
mouvement). APK/émulateur : quatre parcours réussis, appuis Android natifs,
normal/réduit/Reflets coupés à 412 × 842 et petit écran 336 × 568, sans erreur JS.
L'inspection des captures a ensuite révélé les légendes masquées en mode Reflets
coupés ; un plan de peinture explicite (`position: relative; z-index: 3`) les
rétablit, confirmé par injection CSS puis sur l'APK finale recompilée
(build + sync + assembleDebug, sortie 0). Retest final **4/4 réussi**, zéro erreur
JS ; captures normal, réduit, Reflets coupés et 336 × 568 examinées.
Les E2E Perfect incluent maintenant ce troisième mode. Suite E2E complète lancée
en configuration sans cloud : **212 réussis, 29 ignorés, 1 échec** en 26,1 min.
L'échec mesure les cartes encore en animation après bascule de Reflets ; la
capture montre le retournement en cours. Le test attend maintenant les animations
finies avant de mesurer. Relance finale bureau **2/2 verte**, téléphone **2/2 vert**
séparément (une tentative partageant le serveur du run complet a perdu ce serveur
à la fin de la suite, `ERR_CONNECTION_REFUSED`, et n'est pas comptée comme verte).
Le lint global a parcouru les bundles/rapports générés locaux et échoué sur ces
artefacts ; le contrôle ciblé des sources est vert. Aucun contrôle applicatif
désactivé. Pour le diff CSS historiquement stocké en CRLF :
`git -c core.whitespace=cr-at-eol diff --check`.
Preuves/scripts locaux : `reports/recap-parfait-2026-10-24/`.

**Commandes finales :** `npm run e2e -- --reporter=list
--output=reports/recap-parfait-2026-10-24/e2e` (variables publiques vides et
`CREATORDECK_LOCAL_QUALITY=1`) ; relance `npx playwright test
e2e/perfect-recap.spec.ts --reporter=line` sur bureau puis `--project=téléphone` ;
`node reports/recap-parfait-2026-10-24/android-recap.mjs final` sur l'APK issue
de `npm run android:debug` avec les deux variables publiques explicitement vides.
Le code fonctionnel audité est `3937b84c` ; le commit suivant ne change que le
test d'attente, les captures et la documentation. Les 29 scénarios ignorés ne
sont pas annoncés réussis. Pas de SQL modifié, aucune suite SQL relancée.

**Suite précise :** laisser la CI liée ci-dessus terminer sans surveillance,
puis l'APK automatique ; en cas d'échec, reprendre le job et son SHA avant tout
nouveau changement. Aucun essai sur téléphone
physique ; les directs du test étaient simulés, aucun compte réel testé.
Modifications préexistantes à préserver : Gradle généré, quatre PNG `pack-tear`,
bloc Kyara non commité dans cette passation et fichiers non suivis.

# Checkpoint Codex — optimisation après audits (24 octobre 2026)

**Nouveau signalement à reprendre (24 octobre) :** Malik trouve le récapitulatif
du booster parfait (« God Pack ») trop chargé : bandeaux et informations répétées
empêchent de bien voir les cartes. Suivi ouvert **`CreatorDeck-Codex-ohb`, P2**.
[Constat et capture conservée](known-issues.md), image dans
`docs/images/bugs/2026-10-24-booster-parfait-recap.jpg`.
Demande initiale, remplacée par le chantier ci-dessus : noter pour plus tard ; aucune correction ni solution graphique
arrêtée. Reproduire sur APK/émulateur avant de modifier la hiérarchie du récapitulatif.

Reprise sur `main` `481d27a3`, SHA distant vérifié, dix skills installés.
Lots 1 et 2 terminés localement : 2/2 E2E, 16/16 tests boosters et builds analysés
réussis ; avec le lot 3, scripts initiaux 2 872 291 → 1 135 000 octets et 6/6 E2E.
Lot 4 vérifié sur navigateur et APK/émulateur API 36 avec vrais gestes tactiles.
Lot 5 vérifié (cibles mesurées à 44 px, barre système sombre sur l'APK).
Lot 6 appliqué, harmonisation globale MEMES explicitement confirmée par Malik.
Revue 8 terminée, geste MEMES protégé contre le second doigt et la perte de
capture. Trois modes MEMES vérifiés dans Chrome Android sur émulateur, fixture
retirée de l'application. Unitaires 1218/1218, écrans 261/261, typecheck, lint,
jargon, catalogue, build et APK réussis. E2E complet exécuté : 205 réussis,
29 ignorés, quatre anciennes attentes corrigées puis 4/4 rejouées vertes.
Cloud simulé : 21/22 puis le cas en délai rejoué vert ; mesure des dos rendue
indépendante du temps de capture PNG, relance MEMES/IMGFLIP **4/4 verte**.
Aucune décision du point 7 prise.
Résultats et commandes : [rapport du chantier](optimisation-2026-10-24.md).
Code audité et poussé normalement sur `main` :
[`2e48cd76`](https://github.com/GoodFight37/CreatorDeck/commit/2e48cd7633a35d20e130053ac37eb3ff8a5fe847).
SHA distant vérifié. Vercel Production du même SHA vérifié **réussi** le
24 octobre à 12:24 UTC : [déploiement](https://creator-deckk-pmkwwpp9v-hafsi37-2386.vercel.app),
déploiement GitHub `7298546779`, statut `success`.
[CI Vérification](https://github.com/GoodFight37/CreatorDeck/actions/runs/40093728855)
du code `2e48cd76` entièrement réussie (six jobs verts).
Checkpoint documentaire `064a629f` poussé et Vercel Production de ce SHA réussi.
Complément MEMES : les 20 anciens libellés des nouveautés sont harmonisés aussi,
avec leurs 58 identifiants conservés ; source sans occurrence Mèmes/MÈMES.
Après ce complément : unitaires ciblés 12/12, écrans 261/261, typecheck et lint verts.
Relance E2E complète finale : **209 réussis, 29 ignorés, zéro échec, zéro instable**,
code de sortie 0 ; 21 min 5,7 s. Rendu de la note historique MEMES vérifié à 390 px,
date conservée et zéro erreur JS. Complément et preuves publiés normalement sur `main` :
[`f9c2d9ea`](https://github.com/GoodFight37/CreatorDeck/commit/f9c2d9ea68d07929753447ba333401d3c3975593),
SHA distant vérifié. [CI du complément](https://github.com/GoodFight37/CreatorDeck/actions/runs/40096003985)
en cours au relevé après push, à ne pas annoncer verte ; aucun nouveau test nécessaire
pour ce dernier checkpoint uniquement documentaire.
Vercel Production du code final `f9c2d9ea` vérifié **réussi**, statut `success`
du déploiement GitHub `7298901994` le 24 octobre à 12:56 UTC :
[application](https://creator-deckk-mvznlof0x-hafsi37-2386.vercel.app).
Suivi `CreatorDeck-Codex-blp` clôturé. Serveur local de vérification arrêté.
Le commit documentaire de ce checkpoint se retrouve par
`git log -1 --format=%H -- docs/agent-handoff.md`.

# Passation Claude → Codex — optimisation de l'app après audits (24 octobre 2026)

**Base :** `main` après le commit « fix(drop): sachet opaque en chargement et reflet holographique sans repeinture » (SHA dans `git log`). Malik veut que tout soit optimisé (vitesse, fluidité, design, textes, agencement, réglages) et ne peut pas filmer : chaque gain annoncé doit dire s'il est mesuré ou seulement lu dans le code.

## Déjà fait par Claude (ne pas refaire)
- `7560d0a3` : sachets du carrousel en WebP (`scripts/build-pack-webp.mjs`), rastérisation par bascule 156–240 ms → 31–44 ms.
- Ce lot : (1) `stage.css` — plus d'`opacity: .55` sur le sachet désactivé (« Lecture de ta réserve… ») : translucide, il montrait ses voisins à travers (capture de Malik) et aplatissait la 3D ; (2) `PackArtwork` — reflet holographique déplacé par `transform` sur `.pack-holo-film` (calque propre, 2× le sachet) au lieu de `background-position`, transition CSS coupée pendant l'inclinaison JS, pas d'inclinaison pendant `.is-switching`. Mesure Chrome (capteur simulé 60 Hz, 2 s) : rendu **~550 ms → ~5–20 ms** ; au repos 0 ms. Non vérifié sur le Redmi.
- Portes : typecheck, lint, `test` 1218/1218, `ecrans` 256/256, build ✅ ; e2e boosters 92 ✅ / 13 ignorés / 1 ❌ préexistant (ci-dessous).

## À faire par Codex, dans cet ordre (un lot par ligne, tests et mesure avant/après)
1. **Test cassé préexistant** `e2e/pack-tear.spec.ts:683` (« finger cuts… », bureau) : attend la coque visible (> .5) après la 1re carte alors que le plan 002 l'efface en 300 ms. Échoue 3/3 sans les changements de Claude. Aligner le test sur le plan 002 (ou demander à Malik s'il garde le retrait du sachet), sans augmenter de seuil.
2. **Vitesse (le plus gros gain)** : `use-meme-booster.ts:9` et `use-imgflip-booster.ts:9` importent statiquement `@/lib/memes` / `@/lib/imgflip-booster` (memes-fr.json 749 Ko + imgflip.json 927 Ko) uniquement pour `MEME_BY_ID.has` / `IMGFLIP_BY_ID.has` (l.116) → `await import()` dans la fonction d'ouverture ; vérifier avec l'analyseur de bundle que ~1,6 Mo sort du chunk de l'accueil.
3. **Feuilles à la demande** : `creator-deck-app.tsx:6-34` importe statiquement ~20 feuilles rendues sous condition (l.917-939) → `next/dynamic(..., { ssr: false })` ; précharger PackTear et RevealOverlay à l'appui sur le sachet. Mesurer le chunk avant/après.
4. **Fluidité, coût prouvé dans le code** : `stage.css:125` anneau Live qui anime une variable CSS dans un `conic-gradient` en boucle → pseudo-élément en `rotate()` ; `meme-deck.css:35-37` reflet en `background-position` infini → `translateX` ; `pack-tear.tsx:389-391` variables `--opening-tilt-*`/`--opening-light-x` écrites sur la scène parente (+ `background-position` de `booster-premium.css:425`) → transform direct sur l'élément ; `pack-tear.tsx:63-70` trois `setState` par image pendant la déchirure → écrire `pull` dans le style ; `meme-reveal.css:32` `backdrop-filter` sur une carte animée → fond opaque. Leçon de ce lot : un `transform` écrit en JS sur un élément **sans calque** = repeinture du calque parent ; mesurer RasterTask (CDP Tracing) avant/après, scripts d'exemple décrits dans le checkpoint du 24/10 plus bas.
5. **Sensation native** : `overscroll-behavior: contain` sur `.odds-panel`, `.profile-sheet`, `.poster-modal`, `.tribunal-overlay`, `atelier-ritual.css:6-7`, et `none` sur `html, body` ; cibles < 44 px (`.ghost-button` 36, `.search-field button` 24, `.toast-error button` 24, `.profile-sheet-close` 30, `.reveal-header button` 34, `.mission-claim` 40) ; `user-select: none; -webkit-touch-callout: none` sur boutons ; `.trade-search input` dans la règle 16 px (`globals.css:4762`) ; `vh` → `dvh` ; barre d'état Capacitor 8 (SystemBars, icônes claires) à vérifier sur l'émulateur.
6. **Textes, corrections sûres** (tutoiement, français) : `notifications-sheet.tsx:113` « hors ligne » interdit (perimetre.md) → « Les notifications arrivent avec un compte. » ; `account-sheet.tsx:151` pastille « compte lié » pour un invité ; `theme-sheet.tsx` intro fausse (seuls les accents du classeur changent) ; `card-inspect-modal.tsx:160` faute « s'artisine » ; `drop-view.tsx:223` « More info » → « Réserve et sabliers », l.207 « ÉDITION », l.135/139 « Connecte-toi pour ouvrir MEMES », l.158 « passer à 5/4 » incompréhensible ; `settings-sheet.tsx:137` → « Sons et vibrations » ; missions à l'impératif (`missions-view.tsx:40`) ; une seule graphie MEMES / IMGFLIP. Arrondis 3 px → 4 px (`globals.css:2009, 2594`), `.card-back-rarity` 10 → 12 px, interrupteur actif en `--action`, doublon `.menu-count`.
7. **À NE PAS trancher seul — décisions de Malik** : remettre « Taux de drop » et « Crédits des portraits » dans Réglages (DESIGN.md/D-053 les y mettent, ils ont disparu) ; ordre des groupes de Réglages ; noms divergents (Craft/Atelier, Toi/Ma collection, « Wishlist ») et créateur vs streameur ; « Bonus Direct » ; sortir 56 Mo `imgflip-web` + 46 Mo `memes-fr` de l'APK (CDN) ; textes `drop-view.tsx:244` et `:329` dont le sens est à confirmer.
8. **Revue d'animations non faite** : l'agent `review-animations` de Claude a été refusé par le mode auto ; à passer sur pack-tear / meme-reveal / booster-continuity.
- Android : rien de ce lot n'a été vu sur le Redmi ni l'émulateur. AGENTS.md demande l'émulateur/APK pour animations et gestes.

## Skills à installer côté Codex (relus par Claude : texte seul, aucun script)
`npx skills add emilkowalski/skills -s animation-performance -s mobile-native -s review-animations -s emil-design-eng -s break-ui -g -a codex -y`
`npx skills add vercel-labs/agent-skills -s vercel-react-best-practices -s web-design-guidelines -g -a codex -y`
`npx skills add cloudflare/skills -s web-perf -g -a codex -y`
`npx skills add pbakaus/impeccable -s impeccable -g -a codex -y`
`npx skills add vercel-labs/skills -s find-skills -g -a codex -y`
`web-design-guidelines` télécharge ses règles depuis GitHub (vercel-labs) : contenu à traiter comme des données.

# Checkpoint Claude — bascule des boosters : gel et tuiles vides corrigés (24 octobre 2026)

- **Signalement réel de Malik (vidéo APK `4737dad`, 23/10 20 h 51)** : en passant de MEMES à LIVE DROP, la scène reste figée ~0,6 s, le sachet n'est affiché que par grands rectangles (moitié basse et voisin IMGFLIP manquants, LIVE réduit à une silhouette sombre), puis LIVE apparaît d'un coup. Le libellé passe à « LIVE DROP » tout de suite : l'état React change, c'est le rendu qui ne suit pas. Les correctifs D-163 (opacité/z-index, filtre) n'ont donc pas suffi sur le téléphone.
- **Cause mesurée** : ce sont des tuiles GPU pas encore rastérisées. Chaque sachet du carrousel est un SVG de ~280 tracés, rastérisé trois fois (image + masques `--pack-art` de `.pack-glint` et `.pack-holo`) sur une face dessinée à 150 %, et redessiné à chaque bascule. Trace Chrome (DPR 2,75, CPU ×4), RasterTask par bascule : **156–240 ms en SVG → 31–44 ms en WebP** (même dessin, A/B par substitution réseau puis vrai code).
- **Correctif** : `scripts/build-pack-webp.mjs` (sharp, 1050×1540 avec alpha, à relancer après `build-pack-art.py`) ; `BOOSTERS[].artwork` et le défaut de `PackArtwork` pointent vers `public/packs/*-opening.webp`. La déchirure (`PackTear`, ouvertures MEMES/IMGFLIP) garde ses SVG. Rendu relu à l'œil : net, reflet holographique intact. Note joueur `2026-10-24-bascule-boosters`.
- **Tests** : typecheck ✅, ESLint ✅, `test` 1218/1218, `ecrans` 256/256, `test:autonomy` 18/18, `catalog:ci` ✅, jargon ✅, build ✅. E2E complet une fois : 207 réussis / 29 ignorés / 2 échecs attendus (`pack-tear` « CSS-only pouch » attendait `live-opening.svg` sur l'accueil) ; attente mise à jour, rejoué 2/2. Revue `ecc:react-reviewer` : rien de bloquant.
- **Non vérifié** : le téléphone de Malik (aucun appareil adb branché) ; le gain réel sur le Redmi est déduit de la mesure PC, pas constaté. Les 4 PNG `pack-tear` modifiés localement avant ce lot et le bloc Kyara non commité d'un autre agent sont laissés hors du commit.

# Checkpoint — couture en plein milieu du sachet et saccade de bascule (23 octobre 2026)

- **Signalement de Malik sur l'APK** : « une sorte de coupure en plein milieu du booster numéro 2 » + bascule non fluide. Reproduit, corrigé, testé.
- **Cause** : pendant la bascule, le sachet sortant gardait `z-index: 2` (transition `z-index 0s linear 200ms`) tout en s'effaçant de 1 à .5, et le sachet entrant montait de .5 à 1. Les deux étaient translucides en même temps → le sortant se lisait **à travers** l'entrant, sur toute la hauteur du sachet. Les voisins à ±80 %, reculés et tournés, sont conformes à D-156 — leur taille n'était pas le défaut ; seule la transparence simultanée l'était.
- **Correctif (`booster-carousel.css`)** : le paquet choisi est opaque et devant dès la première image (`opacity` et `z-index` hors de sa liste de transition) ; le sortant descend d'un cran immédiatement ; `filter` n'est plus animé (animer un filtre sur une surface 3D re-rastérise tout le sachet à chaque image — c'était la saccade). Fil principal innocent : 0 ms de tâche mesurée (CDP), tout le coût était au rendu.
- **Preuve** : test `e2e/booster-selector.spec.ts` « la bascule de booster ne laisse jamais le sachet sortant devant ni translucide », **rouge sur l'ancien CSS** (opacité .5 au lieu de 1), vert après. Captures `reports/yeux/25-bascule-corrigee-*.png` et `26-bascule-repos.png` (dossier ignoré par git).
- **Portes** : typecheck ✅, lint ✅, `test` **1218/1218**, `ecrans` **256/256**, `test:autonomy` **18/18**, build ✅. E2E local : 9 passés / 5 ignorés / 1 échec **préexistant** (« mouvement réduit termine aussi une ouverture Live »), vérifié en stashant le correctif. Décision **D-163**.
- **Reste à Malik** : confirmer la fluidité ressentie sur son Redmi Note 12 Pro — aucune mesure de fps fiable n'est possible dans le bac à sable (headless sans compositeur, les mesures par rAF y sont faussées).

# Checkpoint — inspection visuelle réelle de l'appli (23 octobre 2026)

- **Méthode :** l'appli a été **regardée**, pas seulement mesurée : Chromium headless (`@sparticuz/chromium` + libs `al2023`) sur le serveur de dev, viewport 390×844 @2x, Supabase cloud factice (RPC interceptées). Captures dans `reports/yeux/` (dossier ignoré par git). Le téléphone de Malik (Redmi Note 12 Pro) reste **non testé**.
- **Corrigé — cartouches des vignettes Mèmes (deck et récapitulatif de booster) :** la formule auto-ajustée des cartes Créateur (`globals.css`, `min(22cqw, calc(160cqw / var(--name-len, 8)))`) tombait sur son repli 8 caractères et sortait le titre à **22,53 px dans 97 px** de large, `text-overflow: clip` : « CASSE-TOI ALORS, PA », « LA QUESTION ELLE ES ». Les deux grilles forcent maintenant `clamp(11px, 3.3vw, 15px)` + `ellipsis` → **12,87 px**, fin de mot remplacée par « … », nom complet conservé sous la vignette (`meme-deck.css`, `meme-reveal.css`).
- **Corrigé — grande carte de révélation :** le cartouche laissait lire la légende incrustée dans l'image (« Nous dormissons » sous « NOUS DORMISSIONS »). Un voile plus sombre ne suffit pas (texte blanc sur bandeau noir : le contraste survit) ; le cartouche de `.meme-reveal-front` reçoit un fond opaque dégradé + `backdrop-filter: blur(10px)`. Vérifié à l'écran sur la carte #052.
- **Infirmé — Objectifs sous la barre du bas :** la mesure initiale était prise sans être en bas de page. En fin de défilement, la pagination et les boutons restent **au-dessus** de la barre (`.app-content` réserve bien 92 px). Aucun correctif.
- **Sain :** Drop (sachet, réserve, aucun dialogue caché, `scrollHeight` 1149 légitime), Binder vide (Page 1/84), 0 erreur console. Animations confirmées à l'écran : 001 (`is-quick`, 280 ms), 002 (sachet à opacité 0 après 300 ms), 006 (cascade 0/40/80/120/160 ms).
- **Portes :** `typecheck` ✅, `lint` ✅, `test` **1218/1218**, `ecrans` **256/256**, `test:autonomy` **18/18**, `build` ✅. CSS uniquement, aucun SQL, aucun taux, aucune donnée.

# Checkpoint — huit plans d'animation des boosters exécutés (23 octobre 2026)

- **Livré (branche `arena/46a8ddec-creatordeck`)** : les 8 plans de `plans/` sont appliqués — 007 glissé du carrousel (écritures directes par image, plus de `--drag` parent, animations du sachet en pause pendant le glissé) ; 008 sachet qui penche (capteur Android / souris) + reflet holographique masqué ; 001 communes en 280 ms ; 003 transition du bouton ; 004 fondu en mouvement réduit ; 006 cascade du récapitulatif ; 002 retrait du sachet (300 ms, `translate` indépendant car `transform` porte le centrage) ; 005 consolidation des animations d'ouverture. Décision **D-162**, note joueur `2026-10-23-animations-boosters`.
- **Écarts assumés et documentés** : 002 utilise la propriété `translate` (le `transform` de l'élément porte son centrage) ; le bloc mouvement réduit de 004 inclut `.is-quick` (sinon la règle à deux classes gardait la priorité et la carte rapide continuait de tourner).
- **Non vérifié dans ce lot** : téléphone réel (Redmi Note 12 Pro de Malik) pour le glissé et l'inclinaison ; la CI Playwright joue le glissé, le tap, la déchirure et le nouveau scénario souris/Reflets. Aucun SQL, aucun taux, aucun média ajouté.
- **Reste à Malik** : valider à l'œil le sachet qui disparaît (préférence de 002) et l'intensité du penchement/reflet (angles et opacité .28), puis confirmer la fluidité sur son téléphone.

# Checkpoint — identité sonore : audit + laboratoire, génération en attente (23 octobre 2026)

- **Livré (branche `arena/a034535a-creatordeck`) :** audit complet `docs/audit-audio-2026-10-23.md` ; moteur enrichi (volumes musique/effets séparés persistés, défaut 1 = aucun changement d'écoute ; bascule de piste `MUSIC_TRACKS`/`setMusicTrack` avec fondu) ; laboratoire **`/audio-lab` dev-only** (retiré de l'export prod par `scripts/prune-prototypes.mjs`, `noindex`) : 3 directions + piste actuelle + silence, originaux contre variantes, vraies animations (déchirure, pack, raretés, Tribunal, scènes), sélections persistées `creatordeck.audio-lab.v1` ; briefs `src/data/audio-briefs.json` ; script `scripts/elevenlabs-generate.mjs` verrouillé (dry-run défaut, `--budget` obligatoire, clé env uniquement, jamais d'écrasement, sorties `public/{music,sfx}/candidates/`). Décision **D-161**.
- **Aucune dépense :** 0 crédit ElevenLabs consommé, pas de clé configurée. Budget à faire valider par Malik : palier complet **12 600 crédits** (6 min de musique + 36 effets) dans un Starter 30 000/mois ; paliers musique seule 5 400, économique 9 900. Après validation + clé fournie en secret d'env. : générer, écouter au labo, choisir, puis intégrer (couture de boucle, `sfx-niveaux.mjs`, portes) — **jamais de prod sans son accord**.
- **Ne pas rouvrir :** règle joueur « se déplacer ne sonne pas » (échantillons en réserve volontaires) ; silence BGM du Tribunal (choix dramatique) ; curseurs de volume dans les Réglages = décision Malik en attente (défaut : labo seul).
- **Vérifications :** portes locales relancées sur la branche (voir le résumé de PR) ; aucun SQL, aucun taux, aucune note joueur (rien d'audible ne change pour les joueurs).

# Checkpoint — raccordement client du booster Imgflip aux RPC 0062 (23 octobre 2026)

- **État de la migration :** Malik confirme que `0062_imgflip_univers.sql` est **déjà appliquée en production**. Ne pas la réappliquer ; les mentions « pas encore appliquée » des checkpoints ci-dessous sont anciennes.
- **Ce lot (client uniquement, aucune migration) :** le booster IMGFLIP quitte l'essai local sans sauvegarde et parle aux RPC existantes `imgflip_status()` / `open_imgflip_pack(uuid)`, sur le patron du booster Mèmes : réserve serveur affichée (4 max, recharge 30 min), préparation sans consommation, clé de requête persistée par compte et reprise après réponse perdue (idempotence), possessions Imgflip fusionnées dans le classeur Mèmes. Le tirage local `drawImgflipPack` est retiré ; compte requis, comme pour MEMES.
- **Vérifications réellement exécutées (local) :** `npm run typecheck` ✅ ; `npm run lint` ✅ ; `npm test` **1212/1212** (dont 3 nouveaux tests API Imgflip et le catalogue client) ; `npm run ecrans` **250/250** (dont les 8 tests du sachet Imgflip réécrits côté serveur : préparation/annulation, double geste, réponse perdue, refus 4xx, carte hors catalogue, sans compte) ; `npm run catalog:ci` ✅, jargon ✅, politique de déploiement `--check` ✅, `supabase-deploy.test.mjs` ✅, `test:autonomy` ✅, `npm audit --omit=dev --audit-level=high` : 0 ; `npm run build` ✅. Nouveau scénario E2E « avec le serveur » Imgflip ajouté (RPC simulées) : **non exécutable dans le bac à sable (aucun navigateur téléchargeable)** — il sera joué par le job cloud de la CI de la PR. Aucun appel à la production, aucune écriture distante dans ce lot.

# Checkpoint Claude — audit design mobile, retouches CSS locales (23 octobre 2026)

- **Base :** checkout `CreatorDeck` (pas `CreatorDeck-Codex`), fait sur `cb9ba1a5` puis reporté sans conflit de code sur `origin/main` `01bb6df6` (raccordement Imgflip), rien commité ni poussé. Audit à 375 px (Drop, Binder, Objectifs) avec le skill `mobile-app-ui-design`.
- **Fait :** (1) `drop-binder.css` : les jetons ne sont plus grisés à .58 en mode découverte ; le sablier, vraiment désactivé, le reste. (2) Valeurs hors échelle `DESIGN.md` ramenées dessus dans 5 CSS : 12,5→13, 13,5/14,5→14 px, graisses 650/750/850→600/700/800. Fins de ligne CRLF de `booster-continuity.css` préservées.
- **Écarté :** bouton d'ouverture visible sur le Drop. Contredit D-132, `stage.css:535` (légende réservée aux lecteurs d'écran) et les e2e (`.primary-action` absent, pas de consigne de geste). Décision produit à reprendre par Malik s'il le veut.
- **Tests :** `npm run typecheck`, ESLint, `vitest` écrans imgflip + drop-binder 17/17 ; Playwright `drop-craft-priorites` 8/8, `pack-tear` + `booster-selector` 75 réussis / 5 ignorés. **Piège :** lancer Playwright avec `NEXT_PUBLIC_SUPABASE_URL=` et `NEXT_PUBLIC_SUPABASE_ANON_KEY=` vides, sinon `.env.local` active le cloud et ~40 tests expirent sur « Essayer ».
- **Ouverture MEMES/IMGFLIP — continuité des cartes :** la carte révélée prend la taille (`--scene-card-width`) et le dos (`--back-*`) des cartes sorties du sachet (`meme-reveal.css`) ; palette `data-universe="imgflip"` ajoutée (`booster-continuity.css`, détection dans `pack-tear.tsx`) ; le dos IMGFLIP affiche « IMGFLIP » et non plus « MEMES ». Nouveau test e2e `booster-selector.spec.ts` « garde la taille et le dos » 4/4 avec le cloud factice de la CI ; scénarios « avec le serveur » MEMES/IMGFLIP 9/9 ; écrans 16/16. Captures relues. Compteur et bouton de `MemeReveal` suivent aussi le sachet (`--pack-accent` par palette, texte `--pack-accent-ink` sombre) ; repli inchangé hors palette. Scénarios « avec le serveur » relancés : 12/12.
- **Dos de carte redessiné (demande Malik « le dos ne va pas du tout », skill impeccable) :** le dos révélé Mèmes/Imgflip n'est plus du texte sur dégradé ; il reprend l'objet des cartes du sachet (cadre intérieur, médaillon, `CardBackEmblem`). Dos MEMES assombri (vert profond, filets citron au lieu de noir) ; étoile agrandie à `clamp(40px, 13vw, 84px)` pour tous les dos. `pack-tear` ciblé 14/14 (captures de référence inchangées), test « garde la taille et le dos » vérifie aussi l'emblème. DESIGN.md mis à jour.
- **À valider :** rendu Android (émulateur/APK) des nouvelles tailles et des dos ; Binder et Objectifs non retestés en e2e.

# Supabase — migration 0062 appliquée et vérifiée (23 octobre 2026)

- Reprise après publication par l'autre IA : `origin/main` vérifié `cb9ba1a5d3d0715124de343006b1e2ced432a673`, CI complète 39900079612 réussie. Checkout local resté `5bfe055c` avec modifications préexistantes conservées, aucune synchronisation forcée.
- Autorisation explicite de Malik conservée. L'ancien run automatique 39901183325 avait uniquement refusé la migration classée manual. Exécution approuvée lancée avec `gh workflow run supabase-deploy.yml --repo GoodFight37/CreatorDeck --ref main -f dry_run=false -f approve_manual=true`.
- **Production : 0062 réellement appliquée**, workflow [39902296665](https://github.com/GoodFight37/CreatorDeck/actions/runs/39902296665) completed/success. Logs : cible CreatorDeck/TLS/historique vérifiés, seule `0062_imgflip_univers.sql` appliquée ; contrôle après application réussi : quatre tables RLS, deux RPC, 999 cartes et répartition attendue des raretés. Aucun tirage de joueur exécuté pour cette vérification.
- Ce constat remplace les mentions « en attente » ci-dessous. Note locale de reprise ; preuve distante dans le workflow lié. Aucun changement de code dans cette reprise. Le raccordement du client aux RPC reste distinct de l'application SQL.

# Checkpoint Codex — filtres de révélation et serveur Imgflip 0062 (23 octobre 2026)

- **Publication intermédiaire vérifiée :** code/migration/tests poussés en `5bfe055c7d9c1ecd686c24d566cc3d3aea136676`, même SHA constaté par `git ls-remote`. [Vercel Production READY](https://vercel.com/hafsi37-2386/creator-deckk/5j4jpmhkFWN1Qpa1AW5X7yY3AinV) sur ce SHA. [Diagnostic Supabase en lecture seule 39891289895](https://github.com/GoodFight37/CreatorDeck/actions/runs/39891289895) réussi : TLS/cible/historique vérifiés, **seule 0062 en attente**, aucun SQL exécuté. La CI complète 39891254124 retrouve des échecs déjà présents avant ce lot sur `6a8365d0` ; le déploiement attend leur correction, pas une nouvelle autorisation de Malik.
- **Corrections ciblées nécessaires à la CI :** `src/ecrans-binder-cercle.test.tsx` attend désormais trois sachets ; `e2e/booster-selector.spec.ts` vérifie les deux voisins et les trois sélections ; les compteurs Mèmes de ce fichier et `e2e/memes.spec.ts` utilisent le total FR + Imgflip (3 149) ; `e2e/drop-craft-priorites.spec.ts` vérifie les sabliers dans les détails au lieu du compteur de garantie retiré ; `e2e/objectives-complete.spec.ts` vise la section Saisons maintenant affichée directement, sans ancien lien disparu. Aucun code du jeu changé pour satisfaire ces tests.
- **Références sachet anglais :** huit PNG suivis dans `e2e/pack-tear.spec.ts-snapshots/` actualisés (sealed/torn × bureau/téléphone × win32/linux), captures relues. Régénération Windows avec le scénario ciblé existant ; correspondance du scellé bureau régénéré avec le vrai rendu Linux de la CI : **zéro canal pixel différent**, mêmes dimensions 278×411. Références Linux reprises des rendus vectoriels Windows sur cette preuve ; validation complète des quatre références Linux encore à constater dans la CI suivante. Aucun seuil augmenté, assertion ignorée ou capture d'échec commitée.
- **Vérifications complémentaires locales :** `npx tsc --noEmit` vert après correction du test ; `npx vitest run --config vitest.ecrans.config.mts src/ecrans-binder-cercle.test.tsx` **8/8**. Quatre parcours ciblés du carrousel/catalogue/Drop/Objectifs, deux formats : sept réussites puis un échec de collecte de trace causé par deux runs Playwright se chevauchant dans le même dossier de résultats ; scénario téléphone rejoué seul, **1/1 vert**, aucune assertion fonctionnelle en échec. `npx playwright test e2e/pack-tear.spec.ts --grep 'CSS-only pouch' --project=bureau --update-snapshots --workers=1`, puis téléphone : **1/1 chacun**, déchirure/extraction complètes. Les runs suivants restent séquentiels. Aucun lancement local de la suite E2E complète.
- **Autorisation courante de Malik :** commit et push sur `origin/main`, puis **application de la migration en production expressément autorisée dans le dernier message** (« J'AUTORISE LA MIGRATION »). Cette nouvelle autorisation remplace la demande initiale de laisser le SQL en attente. Ne pas redemander confirmation. À ce checkpoint, migration écrite et testée localement, **pas encore appliquée à distance** ; attendre la CI complète du SHA publié et utiliser le workflow `supabase-deploy.yml` avec `dry_run=false`, `approve_manual=true`. Mettre à jour ce bloc après preuve réelle d'application.
- **Base et conservation :** départ `main` local `743ffc6697a4f6d84343abb971edeed79e45e849`, distant observé/fetché `6a8365d0300dadbe138de66c086ec578fd4f64c3`. Historiques divergents mais mêmes fichiers de code, plus deux ajouts documentaires distants. Fusion normale `9ec35079e27195f60b15cfbf30ad4c678deb46a5` conservant les deux historiques et les constats de Claude ; seul conflit documentaire résolu en gardant le bloc distant. Aucun reset, rebase ou force. Code testé : cette base + diff de ce lot. Les deux fichiers Android générés, `.beads/`, pièces jointes, `.playwright-mcp/`, `scripts/.imgflip-media.txt` et fichiers d'échange racine restent exclus des commits.
- **Animations :** dans `src/app/globals.css`, suppression des sept déclarations `filter` des keyframes `card-reveal-epic` / `card-reveal-legendary`. Transformations, jalons, durées et courbes inchangés ; ombres fixes sur les classes de rareté, désactivées par le réglage existant « Reflets des cartes ». Note joueur française ajoutée dans `src/lib/release-notes.ts`.
- **Migration `0062_imgflip_univers.sql` :** marquée `manual` pour empêcher toute application automatique sans approbation. 999 lignes de catalogue séparées, identifiants/titres/raretés repris du JSON existant (49 légendaires, 120 épiques, 230 rares, 300 peu communes, 300 communes). Quatre tables RLS, sans accès direct anon/authenticated ; RPC authentifiées `imgflip_status()` et `open_imgflip_pack(uuid)`. Réserve séparée de 4, recharge 30 minutes sur le modèle MEMES. Cinq cartes distinctes, tables Live, Perfect, compteur de garantie légendaire ; aucune mythique automatique, variante/direct/cercle ou modification des taux/économie existants. Verrou du profil, idempotence et possessions atomiques. Aucun changement du catalogue MEMES/Twitch, des portraits ou de l'éditeur. Droits non vérifiés, aucune preuve fabriquée.
- **Tests réellement exécutés :** `npx tsc --noEmit` code 0 ; `npx vitest run --config vitest.ecrans.config.mts src/ecrans-imgflip-booster.test.tsx src/ecrans-meme-booster.test.tsx src/ecrans-drop-binder.test.tsx` **25/25** ; `node --test scripts/import-imgflip.test.mjs` **4/4** ; `npx vitest run src/lib/imgflip-booster.test.ts src/lib/release-notes.test.ts` **11/11**. `node scripts/verify-supabase-migrations.mjs` sur **Postgres jetable local** : **1 052 contrôles réussis, zéro échec**, dont 24 nouveaux pour 0062 : catalogue/raretés, taux, sécurité RLS/permissions, identité et UUID, réserve/recharge, cinq cartes, rejeu à vide, garantie, Perfect réel à graine déterministe, deux connexions concurrentes pour la même requête, refus atomique du catalogue incomplet, migration rejouable et données MEMES/Twitch/wallet conservées. Log ignoré : `reports/verify-imgflip-0062.log` (UTF-16 sous Windows PowerShell). Aucune écriture distante pendant ces tests.
- **Protection du déploiement :** contrôle après application enrichi dans `scripts/supabase-deploy.mjs` : historique, quatre tables avec RLS, deux RPC et répartition réelle des 999 fiches doivent exister. `node --test scripts/supabase-deploy.test.mjs` **30/30** ; `node scripts/supabase-deploy.mjs --check` code 0, sans réseau. ESLint ciblé des scripts modifiés et notes joueur. Pas de suite E2E complète locale, conformément à la consigne de Malik ; la CI complète reste requise pour appliquer la migration via le workflow existant.
- **Contrôle CSS navigateur :** application réellement lancée sur `localhost:3001`, Chromium mobile 412×915 explicitement muet, trafic externe bloqué, navigateur fermé après essai. Les animations plus spécifiques de `booster-continuity.css` masquent ces anciennes keyframes dans le parcours courant : premier essai d'inspection sans animation correspondante, puis sonde forçant temporairement chaque keyframe sur la carte rendue (aucun changement de fichier). Quatre instants par rareté : `filter=none`, ombre identique et transform variable, code 0. Captures `reports/imgflip-0062/reveal-epic.png` et `reveal-legendary.png` relues ; sondes CSS sur une carte réelle, pas tirages Épique/Légendaire attestés ni mesure de fluidité Android. Aucun son émis par ce navigateur.
- **Fichiers du lot :** `src/app/globals.css`, `src/lib/release-notes.ts`, `supabase/migrations/0062_imgflip_univers.sql`, `scripts/verify-imgflip-booster.mjs`, `scripts/verify-supabase-migrations.mjs`, `scripts/supabase-deploy.mjs`, `scripts/supabase-deploy.test.mjs`, `docs/agent-handoff.md`, `docs/known-issues.md`, `docs/roadmap.md`. Anciennes migrations non modifiées. Suivi Beads `CreatorDeck-Codex-ap4`.
- **Reste fonctionnel :** le client utilise encore `useImgflipBooster` en essai temporaire sans sauvegarde. L'application du SQL ne raccorde pas automatiquement cette interface aux nouvelles RPC ; ce raccordement, la gestion des erreurs/réessais/compte et l'affichage de la réserve serveur restent un futur lot. Ne pas annoncer des possessions persistantes depuis le sachet local actuel. Émulateur/APK/téléphone non vérifiés dans ce lot.

# Checkpoint Claude (cloud) — état du sachet sur `main`, constats seuls (22 octobre 2026)

- **Demande de Malik :** faire le point sur le design du sachet et sa révélation ; il réalise les corrections lui-même avec Claude Code sur son PC. **Aucun code modifié** : ce checkpoint et l'entrée de `docs/known-issues.md` sont les seuls changements.
- **Base :** `origin/main` `957d22fb`. Attention : `codex/phase2-completion` s'arrête au 21/10 (`d140bf4`) et ne contient pas la refonte des sachets ; un premier bilan fait sur cette branche était périmé et a été retiré.
- **Déjà fait sur `main` (rien à refaire) :** SVG Live et MEMES redessinés façon TCG Pocket (`scripts/build-pack-art.py`), sachet plat sans tranches (liseré qb0 réglé), flottement 4,8 s et reflet `.pack-glint` toutes les 5,6 s, pile aux couleurs de chaque univers, scène d'ouverture et dos aux couleurs du sachet, plus aucune carte qui avance seule.
- **Captures relues** (Chromium Playwright, téléphone, DPR 2, `next dev`, sans cloud, partie neuve) : accueil Live à 320×568, 390×844 et 1024×768, accueil MEMES à 390, sachet scellé et première révélation à 390.
- **Défaut prouvé :** à 320×568 et 1024×768, l'objet Drop de la barre du bas (`nav-objects.tsx`, centre surélevé) recouvre la ligne de réserve `.stock-row` (« 2 sachets · prochain à … ») : à 1024 on lit « 2 sachets · [icône] à 23 h 20 », à 320 la ligne est entièrement dessous. À 390×844, rien n'est caché. Voir `docs/known-issues.md`.
- **Jamais vérifié (d'après les checkpoints du 21-22/10, et pas vérifié ici non plus) :** nouveaux sachets sur Android (émulateur, APK, téléphone) ; déchirure MEMES à l'œil ; cas doublon dans le navigateur (seulement en test unitaire) ; `review-animations` et `break-ui` sur les sachets.
- **Préférences, non tranchées :** l'impression « TIRE SUR LA SOUDURE → » s'affiche aussi sur l'accueil, où un appui suffit à ouvrir (même SVG que la scène de déchirure) ; région de la carte révélée tronquée à 390 (« EUROPE DU NORD & GERM… ») ; le point de pagination à côté du nom de l'univers paraît décentré. Ressenti du peel toujours ouvert (entrée du 14/10), sans symptôme précis.
- **Suggestion d'ordre :** (1) corriger le recouvrement de la réserve (réserver la hauteur de l'objet Drop sous le contenu de l'accueil, ou remonter la ligne), puis vérifier à 320, 360, 390 et 1024 ; (2) capturer la déchirure MEMES et un doublon ; (3) passer les sachets sur l'émulateur puis l'APK.
# Checkpoint Codex — troisième booster IMGFLIP local (23 octobre 2026)

- **État : implémenté et vérifié localement**, branche `main`, HEAD de base `8e6a84d7001e2746097eb8e9abcff9a10dcb46ad` + modifications non commitées. Aucun commit, push, déploiement, migration ou appel Supabase de ce lot. Travail préexistant/parallèle conservé, notamment `meme-reveal.tsx`, `meme-reveal.css`, catalogue et médias, fichiers Android et CSS du Drop modifiés par ailleurs.
- **Trois sachets :** Live Drop → MEMES → IMGFLIP. Sélection et glissés réutilisent le carrousel existant. L'ouverture Imgflip fonctionne sans compte, indique « Local preview · 5 cards · No cards saved », ne consomme aucune réserve, monnaie ou sablier. Préparer/annuler ne tire rien ; double déchirure protégée ; fermer efface le résultat temporaire.
- **Tirage :** pool séparé des 999 cartes `src/data/imgflip.json`, images WebP existantes, cinq identifiants distincts. Tables `PULL_RATES.live` réutilisées sans modification : quatre slots, Rare ou mieux en cinquième, Perfect selon le taux Live existant, garantie légendaire après `PITY.threshold` ouvertures sans légendaire. Ce compteur est temporaire, limité au montage du Drop. Distribution du catalogue vérifiée inchangée : 300 communes, 300 peu communes, 230 rares, 120 épiques, 49 légendaires ; aucune mythique attribuée. Aucun bonus de direct/cercle ni variante Holo/Gold simulé : ces propriétés concernent les créateurs Live, pas le schéma actuel Imgflip.
- **Ouverture :** réemploi de `MemeBoosterOpening` / PackTear / MemeReveal, avec contrôle local et chemin d'illustration distinct. Le composant partagé accepte seulement les commandes de présentation nécessaires ; le hook MEMES serveur et sa réserve restent inchangés. Aucun changement dans les deux fichiers de révélation réservés à Claude.
- **Visuel anglais :** `public/packs/imgflip-opening.svg` généré par la nouvelle fonction `imgflip()` de `scripts/build-pack-art.py`, gabarit/soudures communs et lettres vectorisées. Textes : IMGFLIP, INTERNET CLASSICS, 5 MEME CARDS, TEAR ALONG THE SEAL, 5 CARDS · EDITION 01. Génération ciblée uniquement, sans réécrire les SVG Live/MEMES : `python -c "import runpy; m=runpy.run_path('scripts/build-pack-art.py'); (m['ROOT'] / 'public/packs/imgflip-opening.svg').write_text(m['imgflip'](), encoding='utf-8')"`, code 0 ; fontTools déjà disponible, aucune dépendance installée.
- **Fichiers de ce lot :** `src/lib/imgflip-booster.ts`, `src/lib/imgflip-booster.test.ts`, `src/hooks/use-imgflip-booster.ts`, `src/components/booster-carousel.tsx`, `src/components/drop-view.tsx`, `src/components/meme-booster-opening.tsx`, `src/ecrans-imgflip-booster.test.tsx`, `scripts/build-pack-art.py`, `public/packs/imgflip-opening.svg`, cette passation. Catalogue, approbations, taux et économie non modifiés par ce lot.
- **Vérifications exécutées sur ce HEAD + diff local :** `npx tsc --noEmit`, code 0 ; puis `npx vitest run src/lib/imgflip-booster.test.ts`, **3/3**, code 0 ; `npx vitest run --config vitest.ecrans.config.mts src/ecrans-imgflip-booster.test.tsx src/ecrans-meme-booster.test.tsx src/ecrans-drop-binder.test.tsx`, **25/25** (3 + 8 + 14), code 0. Bornes des poids de chaque slot, Perfect, garantie, pool, doublons, préparation/annulation/double engagement, ordre et glissés du carrousel couverts. ESLint ciblé a d'abord signalé une lecture de ref React pendant le rendu du nouveau hook : corrigée en stockant le focus dans l'état ; contrôle ciblé suivant vert.
- **Parcours réellement essayés :** `npm run dev -- --port 3000`, variables publiques Supabase vides et télémétrie désactivée dans le processus ; deux scripts `node -e` utilisant Playwright Chromium au format téléphone 412×915, trafic hors localhost bloqué. (1) Accueil Mes chaînes, sélection Imgflip, ouverture sans déchirer, cinq révélations, cinq WebP chargés, bilan puis fermeture, zéro erreur JS. (2) Événements tactiles CDP : Live → MEMES → IMGFLIP, résistance à droite, préparation/retour et focus restitué. Les deux scénarios finaux passent, code 0. Premier essai navigateur interrompu par l'accueil Mes chaînes non renseigné : scénario corrigé, pas un défaut du booster. Captures `reports/imgflip-booster/drop-mobile.png` et `reveal-mobile.png` relues visuellement (ignorées par Git). Ce sont des vérifications navigateur mobile, pas émulateur/APK/téléphone physique ; aucune suite E2E complète lancée.
- **Reste et doute explicites :** tirage réel, réserve/possession/idempotence côté serveur, éventuelle migration et intégration serveur nécessitent un futur lot autorisé ; aucun SQL préparé/appliqué ici. Les cartes d'essai ne sont pas ajoutées au classeur. La révélation partagée conserve ses textes MEMES et son bouton final « VOIR MA COLLECTION » qui ferme le résultat : libellé trompeur dans l'essai local, à coordonner avec Claude sans modifier ses fichiers pendant son chantier. Pas de note de version de publication pour cet essai non publié. Suivi Beads `CreatorDeck-Codex-rz8`.

# Décision Malik — catalogue Imgflip ramené à 999 cartes (23 octobre 2026)

- Le modèle du rang 277 (HTTP 403) reste exclu. Le rang 1001, ajouté pour atteindre 1 000, est retiré : aucun remplacement.
- `src/data/imgflip.json` : 999 cartes, rangs de popularité 1 à 999 sans trou (le rang 277 est absent), numéros 2304 à 3302, raretés `rarityForRank(rang, 999)` : 49 légendaires, 120 épiques, 230 rares, 300 peu communes, 300 communes.
- `src/data/imgflip-approvals.json` : 999 approbations, numéros et raretés alignés sur le catalogue.
- `scripts/import-imgflip.mjs` et ses tests : total de 999, rang maximal 999. Un refus donne 998 approbations.
- Média du rang 1001 supprimé de `public/imgflip/` (fichier non partagé).
- Tests : `node --test scripts/import-imgflip.test.mjs` 4/4 ; `src/lib/memes.test.ts` 2/2.
- Non commité. Le poids des médias (`public/imgflip/`, environ 580 Mo) reste à trancher avant tout commit.

# Checkpoint Codex — 1 000 modèles Imgflip importés localement sur main (23 octobre 2026)

- **Terminé sur le périmètre réduit demandé par Malik :** importeur et données réunis dans `C:/Users/Administrator/Desktop/CreatorDeck`, branche `main`, HEAD de base final `9f455661da0920e39d138d05d4e0bdc1f534767f` **plus ce lot non commité**. **1 000 modèles réellement importés : 919 images et 81 GIF**, ajoutés aux 2 150 cartes FR conservées, soit 3 150 fiches dans le catalogue client. Aucun commit/push effectué par Codex, aucune écriture Supabase ou migration, aucun taux ou mécanisme économique modifié. L'ancien worktree Codex et ses modifications ont été préservés, pas fusionnés/supprimés ; l'importeur de référence pour ce lot est désormais celui de `CreatorDeck` sur main.
- **Périmètre protégé :** les boosters restent le chantier de Claude. Codex n'a modifié aucun SVG, `build-pack-art.py`, composant Drop/PackTear/MemeReveal/MemeCard, écran Cercle, note de version ou test de booster. Seule adaptation d'interface hors boosters : source des fiches du catalogue dans `meme-deck.tsx` (Imgflip au lieu de l'attribution MyMemeCards codée en dur ; pas de crédit répété/tronqué). Le badge existant « Mèmes FR » des cartes n'a pas été modifié, car `meme-card.tsx` est réservé à Claude.
- **Fichiers du lot :** `scripts/import-imgflip.mjs`, `scripts/import-imgflip.test.mjs`, `scripts/collect-imgflip.py`, `scripts/collect-imgflip.test.py`, `src/data/imgflip.json`, `src/data/imgflip-approvals.json`, `src/data/imgflip-exclusions.json`, `src/lib/memes.ts`, `src/lib/memes.test.ts`, `src/components/meme-deck.tsx`, cette passation, et **983 fichiers médias uniques** dans `public/imgflip/`. Les autres modifications locales préexistantes/parallèles ne sont pas celles de ce lot. Aucun lockfile, `.env.local`, fichier de `supabase/`, portrait ou éditeur Imgflip modifié.
- **Méthode et limites :** API publique `get_memes?type=image` en ordre retourné, puis pages publiques `/memetemplates?page=N`, tri affiché Top 30 days, dédoublonnage par ID. 27 pages ont permis d'identifier les 1 000 premiers rangs et le suivant. Les pages générales incluent aussi des GIF ; ils sont conservés à leur place. Le champ API `captions` étant historique, aucun faux tri numérique sur « 30 jours » n'est fabriqué : on suit l'ordre API puis pages validé dans la demande. GET séquentiels espacés de 2 s, sans retry réseau ; robots.txt du site respecté, robots.txt CDN absent (404). Aucune limite chiffrée officielle n'a été établie : la cadence de 2 s est une précaution locale. Aucun endpoint privé/premium, authentification, changement d'identité ou domaine extérieur à Imgflip utilisé pour la collecte.
- **Refus isolé et reprise :** le média du rang source 277, modèle `661023643`, a répondu 403. L'arrêt global initial était trop large : après la demande orale de Malik de poursuivre les suivants et d'arrêter si le refus se répétait, les rangs 278/279/280 ont répondu 200, puis tous les autres ont été récupérés sans second refus. **Aucune nouvelle requête sur le modèle refusé.** Option annoncée pour tenir l'objectif de 1 000 accessibles : l'exclure et prendre le suivant, modèle `156387628` (« am I a joke to you », rang source 1001). La sélection finale est reclassée automatiquement de 1 à 1 000 ; `sourceRank` conserve le rang avant exclusion, et `imgflip-exclusions.json` garde l'identifiant, l'URL et la raison du refus. Les bilans intermédiaires ci-dessous indiquant 999 modèles potentiels ou des numéros avec un trou sont remplacés par ce résultat final.
- **Raretés et numéros réellement vérifiés :** `rarityForRank(rang de la sélection, 1000)` : **50 légendaires, 120 épiques, 230 rares, 300 peu communes, 300 communes**, zéro mythique automatique. Numéros **2304–3303**, après le maximum FR 2303, sans collision ; 3 150 identifiants et numéros uniques avec le catalogue existant. Aucune rareté attribuée à la main. La rareté « Peu commune » est ajoutée aux métadonnées de présentation TS ; aucun taux de tirage client/serveur modifié.
- **Approbations et droits :** les 1 000 approbations portent owner « Malik (projet personnel) », note « droits non vérifiés, validation explicite de Malik », evidenceUrl = URL publique du modèle, empreinte SHA-256 du vrai original. La page source ne constitue pas une preuve de droits ; `redistribute=false`, `modify=false`, statut `unverified` dans les données. Le crédit n'attribue pas les œuvres à Malik : les fiches affichent « Source : Imgflip ». Aucun droit acquis n'est prétendu.
- **Volume mesuré :** somme logique des médias contrôlés par l'importeur **610 813 958 octets** ; fichiers uniques réellement copiés dans le dépôt **607 621 042 octets (~608 Mo)**, 983 fichiers (216 PNG, 686 JPEG, 81 GIF ; quelques modèles partagent une même empreinte). Cache médias externe **635 620 477 octets**, avec les MP4 originaux ; dossier externe complet avec `.source`, pages et sauvegarde **796 103 587 octets** au relevé avant le dernier complément de passation. Cache/bundle : `D:/Coding/CreatorDeck-Importer-main/output/imgflip-top1000`. Ancien bundle de 200 inchangé dans `.../imgflip-live/bundle-20261021-090456`. Seuls les médias utilisés par les fiches sont copiés dans `public/imgflip`, aucun MP4 original. Gardes d'import maintenues : 25 Mio par fichier, 2 Gio au total avant toute copie. Le périmètre initial de plus d'un million de modèles a bien été abandonné à la demande de Malik.
- **Commandes de collecte/import exécutées :** première collecte `python scripts/collect-imgflip.py --output D:/Coding/CreatorDeck-Importer-main/output/imgflip-top1000 --download` ; reprise autorisée avec `--skip-rank 277`, puis finalisation par **`python scripts/collect-imgflip.py --output D:/Coding/CreatorDeck-Importer-main/output/imgflip-top1000 --download --skip-rank 277 --fill-missing`**, code 0, réutilisation des fichiers locaux, seul le modèle de remplacement ajouté. Préflight `node scripts/import-imgflip.mjs --bundle D:/Coding/CreatorDeck-Importer-main/output/imgflip-top1000/imgflip-cards.json --ranked`, code 0, approved 1000 / excluded 1 / written false ; même commande avec `--write`, code 0, written true / databaseApplied false. Hashes et collisions contrôlés avant copie, JSON remplacé par renommage du fichier temporaire. Le CLI adapté n'écrit aucun SQL.
- **Tests finaux :** `node --test scripts/import-imgflip.test.mjs` **4/4**, `python scripts/collect-imgflip.test.py` **6/6**, `npx vitest run src/lib/memes.test.ts` **2/2** (test du Top1000 désormais exécuté, plus aucun ignoré), `npx vitest run --config vitest.ecrans.config.mts src/ecrans-meme-booster.test.tsx` **8/8**. Tous code 0. `npx tsc --noEmit` final code 0 ; `npx eslint scripts/import-imgflip.mjs scripts/import-imgflip.test.mjs src/lib/memes.ts src/lib/memes.test.ts src/components/meme-deck.tsx` final code 0. L'ancienne erreur TS1128 dans le test Cercle ne subsiste plus après les changements parallèles de Claude ; Codex n'a pas modifié ce fichier. Contrôle Node/Sharp des **983 médias uniques** : dimensions valides, 81 GIF contenant plusieurs images, code 0.
- **Parcours réellement vérifiés :** serveur local `npm run dev -- --port 3000`, variables Supabase vides dans le processus, télémétrie désactivée ; Playwright Chromium au format téléphone 412×915, événements tactiles, tout trafic hors localhost bloqué. Quatre parcours : ancienne carte FR, nouvelle image Imgflip, GIF Imgflip, filtre « Peu commune » ; recherche par numéro, image chargée, ouverture/fermeture de fiche, attribution correcte MyMemeCards/Imgflip, zéro erreur JavaScript. Une première capture montrait un crédit répété et tronqué : corrigé dans le catalogue, puis les quatre parcours retestés avec succès. Captures finales **relues visuellement** : `reports/imgflip-top1000/image-mobile.png`, `gif-mobile.png`, `uncommon-mobile.png` (rapports ignorés par Git). Serveur de vérification arrêté après les essais.
- **Limites et état de livraison :** uniquement local, non commité/non poussé ; aucun déploiement, APK, émulateur ou téléphone physique vérifié. Aucune modification ni validation de la distribution réelle de ces modèles par Supabase : l'import constaté porte sur le catalogue client et ses médias, pas une activation serveur. Pas de suite E2E complète. Suivi `CreatorDeck-Codex-cye` **fermé après réussite des tests** ; le refus isolé reste archivé comme exclusion, pas comme blocage général. Si un futur lot doit publier ou activer côté serveur, reprendre ces contraintes et obtenir les instructions correspondantes plutôt que d'appliquer le SQL préparé par une ancienne version de l'importeur.
- **Coordination :** avances du HEAD par Claude examinées (`1d572035`, puis `491c604d` et `9f455661`), sans modification des fichiers du lot Imgflip dans ces commits. Index vide au contrôle final ; modifications du lot toujours locales. Sauvegarde hors dépôt dans `D:/Coding/CreatorDeck-Importer-main/output/imgflip-top1000/reprise-codex-20261023`, médias régénérables depuis le bundle externe. Ce checkpoint remplace les états bloqués/intermédiaires conservés ci-dessous.

# Bilan intermédiaire remplacé — reprise autorisée après un refus isolé Imgflip (23 octobre 2026)

- Dernière consigne orale explicite de Malik : continuer les modèles suivants, arrêter si les autres reçoivent le même refus. Vérification ponctuelle des rangs **278, 279, 280 : HTTP 200**, types JPEG, sans retenter le modèle 277. Le refus d'une seule ressource ne prouvait donc pas un blocage général ; l'arrêt global précédent était trop conservateur.
- Collecte reprise par `python scripts/collect-imgflip.py --output D:/Coding/CreatorDeck-Importer-main/output/imgflip-top1000 --download --skip-rank 277`. Le rang 277 est inscrit dans `blocked.json`, sans nouvelle requête sur son média. Les rangs de popularité restent inchangés ; ne pas remplacer ou renuméroter silencieusement ce modèle. Au prochain HTTP 403/429 sur un autre média, le processus s'arrête toujours. Pas de contournement du refus initial.
- Le bilan ci-dessous reste l'état avant cette reprise : zéro import réel à ce stade, cache externe et vérifications conservés. Résultat final à ajouter après la collecte ; aucun commit/push ni changement booster/Supabase autorisé par cette reprise.

# Checkpoint antérieur — import Imgflip préparé sur main, médias bloqués HTTP 403 (23 octobre 2026)

- **Dernier périmètre Malik :** boosters entièrement repris par Claude ; Codex garde seulement Imgflip. Importeur et données doivent vivre dans `C:/Users/Administrator/Desktop/CreatorDeck` sur `main`, sans fusionner ni supprimer le worktree Codex. Catalogue limité à **1 000 modèles**, plus d'import exhaustif de millions de modèles. Aucun commit/push effectué par Codex, aucune écriture Supabase, aucun changement de règles de tirage/taux/économie, aucun fichier booster modifié par Codex.
- **Résultat incomplet : 1 000 identifiants découverts, 276 modèles traités, zéro modèle importé dans le jeu.** `src/data/imgflip.json` reste `[]`, aucune approbation réelle publiée et aucun média copié dans `public/`. Le collecteur s'est arrêté sur **HTTP 403** au rang 277 : identifiant `661023643`, URL `https://imgflip.com/i-view/axk13v.jpg`. Aucun essai de contournement, changement d'identité, autre domaine ou remplacement du modèle après ce refus. Ne pas importer les seuls 276 ni attribuer leurs raretés sur un total tronqué.
- **Fichiers du lot Codex :** `scripts/import-imgflip.mjs`, `scripts/import-imgflip.test.mjs` (repris de Codex puis adaptés), `scripts/collect-imgflip.py`, `scripts/collect-imgflip.test.py`, `src/data/imgflip.json`, `src/lib/memes.ts`, `src/lib/memes.test.ts`, cette passation. `memes.ts` prépare la fusion du catalogue et la métadonnée de rareté « Peu commune » ; aucune probabilité modifiée. Le test du catalogue FR continue de vérifier ses 2 150 cartes ; le test de l'import Top 1000 s'active seulement quand des données Imgflip existent et reste ignoré ici.
- **Classement :** API publique `get_memes?type=image` en premier, puis pages publiques `/memetemplates?page=N` Top 30 days en ordre affiché, dédoublonnage par ID, arrêt à 1 000 après 27 pages. **Correction du bilan intermédiaire ci-dessous : ces pages générales incluent aussi des modèles animés**, conservés à leur rang ; le classement final n'exclut donc pas les GIF. Le champ API `captions` est historique, jamais utilisé comme un compteur 30 jours. Sans compteurs 30 jours comparables entre toutes les sources, c'est l'ordre d'import API puis pages validé par Malik, pas un tri numérique global inventé. GET espacés de 2 s, sans retry réseau ; robots.txt site respecté, CDN robots.txt absent (404). Aucune limite numérique de débit officielle établie : 2 s est une cadence locale prudente, pas une limite prétendument publiée.
- **Médias :** les miniatures JPEG peuvent avoir pour original un PNG ou MP4. En cas de 404 seulement, lecture de la vraie page publique du modèle, résolution de `mtm-img` ou `source` ; seule la redirection canonique ID → ID/nom sur le même chemin public est admise. Les GIF déjà disponibles dans le bundle des 200 sont réutilisés après vérification SHA-256 (81 IDs communs au Top1000). Les nouveaux MP4 éventuels se convertissent en GIF avec ffmpeg local, hors dépôt ; aucun appel d'API de création ou authentifié. Le refus 403 final n'est jamais traité comme un simple 404.
- **Volume :** pour 1 000 images seules, estimation initiale ~122 Mo à partir des 100 images locales ; les animations portent la prévision du Top mixte sous environ 1 Go, à vérifier au complet. Cache final partiel : 61 PNG = **20 107 165 octets**, 202 JPEG = **17 162 725**, 11 GIF = **55 401 506**, 11 MP4 = **2 039 103** ; total médias du cache **94 710 499 octets**, sans compter pages, `.source` dupliqués et sauvegarde. Cache/originaux dans `D:/Coding/CreatorDeck-Importer-main/output/imgflip-top1000`, ancien bundle de 200 inchangé à son emplacement initial. Garde avant écriture du dépôt : 25 Mio par média et **2 Gio au total**. Aucun original MP4 dans le dépôt.
- **Règles préparées et testées :** `personalApprovals` exige les 1 000 rangs, appelle `rarityForRank` : 50 légendaires, 120 épiques, 230 rares, 300 peu communes, 300 communes, aucune mythique automatique. Numéros 2304–3303 après le dernier numéro FR 2303, sans collision. Owner exact « Malik (projet personnel) », note exacte « droits non vérifiés, validation explicite de Malik », evidenceUrl = page publique du modèle, `redistribute=false`, `modify=false`, statut `unverified`. La validation personnelle ne devient pas une preuve de droits. Le CLI écrira les approbations dans `src/data/imgflip-approvals.json` seulement lors d'un import complet réussi ; aucune migration ni fichier SQL écrit par le CLI adapté.
- **Vérifications finales exécutées :** `node --test scripts/import-imgflip.test.mjs` **4/4**, code 0 ; `python scripts/collect-imgflip.test.py` **5/5**, code 0 ; `npx vitest run src/lib/memes.test.ts` **1 réussi, 1 ignoré** (import absent), code 0 ; `npx vitest run --config vitest.ecrans.config.mts src/ecrans-meme-booster.test.tsx` **8/8**, code 0. `npx eslint scripts/import-imgflip.mjs scripts/import-imgflip.test.mjs src/lib/memes.ts src/lib/memes.test.ts` final code 0 ; `git diff --check` code 0. `npx tsc --noEmit` final **code 1**, erreurs TS1128 dans `src/ecrans-binder-cercle.test.tsx:140`, fichier hors lot laissé intact ; la vérification intermédiaire antérieure était verte. Aucun essai APK/émulateur ou preuve visuelle de nouveau catalogue : aucun import réel n'a eu lieu.
- **Coordination :** HEAD a avancé pendant le travail de `2f5ca420` à `1d572035` par le commit de traduction des boosters de Claude, périmètre examiné sans y toucher, index vide au relevé. Les huit fichiers du lot ont été sauvegardés hors dépôt dans `D:/Coding/CreatorDeck-Importer-main/output/imgflip-top1000/reprise-codex-20261023`. Aucune bascule/réécriture entreprise par Codex. Les autres modifications locales restent à préserver.
- **Reprise précise, après résolution du refus public seulement :** `python scripts/collect-imgflip.py --output D:/Coding/CreatorDeck-Importer-main/output/imgflip-top1000 --download` réutilise le cache. Après 1 000 médias complets et mesure de taille : `node scripts/import-imgflip.mjs --bundle D:/Coding/CreatorDeck-Importer-main/output/imgflip-top1000/imgflip-cards.json --ranked` (préflight sans écrire), puis même commande avec `--write` ; relancer ensuite les tests catalogue, écrans Mèmes et TypeScript. Ne pas relancer en boucle face au 403. Suivi Beads `CreatorDeck-Codex-cye` laissé **bloqué**, non fermé.

# Bilan intermédiaire remplacé — import Imgflip Top 1000 en cours, boosters confiés à Claude (23 octobre 2026)

- Malik a retiré intégralement la traduction des boosters du lot Codex et l'a confiée à Claude. Aucun SVG, générateur de sachet, composant Drop/ouverture/révélation/carte ou test de booster n'a été modifié par Codex. Dernière consigne : rapatrier l'importeur et les données dans `CreatorDeck` sur `main`, conserver le worktree Codex et ses modifications ; réduire le catalogue à 1 000 modèles populaires. Aucun commit ni push, aucune écriture Supabase ou modification de taux/économie.
- Base locale observée au début : `2f5ca4205d69fe9a78b278c913f79b44aa41988d`. Source importeur/tests en lecture seule : `CreatorDeck-Codex`, HEAD `c60a8ca500ff7ccb4af5d2a80b4e26963f372686`, arbre chargé de changements préexistants. Scripts repris sur main : `scripts/import-imgflip.mjs`, `scripts/import-imgflip.test.mjs` ; collecte : `scripts/collect-imgflip.py`, `scripts/collect-imgflip.test.py`. Intégration catalogue : `src/data/imgflip.json`, `src/lib/memes.ts` (fusion et métadonnée d'affichage « Peu commune », sans probabilités).
- Méthode : GET de `get_memes?type=image`, puis `/memetemplates?page=N` en ordre public Top 30 days, déduplication par identifiant, arrêt à 1 000. Les nombres `captions` de l'API sont des totaux historiques : ils ne sont pas retriés comme s'ils représentaient 30 jours. Il s'agit du **Top images**, pas d'un classement combinant arbitrairement les GIF (liste séparée). 27 pages ont permis de découvrir 1 000 identifiants. Requêtes séquentielles espacées de 2 s, sans retry, redirection/refus/format inconnu arrêtent la collecte. robots.txt du site autorise ces pages ; celui du CDN répond 404 (absent). Aucune limite numérique de débit officielle établie ; cadence 2 s choisie localement. Un GET documentaire `/api` a répondu 403 lors de l'estimation initiale et n'a pas été répété ; après réduction explicite du périmètre par Malik, la pagination publique a répondu 200.
- Volume préalable : l'ancien bundle de 200 reste externe dans `D:/Coding/CreatorDeck-Importer-main/output/imgflip-live/bundle-20261021-090456`. 100 images = 12 181 141 octets, 100 MP4 = 34 739 485 octets, 100 GIF = 541 435 117 octets (assets total 588 135 428). Attention : les `original_asset` des entrées GIF désignent les MP4 ; la première estimation orale « GIF originaux 34,7 Mo » désignait donc en réalité les MP4. Pour 1 000 images : estimation ~122 Mo, avant mesure réelle. Cache, pages, originaux et bundle Top 1000 hors dépôt dans `D:/Coding/CreatorDeck-Importer-main/output/imgflip-top1000`. Aucun GIF/MP4 demandé pour cette collecte Top images. Garde de 2 Gio avant copie de médias dans le dépôt.
- Import `--ranked` : exige 1 000 rangs cohérents ; `rarityForRank(rang, 1000)` donne 50 légendaires, 120 épiques, 230 rares, 300 peu communes, 300 communes, zéro mythique automatique. Départ après le maximum du catalogue Mèmes existant (2303, donc 2304–3303), collisions et empreintes contrôlées. Approbations : owner « Malik (projet personnel) », note « droits non vérifiés, validation explicite de Malik », URL publique du modèle ; `redistribute=false`, `modify=false`, statut non vérifié. L'URL n'est pas une preuve de droits. Aucun SQL exécuté ni migration écrite.
- Vérifications intermédiaires : `node --test scripts/import-imgflip.test.mjs` **4/4**, `python scripts/collect-imgflip.test.py` **3/3**, `npx tsc --noEmit` code 0. Collecte lancée : `python scripts/collect-imgflip.py --output D:/Coding/CreatorDeck-Importer-main/output/imgflip-top1000 --download`. Les deux adaptations de parseur ont été diagnostiquées sur des pages publiques/cachées, sans accès refusé contourné. Téléchargement encore en cours : ne pas annoncer les données importées avant le prochain bilan. Suivi `CreatorDeck-Codex-cye`.

# Checkpoint — tickets vvy et isl vérifiés localement (23 octobre 2026)

- Demande : traiter `CreatorDeck-Codex-vvy` et `CreatorDeck-Codex-isl`, sans commit ni push. Base locale `main`, HEAD `957d22fb02e45afdcec57a0185ad861de22c3a15`. Modifications préexistantes, notamment Tribunal, Android et complément qb0 plus bas dans ce document, préservées.
- `vvy` : timeout explicite de 20 000 ms sur le seul test « envoie les modifications sur une branche essai… » dans `src/lib/push-essai.test.ts`, avec motif court ; corps et assertions inchangés. `npx vitest run src/lib/push-essai.test.ts` : code 0, **11/11 réussis**, 34,50 s ; cas concerné 5,179 s. Première tentative sandbox : 11 échecs de permissions sur les dépôts Git temporaires ; relance hors sandbox réussie. Ticket fermé après réussite.
- `isl` : les quatre références `sealed-sachet` / `torn-sachet` **win32** sont déjà présentes, en plus des quatre Linux. `npx playwright test e2e/pack-tear.spec.ts:460 --workers=1 --reporter=list` sous Windows, variables Supabase vides dans le processus : code 0, **2/2 réussis**, bureau et téléphone simulé, 31,3 s. Première tentative sandbox interrompue pendant l'attente du serveur, aucun scénario exécuté ; relance hors sandbox réussie. Ticket fermé après réussite ; aucune référence régénérée et aucune exception ajoutée.
- Fichiers modifiés par cette reprise : `src/lib/push-essai.test.ts` et cette passation uniquement (plus états locaux Beads). Aucun changement de `src/components/tribunal-view.tsx`, du Sachet Drop ou de ses captures de référence. Aucun commit/push, aucune suite complète, aucune validation Android physique.

# Checkpoint — CI entièrement verte, extinction demandée (22 octobre 2026)

- Dernière demande explicite de Malik : « Éteint mon pc dès que t'as fini tout les test ». Les tests publiés sont terminés ; sauvegarder ce bilan et le pousser normalement avant de lancer l'extinction Windows. Aucun nouveau test local ou outil de surveillance à installer.
- [CI Vérification 39819805982](https://github.com/GoodFight37/CreatorDeck/actions/runs/39819805982) **completed / success**, six jobs réussis, code audité `c8ad0328bae09e5cb116db7b4472aeb63cb1283e`. Compteurs lus dans les journaux GitHub : **1 206/1 206 unitaires** (93 fichiers), **246/246 écrans** (36 fichiers), **205 E2E réussis et 23 ignorés** (shards 64/72/69 réussis, 12/4/7 ignorés), **16/16 cloud simulés**, **1 028 contrôles SQL Postgres jetable**. TypeScript, ESLint, audit de production sans vulnérabilité, jargon, catalogue et build réussis dans le job qualité. Les scénarios ignorés ne sont pas des réussites ; pas de validation physique Android déduite de ces résultats.
- Main distant vérifié avant ce checkpoint : `af9956b25ac854c8ac9296ba7fb9c1a7cddc1252`, documents seuls depuis le SHA testé ; Vercel Production success du même SHA (déploiement GitHub `7258606611`), application publique [creator-deckk.vercel.app](https://creator-deckk.vercel.app/) accessible HTTP 200 au relevé précédent. Le commit de ce bilan est lui aussi documentaire uniquement et se retrouve avec `git log -1 --format=%H -- docs/agent-handoff.md`.
- [Mise à jour Supabase 39821150832](https://github.com/GoodFight37/CreatorDeck/actions/runs/39821150832) **success** sur `af9956b2`. Aucune migration SQL n'a été modifiée par cette reprise. [APK de test 39821150789](https://github.com/GoodFight37/CreatorDeck/actions/runs/39821150789) **in_progress** sur `af9956b2` au dernier relevé ; sa construction distante continue sans dépendre du PC. Aucune nouvelle APK disponible revendiquée à ce stade.
- Extinction autorisée après sauvegarde et vérification du push : commande prévue `shutdown.exe /s /t 60`, délai pour rendre le dernier message après la sauvegarde. Son résultat effectif sera consigné dans le suivi `CreatorDeck-Codex-fyp` et la conversation ; ce checkpoint ne prétend pas que le PC est déjà éteint. Les 74 modifications préexistantes, `.env.local` et les fichiers non suivis restent à préserver ; défaut visuel distinct `CreatorDeck-Codex-zmo` toujours ouvert, non bloquant.

# Checkpoint — main publié, Vercel Production vérifié (22 octobre 2026)

- Publication autorisée et réalisée : [c8ad0328bae09e5cb116db7b4472aeb63cb1283e](https://github.com/GoodFight37/CreatorDeck/commit/c8ad0328bae09e5cb116db7b4472aeb63cb1283e), push normal `main:main` depuis `19cfcf8f`. `git ls-remote --heads origin main` confirme le même SHA. Tous les commits prêts, dont les six du premier lot et `526a0b37`, sont inclus ; aucun fichier préexistant non commité ajouté.
- Vercel **Production success** pour ce SHA exact : déploiement GitHub `7258537879`, créé le 22 octobre à 17:07:15 UTC ; statut « Deployment has completed ». [Application déployée](https://creator-deckk-grkc8h8lb-hafsi37-2386.vercel.app), [console](https://vercel.com/hafsi37-2386/creator-deckk/HJ1QCpN54WEQrFpiEbeuAdDkrtLr). Le connecteur Vercel renvoie 403 sur l'équipe ; preuve obtenue en lecture seule via les statuts/déploiements GitHub, sans toucher à la configuration Vercel.
- [CI Vérification du SHA publié](https://github.com/GoodFight37/CreatorDeck/actions/runs/39819805982) en cours au dernier relevé : Postgres jetable réussi, étapes unitaires et contrats d'orchestration réussies ; qualité/écrans et trois shards E2E ainsi que cloud encore en cours. Aucun statut global vert revendiqué. L'APK de ce SHA n'est pas encore publiée : sa construction attend la CI verte ; dernière APK observée liée à l'ancien main `19cfcf8f`.
- Ce complément de checkpoint est documentaire uniquement ; il ne change pas le code audité/publié ci-dessus. Le workflow ignore déjà les pushes limités aux documents (`paths-ignore`), les suites longues du SHA applicatif continuent sans nouvelle surveillance. Consulter leur lien en cas de retour d'échec ; aucun nouvel outil de surveillance installé.

- Malik confie maintenant à Codex la suite de Claude pour rendre l'application testable : suite E2E complète désormais autorisée, lint et correction des défauts concrets. Après les vérifications et le commit local `526a0b3743937552a06f99366702c54985dfaa3a`, Malik autorise explicitement : « Push tout sur GitHub quand t'as fini ». L'interdiction antérieure de publication est levée pour le main local prêt ; les protections des fichiers préexistants restent applicables.
- Code repris : `main`, `8745481599bf1a0f3aeae17a0f6c8429269701a1`. Distant relu/fetché : `19cfcf8ff8072306ce3a35554fce9df0b6cac2e1`, ancêtre local. Index vide et 74 fichiers suivis préexistants à préserver. Aucun changement du jeu à ce relevé.
- Run Claude retrouvé : `npm run e2e`, lancé à 18 h 40, 228 scénarios. Il utilisait la configuration Supabase de `.env.local` pour toute la suite, alors que le workflow `verification.yml` sépare le job général sans cloud du job cloud avec RPC simulés. Causes vérifiées dans les preuves : bouton « Essayer » au lieu d'« Ouvrir le booster », points correctement refusés sans connexion ; pas une simple hypothèse de charge machine.
- Ce run mal configuré a été arrêté de façon ciblée après 48 réussites, 9 échecs et 7 ignorés (164 non exécutés). Journaux et résultats partiels conservés dans `reports/reprise-claude-2026-10-22/claude-cloud-mixte-*`, ignorés par Git. Aucun `.env.local` modifié, aucune donnée du joueur utilisée.
- Lint global exécuté : `node node_modules/eslint/bin/eslint.js . --ignore-pattern "android/**/build/**"`, code 0. Exclusion limitée aux fichiers Android générés. Le journal lint de Claude n'établissait pas seul un code de sortie, d'où cette exécution vérifiable.
- Suite générale exécutée sur ce SHA : `node node_modules/@playwright/test/cli.js test --workers=1 --reporter=list,html,json`, **code 1 : 203 réussis, 23 ignorés, 2 échoués**, 228 scénarios, 597,4 s. Les deux variables Supabase étaient vides dans le processus uniquement. Les deux échecs, bureau et téléphone, concernaient seulement `tribunal-focus.spec.ts` avant l'ouverture du Tribunal : `gotoDeck(page, false)` laissait l'onboarding sans cloud ouvert. Aucun autre échec. Rapports `reports/reprise-claude-2026-10-22/e2e-sans-cloud.json`, `html-sans-cloud/` et preuves copiées dans `sans-cloud-test-results/`.
- Correctif minimal : une seule ligne dans `e2e/tribunal-focus.spec.ts`, `gotoDeck(page)` utilise le helper réparé et traite réellement l'accueil. Aucune assertion de focus affaiblie, aucun code du jeu modifié. Pas de note joueur pour cette correction de test.
- Relance ciblée sur `87454815` + cette ligne : `node node_modules/@playwright/test/cli.js test e2e/tribunal-focus.spec.ts --workers=1 --reporter=list,json`, sans cloud : **code 0, 2/2**, zéro ignoré, 14,7 s. Quatre captures Tribunal/bilan examinées puis archivées dans `tribunal-sans-cloud-test-results/` ; rapport `tribunal-sans-cloud.json` au même emplacement de rapports.
- Cloud séparé sur la même base + correctif : `node node_modules/@playwright/test/cli.js test --grep="avec le serveur|le Tribunal confine" --workers=1 --reporter=list,html,json` : **code 0, 18/18**, zéro ignoré, 117,0 s. Deux variables factices du workflow CI dans le processus (`https://verification-test.supabase.co` et sa clé placeholder) ; tous les RPC des scénarios connectés sont interceptés, aucune vraie base testée. Rapports `e2e-cloud.json` et `html-cloud/`. Les anciens échecs de réserve/sablier de `CreatorDeck-Codex-xxo` passent dans ce run. Aucun run intégral vert unique après correction revendiqué : 203 cas verts dans le run général, les deux cas isolés retestés avec et sans cloud, puis les 16 cas cloud de CI verts. Aucun travail CPU concurrent pendant les suites.
- Contrôle final du fichier modifié : `node node_modules/eslint/bin/eslint.js e2e/tribunal-focus.spec.ts`, code 0. `npm run build`, code 0 : compilation Turbopack et TypeScript réussis, 6/6 pages statiques générées, prototypes/454 portraits masqués retirés seulement de `out/`. Le garde initial affiche « Cloud absent » car les variables ne sont pas exportées dans le shell ; vérification des fichiers JS de `out/_next` après chargement de `.env.local` : URL et clé publique réellement incluses. Aucune valeur de configuration publiée dans les rapports ou ce checkpoint. Tests antérieurs unitaires/SQL non relancés sans changement du jeu.
- Constat visuel distinct, non bloquant : le gain apparaît deux fois dans le bilan Tribunal local (`paiement.message` puis `delta`). Suivi P3 `CreatorDeck-Codex-zmo`, preuve dans la capture de bilan téléphone simulé ; aucune preuve de double versement, aucun changement économique entrepris.
- Suivi principal `CreatorDeck-Codex-1ny`. Périmètre du commit de correction : `e2e/tribunal-focus.spec.ts`, `docs/known-issues.md` et cette passation. SHA du dernier commit documentaire : `git log -1 --format=%H -- docs/agent-handoff.md`. Publication du main réalisée ci-dessus ; aucune migration SQL, suppression de portrait, modification Imgflip/éditeur ou configuration Vercel. Android/APK et téléphone physique non testés par cette reprise.
- Contrôle final : SHA-256 des 74 fichiers suivis préexistants et de `.env.local` inchangés ; seuls les trois fichiers du lot diffèrent. `git diff --check` code 0, index vide avant ajout ciblé. Distant relu/fetché juste avant commit : `19cfcf8ff8072306ce3a35554fce9df0b6cac2e1`, toujours ancêtre du HEAD local.
- Publication réalisée après lecture/fetch de `19cfcf8ff8072306ce3a35554fce9df0b6cac2e1`, ancêtre local. Vercel est confirmé pour `c8ad0328` ; la CI et l'APK restent à leur état réel indiqué en tête. Les contrôles locaux ci-dessus ne constituent ni une validation physique Android ni une preuve du résultat futur de la CI.

# Checkpoint — helper E2E des chaînes corrigé, local uniquement (22 octobre 2026)

- Demande de Malik : reprendre `CreatorDeck-Codex-04e`, corriger minimalement le helper et préserver l'onboarding ; commit local en français. Aucun push/déploiement, suppression, migration SQL, travail Imgflip/éditeur ou suite E2E complète autorisé.
- Base auditée : `main`, `8e42a39706867b115ef23653d2e8e616c3e6aee8` + diff des fichiers ci-dessous. Les cinq commits précédents sont présents. `git ls-remote --heads origin main` puis fetch explicite : `19cfcf8ff8072306ce3a35554fce9df0b6cac2e1`, ancêtre du HEAD (code 0). Aucun changement de branche ni intégration. Les modifications préexistantes, notamment les fins de ligne de scripts et migrations, sont exclues du lot.
- Permissions reçues : workspace-write, `.git` en lecture seule, réseau restreint malgré le choix « Accès complet ». Première lecture distante refusée (`Could not resolve host: github.com`), lecture/fetch ensuite réussis avec autorisation technique hors sandbox. Connecteur GitHub : aucune PR ouverte retournée ; aucun run lié à une PR pour le SHA distant, ce qui ne prouve pas l'état de la CI main. Aucune publication.
- Diagnostic : appelants de `gotoDeck` et `answerCircle` examinés (préparation normale, `withoutCircle`, `tutorial=false`, onboarding connecté). En édition, le bouton est « Enregistrer » ; en premier accueil, « Voir mon premier booster ». Un seul sélecteur partagé reconnaît désormais ces deux libellés exacts. API du helper et code du jeu inchangés ; pas de note joueur pour cette correction de tests.
- Fichiers du lot : `e2e/fixtures.ts`, nouveau `e2e/fixtures.spec.ts`, `docs/known-issues.md` et cette passation. Deux tests de régression vérifient les chaînes réellement enregistrées et conservées au rechargement avec `tutorial=false`, puis le retour à l'accueil complet avec `withoutCircle`.
- Reproduction avant correction : `node node_modules/@playwright/test/cli.js test e2e/fixtures.spec.ts --project=bureau --grep="enregistre les chaînes" --workers=1 --timeout=15000` : code 1, 1/1 échoué (15,6 s), attente du mauvais bouton dans `answerCircle`, capture examinée. Première tentative PowerShell refusée avant exécution des tests ; lancement sandbox suivant interrompu sans scénario démarré car Next ne devenait pas disponible. Reproduction puis validation réalisées hors sandbox.
- Validation finale sur la base auditée + correctif : `npm run typecheck` code 0 ; `node node_modules/eslint/bin/eslint.js e2e/fixtures.ts e2e/fixtures.spec.ts` code 0, aucune erreur (lancement `npx.cmd eslint` sans résultat interrompu, puis binaire local utilisé). Aucun test unitaire/SQL antérieur relancé.
- Navigateur : `node node_modules/@playwright/test/cli.js test e2e/fixtures.spec.ts e2e/onboarding-gift.spec.ts --workers=1` : code 0, **6/6 réussis, zéro ignoré**, 35,1 s. Commandes exécutées via RTK ; Playwright lancé depuis Node avec `NEXT_PUBLIC_SUPABASE_URL=https://verification-test.supabase.co` et la clé factice du workflow `verification.yml` dans l'environnement du processus seulement, sans modifier `.env.local`. RPC du scénario connecté interceptés : tutoriel confirmé avant cadeau, un seul claim, cinq boosters cadeau et aucune dépense de la réserve standard. Aucune base réelle testée.
- Preuves visuelles : quatre captures finales dans `test-results/fixtures-*/{avec-chaines,sans-chaines}.png` examinées, bureau et téléphone simulé ; fichiers locaux non commités. Ni Android/APK ni téléphone physique ; aucune affirmation sur le comportement natif.
- Contrôle avant commit : les 74 fichiers suivis déjà signalés modifiés au démarrage conservent exactement leurs SHA-256 ; aucun contenu préexistant écrasé. `git diff --check` code 0, index initial vide. Dernière lecture/fetch distante : `19cfcf8ff8072306ce3a35554fce9df0b6cac2e1`, toujours ancêtre du HEAD local ; aucune avance distante.
- Checkpoint local : le SHA du commit contenant le correctif et cette passation se lit avec `git log -1 --format=%H -- e2e/fixtures.ts docs/agent-handoff.md`. Les checkpoints ci-dessous restent historiques. Prochaine action pour Malik : lancer la suite E2E complète quand souhaité ; cette livraison n'en revendique pas la réussite. Aucun push ni déploiement à effectuer dans cette session.

# Checkpoint — reprise des restes, commits locaux uniquement (22 octobre 2026)

- Demande active de Malik : cinq points dans l'ordre, un commit local par point ; aucun push, suppression, changement de migration SQL ou travail Imgflip/éditeur. Ne pas lancer la suite E2E complète.
- Base locale vérifiée : `main`, `d6ecc0d68cbd99f15df26e6ed4fe06feb51b7470`. `origin/main` récupéré et vérifié à `19cfcf8ff8072306ce3a35554fce9df0b6cac2e1`, ancêtre du HEAD local ; pas de fusion ni de publication nécessaire pour ce lot. CLI GitHub : listes PR ouvertes et trois derniers runs main vides, aucun état CI déduit.
- Point 1 prêt : le vérificateur ne lit plus les JSON client retirés ; contrôles des taux, fonctions et droits SQL conservés. Un appel résiduel à `reglagesPart` dans le brouillon repris a été corrigé après reproduction réelle.
- Validation point 1, base ci-dessus + diff du script : `npm run typecheck` code 0 ; `npx eslint scripts/verify-supabase-migrations.mjs` code 0 ; `npx vitest run src/lib/supabase` code 0, 224/224 tests dans 23 fichiers ; `npm run supabase:verify` code 0, 1 028 contrôles réussis, aucun échec, Postgres jetable local. Première tentative bloquée par permission Windows, première relance interrompue sur `reglagesPart`, dernière exécution complète verte hors bac à sable. Aucune base distante testée.
- Point 1 commité localement : `66f0794`. Aucun push.
- Point 2 prêt : `roadmap.md`, `ta-chaine.md` et `decisions.md` distinguent l'historique, le retrait client (`83533e65`) et les tables/fonctions SQL conservées. Validation sur `66f0794` + diff documentaire : `npm run typecheck` code 0 ; `npx eslint docs/roadmap.md docs/ta-chaine.md docs/decisions.md` code 0, mais trois avertissements car Markdown sans configuration ESLint (aucune validation Markdown revendiquée) ; `npx vitest run src/lib/save-store.test.ts` code 0, 18/18, dont conservation des sauvegardes historiques sans réexposer le moteur client. Liens Markdown locaux et diff vérifiés.
- Point 2 commité localement : `b29f3bf`. Aucun push.
- Point 3 prêt sur `b29f3bf` + diff : composant `TribunalDialog` minimal, hook armé sur le choix/séance monté, bilan autonome ; quatre tests de focus ajoutés, note joueur stable `2026-10-22-tribunal-clavier`, décision/problèmes connus mis à jour.
- Validation point 3 : `npm run typecheck` code 0 ; `npx eslint src/components/tribunal-view.tsx src/ecrans-tribunal.test.tsx src/lib/release-notes.ts e2e/tribunal-focus.spec.ts` code 0 ; `npx vitest run --config vitest.ecrans.config.mts src/ecrans-tribunal.test.tsx` 15/15 code 0 ; `npx vitest run src/lib/tribunal.test.ts src/lib/release-notes.test.ts` 26/26 code 0 ; `npx playwright test e2e/tribunal-focus.spec.ts --workers=1` 2/2 code 0 (bureau + téléphone simulé, 9,145 s). Quatre captures examinées dans `test-results/tribunal-focus-*/{tribunal,bilan}.png`, non commitées. Boucle Tab/Maj+Tab, Échap, cinq verdicts, focus bilan et restauration à l'entrée vérifiés. Ni Android ni téléphone réel.
- Essais navigateur précédents : lancement sandbox interrompu sans test ; hors sandbox, deux délais avant Tribunal dus au helper `gotoDeck(true)` périmé, puis deux assertions du nouveau test alignées sur le dernier bouton réel du bilan. Relance finale verte. Helper général inchangé, suivi `CreatorDeck-Codex-04e` ouvert pour la future suite complète de Malik.
- Point 3 commité localement : `ef5ac0d`. Aucun push.
- Point 4, signalement seulement : `e2e/pack-tear.spec.ts-snapshots` contient déjà huit références suivies dans `d6ecc0d6` (quatre `linux`, quatre `win32`), contrairement au contexte « Linux seulement ». Diff de ce dossier depuis la base : zéro octet. Aucune référence ajoutée, régénérée ou commitée par ce travail ; leur justesse visuelle n'a pas été rejugée.
- Validation point 4, SHA `ef5ac0d` : `npm run typecheck` code 0 ; `npx eslint docs/agent-handoff.md` code 0 avec un avertissement Markdown ignoré ; `npx vitest run --config vitest.ecrans.config.mts src/ecrans-tactile.test.tsx` code 0, 7/7. Ce banc DOM des gestes n'est pas une comparaison des snapshots ni une validation Android. La suite E2E complète reste à Malik.
- Point 4 commité localement : `474fda7`. Aucun push.
- Point 5 prêt sur `474fda7` + diff : rapport §2.1 de `docs/contre-expertise-gemini-2026-10-22.md`, liste exhaustive des 454 slugs ayant un override manuel non vide et un fichier racine présent, dont l'URL n'est pas référencée par les portraits résolus des 1 000 créateurs actifs. Comparaison de la liste : zéro manquant/surplus, 7 539 940 octets bruts. Aucun asset supprimé/déplacé ; usages hors résolveur (archives/scripts) non déclarés absents.
- Validation point 5 : `npm run typecheck` code 0 ; `npx eslint docs/contre-expertise-gemini-2026-10-22.md docs/agent-handoff.md` code 0, deux avertissements Markdown ignoré ; `npx vitest run src/lib/creator-portraits.test.ts src/lib/portraits.test.ts` code 0, 41/41 dans deux fichiers (dont décodage des 454 manuels et 699 archives Upscayl). `git diff d6ecc0d6 -- public/creators supabase/migrations e2e/pack-tear.spec.ts-snapshots` vide : aucun changement de contenu dans ces périmètres.
- Les cinq points sont traités localement ; le cinquième commit contient ce relevé (SHA par `git log -1 --format=%H -- docs/agent-handoff.md`). Suivi global `CreatorDeck-Codex-dn6`. Reste : helper E2E `CreatorDeck-Codex-04e`, suite complète à Malik, éventuel examen des autres usages de portraits avant tout accord de suppression. Aucun push/déploiement ; pas de build APK, test Android ou comparaison visuelle des références PackTear. Travail préexistant conservé et exclu des commits.
- Contrôle documentaire : 122 liens Markdown locaux examinés, deux liens préexistants vers `imgflip-editor.md` absent dans cette copie (roadmap/décisions) ; laissés tels quels car la pile Imgflip est hors périmètre. Aucun nouveau lien manquant introduit.
- Snapshots constatés : quatre Linux et quatre `win32` déjà suivis à la base locale ; aucun ajout/modification de capture prévu.
- Checkpoint local ; le commit contenant ce document se retrouve avec `git log -1 --format=%H -- docs/agent-handoff.md`. Le checkpoint précédent ci-dessous décrit la tentative antérieure et ses blocages désormais dépassés.

# Checkpoint Codex — retrait client streamer, docs, focus Tribunal (22 octobre 2026, local)

- Demande : corriger `supabase:verify` après suppression des JSON streamer client, aligner roadmap/guide/décisions, poser le focus sur les dialogues visibles du Tribunal, signaler les snapshots Windows sans les modifier, et lister les candidats portraits sans supprimer d'asset.
- Modifié localement : `scripts/verify-supabase-migrations.mjs` ne lit plus `streamer.json` ni `live-game.json`; les assertions SQL gardent les taux attendus. Docs alignés sur retrait client du 22/10 et maintien des migrations/fonctions serveur. Focus clavier du Tribunal lié au dialogue principal; le bilan garde son piège distinct. Note joueur mise à jour. Rapport §2.1 liste les 454 slugs avec override manuel et fichier racine correspondant. Aucun fichier `public/creators` supprimé.
- E2E : aucune suite lancée. Le dossier contient actuellement 8 snapshots suivis, dont les versions `win32`; aucune capture modifiée.
- Validation : `npm run typecheck` code 0 ; `npx eslint scripts/verify-supabase-migrations.mjs src/components/tribunal-view.tsx src/lib/release-notes.ts` code 0 ; `node --check scripts/verify-supabase-migrations.mjs` code 0 ; `git diff --check` code 0. `npm run supabase:verify` et `npx vitest run src/ecrans-tribunal.test.tsx src/lib/release-notes.test.ts` échouent avant exécution sur `spawn EPERM` (embedded-postgres / esbuild).
- Commits demandés non créés : création de `.git/index.lock` refusée (`Permission denied`); `.git` est en lecture seule dans le bac à sable. `git ls-remote --heads origin main` inaccessible (proxy GitHub refusé). Pas de push, pas de modification de migration SQL. Le commit initial reste `d6ecc0d68cbd99f15df26e6ed4fe06feb51b7470` sur `main`; arbre sale préexistant préservé.
- Reprise : dans un environnement où `.git` est inscriptible, vérifier à nouveau `HEAD`, la branche et la distance distante, puis faire des commits séparés à partir des seuls fichiers de chaque point; rejouer `npm run supabase:verify` et Vitest ciblé. Les changements et ce checkpoint sont locaux, non commités et non publiés.

# Checkpoint Claude — chantiers du rapport Antigravity (22 octobre 2026)

- Base `origin/main` 19cfcf8f. Branche `claude/chantiers-audit-2026-10-22` poussée (commit `33f98223`), **non fusionnée sur main**. Worktree dédié `CreatorDeck-Chantiers` ; la copie principale et le worktree Codex n'ont pas été touchés.
- Rapport vérifié point par point contre le code. Déjà traités avant ce lot (le rapport est périmé) : 1.1 déduplication du refresh (`refreshes` Map), 1.2 clé de service/anon vérifiée dans `refresh-live`, 1.3 `MemeExportPlugin.java` absent, 2.3 `googleapis`/`three`/`pack-foil-renderer` absents.
- Fait dans ce lot : 2.5 (`PackTear`, un rendu par image au lieu de trois setState par mouvement) et 5.1 partiel (`.sort-field select` à 16 px sur tactile). Vérifié : typecheck, 1 340/1 340 unitaires, `pack-tear.spec.ts` 59 réussis et 1 échec de snapshot qui passe ensuite 2/2 en isolé (instable, pas causé par le changement).
- **Non faits, décision à prendre par Malik :** 2.2 retrait du moteur streamer (touche le format de sauvegarde `PlayerState`, donc les données joueur) ; 2.4 debounce de `localStorage` (risque de perte de données à la fermeture si mal flushé) ; 2.1 suppression des 454 portraits masqués de `public/creators/` (actifs du workflow portraits) ; `upscaled-portrait-overrides.json` est utilisé par les crédits et par les tests, donc conservé.
- Non vérifiés : 5.2 (`optimizePackageImports lucide-react`, non confirmé par défaut dans Next 16) ; 5.3 imports dynamiques ; 5.4 focus des modales restantes.

# Checkpoint Codex — publication Gemini autorisée, copie propre validée (22 octobre 2026)

- Malik autorise explicitement le push et le déploiement Auth/Edge. Lot préparé sur main 3647867bee92a80e97ff80f2316ab5a38de049e9 dans une copie distincte et un index temporaire : aucun remplacement du checkout ni de son index partagé. Claude a confirmé par CreatorDeck-Retour-Claude.md qu'il réserve ces fichiers et prévient avant tout nouveau push. L'éditeur Imgflip et le plugin Android corrigé restent locaux, hors publication.
- Copie exacte : tsc/lint/build verts, 1 340/1 340 unitaires (97 fichiers), 242/242 écrans (36 fichiers). Suite navigateur intégrale sur le port 3100 : 199 réussis, 23 ignorés cloud/conditionnels, aucun échec, code 0 (222 scénarios, 17,2 min). Les quatre références Windows locales servent seulement à ce run et ne sont pas commitées. Gain export : 454 portraits masqués exclus, 7 539 940 octets, sources conservées.
- Nouvelle avance distante intégrée sans conflit : 0b9a7d05de4ef3a87642c8f706fe9710d3ffd1c9, trois fichiers de vérification des pseudos hors lot ; leurs deux tests Node passent. Ce commit sera le parent de la publication, afin de conserver intégralement le travail publié pendant la suite UI.
- Supabase déjà déployé après cet accord : uniquement refresh-live, projet CreatorDeck yzxchpybqrfegvecihxf confirmé contre l'URL publique ; version 10 ACTIVE, verify_jwt=false, notify-live inchangée en version 5. Contrôles réels : bearer invalide 401, clé publique sur diagnostic 403, rafraîchissement public 200/ok=true. Pas de migration ni donnée de joueur modifiée. SHA-256 du source Edge déployé : 14da07fefe57f8673c475c7eaa6127c5e29a2434091c5731d9e0bead73d9f168.
- Publication main encore en préparation au présent relevé : ne pas annoncer un nouveau SHA distant avant git ls-remote. Rapport détaillé : corrections-gemini-2026-10-22.md. L'ancien checkpoint ci-dessous décrit les essais sur l'arbre incluant l'éditeur ; les compteurs de copie propre ci-dessus font autorité pour ce lot.
# Checkpoint Claude — fin de session, reprise depuis l'application (22 octobre 2026)

- **Demande :** finir les chantiers permis, pousser sur `main`, éteindre le PC. Malik reprend depuis l'application Claude Code. Autorisations levées ce jour : migrations Supabase et règles/économie/taux ne sont plus des arrêts (`CLAUDE.md` projet et `~/.claude/CLAUDE.md`). Restent : notification push et suppression de données.
- **Publié par Claude sur `main` :**
  - `3647867b` : archives Upscayl sorties de `public/` vers `archive/upscaled/`, prototype `/catalogue-demo` retiré de `out/` par `scripts/prune-prototypes.mjs` (D-158). Build réel vérifié.
  - `0b9a7d05` : garde partagée des pseudos de fixture (`scripts/lib/fixture-pseudo.mjs`), utilisée par le vérifieur 0060. `node --test` 2/2, ESLint propre.
- **Préparé, non poussé :** `a9d29ba5d3f13c859b3018b26706b2257f12358f` (B2, issue `CreatorDeck-Codex-82z`). Pseudo-élément 44 px sur `.ghost-button`, hauteur visible inchangée, construit sur `19cfcf8f`. Vérifier au navigateur à 320 et 390 px avant push : la zone peut capter des clics des voisins.
- **État de l'arbre local (à ne pas perdre) :**
  - Branche `codex/phase2-completion`, plus en retard sur `origin/main` ; ne pas la pousser telle quelle.
  - 699 renommages Upscayl sont stagés dans l'index (`git diff --cached`). Ils sont déjà sur `origin/main`. Pour les désindexer : `git reset -q -- archive public/creators/upscaled`.
  - Modifications d'autres agents non commitées : `package.json` (gifenc, googleapis), `docs/`, `globals.css`, éditeur Imgflip, `scripts/prune-prototypes.mjs` (portraits masqués). Ne pas les embarquer dans un lot Claude.
  - Dossier scratchpad : `commit-*.txt` (SHA préparés), `verify-a6` (jonction vers `node_modules`, à ne pas supprimer récursivement).
- **Pour reprendre :** `git fetch origin`, puis `bd ready` et `bd list --status=open` (23 issues ouvertes : 16 nouvelles, une par chantier restant de l'audit, et 7 anciennes). Construire chaque commit à partir de `origin/main` avec un index temporaire (`GIT_INDEX_FILE`), pour ne pas embarquer le travail non publié.
- **Chantiers bloqués côté Codex :** `CreatorDeck-Codex-5cn` (corrections Gemini) et `CreatorDeck-Codex-lzp` (retrait du reset), déjà en cours. Codex a publié `40c918e8` et `19cfcf8f` (A4 partiel).
- **Écrans et PC :** la commande d'extinction des écrans a été interrompue à la reprise de session, non confirmée. Le PC est resté allumé, à la demande de Malik.
- **Outils utilisés :** Bash/git, beads (`bd`), `node --test`, ESLint, `vitest` (suite complète 1 317/1 317 avant les derniers commits), build Next.js pour `3647867b`, `postcss` (parse CSS de B2). Non utilisés : Playwright (B2 non vérifié au navigateur), skills de design (aucun changement visuel publié), `codex:codex-rescue` (aucun lot mécanique confié).

# Checkpoint Codex — Gemini publié et vérifié sur GitHub (22 octobre 2026)

- Accord explicite de Malik pour main/Auth/Edge appliqué. Commit publié et SHA distant confirmé : [40c918e8787971d5c2d5c019fca4efdceaf62805](https://github.com/GoodFight37/CreatorDeck/commit/40c918e8787971d5c2d5c019fca4efdceaf62805), parent 0b9a7d05 conservé, push normal. 24 fichiers du lot, aucun éditeur/Imgflip/plugin Android/MainActivity/gifenc publié.
- Vercel Production du même SHA : déploiement GitHub 7244014906 success, « Deployment has completed » ; [URL déployée](https://creator-deckk-ey2ye63ir-hafsi37-2386.vercel.app), [console](https://vercel.com/hafsi37-2386/creator-deckk/46sqY1kjkU1L3FVnN4UEtFc5sJ2E). Connecteur Vercel 403 de périmètre et CLI EXDEV sur config : preuves obtenues par les statuts Vercel et Production GitHub, pas par une réponse API Vercel READY.
- Supabase : uniquement refresh-live déployée sur CreatorDeck yzxchpybqrfegvecihxf, v10 ACTIVE, verify_jwt=false ; notify-live inchangée v5. Contrôles réels : 401 bearer invalide, 403 diagnostic clé publique, 200/ok=true rafraîchissement légitime. Aucun reset/migration/donnée joueur modifié.
- Validation de la copie publiée : tsc/lint/build verts ; 1 340/1 340 unitaires (97 fichiers), 242/242 écrans (36 fichiers), E2E intégral 199 réussis/23 ignorés/0 échec (222 scénarios, 17,2 min), deux tests Node du nouveau parent verts. Quatre références de captures Windows locales utilisées uniquement pour ce run, non publiées. Les 23 scénarios ignorés ne sont pas revendiqués validés.
- [CI Vérification](https://github.com/GoodFight37/CreatorDeck/actions/runs/39724375124) encore en cours au relevé ; nouvelle APK attend cette CI. Les correctifs Java de l'éditeur restent locaux, avec essai natif 21 Mo + annulation/format/cache vérifié. [Rapport](corrections-gemini-2026-10-22.md). Le checkpoint avant push est dans le commit ; ce relevé post-publication est local et référence des preuves GitHub réelles.
- Claude a répondu et confirmé la répartition dans CreatorDeck-Retour-Claude.md ; accusé de publication et réservation levée dans CreatorDeck-Codex-vers-Claude.md. Checkout/index préservés : HEAD local c60a8ca5, branche publiée aussi conservée sous codex/gemini-corrections-20261022, index partagé SHA256 25861ed546c467f69519fba3d2764f7e025b340ad58b82b83f8dd60ef684bc14 intact. Ne pas synchroniser cet arbre sale par reset global. Outils : Git/RTK/Beads, Vitest, Playwright/Chromium, CLI Supabase, GitHub CLI ; pas d'appel modèle tiers. Publication terminée, suivis CI/APK encore en cours.

# Checkpoint Codex — corrections après Gemini (22 octobre 2026, local)

- Demande : « tu peux les corriger? ». Sessions concurrentes et refus temporaires, autorisation Edge, focus des trois feuilles, export Android local, dépendances orphelines, horloges, champs tactiles et exclusion des portraits masqués de out/ traités. Aucune réécriture des sauvegardes/gestes/audio sans mesure ni purge serveur streamer. [Rapport autonome](corrections-gemini-2026-10-22.md).
- Preuves : tsc/lint/build verts ; 1 343/1 343 unitaires ; 240/240 écrans puis suite Marché 11/11 avec deux nouveaux cas ; Playwright navigation 16/16, régressions 79 réussis/9 ignorés. Essai natif 21 096 236 octets enregistré et relu à l'identique, annulation/format invalide/cache vérifiés. Crash parcel Capacitor découvert puis corrigé, détails et SHA du fichier dans le rapport. Captures mobiles examinées, champ 16 px sans débordement global. Les assets web de l'APK isolée sont antérieurs aux corrections frontend ; validation native revendiquée seulement pour le plugin Java.
- Publication : aucun commit/push/déploiement de ce lot. HEAD local c60a8ca5 ; origin/main 3647867b récupéré et examiné (archives Upscayl/prototypes), aucune bascule d'index. Préserver les modifications préexistantes Imgflip, package/lockfile, docs et archives. Avant publication sensible : accord explicite Auth/Edge puis intégrer le commit distant sans perte et sélectionner seulement ce lot. Suivi Beads CreatorDeck-Codex-5cn.
- Outils : RTK, Beads, Vitest, Chromium/Playwright, Gradle, émulateur API 36, lecture des docs officielles Supabase/Next et skill mobile-native. Pas de modèle tiers ni de téléphone physique. Checkpoint local.

# Checkpoint Codex — contre-expertise Gemini (22 octobre 2026, local)

- Demande : vérifier indépendamment les 14 constats, sans correction applicative. Rapport intégral lu ; code publié `c60a8ca500ff7ccb4af5d2a80b4e26963f372686` et travaux locaux distingués. Rapport : [contre-expertise](contre-expertise-gemini-2026-10-22.md).
- Fait : 14 verdicts, preuves de code, gravité, corrections minimales, risques et priorités. Reproductions isolées du refresh concurrent et du focus de Mon compte, codes 0 ; mesures des images. Lucide déjà optimisé, mapping Upscayl encore utilisé ; économie de 25–40 Mo non établie. Aucun code applicatif modifié, aucun nouveau commit/push.
- État distant revérifié : main correspond au SHA ; Vérification `39697720071`, APK `39698325364` et Supabase `39698325408` réussis. Limites : ni profilage Android/OOM ni Safari ni tests d'abus production. Outils : lecture/recherches locales, context-mode, Beads `CreatorDeck-Codex-rym`, documentation officielle Supabase/Next, Chromium Playwright. Checkpoint local, travail préexistant préservé.

# Checkpoint Codex — retrait définitif du reset et publication autorisée (22 octobre 2026)

- **Accords de Malik :** retirer complètement le reset, puis pousser sur main dès validation. Le lot comprend les deux corrections d’interface validées dans le checkpoint suivant. Le chantier Imgflip préexistant reste local et exclu du commit.
- **Retrait :** plus d’export `resetProgress` dans l’API ou le store client. Migration `0061_retrait_reinitialisation.sql` automatique : suppression de `public.reset_progress()` uniquement, sans CASCADE ni effacement de données. Migrations historiques conservées. Le déploiement contrôle ensuite l’absence réelle de la fonction, en plus de son historique et de la cible TLS habituelle.
- **Vérifié localement :** TypeScript code 0 ; 283 tests ciblés API/store/reset verts ; 29 tests Node du déploiement verts (le contrôle des bits POSIX ne s’applique pas aux ACL Windows) ; politique des migrations valide ; suite SQL sur Postgres jetable entièrement verte, dont 12 nouveaux contrôles 0061 (fonction absente et non appelable, rejeu et neuf tables intégralement conservées). Aucun reset exécuté sur une base de production. Dépendances de test installées sans variation des empreintes du manifest/lockfile.
- **État de publication vérifié :** commit `c60a8ca500ff7ccb4af5d2a80b4e26963f372686` poussé normalement sur `main`, SHA confirmé par `git ls-remote`. [CI Vérification](https://github.com/GoodFight37/CreatorDeck/actions/runs/39697720071) en cours ; [Vercel](https://vercel.com/hafsi37-2386/creator-deckk/E6dSuVdnyCnmqYAXtYeBs5j3Ekor) en attente au relevé. Le workflow Supabase attend la CI verte avant d’appliquer 0061 : suppression serveur et nouvelle APK encore non confirmées. Ce relevé après push est local. Rapport navigation et tests d’interface : [vérification navigation](verification-navigation-42df5b4.md).

# Checkpoint Codex — reprise de la navigation et validation complémentaire (22 octobre 2026, local)

- **Demande :** reprendre les points restants de Claude. HEAD local et `origin/main` : `42df5b47906a30aa1409e0b9c699001b7506545e`, branche `codex/phase2-completion` ; arbre préexistant conservé. **Aucun commit, push ou changement Supabase.**
- **Fait :** revue du commit ; captures 1024 px ; MEMES 1024/390 px ; APK publique v877048 téléchargée, empreinte vérifiée et installée sans effacement sur l’émulateur API 36. Navigation, Atelier et Retour Android vérifiés. MEMES ouvert par glissement natif : un tirage factice, cinq cartes, récap, retour collection, zéro exception JS ; stockage de test restauré.
- **Accord complémentaire de Malik :** corriger deux défauts applicatifs prouvés, sans publication. Réglages : Tab/Maj+Tab et Échap restent dans la feuille active, retour du focus à l’engrenage. Tribunal : « Fermer le bilan » remplace le faux « Retour au Drop ». Tests de régression et note joueur ajoutés. Suivis : `CreatorDeck-Codex-052`, `CreatorDeck-Codex-0i9` ; validation globale : `CreatorDeck-Codex-e2e`.
- **Vérification finale :** TypeScript code 0 ; unitaires **1 317/1 317** (97 fichiers), écrans **240/240** (36 fichiers, `--maxWorkers=2`), sélection Playwright complète **56 réussis, 4 ignorés cloud, zéro échec** (60 scénarios avec le nouveau test clavier), lint ciblé et build statique verts. Les premiers échecs de dépôts Git temporaires sont levés hors blocage sandbox ; les quatre premiers échecs E2E cloud venaient du rechargement de `.env.local` sous PowerShell tandis que le serveur était sans cloud. Aucun succès des quatre parcours cloud ignorés n’est revendiqué.
- **Android final :** APK officielle v877048 / `42df5b4` : navigation et MEMES complet validés sur émulateur. APK locale de correction construite et signée v2, version `42df5b4-navigation-local`, code 877105, paquet isolé `com.creatordeck.app.memeeditor` ; six vérifications natives réussies (clavier, Échap, focus, Retour Android, bilan et conservation d’Objectifs). Stockage de test restauré. L’APK officielle n’est pas remplacée par cet artefact local sans cloud. Rapport, commandes, empreintes et liens : [vérification navigation](verification-navigation-42df5b4.md). Captures locales : `reports/navigation-42df5b4/`.
- **Statut initial de ce checkpoint :** corrections locales, non commitées/non poussées ; CI distante verte seulement pour `42df5b4`. **Depuis, Malik a autorisé le retrait complet du reset et le push ciblé sur main** : voir le checkpoint suivant de publication. Pas de téléphone physique ; aucun changement des possessions des joueurs.

# Checkpoint Claude — trois objets, engrenage, Atelier dans le Binder, fin de la réinitialisation (22 octobre 2026, nuit)

- **Demande de Malik :** « fais tout comme tu recommandes » après l'audit des boutons (4 rapports d'inventaire) et le choix A3 (en-tête) + C2 (Drop) + N1 (objets dessinés).
- **Fait :** barre du bas à trois objets dessinés (`nav-objects.tsx`) Binder | Drop (au centre, plus gros, pastille + balancement si un booster est prêt) | Objectifs (pastille si une récompense attend) ; en-tête A3 (`app-chrome.tsx`) : badge de niveau → profil, sabliers et points, engrenage → `settings-sheet.tsx` (compte, notifications, code booster, son, musique, reflets, thème, nouveautés, taux, crédits, « Avancé » : diagnostic et version) ; l'Atelier devient un mode du Binder (« Ma collection | Atelier ») ; les activités (Tribunal, Scène, Arène, Hôtel des ventes, Amis, Classement, Last Pack) vivent dans « Autres activités » des Objectifs ; profil allégé (vitrine, parcours, wishlist, fiche publique) ; Drop C2 (sachet plus grand, choix d'univers sous le sachet) ; palette neutre sombre (fond `#08080c`), fin du « relief » sur chaque panneau ; boutons Fermer des feuilles à 44 px.
- **Retiré :** la réinitialisation de la progression et le « rejouer le tutoriel » (temporaires, demande de Malik). La fonction serveur et `cloudStore.resetProgress` restent (code client désormais inutilisé ; retrait à valider, il touche au cloud). Code mort : 8 props de `HomeView`, le calcul `tribunal` de l'accueil, `pack-foil-3d.tsx`, `swipe.ts` (+ test), `.nav-news-dot`. Fermer le Tribunal ne renvoie plus à l'accueil.
- **Corrections d'audit :** « Voir mes doublons » et le bouton bas de la fiche carte sont gardés (l'un guide quand rien n'est abordable, l'autre est sous le pouce). Le bouton sablier de `CircleLiveMoment` reste désactivé : le brancher ou le retirer est un choix produit.
- **Relectures :** `ecc:react-reviewer` (3 défauts corrigés : feuilles ouvertes depuis les réglages cachées derrière eux, tutoriel possible par-dessus les réglages, Échap et focus), `ecc:typescript-reviewer` (code mort retiré). Tests migrés par Codex (`codex:codex-rescue`, 22 fichiers de tests) puis lancés par moi (son bac à sable bloquait les processus).
- **Outils utilisés :** impeccable (critique, captures), animate, emil-design-eng, ecc:click-path-audit, 4 inventaires en lecture seule, codex:codex-rescue (migration des tests), ecc:react-reviewer, ecc:typescript-reviewer, Playwright (captures 320 et 390 px). **Non utilisés, avec raison :** second avis Codex avant push (deux relecteurs déjà passés, contexte de session presque épuisé ; à faire si la CI révèle un écart), review-animations (réservé à l'utilisateur), break-ui et mobile-native (règles appliquées : cibles ≥ 44 px, `touch-action`, zones sûres, mouvement réduit), apple-design et animation-performance (mouvement limité à transform/opacity).
- **Vérifié :** `tsc`, ESLint (hors `android/**/build`), 1317 tests unitaires, 240 tests d'écrans, captures Drop, Binder, Atelier, Objectifs, profil, réglages à 320 et 390 px. `src/lib/circle.test.ts` a échoué une fois puis réussi seul (aléatoire, non lié). **Non vérifié :** **aucun test Android**, 1024 px, sachets MEMES et ouverture complète à l'œil.

# Checkpoint Claude — thème d'application « Pocket », aux couleurs des sachets (21 octobre 2026, nuit)

- **Demande de Malik :** le bordeaux/noir « fait tache » à côté des sachets. Thème par défaut unique (il ne suit pas le sachet choisi) + système de thèmes. Règles de déblocage hors périmètre (noté dans bd : idée de Malik, rien inventé).
- **Fait :** bloc `:root` de `globals.css` réécrit (indigo `#0d0630`, accent rose `#ff4fa3`, action vert acide `--action`, direct rouge `--live`, relief `--outline`/`--lift`) ; trois thèmes `:root[data-theme="live|memes|vault"]` non activés ; `src/lib/app-theme.ts` (attribut + `localStorage`, aucun appelant) et son test (contrastes de chaque thème). Boutons pleins, barre du bas, onglet et filtre actifs, en-tête, puces, panneaux (bloc « relief » en fin de `stage.css`), `themeColor`. Le thème de collection (`cosmetics.ts`) ne réécrit plus que les `--accent*` du classeur (`themeStyle` dans `creator-deck-app.tsx`) : sans cela le thème « Studio » ré-imposait le noir et le rouge sur le Binder.
- **Lot mécanique confié à Codex** (`drop-binder`, `objectives`, `profile-collection`, `release-notes`, `atelier-ritual`, `circle-onboarding`, `meme-reveal` : 139 remplacements) puis relu par moi aux captures. **Second avis Codex** : 4 défauts prouvés, tous corrigés (contraste du bouton de mise à jour, blanc sur rouge < 4,5 → `--live` `#e11d3f`, relief de la vitrine écrasé par la cascade, `.reserve-bonus`). `ecc:typescript-reviewer` : plafond de la vitrine, tests durcis.
- **Bug signalé par Malik, corrigé :** la vitrine du profil proposait 4 emplacements (`MAX_SHOWCASE`) mais n'en montrait que 3 (`slice(0, 3)` et grille à 3 colonnes dans `profile-view.tsx`). Test rouge puis vert ; les cartes épinglées s'affichent jusqu'à 4, 3 emplacements minimum. **Non vu à l'œil :** le rendu à 4 colonnes à 320 px.
- **Pas touché :** `meme-deck.css` et `meme-editor.css` (travail local non publié de Codex) gardent leurs bordeaux ; les scènes d'ouverture, dos de carte et cartes gardent leur palette (par sachet). Aucune migration, aucune économie, aucune règle de jeu.
- **Outils utilisés :** superpowers:brainstorming (sauté pour les questions : brief complet, mode autonome), impeccable (contexte, détecteur : rien de nouveau, avis `design-system-*` déjà présents), superpowers:systematic-debugging (vitrine), `codex:codex-rescue` (lot mécanique + second avis), `ecc:typescript-reviewer`, mobile-native et break-ui (lus, appliqués à ce qui change : aucune règle `:hover` ajoutée, `dvh` et zones sûres déjà en place ; break-ui non rejoué en toggle). **Non utilisés, avec raison :** `review-animations` (invocation réservée à l'utilisateur : prompt donné à Malik), `ecc:react-reviewer` et `ecc:security-reviewer` (un seul changement TSX de quelques lignes relu par le relecteur TypeScript ; aucune entrée, compte ni paiement touchés), `animate`, `apple-design`, `animation-performance` (pas de nouveau mouvement : l'appui passe de `scale` à `translateY(2px)` + ombre).
- **Vérifié :** `tsc`, tests unitaires (1323 + les nouveaux), tests d'écrans de profil, captures 320/390/1024 px de l'onboarding, Drop, Binder, Atelier, Toi, Objectifs, Tribunal. **Non vérifié :** feuilles « Mon compte » et « Code booster » (non ouvertes par mon script), Arène, révélation/ouverture de sachet, MEMES (`meme-deck.css` non migré), **aucun test Android**.
- **Audit de mouvement (`improve-animations`, appliqué sur demande de Malik) :** `:hover` derrière `(hover: hover) and (pointer: fine)` (3 règles) ; `foil-cut-open` en `scaleY` au lieu de `height` ; `view-in` à 120 ms en opacité seule ; flou du halo du Drop 64 → 40 px ; `letter-spacing` animé retiré (`premium-loading`, `pack-tear-legende`) ; anneaux de direct en `transform` + `opacity` (`.circle-live-dot::after`, `.tribunal-live::after`) ; jetons `--ease-out`, `--ease-in-out`, `--ease-drawer` (4 copies exactes remplacées) ; `touch-action: manipulation` sur `button`, `a`, `summary`. `review-animations` : verdict Approve, quatre corrections appliquées (courbe d'appui, mouvement réduit, ombre dans la transition).
- **Attention :** `stage.css` redéfinissait `@keyframes live-pulse` (collision de nom avec `globals.css`) : les points `.live-bar i`, `.card-broadcast i`, `.reveal-live i` animaient un anneau d'ombre au lieu de l'impulsion d'opacité prévue ; ils retrouvent l'opacité (.7 ↔ 1). **Non vu à l'œil :** les anneaux de direct (il faut une chaîne en direct), le flou du halo à 40 px sur Android (rien mesuré), `foil-cut-open` en `scaleY`.
- **E2E :** complet avant les changements de mouvement : 195 réussis, 29 ignorés, 0 échec. Après : sachet, déchirure, navigation, Drop, Mèmes, observation mobile : 90 réussis, 8 ignorés. Tests unitaires 1323 + 243 d'écrans verts.

# Checkpoint Claude — refonte des sachets du Drop, façon TCG de poche (21 octobre 2026)

- **Demande de Malik :** un vrai nouveau design, style Pokémon TCG Pocket, avec une DA Streamer pour Live Drop et une DA mèmes d'internet pour MEMES. Interdits D-132 (tranches) levés par lui.
- **Fait (skills `impeccable`, `emil-design-eng`, `animate`, `animation-performance`) :** les deux SVG sont redessinés par `scripts/build-pack-art.py` (lettres tracées en vecteur depuis Barlow Condensed, aucune police système). Même gabarit 600 × 880 et même soudure à 15,45 % : la déchirure (`pack-tear`) n'a pas bougé et reste continue. Sachet **plat** : tranches 3D supprimées du composant et du CSS (le liseré qb0 disparaît avec elles), `.foil-depth-*` de la scène d'ouverture rendues transparentes, renflement `.pack-bulge` réduit à un reflet doux. Flottement 4,8 s (±5 px, ±1,4° roulis, ±6° lacet) et un reflet de film toutes les 5,6 s (`.pack-glint`, `transform` seulement, masque alpha de l'impression). Mouvement réduit et `data-card-fx="off"` coupent les deux. Pile de réserve aux couleurs de chaque univers. Détails dans DESIGN.md, « Sachets du Drop ».
- **Vérifié :** captures relues à 320, 390 et 1024 px (pixel ×3) pour les deux univers, plus l'ouverture Live (scellé et déchirure en cours). `tsc` 0 erreur, ESLint propre sur les fichiers touchés. E2e ciblés `pack-tear`, `booster-selector`, `memes`, `drop-binder`, `drop-craft-priorites` : verts après avoir aligné deux assertions qui exigeaient les tranches 3D. Le détecteur impeccable ne relève rien de neuf (alertes préexistantes aux lignes non touchées).
- **Non vérifié :** **aucun test Android** ; la déchirure MEMES n'a pas été capturée à l'œil (mon script d'essai a échoué, le test `memes.spec` de déchirure est vert) ; fluidité du masque + reflet sur WebView à valider sur téléphone ; `review-animations` et `break-ui` non passés en revue formelle.
- **CI à surveiller :** les captures de référence `sealed-sachet-*-linux.png` et `torn-sachet-*-linux.png` ne peuvent pas être produites sous Windows. J'y ai copié les rendus win32 : si « Vérification » échoue sur ces deux tests, régénérer les `-linux.png` depuis l'artefact du rapport Playwright.
- **Pas de migration, pas de règle de jeu, pas d'économie touchées.** `next.config.ts` et `scripts/delegate-claude.mjs` non commités.

# Checkpoint Codex — Imgflip et éditeur depuis une carte possédée (21 octobre 2026, local)

Demande : terminer le raccordement de l’importateur Imgflip au jeu et l’éditeur PNG/GIF. Le code est implémenté localement ; **aucune publication et aucune écriture Supabase**.

- Importateur `D:/Coding/CreatorDeck-Importer-main` : 200 modèles réels validés, 100 images + 100 MP4 originaux avec GIF dérivés. Bundle réel : `output/imgflip-live/bundle-20261021-090456/imgflip-cards.json`.
- Jeu : `src/lib/memes.ts` concatène le catalogue FR intact et `src/data/imgflip.json` (vide jusqu’à validation des droits). `scripts/import-imgflip.mjs` vérifie les décisions explicites, identifiants, numéros, chemins, tailles et empreintes des originaux/dérivés ; il produit le catalogue et un SQL additif à relire, sans contacter la base. Audit réel : 0 approuvé, 200 bloqués, rien écrit.
- `MemeDeck` ouvre un éditeur chargé à la demande uniquement pour une carte possédée ; `meme_status` est relu avant export. Plusieurs textes, position au toucher/curseurs, taille/couleur, pause de l’aperçu et mouvement réduit ; PNG et GIF locaux, originaux/exemplaires inchangés. Un petit encodeur `gifenc@1.0.3`, décodage GIF natif `ImageDecoder`, aucune API payante.
- Android : plugin `MemeExport` enregistré dans `MainActivity`, sélecteur `ACTION_CREATE_DOCUMENT`, aucune nouvelle permission générale de stockage. Test sur émulateur API 36 dans le paquet isolé `com.creatordeck.app.memeeditor`, compte et RPC factices : GIF réellement écrit dans Downloads puis récupéré et relu, **2 frames, [80,140] ms, 3 lectures**. Preuves : `reports/meme-editor-android/result.json`, `created.gif`, `editor.png`. Le script réutilise le sélecteur système réel, sans coordonnées fixes.
- Tests : `node --test scripts/import-imgflip.test.mjs` **3 réussis** ; Vitest ciblé éditeur/catalogue/notes **12 réussis** ; Playwright éditeur + Mèmes existants **12 réussis**, bureau et téléphone, dont GIF exporté alors que l’aperçu est en pause ; lint ciblé et typecheck réussis. **Build webpack final réussi**, TypeScript inclus. APK normale construite avec `node scripts/android-gradle.mjs assembleDebug -PcdVersionName=imgflip-local --console=plain` ; signature APK v2 vérifiée par `apksigner verify --verbose`.
- APK locale : `android/app/build/outputs/apk/debug/app-debug.apk`, paquet `com.creatordeck.app`, 110 714 232 octets, SHA-256 `1cc2f942264e4e199093f3a3f6a0e2f4510da1687ebd3f0ad20e1685c906d0c8`. Cette APK normale n’a pas été installée sur le téléphone physique ; l’essai natif a porté sur le paquet isolé pour préserver les données de l’application principale.
- Suite générale : l’ancienne fixture attendait un dialogue de chaînes automatique ; la préparation commune a été adaptée au bouton actuel, et les 2 tests Atelier passent. Relance générale bornée : **34 réussis, 3 échecs, 2 ignorés, 183 non exécutés**. Échecs : réserves des deux scénarios cloud de `booster-selector.spec.ts` et dialogue d’accueil dans `hourglass-online.spec.ts`. Suivi `CreatorDeck-Codex-xxo`. Ne pas annoncer la suite générale verte ni pousser sur main sans résoudre ce contrôle ou obtenir une CI de branche verte.
- Coordination : départ `2124e67b`, HEAD avancé par un autre chantier à `b0272896` (deux commits style/révélation, sans recouvrement avec les fichiers de l’éditeur). Ancestralité vérifiée, aucun reset ni changement de branche. Archive hors dépôt des 26 fichiers touchés, avec lockfile : `D:/Coding/CreatorDeck-Importer-main/output/coordination/imgflip-game-snapshot.json.gz.base64` (JSON compressé gzip puis base64). Les changements préexistants de Gradle/configuration/skills ne sont pas à inclure dans ce lot.
- Statut : checkpoint **local, non commité/non poussé**. Chantier Beads : `CreatorDeck-Codex-zgr`, dépendances de publication `CreatorDeck-Codex-xxo` (contrôle général) et `CreatorDeck-Codex-08l` (droits des modèles). Droits de redistribution/modification des 200 modèles à établir avant tout ajout distribué ; aucune rareté ou autorisation n’a été inventée. Guide : [imgflip-editor.md](imgflip-editor.md).

Reproduction Android isolée : `npm run build -- --webpack`, `npx cap copy android`, `node scripts/android-gradle.mjs assembleDebug -I ../scripts/meme-editor-test.gradle --console=plain`, installer cette APK sur l’émulateur, puis `node scripts/test-meme-editor-android.mjs`. La configuration Firebase du paquet de test est entièrement factice. Les essais ne constituent pas une validation sur téléphone physique ou avec un compte de production.

# Checkpoint Claude — ouverture : plus aucune carte n'avance seule (21 octobre 2026, nuit)

- **Signalement de Malik :** à l'ouverture d'un booster, des cartes « montent et s'ouvrent toutes seules » après l'appui.
- **Cause racine (lue dans le code, pas devinée) :** `reveal-overlay.tsx` planifiait, pour toute carte déjà possédée qui n'était pas la dernière, un `setTimeout(onNext, 420)` (« le doublon rejoint la pile et la suivante arrive toute seule », D-158) et jouait l'animation CSS `reveal-dupe-to-pile` (la carte s'envole vers la pile). Plusieurs doublons de suite s'enchaînaient sans aucun appui.
- **Correction :** minuteur, état `piling`, classe `is-piling` et animation retirés. Un doublon garde ses allégements (pas de flash, pas d'aura, retournement immédiat, compteur « Doublons ×N ») mais attend l'appui comme toute carte. Le libellé lu par les lecteurs d'écran devient « Doublon ».
- **Tests :** le test unitaire qui exigeait l'avancement automatique exige maintenant le contraire (5 s sans appui : `onNext` jamais appelé ; un appui : une seule fois). Commentaires de `onboarding-gift` et `pack-tear` alignés.
- **Vérifié :** typecheck, ESLint, 57 tests d'écrans de révélation verts ; e2e `pack-tear`, `onboarding-gift`, `pack-crash`, `memes` : 66 réussis, 7 ignorés, 1 raté de timing (`Reflets OFF`, repassé au vert seul, bureau et téléphone). **Non prouvé en navigateur** : trois ouvertures d'une partie neuve n'ont produit aucun doublon, donc le cas doublon n'est couvert que par le test unitaire ; pas vérifié sur Android.
- **Ce qui reste automatique, par décision antérieure :** la montée des dos depuis le sachet et le retournement de chaque carte après un court délai (« sans languette ni second geste »). Si Malik veut que le retournement aussi attende un appui, c'est un autre changement (`revealTiming`, `reveal.ts`).

# Checkpoint Claude — fin de cg8.10 : or et rouge ramenés à leur rôle (21 octobre 2026, soir)

- **Fait avec les skills** `impeccable` (contexte, plancher de qualité, détecteur) et `emil-design-eng`, captures regardées à l'œil.
- **Or (`globals.css`, `objectives.css`, `release-notes.css`, `profile-collection.css`, `atelier-ritual.css`) :** l'or ne reste que pour la légendaire (jeton `--gold`, cartes, sachet). Série, récompenses, portefeuille, saisons, Sortants, tableau du jeu : papier translucide (`rgb(243 238 226 / x)`) et `--text`. Le bouton « Réclamer » des saisons passe du dégradé or au bouton papier (`--paper` / `--ink`). Les beiges `#e5cba1` et voisins (barres de progression, anneaux de focus, filtres actifs) passent à `--paper`.
- **Rouge :** 44 règles d'information (pastilles, minuteries, icônes, compteurs, titres, barres, lignes Arène/Wishlist) passent au papier. Le rouge reste sur : booster prêt, badge LIVE, actions (envoyer, confirmer), états choisis (`.on`, `.chosen`, `.equipped`), erreurs, jauge de niveau. Le tri des 77 règles est une décision de ma part ; un état « choisi » reste rouge, sans avoir été revu écran par écran (l'Arène demande un compte).
- **Planche :** `.card-live` compact se réduit à son point (libellé lu par `aria-label`), `drop-binder.css` ; `.card-on-air` l'était déjà. **Tranche droite du sachet** : `top: 14px` pour démarrer sous le biseau (qb0).
- **Vérifié :** captures Toi (320, 390, 1024), Atelier (320, 1024), Objectifs (390) relues : plus d'ambre sur la pastille de série ni sur le badge. Specs objectifs, profil, notes, atelier, scène, Binder, navigation, Drop : 73 réussis, 0 échoué. Lint : 0 erreur. **Non vérifié :** l'Arène, le Tribunal et les échanges en ligne (compte requis), l'Android.
- **Restent hors périmètre :** `#80561e` (texte brun sur le papier de l'accueil), `rgb(255 204 146)` (flash d'effet), les alertes du détecteur sur des règles non touchées (`border-left` des listes à raretés, courbes avec dépassement).

# Checkpoint Claude — balayage de style cg8.10, e2e complet, nettoyage (21 octobre 2026, soir)

- **Fait et vérifié :**
  - Tailles de police : les textes d'interface sous 12 px passent à 12 px (`stage.css` `.binder-circle-goal .drop-section-label`, `atelier-ritual.css` `.atelier-kicker`, `booster-continuity.css` légendes de la grille de révélation, `drop-binder.css` mot du dos de carte, `<small>` sans classe du profil). Mesuré dans Chromium à 320, 390 et 1024 px sur Drop, Binder, Atelier, Toi et Objectifs : plus aucun texte d'interface sous 12 px. **Restent volontairement sous 12 px** : les textes imprimés sur les cartes (`.creator-card`, `.meme-card`, dans `globals.css`, `meme-deck.css`, `booster-continuity.css`), dont la taille suit celle de la carte (`clamp(…cqw…)`) ; une miniature de carte ne peut pas porter du 12 px.
  - Cibles tactiles : `min-height: 44px` pour `.text-link`, `.hourglass-action`, `.live-bar`, `.pity-row` et les `summary` du Drop (`drop-binder.css`, `drop-craft.css`). Mesure à 320, 390 et 1024 px : plus aucun bouton, lien ou résumé sous 44 px, hors cartes (les champs de recherche mesurent 20 px de haut dans une enveloppe de 44 px).
  - `e2e/_diag.spec.ts` supprimé (script jetable, chemin de capture d'une autre session) : `CreatorDeck-Codex-mya`.
  - **e2e complet lancé une fois : 193 réussis, 23 ignorés (« avec le serveur », sans cloud), 0 échoué.** `npm run supabase:verify` : toutes les vérifications passent. `npm run typecheck` : 0 erreur. `npm run lint` : un seul avertissement, dans un bundle Android généré (`src/main/assets/public/_next/static/chunks/…`).
- **Piège de l'environnement :** avec `.env.local` (cloud configuré), la fenêtre « Mes chaînes » ne s'ouvre jamais en local, car `onboardingReady` attend un utilisateur connecté. Cinq tests de `drop-binder.spec.ts` échouent alors, à tort. Lancer l'e2e avec `NEXT_PUBLIC_SUPABASE_URL= NEXT_PUBLIC_SUPABASE_ANON_KEY= npx playwright test`. En dev, le bouton « N » de Next recouvre l'onglet Drop à 320 px : cliquer avec `force: true` dans un script de mesure.
- **Non fait, et pourquoi :**
  - Rouge et or hors de leur rôle, réduction de `.card-live` et `.card-on-air` sur la planche : relus, **non modifiés**. Dans `.creator-card`, les pastilles n'ont déjà plus de fond (`globals.css` ~4637) et `.is-compact .card-live` est à 8–9 px. Pas de nouveau tri fait sur le rouge et l'or des feuilles (arena, tribunal, saisons). `CreatorDeck-Codex-cg8.10` reste donc ouverte pour ce point.
  - `CreatorDeck-Codex-u6b` : la liste de l'audit IA n'est pas dans le dépôt ; **à demander à Malik**, rien touché.
  - `CreatorDeck-Codex-qb0` : liseré non reproduit dans Chromium (capture 390 px relue). Vu seulement sur l'émulateur Android ; le corriger passe par les tranches 3D. L'interdit visuel est levé par Malik : plus aucun interdit visuel n'est à respecter, on améliore le jeu. Vérification sur APK en cours.
  - Captures relues à l'œil : Drop à 390 et 1024 px, Binder et Toi à 320 px. Non relues une par une : Atelier, Objectifs, ni les trois largeurs de chaque écran. Après la dernière correction (hourglass à 44 px, mot de rareté du dos de carte), pas de nouvelle capture : changement de hauteur et de corps de police seulement. **Aucune validation Android** : tout est fait dans un navigateur.
  - Défaut trouvé à la relecture et corrigé : au Binder à 320 px, le mot de rareté des dos de carte (« Légendaire », 83 px) débordait du dos (65 px) et se tronquait. `drop-binder.css` : 10 px, interligne de lettres .01em, **corrigé à l'œil, pas remesuré**.
  - `CreatorDeck-Codex-e5y` mesuré (build de production webpack, copies de `de0d0b33^` et `de0d0b33`, scripts et styles liés par la page `/`, gzip) : **633 Ko avant, 630 Ko après** (JS 573 → 572 Ko, CSS 60 → 58 Ko). Gain réel mais minime : `MemeBoosterOpening` n'était déjà qu'une petite part du premier chargement. Mesure faite en webpack (Turbopack refuse un lien vers `node_modules` dans une copie), pas en Turbopack comme `npm run build`.

# Checkpoint Claude — 0060, Mèmes différés, audit IA (21 octobre 2026) — poussé sur `main`

- **Fait et vérifié :**
  - Vérifieur SQL 0060 réparé : le pseudo de test « Chaîne hors catalogue 0060 » (26 caractères, limite 24 de `0001_comptes_cloud.sql`) devient « Chaîne 0060 », avec une garde qui lève une erreur si un nom dépasse 24 caractères (`scripts/verify-circle-hors-catalogue.mjs`). `npm run supabase:verify` : **toutes les vérifications passent**.
  - Mèmes hors du premier chargement de l'accueil : `MemePackComposition` et `MemeCollectionLink` sortent de `meme-booster-opening.tsx` vers le nouveau `src/components/meme-pack-parts.tsx` ; `MemeBoosterOpening` se charge à la demande dans `drop-view.tsx` (`lazy` + `Suspense`, seulement quand le sachet Mèmes est présenté). `meme-deck.tsx` importe les deux nouveaux emplacements. Le gain de poids n'est pas mesuré (pas de build de comparaison).
  - `tsc` 0 erreur ; ESLint propre sur les fichiers touchés ; 100 tests vitest ciblés (cercle, mèmes) verts ; `e2e/memes.spec.ts` 6/6 verts (bureau et téléphone) dans le navigateur.
  - Chantier « TCG de poche » (cg8) : feuilles CSS commitées telles quelles (`globals.css`, `stage.css`, `drop-binder.css`, etc.). Il reste le balayage de style cg8.2 (tailles de police sous 12 px, cibles tactiles sous 44 px).
- **Audit IA, point par point :** vérifieur SQL 0060 confirmé et corrigé ; chargement paresseux des Mèmes confirmé et traité (`MemeDeck` n'est pas sur l'accueil, il n'était donc pas en cause). Le reste de la liste de l'audit n'a pas été relu.
- **Validation :** tout est vérifié dans un navigateur et par les scripts, **pas sur Android**. Le parcours invité et l'arène existent dans la copie locale ; l'APK construite depuis `main` doit être vérifiée par Malik sur son téléphone.
- **Reste (suivi dans `bd`) :** `CreatorDeck-Codex-cg8.10` (cg8.2, style) ; `CreatorDeck-Codex-u6b` (reste de l'audit IA, la liste complète n'a pas été relue : à redemander à Malik ou à consigner dans `docs/`) ; `CreatorDeck-Codex-e5y` (mesurer le gain des Mèmes) ; trancher `e2e/_diag.spec.ts` (non suivi, à supprimer s'il est jetable) ; `next.config.ts` et `scripts/delegate-claude.mjs` restent non commités (le premier contient l'IP locale, le second est à l'autre agent).
- **Outils à utiliser (consigne de Malik, 21/10) :** pour tout chantier visuel ou d'animation, les skills `impeccable` et ceux d'Emil Kowalski (`animate`, `review-animations`, `improve-animations`, `break-ui`, `mobile-native`, `emil-design-eng`), avec de vraies captures regardées ; pour un bug, `superpowers:systematic-debugging` avant de corriger ; pour un lot mécanique bien délimité, le plugin `codex:codex-rescue` avec une liste stricte de fichiers ; `context7` pour la documentation d'une bibliothèque ; Playwright pour voir l'app. Les skills Emil sont dans `.agents/skills/`, non suivis par git.
- **Sécurité des migrations :** aucune migration dans ce commit. Le push sur `main` n'applique donc rien en production.

# Checkpoint Claude — scène « TCG de poche » (21 octobre 2026) — TERMINÉ sauf le balayage de style cg8.2

- **Mise à jour du 21/10 (fin de session) :** `npm run ecrans` 241/241 ; `tsc` et ESLint propres ; e2e complet lancé une fois : 180 réussis, 13 échoués, tous des specs périmées (`.stock-row strong`, « Mon Binder », `.mini-card-row`, `.drop-cta`, `.binder-collections-picker`, animation `scene-card-turn` de la Commune devenue `card-turn-quick`) réécrites sur l'app réelle, puis `drop-binder`, `drop-craft-priorites`, `scene-profile`, `binder-finitions`, `pack-tear`, `booster-selector` relancés verts (les 5 ignorés sont « avec le serveur », sans cloud en local). Chaînes hors catalogue (0060, `refresh-live`, `circle-onboarding`) relues : complètes. DESIGN.md aligné (filtres, barre du bas, carte, deux écarts). Décision Malik : `variant-gold` gardée comme matière rare, seule exception à la règle de l'or.
- **Reste (cg8.2) :** 112 `font-size` sous 12 px (`rg "font-size"` dans `src/app/*.css` et `src/components/*.css`), cibles tactiles < 44 px, rouge/or hors de leur rôle ; réduire `.card-live` et `.card-on-air` sur la planche. Puis captures 320/390/1024 et build APK (AGENTS.md). `next.config.ts` (allowedDevOrigins avec l'IP locale) ne se commite pas.

- Brief Malik du 21/10 (sachet, carte au visage, direct, album calme ; le reste n'est plus le parcours). Suivi : épopée beads `CreatorDeck-Codex-cg8` (`bd show CreatorDeck-Codex-cg8`). Branche `codex/phase2-completion`, avancée par fast-forward à `origin/fluidite-ouverture` `413eb45f` (D-157 fluidité, appliquée comme demandé). **Rien n'est commité ni poussé.** Modifs locales d'autres outils préservées (AGENTS.md, CLAUDE.md, Gradle, docs/decisions.md « tâche Windows supprimée », docs/qualite-autonome.md, scripts/delegate-claude.mjs, .beads/, fichiers d'échange).
- **Fait (non commité) :**
  - Accueil (`drop-view.tsx`) : le sachet est le seul geste (bouton `.drop-open` retiré) ; une ligne `.stock-row` « N sachets · prochain à 14 h 30 » / « Prochain sachet à 14 h 30 » (`formatClock`) ; plus de trouvailles ni de lien Objectifs ; label sr « Prochain sachet à … » au lieu de « Recharge en cours ».
  - Ouverture (`reveal-overlay.tsx`, `reveal.ts`, nouveau `pack-end-live.tsx`) : doublon de toute rareté → pile en 420 ms puis avance seul ; nouvelle = scène sans pastilles ; fin = visage + « Regarder sur Twitch » si la dernière carte est en direct, sinon ligne prochain sachet ; récapitulatif et affiche supprimés.
  - Album (`binder-view.tsx`, `binder-sort.ts` `albumOrder`) : ses cartes d'abord, une recherche, pager ; filtres, tri, score, compteurs supprimés.
  - Secondaires (Codex) : `profile-view.tsx` tout replié dans « Autres activités » sans badges ; badge Last Pack retiré de l'onglet Toi ; `friends-sheet.tsx` → `CircleShareEmpty`.
  - Style : ~250 lignes de CSS mort supprimées (ancien bouton rouge, drop-cta, trouvailles, filtres Binder) ; barre du haut carton 44 px, libellés ≥ 12 px ; onglet actif et filtres Atelier en papier ; sabliers sans or ; `.eyebrow` en gris.
  - Docs : roadmap (« non publié » corrigés pour D-135/136/146/147/148, finition, 0059) ; DESIGN.md (accueil, ouverture, album, parcours, boutons).
- **Vérifié :** `npm run ecrans` 239/239 ; typecheck 0 erreur ; ESLint propre sur les fichiers touchés ; vitest ciblés des agents verts.
- **En cours au moment du checkpoint :** (1) suite e2e complète lancée (log `%TEMP%\cd-e2e-scene.log`) — specs e2e éditées par les agents, jamais exécutées avant ; (2) agent « chaînes hors catalogue » (option 1 choisie par Malik : chaîne hors des 1000 acceptée dans Mes chaînes, sans carte, pour le direct) : migration `0060_cercle_hors_catalogue.sql` (automatic), `refresh-live` qui sonde aussi ces logins (**à déployer** : fonction Edge), UI initiales « sans carte ».
- **Reste :** `cg8.3` carte (or seulement légendaire dans le reste des feuilles, filet, commune « imprimée », légendaire par la lumière — déjà largement en place via `CreatorCard`) ; reste du style (rouge/or hors périmètre dans globals.css : arena, tribunal, saisons, pastilles ; textes < 12 px dans profil/objectifs/meme ; cibles < 44 px listées) ; relancer e2e et corriger ; captures 320/390/1024 ; note de version ; commit + push sur accord de Malik ; APK + mise à jour (consigne : vérifier CI, build, publication APK puis parcours de mise à jour ; Vercel aussi car le site change).

# Checkpoint Claude → Codex — sachet du Drop : netteté de l'impression et liseré de tranche (19 octobre 2026)

- Chantier « rendu du sachet du Drop » confié par Malik à Claude, dans `CreatorDeck-Codex`, branche `codex/phase2-completion`, HEAD `fbbdd658871b4d36ebedd523109301c200ccf2d5`. **Local, non commité, rien poussé.** Fait **par-dessus** le chantier « repos, ombre, pression » ci-dessous, lui aussi non commité : arbre non propre, donc pas de branche `claude/…` créée, rien remplacé. Préexistants intacts (Gradle, `.codex-remote-attachments/`, `docs/superpowers/`, `DESIGN.md`).
- **Fichier modifié par ce chantier :** `src/app/drop-binder.css`, règle `.home-view .pack-stage .pack-3d-front` seulement (+21/−4 en comptant le diff précédent de ce fichier, qui reste inchangé).
- **Défauts prouvés** (captures Playwright à `deviceScaleFactor: 3`, `next dev`, avec et sans mouvement réduit) :
  1. **Impression du sachet crénelée ou floue.** Le SVG est vectoriel et servi tel quel (`images.unoptimized`), mais Chromium rastérise la face, prise dans la perspective du bouton et l'animation `.pack-idle`, en basse définition : à l'arrêt, « S » ressemble à « 8 » et la flèche de « TIRE SUR LA SOUDURE » disparaît ; pendant le repos, tout est flou. Preuve : toutes transformations coupées, le texte est net ; `will-change`, `translateZ(0)` sur l'image, sans perspective ou `transform-style: flat` ne corrigent pas.
  2. **Liseré clair vertical à gauche**, droit sur toute la hauteur, tracé devant les soudures crantées (visible à 320, 390 et 1024 px). Isolé : c'est `.pack-3d-side-left` (le colorer en vert le montre). Cause : le `filter: drop-shadow(...)` de la face en fait une surface aplatie que Chromium trie mal avec la tranche. Avancer la face (`translateZ` 10 ou 11 px) ne change rien ; retirer le filtre fait disparaître le liseré. Un filtre déplacé sur l'image le fait revenir.
- **Corrections (tranches non touchées, D-132) :** face dessinée à 150 % puis `translateZ(9px) scale(calc(2 / 3))` en `transform-origin: 0 0`, avec `overflow: visible` ; même taille visible, même profondeur. 1,5 a été préféré à 2 : à l'œil, le rendu est presque aussi net, pour 2,25 fois la texture au lieu de 4. Le `filter: drop-shadow(2px 14px 9px …)` de la face est supprimé : le contact au sol reste porté par `.pack-shadow`, et la différence d'ombre est imperceptible sur les captures. Le reflet (`clip-path` et masque en %) et l'image (`fill`) suivent l'échelle sans réglage. Le voisin MEMES en profite aussi (même structure, dans `.pack-stage`).
- **Risques non corrigés :** (a) un fin trait clair horizontal sous la soudure basse, à gauche, vient du bord haut de `.pack-3d-side-bottom` ; il n'est pas corrigé, car D-132 interdit de toucher aux tranches. (b) La texture 1,5× coûte plus de mémoire GPU, environ 2,25 fois celle de la face, soit à peu près 1 250 × 1 840 px à 304 px de large en DPR 2,75 ; à surveiller sur l'APK. (c) Le crénelage vient du compositeur Chromium : le gain doit être confirmé dans la WebView Android, que Playwright ne remplace pas.
- **Préférence, non traitée :** l'impression porte « TIRE SUR LA SOUDURE → » alors que, sur le Drop, un tap ouvre la présentation. Le texte est dans `live-opening.svg`, partagé avec la scène de déchirure, où il est juste. Hors périmètre.
- **Commandes :** `npm.cmd run typecheck` code 0 ; `git diff --check` code 0 ; `npx playwright test e2e/drop-craft-priorites.spec.ts e2e/booster-selector.spec.ts e2e/pack-tear.spec.ts` → **79 réussis, 5 ignorés, 2 échoués**. Les deux échecs (`pack-tear.spec.ts:466`, bureau et téléphone) viennent d'**instantanés de référence absents pour win32** (`sealed-sachet`/`torn-sachet`, seules les références `-linux` existent). Ce n'est pas une différence de rendu, et ces instantanés montrent la scène d'ouverture, que ce chantier ne touche pas. Les quatre `*-win32.png` écrits par ce lancement ont été supprimés. ESLint n'est pas pertinent (CSS seul). Non lancés : `npm test`, `npm run ecrans`, la suite e2e complète, le build, Android.
- **Captures** (non suivies, dans `.playwright-mcp/`) : `sachet-rendu-avant-{320,zoom,1024}.png`, `sachet-rendu-apres-{320,zoom,1024}.png` (zoom = 390×844 avec le repos animé), `sachet-rendu-diag-tranche-gauche.png`, `sachet-rendu-diag-sans-filtre.png`.
- **À valider par Codex sur émulateur (`-gpu host`) puis sur APK :** (1) texte du sachet net à l'arrêt et pendant le flottement, et voisin MEMES net ; (2) plus de liseré vertical clair à gauche ; (3) aucune saccade ni chute d'images au repos ou à la pression, et mémoire GPU raisonnable ; (4) tap, glissement entre univers et garde de 8 px inchangés, zone tactile identique ; (5) mouvement réduit et `data-card-fx="off"` toujours corrects. **Malik sur téléphone :** juger la matière du film sans l'ombre portée de la face.
- **Reste à faire par Codex :** relire le diff ; note de version dans `src/lib/release-notes.ts` (sachet plus net, changement visible), à regrouper avec celle du chantier ci-dessous ; suite e2e complète avant push (D-148) ; trancher la référence `-win32` manquante de `pack-tear` (à régénérer localement ou à ignorer hors Linux).

# Checkpoint Claude → Codex — sachet du Drop : repos, ombre, pression (19 octobre 2026)

- Chantier confié par Malik à Claude, réalisé dans `CreatorDeck-Codex`, branche `codex/phase2-completion`, HEAD `fbbdd658871b4d36ebedd523109301c200ccf2d5` (un seul commit depuis `280c1a60`, `AGENTS.md` seulement). **Local, non commité, rien poussé.** Claude rend le checkout à Codex. Préexistants intacts : `android/app/capacitor.build.gradle`, `android/capacitor.settings.gradle`, `.codex-remote-attachments/`, `.playwright-mcp/` (Claude y a ajouté des captures `drop-*.png`, sans suivi Git), `docs/superpowers/`.
- **Constat avant modification**, par styles calculés dans Chromium à 390×844 (`next dev`) : le repos `drop-pack-idle` (4,8 s, ±4 px, rotateY ±3°, rotateX ±1,5°) et le reflet `drop-pack-specular-pass` de 4 s respectaient déjà la demande. Trois écarts : (1) `stage.css` écrasait la pression `scale(.97)` de `drop-binder.css` par `rotateX(9deg) translateY(5px) scale(.955)` en 120 ms ; (2) l'ombre de contact (`.pack-shadow`) et l'ombre ambiante (`::after`) restaient fixes pendant le flottement ; (3) `overflow: clip` sur `.pack-stage.booster-carousel`, avec `--drop-stage-pb: 0px`, coupait net le bas de l'ombre ambiante (boîte de l'ombre jusqu'à 724 px, bord de la scène à 723 px, `box-shadow` et flou de 14 px au-delà).
- **Fichiers modifiés :**
  - `src/app/stage.css` : pression `perspective(900px) rotateY(-7deg) rotateX(4deg) scale(.97)` en `transform 100ms cubic-bezier(0.23, 1, 0.32, 1)` ; scène du carrousel en `overflow-x: clip; overflow-y: visible` (le voisin reste rogné sur les côtés, l'ombre déborde vers le bas).
  - `src/app/drop-binder.css` : nouvelle animation `drop-pack-shadow-idle`, avec la même durée, le même délai et la même courbe que `.pack-idle`. Elle utilise la propriété `scale`, pas `transform`, pour ne pas toucher au centrage `translateX(-50%)` : ombre à `scale 1` et opacité 0,95 quand le sachet est au plus bas, `scale .88 .8` et 0,72 au plus haut. Coupée sous `prefers-reduced-motion: reduce` et `[data-card-fx="off"]`.
  - `e2e/drop-craft-priorites.spec.ts` : l'assertion `overflow` (raccourci, qui vaudrait maintenant `clip visible`) devient `overflowX` ∈ clip/hidden et `overflowY` = visible ; ajout des vérifications de l'animation d'ombre (active, puis `none` en mouvement réduit) et de l'échelle 0,97 ± 0,003 à 140 ms d'appui.
  - `DESIGN.md` (non suivi, du chantier précédent) : description du sachet mise à jour.
- **Inchangés volontairement :** taille du sachet (`--drop-pack-size`), image (`/packs/live-opening.svg`), CTA rouges, `pack-foil-3d.tsx` (rendu WebGL de l'ouverture, pas du repos sur le Drop), `drop-view.tsx` et `booster-premium.css` (aucune règle effective du sachet au repos à y corriger). Easing du repos laissé en `ease-in-out` : la respiration doit rester sinusoïdale, une courbe forte créerait des arrêts.
- **Vérifié par Claude :** échantillons de l'animation à 0/25/50/75 % : translateY +4/0/−4/0 px, rotations ±3° et ±1,5°, ombre synchronisée. Pression souris : échelle 1 → 0,9712 à 40 ms → 0,9700, retour à 1 au relâchement hors du sachet, aucune ouverture déclenchée. Mouvement réduit : repos, ombre, arrivée et reflet à `none`, la pression devient instantanée. `scrollWidth` 375 pour 390 de large (pas de défilement horizontal). Captures à 390×844 et 360×640 relues, sans régression visible.
- **Commandes :** `npm.cmd run typecheck` code 0 ; `npm.cmd run lint -- --ignore-pattern 'android/**/build/**'` code 0, 0 erreur, 1 avertissement préexistant dans un bundle Android généré ; `npx playwright test e2e/drop-craft-priorites.spec.ts` **8/8** (bureau + téléphone) ; `npx playwright test e2e/booster-selector.spec.ts` **12 réussis, 4 ignorés** (ignorés par le spec lui-même, non examinés) ; `git diff --check` code 0. Non lancés : `npm test`, `npm run ecrans`, la suite e2e complète (dont `pack-tear.spec.ts`), le build, Android.
- **À valider par Codex sur émulateur (`CreatorDeck_API36`, `-gpu host`) puis sur APK :**
  1. Repos du sachet Live sur le Drop : flottement doux sans saccade, sans bord ni ombre coupés en bas, voisin MEMES toujours rogné à droite, sans défilement horizontal.
  2. Ombre : elle s'étale et pâlit quand le sachet monte, et suit le même rythme sans décalage visible. Elle ne doit pas assombrir la ligne « restants » sous la scène.
  3. Pression tactile : enfoncement à 0,97 ressenti immédiat, retour net. Un tap ouvre toujours la présentation ; un glissement horizontal change d'univers sans ouvrir (garde de 8 px de `PackArtwork`).
  4. Réglage système « Supprimer les animations » et `data-card-fx="off"` : sachet immobile, ombre fixe, aucun reflet.
  5. Petits écrans (≤ 620 px de haut) et WebView Android : `overflow-x: clip` avec `overflow-y: visible` est attendu sur Chromium récent ; confirmer qu'il n'y a ni rognage vertical ni barre de défilement.
- **Reste à faire par Codex :** relire le diff ; ajouter la note de version dans `src/lib/release-notes.ts` dans le même commit (le changement de pression est visible par le joueur, voir `docs/nouveautes.md`) ; lancer la suite e2e complète avant tout push sur `main` (règle D-148) ; commit explicite des trois fichiers suivis et, si souhaité, de `DESIGN.md`, sans les fichiers Gradle ni les dossiers non suivis.

# Checkpoint Claude → Codex — DESIGN.md (19 octobre 2026)

- Chantier confié par Malik à Claude dans `CreatorDeck-Codex`, branche `codex/phase2-completion`, réalisé au HEAD `280c1a60` (le seul commit suivant, `fbbdd658`, ne touche que `AGENTS.md`). **Un seul fichier ajouté, non suivi et non commité :** `DESIGN.md` à la racine. Pour ce chantier : aucun code, CSS ou test modifié, aucun commit, push, reset ni déploiement. La mise à jour de sa section sachet relève du checkpoint ci-dessus. Préexistants intacts.
- **Contenu :** le design system **existant** au format DESIGN.md (frontmatter YAML et huit sections canoniques en anglais, contenu en français) : tokens de `:root` dans `src/app/globals.css` (couleurs, polices, échelle `--t-*`) ; raretés de `RARITY_META` (`src/lib/catalog.ts`) ; polices de `layout.tsx` (Barlow Condensed 500/600/700, IBM Plex Sans Variable, embarquées par `@fontsource`) ; rayons, espacements et ombres **relevés dans les feuilles** (il n'existe pas de tokens CSS pour eux, le document le dit) ; scène bordeaux du Drop (`--scene-background` de `booster-continuity.css`, tranches 3D, ombre et fond radial de `drop-binder.css`, pile `.pack-pile-back` de `stage.css`). Les métaphores et les règles citées viennent des commentaires du code.
- **Écarts relevés par lecture, consignés en fin de `DESIGN.md`, sans correction :**
  1. Couleurs en dur hors `:root` malgré la règle de `globals.css` : rouges et dégradés de `stage.css` (`#ff6a52`, `#b0201a`, `#c0281d`, `#ff4d5e`, `#e23347`, `#ff2d43`, `#9146ff`), `#d52820` dans `booster-carousel.css:38`, toute la scène bordeaux, `#ffd17f` et `#80561e` dans `globals.css`.
  2. `--gold`, déclaré « que pour la légendaire », sert aussi au score du Binder, au bonus de réserve, aux sabliers et à la mention « non possédée ».
  3. `themeColor: "#090812"` (`layout.tsx:56`) ≠ `--bg-deep` `#08080a`.
  4. Le fond bordeaux de `.home-view .pack-stage` (`drop-binder.css:40-43`) est annulé dans le carrousel par `stage.css` (`background: none`, sélecteur plus spécifique). De même, le ticket papier `.home-view .open-panel` (`drop-binder.css:147-167`) est vidé par `stage.css`, chargé après avec la même spécificité.
  5. Variantes `.primary-action` sans cible visible sur le Drop : la pilule rouge `.is-lean .primary-action` (`stage.css`) et le bouton bordeaux `.home-view .primary-action` (`drop-binder.css:174-184`). `drop-view.tsx` ne rend plus de `.primary-action` (le sachet est le bouton) et `e2e/drop-craft-priorites.spec.ts:42` vérifie qu'il n'y en a aucun sur le Drop. Hypothèse de CSS mort, à confirmer avant suppression.
- **Limites :** relevé fait par lecture, sans rendu (les captures sont venues avec le chantier sachet). Pas de sidecar `.impeccable/design.json`, pas de `PRODUCT.md`, aucune question de style posée à Malik.
- **Prochaine action pour Codex :** relire `DESIGN.md` (documentaire : liens et cohérence, pas de suite de tests) ; `git add DESIGN.md` dans un commit explicite, ou avec le lot sachet. Pas de note de version pour ce fichier seul. Facultatif, en lot séparé : trancher les écarts 1 à 5, puis mettre `DESIGN.md` à jour.

# Checkpoint — priorité au développement du jeu (19 octobre 2026)

- Malik demande que Codex développe, lance l'application, vérifie visuellement et fonctionnellement sur Playwright et, pour le mobile/tactile/boosters/animations, prioritairement sur émulateur Android et APK ; correction puis nouveau test avant livraison. Téléphone physique seulement en dernier recours avec limite matérielle précise. Ne plus construire d'infrastructure sans nécessité démontrée ni appeler Claude automatiquement avec coût/quota non autorisé. Ces règles sont inscrites dans `AGENTS.md`, sans modification du code du jeu.
- Base de cette mise à jour documentaire : `main` distant et HEAD local `36eb4c48e76d6ffcd580ca119d5427a6578330fe`, identiques avant édition ; fichiers Gradle et dossiers non suivis préservés. CI de ce SHA [39188660346](https://github.com/GoodFight37/CreatorDeck/actions/runs/39188660346) terminée avec succès : 6 jobs réussis, job de résumé d'échec ignoré comme prévu. Vercel Production `READY` sur ce SHA. Aucun test applicatif relancé pour ce changement documentaire ; `git diff --check` et le diff indexé servent de vérification. Statut de publication des nouvelles consignes à compléter après push.

# Checkpoint — reprise phase 2 (19 octobre 2026)

- Base distante vérifiée via Git HTTPS : `main` était à `d46019f8e51d736726cbb06193121af578b546f7`, `codex/autonomous-tests` à `51d216aded4b5f2d300394bd097f1f3386928194`. Le réseau du shell restreint ne résolvait pas GitHub ; la commande Git avec accès réseau autorisé a réussi. `gh auth status` signale un jeton CLI invalide ; Git HTTPS en lecture fonctionne. La branche de livraison `codex/phase2-completion` part de `origin/main` dont l'arbre était identique à celui de l'ancienne branche avant ces modifications ; fichiers préexistants préservés. Une sauvegarde du diff initial est dans `reports/phase2-local-before.patch` (ignoré par Git).
- Correctif smoke Android local repris et vérifié par le rapport `reports/android-smoke/2026-10-19T01-45-28-650Z/result.json` : 872393 → 872394, navigation, sauvegarde et marqueur conservés, sortie 0. La configuration GPU de l'AVD est hors dépôt. Aucun émulateur actif observé lors de cette reprise.
- Le helper Claude refuse désormais tout appel sans `CREATORDECK_ALLOW_PAID_CLAUDE=1` défini pour l'appel concerné ; aucun modèle n'a été lancé. `npm.cmd run test:autonomy` : 15/15, dont incident artificiel confirmé/dédupliqué et refus de délégation sans accord ; `npm.cmd run typecheck` : sortie 0 ; `node --check` et `git diff --check` : sortie 0. Les tests d'incident prouvent le rapport et la reprise unique, pas une correction autonome réelle.
- Runner GitHub local non installé : dépôt public et aucune isolation de jobs non fiables sur ce PC personnel. La tâche Windows locale toutes les 4 h et la CI hébergée restent les contrôles existants. Diagnostic Android réel sur téléphone : seulement le retour utilisateur de mise à jour et conservation des données ; aucun export de diagnostics opt-in recueilli. Publication et contrôles distants du nouveau commit à renseigner après push, sans les anticiper.
- Publication contrôlée : commit `36eb4c48e76d6ffcd580ca119d5427a6578330fe` poussé normalement sur `main` ; `git ls-remote` confirme le même SHA. CI [39188660346](https://github.com/GoodFight37/CreatorDeck/actions/runs/39188660346) encore `in_progress` au dernier contrôle ; ne pas la présenter verte avant sa conclusion. Vercel Production `READY` sur ce SHA, déploiement `dpl_29xsrm2T6XRGAay2JBMXjwaJTRvw` et alias `creator-deckk.vercel.app`. Les fichiers Gradle modifiés préexistants et les trois dossiers non suivis restent hors commit.

# Checkpoint — smoke Android corrigé et validé (19 octobre 2026)

- Sur `codex/autonomous-tests`, HEAD de base `51d216aded4b5f2d300394bd097f1f3386928194`. Le seul changement de code apporté après ce SHA est local et non commité : `scripts/android-emulator-smoke.mjs`. Les modifications préexistantes `android/app/capacitor.build.gradle`, `android/capacitor.settings.gradle`, `.codex-remote-attachments/`, `.playwright-mcp/` et `docs/superpowers/` restent préservées et hors périmètre.
- Diagnostic Claude : les six dumps WER QEMU montraient une violation d’accès dans `libGLESv2.dll` SwiftShader; le renderer matériel NVIDIA RTX 3070 évite le crash. L’AVD utilisateur est configuré hors dépôt en `hw.gpu.enabled=yes`, `hw.gpu.mode=host`; sauvegarde `config.ini.bak-20261019-swiftshader`. Aucun code de l’application n’a été modifié.
- Le script refuse désormais tôt SwiftShader et consigne `renderer`; la WebView est pilotée par l’API Android Playwright, filtrée par PID courant et avec délai de 5 s; les captures autorisent 64 Mio.
- Claude avait signalé qu’un deuxième passage persistant rétrograderait 872394 vers 872393. Ma première relance a reproduit ce cas; le script installe maintenant la baseline avec `install -r -d` (rétrogradation autorisée, données conservées). Ma relance complète `npm.cmd run quality:android -- reports/android-smoke/initial-872393.apk reports/android-smoke/update-872394.apk` sort code 0 : `reports/android-smoke/2026-10-19T01-45-28-650Z/result.json`, renderer NVIDIA, 872393→872394, Binder/Atelier/Drop, `savePreserved=true`, `markerPreserved=true`. `node --check` et `git diff --check` réussissent; `npm.cmd run test:autonomy` : 14/14.
- Passage Claude indépendant avec `-gpu host` : `reports/android-smoke/2026-10-19T01-33-05-764Z/result.json`, également `ok=true`. Test négatif SwiftShader : arrêt attendu en 1,3 s. Les captures incluent `initial.png` et `apres-mise-a-jour.png`.
- Limites : le marqueur et l’empreinte locale ne vérifient pas les préférences/collection réelles du joueur; le parcours d’installation via le bandeau est distinct (Malik l’a déjà confirmé sur son téléphone pour l’APK publiée). L’émulateur était encore lancé au retour de Claude.
- Aucun commit ni push de cette correction. Vérification `git ls-remote` impossible dans cette session : DNS GitHub (`Could not resolve host: github.com`); branche distante, CI et Vercel non revérifiés. Ne pas publier avant vérification du distant et examen des commits nouveaux.

# Checkpoint — autonomie phase 2 publiée et vérifiée (19 octobre 2026)

- Commit de code sur `codex/autonomous-tests` : `abd093973c4407876d155637794851d5ac1d3d73`. PR #14 fusionnée normalement vers `main` au SHA `21ef428ed4455cd086d4a133d911489f3e110140`. `git ls-remote` confirme les références après fusion.
- Modifications de phase 2 : workflows APK et Vérification, `package.json`, rapports et orchestration `scripts/mobile-quality.mjs`, test `scripts/mobile-quality.test.mjs`, smoke Android `scripts/android-emulator-smoke.mjs`; nouveaux `scripts/apk-release-gate{,.test}.mjs`, `scripts/ci-incident-report{,.test}.mjs`, `scripts/lib/android-app-ready.mjs`, `scripts/lib/quality-incidents.mjs`, `scripts/{android-emulator-smoke,quality-incidents}.test.mjs`; documents phase 2, décisions D-153/D-154 et spécification/plan locaux.
- Vérifications : `npm test -- --maxWorkers=2` **1301/1301**, 94 fichiers ; `npm run test:autonomy` 14/14 ; typecheck, ESLint ciblé, syntaxe Node, YAML `js-yaml` et `git diff --check` réussis. `npm run lint -- --ignore-pattern 'android/**/build/**'` code 0 avec un avertissement dans un bundle Android généré. `npm run build` réussi (Next.js 16.3.6, six pages statiques), cloud Supabase absent du bundle local.
- Routine manuelle `npm run quality:mobile` réussie : orchestrateur, typecheck et 7/7 e2e téléphone ; rapport `reports/mobile-quality/2026-10-18T23-55-53-846Z-13ed8945/summary.md`. Tâche planifiée `CreatorDeck-Qualite-Mobile` confirmée `Ready`, toutes les 4 h, Node sur ce checkout, compte `Administrator`, RunLevel `Limited`. `Start-ScheduledTask` réel : `LastTaskResult=0`, rapport `reports/mobile-quality/2026-10-19T00-11-58-241Z-13ed8945/summary.md`, 7/7 e2e.
- Android : SDK et AVD existent et l’émulateur a démarré. La première installation a refusé `872393` car `872394` était déjà présent ; `adb install -r -d` a ensuite préparé `872393` en conservant le stockage. Deux smoke tests ont échoué avant la mise à jour : ADB a perdu `emulator-5554` pendant l’attente WebView ou au lancement. Rapports `reports/android-smoke/2026-10-19T00-03-36-853Z/result.json` et `reports/android-smoke/2026-10-19T00-06-04-241Z/result.json`; journal `reports/android-smoke/emulator-swiftshader.log` confirme le boot 33,7 s mais le processus s’arrête. Version `872394`, navigation complète et empreinte de sauvegarde après update non vérifiées. L’AVD utilisateur n’a pas été effacé; aucune donnée de téléphone/cloud touchée.
- Orchestration : le runner auto-hébergé n’est pas installé/enregistré/connecté ; aucun service Runner GitHub trouvé. Je n’en ai pas créé : le dépôt est public, aucune isolation d’exécution des révisions non fiables ni jeton d’enregistrement utilisable n’est disponible ici. La tâche périodique locale fonctionne. Paquet Codex en lecture seule et diagnostic CI sans IA sont implémentés, mais aucun workflow distant ne les a encore exécutés.
- CI PR #14 : run Vérification **39179902283**, succès, 6/6 jobs (unitaires/écrans/statique/build, Postgres jetable, RPC simulés, 3 lots Playwright). Sur le merge SHA, Vérification **39180481883** succès; Mise à jour Supabase **39180896697** succès; APK de test **39180896682** succès, release [v872830](https://github.com/GoodFight37/creatordeck-apk/releases/tag/v872830). Vercel Production `READY` sur `21ef428ed4455cd086d4a133d911489f3e110140`.
- APK : `workflow_dispatch` retiré ; garde testé localement pour la publication seulement après succès de Vérification sur un push `main` du même SHA et dépôt. Aucun appel IA, aucun coût API ni changement de télémétrie ; Claude/Codex non appelés.
- Modifications préexistantes préservées et hors commit : `android/app/capacitor.build.gradle`, `android/capacitor.settings.gradle`, `.codex-remote-attachments/` et `.playwright-mcp/`. Aucun reset, nettoyage ou changement de worktree. Blocage restant : smoke Android échoue car l’émulateur disparaît et ADB perd `emulator-5554` ; aucune validation de mise à jour APK locale sur émulateur lors de cette reprise. Aucune donnée téléphone/production modifiée. État local après commit : `docs/superpowers/` non suivi, conservé.

# Checkpoint local — publication qualité autonome (19 octobre 2026)

- [PR #13](https://github.com/GoodFight37/CreatorDeck/pull/13) fusionnée sur `main` `ad360bd9278f84dc54e0942c838c931e54b6558e`. [CI de `main`](https://github.com/GoodFight37/CreatorDeck/actions/runs/39172783913) verte ; mise à jour Supabase et [workflow APK](https://github.com/GoodFight37/CreatorDeck/actions/runs/39173232256) réussis ; Vercel `success` sur le même SHA. [APK v872721](https://github.com/GoodFight37/creatordeck-apk/releases/tag/v872721) publiée, après v872315.
- Malik confirme sur son téléphone avoir lancé la mise à jour depuis le bandeau « Mettre à jour », installé la nouvelle APK sans problème et retrouvé ses cartes/réglages après installation. Le parcours téléphone demandé est donc validé par retour de Malik, sans capture ni journal technique de l'appareil. L'essai émulateur `872393` → `872394` reste documenté ci-dessous. Ce checkpoint est local, non commité : éviter un commit documentaire sur `main` qui déclencherait une nouvelle APK.

# Checkpoint — qualité mobile autonome, PR #13 (19 octobre 2026)

- SHA distants revérifiés le 19 octobre : `main` `c4c458eebe0446ffd8e91a48ff118bbdb08c2fa7`, `codex/autonomous-tests` `6570237ce7aa1c22aeec237bef6fe8a7b8f49d5a`. [PR #13](https://github.com/GoodFight37/CreatorDeck/pull/13) ouverte, fusionnable, sans nouveau worktree. Deux dossiers non suivis préexistants préservés ; les deux fichiers Gradle générés restent hors commit.
- Routine locale `npm run quality:mobile` : typecheck, sept scénarios Chrome tactiles dont déchirure et réglages du son, captures et mesures archivées dans `reports/mobile-quality/<date>-<SHA>/`. Dernier passage **par la tâche Windows** : 7/7 et code de sortie 0 sur `82bfaff4`, rapport local `reports/mobile-quality/2026-10-18T22-02-52-871Z-82bfaff4/summary.md` (ignoré par Git). Le mode complet est préparé, pas encore exécuté. Les mesures pendant l'action signalent des images lentes dans Binder et une à la révélation ; observation navigateur de développement, à confirmer avant correction.
- Tâche Windows `CreatorDeck-Qualite-Mobile` créée avec droits limités, une instance et délai 25 min ; répétition toutes les quatre heures en session ouverte. Déclenchement manuel puis premier passage planifié : codes de sortie 0. Aucun appel IA, secret ou production.
- Diagnostic opt-in dans Toi : événements et durées uniquement, 100 entrées maximum, aucun envoi, effacement à l'arrêt. Preuves locales : mobile 7/7, unitaires 1301/1301 avec deux workers, écrans 235/235, typecheck, jargon, build statique, `cap sync` et Gradle debug verts. Un premier run unitaire très parallèle a eu 2 échecs dans les tests Git temporaires ; ces 11 tests passent isolés et la suite complète passe avec deux workers. Aucun essai cloud de production.
- Android : après redémarrage Windows, `emulator -accel-check` confirme WHPX utilisable. Sur `CreatorDeck_API36`, `npm run quality:android -- reports/android-smoke/initial-872393.apk reports/android-smoke/update-872394.apk` passe (code 0) : installation de `872393`, lancement, mise à jour `install -r` vers `872394`, marqueur de stockage privé conservé. Rapport et captures locaux : `reports/android-smoke/2026-10-18T22-24-05-376Z/`. La capture prise après chargement et l'arbre d'accessibilité montrent l'accueil « Ton premier booster t'attend ». Les captures immédiates du script montrent encore le chargement ; elles ne suffisent pas seules à valider l'accueil. APK debug sans cloud : collection, préférences du jeu, bandeau de mise à jour et vrai téléphone non vérifiés.
- GitHub Actions : captures et mesures du navigateur ajoutées aux artefacts ; [CI du dernier commit](https://github.com/GoodFight37/CreatorDeck/actions/runs/39170938187) verte 6/6 sur `6570237c`, y compris la clé de concurrence par SHA qui évite les doubles runs push/PR. Production Vercel du lot non vérifiée, car `main` n'a pas changé. Runner auto-hébergé non installé sur le PC personnel, voir [décision D-152](decisions.md).

# Checkpoint — D-149, D-150, D-151 publiés (18 octobre 2026)

- main `5f0a77c` : PR #9 (`e5852e1`, cercle 0–15 et 0058), PR #10 (`1179169`,
  nuit de direct), PR #11 (`5f0a77c`, plugin de mise à jour). Pour chaque
  merge : « Vérification », « Mise à jour Supabase » et « APK de test » verts ;
  APK publiée `5f0a77c` (versionCode 872315) ; Vercel Production vert sur `1179169`.
- Conflit #9/#10 résolu dans `fd1ac20` (carte de #10, texte « une seule
  suffit » de #9, deux notes de version, tests de finition réunis).
- Tests du dernier lot : `npm test` 1299/1299, `npm run ecrans` 235/235,
  typecheck vert, e2e complets en CI. Localement, `pack-tear:466` échoue à cause
  d'un Chromium 141 différent de celui de la CI (153) ; vert en CI.
- Limites de l'environnement cloud : téléchargement Playwright, artefacts et
  logs bruts de la CI bloqués par le proxy ; `npm run supabase:verify` impossible
  en root (initdb), exécuté par la CI.
- Ouverts : une chaîne au plus une fois par booster (migration + miroir TS) ;
  carte révélée plus grande (régénérer `torn-sachet` en CI). Malik doit
  installer une fois l'APK `5f0a77c` à la main ; non vérifié sur appareil.
- Réservation libérée.

# Checkpoint — D-148 publié, CI verte, 0057 appliquée (18 octobre 2026)

- Code vérifié : `main` = `7324c7d9b493ae6d69637d53fa3e7e07747bf263`, avance
  rapide depuis `e87903e`, après CI verte sur `claude/loving-galileo-5pllme`
  (run 39104492105).
- Les e2e rouges depuis `2d39f3c` sont alignés sur D-148 : 2 missions à J1,
  réserve inchangée au premier booster du jour (+1 de série), Scène et Tribunal
  ouverts via « Autres activités » d'Objectifs (`openOtherActivities` dans
  `e2e/fixtures.ts`), matière Commune non nulle, cadeau cloud simulé avec une
  chaîne par rareté du catalogue (les cinq du cercle sont Légendaires).
- Vrai bug corrigé : Scène consommée depuis Objectifs, focus perdu sur `body` ;
  repli `data-presentation-focus-fallback` sur le titre « Aujourd’hui »
  (`missions-view.tsx`). Échec reproduit sans le correctif.
- Local (Chromium 141 préinstallé, téléchargement Playwright refusé par le
  réseau) : `npm test` 1287/1287, `npm run ecrans` 230/230, typecheck OK,
  `npm run e2e` 182 réussis / 18 ignorés (cloud) / 2 échecs de capture
  `sealed-sachet` (pack-tear:465, écart de version Chromium, vert en CI),
  cloud simulé 16/16.
- GitHub sur `7324c7d` : « Vérification » verte (run 39105047368) ; « Mise à
  jour Supabase » automatique refusée comme prévu (0057 manual), puis
  dispatch `dry_run=false`, `approve_manual=true` réussi (run 39105304767 :
  0057 appliquée, historique et objets vérifiés) ; « APK de test » réussi
  (run 39105296785) ; Vercel Production `success` sur ce SHA.
- Pas d'essai sur vrai téléphone. Réservation libérée.

# Checkpoint — finition courte, locale, 18 octobre 2026

- Tirage, rareté unique, bouton et rétention présents avant cette finition ; lots préservés.
- Le portrait entier garde ses proportions dans le cadre vertical de CreatorCard, sans étirement.
- Une matière commune par rareté catalogue, dans le classeur, la fiche et la révélation ; aucune légende ajoutée.
- Atelier est le nom de l’onglet, du titre et des textes ; aucun nouveau nom d’écran.
- Même piste musicale conservée, gains existants de 8 % à l’accueil et 4 % pendant l’ouverture.
- Preuves locales : 46 tests d’écrans, 23 tests audio et un parcours Chrome 390×844 réussis ; typecheck et build verts.
- Export compilé sans cloud : aucune validation du serveur de production ; tirage, SQL, missions et geste du sachet inchangés.
- Aucun vrai téléphone, écoute physique, APK ou mise à jour sur appareil essayé ici ; local non commité, HEAD 3f23ae65, réservation libérée.

# Historique — D-148 rétention, local uniquement (18 octobre 2026)

- Demande : rétention seulement, fichiers locaux, aucun commit. Branche
  `etape-4-cercle-vrai`, HEAD `3f23ae655b322f7e459bf66d22e49e0094268f6b`.
  Aucun clone, accès GitHub, fetch, push, SQL distant ou délégation.
  Lots locaux D-146/D-147 et protections de travail préservés.
- Série : une absence d'un seul jour protégée une fois par cycle de sept jours
  joués ; une seconde absence ou deux jours d'absence consécutifs repartent à
  J1. J1–J6 offrent chacun un booster, une fois par journée de jeu ; J7 conserve
  le booster Perfect. Fin de l'affichage des trois monnaies et du choix sabliers.
  Moteur, sauvegarde du drapeau et adoption du résultat serveur alignés.
- Le serveur verse déjà la série (0056 appelle les barèmes points/jetons) :
  nouvelle migration **locale et manuelle** `0057_retention.sql`. Elle repart
  d'`open_pack` de 0056, conserve son tirage de cercle, crédite la réserve sous
  verrou, déduit la série du journal Live Drop et ferme `last_pack_steal` aux
  clients. Aucune migration précédente modifiée, aucune application distante.
- Recyclage et Tribunal : missions à partir de J2, hors réclamation J1 ; ils
  ne conditionnent pas la récompense de série. Tribunal, Scène et Arène retirés
  des deux accueils, disponibles dans « Autres activités » fermé d'Objectifs.
  Disponibilité serveur du Scène préservée. « Définir mes chaînes » conservé.
- Hôtel, échanges et classement : lecture indépendante du classement mondial
  pour distinguer le joueur des autres (ni le tri par famille ni une liste
  d'amis vide ne suffisent). Sans autre joueur : une action de partage d'une
  carte du cercle, partage système ou copie du texte, sans transfert. Sans
  cercle : accès à sa définition. Last Pack devient consultatif, sans vol.
- Tests : cas rouges reproduits puis **345 unitaires ciblés réussis** via
  `npm test -- src/lib/game-progression.test.ts src/lib/game-engine.test.ts
  src/lib/supabase-progression.test.ts src/lib/supabase-jetons.test.ts
  src/lib/cloud/cloud-store.test.ts src/lib/retention.test.ts
  src/lib/supabase-retention.test.ts src/lib/game-store.test.ts`, plus **4 tests**
  `src/lib/cloud/store/retention.test.ts` réussis séparément.
  `npm run ecrans -- --exclude src/ecrans-app-update.test.tsx` : **223/223**,
  35 fichiers, suite APK exclue explicitement pour l'erreur d'import ci-dessous.
  Avertissements `act` dans deux anciens scénarios d'accueil, pas d'échec.
  `npm run typecheck` final réussi, lint ciblé et garde-jargon réussis.
- **Téléphone simulé : 2/2 Playwright réussis**, Chrome installé, viewport
  390×844, requêtes hors localhost bloquées. Config temporaire hors dépôt pour
  utiliser `channel: chrome`, serveur local Next `--webpack` (Turbopack avait
  expiré à 120 s ; le Chromium headless demandé par défaut est absent, aucun
  téléchargement). Captures locales `test-results/retention-avec-cercle.png`
  et `test-results/retention-sans-cercle.png` relues. Pas un essai Android réel.
- **Limites explicites :** `npm run supabase:verify` échoue avant les scénarios,
  PostgreSQL refusant le compte Windows administrateur. Contrat miroir 0057
  testé ; exécution SQL préparée dans `scripts/verify-retention.mjs`, intégrée
  en fin de vérification après les migrations historiques. Pas d'affirmation
  de SQL exécuté. La suite large unitaire a 1 282 assertions réussies mais sort
  en échec de chargement sur `app-update.test.ts` ; même import défaillant dans
  `ecrans-app-update.test.tsx` : `apk-manifest.mjs`, inchangé, « Invalid or
  unexpected token ». `node --check` du script réussit ; APK hors périmètre.
- État : local non commité, non déployé. Aucun polish de carte ni changement
  de poids mondiaux. Prochaine action : essai de Malik ; la migration reste
  à exécuter sur Postgres jetable compatible avant toute publication sensible.
  Réservation libérée à l'issue des contrôles ; HEAD inchangé.

# Historique — D-147 réserve vide et choix personnels, local uniquement (18 octobre 2026)

- Demande limitée : action utile à réserve vide et complément après trois
  chaînes reconnues choisies personnellement. Aucun commit demandé.
- Branche `etape-4-cercle-vrai`, HEAD inchangé
  `3f23ae655b322f7e459bf66d22e49e0094268f6b`. Aucun accès GitHub, clone,
  fetch, push, migration ou délégation. Travail local D-146 préservé.
- `drop-view.tsx` : réserve vide avec cercle, lien vers le premier direct
  frais du cercle, sinon bouton actif « Personne de tes chaînes en direct »
  qui fait défiler et place le focus sur la rangée. Recharge en ligne
  secondaire ; sablier seulement dans « Réserve, taux et sabliers ».
- `circle-onboarding.tsx` : trois choix personnels reconnus avant le
  complément, au plus deux suggestions, confirmation explicite séparée.
  Nom inconnu signalé sans remplacement automatique ; validation exige cinq
  chaînes distinctes présentes dans le catalogue. Retirer un choix personnel
  le retire aussi du seuil de trois ; les suggestions ne comptent pas.
- Tests rouges reproduits (5 échecs attendus), puis `npm run ecrans --
  src/ecrans-circle-live.test.tsx src/ecrans-circle-onboarding.test.tsx
  src/ecrans-binder-cercle.test.tsx src/ecrans.test.tsx
  src/ecrans-reset-tutoriel.test.tsx src/ecrans-tutorial-after-account.test.tsx` :
  **37/37 réussis** sur ce diff. Anciens scénarios d’accueil adaptés pour
  saisir trois vrais noms avant le complément. Quelques avertissements React
  `act` dans les deux scénarios d’accueil intégrés ; aucun test échoué.
  `npm run typecheck` réussi. Essais jsdom, aucun essai téléphone revendiqué.
- Checkpoint local non commité. Réservation libérée ; prochaine action :
  essai de Malik. Aucun SQL, mission, polish ou publication pour ce lot.

# Historique — D-146 rareté unique, local uniquement (18 octobre 2026)

- Demande : utiliser uniquement la rareté catalogue et le même signe
  « Préférée » / « Dans tes chaînes » à la révélation et au Binder. Aucun SQL,
  changement de tirage serveur, recharge, mission ou polish ; **pas de commit**.
- Base locale vérifiée : `etape-4-cercle-vrai`, HEAD
  `3f23ae655b322f7e459bf66d22e49e0094268f6b`. Aucun clone, fetch ou accès GitHub
  pour cette tâche. D-145 reste intact. Seuls les deux dossiers d'artefacts
  non suivis préexistaient ; ils sont préservés.
- Retrait de la substitution dans RevealOverlay et de la propagation des
  métadonnées depuis le cadeau, le moteur et l'aperçu invité. Champs anciens
  encore acceptés mais ignorés. Rangée de chaînes basée sur la rareté réelle ;
  signe commun via circleLabel. Objectif de craft au prix réel du catalogue et
  mention « à tirer » quand interdit. Tests exigeant la fausse rareté retirés ;
  fixtures d'effets rendues cohérentes avec le catalogue, sans changer les effets.
- Preuves sur le diff basé sur ce HEAD : test rouge reproduit sur la préférée
  Commune affichée Légendaire, puis **41/41 unitaires ciblés**, **40/40 écrans**
  (circle-pack, binder-cercle, effets), `npm run typecheck` réussi. Vérifie
  explicitement la même Commune, « Préférée », le récap et le son ; la Commune
  préférée reste fabricable au prix Commune. Tests jsdom, pas un essai téléphone.
- Pas de SQL exécuté ou modifié, aucun commit, push ou déploiement. Correctif
  conservé uniquement dans les fichiers locaux ; réservation libérée après
  les derniers contrôles. Prochaine action : essai de Malik ou commit seulement
  sur sa demande explicite. ESLint ciblé, garde-jargon et `git diff --check`
  réussis ; HEAD final inchangé, aucun fichier SQL ou du tirage D-145 modifié.

# Historique — D-145 publié et vérifié (18 octobre 2026)

- **Terminé :** règle cercle vrai publiée sur `main` et
  `etape-4-cercle-vrai`, code `0fe66715ab07203ff00ce6eedf08653aa92aa995`.
  [CI main 39095971227](https://github.com/GoodFight37/CreatorDeck/actions/runs/39095971227)
  et [CI branche 39095971355](https://github.com/GoodFight37/CreatorDeck/actions/runs/39095971355)
  **6/6 vertes**, SHA exact relu. Compteurs du run main : 1 273 unitaires,
  218 écrans, 289 contrôles SQL 0056, 16 scénarios cloud simulés ; Playwright
  178 réussis et 18 ignorés sur trois shards. Typecheck, lint, catalogue et
  build réussis. Aucun test ignoré n'est compté comme réussi.
- **Production SQL :** [0056 appliquée](https://github.com/GoodFight37/CreatorDeck/actions/runs/39095857620)
  après CI main et diagnostic TLS/historique, puis [relecture après application](https://github.com/GoodFight37/CreatorDeck/actions/runs/39095932681)
  réussie : base à jour et vérifiée, aucun SQL réexécuté. Aucune réparation
  d'historique et aucune modification des fichiers 0054/0055.
- **Production web :** déploiement GitHub `7149734313`, environnement
  `Production`, état `success` au SHA `0fe66715`,
  [inspection associée](https://vercel.com/hafsi37-2386/creator-deckk/9WrsiRYB3tyKsKRcoYnFnMzpcCcd).
  Le JavaScript servi par `https://creator-deckk.vercel.app` contient la phrase
  du cercle complet. Preuve via GitHub et lecture HTTP publique ; API Vercel
  directe refusée 403, CLI absent, donc pas d'affirmation de lecture API READY.
- **APK :** [workflow automatique client 39096211340](https://github.com/GoodFight37/CreatorDeck/actions/runs/39096211340)
  en cours au dernier relevé sur `0fe66715`, laissé tourner sans surveillance.
  Ni fin de construction ni installation/mise à jour physique revendiquée.
  L'infrastructure APK et les secrets existants n'ont pas été modifiés.
- **Périmètre :** 3/5 absentes et dernière absente à chaque Live Drop/cadeau,
  préférence à poids égal, monde après complétion et phrase demandée. Sous
  trois absentes, répétitions nécessaires. Poids mondiaux, seuils de rareté
  affichée, bouton de recharge, missions et polish inchangés. Aucun appel
  Claude. Travail local antérieur conservé dans le stash et la copie indiqués
  plus bas ; aucune suppression ou nouveau worktree.
- Ce commit final ne change que les statuts documentaires ; le code audité
  reste `0fe66715`. Son SHA se retrouve par `git log -1 --format=%H --
  docs/agent-handoff.md`. Aucune autre action de développement de ce lot.
  Réservation libérée ; ne pas relancer les contrôles déjà verts sans changement.

# Historique — serveur appliqué et client en publication (18 octobre 2026)

**Client poussé :** `0fe66715ab07203ff00ce6eedf08653aa92aa995`, confirmé par
`git ls-remote` sur `main` et `etape-4-cercle-vrai`.
[CI main](https://github.com/GoodFight37/CreatorDeck/actions/runs/39095971227)
et [CI branche](https://github.com/GoodFight37/CreatorDeck/actions/runs/39095971355)
en cours. [Dry-run après application](https://github.com/GoodFight37/CreatorDeck/actions/runs/39095932681)
**success** : « La base est déjà à jour et vérifiée. Aucun SQL de migration
exécuté. » Le statut Vercel de ce SHA est encore en attente au dernier relevé.
Prochaine action : attendre la CI main et relever le statut de déploiement
`Production` de ce même SHA ; aucun autre changement de code nécessaire connu.

- Autorisation : règle et publication explicitement demandées par Malik ;
  périmètre limité au cercle vrai. Branche conservée `etape-4-cercle-vrai`.
- Code client `67297ba0bb9151fa17d3bfe0fcdb170eae8a62de`,
  [CI branche 39095301010](https://github.com/GoodFight37/CreatorDeck/actions/runs/39095301010)
  **6/6 verte** : 1 273 unitaires, 218 écrans, TypeScript, lint, catalogue,
  build et 956 contrôles SQL (289 pour 0056, dont 45 dernières absentes).
  RPC simulés : 16 réussis ; trois shards navigateur : 59/61/58 réussis,
  7/4/7 ignorés, qui ne sont pas présentés comme exécutés.
- Publication progressive : serveur seul `8c306e6077150466df32bb7dae461c0f3c4b974b`
  sur `main`, [CI main serveur 39095604456](https://github.com/GoodFight37/CreatorDeck/actions/runs/39095604456)
  **6/6 verte**. [Dry-run 39095605013](https://github.com/GoodFight37/CreatorDeck/actions/runs/39095605013)
  vert : cible, TLS et historique confirmés, seule 0056 en attente.
  [Application manuelle 39095857620](https://github.com/GoodFight37/CreatorDeck/actions/runs/39095857620)
  **success** : 0056 appliquée puis historique et objets attendus vérifiés.
  L'automatique 39095853978 a refusé la migration manuelle, sans l'appliquer,
  avant ce succès. Aucun historique réparé ni ancienne migration réécrite.
- La fusion `81b0508` conserve serveur et branche client ; son arbre est
  identique à celui de `67297ba0` testé. Le commit suivant ne fait qu'ajouter
  ce checkpoint, actualiser les statuts et corriger un commentaire de règle.
  Le client est prêt à pousser normalement vers main, puis relever sa CI et
  le déploiement Production du SHA exact. Le [contrôle SQL après application](https://github.com/GoodFight37/CreatorDeck/actions/runs/39095932681)
  vient d'être lancé en lecture seule, résultat à relever.
- Vercel Production du serveur : environnement GitHub `Production`, déploiement
  `7149673955`, statut `success`, SHA `8c306e60`. L'API Vercel directe est refusée
  403 et son CLI absent ; ces preuves viennent de GitHub. Aucun essai physique.
- 0054, 0055 et `pull-rates.json` identiques à main de départ. Pas de refonte
  de rareté affichée, missions, bouton de recharge ou polish. Aucun appel Claude.
  Travaux préexistants préservés dans le stash et la copie externe indiqués
  ci-dessous. Prochaine action : push du client, CI et statut Production.

# Historique — règle cercle vrai D-145 préparée (18 octobre 2026)

**Publication progressive en cours (18 octobre) :** la correction `67297ba0`
est validée **6/6** par [CI 39095301010](https://github.com/GoodFight37/CreatorDeck/actions/runs/39095301010).
Malik a demandé de terminer les opérations nécessaires, avec les autorisations
déjà données pour cette règle. Pour éviter que les nouveaux appels cadeau
arrivent avant 0056, le serveur seul (migration, tests SQL, contrats existants
et note joueur) a été poussé normalement sur `main` dans `8c306e6077150466df32bb7dae461c0f3c4b974b`.
L'ancien client reste présent jusqu'à application contrôlée de 0056.
[CI main serveur](https://github.com/GoodFight37/CreatorDeck/actions/runs/39095604456)
en cours ; [dry-run 0056](https://github.com/GoodFight37/CreatorDeck/actions/runs/39095605013)
terminé avec succès, logs à relire avant application. La fusion locale
`81b0508` conserve les deux historiques et son arbre est identique à celui de
`67297ba0` déjà validé. Ce suivi est local, en attente du checkpoint final.
Prochaine action : confirmer que seule 0056 est en attente, attendre la CI main
serveur verte puis déclencher le workflow existant avec `dry_run=false`,
`approve_manual=true`. Après application vérifiée, publier le client et
contrôler son SHA de Production. Aucun nouveau travail produit hors D-145.

Vercel : connecteur refusé 403 pour l'équipe attendue ; CLI absent. Vérifier
les déploiements et leur SHA via les statuts/environnements GitHub ; ne pas
présenter cela comme une lecture directe de l'état READY par l'API Vercel.

**Suivi du 18 octobre après reprise de l'accès :** code initial
`fb2cea37e92241ca1be202aeaccc1fed15ad1fe0` poussé et SHA distant confirmé.
[CI 39079182728](https://github.com/GoodFight37/CreatorDeck/actions/runs/39079182728)
terminée : SQL jetable et trois shards Playwright verts ; qualité et RPC simulés
rouges. **Preuve SQL acquise : 956 contrôles réussis au total, dont 289 pour
0056 ; 45 vérifient explicitement la dernière carte absente**, compteurs relus
dans les logs du job. Typecheck, build et
218 écrans réussis en CI ; 1 269 unitaires réussis, 4 échecs dans d'anciens
contrats du premier booster/SQL. RPC simulés : ancienne attente 1 appel cercle
au lieu des 5 réellement reçus, échec sur bureau et téléphone.

Correction de suivi : cercle invalide ignoré aussi par le nouveau miroir ;
tests du premier booster et du cadeau adaptés à la règle 3/5 ; contrats SQL
vérifiant les écritures de jetons plutôt qu'un commentaire et repérant le
dernier bloc de garantie. Contrôle local : 35/35 tests concernés et typecheck
réussis. Aucun changement SQL après la preuve ci-dessus. Nouvelle CI à relever
après publication du correctif. Relecture Codex demandée mais aucun retour
indépendant reçu ; requête interrompue, aucun appel Claude. Le refus temporaire
de l'approbation automatique (limite d'usage) n'est plus un blocage d'accès.
`main` reste `2fa29aaa` ; aucune application de 0056 en Production. Réservation
de correction limitée à cette branche, libérée à la livraison du checkpoint.

- Demande explicite et autorisée : **seulement** le tirage de trois absentes du
  cercle sur cinq dans chaque Live Drop/cadeau, dernière absente, préférence à
  poids égal et message du cercle complet. Ni rareté affichée, ni bouton de
  recharge, ni missions ou polish à refondre. Branche `etape-4-cercle-vrai`
  créée depuis `main` distant vérifié `2fa29aaa8a3587066867043269e8e818e1a53f93`.
- Travail local antérieur à l'abri : stash `Travail local preserve avant
  etape-4-cercle-vrai` et copie vérifiée de 38 fichiers dans
  `C:/Users/Administrator/AppData/Local/Temp/creatordeck-etape4-cvxbjnuq`.
  SVG et correctif Claude non inclus dans ce lot ; pièces jointes et artefacts
  restent présents. Aucun nouveau worktree, reset, force-push ou appel Claude.
- Implémentation : `0056_cercle_vrai.sql` repart de `open_pack` de 0055 et
  remplace les deux portes cadeau ; `circle-draw.ts` est appelé par le moteur.
  Collection actuelle lue côté serveur, dernière carte réservée, doublons
  nécessaires sous trois absentes ; complétion prioritaire même sous pity et
  Perfect. Les poids mondiaux, fichiers 0054/0055 et seuils de rareté affichée
  ne changent pas. Les appels cadeau transmettent le cercle à chaque ouverture.
- Preuves locales sur le diff basé sur `2fa29aaa` : nouveaux tests d'abord
  rouges (8/9 échecs), puis `npm test --` sur cercle, miroir SQL, moteur,
  API/store et progression : **274/274**. `npm run ecrans --
  src/ecrans-reset-tutoriel.test.tsx src/ecrans-binder-cercle.test.tsx` :
  **13/13** après correction d'une fixture du nouveau test. `npm run typecheck`
  réussi ; ESLint ciblé, garde-jargon et politique des migrations réussis.
  `npm run supabase:verify` : échec avant les tests, PostgreSQL refuse le compte
  Windows Administrateur. Cela ne constitue pas une preuve SQL réussie.
- Prochaine action : publier la branche, vérifier le job SQL Linux contenant
  les scénarios `0056` de `scripts/verify-circle-draw.mjs`, puis consigner son
  résultat exact. Migration **manuelle et non appliquée en Production** ; aucun
  changement de main, déploiement SQL réel ou essai téléphone revendiqué.
  Checkpoint en cours de commit ; SHA du document par `git log -1 --format=%H
  -- docs/agent-handoff.md`.
# Checkpoint — checkout Codex réconcilié (18 octobre 2026)

- Malik a autorisé la sauvegarde et la réconciliation après le constat de divergence. Branche conservée : `codex/collaboration`. Fusion normale `239dab5`, parents Codex `ce7caaaf11b1cb03635449b872bb5c331cfc4d15` et main `2fa29aaa8a3587066867043269e8e818e1a53f93` ; aucun reset, force-push, changement de branche ou nouveau worktree.
- Sauvegarde externe vérifiée de 38 fichiers dans `C:/Users/Administrator/AppData/Local/Temp/creatordeck-reprise-20261018-4hs9vh8n` (manifest SHA-256 et patch binaire). Stash `Sauvegarde reprise autorisee 18 octobre 2026` conservé après application ; ne pas le réappliquer sans examiner les fichiers déjà restaurés.
- Résolution : versions publiées de main pour les anciens conflits E2E, notes joueur et documents remplacés ; les deux historiques restent ancêtres du HEAD. Aucun nouveau comportement applicatif ajouté. Les ajouts du correctif Claude ont été réappliqués aux documents actuels ; SVG, scripts, pièces jointes et artefacts restent locaux, hors commit.
- Vérifications au code de fusion `239dab5` avec correctif local restauré : `rtk node --test --test-isolation=none scripts/delegate-claude.test.mjs` : 26/26, zéro ignoré, uniquement des appels factices. ESLint ciblé et contrôle du diff réussis ; 34 fichiers locaux vérifiés identiques octet par octet à la sauvegarde, les quatre autres documents conservent leurs ajouts avec le contenu publié. Aucun appel Claude réel, installation, build APK ou accès Supabase exécuté. Installation initiale et mise à jour téléphone toujours non vérifiées.
- Le code publié reste main `2fa29aaa` : CI 6/6 sur `bb6cf0a`, workflow APK final vert et statut GitHub Vercel success sur `2fa29aaa`, vérifiés pendant cette reprise. Aucun nouveau déploiement applicatif revendiqué. Étapes 4 et 5 non commencées ; prochain lot à cadrer selon la roadmap actuelle.
- Ce checkpoint est prévu pour publication sur `codex/collaboration` seulement ; confirmer son SHA distant après push. Les modifications préexistantes ne sont pas incluses dans ce commit documentaire. Réservation de synchronisation libérée à la fin des contrôles.

# Checkpoint — APK de test D-144 publiée (18 octobre 2026)

- Claude étant à court de quota, Codex a repris `maj-apk` (`132b16a`) sur le `main` courant dans `codex/maj-apk-integration`, sans réécrire la branche Claude ni toucher aux worktrees. Commit du code `15c1f1a0aa6f74d149af32b08d3a5a9dc03600c9`, avancé normalement dans `main`. Les anciens échecs E2E de `maj-apk` étaient déjà corrigés dans `main` ; [CI branche 6/6](https://github.com/GoodFight37/CreatorDeck/actions/runs/39076165277) et [CI main 6/6](https://github.com/GoodFight37/CreatorDeck/actions/runs/39076466368).
- Premier workflow APK : échec sur le paquet Android `tools` retiré. Correctif `bb6cf0a1882767a7f5870521c4b0730fd7995103` : `setup-android@v3` demande `platform-tools` ; [CI main 6/6 verte](https://github.com/GoodFight37/CreatorDeck/actions/runs/39076819637). Le deuxième workflow a compilé l'APK mais reçu 403 à la publication ; Malik a remplacé `APK_RELEASE_TOKEN` par un jeton ayant Contents en écriture sur le dépôt APK.
- [Workflow APK final](https://github.com/GoodFight37/CreatorDeck/actions/runs/39077656829) **vert** ; [release publique v871307](https://github.com/GoodFight37/creatordeck-apk/releases/tag/v871307) : `creatordeck.apk` (110 585 510 octets) et `latest.json`. Le manifeste publié pointe vers `bb6cf0a1882767a7f5870521c4b0730fd7995103`, code 871307, SHA-256 `c1d0a41032a834885e2077a0ee8f60204fa4e545710bdc876272abb447b9b58c`, identique au digest de l'asset GitHub. L'URL APK répond HTTP 200. Pas d'essai sur téléphone réel : installation initiale et geste de mise à jour restent non vérifiés.
- [Vercel Production](https://vercel.com/hafsi37-2386/creator-deckk/H16C9wmdJ5qE586BZbcBjmQdookM) **READY** sur `bb6cf0a` ; [workflow Supabase automatique](https://github.com/GoodFight37/CreatorDeck/actions/runs/39077082752) vert, aucune migration D-144. Dépôt public `GoodFight37/creatordeck-apk` avec README et trois secrets Actions configurés ; aucune valeur secrète documentée.
- Quand Malik voudra tester l'APK, il devra installer une dernière fois [v871307](https://github.com/GoodFight37/creatordeck-apk/releases/tag/v871307) sur son téléphone ; une future version permettra ensuite de vérifier le bouton « Mettre à jour ». Voir [le guide](mise-a-jour-apk.md). Aucun essai physique n'est revendiqué.
- `CreatorDeck-Codex` reste sur `codex/collaboration` (`ce7caaaf`), avec le SVG Mèmes et les autres changements locaux préexistants intacts. Ce checkpoint est publié séparément du code ; son SHA est donné par `git log -1 --format=%H -- docs/agent-handoff.md`.

# Checkpoint — « Mes chaînes » publié (18 octobre 2026)

- Malik a autorisé la fusion des étapes 1 à 3 et des décisions D-138 à D-143. La branche `etape-1-mes-chaines` a été avancée dans `main` sans commit de fusion : SHA du code `338b2d00b28a970567572e423f5e92fe6d62f404` ; origine de `main` avant l'avance rapide : `8b7ce93bee8cc8e2684ec61a75f227ba3d03c801`. `git ls-remote` a confirmé le SHA publié.
- [Vérification de la branche](https://github.com/GoodFight37/CreatorDeck/actions/runs/39073880384) et [Vérification de main](https://github.com/GoodFight37/CreatorDeck/actions/runs/39074226607) : **6/6 jobs verts chacune**, au même SHA (unitaires/écrans/statique/build, SQL sur Postgres jetable, trois shards Playwright et chemin cloud RPC simulés).
- [Dry-run Supabase avant application](https://github.com/GoodFight37/CreatorDeck/actions/runs/39074239863) : succès en lecture seule ; **0054 et 0055 étaient toutes deux absentes de l'historique**. 0054 a été relue avant approbation ; ses objets existants sont créés si besoin et ses fonctions remplacées. [Application manuelle approuvée](https://github.com/GoodFight37/CreatorDeck/actions/runs/39074582249) : succès ; le journal montre 0054 puis 0055 appliquées et « Historique et objets attendus vérifiés après application ». [Dry-run de contrôle](https://github.com/GoodFight37/CreatorDeck/actions/runs/39074638550) : succès, « La base est déjà à jour et vérifiée. Aucun SQL de migration exécuté. »
- Vercel Production : déploiement `dpl_3MFREEfeAqpfDkiXGBqLRCdH6tsq` **READY**, branche `main`, SHA `338b2d00b28a970567572e423f5e92fe6d62f404`, [inspection](https://vercel.com/hafsi37-2386/creator-deckk/3MFREEfeAqpfDkiXGBqLRCdH6tsq). Les contrôles navigateur sont simulés ; aucun nouvel essai sur téléphone réel n'est revendiqué.
- Étapes 4 et 5 : chacune sur sa propre branche, un seul écrivain, fusion après CI verte. Toute nouvelle règle de jeu, migration ou notification push est d'abord proposée à Malik. Toute redéfinition d'`open_pack()` doit repartir de 0055 ; prochaine migration 0056.
- Le checkout Codex reste sur `codex/collaboration` (`ce7caaaf`) avec ses modifications préexistantes, notamment le SVG Mèmes et le correctif local de délégation Claude, laissées intactes. Ce checkpoint est publié séparément du code ; son SHA se retrouve avec `git log -1 --format=%H -- docs/agent-handoff.md`. L'ancien checkpoint ci-dessous est conservé comme historique daté.

# Checkpoint — reprise autonome (17 octobre 2026)

## Chantier « Mes chaînes » — branche `etape-1-mes-chaines` — 17 octobre 2026 (soir, Claude)

- **Où :** branche `etape-1-mes-chaines` sur GitHub, **pas fusionnée dans
  `main`**, pas déployée sur Vercel. Les SHA du code : étape 2 `6c85336`, clé
  debug `8f2cb54`, étape 3 `d6f9d9e` ; ce checkpoint est dans le commit suivant
  (`git log -1 --format=%H -- docs/agent-handoff.md`).
- **Fait (demandes de Malik) :** étape 2 « qui est en direct dans mon cercle »
  (D-138) ; clé de signature debug partagée (D-139) ; étape 3 Binder au service
  du cercle (D-140) ; booster MEMES après 10 boosters pour un joueur avec cercle
  (D-141, seuil choisi par Claude à la demande de Malik) ; garantie du cercle
  choisie sous la forme « le Légendaire garanti vient du cercle » (D-142, **pas
  active** au premier passage ; écrite ensuite, voir plus bas).
- **Aucune migration, règle de tirage ou notification ajoutée.** Rien sur
  `main`, rien en Production.
- **Vérifié automatiquement (dernier passage) :** `npm test` 1236/1236,
  `npm run ecrans` 209/209, `node scripts/check-jargon.mjs`, `npm run typecheck`,
  `npx eslint . --ignore-pattern 'android/**/build/**' --ignore-pattern
  'android/app/src/main/assets/**'` (fichiers Android générés exclus, cf.
  AGENTS.md). Captures `docs/captures/etape-2/` et `etape-3/`. APK debug
  construit (`npm run android:sync` + `node scripts/android-gradle.mjs
  assembleDebug --max-workers=1`), contenu et signature contrôlés.
- **Non vérifié :** téléphone réel (lien Twitch, rendu au-dessus du dock,
  enregistrement de « Modifier mes chaînes », artisanat depuis la cible),
  Playwright (jamais lancé sur la branche), Production.
- **Environnement de la session :** clone neuf ; SDK Android installé dans
  `/opt/android-sdk` ; `.env.local` recréé localement (non commité) avec l'URL et
  la clé publique déjà servies par le site Vercel ; Maven Central renvoie parfois
  des 429 → relancer Gradle avec `--max-workers=1`.
- **Ajout du soir (feu vert de Malik) :** cercle en ligne (D-143, sans
  migration) et garantie du cercle (D-142) écrite dans
  `supabase/migrations/0055_garantie_cercle.sql` (**manuelle, non appliquée**).
  Le vérificateur SQL applique désormais 0054 et 0055 et contient les scénarios
  « 0055 : … » ; il doit tourner sous un utilisateur non root
  (`sudo -u <utilisateur> env TMPDIR=<dossier accessible> node
  scripts/verify-supabase-migrations.mjs`). Étapes 4 et 5 : feu vert requis.
- **Prochaine action précise (Malik) :** dans Supabase → SQL Editor, coller
  0055 (elle s'arrête seule si 0054 manque), **sans** l'inscrire dans
  l'historique des migrations (D-142), vérifier `garantie_cercle_installee =
  true`, puis installer le dernier APK et faire les essais ci-dessus.
- **Malik a décidé (17/10, 23 h 15) :** tout reste sur `etape-1-mes-chaines`
  jusqu'à l'étape 5 ; pas de fusion dans `main` avant.


## Correction du nom MEMES sur Drop — 17 octobre 2026

- Demande de Malik : retirer l’accent dans le nom du booster affiché sur
  l’accueil, notamment « Ouvrir le booster ».
- Correction ciblée : bouton d’ouverture, réserve et texte de réserve séparée
  utilisent `MEMES`, alignés sur le sélecteur. Aucun catalogue, contenu de carte,
  rituel ou donnée serveur touché. Le SVG Mèmes modifié et les pièces jointes
  restent préservés hors commit.
- D-137, note joueur, roadmap et problème connu mis à jour. Le commit
  `52c79c07602d82a863077c06555d77096263498f` est sur `main` et Vercel Production
  est READY sur ce SHA. Écrans Drop 17/17, notes 8/8 et typecheck passent en
  local. CI #531 a révélé une attente E2E obsolète sur l’ancien libellé ; test
  corrigé dans le commit de suivi, nouvelle CI à vérifier.

## Lot D-136 — rituel d’ouverture (17 octobre 2026)

- Demande : retirer le poids visuel concurrent de « Ouvrir sans déchirer » sans
  toucher au Drop d’accueil, au peel, à l’anti-skip ou à `PACK_TEAR_MS`.
- Correctif local : le lien de secours reste accessible et de taille tactile
  44 px, mais est déplacé au bas de la scène à 20 % d’opacité ; le survol et le
  focus clavier le rendent visible. TIRE / RELÂCHE reste la seule consigne
  centrale. Test navigateur adapté pour contrôler position, opacité, cible et
  fonctionnement. Note joueur, décision D-136, roadmap et guide Drop ajoutés.
- Fichiers : `src/app/booster-premium.css`, `e2e/pack-tear.spec.ts`,
  `src/lib/release-notes.ts`, `docs/decisions.md`, `docs/roadmap.md`,
  `docs/drop-boosters.md` et ce checkpoint. Aucun changement du SVG Mèmes ni
  des pièces jointes préexistantes.
- Vérifications au SHA de travail avant commit : `rtk npm run ecrans --
  src/ecrans.test.tsx src/ecrans-pack-pending.test.tsx` 14/14 ; `rtk npm test --
  src/lib/release-notes.test.ts` 8/8 ; `rtk npm run typecheck` réussi ;
  `rtk npm run lint -- e2e/pack-tear.spec.ts src/lib/release-notes.ts` réussi
  (le script lance ESLint sur le dépôt entier) ; `rtk node
  scripts/check-jargon.mjs` et `git diff --check` réussis. Build réussi avec
  `rtk npm run build -- --webpack` : 6 routes statiques, code 0 ; cloud guard
  avertit que les variables Supabase ne sont pas présentes localement.
- `rtk npm run e2e -- e2e/pack-tear.spec.ts -g "ouverture alternative reste
  discrète"` n’a exécuté aucun test : démarrage Next refusé par le verrou PID
  15724. Le build par défaut est resté en compilation sans progrès et a été
  interrompu ; le build Webpack ci-dessus a réussi. Ne pas arrêter le serveur
  bloqué ni supprimer son verrou sans accès pour vérifier son propriétaire.
- Base de travail : commit publié `a186cda01e713fc3d49f1d65a25bc9f1139088f4`,
  branche `codex/collaboration`. Code D-136 publié par avance rapide sur
  `main` dans [`8c116ab6`](https://github.com/GoodFight37/CreatorDeck/commit/8c116ab69972e2fd163d7e655453f87ec30fff0c) ;
  GitHub confirme le SHA et le statut Vercel associé est `success`. Aucune PR
  ouverte. SVG Mèmes et pièces jointes restent locaux, inchangés et hors commit.
- Vérification complète manuelle déclenchée sur `main`, SHA
  `e65a8554e1b100c0b1b24b771527da01b56e7677` : [run GitHub Actions 38986021051](https://github.com/GoodFight37/CreatorDeck/actions/runs/38986021051)
  terminé avec succès. Les six jobs sont verts : unitaires/écrans/statique/build,
  SQL sur PostgreSQL jetable, RPC simulés et trois shards Playwright. Aucune
  donnée de Production touchée. Le déclenchement manuel était requis car ce SHA
  documentaire est ignoré par le filtre `paths-ignore` des pushes. La tentative
  SQL locale échoue toujours sous le compte Windows administrateur ; ce n’est
  plus un blocage pour valider ce SHA grâce au runner Linux CI.
- Vérification `gh auth status` après la reconnexion annoncée par Malik : le
  terminal de cette session affiche encore le jeton GitHub `GoodFight37` comme
  invalide. Les pushes ordinaires de code déclenchent la CI automatiquement ;
  seuls les déclenchements manuels depuis le terminal restent indisponibles ici.

## Reprise vérifiée — 17 octobre 2026 (après D-135)

- Checkout confirmé : `C:\Users\Administrator\Desktop\CreatorDeck-Codex`,
  branche `codex/collaboration`, HEAD `db149a5d89eabcae04358f5fc99e08e3aaac1153`.
  GitHub donne le même dernier commit sur `main`, aucune PR ouverte ; le statut
  Vercel associé à ce SHA est `success`. `git ls-remote` reste inutilisable
  dans cette session (erreur d'accès Git/MSYS) ; la comparaison distante vient
  de l'API GitHub. Le refus `dubious ownership` de Git a été contourné par
  `-c safe.directory=...` pour les seules lectures, sans modifier la config
  globale.
- Modifications locales à préserver, non indexées :
  `public/packs/memes-opening.svg` et `.codex-remote-attachments/`. Aucun autre
  fichier local modifié.
- D-135 est publié dans `f5f27f904cb9b26a96b386a3f4953ab26c7863f7`, puis la
  preuve de publication a été consignée dans `db149a5d89eabcae04358f5fc99e08e3aaac1153`.
  Vérification isolée Edge du contour forcé réussie précédemment. Ce 17 octobre,
  `rtk npm run e2e -- e2e/booster-selector.spec.ts -g "couleurs forcées"`
  n'a exécuté aucun test : Next détecte le verrou `.next/dev/lock` associé au
  PID 15724 et refuse de démarrer. Le port 3000 n'a aucun écouteur ; le journal
  `.next/dev/logs/next-development.log` montre des erreurs répétées de
  compilation CSS/Turbopack. L'interrogation Windows du PID échoue avec accès
  refusé et `process.kill(pid, 0)` retourne `EPERM` : ne pas tuer le processus,
  ni effacer le verrou sans pouvoir établir qu'il est arrêté. La suite E2E
  intégrée demeure non vérifiée localement ; contrôles écran 17/17, typecheck,
  garde-jargon et diff-check avaient réussi avant publication. Actions n'est
  pas interrogeable pour ce push via le connecteur actuel.
- Pas de défaut logiciel nouveau démontré ni de correction code restante
  réalisable dans cette reprise. Actions dépendant du joueur : vérifier le Drop
  et le rituel sur son téléphone ; les 542 portraits restent en attente de
  sélection manuelle ; le code booster privé requiert son adresse de compte
  et une intervention Supabase ; les parcours sociaux réels requièrent des
  comptes/ressources de test et son accord avant écriture de données.
- Pour lever le seul blocage technique restant, une session Windows autorisée
  doit fermer proprement le `next dev` bloqué du checkout (PID 15724), puis
  relancer le test E2E ciblé ci-dessus. Ne pas toucher au SVG Mèmes.

- Base au début de cette reprise : `C:\Users\Administrator\Desktop\CreatorDeck-Codex`, branche `codex/collaboration`, HEAD `f30c637bab0816bb9f9cee9e5ffacf0b3b7ee9ba`. GitHub confirme `main` au même SHA ; aucune PR ouverte. `git ls-remote` échoue par DNS, donc comparaison de branche faite via l’API GitHub. Vercel status `success` sur le SHA exact. Les Actions complètes ne sont pas exposées par le connecteur disponible.
- Modifications locales préexistantes seules : `public/packs/memes-opening.svg` modifié et `.codex-remote-attachments/` non suivi. Rien d’indexé ; ne pas les ajouter.
- D-134 et ses notes sont publiés dans `cc7a61d2` : revue Claude ciblée sur l’accessibilité du sélecteur, contraste actif corrigé de 4,17:1 à 5,06:1 calculé ; `npm run ecrans -- drop-binder` 17/17, typecheck, garde-jargon et diff-check réussis. Le checkpoint/statuts de publication sont publiés dans `bacc6808`, Vercel `success`.
- Suite autonome D-135 : le repère de la pill active utilise les couleurs système en mode `forced-colors`. Vérification isolée Edge : `outline solid 2px`, décalage `2px`, couleurs Highlight/HighlightText. `npm run ecrans -- drop-binder` 17/17, typecheck, garde-jargon et `git diff --check` passent. Le scénario Playwright ciblé a été ajouté mais la suite n’a exécuté aucun test : son serveur Next n’a pas démarré, un `next dev` PID 15724 occupant le port 3000 sans répondre. L’Edge système fonctionne ; Chromium Playwright intégré absent. Aucun processus arrêté.
- Fichiers D-135 : `src/components/booster-carousel.css`, `e2e/booster-selector.spec.ts`, `src/lib/release-notes.ts`, `docs/decisions.md`, `docs/known-issues.md`, `docs/roadmap.md` et ce checkpoint. Commit `f5f27f904cb9b26a96b386a3f4953ab26c7863f7` publié sur `main` ; GitHub confirme le SHA et Vercel `success`. Le scénario E2E ajouté n’a pas pu démarrer localement à cause du serveur préexistant ; la CI Actions du commit n’est pas exposée par le connecteur GitHub courant.
- Ensuite, les dépendances roadmap restent : jugement physique tactile/visuel/audio sur le téléphone de Malik ; portraits en standby, choix manuels ; code booster privé nécessitant l’adresse du compte et SQL Editor ; scénarios sociaux réels nécessitant comptes/ressources de test ; idées de backlog sans contenu/droits/critères. Ne pas inventer de chantier produit, relancer l’audio mise de côté, ni toucher à Supabase/données. Le SVG Mèmes reste préservé.

# Historique — Drop allégé et rituel prioritaire (16 octobre 2026)

- Demande de Malik : sur `main`, réduire le chrome du Drop, ne laisser qu’un
  mécanisme de sélection et rendre « Ouvrir sans déchirer » secondaire, sans
  toucher aux systèmes interdits. Checkout utilisé :
  `C:\Users\Administrator\Desktop\CreatorDeck-Codex`, branche locale
  `codex/collaboration`, base locale auditée `c15679b518bf1f344264ce97157e927adade3e28`.
  Les commits `b15a2e20dc90b4f27be04dd17535fcb6ab206075` (lot),
  `3c9a06f01cc57cb0d209cee483d778ac75525796` (garde anti-déplacement),
  `0cd6ce5ee258c1d4c4be34a692f62195b5570330` (checkpoint) et
  `61734930dcca445b5c292c2c3809961010a5f126` (assertion du voisin hors écran)
  et `3fa0e5c5578d4aec20a50089eed0e76be8e962be` (sélecteur RPC Mèmes)
  ont été poussés normalement vers `main`.
- Diff préexistant unique confirmé avant édition :
  `public/packs/memes-opening.svg`. Il a été préservé et n’est pas staged.
- Claude a exécuté une revue ciblée en lecture seule du code et des tests, via
  `scripts/delegate-claude.mjs`. Il a confirmé les pills, swipe, clic voisin et
  flèches comme quatre voies distinctes, proposé de rendre le voisin non
  interactif et recommandé de garder la cible tactile 44 px du lien alternatif.
  Il a listé comme invariants `PACK_TEAR_MS` (1 200 ms), `done.current`,
  `extractionCompleted`, seuil de peel et ordre de révélation. Aucune édition ni
  test Claude ; le transfert a réussi au SHA `c15679b5` après un premier appel
  arrêté par la limite de tours de Claude.
- Modifications locales du lot : D-132 choisit les pills comme seule sélection;
  le voisin est décoratif et atténué; « Plus d’infos » et le lien alternatif
  sont moins proéminents. Le code d’ouverture/anti-skip et `PACK_TEAR_MS` ne sont
  pas modifiés. Inclinaison actif `-7deg` et tranches 3D ne sont pas modifiées.
  Ajout d’une note joueur actualisée, d’une entrée D-132 et tests E2E adaptés.
- Suivi de capture envoyé ensuite par Malik : les titres longs des cartes
  Mèmes sont coupés à une ligne pendant la révélation. Cause identifiée dans la
  règle globale `.card-nameplate h3` ; correction locale limitée à
  `src/components/meme-reveal.css`, avec retour à la ligne et corps ajusté.
  Ajout de l’assertion `e2e/memes.spec.ts`, de la note joueur D-133 et des
  documents `known-issues.md`, roadmap et décision. Tests d’écran Mèmes 8/8 et
  typecheck réussis. Playwright téléphone tenté mais bloqué : un `next dev`
  occupe le port 3000 et `fetch http://localhost:3000` échoue ; le lancement
  Playwright a été retenté avec droits étendus sans succès ; aucun processus
  n’a été arrêté. Après le premier push, la CI a révélé un mauvais sélecteur
  pour tester `aria-hidden` et le retrait accidentel du garde anti-clic après
  déplacement. `3c9a06f` cible le bon élément et restaure le garde. Les shards
  1/3 et 2/3 ont ensuite révélé une ancienne assertion imposant que le voisin
  reste dans le viewport, contrairement à la demande ; `6173493` la retire et
  conserve l’absence de scroll horizontal. La CI a ensuite signalé un ancien
  clic sur le voisin dans un scénario RPC ; `3fa0e5c` sélectionne Mèmes avec sa
  pill et passe l’ensemble de la CI.
- Fichiers du lot Drop/rituel (10) : `src/components/booster-carousel.tsx`,
  `src/components/booster-carousel.css`, `src/app/drop-binder.css`,
  `src/app/booster-premium.css`, `src/lib/release-notes.ts`,
  `e2e/booster-selector.spec.ts`, `e2e/pack-tear.spec.ts`,
  `docs/decisions.md`, `docs/drop-boosters.md`, `docs/roadmap.md`.
- Fichiers ajoutés pour la capture : `src/components/meme-reveal.css`,
  `e2e/memes.spec.ts`, `docs/known-issues.md`, avec note complémentaire dans
  `src/lib/release-notes.ts`, `docs/decisions.md` et `docs/roadmap.md`.
- Vérifications sur le code local : `npm run typecheck` réussi ;
  `npm run ecrans -- drop-binder drop-craft-priorites` réussi, 20/20 tests ;
  `npm run lint -- src/components/booster-carousel.tsx src/lib/release-notes.ts`
  lint ciblé terminé sans erreur ; `git diff --check` réussi. E2E ciblé non exécuté :
  le serveur Playwright n’a pas démarré car un `next dev` existant du checkout
  occupe le port 3000. Un test de sélection de filtres erroné (`ecrans -- e2e`)
  a été tenté, sans test trouvé ; non compté.
- Après reprise autorisée par Malik, le verrou d’index s’est libéré sans
  intervention et aucun processus Git ne le détient. GitHub API revérifiée :
  `main` reste à
  `3fa0e5c5578d4aec20a50089eed0e76be8e962be`. Aucune PR n’était ouverte avant
  publication. `git ls-remote` reste en panne DNS.
- CI `38964331571` pour `b15a2e2` : SQL jetable et unitaires/écrans/statique/build
  verts ; shards Playwright en échec sur les défauts corrigés. Le job RPC
  simulé reste en cours au dernier contrôle. Pour `3c9a06f`, run
  `38965129534` : SQL et unitaires/build verts, shard 3/3 vert ; shards 1/3 et
  2/3 ont échoué sur l’ancienne assertion du voisin. Nouveau run
  `38965828232` sur `6173493` : SQL jetable, unitaires/build et trois shards
  Playwright réussis ; seul un ancien scénario RPC Mèmes cliquait le voisin.
  Correction publiée dans `3fa0e5c`. Son run `38966936387` est vert 6/6 :
  unitaires/écrans/statique/build, SQL jetable, RPC simulés et trois shards
  Playwright. Le contrôle GitHub Vercel du SHA `3fa0e5c` est `success`.
  L’interface du connecteur Vercel renvoie 403 pour le scope `hafsi37-2386` ;
  le statut GitHub `Vercel` associe cependant la réussite au SHA. Aucun CLI
  Vercel local.
- Tests navigateur locaux non exécutés : le `next dev` préexistant occupe le
  port 3000 mais ne répond pas aux requêtes ; aucune instance n’a été arrêtée.
  Les trois shards CI du SHA `3fa0e5c` couvrent Drop, ouverture et Mèmes sur
  bureau et téléphone. La validation tactile physique par Malik reste
  distincte et n’a pas été effectuée.
  résultat au doigt sur son téléphone (320/390 px) ; aucune validation physique
  ne peut être prétendue.

# Checkpoint — retrait Mèmes vérifié en production (16 octobre 2026)

- Demande de Malik : retirer du classeur « Carte supprimée » ; portraits de
  candidats en attente d’un choix manuel ; expliquer le parcours social réel.
- Commits de code `f0f77fbf004d133670c34c00b9eef25a083ac075` et correctif
  `83d212c8e68130a31bbc99b6f3c0f38d73db0f01` publiés normalement sur `main`.
  Les README et guides ont été actualisés dans `9986694c529703eff6ca16719f286b0147bdbb7f`.
  Les compteurs E2E et l'application de `0053` dans le vérificateur SQL ont été
  corrigés et publiés dans `83d212c8e68130a31bbc99b6f3c0f38d73db0f01`.
  Le SVG préexistant `public/packs/memes-opening.svg` est intact, non indexé et
  absent du commit. GitHub confirme `main` à ce SHA.
- Retrait client de `juventus-rose`, filtre protégé dans le script de synchro,
  test de régression, note joueur, documentation et migration additive `0053`.
  La migration supprime la fiche serveur seulement si aucune collection ou aucun
  tirage historique ne la référence ; sinon elle échoue sans supprimer. `0052`
  reste inchangée.
- Contrôles locaux : catalogue 1/1 ; écrans Mèmes 8/8 ; typecheck, syntaxe du
  script, `git diff --check` et build Webpack réussis. Build Turbopack interrompu
  après plus de 90 s sans sortie. `supabase:verify` bloqué : PostgreSQL refuse
  le compte Windows administrateur ; aucune commande directe sur la production.
- La CI `Vérification` est en cours, run
  [38959520465](https://github.com/GoodFight37/CreatorDeck/actions/runs/38959520465)
  (événement `push`, SHA exact `f0f77fbf`). Unitaire/statique/build réussi,
  Playwright shard 2/3 réussi ; shard 1/3 échoue car il attend encore `0 / 2151` ;
  Postgres jetable échoue parce que `scripts/verify-supabase-migrations.mjs`
  n'appliquait pas `0053`, donc voyait encore 2 151 fiches. Shard 3/3 et chemin
  RPC simulé étaient encore en cours dans ce run initial. Le run correctif
  `38960335566` est vert (6/6 jobs : unitaires/statique/build, SQL, cloud RPC
  simulés et trois shards E2E). Le workflow Supabase
  [`38960850198`](https://github.com/GoodFight37/CreatorDeck/actions/runs/38960850198)
  a appliqué `0053`, puis vérifié l’historique et les objets attendus.
  Vercel Production est `READY` sur le SHA exact, déploiement
  [`dpl_8sz9Jj7FNHfS6RKe6ijFpQtPdaLs`](https://vercel.com/hafsi37-2386/creator-deckk/8sz9Jj7FNHfS6RKe6ijFpQtPdaLs), URL
  [`creator-deckk-2736a0mlu-hafsi37-2386.vercel.app`](https://creator-deckk-2736a0mlu-hafsi37-2386.vercel.app/).
  Vercel Production est `READY` sur le SHA `83d212c8`, déploiement
  [`dpl_GsawYnuSouaskiH2MJaFdCizCj5h`](https://vercel.com/hafsi37-2386/creator-deckk/GsawYnuSouaskiH2MJaFdCizCj5h), URL
  [`creator-deckk-kjjc3zeaz-hafsi37-2386.vercel.app`](https://creator-deckk-kjjc3zeaz-hafsi37-2386.vercel.app/).
- Parcours sociaux réels : amitié et échange entre deux comptes invités déjà
  vérifiés le 15 octobre. Restent l’achat/dépôt à l’Hôtel des ventes et la prise
  d’une carte Last Pack éligible. Ces opérations écrivent en production et
  exigent des comptes de test et ressources ; elles n’ont pas été exécutées.
- Prochaine action : publier le checkpoint documentaire final ; ne pas inclure
  le SVG. La validation sur téléphone et les scénarios sociaux avec comptes de
  test restent indépendants de ce retrait.

# Checkpoint — correctif des sélecteurs et état des prochains lots (16 octobre 2026)

- `main` publié et confirmé par l'API GitHub au SHA
  `7922f6e80b22c13243ce0c0cec19516ae761800e` (push normal depuis `codex/collaboration`).
  Commit : [Corrige les sélecteurs E2E du sachet dans le carrousel](https://github.com/GoodFight37/CreatorDeck/commit/7922f6e80b22c13243ce0c0cec19516ae761800e).
- Le commit met à jour `e2e/pack-tear.spec.ts` pour viser le sachet actif parmi
  les deux paquets montés par le carrousel ; la cause et la preuve sont notées
  dans `docs/known-issues.md`. Les assertions de révélation ne sont pas retirées.
- Claude a examiné la roadmap et D-076 en lecture seule sur le SHA publié. Il
  confirme que D-125 a déjà établi Mèmes FR comme univers distinct avec son
  classeur et sa progression ; `/catalogue-demo` reste un prototype fictif.
  Aucun changement de gameplay n'est recommandé sans besoin démontré de réunir
  ces deux classeurs. Les compteurs existent déjà séparément dans chaque écran.
- `docs/roadmap.md` est actualisée : retrait de l'état périmé D-121 et
  clarification de `/catalogue-demo`. Les actions restantes sont principalement
  des validations physiques, des identifiants/données de test ou des idées sans
  critères/droits ; elles ne peuvent pas être honnêtement marquées terminées
  depuis cette session.
- CI GitHub run `38945759473` (commit exact `7922f6e…`) terminé `success` :
  qualité/unitaires/écrans/statique/build, SQL jetable, cloud RPC simulés et les
  trois shards Playwright sont verts. [Run GitHub](https://github.com/GoodFight37/CreatorDeck/actions/runs/38945759473).
- Vercel Production est `READY` sur ce même SHA :
  [`creator-deckk-f20fkg450-hafsi37-2386.vercel.app`](https://creator-deckk-f20fkg450-hafsi37-2386.vercel.app/),
  déploiement `dpl_6RcGmTKMJUzQXtoLe8TyZQJY8box`.
- Le diff Edge local ciblé a passé quatre cas sur six ; les deux cas CSS-only
  sont arrêtés sur les snapshots Linux absents sous Windows après les assertions
  du sachet actif. Aucun snapshot n'a été régénéré. `git diff --check` réussi.
- État des worktrees vérifié : le checkout `CreatorDeck` est sur `main` au SHA
  antérieur `cb3e18e0` et conserve ses dossiers non suivis
  `.codex-remote-attachments/` et `.playwright-mcp/`. Les worktrees Codex et
  Claude sont sur `7922f6e`; Codex est le seul écrivain. Le brouillon modifié
  `public/packs/memes-opening.svg` reste exclu de tout commit.
# Checkpoint — reprise de la CI D-130 (16 octobre 2026)

- `origin/main` vérifié au SHA `fa8124d27604c3fcfaf7266eeea627523e663072` ;
  Vercel Production `READY` sur ce même SHA (`dpl_759bEHQhZingHQMXS3Lx3YaR7FYY`).
- CI `38943531594` : jobs unitaires/écrans/statique/build, cloud simulé, SQL et
  shard Playwright 1/3 réussis ; shards 2/3 et 3/3 échouent sur trois scénarios
  chacun. Cause vérifiée dans les logs : les anciens sélecteurs de `pack-tear`
  supposent un seul sachet alors que le carrousel conserve le voisin. Un slot actif
  cible maintenant les assertions ; les vérifications de révélation sont gardées.
- Claude a relu le cas en lecture seule sur `f4362c3a` (même code publié à
  `fa8124d2`) et confirmé les sélecteurs concernés, y compris les assertions qui
  auraient échoué ensuite. Réponse dans `CreatorDeck-Retour-Claude.md`.
- Vérification Edge locale : `e2e/pack-tear.spec.ts`, trois scénarios sur bureau
  et téléphone : **4/6 passent**. Les deux cas restants s'arrêtent uniquement sur
  snapshots de référence Linux absents sous Windows ; leurs assertions de slot
  actif passent avant ce point. Les snapshots n'ont pas été régénérés. La CI Linux
  après publication est la vérification finale requise.
- Configuration Edge temporaire retirée. Le seul autre changement de worktree
  est le brouillon préexistant `public/packs/memes-opening.svg`, toujours exclu.
- Prochaine action : commit ciblé des tests et cette entrée de problème, push
  normal sur `main`, puis relever la CI et Vercel du nouveau SHA.

# Checkpoint — focus visuel du carrousel Drop (16 octobre 2026)

- Base de travail : branche codex/collaboration à cb3e18e0db7a260b49b56e278fb2d2b5fff2f859, identique à main avant ce lot.
- Malik demande un Drop plus léger, centré sur le booster sélectionné. Pas de nouveau contenu Mèmes ni de chantier social.
- Modifications D-130 : sachet sélectionné légèrement agrandi, boutons Live Drop/MEMES plus compacts, consigne redondante supprimée. Aucune modification des tranches 3D, du peel, de la révélation, du son, des taux ou réserves.
- Le worktree contenait déjà M public/packs/memes-opening.svg avant ce lot. Le changement est préservé mais exclu du commit D-130.
- Vérification : Playwright Edge, configuration temporaire retirée après usage : scénario du voisin/focus/CTA 1/1, tailles 320, 390 et 1024 px. git diff --check réussi. Ce contrôle navigateur ne remplace pas l’essai visuel et tactile sur le téléphone.
- L’appel au script Claude a été refusé par sa vérification de propreté à cause du changement MEMES préexistant ; aucun message n’a été envoyé et aucune réponse Claude n’est revendiquée. Pas de revue indépendante pour ce petit changement d’interface.
- Suite : relire le diff indexé, commit atomique des seuls fichiers D-130, puis publication ordinaire et vérification du SHA distant si l’accès GitHub fonctionne.

# Checkpoint — correction du swipe du carrousel (16 octobre 2026)

- Départ : `codex/collaboration` et `origin/main` vérifiés à
  `2b2eea7b878e58a4eaa0c2145fb88526af844c5b`; arbre propre avant correction.
- Retour de Malik depuis la Production : le sachet suivait légèrement le doigt
  puis revenait sans changer d’univers. Reproduction par toucher Playwright :
  `lostpointercapture` d’un bouton enfant remontait au stage et annulait le
  geste avant son relâchement. Le seuil tactile de 45 px rendait aussi les
  glissements courts inefficaces.
- Correction : le stage ignore les pertes de capture de ses descendants; seuil
  tactile plus court et adapté à la largeur; un glissement horizontal sélectionne
  l’autre univers dans les deux directions. Le paquet et les contrôles montrent
  désormais `MEMES` sans accent.
- Vérifications : `npm run e2e -- e2e/booster-selector.spec.ts --project=téléphone`
  via Edge installé (configuration temporaire, retirée après run) : **4 passés,
  2 ignorés**; `npm run typecheck` réussi; ESLint ciblé réussi; `git diff --check`
  réussi. Chromium Playwright attendu absent; aucun outil installé.
- Aucun tirage ni appel Supabase dans le scénario tactile. Malik doit confirmer
  le ressenti et l’apparence sur son vrai téléphone après publication.

# Checkpoint — échange Codex ↔ Claude vérifié (16 octobre 2026)

- Demande : débloquer l’échange Codex ↔ Claude sans exposer ni écraser un
  changement local non publié.
- Le refus précédent venait du garde-fou de `scripts/delegate-claude.mjs` : il
  exigeait à tort un worktree Codex parfaitement propre. Le brouillon concerné
  est `public/packs/memes-opening.svg`; il reste intact et hors de la revue.
- Correctif testé : `scripts/delegate-claude.mjs` ne bloque plus sur les
  modifications locales Codex; il cible `HEAD` commité et les signale comme hors
  périmètre. Le worktree Claude reste propre et n'avance qu'en fast-forward.
- Test réel réussi, exit 0 : Claude a lu le commit local
  `29379377550c5b4a1d52f7280b83b7ed269328c7`, puis sa réponse a été récupérée
  dans `CreatorDeck-Retour-Claude.md`. Aucun test du dépôt lancé par Claude.
- Retour Claude : les garde-fous de branche, propreté Claude, fast-forward,
  lecture seule, timeout et sortie bornée sont présents. Il relève que le résumé
  des fichiers du commit manquait et que l'exclusion du brouillon est une consigne,
  pas une interdiction OS de lire tout chemin absolu. Le script ajoute désormais
  la liste des fichiers commis à la mission. Le brouillon MEMES n'a pas été lu,
  modifié ou inclus dans les fichiers transmis.
- Commit de coordination local `2937937`; aucune publication GitHub/Vercel pour
  cette configuration. Le correctif du résumé et cette mise à jour de passation
  restent à committer localement. Aucun code applicatif n’est dans ce lot.

# Checkpoint — délégation locale Codex → Claude (16 octobre 2026)

- Demande : permettre à Codex de consulter Claude Code localement pour une revue
  ciblée, sans copier-coller manuel ni deuxième système de passation.
- Base locale avant travail : `5ce85c723ea6c9d04f694b18721acf460ba9a1c8`
  sur `main`, `codex/collaboration` et `claude/review`; GitHub `main` était
  `23e69ee188edc6fd3f781dd06102330965960ec7` (vérifié par `ls-remote`).
- `scripts/delegate-claude.mjs` dans le worktree Codex : contrôle branches et
  propreté Claude, avance rapide sûre si nécessaire, appel `claude -p` en mode
  plan avec `Read,Glob,Grep`, délai de 120 s, sortie bornée et statut vérifié.
  Demande et réponse sont ajoutées aux fichiers locaux existants
  `CreatorDeck-Codex-vers-Claude.md` et `CreatorDeck-Retour-Claude.md`.
- Test réel : question sur Playwright et RPC Supabase simulées; Claude a répondu
  via le script, sortie 0, résultat lu dans le fichier de retour. Aucun test du
  dépôt lancé et aucun fichier applicatif modifié. Le ressenti tactile réel
  reste hors de portée de cette vérification.
- Usage : `node scripts/delegate-claude.mjs "question ciblée"`; Codex décide
  quand la revue est utile, lit la réponse et garde la responsabilité des
  corrections.
- Publication après accord explicite de Malik : commit `50c0f322` poussé sur
  GitHub `main`, SHA distant vérifié `50c0f32202b2ae47b6e183b30d5754d3f3430e71`.
  Vercel Production `dpl_8SCZQ1LTJo3aHHjLez8dxoC2Ckz` est `READY` sur le même
  SHA (`creator-deckk-b6mkvxhlg-hafsi37-2386.vercel.app`). L'accès de contrôle
  à la page depuis cette session a été refusé en 403; Malik peut vérifier
  l'alias Vercel habituel.

# Coordination actuelle et checkpoint D-129 — 16 octobre 2026

**Coordination actuelle — 16 octobre 2026.** Codex est le développeur principal et seul écrivain ordinaire dans `C:/Users/Administrator/Desktop/CreatorDeck-Codex` (`codex/collaboration`). Le checkout d’origine `C:/Users/Administrator/Desktop/CreatorDeck` reste sur `main`; `C:/Users/Administrator/Desktop/CreatorDeck-Claude` sert aux revues ciblées/audits complexes sur `claude/review`. Préserver ces worktrees et ne synchroniser que par avance rapide après contrôle de propreté et d’ascendance. Les lots ordinaires peuvent être testés de façon ciblée, committés et poussés normalement sur `main` sans demander un accord à chaque fois; contrôler ensuite que le SHA Vercel Production correspond à `main`. Obtenir l’accord de Malik avant tout changement sensible (Supabase/données, migrations, authentification, sécurité, secrets, suppression de données ou action irréversible). La configuration de délégation a été publiée sur `main` au SHA `50c0f32202b2ae47b6e183b30d5754d3f3430e71` après l’accord explicite du 16 octobre.

Synchronisation locale : commit de consignes `5698310d08b68d866cbc2cfbfda5d07b5bde8055` présent dans l’historique des trois branches locales; les trois ont été alignées par avance rapide. Les worktrees Codex et Claude sont propres; le checkout d’origine conserve les dossiers non suivis `.codex-remote-attachments/` et `.playwright-mcp/`. `origin/main` reste au code publié `23e69ee188edc6fd3f781dd06102330965960ec7`; la configuration locale n’est pas poussée. Revérifier les HEAD au prochain démarrage.

État livré : D-129 sur le SHA publié `23e69ee188edc6fd3f781dd06102330965960ec7`; le code a été relu par Claude au SHA `921d71752d8e824eafc9afecc09a9c9a2039b426`; Vercel Production est `READY` pour `23e69ee`, alias `https://creator-deckk.vercel.app/`. Retour : `C:/Users/Administrator/Desktop/CreatorDeck-Retour-Claude-D129.md`. Le correctif M1 passe 8/8 tests ciblés. Prochaine étape produit : Malik essaie le parcours sur son téléphone et rapporte les défauts concrets. Le dossier portraits de 9,6 Go a été déplacé par Malik; ne pas le rechercher.

Demande : carrousel Live Drop/Mèmes sur Drop, booster voisin visible, swipe horizontal et boutons, premier appui = présentation annulable avec Retour ; consommation uniquement au geste validé ou alternative clavier. Réutiliser les ouvertures actuelles, sans changement de taux, SQL, ressources ou collections. Le Binder unifié n’est pas engagé.

Réalisé : carrousel, réserves par univers, préparation Live annulable, contrôleur Mèmes commun au Drop et à /memes, déclenchement du tirage reporté au geste. Fichiers nouveaux : booster-carousel.tsx/.css, meme-booster-opening.tsx, use-meme-booster.ts. Fichiers existants raccordés : drop-view, creator-deck-app, pack-tear, meme-deck. Note joueur et décision D-129. Dépendances installées dans le nouveau worktree par npm ci ; lockfile inchangé.

Contrôles locaux du lot : écrans 188/188 puis 13/13 ciblés; notes unitaires 8/8; cloud simulé téléphone 8 réussis/1 ignoré; parcours bureau+téléphone 8/8; contrôles Live et Drop 9/9; TypeScript, lint, jargon et build statique réussis. Après revue Claude, `npm run ecrans -- src/ecrans-meme-booster.test.tsx --maxWorkers=2` passe 8/8 au SHA `921d71752d8e824eafc9afecc09a9c9a2039b426`; M1 est corrigé sans régression. D-129 précise maintenant la transition musicale commune à Drop et /memes. Rapport, captures et limites : [Drop multi-boosters](drop-boosters.md). Pas de preuve production ni de validation tactile physique.

Contraintes de session : accès Git/réseau et aux worktrees frères via exécution autorisée hors sandbox ; pas de modification globale safe.directory, RTK ou Claude. Malik souhaite les lots prêts poussés normalement sur `main` pour les essayer directement. Pas de push forcé, réécriture d’historique ni merge de PR.

Prochaine action : poursuivre les demandes de Malik dans le worktree Codex. Pour une revue Claude, décrire dans le fichier de passation existant le SHA exact, les questions ciblées et le chemin de retour; ne pas lancer de revue de routine.

---

# Reprise rapide — 16 octobre 2026

## Checkpoint D-128 — sachet Live Drop assoupli (publié et vérifié)

- Base `main` locale et GitHub vérifiée à `9659f95e82c61692a462dca9f2621519587ff27d`, arbre propre avant intervention. Chantier séparé du rendu physique du sachet principal. Aucun changement de peel, révélation, taille du pack, CTA, économie ou cartes.
- `live-opening.svg` et son masque foil ont une silhouette et des soudures courbes, des plis et un éclairage intégrés à l'impression existante. Face CSS sans cadre rectangulaire, flancs foil amincis à 9 px, reflet atténué et ombre de contact alignée. [Captures avant/après 390 et 320 px](sachet-live-d128.md), snapshots scellé/déchiré téléphone et bureau, décision D-128 et note joueur.
- Vérifications locales : TypeScript, ESLint, build, garde de jargon et `git diff --check` réussis ; écrans ciblés 45/45, note joueur 3/3 et unitaires de notes 8/8 ; Playwright téléphone Drop/ouverture 39 réussis, 2 ignorés (scénario obsolète et cloud absent) ; snapshots d'ouverture téléphone/bureau 2/2 après le dernier ajustement. Les captures ont été inspectées ; elles ne mesurent pas le rendu ni le geste sur téléphone physique. Pas de SQL ni de changement de taux.
- Code, captures et documentation publiés sur `main` par `077a67ce274dd3e6d230c1f97a65ceacc3364e33`, SHA distant confirmé. [CI Vérification 38921513188](https://github.com/GoodFight37/CreatorDeck/actions/runs/38921513188) terminée verte 6/6, dont les trois lots Playwright et le cloud simulé. Vercel Production `dpl_GBPSeKvE43heuDAX4LKHsjHMeZsC` est `READY` sur ce SHA ; les deux SVG du sachet répondent HTTP 200 sur `creator-deckk.vercel.app` et leurs empreintes SHA-256 correspondent aux fichiers publiés. Ce contrôle de disponibilité ne prouve pas le rendu ou le geste sur un téléphone réel.

## Checkpoint D-127 — matière des cartes Mèmes (publié et vérifié)

- Base `main` locale/GitHub vérifiée à `51bcddec6d458c4e071c5f7342c24605ddf985a9`, arbre propre. Malik demande un audit différentiel du paquet MyMemeCards, puis une amélioration visuelle originale des cartes Mèmes sans nouvel import, sans changement Twitch ni du booster physique. Le paquet réduit contient 27 familles observées une seule fois et toutes `partial/resource_cap` ; `animations.json` compte 59 observations, 8 complètes et 51 partielles. [Audit détaillé et captures mobiles comparables](audit-cartes-memes-reference.md).
- Cartes Mèmes : couches de matière fixes et distinctes sur les cinq raretés, Full Art avec image plus ouverte et cartouche allégé, reflet au doigt limité à la grande fiche Épique+, ou Full Art. Reflets désactivés et `prefers-reduced-motion` coupent le reflet. Pas de sweep permanent, de nouveau média, de changement de taux, de catalogue, de SQL ni du sachet physique. Note joueur et décision D-127 incluses.
- Vérifications locales : TypeScript, ESLint complet, garde de jargon, build statique, 1 186/1 186 unitaires, 28/28 écrans ciblés, Playwright mobile Mèmes/Binder 7/7, diff check réussis. Six captures de fiches à 390 × 844 ont été inspectées ; elles ne prouvent pas le rendu OLED ni le geste sur téléphone physique. Le build local n'a pas les variables Supabase ; aucun nouveau tirage connecté n'est revendiqué, les règles serveur sont inchangées.
- Code, test, note joueur, audit et six captures publiés sur `main` par [`40eb20f7`](https://github.com/GoodFight37/CreatorDeck/commit/40eb20f75d1c9454c30c5cc3552425f90cb9207b), SHA distant confirmé. [CI Vérification 38888638434](https://github.com/GoodFight37/CreatorDeck/actions/runs/38888638434) terminée verte 6/6, y compris trois lots Playwright, qualité, migrations jetables et cloud simulé. Vercel Production `dpl_FHgW9md8k7fubXY7PzC6Grbaj7bm` est `READY` sur ce SHA. `/memes` répond HTTP 200 sur `creator-deckk.vercel.app` ; en Chromium mobile 390 × 844, la fiche Mythique contient bien la couche de matière et son reflet, sans exception JavaScript. Ce parcours public sans compte ne teste pas un nouveau tirage ni la sensation sur téléphone physique.
- Clôture documentaire post-CI : même code, aucun nouveau test d'application requis. Le jugement visuel et tactile sur téléphone réel reste ouvert.

## Checkpoint D-126 — rituel d’ouverture Mèmes (publié et vérifié)

- Base `main` et GitHub vérifiée à `161b7a0d55af2a4f2ac11d14fb9406ab1aa90a20`, arbre propre avant intervention. Malik montre deux captures du booster Mèmes D-125 : une boîte statique et un bouton « RÉVÉLER » ; il demande le même ressenti d’ouverture que le booster principal. Défaut confirmé dans `meme-deck.tsx` : `<dialog>` spécifique sans `PackTear`, sans extraction ni flip automatique.
- Correction : `PackTear` accepte une impression optionnelle Mèmes ; le sachet de l’accueil utilise la même image. Le même peel guidé, ses seuils, le délai de 1 200 ms et l’alternative clavier/fallback s’appliquent. `MemeReveal` retourne automatiquement chaque carte, autorise glissement/tap après le flip, renforce l’arrivée Rare et mieux, respecte Reflets/réduction du mouvement et tient le récap au moins 1,5 s. Son de déchirure et vibrations de rareté réutilisés ; aucun changement BGM, SQL, rates, réserve ou cartes Twitch. Note joueur et décision D-126 incluses.
- Vérifications déjà exécutées : Playwright Chromium téléphone avec RPC Mèmes simulés 1/1 : peel TIRE/RELÂCHE, image Mèmes, cinq cartes, anti-skip, récap 1,5 s, collection persistée, un seul appel de tirage. Captures locales du sachet, de la première carte et du récap inspectées. TypeScript, lint complet, garde de jargon, build statique et diff check réussis après les retouches ; écrans Drop et notes 20/20 ; Playwright Mèmes sans cloud 1/1 et peel du booster principal 1/1. La base et les taux ne sont pas modifiés, donc pas de migration à rejouer.
- Code, test, note joueur et docs publiés sur `main` par [`b8cff0f9`](https://github.com/GoodFight37/CreatorDeck/commit/b8cff0f9e840946a0f3e6494c26c58f74c438a11), SHA distant confirmé. [CI Vérification 38887008645](https://github.com/GoodFight37/CreatorDeck/actions/runs/38887008645) terminée verte 6/6, incluant le test cloud simulé. [Workflow Supabase 38887400238](https://github.com/GoodFight37/CreatorDeck/actions/runs/38887400238) terminé `success` ; aucune nouvelle migration dans ce correctif. [Déploiement Production 7116642371](https://github.com/GoodFight37/CreatorDeck/deployments/7116642371) `success` sur ce SHA, impression Mèmes HTTP 200.
- Parcours réel sur `creator-deckk.vercel.app` en Chromium mobile 390 × 844, nouveau compte invité de test : réserve 4, scène scellée, geste jusqu’à RELÂCHE, cinq cartes au récap, collection `5 / 2151`, réserve 3 après un seul booster, zéro exception JavaScript. Session de test éphémère fermée, compte invité conservé en production. Ce contrôle ne mesure pas la sensation du peel sur un vrai écran tactile.
- Limite : le contrôle navigateur automatisé et connecté ne remplace pas le ressenti tactile sur le téléphone du joueur. La session de test a été fermée ; aucune modification SQL ni économique.

## Checkpoint D-125 — univers Mèmes FR distinct (publié et vérifié)

- Base `main` locale et GitHub vérifiée à `316ffa53f95476845662b25c5e9ff35bbf5aa4dc` avant l'implémentation ; le commit D-124 était documentaire. Malik demande l'intégration complète des cartes Mèmes FR et affirme posséder un accord écrit non partageable. La portée contractuelle n'est pas vérifiée dans le dépôt ; ne pas présenter cette affirmation comme un audit juridique.
- Source publique figée : 2 151 fiches et 21 Full Art, 2 147 fichiers WebP distincts dans `public/memes-fr/` (46 Mo). Une fiche « Carte supprimée » a un WebP de remplacement de 818 octets ; elle est visible sans illustration et non distribuée. `scripts/import-memes-fr.mjs --sync` reproduit l'import. Catalogue `src/data/memes-fr.json` et `src/lib/memes.ts`.
- Page `/memes` avec pack, collection, recherche, pagination, fiche, révélation de cinq cartes et récap ; entrée secondaire sous le Drop. RPC et tables dédiées dans `0052_meme_univers.sql` : réserve 4, recharge 30 minutes, trois Communes, un slot variable et une Rare ou mieux en dernière ; tirage serveur sans doublon dans le pack, request ID idempotent. Aucun changement à Twitch, son économie et ses taux. Note joueur `2026-10-16-univers-memes`.
- Vérifications locales : `npm run typecheck` réussi ; ESLint ciblé réussi ; `npm run build` réussi avec `/memes` exporté ; `npm run supabase:verify` réussi, incluant cinq assertions Mèmes (catalogue, réserve, tirage, replay, isolation) ; Playwright téléphone `e2e/memes.spec.ts` 1/1, sans débordement ni erreur JavaScript. `npm run lint` réussi ; `npm test` 1 186/1 186 ; `npm run catalog:ci` réussi ; écrans Drop et notes 20/20 ; `git diff --check` réussi. Le navigateur local sans variables cloud ne prouve pas l'ouverture connectée en production. Ressenti tactile sur téléphone réel non mesuré.
- Code, catalogue, 2 147 WebP, migration, test, note joueur et docs publiés sur `main` par [`52b3738a`](https://github.com/GoodFight37/CreatorDeck/commit/52b3738a83705f37d5711fcb3384c5470c63ca7e), SHA distant confirmé. [CI Vérification 38833425685](https://github.com/GoodFight37/CreatorDeck/actions/runs/38833425685) réussie 6/6. [Workflow Supabase 38833731425](https://github.com/GoodFight37/CreatorDeck/actions/runs/38833731425) terminé `success`, étape « Contrôler le projet et appliquer les nouvelles migrations » réussie ; l'API des logs détaillés n'a pas livré son texte dans cette session. Le [déploiement Production 7108298154](https://github.com/GoodFight37/CreatorDeck/deployments/7108298154) est `success` sur ce SHA ; `/memes` et un WebP répondent HTTP 200 sur `creator-deckk.vercel.app`.
- Parcours réel sur Vercel en Chromium mobile 390 × 844, compte invité de test neuf : réserve Mèmes à 4, ouverture activée, cinq cartes révélées, récap de cinq cartes, classeur à `5 / 2151`, zéro exception JavaScript. Le compte invité de test reste en production ; la session navigateur temporaire a été fermée. Cela confirme le tirage de production, mais pas le ressenti tactile d'un téléphone physique.
- Action restante côté joueur : ressentir l'ouverture et la lecture des cartes sur téléphone réel ; décider plus tard si la fiche « Carte supprimée » doit recevoir un visuel exploitable. L'accord écrit affirmé par Malik reste privé et sa portée n'est pas vérifiable dans le dépôt.

## Checkpoint D-124 — étude de la source MyMemeCards (sans import)

- Départ `main` local et distant `7dba0b6b4506e7d26d4e5ef443fe7e62f4027877`, arbre propre. Malik veut ajouter des cartes MyMemeCards pour diversifier le jeu, dans un booster et une collection mèmes séparés des cartes Twitch. Source consultée le 16 octobre : accueil français, conditions générales, mentions légales, `robots.txt` et inventaire du ZIP remis.
- Le site annonce 2 130 cartes « Memes FR » ; le ZIP recense 23 766 fiches multi-catalogues et zéro média autorisé copié. Les mentions légales réservent design/textes à OGROUP SRL et attribuent les mèmes à leurs auteurs ; aucune licence de republication n'a été trouvée. Malik a été interrogé sur une éventuelle autorisation couvrant ces contenus ; réponse attendue. Aucun téléchargement massif, import de catalogue, modification du jeu ou des règles.
- Étude et conditions d'intégration : `docs/catalogue-memes-source.md`, décision D-124, roadmap. Après la réponse, préparer un petit catalogue aux contenus autorisés, puis spécifier le stockage et le tirage serveur du booster séparé sans toucher aux possessions Twitch.

## Checkpoint D-123 — cartes Twitch et référence visuelle (publié)

- Base locale et GitHub `main` vérifiée à `201521976f657b84ba50875797375a2e6389a87f`, arbre propre avant édition. ZIP utilisateur lu comme référence visuelle, sans importer catalogue, textes, liens de médias ni images MyMemeCards. Les cartes Twitch actuelles gagnent un bord de rareté, un cartouche de nom et un libellé de rareté sur les grandes cartes. Reflets au geste et animation de reveal existants conservés.
- Malik précise la direction suivante : collection et booster mèmes séparés des cartes Twitch, éventuellement un langage graphique commun. Aucun catalogue, droit des médias, règle de tirage ou intégration du prototype multi-univers n'est fixé ; ce chantier ne les implémente pas.
- Fichiers du lot : `src/components/creator-card.tsx`, `src/app/globals.css`, `src/app/drop-binder.css`, `e2e/binder-finitions.spec.ts`, `src/lib/release-notes.ts`, `docs/decisions.md`, `docs/roadmap.md`, cette passation. `npm run typecheck`, ESLint ciblé, `npm run ecrans -- src/ecrans-drop-binder.test.tsx src/ecrans-effets.test.tsx src/ecrans-release-notes.test.tsx` (45/45), `npx playwright test e2e/binder-finitions.spec.ts --project=téléphone` (5/5), `npm run build` sans variables cloud locales et `git diff --check` réussis. Captures de la grille et de la fiche mobiles inspectées ; elles ne prouvent pas le ressenti sur téléphone physique.
- Code, test, note joueur et décision publiés sur `main` par [`89936291`](https://github.com/GoodFight37/CreatorDeck/commit/89936291a98747de9bd637206aa3564c93453adc), SHA distant confirmé. [CI Vérification 38829952215](https://github.com/GoodFight37/CreatorDeck/actions/runs/38829952215) verte 6/6 : qualité, trois shards navigateur, SQL jetable et cloud simulé. Le statut GitHub du [déploiement Production 7107787599](https://github.com/GoodFight37/CreatorDeck/deployments/7107787599) est `success` pour ce SHA. Domaine public et URL de déploiement répondent HTTP 200 ; la note « Les cartes Twitch prennent du relief » a été lue sur le domaine public en Chromium mobile 390 × 844, sans exception JavaScript. L'API Vercel directe a renvoyé 403 sur le scope du projet et la CLI n'est pas installée : contrôle fondé sur GitHub et le site, pas sur une inspection authentifiée Vercel. Le ressenti physique reste au joueur.

## Checkpoint D-122 — inventaire des restes et vérification réelle du tutoriel

- Départ : `main` local/GitHub `04f05a018686bde932931ce6401a01bce7071535`, arbre propre et Production Vercel `READY`. Le domaine public `https://creator-deckk.vercel.app/` répond HTTP 200 ; l’URL spécifique du déploiement était protégée. Le parcours D-121 a été repris sur ce domaine avec Chromium mobile 390 × 844 et un nouveau compte invité de production : la feuille « Mon compte » reste seule pendant la réponse d’onboarding, le tutoriel apparaît après sa fermeture et « Terminer » revient au Drop ; zéro exception JavaScript. Le contexte navigateur a été fermé ; le compte invité de test reste en base. Cette preuve ne remplace pas le ressenti physique.
- Le CSS du sachet publié dans `118b21f0` avait son test mobile 4/4, build, CI 6/6 et Vercel prêts, mais aucune note joueur à cause de la consigne CSS uniquement de ce lot. Une note rétrospective décrit son angle et ses tranches plus discrets, sans annoncer un nouveau changement de CSS. D-122 et la roadmap active distinguent maintenant essais personnels, portraits/ressources, code privé facultatif, prototype multi-univers et idées sans spécification. Aucun taux, coût, catalogue ni transaction de jeu modifié dans ce passage.
- Vérifications locales de la note : `npm test -- src/lib/release-notes.test.ts` 8/8, `npm run ecrans -- src/ecrans-release-notes.test.tsx` 3/3, TypeScript, ESLint ciblé, build et diff check réussis. `/catalogue-demo` répond HTTP 200 sur Vercel, sans débordement à 390 px ni exception JavaScript ; c’est une vérification de fonctionnement, pas une décision d’intégration. Les ventes/achats Hôtel et la prise Last Pack n’ont pas été exécutés en production ; les comptes de test actuels n’ont pas les prérequis documentés pour ces transactions.
- Note joueur, décision et inventaire publiés par `a234e8e153a908d638ca03c0759190c521889b79` sur `main`, SHA distant confirmé. Vercel Production `READY` sur ce SHA ; « Un sachet plus fin » vu dans Nouveautés sur le domaine public, zéro exception JavaScript. CI [run 38827784840](https://github.com/GoodFight37/CreatorDeck/actions/runs/38827784840) verte 6/6 : qualité, trois lots navigateur, SQL jetable et cloud simulé. Le dernier commit documentaire de clôture n’altère pas le jeu.


## Checkpoint D-121 — tutoriel et feuille de compte sans superposition

- Défaut observé lors de D-120 sur Vercel, base initiale `67385de2` : création invitée dans « Mon compte », arrivée asynchrone de l’onboarding, tutoriel derrière la feuille puis appuis interceptés. Le correctif local a été conservé pendant le chantier CSS du sachet, puis repris sur `main` `118b21f067389291547e0ef6f11b8fdedb5198c6` ; SHA local et distant identiques, arbre propre avant sa reprise.
- Correctif : tutoriel différé pendant une feuille ou scène ouverte ; retour au Drop à « Terminer » ; musique non démarrée pendant l’attente. Test DOM ciblé et note joueur ; décision et problème connu mis à jour. Aucun changement de règles ou d’économie.
- Vérifications locales sur cette base : test ciblé 1/1, suite écrans 182/182 dans 29 fichiers, navigation Playwright téléphone 6/6, TypeScript, ESLint, build statique et `git diff --check` réussis. Le build local n’a pas les variables Supabase ; la connexion réelle n’y est donc pas exercée.
- Code, test, note joueur et docs publiés par `6a1c0069070cf0ef45cd30c72c7d215ad2be7047` sur `main`, SHA distant confirmé. Vercel Production `READY` sur ce SHA. CI [run 38826862407](https://github.com/GoodFight37/CreatorDeck/actions/runs/38826862407) terminée verte (6/6 jobs : qualité, trois lots navigateur, SQL jetable et cloud simulé). L’URL de production est protégée par la connexion Vercel dans cette session : le parcours connecté réel sur le site et le ressenti tactile physique restent à vérifier côté joueur, sans les déduire des tests simulés.


## Checkpoint D-120 — validation sociale réelle sur Vercel

- Base `main` GitHub/locale `c8effc3b92aa819ca085ac54ab5fe5d3d6385544`, arbre propre avant ce rapport. Production Vercel `READY` sur ce SHA, `/` HTTP 200 ; D-119 CI verte 6/6 sur le SHA de code `d4c0592a`.
- Chromium mobile 390 × 844, deux sessions invitées séparées contre Supabase Production : pseudos, demande/acceptation d’ami et listes synchronisées ; un booster normal ouvert par compte ; A propose Celetik contre Laniyelle, double activation = un seul appel `create_trade`, B accepte ; les deux Binder montrent le transfert et cinq cartes chacun. Wishlist épinglée et retrouvée après rechargement ; réponse réelle `player_variants` retardée puis écartée après changement de partenaire. Hôtel et Last Pack affichent leur contenu.
- Rapport détaillé : [vérification sociale Vercel](verification-sociale-vercel-2026-10-15.md). Aucun code ni règle économique changé. Pas de vol Last Pack, d’achat/dépôt Hôtel, de connexion depuis une feuille sociale non connectée, ni de validation tactile physique. Plusieurs comptes invités de test restent en production ; les sessions locales temporaires sont à effacer. Publication documentaire à compléter.


## Checkpoint D-119 — audit IA Studio Lot 05, feuilles sociales et échanges

- Base GitHub/locale `main` vérifiée avant modification : `39d17e55df35dcfd6a45e461f34345e054ef18a4`, arbre propre. Rapport reçu dans `1-ai_studio_code-2-.txt` ; cinq constats examinés : la carte 0 est un faux positif, car SQL numérote les cartes de 1 à 5. Wishlist était déjà chargée par Toi, mais la feuille assure désormais sa fraîcheur. Les faux positifs du rapport ne justifient pas de changement.
- Code : chargement Amis, Hôtel des ventes, Last Pack et Wishlist au changement de compte ; réponses de variantes invalidées lors d’un changement de partenaire/compte ; soumission d’échange verrouillée jusqu’à sa réponse. Note joueur, décision et défauts connus mis à jour. Aucune règle serveur ni économie modifiée.
- Vérifications locales : tests DOM 181/181 (dont 8 Échanges et 5 feuilles sociales), unitaires 1 186/1 186, TypeScript, ESLint complet, build statique et diff check réussis. Code et docs publiés par `d4c0592ae0c695cdd2e8ce465e6622502ca0d7c3` sur `main` (SHA distant confirmé). Vercel Production `READY` sur ce SHA, alias `creator-deckk.vercel.app` actif et `/` HTTP 200. CI [run 38785081118](https://github.com/GoodFight37/CreatorDeck/actions/runs/38785081118) verte (6/6 jobs : qualité, trois lots navigateur, SQL jetable et cloud simulé). Le DOM simulé et le cloud factice ne prouvent pas les gestes ni le réseau réels sur téléphone.


## Checkpoint D-118 — vocabulaire Échanges et CI

- Base `main` GitHub/locale vérifiée avant édition : `3fff40cfbdd80cef481573492ca3635bc8022ce1`, arbre propre.
- Après question explicite de Malik sur la CI rouge, deux aides visibles du panneau Échanges ont été reformulées. Le texte du radar causait le test jargon et deux assertions Compte lié ; une seconde aide disait encore « cloud » et « serveur ». Aucun changement de logique Trade ou de règle économique.
- Note joueur et décision D-118 ajoutées ; problème connu mis à jour. Tests locaux : 1 186/1 186 unitaires, 174/174 écrans, contrôle de jargon, TypeScript, ESLint ciblé, build et diff check réussis.
- Code publié par `f0501d558fcecab3572e2b049aa9c8fff685a06a`, push normal `main` et SHA distant confirmé. Vercel Production `READY` pour ce SHA, alias `creator-deckk.vercel.app` actif et `/` HTTP 200. CI [run 38783488533](https://github.com/GoodFight37/CreatorDeck/actions/runs/38783488533) **verte (6/6 jobs)** : qualité, trois shards Playwright, SQL jetable et cloud simulé réussis. Le correctif suivant de passation rapporte seulement ce verdict, sans changement du jeu.


## Checkpoint D-117 — sachet Drop après revue Claude

- Base locale/GitHub vérifiée avant édition : `d7a9de45dc8accd6a7df9ca66cb4ae221799d8d4`, arbre propre.
- Quatre défauts ciblés corrigés : entrée du sachet qui redémarrait au relâchement, saut au démarrage de l’idle, bouton sachet désactivé malgré des boosters de test, et ombre liée à un padding divergent sur écran court. Le CTA, la taille, les taux et l’économie ne changent pas. La règle globale `button:focus-visible` réfute l’alerte de focus absent ; extrusion/performance non prouvées, donc non modifiées.
- Note joueur dans `src/lib/release-notes.ts`, décision D-117 et problème connu actualisé. Validation locale : 17/17 tests d’écran ciblés ; 4/4 scénarios navigateur sur profil téléphone (dont padding/ombre à 844, 680 et 568 px, pression et priorité du CTA) ; TypeScript, ESLint ciblé, build, diff check. Capture 390 × 844 inspectée : pack, ombre et CTA restent lisibles, sans débordement. Le ressenti tactile physique reste à juger sur le site.
- Code publié par `a11864cc84bb8ea984b76e320b0c0e9e50944dee`, push normal
  sur `main`, SHA distant confirmé. Vercel Production `READY` sur ce SHA,
  alias `creator-deckk.vercel.app` actif, `/` HTTP 200. CI
  [run 38782343031](https://github.com/GoodFight37/CreatorDeck/actions/runs/38782343031)
  terminée : les trois shards Playwright, SQL jetable et cloud simulé passent.
  Le job qualité reste rouge sur les mêmes trois assertions de vocabulaire
  « serveur » dans Trades/Compte lié (unitaires 1 185/1 186, écrans 172/174),
  déjà présentes avant D-117. TypeScript, lint, build et catalogue passent.


## Checkpoint D-116 — rapport IA Studio Lot 04

- Base locale et GitHub vérifiée avant édition : `d12f155c26437c782fb7b3c2cde0500456b79628`, arbre propre.
- Rapport reçu dans `1-ai_studio_code-1-.txt`. Cinq points confirmés dans les composants Drop/Tribunal/Arène/code promo. Le refus normal de paiement du Tribunal empêchait aussi le réessai. Régression de feuilletage Binder détectée dans le CI précédent : le bouton d’inspection ajouté par D-115 absorbait le départ du geste.
- Corrections D-116 : habillage avant peel ; réessai et état occupé libéré en cas d’échec Tribunal/Arène ; retour et Échap sur la feuille de code ; libellés de fin Arène ; feuilletage depuis la carte et attentes de focus E2E. Aucune règle économique modifiée. Note joueur ajoutée.
- Vérifications locales : 22/22 tests d’écran ciblés (dont refus et exception
  Tribunal, Échap/Retour code), 31/31 E2E Binder/Drop sur bureau et téléphone
  (un scénario marqué skipped), TypeScript, ESLint ciblé, build et diff check.
  Code publié par `901b0df82668e191cb8f9dfec81ec0315c4ddb1e`, push normal
  sur `main` et SHA distant confirmé. Vercel Production `READY` pour ce SHA,
  alias `creator-deckk.vercel.app` actif, `/` HTTP 200. La CI
  [run 38764046743](https://github.com/GoodFight37/CreatorDeck/actions/runs/38764046743)
  est terminée : les trois shards Playwright, migrations SQL et chemin cloud
  simulé sont verts. Le job qualité est rouge uniquement sur le mot « serveur »
  déjà présent dans Trades/Compte lié : unitaires 1 185/1 186, écrans
  172/174 ; TypeScript, lint, build et catalogue passent. Ce vocabulaire
  hors périmètre de D-116 reste ouvert. Le commit de documentation suivant
  reporte ce verdict sans modifier le jeu.


## Checkpoint courant — D-115 suite du rapport IA Studio Collection/Craft

- Base main propre avant cette suite : `8ccfa0280fe2c0dc0cd360aee4d0e0745a8cf6a1`.
  Malik a collé le rapport complet, dont le premier fichier joint était tronqué.
  Verdicts confirmés : texte de fiche erroné pour Sortant non craftable ; lien
  Twitch déclenchant aussi l’inspection et imbriqué dans un `role=button` ;
  focus perdu sur « Choisir une carte » ; import `Radio` inutilisé. Le crash
  Atelier reste un faux positif (map active + Sortants depuis `a06847c65`).
- Corrections locales : fiche Sortant fidèle ; article de carte avec vrai bouton
  d’inspection superposé et lien Twitch indépendant ; retour du focus via
  `closeAction`; retrait de `Radio`. Aucun changement de tirage, économie,
  coûts ni recyclage. Note joueur, revue complète, D-115, roadmap et problèmes
  connus mis à jour.
- Tests ciblés relancés après la correction : 47/47 (Binder, Atelier, fiche
  Sortant, carte interactive, focus, vitrine et notes). TypeScript, ESLint ciblé,
  build et `git diff --check` passent. `npm test` : 1 185/1 186 ; l’unique
  échec est le texte « serveur » dans Trades, inchangé et hors périmètre.
  Code publié par [0d38fff4](https://github.com/GoodFight37/CreatorDeck/commit/0d38fff45569de0bdbc557432769ce05bcb6336e), push normal sur `main`, SHA distant confirmé.
  Vercel Production correspondant est `READY`, alias principal actif, `/`
  HTTP 200. CI [run 38757768315](https://github.com/GoodFight37/CreatorDeck/actions/runs/38757768315)
  contrôle à 15:12 UTC : migrations SQL et cloud simulé réussis ; les 3 shards
  Playwright : le shard 3 a échoué car l’E2E attendait le focus sur l’ancien
  article. Son sélecteur a été migré vers le vrai bouton d’inspection ; le
  fichier complet repasse localement 3/3 sur téléphone. Shards 1 et 2 encore
  actifs au dernier contrôle. Le run suivant, [CI `38758472719`](https://github.com/GoodFight37/CreatorDeck/actions/runs/38758472719),
  porte ces sélecteurs corrigés et est en cours sur le SHA `a1c2dd02`.
  Sa Production Vercel est `READY`, alias principal actif, `/` HTTP 200.
  Le job qualité du run initial a 1 185/1 186 tests unitaires
  réussis : l’unique échec est le jargon Trades déjà connu. Écrans : 169/172,
  avec deux assertions Compte lié portant sur le même terme hors périmètre et
  un test de vitrine qui cliquait l’ancien article ; ce dernier est corrigé
  dans le checkpoint actif et ses six suites passent localement 47/47. Le job
  a aussi passé TS/lint/build/catalogue. Le run initial a été annulé quand le
  suivant est parti ; n’en tirer aucun verdict final. Attendre les résultats
  du run `38758472719`.
  CI D-114 (run `38755525613`) a réussi build, TS/lint/catalogue, migrations,
  cloud simulé et les 3 shards E2E ; son unique job rouge portait sur le texte
  « serveur » dans Compte/Trades inchangé, 1 test jargon et 2 assertions Compte
  lié. Ne pas modifier ces domaines.
- Validation tactile réelle côté joueur sur le site ; aucun APK. Les Sortants
  réels sont absents du catalogue, fixtures synthétiques.

## Historique — D-114 revue IA Studio Binder/Atelier

- Base main locale/GitHub au départ : `0180eb57048fbd223a6dbf2264822c2e4f180fbf`.
  Pièce reçue : `/tmp/codex-remote-attachments/.../1-ai_studio_code.txt`, bilan
  annoncé sur `7be3914b`. Le fichier reçu est tronqué à `[MOYEN] Informatio` ;
  seuls les constats complets avant cette coupure sont vérifiés.
- Faux positif confirmé par l’historique : `CREATOR_BY_SLUG` inclut déjà
  `RETIRED_CREATORS` depuis `a06847c65`, donc les opérations Atelier savent
  résoudre ces cartes. Deux bugs UI confirmés : le compteur Toutes de l’Atelier
  suivait le filtre de rareté et les Sortants possédés étaient omis d’Obtenues /
  ajoutés à Toutes après les filtres. Le pourcentage de complétion active ne
  compte toujours pas les Sortants.
- Corrections dans `atelier-view.tsx` et `binder-view.tsx`. Note joueur et
  revue détaillée dans `release-notes.ts` et
  [revue D-114](revue-ia-studio-binder-2026-10-15.md). Test DOM Atelier compare
  le total Toutes avant/après rareté. Test Binder ajoute un Sortant synthétique
  (le catalogue réel en contient zéro), vérifie Obtenues (2), présence, filtre
  de page, recherche et résultat vide. Aucun changement économie, tirages,
  craft, recyclage ou serveur.
- Vérifié localement : DOM ciblé 20/20, notes joueur 3/3, TypeScript,
  ESLint ciblé, build de production et `git diff --check` réussis. Build local
  sans variables Cloud (avertissement attendu). `npm test` : 1 185/1 186 ;
  l’unique échec est le mot « serveur » dans le texte Trades déjà documenté.
- Publié par [285628a2](https://github.com/GoodFight37/CreatorDeck/commit/285628a260c037437a66989a07958e023afefba5), push normal `main`, SHA distant confirmé.
  Vercel Production `READY`, alias `creator-deckk.vercel.app`, page `/` HTTP
  200. CI [run 38755525613](https://github.com/GoodFight37/CreatorDeck/actions/runs/38755525613)
  terminée : build, TypeScript, ESLint, catalogue, migrations jetables, test
  cloud simulé et 3 shards Playwright réussis. Le job unitaires/écrans/vocabulaire
  reste rouge sur le seul mot « serveur » : un test jargon, deux tests
  `ecrans-compte-lie`; 1 185/1 186 unitaires, 167/169 écrans. Les fichiers
  concernés ne changent pas dans ce lot. Aucun test tactile physique ; APK hors
  cible. Le rapport complet a ensuite été fourni ; ses derniers constats sont
  traités dans le checkpoint D-115 ci-dessus.

## Checkpoint courant — D-113 deuxième bilan IA Studio

- Base vérifiée sur main `7eefe5f8` avant travaux ; bilan reçu sur l’archive
  `7be3914b`. L’alerte de focus `inert` est un faux positif : les composants
  présents rendent leurs dialogues via `document.body` et restent hors de
  `.app-shell`.
- Corrections : handler Android pour quitter une ouverture en attente sans
  interrompre le tirage ; marqueurs du tutoriel relus par compte ; poll Last
  Pack après résolution de son appel asynchrone ; description accessible de Toi
  et pastille visuelle masquée aux lecteurs d’écran. Note joueur ajoutée.
- Vérifié : typecheck, ESLint TS/TSX ciblé, build Next (5 routes), note joueur
  8/8, navigation Playwright 2/2 bureau/téléphone. `npm run ecrans` garde deux
  échecs connus sur le mot « serveur » dans Échanges, hors périmètre ; le
  scénario de sortie du tirage en attente réussit ; son test via la pile retour
  réussit aussi (2/2). Aucun test matériel Android, compte connecté réel ou
  lecteur d’écran physique.
- Code livré par [43e15f6d](https://github.com/GoodFight37/CreatorDeck/commit/43e15f6d73bcb961679ac367944b9ceb4bc3147b), test d’intégration et passation
  complémentaire dans le commit [2ab3adeb](https://github.com/GoodFight37/CreatorDeck/commit/2ab3adeb21cd01d830fae602a4c6e4f7ad43069a). Push normal sur `main`, SHA distant
  confirmé ; blob de la [revue D-113](revue-ia-studio-architecture-2026-10-15.md)
  vérifié sur GitHub. Déploiement Production Vercel `READY` sur `2ab3adeb`, alias
  principal attribué et `/` répond HTTP 200. Pas de parcours tactile sur mobile.
- CI D-113 déjà contrôlées après leur exécution : tous les contrôles sont verts,
  sauf le même contrôle vocabulaire Trades hors périmètre. Voir les runs
  archivés dans GitHub si un contrôle historique est nécessaire.

## Checkpoint courant — D-112 premier bilan IA Studio, publié et Vercel vérifié

- Main local/GitHub propre et identique `7be3914b` au départ. Bilan externe
  de cinq points reçu, vérifié contre les dépendances et la documentation
  GitHub officielle. [Verdicts détaillés](revue-ia-studio-2026-10-15.md).
- Faux positifs : le contexte d’événement `dry_run` est une chaîne ; fallback
  `--top-bar-h` présent ; Lucide masque déjà ses SVG. Aucun workflow modifié,
  aucune opération Supabase lancée pour ce bilan.
- Corrections : compteurs `role=group`, barre de niveau bornée en affichage
  pour import incohérent, focus du prototype avant scroll. Aucun état de jeu
  changé. Note joueur ajoutée avec le code.
- Typecheck/ESLint ciblé et notes 8/8 réussis ; clavier navigateur 2/2 ;
  rendu ponctuel de trois sauvegardes assainies : 0/20/100 %, trois groupes
  nommés et SVG masqués. Build Next réussi, cinq pages statiques sans cloud
  local (compilation seulement).
- Code, note joueur et revue publiés au commit
  [b97d706f](https://github.com/GoodFight37/CreatorDeck/commit/b97d706f856ea8b04aba8d1e9abce32a82831175),
  push normal main et SHA distant confirmés. Vercel du SHA `success`.
  Production HTTP 200 à 390 × 844 : trois groupes nommés, deux SVG masqués,
  document 390 px ; Entrée sur le classement Fiction → focus classeur et
  cinq cartes Fiction. Aucune erreur JS observée ; lecteur d’écran physique
  non testé. [CI](https://github.com/GoodFight37/CreatorDeck/actions/runs/38747666594)
  encore en cours au dernier contrôle ; ne pas l’annoncer verte.
- Archive IA Studio antérieure reste sur `7be3914b` : fournir le bilan vérifié
  au prochain lot pour ne pas recycler les alertes déjà traitées.

## Checkpoint courant — D-111 vérifications fiabilisées, complément DOM publié

- Demande Malik : prochain chantier complet, docs et publication main.
  Base locale/GitHub propre `7c8ce001`, aucune PR ouverte. CI D-110
  `38736932904` terminée rouge : qualité sur jargon Trades, trois shards
  navigateur en échec ; SQL et RPC cloud simulés verts. Le backlog produit
  restant demande du cadrage ; choix de fiabiliser les parcours existants.
- Ne pas développer soundbites/Twitch/Last Pack sans règles ; préserver le
  Drop et les piliers exclus. Aucun changement gameplay/économie prévu.
- Investigation complète : `npm run e2e`, log
  `/tmp/creatordeck-next-e2e.log` : 146 réussites, 12 échecs, 12 ignorés
  (12,2 min, pas une suite verte). Échecs confirmés : sondes de fondu audio
  obsolètes (méthode `setTargetAtTime` au lieu de `linearRampToValueAtTime`),
  nom/durée du reflet ancien, survol à position fixe intercepté par outils
  sticky, réglages/crédits cherchés sans ouvrir le volet de D-101.
  Dernier échec : mesure immédiate du journal à 812 px (ancienne hauteur)
  juste après redimensionnement à 768 px sur téléphone ; assertion rendue
  réessayable sans modifier la borne. Une mesure isolée après rendu tient
  à 736 px. Aucun défaut permanent de géométrie affirmé.
  Aucun code du jeu modifié. Les artefacts CI distants sont refusés par le
  réseau ; logs unitaires accessibles et défaut jargon Trades confirmé.
- Corrections tests pack déjà validées : 6/6 bureau/téléphone, rapport JSON
  `/tmp/creatordeck-next-pack.json` : expected 6, skipped/unexpected/flaky 0.
  Survol d’une carte réelle plutôt que d’une coordonnée fixe : 2/2.
  Le survol initial avait échoué une fois puis passé en isolation : correction
  ciblée de son instabilité, aucune régression Binder affirmée.
- CI locale : YAML lu avec `js-yaml`, huit contrôles indépendants après
  installation réussie et sans `continue-on-error` ; typecheck et ESLint
  ciblé réussis. Reporters GitHub/JSON ajoutés en CI aux rapports existants.
- Réglages/crédits corrigés et validés : 4/4 bureau/téléphone ; JSON
  `/tmp/creatordeck-next-settings.json`. Journal relancé trois fois
  par format pour son intermittence : 6/6 réussis. Total ciblé : 18 exécutions
  réussies, 14 scénarios uniques, aucun skip. Aucun scénario supprimé ou ignoré
  en plus ; les 12 ignorés du diagnostic sont les conditions déjà existantes.
- Typecheck, ESLint des six fichiers TS de ce lot et diff-check réussis.
  Aucun build local supplémentaire : aucun fichier applicatif ni dépendance
  modifié. Les nouveaux reporters ont produit des JSON valides (6 pack,
  4 réglages/crédits, 6 journal, zéro unexpected/flaky/skipped).
- Lot publié sur main au commit [6cbb3926](https://github.com/GoodFight37/CreatorDeck/commit/6cbb39268839eb70d7cd00d0529b0cdca91e2aad),
  push normal et SHA distant confirmés ; blob de cette passation vérifié
  via l’API GitHub après publication. Vercel du SHA `success` ; production
  `https://creator-deckk.vercel.app/` HTTP 200, Chromium 390 × 844 : pack,
  ESSAYER et idle présents, largeur document 390, aucune erreur JS observée.
- [CI du premier lot](https://github.com/GoodFight37/CreatorDeck/actions/runs/38740874237)
  terminée : trois shards navigateur, SQL et cloud simulé verts ; qualité rouge
  (unitaires jargon Trades, écrans et scanner jargon). Typecheck, lint,
  catalogue et build exécutés et réussis malgré ces échecs.
- Le job écrans nouvellement exécuté a révélé trois assertions DOM périmées :
  libellé Objectifs enrichi et ancienne confirmation Live de l’Atelier.
  Corrigées dans ce complément, aucun fichier du jeu touché. Diagnostic
  `npm run ecrans` : 161/166 réussis ; relance des trois fichiers corrigés :
  25/25. Les deux échecs compte lié restants viennent du texte Trades exclu.
- [Rapport détaillé D-111](verification-d111.md) : commandes exactes,
  compteurs, corrections, CI et limites. Le SHA de ce complément se retrouve
  via `git log -1 --format=%H -- docs/verification-d111.md`. Lire sa nouvelle CI
  sans confondre résultats de la première publication et dernier SHA.
- Aucun changement visible ni nouvelle note joueur pour ce lot d’outillage.
  Réservation libérée après publication ; ressenti physique non certifié.

## Checkpoint courant — volume vivant du sachet D-110, publié et contrôlé sur Vercel

- Base main locale et GitHub propre et identique `796cc2e1`, vérifiée avant
  modification. Demande limitée au volume/vie du pack ; décision D-110.
- CSS Drop : idle 4,8 s, ±4 px / Y ±3° / X ±1,5°, face Z14, côtés foil
  biseautés, reflet 4 s, deux ombres, spot renforcé et overflow visible.
  CTA et dimensions conservés. Aucun asset ni logique de jeu modifié.
- Chromium 390 × 844 : matrices différentes sur trois secondes, reflet 4 s,
  scène visible et largeur document 390 ; capture `/tmp/creatordeck-volume-home.png`
  inspectée après le tutoriel. Le premier contrôle photographiait le tutoriel,
  donc il ne constituait pas une preuve visuelle du sachet.
- Notes joueur 8/8. E2E ciblés initialement 2/4 : règle du reflet trop
  spécifique réactivait son nom d’animation en mouvement réduit. Corrigée
  avec variables CSS dans l’animation existante ; relance réussie 4/4
  (bureau/téléphone : géométrie 320/390, CTA, mouvement réduit). Build Next
  réussi, cinq pages statiques, sans cloud local : compilation seulement.
- Code et note joueur au commit [b8b0b248](https://github.com/GoodFight37/CreatorDeck/commit/b8b0b2487155ed47a97cebe24c6dc2718fb4d069),
  push normal main et SHA distant confirmés. Statut Vercel `success` ;
  production `https://creator-deckk.vercel.app/` contrôlée à 390 × 844 :
  matrices différentes après trois secondes, reflet 4 s, overflow visible,
  document 390 px ; idle arrêté avec mouvement réduit. Capture production
  `/tmp/creatordeck-volume-production.png`. Aucun ressenti sur appareil physique affirmé.
- [CI GitHub](https://github.com/GoodFight37/CreatorDeck/actions/runs/38736932904)
  en cours au dernier contrôle. Ne pas assimiler le build et les contrôles
  ciblés locaux au succès de toute la CI. Ancien défaut de vocabulaire Trades
  documenté dans D-109 ; aucune modification de ce pilier.

## Checkpoint courant — scène d’accueil Drop D-109, publiée sur Vercel

- Départ : main local propre `69e6951d14f2d924a6a86cd84dc6afe3f7de7bf0`,
  identique à GitHub après fetch ; aucune PR ouverte. Malik demande une refonte
  visuelle de l’accueil Drop seulement, sans autre pilier, audio, rates ou SQL.
- Capture avant à 390 × 844 : pack grand mais posé sur fond noir, ticket crème
  dominant. D-109 : scène bordeaux radiale, sol et double ombre, côtés foil
  plus visibles, sheen, entrée 380 ms et idle 4 px avec réduction de mouvement ;
  CTA plein large à pression visible ; label LIVE DROP · 5 sur une ligne ;
  chrome Drop affiné, direct discret. Garantie, sabliers et jetons sous « Plus
  d’infos » replié. Le sablier reste utilisable après ouverture du volet.
  Vibration courte au tap du pack via la fonction déjà disponible, sans
  vibration sur glissement. Aucun calcul de jeu ni BGM modifié.
- Captures locales `/tmp/creatordeck-drop-before.png` et
  `/tmp/creatordeck-drop-after-final-390.png` inspectées à 390 × 844 ; capture
  320 × 568 inspectée. Largeur document = viewport ; CTA 320 entièrement
  au-dessus de la navigation basse après correction des anciens overrides de
  `drop-craft.css`.
- DOM Drop/Binder/tactile/notes 24/24 ; note de version 8/8 ; TypeScript,
  ESLint ciblé et build Next réussis.
  E2E Drop/Binder 6/8 à la première passe, deux assertions sur l’ancienne
  géométrie latérale en échec ; flanc biseauté corrigé, E2E 390 2/2.
  Pack/art/drag 8/8 observés avant interruption de session, deux scénarios
  téléphone restants rejoués 2/2. Cloud simulé sablier : échec initial car
  volet replié, puis scénario complet bureau/téléphone 2/2 après adaptation
  du test aux trois rechargements. E2E Drop/Binder complet 14/14 après
  corrections.
- Code et note joueur publiés sur `main` au commit `bdb0dffb5efb62d084c54f91e63a17f0fc68417f`
  ([commit](https://github.com/GoodFight37/CreatorDeck/commit/bdb0dffb5efb62d084c54f91e63a17f0fc68417f)).
  Statut GitHub Vercel `success`, production `https://creator-deckk.vercel.app/`
  HTTP 200 et capture Chromium production 390 × 844 inspectée : scène,
  booster, CTA et « Plus d’infos » visibles, sans débordement.
  [Vérification GitHub](https://github.com/GoodFight37/CreatorDeck/actions/runs/38733835347)
  encore en cours lors de ce checkpoint ; son job statique/build s'arrête
  aux tests unitaires. Reproduction locale sur ce SHA : `npm test`, 1 185/1 186
  tests réussis (75/76 fichiers), seul échec `src/lib/jargon.test.ts` sur
  « serveur » dans `src/components/account/trades-panel.tsx:379`, déjà présent
  avant D-109 et hors périmètre demandé. Les étapes suivantes de ce job sont
  ignorées par CI, mais typecheck, lint ciblé et build ont réussi localement.
  Ressenti tactile physique toujours à valider par le joueur.

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
# Checkpoint — reprise locale du 16 octobre 2026

- Demande de Malik : reprendre `CreatorDeck-Codex` sur `codex/collaboration`,
  préserver `ea1135c` et le SVG Mèmes non commité, lire l'état/roadmap et avancer
  sans intervention sur les tâches autonomes.
- Au début de la reprise, branche `codex/collaboration`, HEAD
  `ea1135c6b830c9d0a70e1c9318cec59a1c9f7f2d`; commit précédent
  `c9b3d59a` (`origin/main` local). Deux changements non commités observés :
  ce checkpoint dans `docs/agent-handoff.md` et le brouillon
  `public/packs/memes-opening.svg`; le SVG est conservé intact et exclu de toute
  action.
- Git a refusé initialement les commandes à cause de `dubious ownership`.
  Contrôles locaux ensuite réussis avec `git -c safe.directory=<checkout>`
  limité au processus, sans modifier la configuration globale.
- La première tentative `git ls-remote --heads origin` échouait dans le bac à
  sable (`Could not resolve host: github.com`). Avec l'accès réseau autorisé,
  la référence distante a été vérifiée : `origin/main` était
  `c9b3d59a2ecd8aa712553a1c0803828c5a287fe7`, parent direct du HEAD de départ.
  Le push normal a ensuite publié `40a3b81de773a761712179be3a7e17ce1480e2b8`
  sur `main`; `ls-remote`, GitHub commit metadata et Vercel confirment ce SHA.
- Lecture de la roadmap : aucun défaut de code reproduit ouvert dans le plan.
  Restent les essais de rendu/toucher/son sur le téléphone de Malik, le choix
  visuel des portraits, le code booster privé qui dépend de l'adresse du compte
  et du SQL Editor, et des parcours sociaux de production avec données de test.
  Les idées sans droits, contenu ou critères ne sont pas engagées. Aucun lot
  autonome de code identifié ; ne pas inventer de nouvelle fonctionnalité.
- Aucun test applicatif lancé, aucune dépendance installée, aucun fichier de
  jeu modifié. `git diff --check` passe sur le checkpoint. Le commit documentaire
  initial `40a3b81d` ne contient que ce fichier et a été publié normalement.
  Vercel Production est `READY` sur ce même SHA (`dpl_EpyzhkBemMfgHmRxkYcxqRxNS2W9`,
  alias `https://creator-deckk.vercel.app/`). Le contrôle de statut GitHub du
  SHA ne renvoie que Vercel `success`; aucun run Actions n'est associé par les
  outils disponibles. Le SVG reste le seul changement local non commité.
- Délégation Claude : script et garde-fous inspectés ; le test réel réussi
  consigné plus haut dans cette passation suffit à établir son fonctionnement.
  Aucun nouvel appel payant ni test de délégation relancé.
- Prochaine action : avant une publication ultérieure, fetcher et comparer la
  branche distante au HEAD courant. Malik peut
  ensuite fournir un retour tactile/visuel concret, ou l'adresse exacte du
  compte pour le code privé; ces éléments ne sont pas remplaçables par des
  tests simulés.
# Checkpoint — contraste du sélecteur Drop après revue Claude (16 octobre 2026)

- Base locale : `codex/collaboration`, SHA `7c069711b7d0937f68acd0b674023629287d64dd` ; GitHub liste ce SHA comme dernier commit et son contrôle Vercel est `success`. `git ls-remote` échoue encore en DNS (`Could not resolve host: github.com`), donc la lecture distante directe reste indisponible.
- Malik a demandé une tâche utile avec Claude. Le script existant `scripts/delegate-claude.mjs` a transmis une revue ciblée, en lecture seule, du sélecteur Drop ; premier essai bloqué par les droits Windows du worktree Claude, second réussi avec les droits requis. Aucun test ni changement Claude. Retour : pills button sémantiques, `aria-pressed`, focus visible et cibles 44 px ; voisin non interactif et masqué aux lecteurs d’écran. Défaut concret : texte blanc 13 px sur `#e8382c`, contraste calculé 4,17:1 ; Claude recommande assombrir la pill active. Risques secondaires non reproduits : mode `forced-colors` et `aria-label` sur conteneur sans rôle.
- Correctif local D-134 : fond/bordure de pill active `#d52820`, contraste blanc calculé 5,06:1. Aucun changement du rituel, des taux, des données ou des autres piliers. Ajout d’une note joueur, décision, suivi de problème et roadmap ; les statuts D-132/D-133 sont réconciliés avec leur publication/CI déjà vérifiées.
- Vérifications sur le diff local basé sur `7c069711` : `npm run ecrans -- drop-binder` réussi, 17/17 ; `npm run typecheck` réussi ; `git diff --check` réussi après correction des fins de fichiers. Le calcul WCAG a été exécuté avec Node ; aucun navigateur, lecteur d’écran ou téléphone testé. Aucun run CI du correctif local.
- Fichiers de ce lot : `src/components/booster-carousel.css`, `src/lib/release-notes.ts`, `docs/decisions.md`, `docs/known-issues.md`, `docs/roadmap.md`, ce checkpoint. Commit `cc7a61d2a8a6dc5e389c2098ccb4a14295fdbfc1` poussé normalement sur `main` après échec DNS du premier essai local ; GitHub confirme ce commit en tête et le contrôle Vercel `success` sur son SHA exact. CI GitHub générale non consultable via les outils de cette session après push.
- Préserver les modifications préexistantes : `public/packs/memes-opening.svg` modifié et `.codex-remote-attachments/` non suivi, tous deux hors commit.

# Checkpoint — Drop allégé et rituel prioritaire (16 octobre 2026)
