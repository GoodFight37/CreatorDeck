/**
 * Ce que jsdom ne fournit pas et que l'application utilise (banc d'essai
 * temporaire du découpage — voir `src/ecrans-smoke.rendu.tsx`).
 */

// React attend cette variable pour accepter `act()` hors de son environnement
// de test habituel (banc d'essai temporaire).
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Un hasard **figé** : les pochettes du booster tirent trois portraits au sort,
// et deux exécutions doivent produire exactement le même HTML. Le moteur tire
// par `crypto.getRandomValues` (`src/lib/random.ts`), pas par `Math.random`.
let graine = 0x2f6e5d4c;
const alea = () => {
  graine = (graine + 0x6d2b79f5) | 0;
  let t = graine;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
Math.random = alea;

/** Remplit un tableau de la même façon que `crypto.getRandomValues`. */
function remplirAleatoire(array: ArrayBufferView): ArrayBufferView {
  const octets = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
  for (let i = 0; i < octets.length; i += 1) octets[i] = Math.floor(alea() * 256);
  return array;
}

let compteurUuid = 0;
const cryptoFactice = {
  getRandomValues: remplirAleatoire,
  randomUUID: () =>
    `00000000-0000-4000-8000-${String((compteurUuid += 1)).padStart(12, "0")}`,
} as unknown as Crypto;
for (const nom of ["getRandomValues", "randomUUID"] as const) {
  Object.defineProperty(globalThis.crypto, nom, {
    value: cryptoFactice[nom],
    configurable: true,
    writable: true,
  });
}

if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

class ObservateurFactice {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

globalThis.ResizeObserver ??= ObservateurFactice as unknown as typeof ResizeObserver;
globalThis.IntersectionObserver ??=
  ObservateurFactice as unknown as typeof IntersectionObserver;

window.scrollTo ??= (() => {}) as typeof window.scrollTo;
Element.prototype.scrollIntoView ??= () => {};
navigator.vibrate ??= () => true;

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
} as unknown as typeof AudioContext;
