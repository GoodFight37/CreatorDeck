/**
 * Sons de l'application : **des bruitages embarqués, doublés d'un fond
 * synthétisé**.
 *
 * **1. Un son par geste, et le son dit le geste — et se déplacer ne sonne pas.**
 * On n'entend donc **rien** en changeant d'onglet, en ouvrant une feuille, en
 * touchant un interrupteur ou en réglant le volume (décision du joueur, 8
 * octobre 2026 : « enlève le son quand on clique sur des onglets ou des
 * paramètres »). Ce qui sonne, c'est ce qu'on **fait** : ouvrir un booster, une
 * carte qui se révèle, une récompense qui tombe, une page qu'on tourne, un
 * refus. Les bruitages en réserve, que plus aucun écran ne joue, sont groupés en
 * fin de fichier.
 *
 * **2. Les quinze bruitages sont mesurés, pas réglés à la main.** Ils viennent
 * de six dossiers d'un même pack et sont livrés à leur maximum : joués avec un
 * gain écrit à la main, le papier d'une carte sortait **neuf décibels** plus
 * fort qu'un clic. `src/data/sfx-niveaux.json` porte la mesure de chaque fichier
 * (RMS et crête, en dBFS) et sa **cible de volume perçu** — mesurée par
 * `scripts/sfx-niveaux.mjs`, appliquée ici, et revérifiée par le test, qui relit
 * les vrais .wav. Le gain de lecture est le chemin entre les deux.
 *
 * **3. Un seul volume pour tout.** Les bruitages, la synthèse et les effets de
 * la révélation passent tous par le même nœud de sortie : l'interrupteur
 * **Son** coupe tout, et le réglage de **volume** (`discret`, `normal`, `fort`)
 * baisse tout d'un cran sans qu'aucun son ne soit oublié.
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
import NIVEAUX_SFX from "@/data/sfx-niveaux.json";
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
const LEVEL_KEY = "creatordeck.sfx-level";

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
 * Le gain d'un bruitage : le chemin entre **ce qu'il mesure** et **ce qu'il doit
 * valoir** (voir `src/data/sfx-niveaux.json`).
 *
 * Deux bornes, et chacune a une raison :
 *
 *  * la **crête** : un bruitage très percussif (RMS bas, crête pleine) ne doit
 *    pas claquer dans l'oreille — on ne dépasse jamais `creteMaxDb` à la sortie,
 *    et c'est ce plafond qui protège les sons de pièces ;
 *  * le **gain maximum** : le plafond vaut aussi à la hausse, parce que le
 *    fichier d'une confirmation (« select ») est enregistré 14 dB sous les
 *    autres — le ramener à son niveau demande de l'amplifier, et on ne le fait
 *    pas sans borne.
 */
export function sampleGain(name: SampleName): number {
  const niveau = (NIVEAUX_SFX.niveaux as Record<string, { rmsDb: number; creteDb: number; cibleDb: number }>)[
    name
  ];
  if (!niveau) return 0.3;
  const parCible = 10 ** ((niveau.cibleDb - niveau.rmsDb) / 20);
  const parCrete = 10 ** ((NIVEAUX_SFX.creteMaxDb - niveau.creteDb) / 20);
  return Math.max(0.03, Math.min(parCible, parCrete, NIVEAUX_SFX.gainMax));
}

/**
 * Le catalogue : chaque bruitage, son fichier et son **gain de lecture**.
 *
 * Les gains ne sont pas écrits à la main : ils sont **calculés** depuis la
 * mesure des fichiers (`sampleGain`). Un .wav remplacé par un autre niveau
 * change le gain sans qu'on touche à cette table — et le test le vérifie en
 * relisant le disque.
 */
export const SAMPLES: Record<SampleName, { file: string; gain: number }> = {
  "card-draw": { file: "card-draw.wav", gain: sampleGain("card-draw") },
  "card-fan": { file: "card-fan.wav", gain: sampleGain("card-fan") },
  "card-turn": { file: "card-turn.wav", gain: sampleGain("card-turn") },
  "chip-place": { file: "chip-place.wav", gain: sampleGain("chip-place") },
  click: { file: "click.wav", gain: sampleGain("click") },
  select: { file: "select.wav", gain: sampleGain("select") },
  pop: { file: "pop.wav", gain: sampleGain("pop") },
  close: { file: "close.wav", gain: sampleGain("close") },
  coins: { file: "coins.wav", gain: sampleGain("coins") },
  equip: { file: "equip.wav", gain: sampleGain("equip") },
  "menu-open": { file: "menu-open.wav", gain: sampleGain("menu-open") },
  chime: { file: "chime.wav", gain: sampleGain("chime") },
  "power-up": { file: "power-up.wav", gain: sampleGain("power-up") },
  gather: { file: "gather.wav", gain: sampleGain("gather") },
  fanfare: { file: "fanfare.wav", gain: sampleGain("fanfare") },
};

/**
 * Les bruitages qu'on entend **tout le temps**, chargés à l'ouverture de
 * l'application : retourner une carte, feuilleter, encaisser, refuser. Au
 * premier appui, le son est déjà en mémoire — un premier retournement silencieux
 * se remarque tout de suite.
 *
 * Les autres ne sont pas préchargés, parce que plus aucun écran ne les joue :
 * `click` et `menu-open` depuis que la navigation et les réglages sont muets
 * (8 octobre 2026), et `card-fan`, `equip`, `power-up`, `gather`, `fanfare`
 * depuis le retrait de la simulation de streameur. Ils restent dans le
 * catalogue, réglés comme les autres, au cas où un écran les redemande.
 */
export const SFX_USUELS: SampleName[] = [
  "card-draw",
  "pop",
  "close",
  "chip-place",
  "coins",
  "chime",
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

/**
 * Le volume d'ensemble : un cran, pas un curseur.
 *
 * Trois crans suffisent, et ils se mémorisent : c'est un réglage qu'on cherche
 * quand un son dérange, pas une balance à ajuster. Le cran est appliqué **au
 * nœud de sortie** (`bus`), donc il vaut pour les bruitages, pour la synthèse
 * et pour tout ce qui viendra s'y brancher.
 */
export type SfxLevel = "discret" | "normal" | "fort";

/** Les trois crans, dans l'ordre, et leur étiquette à l'écran. */
export const SFX_LEVELS: readonly SfxLevel[] = ["discret", "normal", "fort"] as const;
export const SFX_LEVEL_LABELS: Record<SfxLevel, string> = {
  discret: "Discret",
  normal: "Normal",
  fort: "Fort",
};

/** Ce que vaut chaque cran, en gain linéaire (−8 dB, −2,5 dB, 0 dB). */
const LEVEL_GAIN: Record<SfxLevel, number> = { discret: 0.4, normal: 0.75, fort: 1 };

let level: SfxLevel = "normal";

function loadPreference(): void {
  if (loaded) return;
  loaded = true;
  if (typeof window === "undefined") return;
  try {
    muted = window.localStorage.getItem(STORAGE_KEY) === "1";
    const choisi = window.localStorage.getItem(LEVEL_KEY);
    if (choisi === "discret" || choisi === "normal" || choisi === "fort") level = choisi;
  } catch {
    // Mode privé ou stockage refusé : on reste avec le son actif, cran normal.
    muted = false;
  }
}

export function isMuted(): boolean {
  loadPreference();
  return muted;
}

/** Le cran de volume choisi par le joueur. */
export function getSfxLevel(): SfxLevel {
  loadPreference();
  return level;
}

/** Change le cran de volume — appliqué tout de suite, même en pleine partie. */
export function setSfxLevel(value: SfxLevel): void {
  loadPreference();
  level = value;
  if (bus) bus.gain.value = LEVEL_GAIN[level];
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LEVEL_KEY, level);
  } catch {
    // Le choix ne survivra pas au rechargement, ce n'est pas bloquant.
  }
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

/**
 * Le nœud de sortie : **un seul**, et tout passe par lui.
 *
 * C'est ce qui rend le réglage de volume honnête — il n'y a pas un son oublié
 * quelque part qui joue à plein volume. Créé au premier son, il prend le cran
 * choisi par le joueur.
 */
let bus: GainNode | null = null;

function masterBus(ctx: AudioContextLike): GainNode {
  if (bus) return bus;
  bus = ctx.createGain();
  bus.gain.value = LEVEL_GAIN[getSfxLevel()];
  bus.connect(ctx.destination);
  return bus;
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
    oscillator.connect(gain).connect(masterBus(ctx));
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
    source.connect(gain).connect(masterBus(ctx));
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
//
// C'est ici que se lit la règle de correspondance : **un geste, un son — celui
// qui dit le geste**.
//
// Et une règle plus importante encore, écrite après une remarque du joueur
// (8 octobre 2026 : « enlève le son quand on clique sur des onglets ou des
// paramètres »), puis poussée jusqu'au bout le même soir (« enlève les deux
// sons de déplacement », en parlant du filtre du Binder et de ses pages) :
// **se déplacer ne sonne pas**. Changer d'onglet, ouvrir une feuille, toucher
// un interrupteur, régler le volume, filtrer un classeur, tourner une page :
// rien. Le son accompagne ce qu'on **fait** — ouvrir un booster, encaisser,
// refuser — pas où l'on va, et pas non plus où l'on regarde.
//
// Cinq fonctions sont descendues en réserve pour cette raison : `playClick`,
// `playMenuOpen`, `playMenuClose`, `playSelect` et `playPageTurn`.
// ---------------------------------------------------------------------------

/** Des pièces tombent : une récompense est encaissée (points, sabliers, jetons). */
export function playCoins(): void {
  playSample("coins");
}

// ---------------------------------------------------------------------------
// En réserve. Plus **aucun** écran ne joue ces bruitages :
//
//  * `click`, `menu-open`, `close` (via `playClick`, `playMenuOpen`,
//    `playMenuClose`) : la navigation et les réglages sont muets depuis le
//    8 octobre 2026 — décision du joueur, et elle vaut pour tous les écrans ;
//  * `select` et `card-turn` (via `playSelect`, `playPageTurn`) : les deux
//    derniers sons de déplacement — le filtre du Binder et ses pages — sont
//    partis le même soir, à la demande du joueur ;
//  * `card-fan`, `equip`, `power-up`, `gather`, `fanfare` : ils servaient à la
//    simulation de streameur, retirée le même jour.
//
// Ils restent ici, réglés comme les autres, parce que **les fichiers sont
// restés dans `public/sfx/`** : le jour où un écran les redemande, il n'y a
// qu'un appel à remettre, rien à rebrancher.
// ---------------------------------------------------------------------------

/** L'ancien son d'un filtre du Binder qu'on change. */
export function playSelect(): void {
  playSample("select");
}

/** L'ancien son d'une page du Binder qu'on tourne. */
export function playPageTurn(): void {
  playSample("card-turn");
}

/** Un clic feutré — l'ancien son des onglets et des lignes de réglage. */
export function playClick(): void {
  playSample("click");
}

/** Une feuille s'ouvre — plus joué : se déplacer ne sonne pas. */
export function playMenuOpen(): void {
  playSample("menu-open");
}

/** Une feuille se referme — plus joué : se déplacer ne sonne pas. */
export function playMenuClose(): void {
  playSample("close");
}

/** On fait glisser une poignée de cartes. */
export function playCardFan(): void {
  playSample("card-fan");
}

/** Une carte se pose quelque part (un doublon sacrifié, une carte cédée). */
export function playCardPlace(): void {
  playSample("chip-place");
}

/** On récolte beaucoup de jetons d'un coup. */
export function playGather(): void {
  playSample("gather");
}

/** Un équipement est branché. */
export function playEquip(): void {
  playSample("equip");
}

/** Un palier de notoriété est franchi. */
export function playPowerUp(): void {
  playSample("power-up");
}

/** Une publication est encaissée. */
export function playChime(): void {
  playSample("chime");
}

/** Un invité est en direct : le raid arrive. */
export function playFanfare(): void {
  playSample("fanfare");
}
