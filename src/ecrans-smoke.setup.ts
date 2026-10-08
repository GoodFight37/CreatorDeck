/**
 * Ce que jsdom ne fournit pas et que l'application utilise (banc d'essai
 * temporaire du découpage — voir `src/ecrans-smoke.rendu.tsx`).
 */

// React attend cette variable pour accepter `act()` hors de son environnement
// de test habituel (banc d'essai temporaire).
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Un hasard **figé** : les pochettes du booster tirent trois portraits au sort,
// et deux exécutions doivent produire exactement le même HTML.
let graine = 0x2f6e5d4c;
Math.random = () => {
  graine = (graine + 0x6d2b79f5) | 0;
  let t = graine;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

if (!window.matchMedia) {
  // @ts-expect-error — bouchon de test
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}

class ObservateurFactice {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

// @ts-expect-error — bouchon de test
globalThis.ResizeObserver ??= ObservateurFactice;
// @ts-expect-error — bouchon de test
globalThis.IntersectionObserver ??= ObservateurFactice;

// @ts-expect-error — bouchon de test
window.scrollTo ??= () => {};
// @ts-expect-error — bouchon de test
Element.prototype.scrollIntoView ??= () => {};

// @ts-expect-error — bouchon de test
navigator.vibrate ??= () => true;

// @ts-expect-error — bouchon de test
window.AudioContext ??= class {
  state = "running";
  currentTime = 0;
  createOscillator() {
    return { connect: () => {}, start: () => {}, stop: () => {}, type: "", frequency: { value: 0 } };
  }
  createGain() {
    return { connect: () => {}, gain: { value: 0, setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} } };
  }
  destination = {};
  resume() {
    return Promise.resolve();
  }
};
