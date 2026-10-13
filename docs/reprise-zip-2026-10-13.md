# Reprise du travail local CreatorDeck — 13 octobre 2026

## Intégrité et synchronisation

Archive reçue : `CreatorDeck-tous-les-changements-locaux.zip`.
SHA-256 : `d5e269f6b63156b46c1c642d671fb3b621ee40759b2537946d447438881c7fcd`.
Git HTTPS et API `gh` authentifiés comme GoodFight37 dans cette session.
Checkout initial propre sur la branche locale `work`, au SHA de base
`6f63374bc38f2746fb5e4c73db5dea50243d5274`. Main distant et fetch vérifiés
au même SHA ; aucun commit depuis cette base, aucune PR ouverte au relevé.
Branche locale `main` créée depuis `origin/main`, sans reset ni perte de fichier.

40 fichiers source contrôlés par SHA-256 avec `manifest.json`. Patch binaire
inspecté, `git apply --check` réussi puis application ; les 40 fichiers ont
été comparés à nouveau et étaient identiques à l’archive. Aucune suppression.
Le README de l’export décrit à tort un bundle Git et un projet complet :
le ZIP reçu contient les 40 fichiers modifiés/ajoutés, le patch, le manifeste
et les preuves ; le bundle mentionné n’y figure pas. L’historique déjà présent
sur GitHub permet la récupération complète du travail sauvegardé.

Preuves originales (18 fichiers, vidéo et journaux compris) conservées hors Git
à `/workspace/artifacts/booster-visible-2026-10-13/`, également dans le ZIP reçu
et `/workspace/recovery-creatordeck/preuves-booster/`.
Nouveaux journaux : `/workspace/recovery-validation/`.

## Deux lots distincts

- **Portraits** : 20 nouveaux WebP 900 px, sources/cadrages/suivi, registre
  10 → 30 sans modification des dix entrées existantes, script de recherche
  récupéré. Les portraits manuels déjà publiés ont priorité pour 18 des 20 ;
  Livibee et 9pasha utilisent leurs nouveaux curated. Aucun travail de recherche
  recommencé. [Passation ciblée](passation-portraits.md).
- **Booster** : impression Live/Scène, rabat sous le doigt et repli, coque
  visible à la première face, cue swipe après flip, garde mouvement réduit,
  tests et quatre références visuelles restaurés. 3D toujours désactivée
  par défaut. Drop/Binder/Craft/Tribunal/menus non refondus.
  [Rapport de la vague](booster-visible-2026-10-13.md).

Écarts volontaires au ZIP : fins de ligne CR retirées uniquement sur 22 lignes
ajoutées signalées par `git diff --check` (CSS et test de peel), test navigateur
portraits renforcé pour les deux nouveaux curated affichés ; documentation de
reprise ajoutée/actualisée. Aucun comportement produit supplémentaire changé.

## Vérifications de cette session

Code vérifié : base ci-dessus + les deux lots restaurés et le test renforcé.
Les résultats de l’ancienne session sont conservés comme historique et ne
remplacent pas les runs de cette reprise.

| Contrôle | Commande | Résultat |
| --- | --- | --- |
| Portraits, préchargement, crédits | `npm test -- src/lib/creator-portraits.test.ts src/lib/portraits.test.ts src/lib/preload.test.ts src/lib/credits.test.ts` | 51/51 |
| DOM booster et crédits | `npm run ecrans -- src/ecrans-effets.test.tsx src/ecrans.test.tsx src/ecrans-credits.test.tsx` | 32/32, dont 2 crédits |
| Types | `npm run typecheck` | réussi |
| ESLint ciblé | composants restaurés, tests modifiés et script de collecte | réussi |
| Script de collecte | `node --check scripts/research-portraits.mjs` | réussi ; aucune collecte lancée |
| Catalogue | `npm run catalog:ci` | réussi |
| Vocabulaire | `node scripts/check-jargon.mjs` | réussi |
| Compilation | `npm run build` | réussie, export statique sans cloud |
| Whitespace | `git diff --check` | réussi après correction des CR ajoutés |
| Navigateur | `npm run e2e -- e2e/pack-tear.spec.ts e2e/portrait-credits.spec.ts` | 32/32, dont 30 ouverture et 2 portraits ; captures strictes réussies |

Installation initiale incomplète : jsdom/Playwright/Capacitor/Three manquants,
DOM/types/build échouaient pour ces dépendances. Résolu par `npm ci
--no-audit --no-fund` depuis le lock inchangé, puis rejoués avec succès.
Chromium installé à la version du Playwright verrouillé. Les sources portraits
sont celles sauvegardées, sans nouvelle vérification de licences en ligne.
Ni téléphone physique, ni Android, ni production Supabase testés ici.
Aucun SQL modifié ; les suites SQL et cloud complètes restent celles de la CI.

Suite complémentaire `npm run e2e -- e2e/pack-foil-3d.spec.ts` : **12/12**
scénarios GPU/2D, animationend et secours réussis. Total navigateur **44/44** :
42 ouverture (30 + 12), 2 portraits. Références visuelles du ZIP validées sans
régénération ni changement de tolérance.

## Publication

Commits ciblés puis push normal sur `main` après nouveau contrôle du HEAD
distant prévus. Aucun force-push ni réécriture d’historique. La CI de la base
[38321561095](https://github.com/GoodFight37/CreatorDeck/actions/runs/38321561095)
est success ; elle ne valide pas les deux lots récupérés. Les SHAs et nouveaux
liens CI seront relevés après publication ; ne pas annoncer leur succès avant
observation. Réservation libérée en fin de reprise.
