# 007 — Rendre fluide le glissé du doigt entre les boosters

- **Status**: TODO
- **Commit**: ebed7eec
- **Severity**: HIGH
- **Category**: Performance
- **Estimated scope**: 2 fichiers, ~50 lignes

## Problem

Sur le Drop, glisser le doigt pour passer d'un booster à l'autre saccade (pertes d'images
nettes sur un Redmi Note 12 Pro, écran 120 Hz). Changer de booster avec les boutons du bas
reste fluide : là, le navigateur joue une seule transition CSS, prise en charge par le GPU.

Causes dans le code, pendant le glissé :

1. **Variable CSS sur le parent à chaque mouvement.** `moveSwipe` écrit `--drag` sur la
   section `.booster-carousel`. Le CSS de chaque `.booster-pack-slot` en dépend : le navigateur
   recalcule le style de tout le sous-arbre (trois sachets, leurs images, reflets, animations
   de flottement) à chaque événement.
2. **Lecture de mise en page à chaque mouvement.** `spacing()` fait `querySelector` puis
   `offsetWidth` à chaque appel : mise en page forcée juste après une écriture de style.
3. **Aucun calage sur l'image** : un écran 120 Hz envoie plusieurs `pointermove` par image,
   chacun déclenche tout ce travail.
4. Les animations infinies du sachet de devant (flottement 4,8 s, reflet 5,6 s) continuent
   pendant le glissé.

```tsx
/* src/components/booster-carousel.tsx:75-96 — current */
  function spacing() {
    const slot = stage.current?.querySelector<HTMLElement>(".booster-pack-slot");
    return Math.max(80, (slot?.offsetWidth ?? 250) * 0.78);
  }
  function moveSwipe(event: PointerEvent<HTMLElement>) {
    const gesture = swipe.current;
    const node = stage.current;
    if (!gesture || !node || gesture.id !== event.pointerId || boosters.length < 2 || disabled) return;
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    if (!gesture.dragging) {
      if (Math.abs(dx) < 10 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
      gesture.dragging = true;
      node.classList.add("is-dragging");
      try { node.setPointerCapture(event.pointerId); } catch { /* capture */ }
    }
    gesture.samples.push({ x: event.clientX, t: event.timeStamp });
    if (gesture.samples.length > 6) gesture.samples.shift();
    let drag = dx / spacing();
    // Au bout de la file, le paquet résiste au lieu de partir dans le vide.
    if ((index === 0 && drag > 0) || (index === boosters.length - 1 && drag < 0)) drag *= 0.3;
    node.style.setProperty("--drag", String(Math.max(-1.15, Math.min(1.15, drag))));
  }
```

```tsx
/* src/components/booster-carousel.tsx:61-67 — current */
  function releaseDrag() {
    const node = stage.current;
    if (!node) return;
    node.classList.remove("is-dragging");
    node.style.setProperty("--drag", "0");
  }
  useLayoutEffect(() => { releaseDrag(); }, [index]);
```

```css
/* src/components/booster-carousel.css:67-77 — current */
.home-view .booster-selector .booster-carousel .booster-pack-slot:is([data-active]) {
  --o: calc(var(--booster-offset) + var(--drag, 0));
  --a: max(var(--o), calc(var(--o) * -1));
  transform-style: preserve-3d;
  transform: translateX(calc(-50% + var(--o) * 80%)) translateZ(calc(min(var(--a), 1.2) * -190px))
    rotateY(calc(var(--o) * -44deg));
  opacity: calc(1 - min(var(--a), 1) * .5);
  filter: none;
  transition: transform 460ms cubic-bezier(.2, .8, .2, 1), opacity 460ms ease, z-index 0s linear 200ms;
}
.home-view .booster-selector .booster-carousel.is-dragging .booster-pack-slot:is([data-active]) { transition: none; }
```

Chaque slot porte déjà `style={{ "--booster-offset": i - index }}` (ligne ~131).

## Target

Pendant le glissé seulement, le JS écrit **directement** `transform` et `opacity` sur les trois
`.booster-pack-slot` (trois éléments, pas tout le sous-arbre), **une fois par image**
(`requestAnimationFrame`), avec une largeur de cran mesurée **une seule fois** au début du
glissé. Au relâché, les styles en ligne sont retirés dans la même image que la classe
`is-dragging` : la transition CSS existante (460 ms) repart de la position du doigt vers le
cran choisi, exactement comme aujourd'hui. Les animations de flottement et de reflet sont en
pause pendant le glissé.

Formules à reproduire à l'identique (mêmes que le CSS actuel), pour un slot d'indice `i` :
`o = (i - index) + drag`, `a = |o|`,
`transform = translateX(calc(-50% + ${o * 80}%)) translateZ(${-Math.min(a, 1.2) * 190}px) rotateY(${o * -44}deg)`,
`opacity = 1 - Math.min(a, 1) * 0.5`.

```tsx
/* target — src/components/booster-carousel.tsx (extraits) */
  const swipe = useRef<{ x: number; y: number; id: number; dragging: boolean;
    samples: { x: number; t: number }[]; step: number; drag: number; slots: HTMLElement[] } | null>(null);
  const frame = useRef(0);

  function paint() {
    frame.current = 0;
    const gesture = swipe.current;
    if (!gesture?.dragging) return;
    gesture.slots.forEach((slot, i) => {
      const o = i - index + gesture.drag;
      const a = Math.abs(o);
      slot.style.transform = `translateX(calc(-50% + ${o * 80}%)) translateZ(${-Math.min(a, 1.2) * 190}px) rotateY(${o * -44}deg)`;
      slot.style.opacity = String(1 - Math.min(a, 1) * 0.5);
    });
  }
  function releaseDrag() {
    const node = stage.current;
    if (!node) return;
    cancelAnimationFrame(frame.current);
    frame.current = 0;
    node.classList.remove("is-dragging");
    node.querySelectorAll<HTMLElement>(".booster-pack-slot").forEach((slot) => {
      slot.style.transform = "";
      slot.style.opacity = "";
    });
  }
  // dans moveSwipe, au passage gesture.dragging = true :
  //   gesture.step = spacing();
  //   gesture.slots = [...node.querySelectorAll<HTMLElement>(".booster-pack-slot")];
  // puis, à la place de setProperty("--drag", …) :
  //   let drag = dx / gesture.step; (résistance aux bouts inchangée)
  //   gesture.drag = Math.max(-1.15, Math.min(1.15, drag));
  //   if (!frame.current) frame.current = requestAnimationFrame(paint);
  // dans endSwipe : const drag = (event.clientX - gesture.x) / gesture.step;
```

```css
/* target — src/components/booster-carousel.css */
  --o: var(--booster-offset);          /* ligne 68 : --drag n'existe plus */
/* nouvelle règle, après la ligne 77 */
.home-view .booster-selector .booster-carousel.is-dragging .pack-idle,
.home-view .booster-selector .booster-carousel.is-dragging .pack-glint::after { animation-play-state: paused; }
```

Initialiser `step: 1, drag: 0, slots: []` dans l'objet créé par `onPointerDown`.

## Repo conventions to follow

- Le composant utilise déjà des écritures DOM directes hors React pour le glissé (`node.classList`, `node.style.setProperty`) : rester dans ce style, ne pas passer par un `useState` (un rendu React par mouvement serait pire).
- Les commentaires du fichier sont en français, une ligne, sur le « pourquoi ».
- Garder le seuil de vitesse (0,11 px/ms), le seuil de 22 % et la résistance de 0,3 aux bouts.

## Steps

1. Étendre le type de `swipe` et l'objet de `onPointerDown` avec `step`, `drag`, `slots`.
2. Ajouter `frame` (`useRef(0)`) et `paint()`.
3. Dans `moveSwipe` : au démarrage du glissé, mesurer `gesture.step = spacing()` et lister `gesture.slots` ; remplacer l'écriture de `--drag` par la mise à jour de `gesture.drag` + `requestAnimationFrame(paint)` si aucune image n'est déjà demandée.
4. Dans `endSwipe` : utiliser `gesture.step` au lieu de `spacing()`.
5. Remplacer `releaseDrag()` par la version cible (annule l'image en attente, retire les styles en ligne).
6. Ajouter un nettoyage au démontage : `useEffect(() => () => cancelAnimationFrame(frame.current), []);`.
7. CSS : ligne 68 `--o: var(--booster-offset);` ; ajouter la règle de pause des animations.

## Boundaries

- Ne PAS changer le rendu au repos ni la transition des boutons du bas (460 ms).
- Ne PAS changer les seuils de bascule ni le comportement tap / glissé (un glissé n'ouvre jamais de booster).
- Ne PAS toucher le mode mouvement réduit (règle `@media (prefers-reduced-motion: reduce)` du même fichier, qui impose `transform: translateX(-50%)` : en mouvement réduit, ne pas écrire de transform en ligne — si `matchMedia("(prefers-reduced-motion: reduce)").matches`, `paint()` ne fait rien).
- Si les extraits ne correspondent plus au code (commit différent), S'ARRÊTER et signaler.

## Verification

- **Mécanique** : `npm run typecheck` ; `npx eslint src/components/booster-carousel.tsx` ; avec `NEXT_PUBLIC_SUPABASE_URL=` et `NEXT_PUBLIC_SUPABASE_ANON_KEY=` vides : `npx playwright test e2e/booster-selector.spec.ts e2e/pack-tear.spec.ts --workers=1` → tout vert (ces suites couvrent le glissé, le coup de pouce, le tap et « un glissé n'ouvre jamais de booster »).
- **Mesure** : Chrome DevTools, émulation téléphone, Performance avec CPU ralenti 6×, enregistrer trois glissés lents. Avant : un « Recalculate Style » sur toute la scène à chaque événement. Après : au plus une écriture par image, plus de « Layout » forcé pendant le glissé, images sous 16 ms.
- **Feel check sur le vrai téléphone** (Redmi Note 12 Pro, APK ou `chrome://inspect` en USB) : glisser lentement d'un booster à l'autre, puis un coup de pouce rapide. Le sachet suit le doigt sans à-coups ; au relâché, il se cale en douceur depuis l'endroit où le doigt l'a laissé, sans retour en arrière.
- **Done when** : tests verts et Malik confirme sur son téléphone que le glissé est aussi fluide que les boutons.
