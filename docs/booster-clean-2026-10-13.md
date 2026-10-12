# Ouverture jouable et moins brillante — 13 octobre 2026

## A. Diagnostic

Le GPU est demandé après montage de PackTear, puis import du moteur, chargement
SVG et premier rendu. Il ne devrait remplacer les morceaux 2D qu'à cet instant.
Avant ce correctif, une erreur de contexte/import/texture était silencieuse et
le canvas pouvait être ajouté au DOM avant le masquage des morceaux 2D. Un
chargement achevé après le peel était volontairement abandonné, d'où certains
sachets sans canvas. Mouvement réduit et effets coupés restent des causes
normales de secours 2D, pas des erreurs.

L'extraction attend animationend de la chambre, avec secours à 1200 ms.
Ce secours était armé **après** le son/vibration : une exception de ce callback
pouvait empêcher sa création. C'est un risque prouvé par le code et reproduit
par test, pas une preuve de la cause unique du blocage constaté sur téléphone.
L'attente du résultat serveur est distincte : le fetch Web n'a pas de délai
maximal explicite. Une présentation sans issue pouvait donc aussi attendre le
réseau indéfiniment.

## B–D. Livrable

| Point | Statut | Changement |
| --- | --- | --- |
| Look 2D | Fait | Impression dédiée à l'ouverture, gradients de chrome adoucis, aucune couche de sheen ajoutée, pas de flash lumineux à la coupure. Silhouette alpha et découpe des deux morceaux conservées. Art d'accueil inchangé. |
| Look 3D | Partiel, aperçu seulement | Exposure .88, metalness .08, clearcoat .1, environmentIntensity .12, roughness .62 et éclairages réduits. Aucun verdict esthétique sur téléphone. |
| Activation 3D | **Off par défaut** | `?opening3d=1` permet uniquement une prévisualisation explicite. Aucun import GPU par défaut. Le canvas reste invisible tant que le matériau n'est pas prêt ; jamais deux piles visibles. |
| Chargement GPU | Fait | `data-foil-status` distingue disabled/loading/ready/failed/timeout/effects-off/context-lost/opened-before-ready. Chargement borné à 2500 ms pour le secours, résultats tardifs détruits, erreurs journalisées, mise à jour en échec revient au 2D. |
| Fin d'extraction | Fait | Animationend reste le chemin normal. Animationcancel termine aussi ; le secours est armé avant les effets optionnels. Sans effets, le geste termine directement. « Afficher les cartes » permet une reprise manuelle idempotente. |
| Attente réseau | Fait côté présentation | « Retour au jeu pendant l’attente » ferme volontairement la présentation sans annuler ni relancer le tirage. Les contrôles empêchent un second open concurrent. Une réponse tardive conserve les cartes appliquées dans le Binder, informe le joueur et ne crée pas d'overlay isolé. L'aperçu invité reste sans gain. Aucun résultat serveur fabriqué. |
| Continuum / swipe | Fait, conservé | Un seul portail et un seul nœud sachet jusqu'à la première face et au récap ; swipe après flip et bouton de secours conservés. Seul un retour volontaire quitte la présentation en attente. |

La requête serveur peut toujours prendre du temps ; le correctif ne promet pas
une réussite réseau. Il garantit une issue de présentation et ne rejoue pas une
transaction dont le résultat est encore inconnu. Réactivation de la 3D par
défaut reportée jusqu'à un meilleur rendu confirmé sur téléphone.

## Fichiers concernés

- `src/components/pack-tear.tsx`, `pack-foil-3d.tsx` et orchestration ciblée dans
  `creator-deck-app.tsx` ; `src/lib/pack-foil-renderer.ts`.
- `src/app/booster-continuity.css`, `public/packs/live-opening.svg` et
  `scene-opening.svg` (copies mates dédiées ; sources foil d'accueil conservées).
- `src/ecrans.test.tsx`, `e2e/pack-foil-3d.spec.ts`, `e2e/pack-tear.spec.ts`,
  références visuelles sealed/torn bureau/téléphone.
- README, roadmap, décisions, problèmes connus et passation.

Aucun changement de dépendance, SQL, économie, Drop, Binder ou Tribunal dans
ce lot. Les commits concurrents Gemini sur Drop/Binder sont intégrés sans édition
de leurs fichiers ; portraits locaux préexistants conservés hors publication.

## Vérifications ciblées

- **30/30 DOM** : continuité, swipe, erreur audio, animation absente/annulée,
  secours manuel idempotent et sortie de l'attente avec exactement un tirage,
  cinq cartes conservées et aucun overlay tardif.
- **12/12 navigateur** bureau/mobile simulé : preview GPU, contexte perdu,
  mouvement réduit, mode 2D par défaut, reprise manuelle, raccord et captures.
- **4/4 navigateur** supplémentaires : peel et lien sans déchirure arrivent à
  la première face sur animationend avec le timer JavaScript de secours figé.
- Références visuelles actualisées pour la nouvelle impression et contrôlées
  ensuite sans mise à jour. Aucune tolérance augmentée, aucun scénario retiré.
- TypeScript et lint ciblé réussis sur base `b073dcb` avec le correctif. Après
  intégration des deux nouveaux commits Gemini (`692f0a9`, `7dcc672`), TypeScript
  est bloqué par la syntaxe de `drop-view.tsx` lignes 263–265 (TS1005/TS1381).
  Les 30 DOM et 16 E2E ci-dessus ont tourné avant cette dernière intégration.
  Lint ciblé du correctif reste indépendant ; compilation consignée en passation.
  La CI/Vercel de ce lot n'est pas surveillée en boucle, mode économie demandé.

## Retest en 30 secondes

Après déploiement Vercel, recharger le site sans paramètre opening3d, terminer
les trois pages de tutoriel puis ouvrir le paquet. Tester un petit glissé suivi
d'un relâchement, puis une déchirure complète : la première carte doit arriver
dans la même scène. Swiper après le flip. Sur un autre paquet, utiliser
« Ouvrir sans déchirer ». Si l'attente persiste : « Afficher les cartes », puis
« Retour au jeu pendant l’attente » si c'est le réseau. Ne pas relancer le tirage.
Envoyer une courte vidéo et préciser le bouton/geste utilisé si cela bloque.
