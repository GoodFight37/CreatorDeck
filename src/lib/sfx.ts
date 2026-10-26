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
 * **3. Deux interrupteurs indépendants.** `Son de l'application` coupe les
 * bruitages et la synthèse ; `Musique` coupe la BGM. Le volume suit celui du
 * téléphone : l'application n'ajoute pas de cran de volume concurrent.
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
 * Les deux interrupteurs sont actifs par défaut et mémorisés séparément dans
 * `localStorage`. Tout repose sur un geste du joueur : c'est ce qui déverrouille
 * l'audio sur mobile.
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
  /** Fréquence de fin optionnelle, pour un glissement de hauteur continu. */
  endFreq?: number;
  type?: OscillatorType;
  gain?: number;
};

const STORAGE_KEY = "creatordeck.muted";
const MUSIC_STORAGE_KEY = "creatordeck.music-muted";
const MUSIC_SRC = "/music/hub-late-night.mp3";

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
    { freq: 1_420, endFreq: 460, at: 0, duration: 0.42, type: "sawtooth", gain: 0.026 },
    { freq: 980, endFreq: 320, at: 0.055, duration: 0.48, type: "triangle", gain: 0.024 },
    { freq: 620, endFreq: 210, at: 0.12, duration: 0.4, type: "sawtooth", gain: 0.018 },
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

/**
 * Le **tampon** de la grâce : le bois qui tape le papier, puis le timbre qui
 * résonne.
 *
 * Le Tribunal est le seul endroit du jeu où le joueur **signe** quelque chose :
 * il fallait un son d'objet, pas un « wouip » de victoire. Deux temps, donc —
 * le coup (grave, très court) et la résonance (aiguë, brève) — comme les
 * autres sons d'objet de ce fichier (`tearPlan`, `bangPlan`).
 */
export function gracePlan(): Note[] {
  return [
    { freq: 132, at: 0, duration: 0.09, type: "sawtooth", gain: 0.055 },
    { freq: 196, at: 0.012, duration: 0.07, type: "square", gain: 0.03 },
    { freq: 1_046.5, at: 0.07, duration: 0.26, type: "sine", gain: 0.035 },
  ];
}

/**
 * Le **marteau** : un seul coup, très grave, qui descend.
 *
 * C'est le pendant du refus (`refusePlan`), mais il ne doit pas lui ressembler :
 * le refus est une déception (deux notes qui tombent), le marteau est une
 * décision (un coup qui porte). Le grave tient une demi-seconde — c'est ce qui
 * donne le poids — et la composante médiane ajoute le bois.
 */
export function gavelPlan(): Note[] {
  return [
    { freq: 72, at: 0, duration: 0.5, type: "sawtooth", gain: 0.1 },
    { freq: 174, at: 0.014, duration: 0.16, type: "square", gain: 0.045 },
    { freq: 116, at: 0.09, duration: 0.34, type: "sine", gain: 0.035 },
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

/** Repère bref de Légendaire, après le silence déjà prévu par le reveal. */
export function legendaryStingerPlan(): Note[] {
  return [
    { freq: 1_046.5, at: 0, duration: 0.22, type: "sine", gain: 0.035 },
    { freq: 1_568, at: 0.09, duration: 0.34, type: "sine", gain: 0.03 },
  ];
}

/** Signature courte du Perfect, sans déplacer le flip ni son verrou. */
export function perfectStingerPlan(): Note[] {
  return [
    { freq: 392, at: 0, duration: 0.16, type: "triangle", gain: 0.035 },
    { freq: 587.33, at: 0.075, duration: 0.24, type: "triangle", gain: 0.035 },
    { freq: 783.99, at: 0.15, duration: 0.32, type: "sine", gain: 0.03 },
  ];
}

/** Accord de fin sec, joué une fois le bilan du Tribunal payé. */
export function tribunalEndStingerPlan(): Note[] {
  return [
    { freq: 146.83, at: 0, duration: 0.19, type: "triangle", gain: 0.035 },
    { freq: 220, at: 0.08, duration: 0.28, type: "triangle", gain: 0.03 },
  ];
}

// ---------------------------------------------------------------------------
// Les bruitages embarqués. **Un nom pour un fichier**, et rien d'autre : le
// catalogue est la seule liste, `src/lib/sfx.test.ts` vérifie que chacun existe
// vraiment dans `public/sfx/`.
// ---------------------------------------------------------------------------

export type SampleName =
  | "card-draw"
  | "card-turn"
  | "chip-place"
  | "click"
  | "select"
  | "pop"
  | "close"
  | "coins"
  | "menu-open"
  | "chime";

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
  "card-turn": { file: "card-turn.wav", gain: sampleGain("card-turn") },
  "chip-place": { file: "chip-place.wav", gain: sampleGain("chip-place") },
  click: { file: "click.wav", gain: sampleGain("click") },
  select: { file: "select.wav", gain: sampleGain("select") },
  pop: { file: "pop.wav", gain: sampleGain("pop") },
  close: { file: "close.wav", gain: sampleGain("close") },
  coins: { file: "coins.wav", gain: sampleGain("coins") },
  "menu-open": { file: "menu-open.wav", gain: sampleGain("menu-open") },
  chime: { file: "chime.wav", gain: sampleGain("chime") },
};

/**
 * Les bruitages qu'on entend **tout le temps**, chargés à l'ouverture de
 * l'application : retourner une carte, feuilleter, encaisser, refuser. Au
 * premier appui, le son est déjà en mémoire — un premier retournement silencieux
 * se remarque tout de suite.
 *
 * Les autres ne sont pas préchargés, parce que plus aucun écran ne les joue :
 * `click` et `menu-open` depuis que la navigation et les réglages sont muets
 * (8 octobre 2026). Ils restent dans le catalogue, réglés comme les autres, au
 * cas où un écran les redemande.
 */
export const SFX_USUELS: SampleName[] = [
  "card-draw",
  "card-turn",
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
  createBuffer: (numberOfChannels: number, length: number, sampleRate: number) => AudioBuffer;
  decodeAudioData: (data: ArrayBuffer) => Promise<AudioBuffer>;
};

let context: AudioContextLike | null = null;
let muted = false;
let musicMuted = false;
let loaded = false;
export type MusicScene = "hub" | "pack" | "tribunal";
/** Gains relatifs de BGM, gardés très bas à la demande du joueur. */
export const MUSIC_SCENE_GAIN: Readonly<Record<MusicScene, number>> = {
  hub: 0.08,
  pack: 0.04,
  tribunal: 0,
};

const MUSIC_VOLUME_KEY = "creatordeck.music-volume";
const SFX_VOLUME_KEY = "creatordeck.sfx-volume";
const MUSIC_TRACK_KEY = "creatordeck.music-track";
/** Multiplicateurs de volume (0 à 2, 1 = équilibre réglé par le jeu). */
let musicVolume = 1;
let sfxVolume = 1;
/** Piste musicale sélectionnée (voir MUSIC_TRACKS), défaut : piste actuelle. */
let musicTrackId = "hub-late-night";

/** Pistes musicales que le moteur sait enchaîner avec un fondu. */
export const MUSIC_TRACKS: readonly { id: string; label: string; src: string }[] = [
  { id: "hub-late-night", label: "Late Night (actuelle)", src: MUSIC_SRC },
];

export function clampVolume(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(2, Math.max(0, value));
}

function readStoredVolume(key: string): number {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return 1;
    return clampVolume(Number.parseFloat(raw));
  } catch {
    return 1;
  }
}

function loadPreference(): void {
  if (loaded) return;
  loaded = true;
  if (typeof window === "undefined") return;
  try {
    muted = window.localStorage.getItem(STORAGE_KEY) === "1";
    const savedMusicPreference = window.localStorage.getItem(MUSIC_STORAGE_KEY);
    // Avant la séparation, le mute coupait ensemble musique et sons. Conserve
    // ce choix existant au premier démarrage après mise à jour.
    musicMuted = savedMusicPreference === null ? muted : savedMusicPreference === "1";
    musicVolume = readStoredVolume(MUSIC_VOLUME_KEY);
    sfxVolume = readStoredVolume(SFX_VOLUME_KEY);
    musicTrackId = window.localStorage.getItem(MUSIC_TRACK_KEY) ?? musicTrackId;
  } catch {
    // Mode privé ou stockage refusé : les deux options restent actives.
    muted = false;
    musicMuted = false;
  }
}

export function isMuted(): boolean {
  loadPreference();
  return muted;
}

export function isMusicMuted(): boolean {
  loadPreference();
  return musicMuted;
}

/** Active ou coupe uniquement les bruitages et la synthèse de l'application. */
export function setMuted(value: boolean): void {
  loadPreference();
  muted = Boolean(value);
  if (bus) bus.gain.value = muted ? 0 : sfxVolume;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, muted ? "1" : "0");
  } catch {
    // Le choix ne survivra pas au rechargement, ce n'est pas bloquant.
  }
}

/** Active ou coupe uniquement la musique ; son choix est mémorisé à part. */
export function setMusicMuted(value: boolean): void {
  loadPreference();
  musicMuted = Boolean(value);
  if (musicGain && context) {
    rampMusicGain(context, musicGainTarget(), musicMuted ? MUSIC_MUTE_FADE_SECONDS : MUSIC_FADE_IN_SECONDS);
  }
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MUSIC_STORAGE_KEY, musicMuted ? "1" : "0");
  } catch {
    // Le choix ne survivra pas au rechargement, ce n'est pas bloquant.
  }
  if (!musicMuted) {
    if (musicSource && context) {
      if (context.state === "suspended") void context.resume();
    } else {
      startGameAudio(musicScene);
    }
  }
}

/** Niveau cible de la BGM : scène × préférence de volume (0 si muette). */
function musicGainTarget(): number {
  return musicMuted ? 0 : MUSIC_SCENE_GAIN[musicScene] * musicVolume;
}

function persistPreference(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Le choix ne survivra pas au rechargement, ce n'est pas bloquant.
  }
}

/** Volume relatif de la musique (1 = équilibre du jeu, 0 à 2). */
export function getMusicVolume(): number {
  loadPreference();
  return musicVolume;
}

/** Change le volume musique et l'applique immédiatement, en fondu court. */
export function setMusicVolume(value: number): void {
  loadPreference();
  musicVolume = clampVolume(value);
  persistPreference(MUSIC_VOLUME_KEY, String(musicVolume));
  if (musicGain && context) rampMusicGain(context, musicGainTarget(), 0.15);
  if (previewMusicGain && context) {
    previewMusicGain.gain.cancelScheduledValues(context.currentTime);
    previewMusicGain.gain.setValueAtTime(previewMusicGain.gain.value, context.currentTime);
    previewMusicGain.gain.linearRampToValueAtTime(previewMusicTarget(), context.currentTime + 0.15);
  }
}

/** Volume relatif des bruitages et de la synthèse (1 = équilibre du jeu). */
export function getSfxVolume(): number {
  loadPreference();
  return sfxVolume;
}

/** Change le volume des effets ; le bus maître suit aussitôt. */
export function setSfxVolume(value: number): void {
  loadPreference();
  sfxVolume = clampVolume(value);
  persistPreference(SFX_VOLUME_KEY, String(sfxVolume));
  if (bus) bus.gain.value = muted ? 0 : sfxVolume;
}

/** Piste musicale actuellement sélectionnée. */
export function getMusicTrackId(): string {
  loadPreference();
  return musicTrackId;
}

/**
 * Bascule la BGM vers une autre piste du catalogue, en fondu : l'ancienne
 * s'arrête, la nouvelle est chargée puis lancée si la musique jouait.
 * Sert au laboratoire audio ; le jeu ne propose que la piste actuelle tant
 * qu'aucune autre n'est validée.
 */
export function setMusicTrack(id: string): void {
  loadPreference();
  const track = MUSIC_TRACKS.find((candidate) => candidate.id === id);
  if (!track || id === musicTrackId) return;
  musicTrackId = id;
  persistPreference(MUSIC_TRACK_KEY, id);
  const relancer = musicRequested && !musicStopped;
  stopHubMusic();
  musicBuffer = null;
  musicBufferTrackId = "";
  musicStopped = false;
  if (relancer) startGameAudio(musicScene);
}

/**
 * Bus distinct des bruitages/synthèse : la musique a son propre gain et son
 * interrupteur, mais les deux sortent par le volume média du téléphone.
 */
let bus: GainNode | null = null;
let musicGain: GainNode | null = null;
let musicSource: AudioBufferSourceNode | null = null;
let musicBuffer: AudioBuffer | null = null;
let musicBufferTrackId = "";
let musicLoading: Promise<void> | null = null;
let musicScene: MusicScene = "hub";
let musicStopped = false;
let musicRequested = false;
let musicLoopStart = 0;
const MUSIC_FADE_IN_SECONDS = 1.4;
const MUSIC_MUTE_FADE_SECONDS = 0.35;
const MUSIC_LOOP_CROSSFADE_SECONDS = 1.2;

function masterBus(ctx: AudioContextLike): GainNode {
  if (bus) return bus;
  bus = ctx.createGain();
  bus.gain.value = muted ? 0 : sfxVolume;
  bus.connect(ctx.destination);
  return bus;
}

function applyMusicScene(ctx: AudioContextLike): void {
  if (!musicGain) return;
  rampMusicGain(ctx, musicGainTarget(), 0.28);
}

function rampMusicGain(ctx: AudioContextLike, target: number, duration: number): void {
  if (!musicGain) return;
  const parameter = musicGain.gain;
  parameter.cancelScheduledValues(ctx.currentTime);
  parameter.setValueAtTime(parameter.value, ctx.currentTime);
  parameter.linearRampToValueAtTime(target, ctx.currentTime + duration);
}

/** Prépare une transition tail → tête avant la boucle, sans couper la lecture. */
function crossfadeLoopSeam(ctx: AudioContextLike, source: AudioBuffer): { buffer: AudioBuffer; loopStart: number } {
  const overlap = Math.min(Math.floor(source.sampleRate * MUSIC_LOOP_CROSSFADE_SECONDS), Math.floor(source.length / 4));
  if (!overlap || source.numberOfChannels < 1) return { buffer: source, loopStart: 0 };
  try {
    const loop = ctx.createBuffer(source.numberOfChannels, source.length, source.sampleRate);
    for (let channel = 0; channel < source.numberOfChannels; channel += 1) {
      const input = source.getChannelData(channel);
      const output = loop.getChannelData(channel);
      output.set(input);
      const start = source.length - overlap;
      for (let i = 0; i < overlap; i += 1) {
        const blend = i / overlap;
        output[start + i] = input[start + i] * (1 - blend) + input[i] * blend;
      }
    }
    return { buffer: loop, loopStart: overlap / source.sampleRate };
  } catch {
    return { buffer: source, loopStart: 0 };
  }
}

function startMusicSource(ctx: AudioContextLike): void {
  if (!musicBuffer || musicSource || musicMuted || musicStopped) return;
  try {
    musicGain = ctx.createGain();
    musicGain.gain.setValueAtTime(0, ctx.currentTime);
    musicGain.connect(ctx.destination);
    musicSource = ctx.createBufferSource();
    musicSource.buffer = musicBuffer;
    musicSource.loop = true;
    musicSource.loopStart = musicLoopStart;
    musicSource.loopEnd = musicBuffer.duration;
    musicSource.connect(musicGain);
    rampMusicGain(ctx, musicGainTarget(), MUSIC_FADE_IN_SECONDS);
    musicSource.start();
  } catch {
    musicSource = null;
    musicGain = null;
  }
}

/** Déverrouille l'audio sur le premier geste joueur et lance la boucle du hub. */
export function startGameAudio(scene: MusicScene = "hub"): void {
  musicScene = scene;
  if (isMusicMuted()) return;
  musicStopped = false;
  musicRequested = true;
  const ctx = audioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") void ctx.resume();
  if (musicSource) {
    applyMusicScene(ctx);
    return;
  }
  preloadGameMusic();
  startMusicSource(ctx);
}

/** Charge et décode en avance pour que la première action autorisée soit immédiate. */
export function preloadGameMusic(): void {
  if (musicBuffer || musicLoading || isMusicMuted()) return;
  const ctx = audioContext();
  if (!ctx) return;
  const trackId = musicTrackId;
  const src = MUSIC_TRACKS.find((track) => track.id === trackId)?.src ?? MUSIC_SRC;
  musicLoading = fetch(src)
    .then((response) => response.ok ? response.arrayBuffer() : Promise.reject(new Error("BGM unavailable")))
    .then((data) => ctx.decodeAudioData(data))
    .then((buffer) => {
      // La piste a pu changer pendant le chargement : ne pas jouer l'ancienne.
      if (trackId !== musicTrackId) return;
      const loop = crossfadeLoopSeam(ctx, buffer);
      musicBuffer = loop.buffer;
      musicBufferTrackId = trackId;
      musicLoopStart = loop.loopStart;
      if (musicRequested) {
        if (ctx.state === "suspended") void ctx.resume();
        startMusicSource(ctx);
      }
    })
    .catch(() => { /* La partie reste jouable sans musique. */ })
    .then(() => { musicLoading = null; });
}

/** Start the existing single Web Audio hub loop, without creating a second player. */
export function playHubMusic(): void {
  if (isMusicMuted()) return;
  startGameAudio(musicScene);
}

/** Duck the hub during the tear; scene restoration is owned by the app. */
export function duckHubMusic(duck = true): void {
  if (isMusicMuted()) return;
  setMusicScene(duck ? "pack" : "hub");
}

/** Silence the existing hub loop without changing the music preference. */
export function stopHubMusic(): void {
  musicStopped = true;
  musicRequested = false;
  if (musicSource) {
    try { musicSource.stop(); } catch { /* Already stopped. */ }
    musicSource.disconnect();
    musicSource = null;
  }
  if (musicGain) { musicGain.disconnect(); musicGain = null; }
}

/** Atténue fortement la boucle pendant un pack et la coupe au Tribunal. */
export function setMusicScene(scene: MusicScene): void {
  musicScene = scene;
  if (context && musicSource) applyMusicScene(context);
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
    if (note.endFreq && note.endFreq !== note.freq
      && typeof oscillator.frequency.exponentialRampToValueAtTime === "function") {
      oscillator.frequency.exponentialRampToValueAtTime(note.endFreq, start + note.at + note.duration);
    }
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
  preloadExperimentalPackOpening();
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

// Démo locale : un bruitage de booster choisi dans le laboratoire et conservé sur cet appareil.
// Aucun changement en production, aucun fichier source du jeu remplacé.
const EXPERIMENTAL_PACK_AUDIO_KEY = "creatordeck.audio-lab.experimental-pack-wav";
let experimentalPackBuffer: AudioBuffer | null = null;
let experimentalPackPending: Promise<void> | null = null;

export function isExperimentalPackOpeningEnabled(): boolean {
  if (process.env.NODE_ENV !== "development" || typeof window === "undefined") return false;
  try { return Boolean(window.localStorage.getItem(EXPERIMENTAL_PACK_AUDIO_KEY)); }
  catch { return false; }
}

export function disableExperimentalPackOpening(): void {
  cancelExperimentalPackGesture();
  experimentalPackBuffer = null;
  experimentalPackPending = null;
  if (typeof window === "undefined") return;
  try { window.localStorage.removeItem(EXPERIMENTAL_PACK_AUDIO_KEY); } catch { /* Stockage refusé. */ }
}

/** Décode le son local avant la première ouverture, pour ne pas retarder le geste. */
export function preloadExperimentalPackOpening(): void {
  if (!isExperimentalPackOpeningEnabled() || experimentalPackBuffer || experimentalPackPending) return;
  const ctx = audioContext();
  if (!ctx) return;
  experimentalPackPending = (async () => {
    try {
      const encoded = window.localStorage.getItem(EXPERIMENTAL_PACK_AUDIO_KEY);
      if (!encoded) return;
      const raw = atob(encoded);
      const bytes = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
      experimentalPackBuffer = await ctx.decodeAudioData(bytes.buffer);
    } catch {
      // Mauvais fichier : le jeu conserve son son de pack habituel.
      experimentalPackBuffer = null;
    }
  })().finally(() => { experimentalPackPending = null; });
}

/** Importe un WAV court sur l'appareil de test, uniquement en développement. */
export async function setExperimentalPackOpeningFile(file: File): Promise<boolean> {
  if (process.env.NODE_ENV !== "development" || typeof window === "undefined" || file.size > 512_000 || !file.size) return false;
  const ctx = audioContext();
  if (!ctx) return false;
  try {
    const data = await file.arrayBuffer();
    const decoded = await ctx.decodeAudioData(data.slice(0));
    if (decoded.duration > 5) return false;
    const bytes = new Uint8Array(data);
    let binary = "";
    for (let i = 0; i < bytes.length; i += 8192) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    }
    window.localStorage.setItem(EXPERIMENTAL_PACK_AUDIO_KEY, btoa(binary));
    experimentalPackBuffer = decoded;
    return true;
  } catch {
    return false;
  }
}

// La déchirure doit suivre le doigt : de petits grains de l'enregistrement
// jouent quand la soudure progresse, un claquement à son seuil, puis une
// courte fin au relâchement. C'est un prototype LOCAL, sans nouveaux sons IA.
type PackGestureSound = { progress: number; lastGrainAt: number; snapped: boolean };
let packGestureSound: PackGestureSound | null = null;

/** Joue un petit segment du véritable échantillon B Confort, avec micro-fondus. */
function playExperimentalPackSegment(offset: number, seconds: number, level: number): boolean {
  if (!isExperimentalPackOpeningEnabled() || isMuted() || !experimentalPackBuffer) return false;
  const ctx = audioContext();
  if (!ctx) return false;
  const duration = Math.min(seconds, experimentalPackBuffer.duration - offset);
  if (duration <= 0) return false;
  try {
    if (ctx.state === "suspended") void ctx.resume();
    const start = ctx.currentTime + 0.004;
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    source.buffer = experimentalPackBuffer;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(level, start + Math.min(0.008, duration / 5));
    gain.gain.setValueAtTime(level, start + duration * 0.65);
    gain.gain.linearRampToValueAtTime(0.0001, start + duration);
    source.connect(gain).connect(masterBus(ctx));
    source.start(start, offset, duration);
    return true;
  } catch {
    return false;
  }
}

/** Début de glissement, sans bruit au simple toucher. */
export function beginExperimentalPackGesture(): void {
  if (!isExperimentalPackOpeningEnabled()) return;
  preloadExperimentalPackOpening();
  packGestureSound = { progress: 0, lastGrainAt: -Infinity, snapped: false };
}

/** La texture dépend de la DISTANCE parcourue, pas d'une animation chronométrée. */
export function moveExperimentalPackGesture(progress: number): void {
  const state = packGestureSound;
  if (!state || !isExperimentalPackOpeningEnabled() || isMuted()) return;
  const current = Math.max(0, Math.min(100, progress));
  const ctx = audioContext();
  if (!ctx || current < 5 || current - state.progress < 8 || ctx.currentTime - state.lastGrainAt < 0.055) return;
  state.progress = current;
  state.lastGrainAt = ctx.currentTime;
  // Trois régions de froissement du fichier, légèrement alternées, sans rafale.
  const offsets = [0.245, 0.295, 0.325];
  const offset = offsets[Math.floor(current / 13) % offsets.length];
  playExperimentalPackSegment(offset, 0.07, 0.60);
}

/** Rupture de la soudure : le seuil visuel et la vibration arrivent ensemble. */
export function snapExperimentalPackGesture(): void {
  const state = packGestureSound;
  if (!state || state.snapped) return;
  state.snapped = true;
  playExperimentalPackSegment(0.035, 0.095, 0.70);
}

/** Repli du sachet : aucun claquement de validation. */
export function cancelExperimentalPackGesture(): void {
  packGestureSound = null;
}

function playExperimentalPackOpening(): boolean {
  if (!isExperimentalPackOpeningEnabled()) return false;
  if (!experimentalPackBuffer) {
    preloadExperimentalPackOpening();
    packGestureSound = null;
    return false; // Son original si le fichier local n'est pas prêt.
  }
  // Fin de la déchirure déjà commencée : ne PAS rejouer tout l'enregistrement.
  const previous = packGestureSound;
  packGestureSound = null;
  if (isMuted()) return true;
  if (previous) {
    if (!previous.snapped) playExperimentalPackSegment(0.035, 0.095, 0.60);
    playExperimentalPackSegment(0.285, 0.19, 0.50);
    return true;
  }
  // Clavier / ouverture sans glissé : un seul bruitage court accessible.
  playExperimentalPackSegment(0.03, 0.45, 0.42);
  return true;
}

export function playPackOpening(): void {
  if (playExperimentalPackOpening()) return;
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

export function playLegendaryStinger(): void {
  play(legendaryStingerPlan());
}

export function playPerfectStinger(): void {
  play(perfectStingerPlan());
}

export function playTribunalEndStinger(): void {
  play(tribunalEndStingerPlan());
}

/** Le bang d'une carte Épique ou mieux (à jouer après le silence). */
export function playBang(rarity: Rarity, variant: CardVariant = "standard"): void {
  play(bangPlan(rarity, variant));
  playSample("chip-place", 0.7);
}

/**
 * La grâce est accordée : le tampon, et le bruitage du papier tamponné.
 *
 * Comme `playReveal`, l'objet est dans le bruitage et l'intention dans la
 * synthèse — et les deux passent par `isMuted()`.
 */
export function playGrace(): void {
  play(gracePlan());
  playSample("chip-place", 0.7);
}

/** Le ban est maintenu : le marteau tombe. Synthèse seule, le coup suffit. */
export function playGavel(): void {
  play(gavelPlan());
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
//
// Ils restent ici, réglés comme les autres, parce que **les fichiers sont
// restés dans `public/sfx/`** : le jour où un écran les redemande, il n'y a
// qu'un appel à remettre, rien à rebrancher.
//
// Ceux de la simulation de streameur — `card-fan`, `equip`, `power-up`,
// `gather`, `fanfare` — sont **partis** le 9 octobre 2026 avec leurs fichiers :
// le mode n'existe plus et plus rien ne les réclame. Ils sont dans l'historique
// Git si on les veut de retour.
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

/** Une carte se pose quelque part (un doublon sacrifié, une carte cédée). */
export function playCardPlace(): void {
  playSample("chip-place");
}

/** Une publication est encaissée. */
export function playChime(): void {
  playSample("chime");
}

// ---------------------------------------------------------------------------
// Aperçus du laboratoire audio (développement uniquement).
//
// Ces lectures jouent des fichiers arbitraires PAR les bus du jeu — musique
// au gain de scène × préférence de volume, effets par le bus maître — pour
// comparer des candidats dans les mêmes conditions que le jeu, sans jamais
// toucher aux fichiers en place. Rien dans le jeu ne les appelle.
// ---------------------------------------------------------------------------

let previewMusicSource: AudioBufferSourceNode | null = null;
let previewMusicGain: GainNode | null = null;
let previewToken = 0;
const previewBuffers = new Map<string, Promise<AudioBuffer | null>>();

function previewMusicTarget(): number {
  return musicMuted ? 0 : MUSIC_SCENE_GAIN.hub * musicVolume;
}

function loadPreviewBuffer(ctx: AudioContextLike, src: string): Promise<AudioBuffer | null> {
  const cached = previewBuffers.get(src);
  if (cached) return cached;
  const pending = fetch(src)
    .then((response) => (response.ok ? response.arrayBuffer() : Promise.reject(new Error("aperçu indisponible"))))
    .then((data) => ctx.decodeAudioData(data))
    .catch(() => {
      previewBuffers.delete(src);
      return null;
    });
  previewBuffers.set(src, pending);
  return pending;
}

/** Joue un fichier musical en boucle, au niveau d'écoute du hub. */
export async function previewMusic(src: string): Promise<boolean> {
  loadPreference();
  stopPreviewMusic();
  const token = ++previewToken;
  const ctx = audioContext();
  if (!ctx) return false;
  if (ctx.state === "suspended") void ctx.resume();
  const buffer = await loadPreviewBuffer(ctx, src);
  if (!buffer || token !== previewToken) return false;
  try {
    previewMusicGain = ctx.createGain();
    previewMusicGain.gain.setValueAtTime(0, ctx.currentTime);
    previewMusicGain.gain.linearRampToValueAtTime(previewMusicTarget(), ctx.currentTime + 0.3);
    previewMusicGain.connect(ctx.destination);
    previewMusicSource = ctx.createBufferSource();
    previewMusicSource.buffer = buffer;
    previewMusicSource.loop = true;
    previewMusicSource.connect(previewMusicGain);
    previewMusicSource.start();
    return true;
  } catch {
    previewMusicSource = null;
    previewMusicGain = null;
    return false;
  }
}

/** Arrête l'aperçu musical en fondu court. */
export function stopPreviewMusic(): void {
  previewToken += 1;
  if (previewMusicSource && previewMusicGain && context) {
    const source = previewMusicSource;
    const gain = previewMusicGain;
    try {
      gain.gain.cancelScheduledValues(context.currentTime);
      gain.gain.setValueAtTime(gain.gain.value, context.currentTime);
      gain.gain.linearRampToValueAtTime(0, context.currentTime + 0.12);
      source.stop(context.currentTime + 0.15);
    } catch {
      try { source.stop(); } catch { /* Déjà arrêté. */ }
    }
  }
  previewMusicSource = null;
  previewMusicGain = null;
}

/** Joue un fichier d'effet par le bus des bruitages (volume et mute du jeu). */
export async function previewSfx(src: string): Promise<boolean> {
  loadPreference();
  const ctx = audioContext();
  if (!ctx) return false;
  if (ctx.state === "suspended") void ctx.resume();
  const buffer = await loadPreviewBuffer(ctx, src);
  if (!buffer) return false;
  try {
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(masterBus(ctx));
    source.start();
    return true;
  } catch {
    return false;
  }
}
