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
// jsdom ne connaît pas la capture de pointeur : le tirage du booster s'y
// accroche (« le doigt continue de piloter le geste même s'il sort de la zone »).
Element.prototype.setPointerCapture ??= () => {};
Element.prototype.releasePointerCapture ??= () => {};

/**
 * **Les vibrations, comptées.** Comme l'audio : le banc ne se contente pas de
 * survivre à `navigator.vibrate`, il l'enregistre. C'est ce qui permet de
 * vérifier deux promesses du jeu — le tirage du booster vibre **une fois**, et
 * couper le son coupe **aussi** les vibrations (`src/lib/haptics.ts`, la règle
 * « un joueur qui coupe le son dans le métro ne veut pas que son téléphone
 * bourdonne »).
 */
export const vibrations: number[][] = [];
navigator.vibrate = ((motif: number | number[]) => {
  vibrations.push(Array.isArray(motif) ? motif : [motif]);
  return true;
}) as typeof navigator.vibrate;
(globalThis as unknown as { __vibrations?: number[][] }).__vibrations = vibrations;

/**
 * **Les sons, comptés.** Le banc ne se contente pas de survivre à l'audio : il
 * l'instrumente. Chaque oscillateur et chaque bruitage joué incrémente un
 * compteur, et les tests s'en servent pour **prouver** qu'un écran est muet —
 * « la navigation ne sonne pas » est une phrase qu'on peut vérifier, pas une
 * intention.
 *
 * Pour que les bruitages jouent vraiment (et pas seulement la synthèse), le
 * `fetch` des .wav rend un petit tampon factice et `decodeAudioData` le
 * décode : sans ça, `playSample` sortait en silence dans les tests, et le
 * compteur n'aurait compté que la moitié du son.
 */
export const sonsJoues = { oscillateurs: 0, bruitages: 0 };

(globalThis as unknown as { __sons?: typeof sonsJoues }).__sons = sonsJoues;

const fetchDuBanc = globalThis.fetch;
globalThis.fetch = (async (entree: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof entree === "string" ? entree : entree instanceof URL ? entree.href : entree.url;
  if (url.includes("/sfx/")) {
    // Un WAV minuscule : seuls `ok` et `arrayBuffer()` sont lus par le moteur.
    return {
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(64),
    } as unknown as Response;
  }
  if (fetchDuBanc) return fetchDuBanc(entree, init);
  throw new Error("le banc n'a pas de réseau");
}) as typeof fetch;

window.AudioContext ??= class {
  state = "running";
  currentTime = 0;
  createOscillator() {
    sonsJoues.oscillateurs += 1;
    return {
      // `AudioNode.connect()` renvoie la destination : le moteur enchaîne
      // `.connect(gain).connect(ctx.destination)`.
      connect: (cible: unknown) => cible,
      start: () => {},
      stop: () => {},
      type: "",
      // Les gammes de rareté montent avec `setValueAtTime` : un banc qui
      // déclenche un son ne doit pas mourir sur une méthode manquante.
      frequency: { value: 0, setValueAtTime: () => {} },
    };
  }
  createGain() {
    return { connect: (cible: unknown) => cible, gain: { value: 0, setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} } };
  }
  createBufferSource() {
    sonsJoues.bruitages += 1;
    return { buffer: null, connect: (cible: unknown) => cible, start: () => {}, stop: () => {} };
  }
  decodeAudioData() {
    return Promise.resolve({ duration: 0.2, length: 4 } as unknown as AudioBuffer);
  }
  destination = {};
  resume() {
    return Promise.resolve();
  }
} as unknown as typeof AudioContext;
