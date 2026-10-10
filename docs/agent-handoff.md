# Passation opérationnelle CreatorDeck

## Checkpoint courant — K-010 corrigé, 10 octobre 2026, 11 h 53 Europe/Paris

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
