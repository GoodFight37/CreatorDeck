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

Code audité et publié : `93626653d8f3cc34412b4a752b9f0a5455918d2a` (les deux lots restaurés et le test
renforcé). Les tests ont tourné avant commit sur ces fichiers, inchangés ensuite ;
seule la documentation est actualisée après publication.
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

## Publication vérifiée

Deux commits ciblés publiés par push normal sur `main` :

- [Portraits cf25f665](https://github.com/GoodFight37/CreatorDeck/commit/cf25f665dd217ea8e6689502d08dca85d07f9c36).
- [Booster 93626653](https://github.com/GoodFight37/CreatorDeck/commit/93626653d8f3cc34412b4a752b9f0a5455918d2a).

Avant chaque commit/push : branche/HEAD et main distant revérifiés ; aucun
commit concurrent observé. Push `6f63374b..93626653` réussi, puis `git ls-remote`
a confirmé le SHA produit ci-dessus. Le blob du rapport distant correspond
à celui du commit local (API GitHub). Aucun reset ni force-push.

Au relevé **13 octobre 2026, 09:54:12 UTC**, la nouvelle
[CI Vérification 38379579144](https://github.com/GoodFight37/CreatorDeck/actions/runs/38379579144)
est **in_progress**, quatre jobs démarrés, aucune conclusion encore disponible.
Vercel est **pending** sur ce SHA. Les succès de la CI de base ne sont pas
utilisés pour annoncer la réussite de la reprise distante.

Ce checkpoint ne modifie ensuite que la documentation et déclenche une
nouvelle vérification GitHub ; le run précédent peut être annulé par la règle
`cancel-in-progress` du dépôt. L’état ci-dessus est une observation du SHA
produit, pas une promesse sur la CI du checkpoint documentaire. Consulter
[les derniers runs de main](https://github.com/GoodFight37/CreatorDeck/actions/workflows/verification.yml?query=branch%3Amain)
et retrouver le SHA du checkpoint avec
`git log -1 --format=%H -- docs/reprise-zip-2026-10-13.md`.
Aucune suite longue surveillée en boucle : consigne économie du dépôt respectée.

Réservation libérée. Aucun travail produit local restant ; prochaine action :
laisser la CI terminer, reprendre uniquement si un échec est signalé. L’avis
visuel sur téléphone physique et les crédits manquants des anciens lots
manuels/Upscayl restent les limites préexistantes, non résolues par cette reprise.

### Résultat asynchrone après le relevé

La CI de reprise `38379579144` et le déploiement Vercel ont ensuite terminé
avec succès. Le checkpoint documentaire et outil portraits ultérieur
`ed20ebd842dcea65acdf5e9b7ebb48f89a5a5e55` a également passé sa CI
[`38388400407`](https://github.com/GoodFight37/CreatorDeck/actions/runs/38388400407)
et Vercel. Aucun test sur téléphone physique n’a été fait.
