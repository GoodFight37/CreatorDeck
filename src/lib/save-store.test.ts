import { describe, expect, it } from "vitest";
import { CREATORS, PACKS } from "@/lib/catalog";
import { SAVE_VERSION, createInitialState, openPack } from "@/lib/game-engine";
import { SEASON_BY_ID, SEASONS } from "@/lib/seasons";
import { gameDay } from "@/lib/progression";
import { setupBonusPermille } from "@/lib/streamer";
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
    const { state } = openPack(createInitialState(T0), T0 + 1);
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
    expect(sanitizeState({ ...createInitialState(T0), version: SAVE_VERSION + 1 })).toBeNull();
    expect(sanitizeState({ ...createInitialState(T0), cards: "nope" })).toBeNull();
  });

  it("ramène les valeurs aberrantes dans les bornes et ignore les cartes inconnues", () => {
    const raw = {
      ...createInitialState(T0),
      packs: 99,
      points: 12.7,
      level: 0,
      hourglasses: Number.NaN,
      lastPackRegen: "2026-01-01T10:00:00Z",
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
    expect(state?.packs).toBe(PACKS.live.max);
    expect(state?.points).toBe(12);
    expect(state?.level).toBe(1);
    expect(state?.hourglasses).toBe(0);
    expect(state?.lastPackRegen).toBe(Date.parse("2026-01-01T10:00:00Z"));
    expect(state?.cards.map((card) => card.id)).toEqual(["a"]);
  });
});

describe("migration", () => {
  it("met à niveau une sauvegarde v1 sans perdre la collection", () => {
    const legacy = "creatordeck.save.v1";
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
    expect(state?.version).toBe(SAVE_VERSION);
    expect(state?.points).toBe(310);
    expect(state?.cards).toEqual([
      { id: "a", creatorSlug: "squeezie", rarity: "legendary", variant: "gold", obtainedAt: T0, rareDrop: false },
    ]);
    // La sauvegarde migrée est réécrite sous la clé courante, l'ancienne disparaît.
    expect(state?.claimedTiers).toEqual({});
    expect(storage.data.has(legacy)).toBe(false);
    expect(JSON.parse(storage.data.get(SAVE_KEY) ?? "{}").version).toBe(SAVE_VERSION);
    expect(loadState(storage, T0 + 6)).toEqual(state);
  });

  it("convertit une saison réclamée en v2 en tous ses paliers", () => {
    // En v2 une saison se soldait d'un bloc : la migration doit créditer tous
    // les paliers, sinon le joueur perdrait la récompense déjà touchée.
    const first = SEASONS[0];
    const second = SEASONS[1];
    const v2 = {
      ...createInitialState(T0),
      version: 2,
      claimedSeasons: [first.id, second.id, "S99"],
    };
    delete (v2 as Record<string, unknown>).claimedTiers;

    const storage = memoryStorage();
    storage.setItem("creatordeck.save.v2", JSON.stringify(v2));
    const state = loadState(storage, T0 + 5);

    expect(state?.version).toBe(SAVE_VERSION);
    expect(state?.claimedTiers[first.id]).toBe(first.tiers.length);
    expect(state?.claimedTiers[second.id]).toBe(second.tiers.length);
    // Une saison inconnue ne crée pas de palier fantôme.
    expect(Object.keys(state?.claimedTiers ?? {})).toEqual([first.id, second.id]);
    // Le total récupéré reste celui de l'ancienne récompense unique.
    const view = { tiers: SEASON_BY_ID.get(first.id)?.tiers ?? [] };
    expect(view.tiers.reduce((sum, tier) => sum + tier.reward.points, 0)).toBe(first.slugs.length * 4);
  });

  it("met à niveau une sauvegarde v8 sans perdre la collection ni le jour du Paquet Scène", () => {
    const v8 = {
      ...createInitialState(T0),
      version: 8,
      points: 480,
      cards: [
        { id: "carte-v8", creatorSlug: "squeezie", rarity: "epic", variant: "standard", obtainedAt: T0, rareDrop: false },
      ],
      sceneDay: "2026-01-01",
    };
    const storage = memoryStorage();
    storage.setItem("creatordeck.save.v8", JSON.stringify(v8));

    const state = loadState(storage, T0 + 5);

    expect(state).not.toBeNull();
    expect(state?.version).toBe(SAVE_VERSION);
    expect(state?.points).toBe(480);
    expect(state?.cards).toEqual(v8.cards);
    expect(state?.sceneDay).toBe("2026-01-01");
    expect(state?.tribunal).toEqual({ day: "", verdicts: {}, claimed: false });
    expect(storage.data.has("creatordeck.save.v8")).toBe(false);
    expect(JSON.parse(storage.data.get(SAVE_KEY) ?? "{}").version).toBe(SAVE_VERSION);
  });

  it("met à niveau une sauvegarde v5 : les jalons redeviennent réclamables", () => {
    // La récompense des jalons n'existait pas en v5 : aucune partie ne perd
    // quoi que ce soit, elle peut simplement réclamer ce qu'elle a déjà atteint.
    const v5 = {
      ...createInitialState(T0),
      version: 5,
      openings: 3,
    };
    delete (v5 as Record<string, unknown>).claimedMilestones;

    const storage = memoryStorage();
    storage.setItem("creatordeck.save.v5", JSON.stringify(v5));
    const state = loadState(storage, T0 + 5);

    expect(state?.version).toBe(SAVE_VERSION);
    expect(state?.openings).toBe(3);
    expect(state?.claimedMilestones).toEqual([]);
    // L'ancienne clé disparaît : la sauvegarde vit désormais sous la clé v6.
    expect(storage.data.has("creatordeck.save.v5")).toBe(false);
    expect(JSON.parse(storage.data.get(SAVE_KEY) ?? "{}").version).toBe(SAVE_VERSION);
  });

  it("met à niveau une sauvegarde v6 : jetons, pity et missions repartent de zéro", () => {
    // Ces mécaniques n'existaient pas en v6 : une partie qui arrive de là-bas
    // n'a rien gagné, donc ses compteurs sont à zéro — et sa journée de jeu est
    // celle du chargement, pas une date vide qui ferait « mission neuve » à
    // chaque ouverture.
    const v6 = {
      ...createInitialState(T0),
      version: 6,
      level: 4,
      cards: [],
    };
    for (const key of ["tokens", "pityCounter", "missionDay", "missions", "streakDay", "streak", "streakJackpot"]) {
      delete (v6 as Record<string, unknown>)[key];
    }

    const state = sanitizeState(v6, T0);
    expect(state?.version).toBe(SAVE_VERSION);
    expect(state?.level).toBe(4);
    expect(state).toMatchObject({
      tokens: 0,
      pityCounter: 0,
      missions: {},
      streakDay: "",
      streak: 0,
      streakJackpot: false,
    });
    expect(state?.missionDay).toBe(gameDay(T0));
  });

  it("ramène un compteur de pity trafiqué à une valeur sensée", () => {
    // Le compteur local ne décide de rien en ligne (le serveur relit son
    // journal), mais un écran qui afficherait « -3 boosters » serait faux.
    const raw = { ...createInitialState(T0), pityCounter: -3, tokens: -80 };
    expect(sanitizeState(raw, T0)).toMatchObject({ pityCounter: 0, tokens: 0 });
  });

  it("borne la progression des missions et oublie les identifiants inconnus", () => {
    const raw = {
      ...createInitialState(T0),
      missionDay: gameDay(T0),
      missions: { pack: 40, recycle: 1, family: -2, fantome: 3 },
    };
    const missions = sanitizeState(raw, T0)?.missions ?? {};
    expect(missions.pack).toBe(2);
    expect(missions.recycle).toBe(1);
    expect(missions.family).toBeUndefined();
    expect(Object.keys(missions)).toEqual(["pack", "recycle"]);
  });

  it("filtre les jalons réclamés inconnus et les doublons", () => {
    const raw = { ...createInitialState(T0), claimedMilestones: ["first", "first", "fantome", 7] };
    expect(sanitizeState(raw, T0)?.claimedMilestones).toEqual(["first"]);
    expect(sanitizeState({ ...createInitialState(T0), claimedMilestones: "first" }, T0)?.claimedMilestones).toEqual([]);
  });

  it("filtre les paliers réclamés inconnus et borne les compteurs", () => {
    const season = SEASONS[0];
    const raw = {
      ...createInitialState(T0),
      claimedTiers: { [season.id]: 99, inconnue: 2, autre: "3" },
    };
    expect(sanitizeState(raw, T0)?.claimedTiers).toEqual({ [season.id]: season.tiers.length });

    expect(
      sanitizeState({ ...createInitialState(T0), claimedTiers: "S01" }, T0)?.claimedTiers,
    ).toEqual({});
    expect(
      sanitizeState({ ...createInitialState(T0), claimedTiers: { [season.id]: -4 } }, T0)?.claimedTiers,
    ).toEqual({ [season.id]: 0 });
  });
});

describe("export/import", () => {
  it("réimporte exactement ce qui a été exporté", () => {
    const { state } = openPack(createInitialState(T0), T0);
    expect(importSave(exportSave(state), T0)).toEqual(state);
  });

  it("explique clairement les erreurs", () => {
    expect(() => importSave("pas du json")).toThrowError(SaveError);
    expect(() => importSave('{"version":42}')).toThrowError(/incompatible/);
  });
});

describe("marque d'échange", () => {
  it("conserve `fromTrade` : sans elle, un échange serait appliqué deux fois", () => {
    const state = {
      ...createInitialState(T0),
      cards: [
        {
          id: "carte-echangee",
          creatorSlug: CREATORS[0].slug,
          rarity: CREATORS[0].rarity,
          variant: "holo" as const,
          obtainedAt: T0,
          rareDrop: false,
          fromTrade: 42,
        },
      ],
    };
    const storage = memoryStorage();
    saveState(storage, state);
    const restored = loadState(storage, T0 + 1_000);

    expect(restored?.cards[0]?.fromTrade).toBe(42);
    // Une valeur bricolée à la main ne passe pas.
    const broken = exportSave({ ...state, cards: [{ ...state.cards[0], fromTrade: -3 }] } as typeof state);
    expect(importSave(broken, T0).cards[0]?.fromTrade).toBeUndefined();
  });
});
