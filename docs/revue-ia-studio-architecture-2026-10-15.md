# Relecture IA Studio — architecture, deuxième lot, 15 octobre 2026

Bilan externe reçu sur l’archive `7be3914bffec0120d23aa3847833b3b9ddbe8170`.
Vérification effectuée sur `main` après D-112 ; les constats ne sont donc pas
appliqués sans les confronter à la version courante.

| Constat reçu | Verdict vérifié | Suite |
| --- | --- | --- |
| `usePresentationFocus` rendrait la modale inerte via `.app-shell` | Faux positif dans les usages présents : `PackTear`, `RevealOverlay` plein écran, le journal, l’inspection et les transactions sont rendus par portail dans `document.body`. `.app-shell` devient le fond inerte ; le dialogue reste hors de cet arbre. | Aucun changement au hook. Une future modale rendue directement dans `.app-shell` nécessiterait une nouvelle vérification. |
| Retour Android sans handler pendant `tearing` | Confirmé : seule la révélation des cartes s’inscrivait dans la pile ; pendant la préparation du tirage, le retour tombait jusqu’à la minimisation de l’application. | Le handler quitte la présentation en attente sans annuler ni relancer le tirage ; le résultat reste affichable ensuite. |
| Marqueurs du tutoriel non recalés avec `cloud.userId` | Confirmé : les deux valeurs d’état contenaient une clé de compte, mais leurs initialisateurs ne s’exécutaient qu’au montage. | Les marqueurs sont maintenant associés à leur clé et relus lors d’un changement de compte, au rendu avant d’exposer l’état suivant. Le stockage reste local et aucune progression cloud n’est modifiée. |
| Poll Last Pack lisant le snapshot avant la fin du chargement | Confirmé : `loadLastPacks()` est asynchrone et publie `lastPacks`/`lastPacksAt` après l’appel API. | Le timer attend la résolution, lit le snapshot publié, puis choisit 30 s ou 3 min. Le timer s’arrête proprement au démontage. |
| Description cachée et `aria-label` sur la pastille `<b>` | Confirmé : `hidden` retire la description de l’arbre accessible et le label sur l’élément générique n’est pas une source fiable de nom. | Description visuellement masquée mais accessible reliée à « Toi » ; pastille purement visuelle marquée `aria-hidden`. |

## Vérifications

- `npm run typecheck` : réussi.
- ESLint ciblé sur les fichiers TS/TSX : réussi. ESLint ignore le CSS dans cette configuration.
- `npm run build` : réussi, 5 pages statiques compilées sans configuration cloud locale.
- Navigation Playwright, contrôle de description accessible : 2/2, bureau et téléphone.
- `npm test -- src/lib/release-notes.test.ts` : 8/8.
- `npm run ecrans` : le scénario d’ouverture en attente réussit ; 2 assertions de vocabulaire dans l’écran Échanges échouent sur « serveur », problème préexistant signalé par D-111 et hors du lot.

Le navigateur vérifie le site et le nom accessible, mais pas l’événement matériel
retour Android. Aucun lecteur d’écran physique ni compte connecté réel n’a été
utilisé pour le changement de compte. Pas de test complet des appels Last Pack
en production ; seule la séquence asynchrone et le build local sont contrôlés.

Le rapport suivant de l’archive est `02_DROP_ET_OUVERTURE__01-sur-02.txt` ;
joindre ce bilan pour distinguer les points déjà traités. L’archive elle-même
reste un snapshot de `7be3914b`.
