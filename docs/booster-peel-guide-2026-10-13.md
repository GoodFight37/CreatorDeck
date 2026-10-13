# Peel guidé — 13 octobre 2026

Objectif unique : supprimer le ressenti de rail horizontal. Base vérifiée
`c6e85a4cdb34f4b00895654b09db19ad18292829`, branche main.

## Avant / après — cinq lignes

1. Avant : la distance X remplit une fente droite ; après : le doigt trace X/Y.
2. Avant : point de coupe fixé sur une ligne ; après : départ libre dans la zone haute.
3. Avant : le rabat suit un pourcentage ; après : il suit déplacement et angle.
4. Avant : seuil horizontal ; après : largeur fendue combinée au soulèvement.
5. Relâcher tôt replie ; la scène persiste et la 3D reste désactivée par défaut.

## Implémentation et limites

`src/components/pack-tear.tsx` conserve les points de coupe, trace un polyline
SVG et découpe les pièces imprimées avec des polygones CSS. La trace conserve
les virages ; la séparation des pièces prend le dernier échantillon par colonne.
La zone haute occupe 5–24 % de la hauteur du sachet. La trace reste bornée au
sachet (X 2–98 %, Y 6–23 %) ; le rabat peut suivre un doigt sorti de la zone
grâce à la capture du pointeur. Pas de déplacement requis sur une ligne parfaite.

Ouverture suffisante : fraction de largeur fendue × (0,5 + 3 × soulèvement
vertical, plafonné à 0,3 de la hauteur) ≥ 0,25, avec au moins 20 % de largeur
fendue. Ainsi une coupe à plat de 50 % fonctionne, mais une coupe plus courte
soulevée peut aussi ouvrir. Les allers-retours dans une petite zone n’ajoutent
pas de distance artificielle au seuil. Ce seuil n’est pas présenté au joueur
comme une barre. La progression interne reste nécessaire à l’animation et à
l’aperçu GPU optionnel.

`src/app/booster-continuity.css` porte la zone, le clipping et la transformation
du rabat en deux axes. Repli 160 ms (instantané si mouvement réduit/effets off),
trace effacée au relâchement ; bouton secours et clavier restent accessibles.
Aucun changement aux tirages, à la scène persistante ni aux autres écrans.

`e2e/pack-tear.spec.ts` teste une courbe avec plusieurs Y, une ouverture plus
courte avec soulèvement, l’identité du portail, l’absence de canvas par défaut,
ainsi que les gestes horizontaux dans les deux sens et les annulations.

## Test joueur en 30 secondes

Ouvrir un booster sur Vercel après déploiement. Partir au milieu de la bande
striée et tracer une petite courbe : la fente suit la courbe et le rabat suit
le doigt. Relâcher tôt : sachet replié, nouvel essai possible. Recommencer en
coupant puis en remontant : ouverture sans aller jusqu’au bord. Répéter depuis
l’autre côté. Refuser la correction si le ressenti reste celui d’une jauge G→D.

## Vérifications

Sur le diff issu de `c6e85a4c` :

- `npm run typecheck` : réussi.
- `npx eslint src/components/pack-tear.tsx e2e/pack-tear.spec.ts` : réussi.
- `npm run ecrans -- src/ecrans.test.tsx src/ecrans-continuum.test.tsx` :
  11/11 tests exécutés dans ecrans.test.tsx ; aucun fichier ecrans-continuum
  n’existe, donc aucun test de ce nom revendiqué.
- Playwright ciblé : 8/8 (coupe, annulation, deux sens, courbe/soulèvement),
  puis 4/4 après correction CSS (courbe et effets/mouvement réduit).
- `npm run build` : export statique réussi, sans configuration cloud locale.
- `git diff --check` : réussi.

Captures : `test-results/peel-guide-bureau.png` et
`test-results/peel-guide-téléphone.png`, hors Git. Téléphone simulé dans Chromium,
pas de validation sur téléphone physique. Code et docs publiés ensemble par
push normal après contrôle du HEAD distant ; retrouver le SHA avec
`git log -1 --format=%H -- src/components/pack-tear.tsx`. Nouvelle CI à relever
après push, aucun succès anticipé.
