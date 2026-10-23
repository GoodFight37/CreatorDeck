# 002 — Faire disparaître le sachet déchiré quand la première carte arrive

- **Status**: TODO
- **Commit**: ebed7eec
- **Severity**: MEDIUM
- **Category**: Physicality / Cohesion
- **Estimated scope**: 1 fichier, ~6 lignes

## Problem

Quand la révélation commence (Live, MEMES et IMGFLIP : tous passent par `PackTear`, qui
ajoute la classe `.is-revealing`), le sachet déchiré ne s'efface qu'à 75 % d'opacité et
reste visible en transparence sous la carte révélée. Sur téléphone, la carte recouvre le
haut du sachet et le bas du sachet dépasse dessous : deux objets se superposent (« double
exposition »). Aucune décision dans `docs/decisions.md` ni `DESIGN.md` ne justifie ce 75 %.

```css
/* src/app/booster-continuity.css:201-207 — current */
.opening-continuum.is-revealing .booster-physical-scene {
  animation: opening-shell-retire 450ms ease-out 120ms both;
}
@keyframes opening-shell-retire {
  from { opacity: 1; }
  to { opacity: .75; }
}
```

En mouvement réduit, le sachet disparaît déjà entièrement :

```css
/* src/app/booster-continuity.css:628 — current, à l'intérieur de @media (prefers-reduced-motion: reduce) */
  .opening-continuum.is-revealing .booster-physical-scene { animation: none; opacity: 0; }
```

## Target

Le sachet quitte la scène : il descend un peu et s'efface complètement, en **300 ms**,
courbe `var(--ease-out)`, en gardant le délai de 120 ms (la carte arrive d'abord).

```css
/* target — src/app/booster-continuity.css:201-207 */
.opening-continuum.is-revealing .booster-physical-scene {
  animation: opening-shell-retire 300ms var(--ease-out) 120ms both;
}
@keyframes opening-shell-retire {
  from { opacity: 1; transform: translateY(0); }
  to { opacity: 0; transform: translateY(6%); }
}
```

## Repo conventions to follow

- Jeton `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)` dans `src/app/globals.css:76`.
- La règle de mouvement réduit (ligne 628) reste telle quelle : elle coupe l'animation et met déjà `opacity: 0`.

## Steps

1. Avant d'éditer, vérifier que `.booster-physical-scene` n'a pas déjà un `transform` actif à ce moment : `grep -n "booster-physical-scene" src/app/booster-continuity.css src/app/booster-premium.css`. Si une règle applique un `transform` sur `.booster-physical-scene` pendant `.is-revealing` ou `.booster-foil-open`, NE PAS ajouter `translateY` dans les keyframes (garder seulement l'opacité 1 → 0) et le noter dans le rapport.
2. Remplacer les lignes 201-207 par le bloc cible.

## Boundaries

- Ne PAS toucher l'extraction des cartes ni `PACK_TEAR_MS` (1 200 ms, invariant documenté D-132).
- Ne PAS toucher la règle de mouvement réduit.
- Un seul fichier : `src/app/booster-continuity.css` (fins de ligne CRLF : les conserver).

## Verification

- **Mécanique** : `npx playwright test e2e/pack-tear.spec.ts --workers=1` lancé avec `NEXT_PUBLIC_SUPABASE_URL=` et `NEXT_PUBLIC_SUPABASE_ANON_KEY=` vides → tout vert, captures de référence inchangées (elles sont prises avant la révélation).
- **Feel check** : ouvrir un booster Live puis un MEMES. Quand la première carte apparaît, le sachet glisse légèrement vers le bas et disparaît ; plus aucun morceau de sachet visible sous la carte. À 10 % dans DevTools > Animations : le sachet commence à partir après l'arrivée de la carte, jamais avant (sinon l'écran paraît vide un instant).
- **Choix à faire valider par Malik** : s'il préfère voir le sachet ouvert en fond, garder `opacity: 0` mais ne pas l'appliquer — c'est une préférence, pas un défaut technique.
- **Done when** : capture d'une révélation MEMES au format téléphone sans sachet visible sous la carte.
