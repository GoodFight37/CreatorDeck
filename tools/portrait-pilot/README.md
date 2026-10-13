# Pilote automatique de portraits

Outil local ajouté au chantier CreatorDeck : recherche de photos, élimination
de candidates et cadrage par détection de visage, puis galerie avant/après.
Les 300 choix manuels, les portraits Commons déjà intégrés, Diverron et les
avatars génériques explicitement acceptés sont exclus. Le jeu n’est jamais
modifié : les sorties vont dans `reports/portrait-pilot/` ou hors dépôt.

## Revoir le pilote livré

Extraire **tout** le ZIP, puis ouvrir `index.html` dans Edge ou Chrome. Aucun
serveur, modèle IA ni clé API n’est nécessaire pour cette revue. Les images
sont locales. Examiner les propositions, conserver l’actuelle quand nécessaire,
puis **Exporter mes choix**. Le fichier `choix-portraits-pilote.json` contient
les décisions et références, en brouillons visuels. Conserver aussi le ZIP.

La galerie indique les rejets : nom absent, plusieurs visages, détail du
cadrage insuffisant, fichier inaccessible ou même image pour plusieurs
créateurs. « Proposition technique » ne signifie ni bonne personne, ni droits
confirmés, ni avis esthétique. Le score de netteté est indicatif seulement.
Les personnes et sources seront vérifiées avant une intégration au jeu.

## Lancer un autre lot depuis le dépôt

Préparer les dépendances Node du dépôt (`npm ci`), puis un environnement Python
isolé (Python 3.12 utilisé lors du pilote) :

```powershell
py -3.12 -m venv tools/portrait-pilot/.venv
tools/portrait-pilot/.venv/Scripts/python.exe -m pip install -r tools/portrait-pilot/requirements.txt
```

Sous Linux, MediaPipe peut aussi nécessiter le paquet système `libgles2`, même
en traitement CPU. Modèle, interpréteur et bibliothèques sont contrôlés avant
la première requête de recherche. Une installation manquante doit être réparée
avant de consommer le quota du service.

Les dimensions annoncées par le moteur servent à examiner d’abord les grandes
photos. Elles ne sont pas considérées comme une preuve : le fichier téléchargé
est décodé et la taille du cadrage réellement possible est mesurée ensuite.

Télécharger le [modèle Face Detector de MediaPipe](https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite)
dans `reports/portrait-pilot-model.tflite`. Il détecte une zone de visage ;
il ne reconnaît pas la personne et ne génère aucun pixel du portrait.

Saisir la clé **dans ton terminal**, pas dans le dépôt ou le chat :

```powershell
$portraitKey = Read-Host "Clé SerpApi" -AsSecureString
$env:SERPAPI_API_KEY = [System.Net.NetworkCredential]::new("", $portraitKey).Password
$env:NODE_USE_ENV_PROXY = "1"
node tools/portrait-pilot/pilot.mjs --python tools/portrait-pilot/.venv/Scripts/python.exe --model reports/portrait-pilot-model.tflite --limit 20
Remove-Item Env:SERPAPI_API_KEY
```

Ouvrir ensuite `reports/portrait-pilot/index.html`. Les recherches réussies et
images téléchargées sont conservées : relancer le même dossier les réutilise,
sans nouvelle recherche facturée. Le script s’arrête d’envoyer des recherches
après un refus du service (clé, quota, réseau). Les téléchargements refusés
sont signalés ; aucune protection de site n’est contournée.

Un fichier `--creators selection.json` permet un lot ciblé (`[{"slug":"humzh"}]`).
Il est vérifié contre le catalogue et filtré pour protéger les images déjà
choisies. `--aliases aliases.json` accepte une liste de termes par slug ; les
alias sont des formulations de recherche, pas une preuve d’identité.
`--candidates 3` limite les images analysées par créateur (maximum 5).
Les limites de lot sont 1–50 créateurs. Aucun achat ni abonnement n’est géré
par l’outil ; les requêtes utilisent le compte SerpApi déjà configuré.

`--retry-empty` permet explicitement de refaire uniquement les recherches
enregistrées sans résultat, avec la formulation actuelle. Cette option consomme
des requêtes supplémentaires ; elle conserve l’historique des formulations.
Les échecs de téléchargement sont aussi conservés. `--retry-downloads` permet
de les retenter explicitement après un changement d’accès ou un incident réseau.

## Réutiliser des résultats sans clé

`--input dossier/search` importe des JSON normalisés :

```json
{"slug":"humzh","provider":"imported-search","query":"humzh portrait","candidates":[{"title":"Titre","source":"https://example.com/page","original":"https://example.com/photo.jpg"}]}
```

Chaque fichier s’appelle `<slug>.json`. Les URL doivent être HTTPS. Le nom du
fournisseur est conservé dans le manifeste pour distinguer un vrai run SerpApi
des recherches d’une autre session. Aucune clé n’est incluse dans ces fichiers.

## Vérifications du code

```sh
node --test tools/portrait-pilot/pilot.test.mjs
```

Le navigateur du dépôt (Chromium Playwright) est nécessaire à ce contrôle.
Le pilote réel mesure séparément résultats trouvés, téléchargements, analyses,
propositions techniques et images actuelles conservées. Les clés et les
modèles téléchargés ne sont pas versionnés. Les fichiers tiers restent hors
Git ; seuls le code, les instructions et le bilan sont publiés.
