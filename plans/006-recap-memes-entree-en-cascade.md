# 006 — Faire entrer les 5 cartes du récapitulatif Mèmes en cascade

- **Status**: DONE — 23 octobre 2026 (branche `arena/46a8ddec-creatordeck`)
- **Commit**: ebed7eec
- **Severity**: LOW (occasion manquée)
- **Category**: Missed opportunity / Cohesion (stagger)
- **Estimated scope**: 2 fichiers, ~10 lignes

## Problem

À la fin d'un booster MEMES ou IMGFLIP, l'écran « Tes 5 cartes » apparaît d'un bloc, puis
rien ne bouge pendant 1,5 s (le bouton « VOIR MA COLLECTION » reste désactivé pendant
`SUMMARY_HOLD_MS = 1_500`). C'est le dernier moment du booster : il mérite une petite
entrée en cascade.

```tsx
/* src/components/meme-reveal.tsx:94-95 — current */
      <div className="meme-reveal-summary-grid">{cards.map((card) =>
        <div key={card.id}><MemeCard card={card} compact copies={copies.get(card.id) ?? 1} /><span>{card.name}</span></div>)}</div>
```

## Target

Chaque carte entre en fondu avec un léger glissement de 8 px, **240 ms**, `var(--ease-out)`,
décalée de **40 ms** par carte (la dernière commence à 160 ms, finit à 400 ms, bien avant la
fin des 1,5 s : la cascade ne bloque rien). Aucune animation en mouvement réduit ni avec
Reflets coupé.

```tsx
/* target — src/components/meme-reveal.tsx:94-95 */
      <div className="meme-reveal-summary-grid">{cards.map((card, i) =>
        <div key={card.id} style={{ "--i": i } as CSSProperties}><MemeCard card={card} compact copies={copies.get(card.id) ?? 1} /><span>{card.name}</span></div>)}</div>
```

```css
/* target — src/components/meme-reveal.css, après la règle .meme-reveal-summary-grid > div (ligne 60) */
.meme-reveal-summary-grid > div { animation: meme-summary-in 240ms var(--ease-out) calc(var(--i, 0) * 40ms) both; }
@keyframes meme-summary-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
@media (prefers-reduced-motion: reduce) {
  .meme-reveal-summary-grid > div { animation: none; }
}
[data-card-fx="off"] .meme-reveal-summary-grid > div { animation: none; }
```

## Repo conventions to follow

- `CSSProperties` est déjà importé dans `meme-reveal.tsx` (ligne 3).
- Jeton `--ease-out` dans `src/app/globals.css:76`.
- Attention : les cartes 4 et 5 ont `margin-left: 48%` (`meme-reveal.css:61-62`) ; l'animation ne touche que `transform` et `opacity`, la mise en page ne bouge pas.

## Steps

1. `src/components/meme-reveal.tsx` lignes 94-95 : ajouter l'index `i` au `map` et `style={{ "--i": i } as CSSProperties}` sur le `div` de chaque carte.
2. `src/components/meme-reveal.css` : ajouter le bloc cible après la ligne 60.

## Boundaries

- Ne PAS changer `SUMMARY_HOLD_MS` ni l'activation du bouton.
- Ne pas animer autre chose que `opacity` et `transform`.

## Verification

- **Mécanique** : `npm run typecheck` ; `npx vitest run --config vitest.ecrans.config.mts src/ecrans-meme-booster.test.tsx src/ecrans-imgflip-booster.test.tsx` ; e2e « avec le serveur » de `e2e/memes.spec.ts` et `e2e/booster-selector.spec.ts` avec le cloud factice (voir plan 001) → tout vert.
- **Feel check** : à la fin d'un booster MEMES, les cinq cartes arrivent l'une après l'autre très vite, de gauche à droite puis la ligne du bas ; à 10 % dans DevTools, l'écart entre deux cartes est régulier. Avec mouvement réduit : tout apparaît d'un coup, sans glissement.
- **Done when** : cascade visible, finie en moins d'une demi-seconde, tests verts.
