# Relecture IA Studio — premier lot, 15 octobre 2026

Bilan externe reçu sur `7be3914bffec0120d23aa3847833b3b9ddbe8170`, identique
au main local et GitHub au début de la vérification. Les conclusions externes
sont des hypothèses : le code et ses dépendances sont vérifiés avant correction.

| Constat reçu | Verdict après vérification | Suite |
| --- | --- | --- |
| Comparer `dry_run` à `'true'` bloque le diagnostic sans CI | Faux positif dans ce contexte. Le script lit `context.payload.inputs`, donc les entrées de l’événement. Elles sont des chaînes ; le contexte d’expression `inputs`, distinct, conserve les booléens. | Aucun changement du workflow et aucune opération Supabase exécutée. |
| Progression de niveau non bornée en bas | Protection d’affichage justifiée, pas un bug démontré sur une progression normale. Le moteur calcule le niveau depuis l’XP, mais `sanitizeState` accepte niveau et XP séparément lors d’un import : niveau 5/XP 0 est représentable. | Borner l’affichage entre 0 et 100 %, sans modifier XP, niveau ni sauvegarde. |
| Labels de compteurs sur des div génériques et SVG non masqués | Partiellement confirmé : rôle nommable absent sur les compteurs. Les SVG Lucide portent déjà `aria-hidden="true"` dans le rendu de la version installée. | Donner un rôle `group` aux trois compteurs ; conserver les SVG existants. |
| Pas de repli initial pour `--top-bar-h` | Faux positif : `.binder-tools` utilise déjà `top: var(--top-bar-h, 68px)` dans `globals.css`. Cela ne constitue pas une mesure de CLS nulle, mais réfute l’absence de fallback. | Aucun ajustement CSS spéculatif. |
| Le bouton du classement démo défile sans transférer le focus | Confirmé : `viewUniverse` change le filtre et défile ; la section cible possède `tabIndex={-1}`, mais n’est pas focalisée. | Focaliser la section avec `preventScroll`, puis conserver le scroll et sa préférence de mouvement réduit. |

Source officielle du premier point :
[GitHub — workflow_dispatch.inputs](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#onworkflow_dispatchinputs).
Citation vérifiée : « The information in the inputs context and github.event.inputs
context is identical except that the inputs context preserves Boolean values as
Booleans instead of converting them to strings. »

## Vérifications ciblées

- `npm run typecheck` et ESLint des quatre fichiers TS/TSX modifiés : réussis.
- `npm test -- src/lib/release-notes.test.ts` : 8/8.
- `npm run e2e -- e2e/catalogue-demo.spec.ts --grep 'filtres et la recherche' --reporter=list` :
  2/2, bureau et téléphone simulé. Activation du classement par Entrée,
  transfert du focus au classeur, filtre Fiction et cinq cartes contrôlés.
- Contrôle ponctuel de rendu avec `vite-node`, sans ajout de test permanent :
  sauvegardes assainies niveau/XP 5/0, 2/120 et 2/550 → largeurs respectives
  0 %, 20 %, 100 % ; trois groupes nommés et deux icônes déjà masquées.
- Revue du skill `react-best-practices` : calcul dérivé simple, focus dans le
  gestionnaire d’action, aucun nouvel effet, abonnement ou appel réseau.
- `npm run build` : réussi, cinq pages statiques sans cloud local ; compilation
  seulement. Code `b97d706f` publié sur main, Vercel `success` ; production
  HTTP 200 à 390 × 844 : compteurs nommés, focus du classeur après Entrée et
  cinq cartes Fiction, aucune erreur JS observée. CI complète en cours au
  dernier relevé ; lien dans la passation.

## Limites et prochaine lecture

Aucune simulation de lecteur d’écran physique ni mesure complète de CLS.
Le prototype `/catalogue-demo` reste séparé du jeu et n’intègre aucun nouvel
univers réel. La note joueur ne décrit que les changements du chrome du jeu.

IA Studio peut continuer avec `01_ARCHITECTURE__02-sur-02.txt` de l’archive
sur le SHA initial ; joindre ce bilan de vérification pour ne pas présenter
ces mêmes constats comme non traités. L’archive reste datée et ne représente
pas les corrections ultérieures à `7be3914b`.
