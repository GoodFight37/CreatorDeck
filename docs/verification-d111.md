# D-111 — vérifications de livraison, 15 octobre 2026

## Périmètre

Base GitHub/main `7c8ce001`, propre et identique au checkout. Aucun fichier
applicatif, dépendance, asset, taux ou logique de jeu modifié. Ce lot corrige
les tests existants et leur exécution, sans note joueur supplémentaire.

## Diagnostic et corrections

- Reflet Drop : ancien nom et durée de cinq secondes attendus, alors que
  D-110 a livré `drop-pack-specular-pass` en quatre secondes.
- Probes BGM : observer `linearRampToValueAtTime`, déjà utilisé par le jeu,
  plutôt que l’ancienne méthode `setTargetAtTime`. Aucun son modifié.
- Survol Binder : viser une vraie carte au lieu d’une coordonnée fixe que
  les outils sticky peuvent recouvrir. Aucun forçage de hit-test.
- Réglages et crédits : ouvrir le volet de D-101 avant de chercher ses boutons.
- Journal mobile : conserver la borne de hauteur mais réessayer sa mesure
  après redimensionnement. Une ancienne hauteur 812 px a été lue pour un
  viewport 768 px ; lecture après rendu 736 px. Mise à jour différée suspectée,
  aucun débordement permanent démontré, aucune tolérance ajoutée.
- DOM Objectifs : le texte du bouton comprend maintenant le résumé de mission ;
  cibler son préfixe précis. L’action et son résultat restent vérifiés.
- DOM recyclage Live : viser la ligne Live et son aperçu D-100 au lieu d’un
  attribut title disparu. Vérifier la variante Live, le message de confirmation
  et la disparition du dialogue après annulation.

## Commandes exécutées

| Commande | Résultat réellement observé |
| --- | --- |
| `npm run e2e` (diagnostic) | 146 réussis, 12 échoués, 12 ignorés, 170 scénarios collectés, 12,2 min |
| `npm run e2e -- e2e/pack-tear.spec.ts --grep 'la musique commence\|le gain BGM\|CSS-only pouch keeps its printed' --reporter=list,json` | 6/6 bureau/téléphone |
| `npm run e2e -- e2e/binder-finitions.spec.ts --grep 'la matière distingue' --reporter=list` | 2/2 après correction ; une relance de diagnostic précédente avait aussi passé seule |
| `npm run e2e -- e2e/product-audit.spec.ts e2e/portrait-credits.spec.ts --grep 'sons, musique et reflets actifs\|les portraits sélectionnés' --reporter=list,json` | 4/4 |
| `npm run e2e -- e2e/release-notes.spec.ts --grep 'lecture mobile, texte long' --repeat-each=3 --reporter=list,json` | 6/6, trois répétitions par format pour l’intermittence |
| `npm run ecrans` (diagnostic après exposition du job CI) | 161 réussis, 5 échoués, 166 tests dans 27 fichiers |
| `npm run ecrans -- src/ecrans.test.tsx src/ecrans-sons.test.tsx src/ecrans-mille-cartes.test.tsx` | 25/25 après correction |
| `npm run typecheck` | réussi sur chaque état publié du lot |
| `npx eslint playwright.config.ts e2e/pack-tear.spec.ts e2e/binder-finitions.spec.ts e2e/product-audit.spec.ts e2e/portrait-credits.spec.ts e2e/release-notes.spec.ts` | réussi |
| `npx eslint src/ecrans.test.tsx src/ecrans-sons.test.tsx src/ecrans-mille-cartes.test.tsx` | réussi sur le complément DOM |
| `git -c core.whitespace=cr-at-eol diff --check` | réussi |

Les trois sorties JSON ciblées sont valides : 6, 4 et 6 réussites,
zéro unexpected/flaky/skipped. Au total, 18 exécutions navigateur ciblées
(14 scénarios uniques) réussies ; la suite complète locale n’a pas été rejouée
après ces corrections. Les tests cloud ignorés dans le build local ne sont
pas comptés comme des réussites.

## CI et publication

Premier lot publié : [6cbb3926](https://github.com/GoodFight37/CreatorDeck/commit/6cbb39268839eb70d7cd00d0529b0cdca91e2aad).
[CI 38740874237](https://github.com/GoodFight37/CreatorDeck/actions/runs/38740874237)
terminée : trois shards navigateur **success**, SQL **success**, cloud simulé
**success**. Job qualité rouge sur unitaires, écrans et vocabulaire ; TypeScript,
ESLint, catalogue et build ont tous été exécutés et réussis malgré ces échecs.
C’est la preuve que les contrôles indépendants ne sont plus masqués.

Les trois attentes DOM révélées par cette CI sont corrigées dans le complément
publié avec ce rapport. Le SHA de ce complément se retrouve par
`git log -1 --format=%H -- docs/verification-d111.md`. Lire ses nouveaux contrôles
sur GitHub ; les résultats ci-dessus sont ceux du premier lot, pas une promesse
sur une suite encore en cours.

Vercel a déployé le premier lot puis son checkpoint documentaire `28afeb4e`
avec statut **success**. Production HTTP 200, Chromium 390 × 844 : pack,
ESSAYER, idle, largeur 390 px, aucune erreur JavaScript observée. Aucun booster
ni ressource de compte consommé pour ce contrôle.

## Limites restantes

Le texte « serveur » de `trades-panel.tsx:379` fait encore échouer le test
unitaire jargon, deux tests d’écran compte lié et le scanner de vocabulaire.
Ce fichier est hors périmètre explicite ; aucun contrôle n’est désactivé.
La CI complète reste donc rouge tant que ce texte n’est pas traité dans un
périmètre autorisé. Le ressenti tactile physique n’est pas certifié.
