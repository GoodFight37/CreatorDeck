# Imgflip et créations depuis les cartes possédées

Le 21 octobre 2026, l’importateur Windows a validé 200 modèles gratuits : 100 images et 100 modèles animés (MP4 officiels conservés + GIF dérivés). Le jeu reste un export statique Next.js/Capacitor avec les possessions Supabase existantes ; aucune API de création payante ni serveur Python n’est ajouté au jeu.

## Parcours du joueur

Dans `/memes`, ouvrir une carte obtenue et choisir **Créer un mème avec cette carte**. Le bouton est absent pour une carte non possédée ou sans illustration. L’éditeur utilise une copie de l’illustration, plusieurs zones de texte (20 maximum), des positions relatives, une taille et une couleur modifiables. L’image peut être touchée pour positionner le texte ; les curseurs et champs offrent la même action au clavier.

**Créer le fichier** relit `meme_status` pour vérifier la possession actuelle, puis produit un PNG ou un GIF dans le navigateur. Cela ne touche ni `meme_catalog`, ni `meme_collection`, ni les exemplaires. Le fichier n’est envoyé à aucun serveur. Téléchargement/partage explicite dans le navigateur ; dans l’APK Android, le plugin local `MemeExport` ouvre le sélecteur système de création de document. Aucune permission générale de stockage n’est ajoutée. L’annulation et la fermeture interrompent l’export.

L’éditeur et l’encodeur GIF sont chargés à la demande. L’aperçu peut être mis en pause et respecte le mouvement réduit ; cela ne fige pas le GIF exporté. Le décodage GIF utilise `ImageDecoder` natif : Chromium/Android WebView récents ; les appareils sans cette API reçoivent un message explicite et conservent leur original. Les frames sont décodées et refermées une à une ; les durées, le nombre de répétitions et la transparence sont réencodés. Limites : 25 Mo par fichier, 1 000 frames, 100 millions de pixels cumulés, 16 millions par frame. L’export GIF utilise une palette de 256 couleurs, comme le format source. Il n’aplatit pas l’animation et ne la tronque pas.

## Passage de l’importateur au catalogue

`src/data/imgflip.json` est séparé de `memes-fr.json` et vide tant qu’aucun droit n’est validé. Les cartes approuvées utilisent `imgflip-<id>` ; les identifiants, numéros et cartes MyMemeCards existants sont conservés. Le rendu de carte affiche la source Imgflip et son lien lorsqu’ils sont présents.

Audit local sans modification :

```powershell
node scripts/import-imgflip.mjs --bundle CHEMIN/imgflip-cards.json
```

Le bundle réel de l’importateur a donné **0 approuvé, 200 bloqués, aucun fichier écrit, aucune base modifiée**. C’est attendu : les conditions Imgflip ne donnent pas une licence générale de redistribution dans le jeu. Il faut documenter les permissions de redistribution et de modification auprès des titulaires des droits ; une statistique de popularité ou un nom de modèle ne constitue pas une autorisation.

Le fichier de validations est un tableau JSON. Chaque décision doit renseigner explicitement `key`, `sourceSha256` (empreinte du média original), `number` (numéro libre), `rarity` (décision de jeu), et `rights` contenant `owner`, `evidenceUrl` (HTTPS), `note`, `redistribute: true`, `modify: true`, `reviewedAt` (date passée). Ces éléments sont des justificatifs à examiner, pas des droits calculés par le programme. Aucune validation de ce type n’a été inventée pour les 200 modèles. Archiver ce fichier opérateur : les notes et liens de preuve ne sont pas copiés dans le catalogue public, qui conserve seulement le crédit, la source et le statut de validation lié à l’empreinte.

Une fois les validations réellement obtenues :

```powershell
node scripts/import-imgflip.mjs --bundle CHEMIN/imgflip-cards.json --approvals CHEMIN/droits-valides.json
node scripts/import-imgflip.mjs --bundle CHEMIN/imgflip-cards.json --approvals CHEMIN/droits-valides.json --write
```

Le script vérifie les identités, les doublons, les numéros, les chemins contenus dans le bundle, les tailles et les empreintes avant d’écrire les médias approuvés dans `public/imgflip/` et d’actualiser le catalogue. Il produit `reports/imgflip-catalog.sql`, uniquement des INSERT/UPSERT dans `meme_catalog`, dans une transaction. Le SQL est **à relire et appliquer séparément sur la cible approuvée** ; le script ne contacte pas Supabase. L’approbation de publication de données sensibles imposée par `AGENTS.md` reste applicable. Ne pas publier le catalogue client sans son catalogue serveur correspondant.

## Validation

Tests de logique : `src/lib/meme-editor.test.ts`, tests catalogue existants. Import : `node --test scripts/import-imgflip.test.mjs`. Parcours réels : `e2e/meme-editor.spec.ts`, PNG, GIF à deux frames/durées distinctes et trois lectures, carte absente et possession perdue avant export. Les RPC de possession y sont simulés ; ces scénarios ne sont pas des essais sur des comptes de production.

Les résultats exécutés et les limites Android/publication sont consignés dans le checkpoint courant de `docs/agent-handoff.md`.

Résultat final local du 21 octobre : 3 tests du pont d’import, 12 tests de logique/notes/catalogue et 12 parcours navigateur réussis ; lint ciblé et build webpack final réussis. L’essai Android réel sur émulateur API 36 a enregistré et relu un GIF de 2 frames, durées 80/140 ms, 3 lectures. L’APK normale est dans `android/app/build/outputs/apk/debug/app-debug.apk` (`imgflip-local`), signature v2 vérifiée. Pas de validation sur téléphone physique ni avec compte de production ; aucune publication. Le contrôle général reste rouge (34 réussites, 3 échecs, 2 ignorés, 183 non exécutés) et les 200 modèles sans droits validés restent hors du catalogue distribué.
