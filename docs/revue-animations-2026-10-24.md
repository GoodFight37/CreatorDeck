# Revue d'animations — 24 octobre 2026

Périmètre demandé : PackTear, MemeReveal et booster-continuity. Référentiel :
skills `review-animations` et `animation-performance` d'Emil Kowalski, fichiers
installés et standards lus. Base `481d27a3`, corrections publiées dans
[`2e48cd76`](https://github.com/GoodFight37/CreatorDeck/commit/2e48cd7633a35d20e130053ac37eb3ff8a5fe847).
Pas de relecteur externe ni d'appel consommant un quota supplémentaire.

## Constats et corrections

| Avant | Après | Pourquoi |
| --- | --- | --- |
| Inclinaison via variables héritées de la scène, trois mises à jour React par image | Transform direct de scène et rabat, retrait de `setPull` | Moins de recalculs de styles ; conserver les états nécessaires au tracé de découpe |
| Reflet MEMES en background-position, anneaux en dégradé recalculé | Films séparés en translateX / rotate | RasterTask des deux boucles mesuré à zéro sur les fenêtres après correction |
| Filtre d'arrière-plan du cartouche pendant le retournement | Cartouche opaque sans backdrop-filter | Masquer la légende de l'image sans filtrer la carte en mouvement |
| Geste MEMES sans identifiant de doigt ni capture (`meme-reveal.tsx`) | Premier pointerId conservé, pointeur capturé, annulation à sa perte | Un doigt secondaire ne doit ni avancer la carte ni annuler le geste principal ; le relâchement hors carte doit revenir à la même surface |
| Test qui attendait une coque visible après la première face | Retrait de 300 ms + délai 120 ms, opacité finale nulle | Continuité conforme au plan 002 |
| Test des communes qui figeait parfois l'animation après sa fin | Pause dès animationstart | Observer le verrou sans allonger les 280 ms de la commune |

## Vérification du mouvement réellement joué

`reports/optimisation-2026-10-24/animations-effectives.json` relève les animations
par `getAnimations({ subtree: true })` et leurs keyframes réels. La déchirure
utilise transform/opacity, avec un clip-path d'ouverture de la chambre qui
découvre les cinq dos. Ce masque est fonctionnel ; le supprimer changerait le
rituel. Les anciennes définitions de keyframes avec brightness sont remplacées
par les définitions ultérieures de la cascade : elles ne constituent pas à elles
seules une preuve de filtre actif. Les cartes communes observées jouent
`common-card-arrive` et `card-turn-quick`, sans filtre animé.

Les durées de la déchirure (1 200 ms) et des cartes spéciales sont le rituel
documenté, pas des durées de bouton ou de feuille : conservées. Les communes
MEMES tournent en 280 ms ; le récap entre en 240 ms avec 40 ms entre cartes.
Le retrait de la coque utilise `translate` indépendant du centrage porté par
transform. Aucun scale(0), transition all ou attente ajoutée au geste dans les
éléments vérifiés. Les interactions de déchirure restent interrompables avant
engagement ; après engagement, quitter la présentation ne relance pas le tirage.

## Preuves Android et limites

- APK locale sans cloud, émulateur `CreatorDeck_API36` : bascule Live→MEMES→Live
  sans ouverture, petit geste annulé, déchirure large, première face sans coque,
  glissement vers la carte suivante, fermeture et mouvement réduit. Assertions
  réussies et captures relues. Les barres système et le retour matériel ont aussi
  été vérifiés dans les lots 5 et 6.
- MEMES : composants réels PackTear/MemeReveal, cartes existantes, fixture locale
  temporaire, Chrome Android du même émulateur. Aucune RPC ni consommation de
  booster serveur. Coordonnées physiques calibrées sur un pointerdown reçu
  (DPR 2,625, décalage du contenu de 275 px avec barre Chrome ouverte).
  Normal : `meme-reveal-turn-quick` ; mouvement réduit : `meme-reveal-fade` ;
  Reflets coupés : `none`. Cartouche sans backdrop-filter dans les trois modes.
  Geste de déchirure, glissement de la première carte, cinq faces, récap à cinq
  cartes et fermeture vérifiés. Captures première face/récap examinées.
- Trois régressions d'écran ciblées : second doigt ignoré, pointercancel et
  lostpointercapture. Le multitouch est vérifié par événements dans jsdom ; ne
  pas le présenter comme un essai à deux doigts physiques sur Redmi.
- Le scénario natif attend chaque compteur après une entrée Android : l'accusé
  de l'injection ne signifie pas encore que React a changé de carte.
- Mesures RasterTask sur Chromium PC et limites détaillées dans le
  [rapport des lots](optimisation-2026-10-24.md). Aucun FPS Redmi annoncé.

## Avis

**Approuvé pour le périmètre vérifié après corrections.** Aucun défaut bloquant
de mouvement relevé sur ces parcours ; les effets coupés et le mouvement réduit
gardent un résultat lisible et actionnable. Le téléphone réel, sa sensation
tactile et sa charge GPU restent non mesurés. Aucun arbitrage du point 7 pris.
