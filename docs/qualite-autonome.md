# Qualité autonome — phase 2 publiée, 19 octobre 2026

Le 19 octobre, le correctif local du smoke Android a réussi sur l'AVD matériel :
`reports/android-smoke/2026-10-19T01-45-28-650Z/result.json`. Le helper de
revue Claude exige maintenant `CREATORDECK_ALLOW_PAID_CLAUDE=1` pour chaque appel
consenti ; par défaut il s'arrête avant toute invocation. Aucun appel Codex ou
Claude n'a été réalisé dans cette reprise. Le scénario d'incident artificiel
vérifie la reprise unique, l'expurgation et la déduplication, mais ne prouve pas
une correction automatique. `npm.cmd run test:autonomy` : 15/15, typecheck : vert.
Le runner auto-hébergé et la correction automatique restent désactivés tant
qu'une isolation sûre et des limites d'exécution vérifiées ne sont pas en place.

## État vérifié dans cette reprise

- Commit de code `abd093973c4407876d155637794851d5ac1d3d73` ; PR
  [#14](https://github.com/GoodFight37/CreatorDeck/pull/14) fusionnée dans
  `main` au SHA `21ef428ed4455cd086d4a133d911489f3e110140`.
  Vérifications PR [39179902283](https://github.com/GoodFight37/CreatorDeck/actions/runs/39179902283)
  et main [39180481883](https://github.com/GoodFight37/CreatorDeck/actions/runs/39180481883)
  réussies. Supabase [39180896697](https://github.com/GoodFight37/CreatorDeck/actions/runs/39180896697)
  réussi. APK [v872830](https://github.com/GoodFight37/creatordeck-apk/releases/tag/v872830)
  publiée par le run [39180896682](https://github.com/GoodFight37/CreatorDeck/actions/runs/39180896682).
  Vercel Production est `READY` sur le SHA de `main`.

- Les contrôles `npm run test:autonomy` couvrent
  14 contrats Node : provenance APK, rapport CI, attente Android, retry local,
  diagnostic expurgé et déduplication. Résultat : 14/14, aucun échec/ignoré.
  `npm test -- --maxWorkers=2` : 1301/1301 sur 94 fichiers. `npm run typecheck`
  et ESLint ciblé sont verts.
- `npm run lint -- --ignore-pattern 'android/**/build/**'` sort avec code 0 et
  une alerte dans un bundle généré sous `android/app/src/main/assets/public/`;
  ce n’est pas une erreur de source. Le contrôle n’a pas ignoré cet asset.
- ESLint ciblé sur tous les scripts MJS ajoutés/modifiés et `node --check` sur
  les scripts d’entrée passent (code 0). `git diff --check` passe, avec seulement
  les avertissements CRLF de Git sur des fichiers Windows.
- `npm run build` passe : Next.js 16.3.6 compile et génère les six pages
  statiques, sans variables Supabase cloud dans l’environnement local.
- `npm run quality:mobile` passe en manuel : rapports et captures dans
  `reports/mobile-quality/2026-10-18T23-55-53-846Z-13ed8945/summary.md`;
  orchestrateur, typecheck et 7/7 scénarios E2E téléphone.
- La tâche Windows planifiée `CreatorDeck-Qualite-Mobile` existe (`Ready`,
  répétition 4 h, compte Administrator à RunLevel limité). Déclenchée avec
  `Start-ScheduledTask`, elle termine `LastTaskResult=0` et produit
  `reports/mobile-quality/2026-10-19T00-11-58-241Z-13ed8945/summary.md` :
  7/7 scénarios E2E téléphone.
- Le lanceur rejoue une étape en échec une seule fois. Une reprise réussie est
  transitoire et ne crée pas d’incident. Un échec persistant est dédupliqué par
  SHA et empreinte; seul le premier constat écrit `reports/mobile-quality/incidents/`
  et une commande de diagnostic Codex en lecture seule. Aucun appel Codex,
  aucune correction ni publication n’est lancé par ce code.
- La CI produit un petit artefact sans IA ni ticket si un job échoue, avec le
  SHA, le lien du run, les jobs échoués et les noms de scénarios Playwright
  expurgés. Les jobs de Vérification ont réussi; aucun artefact d’échec n’a été
  généré car aucun job n’a échoué.
- `.github/workflows/apk.yml` n’a plus de `workflow_dispatch`. La publication
  reste automatique après une Vérification réussie sur le push `main`; pour
  reprendre une APK échouée, relancer le job du run APK original. Le garde de
  provenance a 3 tests locaux; le run APK `39180896682` a confirmé la Vérification
  verte du même SHA et a publié la release `v872830`.
- `js-yaml` parse localement les deux workflows (APK : 2 jobs; Vérification :
  5 jobs), sans erreur. Vérification, workflow Supabase et workflow APK ont
  tous été exécutés avec succès après le merge.
- `codex` est installé et connecté dans cette session; la CLI Claude aussi.
  Aucun appel modèle n’a été fait. L’auto-correction reste désactivée tant que
  l’isolation hors ligne et l’exécution de tests dans un export séparé ne sont
  pas démontrées. `delegate-claude.mjs` reste une revue manuelle conditionnelle.
- Les diagnostics Android restent opt-in, sur l’appareil, bornés à 100
  événements, effaçables et sans contenu/URL/identité. Aucune télémétrie
  distante ni donnée personnelle n’est ajoutée.
- Aucun service Runner GitHub auto-hébergé n’est installé. Le SDK/AVD existe.
  Le 19 octobre, Claude a attribué les six crashes QEMU à SwiftShader via les
  dumps WER; le renderer NVIDIA matériel (`-gpu host`) les évite. L’AVD local
  `CreatorDeck_API36` a été réglé sur `hw.gpu.enabled=yes`, `hw.gpu.mode=host`;
  sa sauvegarde est hors dépôt. Le script smoke rejette désormais SwiftShader,
  inspecte la WebView via l’API Android Playwright en filtrant le PID courant,
  impose 5 s à sa connexion et autorise les captures jusqu’à 64 Mio. La passe
  `npm run quality:android -- reports/android-smoke/initial-872393.apk
  reports/android-smoke/update-872394.apk` a terminé code 0 : 872393→872394,
  navigation Binder/Atelier/Drop, sauvegarde et marqueur conservés. Preuve :
  `reports/android-smoke/2026-10-19T01-35-58-377Z/result.json`; après ajout de
  `install -r -d` pour rendre les passages répétés possibles sans effacer les
  données, Codex a refait la passe avec code 0 dans
  `reports/android-smoke/2026-10-19T01-45-28-650Z/result.json`. Passe `-gpu host`
  aussi verte dans `01-33-05-764Z/`. Ce marqueur ne prouve pas la conservation
  des préférences/collections réelles du joueur; l’installateur du bandeau reste
  un parcours distinct. Aucun test Android n’a encore tourné sur runner GitHub.

# Qualité mobile autonome — état de la phase 1 (18 octobre 2026)

`npm run quality:mobile` lance en série les tests du rapport, le typecheck et sept
parcours Chrome tactiles. Les captures couvrent 320×568, 390×844, 412×915, les
quatre espaces, le sachet, sa déchirure au doigt, la révélation et la persistance
des réglages de son. Le JSON joint aux parcours instrumentés
contient les durées d'interaction, le nombre d'images espacées de plus de 50 ms
et l'image la plus lente pendant l'interaction (600 ms par onglet, 1 200 ms à la
révélation). Ce sont des observations du
navigateur, pas une mesure de fluidité sur Android réel. Elles sont archivées
pour comparaison ; aucun seuil de fluidité n'est présenté comme une vérité
Android. Les traces et captures
d'échec de Playwright sont conservées. `npm run quality:mobile:full` ajoute les
suites unitaires et d'écrans (deux workers maximum) ainsi que tous les e2e du projet mobile.

Chaque passage écrit un `summary.md`, un `summary.json`, les mesures et six
captures choisies dans `reports/mobile-quality/<date>-<SHA>/`. Le rapport HTML
complet est dans `playwright-report/index.html`, les autres captures et traces
dans `test-results/` jusqu'au prochain passage.
Ces trois dossiers sont ignorés par Git. Un succès ne déclenche aucun appel IA.
Un échec persistant laisse un paquet avec SHA, commande, cause courte et preuves
à fournir à Codex. Le lanceur ne tente aucune correction automatique.

Sur ce PC, la tâche Windows `CreatorDeck-Qualite-Mobile` lance le mode rapide
toutes les quatre heures quand la session de Malik reste ouverte. Elle utilise
un jeton Windows **limité**, une seule instance et un délai maximum de 25 min.
`scripts/install-mobile-quality-task.ps1` crée la tâche sans écraser une tâche
homonyme différente. Pour la suspendre : désactiver
`CreatorDeck-Qualite-Mobile` dans le Planificateur de tâches Windows. La tâche
lit le checkout local tel qu'il est à l'heure du lancement ; le rapport indique
le SHA, mais des fichiers non commités peuvent également être testés.

Le lanceur vide les variables publiques Supabase pour ses sous-processus : ces
contrôles n'interrogent pas la production. Les parcours d'observation bloquent
aussi les requêtes hors `localhost`. Les rapports retirent les valeurs de clés,
jetons et mots de passe des sorties courtes. La CI GitHub existante continue à
tester les branches ; elle joint maintenant les observations mobiles pendant
trois jours. Push et PR du même SHA partagent une clé de concurrence pour éviter
deux séries complètes en parallèle. Elle n'a pas de secret dans son job navigateur.

Dans Toi → Réglages, « Diagnostics sur cet appareil » est **désactivé par
défaut**. Une fois activé, le journal local garde au plus 100 types d'erreurs
ou de lenteurs et leurs durées. Il ne garde ni message, ni URL, ni carte, ni
identité et n'envoie rien. Le joueur peut choisir « Partager le diagnostic » ;
couper le réglage efface le journal. L'export indique `web` ou `android` et le
SHA du build. Les API de performance indisponibles dans une WebView sont
simplement ignorées.

Le SDK Android et `emulator.exe` étaient présents, mais aucun appareil virtuel
ni image système n'étaient configurés au début de ce chantier. Les outils de
ligne de commande officiels ont été téléchargés avec le SHA-256 attendu ;
l'image Android 36 et l'AVD `CreatorDeck_API36` sont maintenant présents.
Après redémarrage Windows, WHPX est utilisable et l'AVD a démarré.
`npm run quality:android -- <premiere.apk>
[mise-a-jour.apk]` fournit un essai sur un seul émulateur : installation,
démarrage, captures et, avec deux APK debug, versionCode croissant et marqueur
de stockage privé conservé. Ce marqueur ne prouve pas la conservation de la
collection ni des préférences du jeu. Deux APK debug locales sans configuration
cloud ont été construites (`initial-872393.apk`, `update-872394.apk`) ; la
compilation Gradle et `cap sync` ont réussi. Le test sur `CreatorDeck_API36` a
terminé avec le code 0 : installation, lancement, versionCode `872393` →
`872394` et marqueur conservé. Rapport et captures :
`reports/android-smoke/2026-10-18T22-24-05-376Z/`. Les captures immédiates du
script étaient encore sur le chargement ; une capture après attente et l'arbre
d'accessibilité confirment l'accueil. Depuis, Malik a confirmé sur son téléphone
une mise à jour depuis le bandeau vers l'APK publiée v872721, sans erreur et avec
ses cartes/réglages conservés. Ce retour n'inclut pas de capture ni de journal
technique de l'appareil. Le runner GitHub auto-hébergé
n'est pas installé : exécuter des PR d'un dépôt public sur le PC personnel
donnerait au code soumis accès à la session Windows. La tâche locale et les
runners GitHub hébergés couvrent pour l'instant les contrôles sûrs, sans nouveau
jeton. `act` n'est pas nécessaire à l'orchestration.
