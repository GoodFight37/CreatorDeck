# 001 — Retourner les cartes Mèmes communes en 280 ms

- **Status**: TODO
- **Commit**: ebed7eec
- **Severity**: HIGH
- **Category**: Easing & duration / Cohesion
- **Estimated scope**: 2 fichiers, ~15 lignes

## Problem

Dans la révélation des boosters MEMES et IMGFLIP (composant `MemeReveal`), une carte
Commune ou Peu commune met 780 ms à se retourner, dont les 35 % du début sont une pose
immobile, après un délai de 80 ms. La face n'apparaît qu'à ~490 ms et le bouton « suivant »
ne s'active qu'à ~940 ms. Un booster contient 5 cartes, ouvert plusieurs fois par jour :
la révélation Mèmes paraît molle.

La révélation Live, elle, retourne Commune et Peu commune en **280 ms** avec
`cubic-bezier(0.23, 1, 0.32, 1)` (décision documentée dans `DESIGN.md`, paragraphe du Drop :
« Commune et Peu commune se retournent en 280 ms (`cubic-bezier(0.23, 1, 0.32, 1)`), sans
flash ; Rare et mieux gardent leur mise en scène »). Les deux univers doivent se comporter
pareil.

```tsx
/* src/components/meme-reveal.tsx:25-26 — current */
  const duration = effects ? special ? 1_080 : 780 : 0;
  const delay = effects ? number === 4 ? 360 : special ? 210 : 80 : 0;
```

```tsx
/* src/components/meme-reveal.tsx:61 — current (élément animé) */
      <div className={`meme-reveal-flip rarity-${card.rarity}`} style={{ "--meme-flip-ms": `${duration}ms`, "--meme-flip-delay": `${delay}ms`, "--rarity": MEME_RARITY[card.rarity].color } as CSSProperties}>
```

```css
/* src/components/meme-reveal.css:21-22 et 40-44 — current */
.meme-reveal-flip { position: relative; width: 100%; height: 100%;
  animation: meme-reveal-turn var(--meme-flip-ms) cubic-bezier(.2,.7,.2,1) var(--meme-flip-delay) both; }
@keyframes meme-reveal-turn {
  0%, 35% { transform: translateY(24px) scale(.91); }
  53% { transform: translateY(0) scale(1) scaleX(.02); }
  100% { transform: translateY(0) scale(1) scaleX(1); }
}
```

Le retournement est volontairement un écrasement horizontal (`scaleX`) d'un seul élément,
pas une vraie rotation 3D : c'était un correctif de rendu sur Android WebView. **Ne pas
revenir à `rotateY` / `preserve-3d`.** Le JS remplace le dos par la face à 53 % de la
durée (`meme-reveal.tsx`, `setShowBack(false)` à `delay + duration * .53`) : le point le
plus étroit (`scaleX(.02)`) doit rester à 53 %.

## Target

- Communes et Peu communes (`special === false`) : durée **280 ms**, délai **0 ms**, sans
  pose initiale, courbe `var(--ease-out)` (= `cubic-bezier(0.23, 1, 0.32, 1)`).
- Rare, Épique, Légendaire, Mythique : **inchangés** (1 080 ms, délai 210 ms, 360 ms pour la
  cinquième carte, keyframes `meme-reveal-turn`).

```tsx
/* target — src/components/meme-reveal.tsx */
  const duration = effects ? special ? 1_080 : 280 : 0;
  const delay = effects ? number === 4 ? 360 : special ? 210 : 0 : 0;
  …
      <div className={`meme-reveal-flip rarity-${card.rarity}${special ? "" : " is-quick"}`} style={…inchangé…}>
```

```css
/* target — src/components/meme-reveal.css, juste après @keyframes meme-reveal-turn */
.meme-reveal-flip.is-quick { animation-name: meme-reveal-turn-quick; animation-timing-function: var(--ease-out); }
@keyframes meme-reveal-turn-quick {
  0% { transform: translateY(10px) scale(.97); }
  53% { transform: translateY(0) scale(1) scaleX(.02); }
  100% { transform: translateY(0) scale(1) scaleX(1); }
}
```

## Repo conventions to follow

- Les jetons de courbe sont dans `src/app/globals.css:76-78` : `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)`. Les utiliser, ne pas retaper de cubic-bezier.
- Exemple existant du même retournement rapide côté Live : `src/app/booster-continuity.css`, règle `card-turn-quick` avec `animation-duration: 280ms; animation-timing-function: var(--ease-out);` (vers la ligne 895-901).
- Les règles `@media (prefers-reduced-motion: reduce)` et `[data-card-fx="off"]` de `meme-reveal.css:67-70` coupent déjà l'animation : elles s'appliquent aussi à `.is-quick`, rien à ajouter.

## Steps

1. `src/components/meme-reveal.tsx` ligne 25 : remplacer `780` par `280`.
2. Même fichier ligne 26 : remplacer `special ? 210 : 80 : 0` par `special ? 210 : 0 : 0`.
3. Même fichier, `className` de `.meme-reveal-flip` (ligne ~61) : ajouter `${special ? "" : " is-quick"}` comme ci-dessus.
4. `src/components/meme-reveal.css` : ajouter la règle `.meme-reveal-flip.is-quick` et les keyframes `meme-reveal-turn-quick` juste après `@keyframes meme-reveal-turn` (ligne 44).

## Boundaries

- Ne PAS toucher la révélation Live (`reveal-overlay.tsx`, `booster-continuity.css`).
- Ne PAS changer les durées des cartes Rare et plus, ni le délai de la cinquième carte.
- Ne PAS changer le moment du son et de la vibration (`delay + duration * .55`) ni le passage dos → face (`* .53`).
- Ne PAS revenir à une rotation 3D.
- Si le code ne correspond plus aux extraits (le commit a bougé), S'ARRÊTER et le signaler.

## Verification

- **Mécanique** : `npm run typecheck` (code 0) ; `npx vitest run --config vitest.ecrans.config.mts src/ecrans-meme-booster.test.tsx src/ecrans-imgflip-booster.test.tsx` (tout vert).
- **E2E** (cloud factice comme la CI) : `NEXT_PUBLIC_SUPABASE_URL=https://verification-test.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder-key-ne-verifie-jamais-rien-000000000000000000000000 npx playwright test e2e/memes.spec.ts e2e/booster-selector.spec.ts --grep "avec le serveur" --workers=1` → tout vert. Sans ces deux variables, `.env.local` active le vrai cloud et les tests expirent.
- **Feel check** : ouvrir un booster MEMES. Une carte commune doit se retourner presque aussitôt, d'un geste net, sans pause au début ; une carte rare garde sa mise en scène plus longue. Dans DevTools > Animations, passer à 10 % : la carte commune ne reste jamais immobile avant de tourner, et le point le plus fin du retournement coïncide avec l'apparition de la face (pas de dos visible après le milieu).
- **Done when** : une commune devient cliquable en ~360 ms (280 + 80 ms de marge du code) au lieu de ~940 ms, tests verts.
