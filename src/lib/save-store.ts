/**
 * Sérialisation, validation, migration et persistance locale d'une partie.
 *
 * Le stockage est injecté (interface `KeyValueStorage`) : `window.localStorage`
 * en production (navigateur, PWA, WebView Capacitor), une Map en test.
 *
 * Une sauvegarde d'une version antérieure est migrée à la lecture : passer en
 * v2 (Atelier + saisons), v3 (paliers de saison), v4 (thème de collection), v5
 * (un seul booster au lieu de deux) ou v6 (récompenses des jalons) ne fait
 * perdre aucune collection.
 */
import { CREATOR_BY_SLUG, PACKS, type CardVariant, type Rarity } from "@/lib/catalog";
import {
  MILESTONE_BY_ID,
  SAVE_VERSION,
  type OwnedCard,
  type PlayerState,
  type TribunalVerdict,
} from "@/lib/game-engine";
import { SEASON_BY_ID } from "@/lib/seasons";
import { MISSIONS, gameDay } from "@/lib/progression";
import { DEFAULT_THEME_ID, themeById } from "@/lib/cosmetics";
import {
  EVENTS,
  GUEST_SLOTS,
  SETUP_LEVELS,
  STREAMER_TOKEN_CAP,
  formatById,
  newStreamerState,
  type StreamerEventState,
  type StreamerVideoState,
} from "@/lib/streamer";

/** Clé courante de la sauvegarde. */
export const SAVE_KEY = `creatordeck.save.v${SAVE_VERSION}`;
/** Clés des versions précédentes, migrées puis supprimées à la lecture. */
export const LEGACY_SAVE_KEYS = [
  // v9 : le Tribunal des Bannis. Les clés v6, v7 et v8 sont ajoutées en même
  // temps — elles manquaient, et une sauvegarde écrite par ces versions
  // n'était donc jamais relue : au passage à la version suivante, la partie
  // repartait de zéro. Une clé ajoutée ici n'efface rien, elle rend une
  // sauvegarde retrouvable.
  "creatordeck.save.v8",
  "creatordeck.save.v7",
  "creatordeck.save.v6",
  "creatordeck.save.v5",
  "creatordeck.save.v4",
  "creatordeck.save.v3",
  "creatordeck.save.v2",
  "creatordeck.save.v1",
] as const;
/** Versions de sauvegarde que ce build sait lire. */
export const SUPPORTED_SAVE_VERSIONS: readonly number[] = [1, 2, 3, 4, 5, 6, 7, SAVE_VERSION];

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export class SaveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SaveError";
  }
}

const RARITIES = new Set<Rarity>(["common", "uncommon", "rare", "epic", "legendary"]);
const VARIANTS = new Set<CardVariant>(["standard", "live", "holo", "gold"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonNegativeInt(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.floor(value));
}

function epochMs(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return Math.floor(value);
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function sanitizeCard(value: unknown): OwnedCard | null {
  if (!isRecord(value)) return null;
  const { id, creatorSlug, rarity, variant } = value;
  if (typeof id !== "string" || !id) return null;
  if (typeof creatorSlug !== "string" || !CREATOR_BY_SLUG.has(creatorSlug)) return null;
  if (typeof rarity !== "string" || !RARITIES.has(rarity as Rarity)) return null;
  if (typeof variant !== "string" || !VARIANTS.has(variant as CardVariant)) return null;
  const fromTrade = value.fromTrade;
  const fromMarket = value.fromMarket;
  const fromLastPack = value.fromLastPack;
  return {
    id,
    creatorSlug,
    rarity: rarity as Rarity,
    variant: variant as CardVariant,
    obtainedAt: epochMs(value.obtainedAt, 0),
    // Champ apparu en v2 : les sauvegardes v1 valent « carte normale ».
    rareDrop: value.rareDrop === true,
    // Champ apparu avec les échanges : numéro de l'échange qui a apporté la
    // carte. **À conserver** : c'est la marque qui empêche d'appliquer deux
    // fois le même échange (voir `applyTradeResult`).
    ...(typeof fromTrade === "number" && Number.isFinite(fromTrade) && fromTrade > 0
      ? { fromTrade: Math.floor(fromTrade) }
      : {}),
    // Champ apparu avec l'hôtel des ventes : même rôle, même précaution. Une
    // sauvegarde relue sans cette marque pourrait recevoir deux fois la même
    // carte au chargement suivant.
    ...(typeof fromMarket === "number" && Number.isFinite(fromMarket) && fromMarket > 0
      ? { fromMarket: Math.floor(fromMarket) }
      : {}),
    // Champ apparu avec le Last Pack : même rôle. Deux cartes d'un même paquet
    // pouvant être prises deux jours différents, c'est l'identifiant de la
    // carte qui sert d'idempotence — cette marque dit d'où elle vient.
    ...(typeof fromLastPack === "number" && Number.isFinite(fromLastPack) && fromLastPack > 0
      ? { fromLastPack: Math.floor(fromLastPack) }
      : {}),
  };
}

/**
 * Paliers réclamés par saison.
 *
 * v3 stocke `{ seasonId: nombreDePaliers }`. Les sauvegardes v1/v2 stockaient
 * `claimedSeasons: string[]`, où réclamer une saison la soldait d'un bloc : on
 * les migre en créditant tous les paliers, ce qui laisse le total de points et
 * de sabliers identique (la répartition par paliers somme exactement l'ancienne
 * récompense unique).
 */
function sanitizeClaimedTiers(value: unknown, legacySeasons: unknown): Record<string, number> {
  const claimed: Record<string, number> = {};
  if (isRecord(value)) {
    for (const [seasonId, count] of Object.entries(value)) {
      const season = SEASON_BY_ID.get(seasonId);
      if (!season) continue;
      claimed[seasonId] = Math.min(season.tiers.length, nonNegativeInt(count, 0));
    }
  }
  for (const seasonId of sanitizeSeasons(legacySeasons)) {
    const season = SEASON_BY_ID.get(seasonId);
    if (season) claimed[seasonId] = Math.max(claimed[seasonId] ?? 0, season.tiers.length);
  }
  return claimed;
}

/**
 * Jalons réclamés : identifiants connus, sans doublon. Une sauvegarde v5 (ou
 * antérieure) n'a pas ce champ : la partie repart avec aucun jalon réclamé,
 * donc les jalons déjà atteints redeviennent réclamables — c'est volontaire, la
 * récompense n'existait pas avant cette version.
 */
function sanitizeMilestones(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  for (const entry of value) {
    if (typeof entry === "string" && MILESTONE_BY_ID.has(entry)) seen.add(entry);
  }
  return [...seen];
}

function sanitizeSeasons(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  for (const entry of value) {
    if (typeof entry === "string" && SEASON_BY_ID.has(entry)) seen.add(entry);
  }
  return [...seen];
}

/**
 * Progression des missions du jour.
 *
 * On ne garde que les identifiants connus, et une valeur bornée : une
 * sauvegarde trafiquée ne peut pas faire apparaître « 99/1 ». La valeur
 * `target + 1` est celle qu'écrit `claimMissions()` pour dire « réclamée » —
 * elle est donc valide, et c'est la borne haute.
 */
/**
 * La **chaîne** (`0036`) : un état relu sans être cru sur parole.
 *
 * Une sauvegarde bricolée ne doit pas offrir un million d'abonnés ni des jetons
 * de chaîne au-delà du plafond : les abonnés sont des nombres positifs, le
 * compteur du jour est borné par le plafond du fichier, et la vidéo n'est gardée
 * que si son format existe vraiment. Tout ce qui ne se relit pas retombe sur un
 * état neuf — l'écran, lui, s'affiche quand même.
 */
function sanitizeStreamerVideo(value: unknown): StreamerVideoState | null {
  if (!isRecord(value)) return null;
  if (typeof value.day !== "string" || typeof value.format !== "string") return null;
  if (!formatById(value.format)) return null;
  const gained = typeof value.gained === "number" && Number.isFinite(value.gained) ? Math.trunc(value.gained) : 0;
  return {
    day: value.day,
    format: value.format,
    success: value.success === true,
    buzz: value.buzz === true,
    badBuzz: value.badBuzz === true,
    gained,
    tokens: Math.min(STREAMER_TOKEN_CAP, nonNegativeInt(value.tokens, 0)),
    // Le plateau de la vidéo (`0041`) : le bonus appliqué et le raid. Ils se
    // relisent tels quels — une sauvegarde d'avant la `0041` retombe sur zéro,
    // ce qui est exactement ce qu'elle valait.
    collab: nonNegativeInt(value.collab, 0),
    raid: value.raid === true,
  };
}

/**
 * La réponse à un **imprévu** (`0038`) : gardée seulement si la carte et le côté
 * existent encore dans le fichier de règles. Une carte retirée du jeu ne doit
 * pas rester dans une sauvegarde pour être réaffichée comme si de rien n'était.
 */
function sanitizeStreamerEvent(value: unknown): StreamerEventState | null {
  if (!isRecord(value)) return null;
  if (typeof value.day !== "string" || typeof value.event !== "string") return null;
  const carte = EVENTS.find((event) => event.id === value.event);
  if (!carte) return null;
  const cote = carte.choices.find((choice) => choice.id === value.choice);
  if (!cote) return null;
  const gained = typeof value.gained === "number" && Number.isFinite(value.gained) ? Math.trunc(value.gained) : 0;
  return {
    day: value.day,
    event: carte.id,
    choice: cote.id,
    success: value.success === true,
    buzz: value.buzz === true,
    badBuzz: value.badBuzz === true,
    gained,
  };
}

/**
 * Les paliers de **setup** achetés : on ne garde que des identifiants connus, et
 * **dans l'ordre du fichier** — c'est l'ordre qui fait le bonus, et une
 * sauvegarde bricolée ne doit pas s'offrir le studio sans le micro.
 */
function sanitizeSetup(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const achetes: string[] = [];
  for (const level of SETUP_LEVELS) {
    if (value.includes(level.id)) achetes.push(level.id);
  }
  return achetes;
}

function sanitizeStreamer(value: unknown, now: number): PlayerState["streamer"] {
  if (!isRecord(value)) return newStreamerState(now);
  return {
    subscribers: nonNegativeInt(value.subscribers, 0),
    lastSeenAt: epochMs(value.lastSeenAt, now),
    tokensDay: typeof value.tokensDay === "string" ? value.tokensDay : "",
    tokensToday: Math.min(STREAMER_TOKEN_CAP, nonNegativeInt(value.tokensToday, 0)),
    video: sanitizeStreamerVideo(value.video),
    event: sanitizeStreamerEvent(value.event),
    setup: sanitizeSetup(value.setup),
    guests: sanitizeGuests(value.guests),
    raid: sanitizeRaid(value.raid),
  };
}

/** Le bureau : au plus deux invités, deux créateurs différents, des raretés connues. */
function sanitizeGuests(value: unknown): PlayerState["streamer"]["guests"] {
  if (!Array.isArray(value)) return [];
  const result: PlayerState["streamer"]["guests"] = [];
  const vus = new Set<string>();
  for (const raw of value) {
    if (!isRecord(raw)) continue;
    const slot = Math.floor(Number(raw.slot));
    const slug = typeof raw.slug === "string" ? raw.slug.toLowerCase() : "";
    const cardId = typeof raw.cardId === "string" ? raw.cardId : "";
    const rarity = String(raw.rarity ?? "") as Rarity;
    const variant = String(raw.variant ?? "") as CardVariant;
    if (slot < 1 || slot > GUEST_SLOTS) continue;
    if (!slug || !cardId) continue;
    if (!RARITIES.has(rarity) || !VARIANTS.has(variant)) continue;
    if (vus.has(slug) || result.some((guest) => guest.slot === slot)) continue;
    vus.add(slug);
    result.push({ slot, cardId, slug, rarity, variant });
  }
  return result.sort((a, b) => a.slot - b.slot);
}

/** Le dernier raid : une journée connue, un gain positif, des créateurs. */
function sanitizeRaid(value: unknown): PlayerState["streamer"]["raid"] {
  if (!isRecord(value)) return null;
  const day = typeof value.day === "string" ? value.day : "";
  const gained = nonNegativeInt(value.gained, 0);
  if (!day || gained <= 0) return null;
  const slugs = Array.isArray(value.slugs)
    ? value.slugs.filter((slug): slug is string => typeof slug === "string").map((slug) => slug.toLowerCase())
    : [];
  return { day, gained, slugs };
}

function sanitizeMissions(value: unknown): PlayerState["missions"] {
  if (!isRecord(value)) return {};
  const result: PlayerState["missions"] = {};
  for (const mission of MISSIONS) {
    const raw = value[mission.id];
    if (typeof raw !== "number" || !Number.isFinite(raw)) continue;
    const bounded = Math.max(0, Math.min(mission.target + 1, Math.floor(raw)));
    if (bounded > 0) result[mission.id] = bounded;
  }
  return result;
}

/**
 * Valide et normalise une sauvegarde brute (JSON déjà parsé), en migrant au
 * passage les versions antérieures. Retourne `null` si la structure n'est pas
 * exploitable ; les champs manquants ou aberrants sont ramenés à des valeurs
 * sûres, les cartes inconnues sont ignorées.
 */
export function sanitizeState(raw: unknown, now = Date.now()): PlayerState | null {
  if (!isRecord(raw)) return null;
  if (typeof raw.version !== "number" || !SUPPORTED_SAVE_VERSIONS.includes(raw.version)) {
    return null;
  }
  if (typeof raw.playerId !== "string" || !raw.playerId) return null;
  if (!Array.isArray(raw.cards)) return null;

  const cards = raw.cards.map(sanitizeCard).filter((card): card is OwnedCard => card !== null);
  const seen = new Set<string>();
  const uniqueCards = cards.filter((card) => {
    if (seen.has(card.id)) return false;
    seen.add(card.id);
    return true;
  });

  const createdAt = epochMs(raw.createdAt, now);
  const level = Math.max(1, nonNegativeInt(raw.level, 1));

  return {
    version: SAVE_VERSION,
    playerId: raw.playerId,
    createdAt,
    updatedAt: epochMs(raw.updatedAt, createdAt),
    level,
    xp: nonNegativeInt(raw.xp, 0),
    points: nonNegativeInt(raw.points, 0),
    hourglasses: nonNegativeInt(raw.hourglasses, 0),
    // v5 : un seul booster. Les sauvegardes v4 avaient deux réserves (Live et
    // Archives) : on additionne, borné à la nouvelle réserve — aucune partie ne
    // perd de boosters en passant.
    packs: Math.min(
      PACKS.live.max,
      nonNegativeInt(raw.packs, nonNegativeInt(raw.livePacks, 0) + nonNegativeInt(raw.archivePacks, 0)),
    ),
    // Ancre de recharge : la plus ancienne des deux (la plus favorable), en
    // gardant la valeur par défaut si aucune n'est lisible.
    lastPackRegen: epochMs(
      raw.lastPackRegen,
      Math.min(epochMs(raw.lastLiveRegen, now), epochMs(raw.lastArchiveRegen, now)),
    ),
    openings: nonNegativeInt(raw.openings, 0),
    cards: uniqueCards,
    claimedTiers: sanitizeClaimedTiers(raw.claimedTiers, raw.claimedSeasons),
    // v6 : jalons réclamés. Un jalon inconnu (retiré du jeu) est simplement
    // oublié ; un doublon est réduit à une seule entrée.
    claimedMilestones: sanitizeMilestones(raw.claimedMilestones),
    // Thème inconnu (sauvegarde d'une version où la famille existait, édition
    // à la main…) : on retombe sur le thème d'origine plutôt que de planter.
    themeId: themeById(typeof raw.themeId === "string" ? raw.themeId : undefined)?.id ?? DEFAULT_THEME_ID,
    // v7 : jetons, plancher de malchance, missions du jour et série de jours.
    // Une sauvegarde v6 démarre à zéro partout, ce qui est exact : elle n'a
    // jamais rien gagné de ces mécaniques.
    tokens: nonNegativeInt(raw.tokens, 0),
    streamer: sanitizeStreamer(raw.streamer, now),
    pityCounter: nonNegativeInt(raw.pityCounter, 0),
    missionDay: typeof raw.missionDay === "string" ? raw.missionDay : gameDay(now),
    missions: sanitizeMissions(raw.missions),
    streakDay: typeof raw.streakDay === "string" ? raw.streakDay : "",
    streak: nonNegativeInt(raw.streak, 0),
    streakJackpot: raw.streakJackpot === true,
    // v8 : journée du dernier Paquet Scène (chaîne vide = jamais ouvert).
    sceneDay: typeof raw.sceneDay === "string" ? raw.sceneDay : "",
    // v9 : la séance du Tribunal des Bannis. Une sauvegarde plus ancienne
    // démarre une séance vide, ce qui est exact : elle n'a jamais siégé.
    tribunal: sanitizeTribunal(raw.tribunal),
  };
}

/**
 * La séance du Tribunal.
 *
 * Les verdicts sont relus **un par un** : un identifiant inconnu ou un verdict
 * illisible est oublié (il ne fera pas partie du bilan) plutôt que de faire
 * échouer toute la sauvegarde. La journée, elle, est gardée telle quelle : si
 * elle ne correspond plus à aujourd'hui, le moteur repart de zéro tout seul.
 */
function sanitizeTribunal(raw: unknown): PlayerState["tribunal"] {
  if (!isRecord(raw)) return { day: "", verdicts: {}, claimed: false };
  const verdicts: Record<string, TribunalVerdict> = {};
  if (isRecord(raw.verdicts)) {
    for (const [id, verdict] of Object.entries(raw.verdicts)) {
      if (verdict === "deban" || verdict === "ban") verdicts[id] = verdict;
    }
  }
  return {
    day: typeof raw.day === "string" ? raw.day : "",
    verdicts,
    claimed: raw.claimed === true,
  };
}

function readKey(storage: KeyValueStorage, key: string, now: number): PlayerState | null {
  let raw: string | null;
  try {
    raw = storage.getItem(key);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    return sanitizeState(JSON.parse(raw), now);
  } catch {
    return null;
  }
}

/**
 * Lit la sauvegarde : clé courante d'abord, puis les clés des versions
 * précédentes. Une sauvegarde héritée est migrée, réécrite sous la clé
 * courante et l'ancienne clé est supprimée.
 */
export function loadState(storage: KeyValueStorage, now = Date.now()): PlayerState | null {
  for (const key of [SAVE_KEY, ...LEGACY_SAVE_KEYS]) {
    const state = readKey(storage, key, now);
    if (!state) continue;
    if (key !== SAVE_KEY) {
      try {
        saveState(storage, state);
        storage.removeItem(key);
      } catch {
        // Stockage indisponible : la partie reste jouable en mémoire.
      }
    }
    return state;
  }
  return null;
}

export function saveState(storage: KeyValueStorage, state: PlayerState): void {
  storage.setItem(SAVE_KEY, JSON.stringify(state));
}

export function clearState(storage: KeyValueStorage): void {
  for (const key of [SAVE_KEY, ...LEGACY_SAVE_KEYS]) {
    storage.removeItem(key);
  }
}

/** Sauvegarde exportable (JSON lisible), à coller dans « Importer ». */
export function exportSave(state: PlayerState): string {
  return JSON.stringify(state, null, 2);
}

/** Lit une sauvegarde collée par l'utilisateur ; lève `SaveError` si invalide. */
export function importSave(json: string, now = Date.now()): PlayerState {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json.trim());
  } catch {
    throw new SaveError("Ce texte n'est pas une sauvegarde CreatorDeck valide (JSON illisible).");
  }
  const state = sanitizeState(parsed, now);
  if (!state) {
    throw new SaveError("Cette sauvegarde est incompatible avec cette version de CreatorDeck.");
  }
  return state;
}
