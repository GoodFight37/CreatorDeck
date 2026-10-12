# Référence visuelle d’ouverture — 12 octobre 2026

Malik a renvoyé `Pokemon-TCG-Pocket-figure1-2.mp4` pour préciser le rendu attendu.
Vidéo examinée à partir d’une planche de 27 images à deux images/seconde :
13,5 secondes, portrait 288 × 640 px, 30 images/seconde. Pas de comparaison
visuelle côte à côte avec CreatorDeck réalisée dans cette passe ; le code
actuel a été lu pour identifier les différences structurelles.

## Ce que montre la référence

- Début : carrousel de paquets avec perspective, profondeur et reflet au sol.
- Le paquet choisi avance et grossit ; l’image reste l’objet central, avec très
  peu de texte ou de boutons autour.
- Vers 6–7 secondes, le haut du paquet se détache et sort du cadre ; le paquet
  s’efface puis la première carte occupe le centre de la même composition.
- Les cartes suivantes se succèdent rapidement, dans un cadrage stable. Le clip
  montre trois cartes ordinaires puis un flash vers la révélation suivante.
- L’importance du moment vient du mouvement et de la continuité ; les éléments
  d’interface restent secondaires. La vidéo ne prouve pas les coordonnées du
  geste utilisateur ni une règle de verrouillage précise.

## Différences établies dans le code CreatorDeck

- `PackTear.finish()` ouvre le sachet puis déclenche son relais après un délai
  fixe de 1 900 ms. `PackTear` et `RevealOverlay` sont deux composants de
  présentation distincts ; leur raccord doit être observé dans le navigateur.
- Les cinq dos ont une extraction CSS de 700 ms avec un décalage de 65 ms par
  carte. Ce mouvement est distinct du retournement de la carte révélée.
- L’écran de révélation ajoute des badges, un indicateur de rareté, des textes
  de statut et un bouton. La référence observée laisse davantage de place à
  l’objet seul. Réduire ce chrome est une piste, pas un changement déjà fait.

## Direction de revue

Rechercher une continuité du même objet entre paquet, pile et première carte ;
réduire les pauses et le texte secondaire ; assurer un enchaînement au doigt
lisible et fluide. Conserver l’identité CreatorDeck et ses images propres,
sans reprendre les médias Pokémon. Une refonte de moteur 3D ou de gameplay
n’est pas décidée. Définir les changements après observation du parcours actuel.

La vidéo est jointe à la conversation et conservée localement hors Git ; Grok
n’y accède pas par le dépôt seul. Lui transmettre aussi la vidéo si une revue
visuelle directe est souhaitée. Aucun changement d’animation ni test produit
supplémentaire effectué pour cette analyse documentaire.

Empreinte SHA-256 du fichier reçu : `d1da47302e0ae6c507ced2af0d90f83e86d6737721248eb2d1e399af62ec4ed6`.
