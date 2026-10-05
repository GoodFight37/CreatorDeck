/**
 * Sérialisation, validation, migration et persistance locale d'une partie.
 *
 * Le stockage est injecté (interface `KeyValueStorage`) : `window.localStorage`
 * en production (navigateur, PWA, WebView Capacitor), une Map en test.
 *
 * Une sauvegarde d'une version antérieure est migrée à la lecture (voir
 * `migrateState`) : passer en v2 (Atelier + saisons) ne fait perdre aucune
 * collection.
 */
import { CREATOR_BY_SLUG, PACKS, type CardVariant, type Rarity } from "@/lib/catalog";
import {
  SAVE_VERSION,
  type OwnedCard,
  type PlayerState,
} from "@/lib/game-engine";
import { SEASON_BY_ID } from "@/lib/seasons";

/** Clé courante de la sauvegarde. */
export const SAVE_KEY = `creatordeck.save.v${SAVE_VERSION}`;
/** Clés des versions précédentes, migrées puis supprimées à la lecture. */
export const LEGACY_SAVE_KEYS = ["creatordeck.save.v1"] as const;
/** Versions de sauvegarde que ce build sait lire. */
export const SUPPORTED_SAVE_VERSIONS: readonly number[] = [1, SAVE_VERSION];

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
  return {
    id,
    creatorSlug,
    rarity: rarity as Rarity,
    variant: variant as CardVariant,
    obtainedAt: epochMs(value.obtainedAt, 0),
    // Champ apparu en v2 : les sauvegardes v1 valent « carte normale ».
    rareDrop: value.rareDrop === true,
  };
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
    livePacks: Math.min(PACKS.live.max, nonNegativeInt(raw.livePacks, 0)),
    archivePacks: Math.min(PACKS.archive.max, nonNegativeInt(raw.archivePacks, 0)),
    lastLiveRegen: epochMs(raw.lastLiveRegen, now),
    lastArchiveRegen: epochMs(raw.lastArchiveRegen, now),
    openings: nonNegativeInt(raw.openings, 0),
    cards: uniqueCards,
    claimedSeasons: sanitizeSeasons(raw.claimedSeasons),
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
