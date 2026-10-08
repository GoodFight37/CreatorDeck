/**
 * Sons de l'application : **des bruitages embarqués, doublés d'un fond
 * synthétisé**.
 *
 * Deux familles, et chacune sert à quelque chose :
 *
 *  * les **bruitages** (`public/sfx/*.wav`, une sélection de `public/sound
 *    effects/`) portent les gestes : une carte qu'on retourne, une page qu'on
 *    tourne, un bouton qu'on enfonce, une pièce qui tombe. Ce sont eux qui
 *    donnent la matière ;
 *  * les **plans de notes synthétisés** portent la **rareté** : une gamme qui
 *    monte, une note aiguë pour une variante spéciale, un coup grave après le
 *    silence d'une Épique. Aucun bruitage ne sait dire « c'est une
 *    Légendaire », et un fichier par rareté × variante serait absurde.
 *
 * Les deux peuvent sonner ensemble : le retournement d'une carte, c'est le
 * papier (bruitage) **plus** la gamme (synthèse).
 *
 * Le son est actif par défaut ; un bouton dans les réglages le coupe et le
 * choix est mémorisé (`localStorage`). **Tout passe par `isMuted()`** — les
 * bruitages comme la synthèse — donc l'interrupteur du joueur coupe bien
 * l'application entière. Tout repose sur un geste de l'utilisateur (ouverture
 * de booster, appui, swipe) : c'est exactement le moment où le navigateur
 * autorise l'audio.
 *
 * Les plans de notes et le **catalogue des bruitages** sont purs ; les fichiers
 * sont vérifiés sur disque par `src/lib/sfx.test.ts` (en-tête RIFF, durée), donc
 * un son demandé par le code mais absent du dossier casse le test.
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

/**
 * La **déchirure** : le son du papier qu'on ouvre, au moment précis où le geste
 * arme. Deux traits courts et aigus qui descendent — pas un « wouip » de
 * victoire (celui-là arrive après, avec `packOpeningPlan`), juste le bruit de
 * l'objet qu'on ouvre. Discret par construction : il tombe pendant que le doigt
 * bouge encore.
 */
export function tearPlan(): Note[] {
  return [
    { freq: 1_320, at: 0, duration: 0.07, type: "sawtooth", gain: 0.032 },
    { freq: 990, at: 0.045, duration: 0.09, type: "triangle", gain: 0.028 },
    { freq: 660, at: 0.1, duration: 0.1, type: "sine", gain: 0.022 },
  ];
}

/**
 * Le « bang » qui suit le silence d'une carte Épique ou mieux.
 *
 * Le plan de la rareté est précédé d'un coup grave : c'est lui qu'on entend
 * après les 400 ms de blanc (voir `silenceBefore` dans `src/lib/reveal.ts`),
 * et c'est lui qui donne l'impression que le son a « claqué » au lieu de
 * simplement commencer.
 */
export function bangPlan(rarity: Rarity, variant: CardVariant = "standard"): Note[] {
  const hit = rarity === "legendary" ? 0.12 : 0.09;
  return [
    { freq: 87, at: 0, duration: 0.46, type: "sawtooth", gain: hit },
    { freq: 174, at: 0.012, duration: 0.3, type: "triangle", gain: 0.05 },
    ...revealPlan(rarity, variant),
  ];
}

/**
 * Le refus d'une carte : deux notes graves qui descendent. Volontairement
 * courtes et sans éclat — un refus ne doit pas ressembler à une récompense.
 */
export function refusePlan(): Note[] {
  return [
    { freq: 116, at: 0, duration: 0.16, type: "sawtooth", gain: 0.045 },
    { freq: 104, at: 0.13, duration: 0.2, type: "sawtooth", gain: 0.04 },
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
// Les bruitages embarqués. **Un nom pour un fichier**, et rien d'autre : le
// catalogue est la seule liste, `src/lib/sfx.test.ts` vérifie que chacun existe
// vraiment dans `public/sfx/`.
// ---------------------------------------------------------------------------

export type SampleName =
  | "card-draw"
  | "card-fan"
  | "card-turn"
  | "chip-place"
  | "click"
  | "select"
  | "pop"
  | "close"
  | "coins"
  | "equip"
  | "menu-open"
  | "chime"
  | "power-up"
  | "gather"
  | "fanfare";

/**
 * Le catalogue : chaque bruitage, son fichier et son **gain de référence**.
 *
 * Les gains ne sont pas décoratifs : les fichiers viennent de packs différents,
 * enregistrés à des niveaux différents. Le gain les ramène à un volume commun
 * — un clic d'interface ne doit pas couvrir une fanfare.
 */
export const SAMPLES: Record<SampleName, { file: string; gain: number }> = {
  "card-draw": { file: "card-draw.wav", gain: 0.5 },
  "card-fan": { file: "card-fan.wav", gain: 0.42 },
  "card-turn": { file: "card-turn.wav", gain: 0.4 },
  "chip-place": { file: "chip-place.wav", gain: 0.5 },
  click: { file: "click.wav", gain: 0.3 },
  select: { file: "select.wav", gain: 0.32 },
  pop: { file: "pop.wav", gain: 0.38 },
  close: { file: "close.wav", gain: 0.34 },
  coins: { file: "coins.wav", gain: 0.38 },
  equip: { file: "equip.wav", gain: 0.36 },
  "menu-open": { file: "menu-open.wav", gain: 0.34 },
  chime: { file: "chime.wav", gain: 0.42 },
  "power-up": { file: "power-up.wav", gain: 0.36 },
  gather: { file: "gather.wav", gain: 0.34 },
  fanfare: { file: "fanfare.wav", gain: 0.4 },
};

/**
 * Les bruitages qu'on entend **tout le temps** (le TCG : retourner une carte,
 * feuilleter, cliquer). Chargés à l'ouverture de l'application : au premier
 * appui, le son est déjà en mémoire — un premier retournement silencieux se
 * remarque tout de suite.
 */
export const SFX_TCG: SampleName[] = [
  "card-draw",
  "card-fan",
  "card-turn",
  "click",
  "select",
  "pop",
  "close",
  "menu-open",
  "chip-place",
  "coins",
  "chime",
];

/**
 * Les bruitages du **Studio** (acheter un palier, publier, poser un invité).
 * Chargés à l'ouverture de l'onglet : on peut y passer une minute avant le
 * geste qui compte.
 */
export const SFX_STUDIO: SampleName[] = [
  "equip",
  "power-up",
  "fanfare",
  "gather",
  "card-draw",
  "menu-open",
  "close",
  "select",
];

/** L'adresse d'un bruitage : servie par le build, comme les portraits. */
export function sampleUrl(name: SampleName): string {
  return `/sfx/${SAMPLES[name].file}`;
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
  sampleRate: number;
  createOscillator: () => OscillatorNode;
  createGain: () => GainNode;
  createBufferSource: () => AudioBufferSourceNode;
  decodeAudioData: (data: ArrayBuffer) => Promise<AudioBuffer>;
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

// ---------------------------------------------------------------------------
// Les bruitages. Chargés **une fois** par nom (le navigateur les met en cache
// HTTP de son côté), décodés en mémoire, puis rejoués instantanément : un même
// bruitage posé sur vingt cartes ne coûte qu'un téléchargement.
// ---------------------------------------------------------------------------

const buffers = new Map<SampleName, AudioBuffer>();
const loading = new Set<SampleName>();

/** Le tampon d'un bruitage s'il est déjà décodé (sinon `null`, sans attendre). */
export function sampleBuffer(name: SampleName): AudioBuffer | null {
  return buffers.get(name) ?? null;
}

/**
 * Charge un bruitage en mémoire, sans jamais bloquer ni jeter.
 *
 * Appelée au premier `playSample` (et par `preloadSamples`), elle est
 * volontairement muette : un fichier manquant, un navigateur sans `fetch` ou un
 * réseau coupé ne doivent pas empêcher le geste de continuer — le son de ce
 * geste sera simplement absent, et la synthèse prend le relais quand il y en a
 * une.
 */
export function preloadSamples(names: SampleName[]): void {
  if (isMuted()) return;
  const ctx = audioContext();
  if (!ctx) return;
  for (const name of names) {
    if (buffers.has(name) || loading.has(name)) continue;
    loading.add(name);
    void (async () => {
      try {
        const response = await fetch(sampleUrl(name));
        if (!response.ok) throw new Error(`bruitage introuvable : ${name}`);
        const data = await response.arrayBuffer();
        buffers.set(name, await ctx.decodeAudioData(data));
      } catch {
        // Sans bruitage, le geste reste jouable : on n'insiste pas.
      } finally {
        loading.delete(name);
      }
    })();
  }
}

/**
 * Joue un bruitage. Silencieux si le son est coupé, si l'API audio n'existe pas
 * (rendu serveur, jsdom) ou si le fichier n'est pas encore arrivé — dans ce
 * dernier cas on lance le chargement pour la prochaine fois.
 */
export function playSample(name: SampleName, gainFactor = 1): void {
  if (isMuted()) return;
  const ctx = audioContext();
  if (!ctx) return;
  const buffer = buffers.get(name);
  if (!buffer) {
    preloadSamples([name]);
    return;
  }
  if (ctx.state === "suspended") void ctx.resume();
  try {
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = SAMPLES[name].gain * gainFactor;
    source.connect(gain).connect(ctx.destination);
    source.start(ctx.currentTime + 0.005);
  } catch {
    // Un tampon refusé par le navigateur (format exotique) ne casse pas le jeu.
  }
}

export function playTear(): void {
  play(tearPlan());
  // Le paquet qu'on déchire, c'est du papier : le bruitage le dit mieux qu'une
  // note. Chargé dès ce geste, il est prêt pour la première carte révélée.
  playSample("card-draw");
}

export function playPackOpening(): void {
  play(packOpeningPlan());
  playSample("pop");
}

/**
 * La carte se retourne : **le papier du bruitage, la gamme de la synthèse**.
 *
 * Le bruitage est le même pour toutes les raretés (c'est le geste), et c'est la
 * gamme qui raconte la rareté — c'est ce qui fait qu'on entend une Légendaire
 * avant de la lire.
 */
export function playReveal(rarity: Rarity, variant: CardVariant = "standard"): void {
  play(revealPlan(rarity, variant));
  playSample("card-draw", 0.85);
}

export function playReward(): void {
  play(rewardPlan());
  playSample("chime", 0.8);
}

/** Le bang d'une carte Épique ou mieux (à jouer après le silence). */
export function playBang(rarity: Rarity, variant: CardVariant = "standard"): void {
  play(bangPlan(rarity, variant));
  playSample("chip-place", 0.7);
}

/** Le son d'une carte qui refuse de se retourner. */
export function playRefuse(): void {
  play(refusePlan());
  playSample("close", 0.6);
}

// ---------------------------------------------------------------------------
// Les gestes du quotidien. Chacun est un bruitage, sans synthèse : ce sont les
// sons qu'on entend cent fois par partie, et un son qu'on entend cent fois doit
// être court, feutré, et **toujours le même**.
// ---------------------------------------------------------------------------

/** Un clic feutré : onglet, bouton, ligne de réglage. */
export function playClick(): void {
  playSample("click");
}

/** Une sélection qui compte (choisir une carte, valider un invité). */
export function playSelect(): void {
  playSample("select");
}

/** Une feuille s'ouvre. */
export function playMenuOpen(): void {
  playSample("menu-open");
}

/** Une feuille se referme. */
export function playMenuClose(): void {
  playSample("close");
}

/** On tourne une page : feuilleter le Binder (du carton, pas du papier). */
export function playPageTurn(): void {
  playSample("card-turn");
}

/** On fait glisser une poignée de cartes (arriver dans le Binder, changer de section). */
export function playCardFan(): void {
  playSample("card-fan");
}

/** Une carte se pose quelque part (un invité sur son socle, un doublon sacrifié). */
export function playCardPlace(): void {
  playSample("chip-place");
}

/** Des pièces tombent (jetons versés, récompense de mission). */
export function playCoins(): void {
  playSample("coins");
}

/** On récolte beaucoup de jetons d'un coup. */
export function playGather(): void {
  playSample("gather");
}

/** Un équipement est branché : le palier de setup est acheté. */
export function playEquip(): void {
  playSample("equip");
}

/** La chaîne monte d'un cran (palier de notoriété franchi). */
export function playPowerUp(): void {
  playSample("power-up");
}

/** La vidéo du jour est publiée. */
export function playChime(): void {
  playSample("chime");
}

/** Un invité est en direct : le raid arrive. */
export function playFanfare(): void {
  playSample("fanfare");
}
