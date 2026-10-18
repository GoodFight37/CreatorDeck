# Qualité mobile autonome — état local du 18 octobre 2026

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
Un échec laisse une commande, un SHA, un compte de tests, la cause et les
preuves à fournir à Codex. Le lanceur ne tente aucune correction automatique.

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
d'accessibilité confirment l'accueil. Installation de release, bandeau de mise
à jour, données du jeu et vrai téléphone restent non vérifiés. Le runner GitHub auto-hébergé
n'est pas installé : exécuter des PR d'un dépôt public sur le PC personnel
donnerait au code soumis accès à la session Windows. La tâche locale et les
runners GitHub hébergés couvrent pour l'instant les contrôles sûrs, sans nouveau
jeton. `act` n'est pas nécessaire à l'orchestration.
