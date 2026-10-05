import { describe, expect, it } from "vitest";
import { PACKS } from "@/lib/catalog";
import { createInitialState, openPack } from "@/lib/game-engine";
import {
  LEGACY_SAVE_KEYS,
  SAVE_KEY,
  SaveError,
  clearState,
  exportSave,
  importSave,
  loadState,
  sanitizeState,
  saveState,
  type KeyValueStorage,
} from "@/lib/save-store";

const T0 = Date.parse("2026-01-01T12:00:00Z");

function memoryStorage(): KeyValueStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

describe("save/load", () => {
  it("fait un aller-retour sans perte", () => {
    const storage = memoryStorage();
    const { state } = openPack(createInitialState(T0), "live", T0 + 1);
    saveState(storage, state);
    expect(storage.data.has(SAVE_KEY)).toBe(true);
    expect(loadState(storage, T0 + 2)).toEqual(state);
  });

  it("retourne null sans sauvegarde, après effacement ou si le JSON est corrompu", () => {
    const storage = memoryStorage();
    expect(loadState(storage)).toBeNull();
    saveState(storage, createInitialState(T0));
    clearState(storage);
    expect(loadState(storage)).toBeNull();
    storage.setItem(SAVE_KEY, "{oops");
    expect(loadState(storage)).toBeNull();
  });

  it("survit à un stockage qui lève une erreur", () => {
    const broken: KeyValueStorage = {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => {},
      removeItem: () => {},
    };
    expect(loadState(broken)).toBeNull();
  });
});

describe("sanitizeState", () => {
  it("rejette les structures étrangères ou d'une autre version", () => {
    expect(sanitizeState(null)).toBeNull();
    expect(sanitizeState("x")).toBeNull();
    expect(sanitizeState({})).toBeNull();
    expect(sanitizeState({ ...createInitialState(T0), version: 3 })).toBeNull();
    expect(sanitizeState({ ...createInitialState(T0), cards: "nope" })).toBeNull();
  });

  it("ramène les valeurs aberrantes dans les bornes et ignore les cartes inconnues", () => {
    const raw = {
      ...createInitialState(T0),
      livePacks: 99,
      archivePacks: -4,
      points: 12.7,
      level: 0,
      hourglasses: Number.NaN,
      lastLiveRegen: "2026-01-01T10:00:00Z",
      cards: [
        { id: "a", creatorSlug: "squeezie", rarity: "legendary", variant: "gold", obtainedAt: T0 },
        { id: "a", creatorSlug: "squeezie", rarity: "legendary", variant: "gold", obtainedAt: T0 },
        { id: "b", creatorSlug: "inconnu-xyz", rarity: "common", variant: "standard" },
        { id: "c", creatorSlug: "gotaga", rarity: "mythic", variant: "standard" },
        "garbage",
      ],
    };
    const state = sanitizeState(raw, T0);
    expect(state).not.toBeNull();
    expect(state?.livePacks).toBe(PACKS.live.max);
    expect(state?.archivePacks).toBe(0);
    expect(state?.points).toBe(12);
    expect(state?.level).toBe(1);
    expect(state?.hourglasses).toBe(0);
    expect(state?.lastLiveRegen).toBe(Date.parse("2026-01-01T10:00:00Z"));
    expect(state?.cards.map((card) => card.id)).toEqual(["a"]);
  });
});

describe("migration", () => {
  it("met à niveau une sauvegarde v1 sans perdre la collection", () => {
    const legacy = LEGACY_SAVE_KEYS[0];
    const v1 = {
      ...createInitialState(T0),
      version: 1,
      points: 310,
      cards: [
        { id: "a", creatorSlug: "squeezie", rarity: "legendary", variant: "gold", obtainedAt: T0 },
      ],
    };
    delete (v1 as Record<string, unknown>).claimedSeasons;
    const storage = memoryStorage();
    storage.setItem(legacy, JSON.stringify(v1));

    const state = loadState(storage, T0 + 5);
    expect(state).not.toBeNull();
    expect(state?.version).toBe(2);
    expect(state?.points).toBe(310);
    expect(state?.cards).toEqual([
      { id: "a", creatorSlug: "squeezie", rarity: "legendary", variant: "gold", obtainedAt: T0, rareDrop: false },
    ]);
    // La sauvegarde migrée est réécrite sous la clé courante, l'ancienne disparaît.
    expect(state?.claimedSeasons).toEqual([]);
    expect(storage.data.has(legacy)).toBe(false);
    expect(JSON.parse(storage.data.get(SAVE_KEY) ?? "{}").version).toBe(2);
    expect(loadState(storage, T0 + 6)).toEqual(state);
  });

  it("filtre les saisons réclamées inconnues", () => {
    const raw = { ...createInitialState(T0), claimedSeasons: ["S01", "inconnue", 42, "S01"] };
    expect(sanitizeState(raw, T0)?.claimedSeasons).toEqual(["S01"]);
    expect(sanitizeState({ ...createInitialState(T0), claimedSeasons: "S01" }, T0)?.claimedSeasons).toEqual([]);
  });
});

describe("export/import", () => {
  it("réimporte exactement ce qui a été exporté", () => {
    const { state } = openPack(createInitialState(T0), "archive", T0);
    expect(importSave(exportSave(state), T0)).toEqual(state);
  });

  it("explique clairement les erreurs", () => {
    expect(() => importSave("pas du json")).toThrowError(SaveError);
    expect(() => importSave('{"version":42}')).toThrowError(/incompatible/);
  });
});
