# 003 — Donner un appui fluide au bouton « suivant » de la révélation Mèmes

- **Status**: DONE — 23 octobre 2026 (branche `arena/46a8ddec-creatordeck`)
- **Commit**: ebed7eec
- **Severity**: LOW
- **Category**: Physicality (press feedback)
- **Estimated scope**: 1 fichier, 1 ligne

## Problem

Le bouton de la révélation Mèmes (« REVEALING… », puis suivant, puis « VOIR MA COLLECTION »)
s'enfonce à l'appui sans transition : il saute de 4 px d'un coup, puis remonte d'un coup. Le
passage désactivé → actif (opacité .45 → 1) est lui aussi instantané. Rien dans
`globals.css` ne donne de transition aux `button`.

```css
/* src/components/meme-reveal.css:52-56 — current */
.meme-reveal-next { z-index: 2; width: min(100%, 420px); min-height: 56px; border: 0; border-radius: 12px;
  color: var(--pack-accent-ink, white); background: var(--pack-accent, var(--live)); box-shadow: 0 8px 0 rgb(var(--ink-rgb) / .85);
  font: 800 18px var(--font-display); letter-spacing: .07em; cursor: pointer; }
.meme-reveal-next:disabled { opacity: .45; cursor: default; }
.meme-reveal-next:not(:disabled):active { transform: translateY(4px) scale(.985); box-shadow: 0 4px 0 rgb(var(--ink-rgb) / .85); }
```

## Target

Retour d'appui de **160 ms** en `var(--ease-out)` sur le mouvement, l'ombre et l'opacité.
On garde l'enfoncement existant (4 px, `scale(.985)`) : c'est le style « bouton de jeu » du
projet.

```css
/* target — ajouter à la fin de la règle .meme-reveal-next (ligne 54), avant l'accolade */
  transition: transform 160ms var(--ease-out), box-shadow 160ms var(--ease-out), opacity 160ms var(--ease-out);
```

## Repo conventions to follow

- Jeton `--ease-out` dans `src/app/globals.css:76`.
- Le bouton principal du Drop se presse déjà à `scale(.97)` en 100 ms avec `cubic-bezier(0.23, 1, 0.32, 1)` (`DESIGN.md`, paragraphe du Drop) : même famille de geste.

## Steps

1. `src/components/meme-reveal.css` ligne 54 : ajouter la déclaration `transition` ci-dessus à la règle `.meme-reveal-next`.

## Boundaries

- Ne changer ni les couleurs, ni la taille, ni l'enfoncement.
- Un seul fichier.

## Verification

- **Mécanique** : `npx vitest run --config vitest.ecrans.config.mts src/ecrans-meme-booster.test.tsx` vert.
- **Feel check** : appuyer longuement sur le bouton : il s'enfonce en douceur, remonte en douceur au relâchement. Quand la carte finit de se retourner, le bouton s'allume en fondu court au lieu de clignoter. Appuis rapides répétés : le bouton ne « saute » jamais.
- **Done when** : plus de saut visible à l'appui, test vert.
