/**
 * Sons de l'application, **synthétisés** — aucun fichier audio n'est embarqué.
 *
 * Pourquoi synthétiser plutôt qu'importer des `.mp3` : c'est gratuit en poids
 * (l'APK ne grossit pas d'un octet), il n'y a aucune licence à vérifier, et on
 * peut moduler le son à l'infini (une rareté = une gamme). Le seul coût est du
 * code, et il tient dans ce fichier.
 *
 * Le son est actif par défaut ; un bouton dans les réglages le coupe et le
 * choix est mémorisé (`localStorage`). Tout repose sur un geste de
 * l'utilisateur (ouverture de booster, swipe de carte) — c'est exactement le
 * moment où on joue, donc le navigateur autorise l'audio.
 *
 * Les plans de notes (`revealPlan`, `packOpeningPlan`) sont purs et testés :
 * `src/lib/sfx.test.ts`.
 */
import type { CardVariant, Rarity } from "@/lib/catalog";

export type Note = {
  /** Fréquence en hertz. */
  freq: number;
  /** Décalage en secondes depuis le début du son. */
  at: number;
  duration: number;
  type?: OscillatorType;
  gain?: number;
};

const STORAGE_KEY = "creatordeck.muted";

/**
 * Onde de base par rareté.
 *
 * `triangle` sonne doux (commun), `square` claque (rare), `sine` brille
 * (légendaire) : le timbre raconte la rareté autant que le nombre de notes.
 */
const RARITY_TIMBRE: Record<Rarity, OscillatorType> = {
  common: "triangle",
  uncommon: "triangle",
  rare: "square",
  epic: "square",
  legendary: "sine",
};

/** Notes de base par rareté (gamme de do majeur, montante avec la rareté). */
const RARITY_NOTES: Record<Rarity, number[]> = {
  common: [523.25],
  uncommon: [587.33, 698.46],
  rare: [659.25, 830.61, 987.77],
  epic: [659.25, 830.61, 987.77, 1318.51],
  legendary: [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98],
};

/**
 * Notes jouées quand une carte se révèle.
 *
 * Une variante spéciale (Live, Holo, Gold) ajoute une note aiguë : le joueur
 * entend la différence **avant** de lire l'étiquette — c'est le principe d'une
 * bonne animation de tirage.
 */
export function revealPlan(rarity: Rarity, variant: CardVariant = "standard"): Note[] {
  const type = RARITY_TIMBRE[rarity] ?? "triangle";
  const notes = RARITY_NOTES[rarity] ?? RARITY_NOTES.common;
  const step = rarity === "legendary" ? 0.11 : 0.07;

  const plan: Note[] = notes.map((freq, index) => ({
    freq,
    at: index * step,
    duration: rarity === "legendary" ? 0.42 : 0.16,
    type,
    gain: rarity === "legendary" ? 0.075 : 0.05,
  }));

  if (variant !== "standard") {
    plan.push({
      freq: notes[notes.length - 1] * 2,
      at: notes.length * step,
      duration: 0.3,
      type: "sine",
      gain: 0.04,
    });
  }
  return plan;
}

/**
 * « Wouip » d'ouverture de booster : une note qui monte vite, doublée à
 * l'octave — la signature sonore d'un paquet qu'on déchire.
 */
export function packOpeningPlan(): Note[] {
  return [
    { freq: 220, at: 0, duration: 0.28, type: "sawtooth", gain: 0.05 },
    { freq: 440, at: 0.02, duration: 0.24, type: "triangle", gain: 0.04 },
    { freq: 880, at: 0.06, duration: 0.18, type: "sine", gain: 0.03 },
  ];
}

/** Carillon de récompense (palier réclamé, saison complétée). */
export function rewardPlan(): Note[] {
  return [
    { freq: 659.25, at: 0, duration: 0.18, type: "triangle", gain: 0.05 },
    { freq: 987.77, at: 0.09, duration: 0.22, type: "triangle", gain: 0.05 },
    { freq: 1318.51, at: 0.18, duration: 0.34, type: "sine", gain: 0.045 },
  ];
}

// ---------------------------------------------------------------------------
// Lecture — Web Audio. Tout est créé à la première utilisation : aucun coût au
// chargement, et rien à faire si l'API n'existe pas (rendu serveur, vieux
// navigateur) : les fonctions deviennent simplement muettes.
// ---------------------------------------------------------------------------

type AudioContextLike = {
  currentTime: number;
  state: string;
  resume: () => Promise<void>;
  destination: AudioNode;
  createOscillator: () => OscillatorNode;
  createGain: () => GainNode;
};

let context: AudioContextLike | null = null;
let muted = false;
let loaded = false;

function loadPreference(): void {
  if (loaded) return;
  loaded = true;
  if (typeof window === "undefined") return;
  try {
    muted = window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    // Mode privé ou stockage refusé : on reste avec le son actif.
    muted = false;
  }
}

export function isMuted(): boolean {
  loadPreference();
  return muted;
}

export function setMuted(value: boolean): void {
  loadPreference();
  muted = Boolean(value);
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, muted ? "1" : "0");
  } catch {
    // Le choix ne survivra pas au rechargement, ce n'est pas bloquant.
  }
}

function audioContext(): AudioContextLike | null {
  if (typeof window === "undefined") return null;
  if (context) return context;
  const Ctor =
    (window as unknown as { AudioContext?: new () => AudioContextLike }).AudioContext ??
    (window as unknown as { webkitAudioContext?: new () => AudioContextLike }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    context = new Ctor();
  } catch {
    context = null;
  }
  return context;
}

/** Joue un plan de notes. Silencieux si le son est coupé ou l'API absente. */
export function play(plan: Note[]): void {
  if (isMuted() || !plan.length) return;
  const ctx = audioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") void ctx.resume();

  const start = ctx.currentTime + 0.01;
  for (const note of plan) {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = note.type ?? "triangle";
    oscillator.frequency.setValueAtTime(note.freq, start + note.at);
    const peak = note.gain ?? 0.05;
    // Enveloppe percussive : attaque très courte, extinction douce. Sans elle,
    // chaque note claque (clics) au lieu de sonner.
    gain.gain.setValueAtTime(0.0001, start + note.at);
    gain.gain.exponentialRampToValueAtTime(peak, start + note.at + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + note.at + note.duration);
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start(start + note.at);
    oscillator.stop(start + note.at + note.duration + 0.02);
  }
}

export function playPackOpening(): void {
  play(packOpeningPlan());
}

export function playReveal(rarity: Rarity, variant: CardVariant = "standard"): void {
  play(revealPlan(rarity, variant));
}

export function playReward(): void {
  play(rewardPlan());
}
