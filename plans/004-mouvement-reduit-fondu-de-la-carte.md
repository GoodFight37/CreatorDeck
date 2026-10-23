# 004 — Mouvement réduit : un fondu doux au lieu d'une apparition sèche

- **Status**: TODO
- **Commit**: ebed7eec
- **Severity**: LOW
- **Category**: Accessibility
- **Estimated scope**: 1 fichier, ~6 lignes

## Problem

Quand le téléphone demande moins d'animations (`prefers-reduced-motion: reduce`), la carte
Mèmes révélée apparaît d'un coup : le JS met la durée à 0
(`src/components/meme-reveal.tsx:25`, `cardEffectsAllowed()` renvoie `false`) et le CSS
coupe toute animation. « Mouvement réduit » veut dire moins de déplacement, pas aucun retour
visuel : un fondu d'opacité aide à comprendre qu'une nouvelle carte est arrivée.

```css
/* src/components/meme-reveal.css:67-70 — current */
@media (prefers-reduced-motion: reduce) {
  .meme-reveal-flip { animation: none; }
}
[data-card-fx="off"] .meme-reveal-flip { animation: none; }
```

## Target

En mouvement réduit uniquement : fondu d'opacité de **200 ms** en `var(--ease-out)`, sans
aucun déplacement. Le réglage joueur « Reflets » coupé (`[data-card-fx="off"]`) reste sans
animation : c'est un choix explicite du joueur.

```css
/* target — remplacer les lignes 67-69 */
@media (prefers-reduced-motion: reduce) {
  .meme-reveal-flip { animation: meme-reveal-fade 200ms var(--ease-out) both; }
}
@keyframes meme-reveal-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

La ligne 70 (`[data-card-fx="off"] .meme-reveal-flip { animation: none; }`) reste après, et
garde la priorité quand Reflets est coupé.

## Repo conventions to follow

- Jeton `--ease-out` dans `src/app/globals.css:76`.
- Le JS ne change pas : en mouvement réduit, la face est déjà affichée dès le départ (`showBack` vaut `false`), le fondu s'applique donc à la face.

## Steps

1. `src/components/meme-reveal.css` lignes 67-69 : remplacer par le bloc cible (garder la ligne 70 telle quelle, après).

## Boundaries

- Ne pas toucher le JS ni le comportement avec Reflets coupé.
- Pas de déplacement (`transform`) dans le fondu.

## Verification

- **Mécanique** : `npx vitest run --config vitest.ecrans.config.mts src/ecrans-meme-booster.test.tsx` vert.
- **Feel check** : DevTools > Rendering > « Emulate CSS prefers-reduced-motion: reduce », ouvrir un booster MEMES : chaque carte apparaît en fondu court, sans bouger. Couper Reflets dans les réglages du jeu : la carte apparaît sans fondu.
- **Done when** : fondu visible en mouvement réduit, aucun en Reflets coupé.
