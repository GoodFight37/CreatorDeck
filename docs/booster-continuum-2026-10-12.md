# Ouverture continue du booster — 12 octobre 2026

Objectif : continuum, matière et geste, sans moteur 3D ni nouvelle dépendance.
Référence : [vidéo renvoyée et analyse préalable](reference-ouverture-2026-10-12.md).
Ce lot concerne uniquement l’ouverture ; aucun taux, prix, SQL ou écran
Drop/Binder n’est refondu. Le rendu n’est pas présenté comme équivalent à Pocket.

## Livrable demandé

| Point | Statut | Fichiers | Preuve courte |
|---|---|---|---|
| 1. Continuum | **Fait** | `pack-tear.tsx`, `creator-deck-app.tsx`, `reveal-overlay.tsx`, `booster-continuity.css` | Le même portail/scène reste monté du sachet au récapitulatif. Les cartes se montent à l’intérieur ; le sachet ouvert se retire en fondu après leur arrivée. L’E2E vérifie l’identité du nœud, le fond transparent de la révélation, le centre et la taille du véritable dos de tête à 1 px près. |
| 2. Reflet collé | **Fait** | `pack-tear.tsx`, `booster-premium.css`, `booster-continuity.css` | Deux reflets sont enfants des morceaux imprimés, découpés par leur géométrie et un masque SVG. Leur position suit le doigt ; aucun cycle. Arrêt à l’ouverture, en mouvement réduit et avec Reflets coupés. E2E masque/découpe/parent, mouvement et arrêt. |
| 3. Révélation tactile | **Fait** | `reveal-overlay.tsx`, `booster-continuity.css` | Après le flip, la carte suit le doigt dans le plan ; balayage horizontal ou vers le haut avance, et le dernier ouvre le récap. Bouton conservé, aucune rotation libre d’inspecteur. DOM vérifie avant flip, sous le seuil, deux directions et dernier swipe. |
| 4. Peel robuste | **Fait** | `pack-tear.tsx` | La découpe suit la position du doigt. Recul/relâchement/annulation avant le seuil replient le geste et remettent inclinaison/reflet au repos. E2E glissé lent, abandon et deux directions ; lien texte « Ouvrir sans déchirer » et clavier conservés. |

## Flux et garde-fous

`PackTear` possède le fond, le portail et le piège de focus durant toute la
séquence. `RevealOverlay` reçoit `embedded` pour se rendre à l’intérieur sans
second portail/dialogue. Les ouvertures cadeau et OBS qui n’ont pas de sachet
conservent leur rendu autonome.

La fin d’extraction arrive par `animationend` de la chambre ; 1 200 ms servent
uniquement de filet si l’événement manque, zéro avec les effets coupés. Ce
filet ne détruit plus le sachet. La présentation attend aussi la réponse de
tirage ; aucun résultat ni récompense n’est fabriqué en attendant. Les refus
réseau ferment l’ouverture et montrent leur erreur existante.

Les dos se stabilisent au centre avant le premier flip, avec le même matériau
que le dos révélé. Le fond ne change pas. La coque reste dans le DOM et son
retrait visuel est un fondu fini, après montage de la carte, pas un cut.
La scène n’est démontée qu’à la fermeture/retour au jeu (ou refus du tirage).

Le verrou Perfect et les pauses de rareté restent conservés. Le filet de
révélation tient maintenant compte du silence de l’Épique/Légendaire pour ne
pas autoriser le passage avant la fin du flip. La navigation au clavier garde
le focus dans cette même scène ; la fermeture le restitue au déclencheur ou
au titre du paquet consommé.

## Vérifications locales exécutées

- `npm test` : 73 fichiers, **1 164/1 164** (inclut 20 tests de portraits locaux
  non publiés ; le compteur CI du code publié sera distinct).
- `npm run ecrans` : 19 fichiers, **112/112** ; ajout ensuite d’un dernier
  scénario de swipe vers le récap, fichier final `ecrans-effets.test.tsx`
  **19/19**. Les autres fichiers n’ont pas changé après la suite complète.
- `npm run e2e -- e2e/pack-tear.spec.ts` : **30/30**, bureau/téléphone simulé.
- TypeScript, ESLint complet, build statique et diff-check réussis.
- Quatre références de captures sachet scellé/déchiré actualisées et examinées.
  La capture déchirée fige les animations à 700 ms sans les terminer
  artificiellement ; elles reprennent ensuite et les assertions continuent.
- Les assertions anciennes « la scène doit disparaître » ont été remplacées
  par l’identité persistante de la scène, présence des morceaux et raccord
  des cartes. Les contrôles de geste, de focus, de mouvement réduit, de
  dimensions et de réserve sont conservés et renforcés.

Captures avant/après et vidéo locale de 12,72 secondes conservées hors Git dans
`/workspace/artifacts/booster-continuum/`. Parcours enregistré avec moteur
local et navigateur mobile simulé, pas un essai de production authentifié.
Aucun téléphone physique ni ressenti haptique/audio sur appareil validé.
La CI et le déploiement du commit publié sont à relever après le push, sans
utiliser les résultats de l’ancien commit portraits comme preuve de ce lot.

## Correctif final et vérification laissée à Malik

La CI du commit `9fa849a7c92d454700e6d377361d6e28e0204a00` a validé
1144 tests unitaires, 113 tests DOM et 10 tests cloud simulés. Les tests
navigateur comptent 63 succès sur 64 : seule la capture mobile du sachet
ouvert échoue sur deux pixels. Vercel a déployé ce commit avec succès.

Le symbole textuel du dos est remplacé par `CardBackEmblem`, un SVG partagé
entre les cartes extraites et retournées, pour réduire la dépendance aux
polices système. Les deux références visuelles du sachet ouvert sont adaptées ;
aucune tolérance de test n'est modifiée. Vérifications locales déjà exécutées :
2 captures mises à jour, 27 tests DOM réussis, typecheck et lint ciblé réussis.
Le passage strict des captures après mise à jour et la nouvelle CI restent à
confirmer. À la demande de Malik, aucune suite supplémentaire ni surveillance
CI n'est lancée avant publication du correctif.

Vérification utilisateur : ouvrir un booster sur téléphone, faire un glissé
lent puis relâcher à mi-course, terminer l'ouverture, vérifier que les cartes
sortent du sachet sans coupure, attendre le flip et swiper vers la suivante
jusqu'au récapitulatif. Tester aussi le bouton de secours. Envoyer une courte
vidéo si le rendu ou le geste pose problème.
