# 008 — Booster holographique qui penche avec le téléphone et sous le doigt

- **Status**: DONE — 23 octobre 2026 (branche `arena/46a8ddec-creatordeck`)
- **Commit**: ebed7eec
- **Severity**: — (amélioration demandée par Malik, pas un défaut)
- **Category**: Missed opportunity / Delight
- **Estimated scope**: 3 fichiers, ~90 lignes

## Problem (contexte)

Malik veut un booster « plus beau », avec une impression de 3D. Une vraie 3D WebGL
(three.js, `src/lib/pack-foil-renderer.ts`) a été essayée puis retirée le 12 octobre 2026
(commit `b7970dc0`, « default to clean 2D booster and make extraction recoverable ») : pannes
de contexte WebGL sur certains téléphones, ouverture bloquée. Les décisions suivantes refusent
WebGL et particules ; le 21 octobre, Malik a choisi un sachet plat façon TCG Pocket.
**Pas de WebGL, pas de nouvelle dépendance.**

L'effet qui donne la sensation de 3D dans TCG Pocket est connu : le sachet **penche** quand on
incline le téléphone (ou sous la souris sur ordinateur) et un **reflet holographique
arc-en-ciel** glisse sur le film selon l'angle. Le projet a déjà le point d'accroche, jamais
utilisé : aucune ligne de code n'écrit `--pack-tilt-x` / `--pack-tilt-y`.

```css
/* src/app/drop-binder.css:77-84 — current */
.home-view .pack-3d-object {
  display: block;
  width: 100%;
  height: 100%;
  position: relative;
  transform-style: preserve-3d;
  transform: rotateX(var(--pack-tilt-x, 0deg)) rotateY(var(--pack-tilt-y, 0deg));
}
```

Structure du sachet de devant (composant `PackArtwork`) :

```tsx
/* src/components/booster-carousel.tsx:37-43 — current */
    <span className="pack-idle" aria-hidden="true"><span className="pack-3d-object">
      <span className="pack-3d-front"><Image className="pack-foil-image" src={artwork} alt="" fill
        sizes="(max-width: 390px) 58vw, 230px" draggable={false} priority />
        <span className="pack-bulge" />
        <span className="pack-glint" style={{ "--pack-art": `url(${artwork})` } as CSSProperties} /></span>
    </span></span>
```

`.pack-glint` (`src/app/drop-binder.css:562-575`) est déjà découpé à la forme exacte du sachet
par `mask: var(--pack-art)` : le reflet holographique doit utiliser le même masque.

## Target

1. **Inclinaison** du sachet de devant uniquement, sur l'élément `.pack-3d-object` :
   `rotateX` ±8°, `rotateY` ±10°, écrite **directement** en `style.transform` (pas de variable
   CSS sur un parent — c'est la cause des saccades corrigée en 007), **une fois par image**
   (`requestAnimationFrame`), lissée (`courant += (cible - courant) * 0.18` à chaque image ;
   arrêter la boucle quand l'écart < 0.05°).
   - Téléphone (`matchMedia("(hover: none)")`) : `deviceorientation`. `gamma` (-30…30°) →
     `rotateY` ±10° ; `beta` relatif à la première valeur reçue (-20…20°) → `rotateX` ±8°.
   - Ordinateur (`(hover: hover) and (pointer: fine)`) : position de la souris sur le
     sachet, -1…1 sur chaque axe → mêmes angles ; retour à 0 en quittant le sachet.
2. **Reflet holographique** : nouvel élément `span.pack-holo` juste après `.pack-glint`,
   même masque, dégradé arc-en-ciel dont la position suit l'inclinaison, en
   `mix-blend-mode: color-dodge`, opacité .28.
3. **Coupé** quand : `cardEffectsAllowed()` est faux (Reflets coupés ou mouvement réduit,
   `src/lib/tilt.ts:36`), le sachet n'est pas actif (voisins), le carrousel est en glissé
   (`.is-dragging`), la page est cachée (`document.visibilityState !== "visible"`).

```css
/* target — src/app/drop-binder.css, après la règle .home-view .pack-glint::after (ligne ~572) */
.home-view .pack-holo {
  position: absolute; inset: 0; pointer-events: none;
  -webkit-mask: var(--pack-art) center / 100% 100% no-repeat;
  mask: var(--pack-art) center / 100% 100% no-repeat;
  background: linear-gradient(115deg,
    transparent 20%, rgb(255 92 186 / .9) 32%, rgb(255 214 92 / .9) 40%,
    rgb(92 255 196 / .9) 48%, rgb(92 170 255 / .9) 56%, rgb(186 92 255 / .9) 64%, transparent 76%) 50% 50% / 300% 300%;
  mix-blend-mode: color-dodge;
  opacity: .28;
}
.home-view .booster-neighbor .pack-holo,
[data-card-fx="off"] .home-view .pack-holo { display: none; }
@media (prefers-reduced-motion: reduce) { .home-view .pack-holo { display: none; } }
```

Position du reflet, écrite en `style.backgroundPosition` sur `.pack-holo` (l'élément lui-même) :
`${50 + tiltY * 4}% ${50 + tiltX * 4}%` (angles en degrés).

## Repo conventions to follow

- `cardEffectsAllowed()` (`src/lib/tilt.ts:36`) est la porte unique des effets de carte : la réutiliser, ne pas relire `prefers-reduced-motion` à la main.
- Écritures DOM directes hors React pour tout ce qui suit le doigt ou le capteur (même style que le glissé du carrousel, plan 007).
- Exemple de suivi de pointeur existant sur les cartes : `src/components/creator-card.tsx`, `onPointerMove={trackPointer}` (ligne ~125) — s'en inspirer pour la lecture des coordonnées.
- Commentaires en français, une ligne, sur le « pourquoi ».

## Steps

1. `src/components/booster-carousel.tsx`, `PackArtwork` : ajouter `<span className="pack-holo" style={{ "--pack-art": \`url(${artwork})\` } as CSSProperties} />` juste après `.pack-glint`, et une `ref` sur `.pack-3d-object` et sur `.pack-holo`.
2. Même composant : un `useEffect` actif seulement si `active && cardEffectsAllowed()` qui installe soit l'écouteur `deviceorientation` (téléphone), soit `pointermove`/`pointerleave` sur le bouton (ordinateur), calcule la cible, et lance la boucle `requestAnimationFrame` lissée qui écrit `transform` sur `.pack-3d-object` et `backgroundPosition` sur `.pack-holo`. Nettoyage complet au démontage (écouteurs, image en attente) et remise à `""` des deux styles en ligne.
3. Ignorer les mises à jour quand le carrousel parent porte `.is-dragging` (`button.closest(".is-dragging")`) ou quand la page est cachée.
4. `src/app/drop-binder.css` : ajouter le bloc `.pack-holo` cible.
5. Test e2e dans `e2e/booster-selector.spec.ts` (projet bureau) : survoler le sachet avec la souris → `.pack-3d-object` reçoit un `transform` en ligne non vide ; avec `document.documentElement.dataset.cardFx = "off"` avant chargement (voir comment les tests existants coupent Reflets) → aucun `transform` en ligne et `.pack-holo` non affiché.

## Boundaries

- Pas de WebGL, pas de canvas, pas de nouvelle dépendance, pas de nouveau média.
- Ne PAS toucher la scène de déchirure (`pack-tear.tsx`, `booster-continuity.css`) : l'effet est pour le Drop.
- Ne PAS demander de permission capteur (Android WebView n'en demande pas ; sur iOS, sans permission, l'effet ne s'active simplement pas et la souris ne s'applique pas au tactile).
- Ne PAS dégrader 007 : aucune variable CSS écrite sur un parent.
- Le tap ouvre toujours le booster, un glissé ne l'ouvre jamais.

## Verification

- **Mécanique** : `npm run typecheck` ; `npx eslint src/components/booster-carousel.tsx` ; avec `NEXT_PUBLIC_SUPABASE_URL=` et `NEXT_PUBLIC_SUPABASE_ANON_KEY=` vides : `npx playwright test e2e/booster-selector.spec.ts e2e/pack-tear.spec.ts e2e/drop-craft-priorites.spec.ts --workers=1` → tout vert, captures de référence de `pack-tear` inchangées.
- **Mesure** : DevTools Performance, CPU ralenti 6×, souris qui bouge sur le sachet 5 s : au plus une écriture par image, pas de « Layout ». Si `mix-blend-mode` coûte trop (images > 16 ms), passer à `mix-blend-mode: normal; opacity: .18` et le noter.
- **Feel check sur le vrai téléphone** (Redmi Note 12 Pro) : incliner doucement le téléphone sur le Drop : le sachet suit l'inclinaison sans tremblement, le reflet arc-en-ciel glisse sur le film et ne dépasse jamais la forme du sachet ; immobile, l'effet se calme. Couper Reflets dans les réglages : plus rien ne bouge.
- **À valider par Malik** : l'intensité (angles, opacité .28) est une question de goût ; ajuster seulement ces trois valeurs.
- **Done when** : effet visible et fluide sur le téléphone de Malik, coupé avec Reflets, tests verts.
