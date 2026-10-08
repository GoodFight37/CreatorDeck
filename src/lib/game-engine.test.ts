import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CATALOG_SIZE,
  CREATORS,
  CREATOR_BY_SLUG,
  PACKS,
  RARITY_META,
  type CardVariant,
  type Rarity,
} from "@/lib/catalog";
import { DIRECT_BONUS, PULL_RATES, packOdds } from "@/lib/pull-rates";
import {
  CATALOG_EDITION_NUMBER,
  RETIRED_BY_SLUG,
  RETIRED_CREATORS,
  type Creator,
  type RetiredCreator,
} from "@/lib/catalog";
import { SEASONS, seasonOf, seasonsCoverage } from "@/lib/seasons";
import { START, gameDay } from "@/lib/progression";
import {
  GameError,
  HOURGLASSES_PER_LEVEL,
  HOURGLASS_REDUCTION_MS,
  SAVE_VERSION,
  SCENE_MIN_FAMILY,
  XP_PER_LEVEL,
  applyLastPackSteal,
  applyMarketPurchase,
  applyMarketSale,
  applyPackResult,
  applyPackStatus,
  applyTradeResult,
  bulkRecyclableIds,
  bulkRecycleCards,
  recycleNeedsConfirm,
  claimMilestone,
  claimSeason,
  claimTribunal,
  craftCreator,
  applySetupSacrifice,
  applyStreamerMirror,
  payStreamerRaidLocally,
  sacrificeSetupLocally,
  sacrificeTally,
  setStreamerGuestLocally,
  setupSacrificeCandidates,
  visitStreamerLocally,
  applyWallet,
  buyStreamerSetupLocally,
  chooseStreamerEventLocally,
  createInitialState,
  creatorWeight,
  currentSeason,
  drawPack,
  duplicateGroups,
  getGameView,
  MILESTONES,
  milestoneViews,
  openPack,
  openScenePack,
  recordVerdict,
  recycleCard,
  sceneFamily,
  refreshBalances,
  seasonViews,
  publishStreamerLocally,
  spendHourglass,
  tribunalSeance,
  type DrawnCard,
  type OwnedCard,
  type PlayerState,
} from "@/lib/game-engine";
import { dossiersDuJour } from "@/lib/tribunal";
import {
  EVENTS,
  SETUP_LEVELS,
  eventForDay,
  growthPerDay,
  growthWithSetup,
  setupLevelById,
} from "@/lib/streamer";

/**
 * Gèle l'aléa sur une suite de valeurs. `randomInt(n)` échantillonne par rejet
 * sur 32 bits, donc une petite valeur passe toujours et arrive telle quelle :
 * `stubRandom([0])` garantit un tirage à 0, `stubRandom([999])` un tirage à 999.
 */
function stubRandom(values: number[]): void {
  let cursor = 0;
  vi.stubGlobal("crypto", {
    getRandomValues<T extends ArrayBufferView>(buffer: T): T {
      const view = buffer as unknown as { length: number; [index: number]: number };
      for (let index = 0; index < view.length; index += 1) {
        view[index] = values[Math.min(cursor, values.length - 1)] ?? 0;
        cursor += 1;
      }
      return buffer;
    },
  });
}

/** Le catalogue entier en direct : le cas où la variante Live est possible. */
const ALL_LIVE = new Set(CREATORS.map((creator) => creator.login));
/** Personne en direct — ou, ce qui revient au même, aucune information. */
const NONE_LIVE = new Set<string>();

const HOUR = 60 * 60 * 1000;
const HALF_HOUR = 30 * 60 * 1000;
const T0 = Date.parse("2026-01-01T12:00:00Z");

afterEach(() => {
  vi.unstubAllGlobals();
});

function makeState(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    ...createInitialState(T0),
    playerId: "00000000-0000-4000-8000-000000000000",
    packs: 0,
    ...overrides,
  };
}

describe("createInitialState", () => {
  it("donne les ressources de départ", () => {
    // Le départ est une **règle de données** (`progression.json`, bloc `start`) :
    // ce test la lit au lieu de la recopier, donc un chiffre changé d'un seul
    // côté ne peut pas passer inaperçu.
    const state = createInitialState(T0);
    expect(state).toMatchObject({
      version: SAVE_VERSION,
      level: 1,
      xp: 0,
      points: START.points,
      hourglasses: START.hourglasses,
      packs: START.packs,
      openings: 0,
      cards: [],
      claimedTiers: {},
      createdAt: T0,
    });
    // Le départ reste **maigre** : ce n'est pas un réglage qu'on pousse à 100.
    expect(START.packs).toBeLessThanOrEqual(3);
    expect(START.hourglasses).toBeLessThanOrEqual(3);
    expect(state.playerId).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe("refreshBalances", () => {
  it("régénère un booster par demi-heure", () => {
    // 1 h 30 avant `now` -> 3 boosters regagnés (1 toutes les 30 min).
    const state = makeState({ lastPackRegen: T0 - 1.5 * HOUR });
    const refreshed = refreshBalances(state, T0);
    expect(refreshed.packs).toBe(3);
    expect(refreshed.lastPackRegen).toBe(T0);
  });

  it("plafonne au maximum du booster et ré-ancre sur now", () => {
    const state = makeState({ lastPackRegen: T0 - 100 * HOUR });
    const refreshed = refreshBalances(state, T0);
    expect(refreshed.packs).toBe(PACKS.live.max);
    expect(refreshed.lastPackRegen).toBe(T0);
  });

  it("ne régénère rien si le stock est déjà plein", () => {
    const state = makeState({ packs: PACKS.live.max });
    expect(refreshBalances(state, T0).packs).toBe(PACKS.live.max);
  });

  it("retourne la même référence quand rien ne change", () => {
    const state = makeState({ lastPackRegen: T0 - 1000 });
    expect(refreshBalances(state, T0)).toBe(state);
  });

  it("n'offre rien si l'horloge de l'appareil recule", () => {
    const state = makeState({ lastPackRegen: T0 + 5 * HOUR });
    const refreshed = refreshBalances(state, T0);
    expect(refreshed.packs).toBe(0);
    expect(refreshed.lastPackRegen).toBe(T0);
  });
});

describe("drawPack", () => {
  const GUARANTEED = ["rare", "epic", "legendary"];

  function expectValidPack(pack: DrawnCard[], size: number) {
    expect(pack).toHaveLength(size);
    expect(pack.some((card) => GUARANTEED.includes(card.rarity))).toBe(true);
    const slugs = pack.map((card) => card.creatorSlug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const card of pack) {
      expect(CREATORS.some((c) => c.slug === card.creatorSlug && c.rarity === card.rarity)).toBe(
        true,
      );
    }
  }

  it("un booster Live contient 5 cartes dont une Rare+ en variante Live", () => {
    for (let i = 0; i < 25; i += 1) {
      const pack = drawPack("live", new Set(), { liveLogins: ALL_LIVE });
      expectValidPack(pack, PACKS.live.size);
      // La carte garantie est Live (son créateur streame) ; les slots
      // ordinaires peuvent l'être aussi (20 % pour un créateur en direct).
      expect(pack.filter((card) => card.variant === "live").length).toBeGreaterThanOrEqual(1);
      expect(pack[pack.length - 1].variant).toBe("live");
    }
  });

  it("révèle la carte garantie en dernier, jamais en premier", () => {
    // L'ordre du tirage est l'ordre de la révélation : la cinquième carte du
    // tableau est le slot garanti (Rare ou mieux, variante Live imposée).
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const pack = drawPack("live", new Set(), { liveLogins: ALL_LIVE });
      const last = pack[pack.length - 1];
      expect(last.variant).toBe("live");
      expect(GUARANTEED).toContain(last.rarity);
    }
    // Même en Perfect (les 5 cartes en Épique ou mieux), la garantie ferme.
    const perfect = drawPack("live", new Set(), { rareDrop: true, liveLogins: ALL_LIVE });
    expect(perfect[perfect.length - 1].variant).toBe("live");
  });

  it("sans information sur le direct, aucune carte n'est en variante Live", () => {
    // C'est la règle qui donne sa valeur à la variante : un « Live » qui
    // désignerait quelqu'un qui ne streame pas ne vaudrait rien.
    for (let i = 0; i < 60; i += 1) {
      for (const options of [{}, { liveLogins: NONE_LIVE }]) {
        const pack = drawPack("live", new Set(), options);
        expect(pack.every((card) => card.variant !== "live")).toBe(true);
      }
    }
  });

  it("le créateur en direct pèse ×1,5, les autres 1", () => {
    const creator = CREATORS[0];
    expect(creatorWeight(creator, ALL_LIVE)).toBe(DIRECT_BONUS.creatorBias);
    expect(creatorWeight(creator, NONE_LIVE)).toBe(1);
    expect(creatorWeight(creator)).toBe(1);
    // Un créateur absent de la liste des directs ne pèse pas plus lourd.
    const other = CREATORS.find((c) => c.login !== creator.login) as (typeof CREATORS)[number];
    expect(creatorWeight(other, new Set([creator.login]))).toBe(1);
  });

  it("fait tomber plus souvent les créateurs qui streament", () => {
    // Le poids doit servir *au tirage*, pas seulement à être calculé. Le bonus
    // s'applique dans une rareté : on mesure donc sur **une seule rareté**, la
    // moitié des légendaires étant en direct. Les tirages « Perfect » (18 % de
    // légendaires par carte) donnent assez de matière pour un seuil placé à
    // mi-chemin entre « aucun bonus » et « bonus appliqué » — un test qui
    // échoue si la règle disparaît, pas si la chance du jour est moyenne.
    const legendary = CREATORS.filter((creator) => creator.rarity === "legendary");
    const half = Math.floor(legendary.length / 2);
    const liveLogins = new Set(legendary.slice(0, half).map((creator) => creator.login));
    const liveSlugs = new Set(legendary.slice(0, half).map((creator) => creator.slug));
    const others = legendary.length - half;
    const nullShare = half / legendary.length;
    const biasedShare = (half * DIRECT_BONUS.creatorBias) / (half * DIRECT_BONUS.creatorBias + others);
    const threshold = (nullShare + biasedShare) / 2;

    let legendaries = 0;
    let hits = 0;
    for (let i = 0; i < 1500; i += 1) {
      for (const card of drawPack("live", new Set(), { rareDrop: true, liveLogins })) {
        if (card.rarity !== "legendary") continue;
        legendaries += 1;
        if (liveSlugs.has(card.creatorSlug)) hits += 1;
      }
    }

    expect(biasedShare).toBeGreaterThan(nullShare);
    expect(legendaries).toBeGreaterThan(400);
    expect(hits / legendaries).toBeGreaterThan(threshold);
  });

  it("la carte garantie est en variante Live quand son créateur streame", () => {
    for (let i = 0; i < 25; i += 1) {
      const pack = drawPack("live", new Set(), { liveLogins: ALL_LIVE });
      expect(pack[pack.length - 1].variant).toBe("live");
      expect(GUARANTEED).toContain(pack[pack.length - 1].rarity);
    }
  });

  it("marque isNew selon la collection possédée", () => {
    expect(drawPack("live", new Set()).every((card) => card.isNew)).toBe(true);
    const owned = new Set(CREATORS.slice(0, 4).map((creator) => creator.slug));
    for (let i = 0; i < 25; i += 1) {
      for (const card of drawPack("live", owned)) {
        expect(card.isNew).toBe(!owned.has(card.creatorSlug));
      }
    }
  });
});

describe("openPack", () => {
  it("consomme un booster, crédite points et XP, ajoute les cartes", () => {
    const state = makeState({ packs: 2 });
    const { state: next, cards, streakReward } = openPack(state, T0);
    expect(cards).toHaveLength(PACKS.live.size);
    expect(next.packs).toBe(1);
    // Le booster paie ses points, **et** le jour 1 de la série (40 points) :
    // c'est ce booster qui coche la première case du planning.
    expect(streakReward).toEqual({ day: 1, points: 40, hourglasses: 0, tokens: 0 });
    expect(next.points).toBe(state.points + PACKS.live.points + 40);
    expect(next.xp).toBe(PACKS.live.xp);
    expect(next.openings).toBe(1);
    expect(next.cards.map((card) => card.id)).toEqual(cards.map((card) => card.id));
    expect(next.cards.every((card) => card.obtainedAt === T0)).toBe(true);
    expect(next.updatedAt).toBe(T0);
    // Pureté : l'état d'origine n'est pas modifié.
    expect(state.packs).toBe(2);
    expect(state.cards).toHaveLength(0);
  });

  it("refuse d'ouvrir sans booster disponible", () => {
    expect(() => openPack(makeState(), T0)).toThrowError(GameError);
    try {
      openPack(makeState(), T0);
    } catch (error) {
      expect((error as GameError).code).toBe("PACK_NOT_READY");
    }
  });

  it("utilise un booster régénéré par le temps", () => {
    const state = makeState({ lastPackRegen: T0 - PACKS.live.regenMs });
    const { state: next } = openPack(state, T0);
    expect(next.packs).toBe(0);
    expect(next.openings).toBe(1);
  });

  it("monte de niveau et offre des sabliers", () => {
    const state = makeState({ packs: 1, xp: XP_PER_LEVEL - 1, level: 1 });
    const { state: next } = openPack(state, T0);
    expect(next.level).toBe(2);
    expect(next.hourglasses).toBe(state.hourglasses + HOURGLASSES_PER_LEVEL);
  });

  it("marque isNew=false pour un créateur déjà possédé", () => {
    let state = makeState({ packs: PACKS.live.max });
    const owned = new Set<string>();
    for (let i = 0; i < PACKS.live.max; i += 1) {
      const result = openPack(state, T0 + i);
      for (const card of result.cards) {
        expect(card.isNew).toBe(!owned.has(card.creatorSlug));
        owned.add(card.creatorSlug);
      }
      state = result.state;
    }
    expect(getGameView(state, T0 + 10).stats.uniqueCreators).toBe(owned.size);
  });
});

describe("applyPackResult", () => {
  const SERVER_CARDS = [
    { creatorSlug: "kaicenat", rarity: "legendary" as Rarity, variant: "live" as CardVariant, rareDrop: false },
    { creatorSlug: "ibai", rarity: "epic" as Rarity, variant: "holo" as CardVariant, rareDrop: false },
    { creatorSlug: "ninja", rarity: "rare" as Rarity, variant: "standard" as CardVariant, rareDrop: false },
    { creatorSlug: "auronplay", rarity: "uncommon" as Rarity, variant: "standard" as CardVariant, rareDrop: false },
    { creatorSlug: "rubius", rarity: "common" as Rarity, variant: "standard" as CardVariant, rareDrop: false },
  ];

  it("applique les cartes du serveur, crédite points et XP, met à jour les compteurs", () => {
    const state = makeState({ packs: 2, openings: 5 });
    const lastRegen = new Date(T0).toISOString();
    const { state: next, cards, streakReward } = applyPackResult(state, SERVER_CARDS, 1, lastRegen, 6, T0);

    expect(cards).toHaveLength(5);
    expect(next.packs).toBe(1);
    expect(next.openings).toBe(6);
    expect(streakReward?.day).toBe(1);
    expect(next.points).toBe(state.points + PACKS.live.points + 40);
    expect(next.xp).toBe(PACKS.live.xp);
    expect(next.cards).toHaveLength(5);
    expect(next.lastPackRegen).toBe(T0);
    expect(next.updatedAt).toBe(T0);
  });

  it("marque isNew correctement selon les cartes déjà possédées", () => {
    const state = makeState({
      packs: 1,
      cards: [
        {
          id: "existing-1",
          creatorSlug: "kaicenat",
          rarity: "legendary",
          variant: "standard",
          obtainedAt: T0 - 1000,
          rareDrop: false,
        },
      ],
    });
    const { cards } = applyPackResult(state, SERVER_CARDS, 0, T0, 1, T0);
    const kaicenat = cards.find((c) => c.creatorSlug === "kaicenat");
    const ibai = cards.find((c) => c.creatorSlug === "ibai");
    expect(kaicenat?.isNew).toBe(false);
    expect(ibai?.isNew).toBe(true);
  });

  it("accepte un epoch ms pour lastRegenAt", () => {
    const state = makeState({ packs: 1 });
    const { state: next } = applyPackResult(state, SERVER_CARDS, 0, T0, 1, T0);
    expect(next.lastPackRegen).toBe(T0);
  });

  it("calcule correctement la montée de niveau", () => {
    const state = makeState({ packs: 1, xp: XP_PER_LEVEL - 1, level: 1 });
    const { state: next } = applyPackResult(state, SERVER_CARDS, 0, T0, 1, T0);
    expect(next.level).toBe(2);
    expect(next.hourglasses).toBe(state.hourglasses + HOURGLASSES_PER_LEVEL);
  });

  it("préserve les cartes existantes", () => {
    const state = makeState({
      packs: 1,
      cards: [
        {
          id: "old-card",
          creatorSlug: "xqc",
          rarity: "legendary",
          variant: "gold",
          obtainedAt: T0 - 1000,
          rareDrop: true,
        },
      ],
    });
    const { state: next } = applyPackResult(state, SERVER_CARDS, 0, T0, 1, T0);
    expect(next.cards).toHaveLength(6);
    expect(next.cards[0]?.creatorSlug).toBe("xqc");
  });

  it("ne modifie pas l'état d'origine (pureté)", () => {
    const state = makeState({ packs: 2 });
    applyPackResult(state, SERVER_CARDS, 1, T0, 1, T0);
    expect(state.packs).toBe(2);
    expect(state.cards).toHaveLength(0);
    expect(state.openings).toBe(0);
  });

  it("applique exactement le même résultat que openPack sur les mêmes cartes", () => {
    // Le tirage local et le tirage serveur partagent la même application :
    // seules les cartes changent (ici celles du serveur, rejouées à la main).
    const state = makeState({ packs: 2 });
    const refreshed = refreshBalances(state, T0);
    const local = openPack(state, T0);
    const { state: shared } = applyPackResult(
      refreshed,
      local.cards,
      refreshed.packs - 1,
      refreshed.lastPackRegen,
      refreshed.openings + 1,
      T0,
    );
    expect(shared).toMatchObject({
      packs: local.state.packs,
      points: local.state.points,
      xp: local.state.xp,
      level: local.state.level,
      hourglasses: local.state.hourglasses,
      openings: local.state.openings,
      lastPackRegen: local.state.lastPackRegen,
    });
    expect(shared.cards.map((card) => card.creatorSlug)).toEqual(
      local.state.cards.map((card) => card.creatorSlug),
    );
  });
});

describe("applyPackStatus", () => {
  it("adopte la réserve du serveur sans toucher au reste de la partie", () => {
    const state = makeState({ packs: 1, points: 120, xp: 40, hourglasses: 5 });
    const next = applyPackStatus(state, 3, new Date(T0).toISOString(), T0 + 1_000);
    expect(next.packs).toBe(3);
    expect(next.lastPackRegen).toBe(T0);
    expect(next.points).toBe(120);
    expect(next.xp).toBe(40);
    expect(next.hourglasses).toBe(5);
    expect(next.updatedAt).toBe(T0 + 1_000);
    // Pureté : l'état d'origine n'est pas modifié.
    expect(state.packs).toBe(1);
  });

  it("borne la réserve à 0..4 et retombe sur maintenant si la date est illisible", () => {
    expect(applyPackStatus(makeState({ packs: 2 }), 9, T0, T0).packs).toBe(PACKS.live.max);
    expect(applyPackStatus(makeState({ packs: 2 }), -3, T0, T0).packs).toBe(0);
    expect(applyPackStatus(makeState({ packs: 2 }), 1, "pas une date", T0).lastPackRegen).toBe(T0);
  });

  it("renvoie l'état inchangé quand la réserve est déjà la bonne", () => {
    const state = makeState({ packs: 2, lastPackRegen: T0 });
    expect(applyPackStatus(state, 2, new Date(T0).toISOString(), T0 + 5_000)).toBe(state);
  });
});

describe("spendHourglass", () => {
  it("avance la recharge de 15 min", () => {
    const state = makeState({ hourglasses: 3, lastPackRegen: T0 });
    const next = spendHourglass(state, T0);
    expect(next.hourglasses).toBe(2);
    // `?? 0` : la table est partielle à dessein (le Paquet Scène n'est pas une
    // réserve qu'un sablier peut avancer).
    const shift = HOURGLASS_REDUCTION_MS.live ?? 0;
    expect(next.lastPackRegen).toBe(T0 - shift);
    expect(getGameView(next, T0).player.nextPackAt).toBe(T0 + PACKS.live.regenMs - shift);
  });

  it("peut débloquer un booster immédiatement", () => {
    // Il reste 5 min de recharge : un sablier (-15 min) suffit.
    const state = makeState({
      hourglasses: 1,
      lastPackRegen: T0 - (PACKS.live.regenMs - 5 * 60 * 1000),
    });
    const next = spendHourglass(state, T0);
    expect(next.packs).toBe(1);
    expect(next.hourglasses).toBe(0);
  });

  it("refuse sans sablier ou si la réserve est pleine", () => {
    expect(() => spendHourglass(makeState({ hourglasses: 0 }), T0)).toThrowError(/sablier/i);
    expect(() =>
      spendHourglass(makeState({ hourglasses: 5, packs: PACKS.live.max }), T0),
    ).toThrowError(/pleine/i);
  });
});

describe("getGameView", () => {
  it("calcule les prochaines recharges et les statistiques", () => {
    const state = makeState({
      packs: 1,
      lastPackRegen: T0 - 10 * 60 * 1000,
    });
    const view = getGameView(state, T0);
    expect(view.player.nextPackAt).toBe(T0 - 10 * 60 * 1000 + PACKS.live.regenMs);
    expect(view.player.xpNext).toBe(XP_PER_LEVEL);
    expect(view.stats).toEqual({
      uniqueCreators: 0,
      totalCards: 0,
      openings: 0,
      duplicates: 0,
      recycleValue: 0,
      rareDrops: 0,
    });
    expect(view.seasons).toHaveLength(SEASONS.length);
  });
});

/**
 * Premier créateur du catalogue d'une rareté donnée : les tests restent valides
 * quelle que soit la taille du catalogue (Top 500, 1000, 2000) et donc quelle
 * que soit la rareté attribuée à tel ou tel streameur.
 */
function creatorOfRarity(rarity: Rarity) {
  const creator = CREATORS.find((entry) => entry.rarity === rarity);
  if (!creator) throw new Error(`Aucun créateur de rareté « ${rarity} » dans le catalogue.`);
  return creator;
}

function ownedCard(
  id: string,
  creatorSlug: string,
  rarity: Rarity,
  variant: CardVariant = "standard",
  obtainedAt = T0,
): OwnedCard {
  return { id, creatorSlug, rarity, variant, obtainedAt, rareDrop: false };
}

describe("Perfect (Rare Drop)", () => {
  it("bascule tout le booster en Épique ou mieux", () => {
    for (let i = 0; i < 10; i += 1) {
      const pack = drawPack("live", new Set(), { rareDrop: true, liveLogins: ALL_LIVE });
      expect(pack).toHaveLength(PACKS.live.size);
      expect(pack.every((card) => card.rareDrop)).toBe(true);
      expect(
        pack.every((card) => RARITY_META[card.rarity].order >= RARITY_META.epic.order),
      ).toBe(true);
      // La garantie du booster Live tient même en Perfect : la dernière est Live.
      expect(pack[pack.length - 1].variant).toBe("live");
    }
  });

  it("compare le sort au taux publié, pas à une constante recopiée", () => {
    // Le Perfect est décidé par le premier tirage du booster, comparé à
    // `chancePermille` de `pull-rates.json`. Deux tirages forcés suffisent à
    // verrouiller la règle — et c'est déterministe, contrairement à une
    // fréquence mesurée sur un échantillon (à 1 ‰, « au moins un Perfect sur
    // 3 000 boosters » échouait une fois sur vingt).
    const permille = PULL_RATES.live.rareDrop.chancePermille;

    // Juste en dessous du seuil : Perfect.
    stubRandom([permille - 1]);
    expect(drawPack("live", new Set())[0].rareDrop).toBe(true);

    // Exactement sur le seuil : pas de Perfect (comparaison stricte).
    stubRandom([permille]);
    expect(drawPack("live", new Set())[0].rareDrop).toBe(false);

    // Et l'écran « Taux de drop » publie bien ce même nombre.
    expect(packOdds("live").rareDrop.chance).toBeCloseTo(permille / 1000, 6);
  });

  it("n'altère pas les boosters normaux", () => {
    const pack = drawPack("live", new Set(), { rareDrop: false });
    expect(pack.every((card) => !card.rareDrop)).toBe(true);
    expect(pack.some((card) => RARITY_META[card.rarity].order >= RARITY_META.rare.order)).toBe(
      true,
    );
  });
});

describe("Atelier · recyclage", () => {
  it("ne voit un doublon que dans une même variante", () => {
    const legendary = creatorOfRarity("legendary");
    const state = makeState({
      cards: [
        ownedCard("a", legendary.slug, "legendary"),
        ownedCard("b", legendary.slug, "legendary"),
        ownedCard("c", legendary.slug, "legendary", "holo"),
      ],
    });
    const groups = duplicateGroups(state);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      creatorSlug: legendary.slug,
      variant: "standard",
      count: 2,
      unitValue: RARITY_META.legendary.recycleValue,
    });
    expect(groups[0].recyclableIds).toEqual(["b"]);
    expect(getGameView(state, T0).stats).toMatchObject({
      duplicates: 1,
      recycleValue: RARITY_META.legendary.recycleValue,
    });
  });

  it("crédite la valeur de la rareté et retire la carte", () => {
    const rare = creatorOfRarity("rare");
    const state = makeState({
      points: 0,
      cards: [
        ownedCard("a", rare.slug, "rare"),
        ownedCard("b", rare.slug, "rare"),
      ],
    });
    const next = recycleCard(state, "b", T0);
    expect(next.points).toBe(RARITY_META.rare.recycleValue);
    expect(next.cards.map((card) => card.id)).toEqual(["a"]);
    expect(state.cards).toHaveLength(2); // pureté
  });

  it("recycle en masse les doublons sans toucher à la dernière copie", () => {
    const rare = creatorOfRarity("rare");
    const common = creatorOfRarity("common");
    const state = makeState({
      points: 0,
      cards: [
        ownedCard("a", rare.slug, "rare"),
        ownedCard("b", rare.slug, "rare"),
        ownedCard("c", rare.slug, "rare"),
        ownedCard("d", common.slug, "common"),
        ownedCard("e", common.slug, "common"),
      ],
    });

    const next = bulkRecycleCards(state, T0);

    expect(next.points).toBe(
      RARITY_META.rare.recycleValue * 2 + RARITY_META.common.recycleValue,
    );
    expect(next.cards.map((card) => card.id)).toEqual(["a", "d"]);
    expect(next.missions.recycle).toBe(Math.min(
      1,
      ((state.missionDay === gameDay(T0) ? state.missions.recycle : 0) ?? 0) + 3,
    ));
  });

  it("laisse les doublons Live en place quand on recycle tout", () => {
    // Un doublon Live se recycle **un par un**, jamais dans le clic qui emporte
    // tout : c'est la règle du carnet, et elle est ici pour de vrai.
    const rare = creatorOfRarity("rare");
    const common = creatorOfRarity("common");
    const state = makeState({
      points: 0,
      cards: [
        ownedCard("a", rare.slug, "rare"),
        ownedCard("b", rare.slug, "rare"),
        ownedCard("c", rare.slug, "rare", "live"),
        ownedCard("d", rare.slug, "rare", "live"),
        ownedCard("e", common.slug, "common"),
        ownedCard("f", common.slug, "common"),
      ],
    });

    // La sélection le dit avant le geste : deux cartes seulement (les Standard,
    // et jamais la copie la plus ancienne, qui reste au classeur).
    expect(bulkRecyclableIds(state).sort()).toEqual(["b", "f"]);

    const next = bulkRecycleCards(state, T0);
    // Les deux Live sont toujours là, intactes.
    expect(next.cards.filter((card) => card.variant === "live").map((card) => card.id)).toEqual([
      "c",
      "d",
    ]);
    expect(next.points).toBe(RARITY_META.rare.recycleValue + RARITY_META.common.recycleValue);
  });

  it("ne recycle un doublon Live qu'après avoir demandé", () => {
    // La règle du carnet : un doublon Live se recycle, mais jamais d'un clic
    // perdu — la variante ne se rachète pas, elle tient au direct du moment.
    expect(recycleNeedsConfirm("live")).toBe(true);
    expect(recycleNeedsConfirm("standard")).toBe(false);
    expect(recycleNeedsConfirm("holo")).toBe(false);
    expect(recycleNeedsConfirm("gold")).toBe(false);
  });

  it("refuse une carte absente ou unique", () => {
    const rare = creatorOfRarity("rare");
    const state = makeState({ cards: [ownedCard("a", rare.slug, "rare")] });
    expect(() => recycleCard(state, "zzz", T0)).toThrowError(/collection/i);
    expect(() => recycleCard(state, "a", T0)).toThrowError(/seule copie/i);
  });
});


/**
 * Rejoue une fonction **avec** un Sortant déclaré.
 *
 * Le fichier de données étant vide en livraison, la règle se vérifie en
 * fabriquant le cas : on ajoute une ligne à `RETIRED_CREATORS`, on appelle, on
 * retire. C'est le seul moyen de tester une règle qui ne s'activera qu'à la
 * prochaine rotation du catalogue.
 */
function withRetired<T>(slugs: string[], run: () => T): () => T {
  return () => {
    const store = RETIRED_CREATORS as RetiredCreator[];
    const slugsBefore = RETIRED_BY_SLUG.size;
    for (const slug of slugs) {
      const creator = CREATOR_BY_SLUG.get(slug) as Creator;
      store.push({ ...creator, retiredEdition: CATALOG_EDITION_NUMBER, retiredAt: "2026-10-07T00:00:00Z" });
      RETIRED_BY_SLUG.set(slug, creator as RetiredCreator);
    }
    try {
      return run();
    } finally {
      store.splice(0, store.length);
      for (const slug of slugs) RETIRED_BY_SLUG.delete(slug);
      expect(RETIRED_BY_SLUG.size).toBe(slugsBefore);
    }
  };
}

describe("Atelier · artisanat", () => {
  it("débite les points et ajoute une carte Standard", () => {
    const cost = RARITY_META.uncommon.craftCost as number;
    const target = creatorOfRarity("uncommon");
    const state = makeState({ points: cost + 5 });
    const next = craftCreator(state, target.slug, T0);
    expect(next.points).toBe(5);
    expect(next.cards).toHaveLength(1);
    expect(next.cards[0]).toMatchObject({
      creatorSlug: target.slug,
      rarity: "uncommon",
      variant: "standard",
      obtainedAt: T0,
      rareDrop: false,
    });
    expect(getGameView(next, T0).stats.uniqueCreators).toBe(1);
  });

  it("refuse les créateurs inconnus, déjà possédés, non artisanables ou trop chers", () => {
    const rich = makeState({ points: 10_000 });
    const rare = creatorOfRarity("rare");
    const legendary = creatorOfRarity("legendary");
    expect(() => craftCreator(rich, "inconnu-xyz", T0)).toThrowError(/inconnu/i);
    expect(() =>
      craftCreator(
        makeState({ points: 10_000, cards: [ownedCard("a", rare.slug, rare.rarity)] }),
        rare.slug,
        T0,
      ),
    ).toThrowError(/déjà/i);

    // Les Légendaires ne s'artisanent pas : elles se tirent en booster.
    expect(() => craftCreator(rich, legendary.slug, T0)).toThrowError(/booster/i);
    expect(RARITY_META.legendary.craftable).toBe(false);

    expect(() => craftCreator(makeState({ points: 10 }), rare.slug, T0)).toThrowError(/points/i);
  });

  it("ne compte pas un Sortant dans la complétion, mais garde sa carte", () => {
    // Un créateur qui a quitté le classement : sa carte reste dans le classeur,
    // mais elle ne compte plus dans « X / 1000 » — sinon 100 % deviendrait
    // inatteignable à la première rotation du catalogue.
    const sortant = creatorOfRarity("rare");
    const state = makeState({ cards: [ownedCard("a", sortant.slug, "rare")] });
    const view = withRetired([sortant.slug], () => getGameView(state, T0))();
    expect(view.stats.totalCards).toBe(1);
    // Sans la règle, le compte serait de 1.
    expect(getGameView(state, T0).stats.uniqueCreators).toBe(1);
    expect(view.stats.uniqueCreators).toBe(0);
  });

  it("ne retombe pas dans un booster, même si le catalogue le gardait par erreur", () => {
    // Pire cas d'une rotation ratée : les créateurs sont encore dans
    // `creators.json` alors que `retired.json` les a déjà marqués. Le tirage ne
    // doit pas se rabattre sur eux — ici, plus personne à tirer du tout, donc
    // il refuse au lieu de servir un Sortant.
    const slugs = CREATORS.map((creator) => creator.slug);
    const state = makeState({ packs: PACKS.live.max });
    expect(() => withRetired(slugs, () => openPack(state, T0))()).toThrowError(/vide/i);
  });
});

describe("saisons", () => {
  it("couvre tout le catalogue, sans doublon ni oubli", () => {
    expect(seasonsCoverage()).toBe(CREATORS.length);
    const slugs = SEASONS.flatMap((season) => season.slugs);
    expect(new Set(slugs).size).toBe(CREATORS.length);
    for (const creator of CREATORS) {
      expect(seasonOf(creator.slug)).toBeDefined();
    }
  });

  it("réclame la récompense d'une saison complète, une seule fois", () => {
    const season = [...SEASONS].sort((a, b) => a.slugs.length - b.slugs.length)[0];
    const cards = season.slugs.map((slug) => {
      const creator = CREATORS.find((entry) => entry.slug === slug) as (typeof CREATORS)[number];
      return ownedCard(`card-${slug}`, slug, creator.rarity);
    });
    const state = makeState({ cards, points: 0, hourglasses: 0 });

    expect(seasonViews(state).find((view) => view.id === season.id)?.complete).toBe(true);
    const next = claimSeason(state, season.id, T0);
    // Saison complète : tous les paliers sont soldés d'un coup, donc le total
    // reste celui d'avant l'introduction des paliers.
    const points = season.tiers.reduce((sum, tier) => sum + tier.reward.points, 0);
    const hourglasses = season.tiers.reduce((sum, tier) => sum + tier.reward.hourglasses, 0);
    expect(next.points).toBe(points);
    expect(next.hourglasses).toBe(hourglasses);
    expect(next.claimedTiers[season.id]).toBe(season.tiers.length);
    const view = seasonViews(next).find((entry) => entry.id === season.id);
    expect(view?.claimed).toBe(true);
    expect(view?.claimable).toBe(0);
    // Une famille peut être découpée : elle n'est complète (emblème) que
    // lorsque tous ses morceaux sont refermés. Ici un seul morceau est rempli,
    // donc la famille n'est complète que si elle n'en compte qu'un.
    const piecesInFamily = SEASONS.filter((entry) => entry.familyId === season.familyId).length;
    expect(view?.familyComplete).toBe(piecesInFamily === 1);

    expect(() => claimSeason(next, season.id, T0)).toThrowError(/déjà/i);
    expect(() => claimSeason(makeState(), season.id, T0)).toThrowError(/incomplète/i);
    expect(() => claimSeason(next, "S99", T0)).toThrowError(/inconnue/i);
  });

  it("paie les paliers au fur et à mesure, dans l'ordre", () => {
    const season = [...SEASONS].sort((a, b) => a.slugs.length - b.slugs.length)[0];
    const [first, second] = season.tiers;
    // Un seul palier franchi : la saison n'est pas complète mais paie déjà.
    const partial = makeState({
      cards: season.slugs.slice(0, first.required).map((slug) => {
        const creator = CREATORS.find((entry) => entry.slug === slug) as (typeof CREATORS)[number];
        return ownedCard(`card-${slug}`, slug, creator.rarity);
      }),
      points: 0,
      hourglasses: 0,
    });

    const view = seasonViews(partial).find((entry) => entry.id === season.id);
    expect(view?.complete).toBe(false);
    expect(view?.claimable).toBe(1);
    expect(view?.claimablePoints).toBe(first.reward.points);
    expect(view?.claimableHourglasses).toBe(0);

    const claimedOnce = claimSeason(partial, season.id, T0);
    expect(claimedOnce.points).toBe(first.reward.points);
    expect(claimedOnce.hourglasses).toBe(0);
    expect(claimedOnce.claimedTiers[season.id]).toBe(1);
    expect(seasonViews(claimedOnce).find((entry) => entry.id === season.id)?.claimable).toBe(0);

    // Rien de nouveau à réclamer tant que le palier suivant n'est pas atteint.
    expect(() => claimSeason(claimedOnce, season.id, T0)).toThrowError(/incomplète/i);

    // Un palier intermédiaire de plus : un seul clic solde les deux.
    const further = makeState({ ...claimedOnce, cards: partial.cards.concat(
      season.slugs.slice(first.required, second.required).map((slug) => {
        const creator = CREATORS.find((entry) => entry.slug === slug) as (typeof CREATORS)[number];
        return ownedCard(`card-${slug}`, slug, creator.rarity);
      }),
    ) });
    const claimedTwice = claimSeason(further, season.id, T0);
    expect(claimedTwice.points).toBe(first.reward.points + second.reward.points);
    expect(claimedTwice.claimedTiers[season.id]).toBe(2);
  });
});

describe("échanges", () => {
  const legendary = CREATORS.find((creator) => creator.rarity === "legendary") as (typeof CREATORS)[number];
  const epic = CREATORS.find((creator) => creator.rarity === "epic") as (typeof CREATORS)[number];

  it("retire la copie la plus ancienne et ajoute la carte reçue", () => {
    const state = makeState({
      cards: [
        ownedCard("recent", legendary.slug, "legendary", "holo", T0 + 5_000),
        ownedCard("vieux", legendary.slug, "legendary", "holo", T0),
        ownedCard("autre", epic.slug, "epic", "standard", T0),
      ],
      points: 120,
      xp: 40,
    });

    const moved = applyTradeResult(
      state,
      {
        tradeId: 7,
        given: [{ creatorSlug: legendary.slug, rarity: "legendary", variant: "holo" }],
        received: [{ creatorSlug: epic.slug, rarity: "epic", variant: "gold" }],
      },
      T0 + 60_000,
    );

    expect(moved.cards.map((card) => card.id)).toEqual(["recent", "autre", expect.any(String)]);
    const received = moved.cards.find((card) => card.variant === "gold");
    expect(received?.creatorSlug).toBe(epic.slug);
    expect(received?.obtainedAt).toBe(T0 + 60_000);
    expect(received?.fromTrade).toBe(7);
    // Même `rareDrop` que le serveur : une carte d'échange n'est pas un « Perfect ».
    expect(received?.rareDrop).toBe(false);
    expect(moved.updatedAt).toBe(T0 + 60_000);
    // Un troc ne fait que déplacer des cartes.
    expect(moved.points).toBe(state.points);
    expect(moved.xp).toBe(state.xp);
    expect(moved.level).toBe(state.level);
    expect(moved.packs).toBe(state.packs);
  });

  it("est idempotent : un échange déjà appliqué ne recommence pas", () => {
    const state = makeState({
      cards: [ownedCard("mine", epic.slug, "epic", "standard", T0)],
    });
    const move = {
      tradeId: 11,
      given: [{ creatorSlug: epic.slug, rarity: "epic" as const, variant: "standard" as const }],
      received: [{ creatorSlug: legendary.slug, rarity: "legendary" as const, variant: "live" as const }],
    };

    const once = applyTradeResult(state, move, T0 + 1_000);
    expect(once.cards).toHaveLength(1);
    expect(applyTradeResult(once, move, T0 + 2_000)).toBe(once);

    // La carte reçue est une carte comme une autre : elle peut repartir dans un
    // autre échange (et ce nouvel échange, lui, s'applique bien).
    const again = applyTradeResult(
      once,
      {
        tradeId: 12,
        given: [{ creatorSlug: legendary.slug, rarity: "legendary", variant: "live" }],
        received: [{ creatorSlug: epic.slug, rarity: "epic", variant: "holo" }],
      },
      T0 + 3_000,
    );
    expect(again.cards.map((card) => card.fromTrade)).toEqual([12]);
  });

  it("refuse si la carte donnée n'est plus dans la collection", () => {
    const state = makeState({ cards: [ownedCard("mine", epic.slug, "epic", "standard", T0)] });
    expect(() =>
      applyTradeResult(
        state,
        {
          tradeId: 3,
          given: [{ creatorSlug: legendary.slug, rarity: "legendary", variant: "gold" }],
          received: [],
        },
        T0,
      ),
    ).toThrowError(/n'est plus dans ta collection/);
    // Et une variante différente ne compte pas comme la bonne carte.
    expect(() =>
      applyTradeResult(
        state,
        {
          tradeId: 4,
          given: [{ creatorSlug: epic.slug, rarity: "epic", variant: "holo" }],
          received: [],
        },
        T0,
      ),
    ).toThrowError(GameError);
  });

  it("accepte un échange où l'on donne et reçoit plusieurs cartes", () => {
    const state = makeState({
      cards: [
        ownedCard("a", legendary.slug, "legendary", "standard", T0),
        ownedCard("b", epic.slug, "epic", "holo", T0),
      ],
    });
    const moved = applyTradeResult(
      state,
      {
        tradeId: 21,
        given: [
          { creatorSlug: legendary.slug, rarity: "legendary", variant: "standard" },
          { creatorSlug: epic.slug, rarity: "epic", variant: "holo" },
        ],
        received: [
          { creatorSlug: epic.slug, rarity: "epic", variant: "gold" },
          { creatorSlug: legendary.slug, rarity: "legendary", variant: "holo" },
        ],
      },
      T0 + 5_000,
    );
    expect(moved.cards).toHaveLength(2);
    expect(moved.cards.every((card) => card.fromTrade === 21)).toBe(true);
  });
});

describe("jalons du parcours (écran Objectifs)", () => {
  it("annonce la même cible que celle qui est comptée", () => {
    // Le bug d'origine : le texte affichait 5 % et 20 % du catalogue (50 et
    // 200) alors que les compteurs visaient 25 et 100. Les paliers sont
    // désormais des nombres fixes, et une seule source les porte : le moteur.
    const state = makeState({ cards: [], openings: 0 });
    const milestones = milestoneViews(state);
    const targets = milestones.filter((entry) => entry.metric === "uniqueCreators");

    expect(targets.map((entry) => entry.target)).toEqual([10, 25, 50, 100, CATALOG_SIZE]);
    expect(MILESTONES.every((entry) => entry.target >= 1)).toBe(true);
  });

  it("compte le premier Légendaire sur les créateurs distincts", () => {
    const star = CREATORS.find((creator) => creator.rarity === "legendary")!.slug;
    const state = makeState({
      cards: [
        ownedCard("l1", star, "legendary", "standard", T0),
        ownedCard("l2", star, "legendary", "gold", T0),
      ],
    });
    const legendary = milestoneViews(state).find((entry) => entry.id === "legendary");
    // Deux exemplaires du même Légendaire, c'est **un** Légendaire : le jalon
    // ne se contourne pas en ouvrant des doublons.
    expect(legendary?.progress).toBe(1);
    expect(legendary?.reached).toBe(true);

    const paid = claimMilestone(state, "legendary", T0 + 1_000);
    expect(paid.points).toBe(state.points + 400);
    expect(paid.hourglasses).toBe(state.hourglasses + 2);
  });

  it("paie une seule fois, et seulement quand le seuil est atteint", () => {
    const empty = makeState({ cards: [], openings: 0 });
    expect(() => claimMilestone(empty, "first")).toThrowError(/incompl/i);

    const opened = makeState({ openings: 1 });
    const paid = claimMilestone(opened, "first", T0 + 1_000);
    expect(paid.hourglasses).toBe(opened.hourglasses + 1);
    expect(paid.points).toBe(opened.points + 40);
    expect(paid.claimedMilestones).toEqual(["first"]);

    // Deuxième clic : refusé, aucune récompense en double.
    expect(() => claimMilestone(paid, "first")).toThrowError(/déjà/i);
    expect(paid.hourglasses).toBe(opened.hourglasses + 1);
  });

  it("refuse un jalon inconnu et expose l'avancement réel", () => {
    const state = makeState({ openings: 3 });
    expect(() => claimMilestone(state, "fantome")).toThrowError(GameError);

    const first = milestoneViews(state).find((entry) => entry.id === "first");
    expect(first?.progress).toBe(3);
    expect(first?.reached).toBe(true);
    expect(first?.claimed).toBe(false);
  });

  it("la vue publiée contient les jalons", () => {
    const view = getGameView(makeState({ openings: 2 }));
    expect(view.milestones.map((entry) => entry.id)).toEqual(MILESTONES.map((entry) => entry.id));
  });
});

describe("saison en cours (titre de l'accueil)", () => {
  it("suit la collection, au lieu d'afficher S01 en dur", () => {
    // Une partie sans la moindre carte française ne doit pas annoncer
    // « France & francophonie » : le titre venait d'une constante.
    const overseas = makeState({
      cards: [ownedCard("x", CREATORS.find((c) => c.region !== "S01")!.slug, "common", "standard", T0)],
    });
    const season = currentSeason(overseas);
    expect(season).not.toBeNull();
    expect(season?.familyId).not.toBe("S01");
    expect(season?.name.length).toBeGreaterThan(0);
    // La famille visée n'est jamais terminée : il reste des cartes à trouver.
    expect(season!.owned).toBeLessThan(season!.total);
  });

  it("choisit la famille la plus avancée parmi celles qui restent à finir", () => {
    const season = SEASONS[0];
    // Toute la première vague de la première famille, sauf une carte.
    const cards = season.slugs.slice(0, season.slugs.length - 1).map((slug, index) =>
      ownedCard(`c${index}`, slug, CREATOR_BY_SLUG.get(slug)!.rarity, "standard", T0),
    );
    const view = currentSeason(makeState({ cards }));
    expect(view?.familyId).toBe(season.familyId);
    expect(view?.owned).toBe(season.slugs.length - 1);
    expect(view?.total).toBe(season.slugs.length);

    // La vue publiée la porte aussi.
    expect(getGameView(makeState({ cards })).currentSeason?.familyId).toBe(season.familyId);
  });

  it("retombe sur la dernière famille quand tout est complet", () => {
    const cards = CREATORS.map((creator, index) =>
      ownedCard(`k${index}`, creator.slug, creator.rarity, "standard", T0),
    );
    const view = currentSeason(makeState({ cards }));
    expect(view).not.toBeNull();
    expect(view!.owned).toBe(view!.total);
  });
});

describe("l'hôtel des ventes", () => {
  it("encaisse un dépôt : la carte part, les points arrivent", () => {
    const state = makeState({
      cards: [ownedCard("a1", CREATORS[0].slug, CREATORS[0].rarity, "standard", T0)],
      points: 120,
    });
    const sold = applyMarketSale(state, { cardId: "a1", payout: 400 }, T0 + 1_000);
    expect(sold.cards).toHaveLength(0);
    expect(sold.points).toBe(520);
    expect(sold.updatedAt).toBe(T0 + 1_000);
  });

  it("refuse de vendre une carte absente (sauvegarde en retard)", () => {
    const state = makeState({ cards: [] });
    expect(() => applyMarketSale(state, { cardId: "a1", payout: 400 })).toThrow(GameError);
    try {
      applyMarketSale(state, { cardId: "a1", payout: 400 });
    } catch (error) {
      expect((error as GameError).code).toBe("MARKET_CARD_MISSING");
    }
  });

  it("paie un achat : la carte entre, les points partent", () => {
    const state = makeState({ cards: [], points: 1_000 });
    const bought = ownedCard("neuve", CREATORS[0].slug, CREATORS[0].rarity, "standard", T0 + 5_000);
    const after = applyMarketPurchase(state, { card: { ...bought, fromMarket: 42 }, price: 600 }, T0 + 5_000);
    expect(after.cards.map((card) => card.id)).toEqual(["neuve"]);
    expect(after.cards[0].fromMarket).toBe(42);
    expect(after.points).toBe(400);
    expect(after.updatedAt).toBe(T0 + 5_000);
  });

  it("est idempotent : une réponse rejouée n'ajoute pas la carte deux fois", () => {
    const state = makeState({ cards: [], points: 1_000 });
    const purchase = {
      card: { ...ownedCard("neuve", CREATORS[0].slug, CREATORS[0].rarity, "standard", T0), fromMarket: 42 },
      price: 600,
    };
    const once = applyMarketPurchase(state, purchase, T0 + 1_000);
    expect(applyMarketPurchase(once, purchase, T0 + 2_000)).toBe(once);
  });

  it("refuse l'achat quand les points manquent (sauvegarde en retard)", () => {
    const state = makeState({ cards: [], points: 100 });
    const purchase = {
      card: { ...ownedCard("neuve", CREATORS[0].slug, CREATORS[0].rarity, "standard", T0), fromMarket: 43 },
      price: 600,
    };
    expect(() => applyMarketPurchase(state, purchase)).toThrow(GameError);
    try {
      applyMarketPurchase(state, purchase);
    } catch (error) {
      expect((error as GameError).code).toBe("MARKET_POINTS_MISSING");
    }
  });
});

describe("le Last Pack", () => {
  it("fait entrer la carte volée, marquée de son paquet", () => {
    const state = makeState({ cards: [] });
    const prise = ownedCard("prise", CREATORS[0].slug, CREATORS[0].rarity, "standard", T0 + 3_000);
    const after = applyLastPackSteal(state, { card: { ...prise, fromLastPack: 475 } }, T0 + 3_000);
    expect(after.cards.map((card) => card.id)).toEqual(["prise"]);
    expect(after.cards[0].fromLastPack).toBe(475);
    expect(after.updatedAt).toBe(T0 + 3_000);
    // Rien d'autre ne bouge : un vol ne paie pas de points, ne donne pas d'XP.
    expect(after.points).toBe(state.points);
    expect(after.level).toBe(state.level);
  });

  it("est idempotent : une réponse rejouée n'ajoute pas la carte deux fois", () => {
    const state = makeState({ cards: [] });
    const steal = {
      card: { ...ownedCard("prise", CREATORS[0].slug, CREATORS[0].rarity, "standard", T0), fromLastPack: 475 },
    };
    const once = applyLastPackSteal(state, steal, T0 + 1_000);
    expect(applyLastPackSteal(once, steal, T0 + 2_000)).toBe(once);
  });

  it("distingue deux cartes prises dans le même paquet, deux jours différents", () => {
    // Le piège : `fromLastPack` porte le numéro du paquet, donc deux vols dans
    // le même paquet le partageraient. L'idempotence se fait sur l'identifiant
    // de la carte — sinon le deuxième vol passerait pour un doublon.
    const state = makeState({ cards: [] });
    const premier = ownedCard("un", CREATORS[0].slug, CREATORS[0].rarity, "standard", T0);
    const second = ownedCard("deux", CREATORS[0].slug, CREATORS[0].rarity, "standard", T0 + 1);
    const avec = applyLastPackSteal(state, { card: { ...premier, fromLastPack: 475 } }, T0);
    const apres = applyLastPackSteal(avec, { card: { ...second, fromLastPack: 475 } }, T0 + 1_000);
    expect(apres.cards.map((card) => card.id)).toEqual(["un", "deux"]);
  });
});

describe("Paquet Scène", () => {
  it("tire cinq cartes de la famille visée, jamais de Légendaire", () => {
    stubRandom([0]);
    const state = makeState({ cards: [], packs: 2 });
    const { cards, family } = openScenePack(state, T0);

    expect(cards).toHaveLength(5);
    const slugs = cards.map((card) => card.creatorSlug);
    expect(new Set(slugs).size).toBe(5);
    for (const card of cards) {
      expect(CREATOR_BY_SLUG.get(card.creatorSlug)?.region).toBe(family.familyId);
      // La promesse publique du paquet : aucune Légendaire.
      expect(card.rarity).not.toBe("legendary");
    }
  });

  it("ne consomme pas de booster et ne touche pas au compteur de malchance", () => {
    stubRandom([0]);
    const state = makeState({ cards: [], packs: 2, pityCounter: 37, streak: 3, streakDay: "2025-12-31" });
    const { state: after } = openScenePack(state, T0);
    expect(after.packs).toBe(2);
    expect(after.pityCounter).toBe(37);
    // La série ne bouge pas non plus : elle parle du Live Drop, et c'est lui
    // qui offre le Perfect du 7ᵉ jour. Un paquet de famille ne l'avance donc
    // pas — et ne la casse pas non plus.
    expect(after.streak).toBe(3);
    expect(after.streakDay).toBe(state.streakDay);
    // Le paquet du jour ne consomme pas la récompense de série : elle reste
    // pour le prochain Live Drop.
    expect(after.streakJackpot).toBe(state.streakJackpot);
  });

  it("un seul par jour de jeu, et le lendemain il revient", () => {
    stubRandom([0]);
    const state = makeState({ cards: [] });
    const first = openScenePack(state, T0).state;
    expect(first.sceneDay).toBe(gameDay(T0));
    expect(() => openScenePack(first, T0 + 60_000)).toThrowError(/déjà ouvert/);
    // La journée de jeu change à 6 h UTC : deux heures plus tard, c'est la même.
    expect(() => openScenePack(first, T0 + 2 * HOUR)).toThrowError(/déjà ouvert/);
    const tomorrow = openScenePack(first, T0 + 24 * HOUR).state;
    expect(tomorrow.sceneDay).not.toBe(first.sceneDay);
    expect(tomorrow.cards.length).toBe(first.cards.length + 5);
  });

  it("ne valide pas la mission « ouvre un booster »", () => {
    // Sinon le paquet offert chaque jour deviendrait le moyen le moins cher de
    // valider ses missions — et la mission ne parlerait plus du Live Drop.
    stubRandom([0]);
    const state = makeState({ cards: [], missions: {} });
    const { state: after } = openScenePack(state, T0);
    expect(after.missions.pack).toBeUndefined();
  });

  it("refuse une famille que le joueur ne complète pas", () => {
    stubRandom([0]);
    const state = makeState({ cards: [] });
    const other = sceneFamily(state)?.familyId === "S01" ? "S02" : "S01";
    expect(() => openScenePack(state, T0, { familyId: other })).toThrowError(/famille/);
  });

  it("publie la famille visée et l'état du jour", () => {
    const state = makeState({ cards: [] });
    const view = getGameView(state, T0);
    expect(view.scene.label).toBe(PACKS.scene.label);
    expect(view.scene.opened).toBe(false);
    expect(view.scene.day).toBe(gameDay(T0));
    expect(view.scene.family).not.toBeNull();
  });

  it("écarte les familles trop petites pour remplir un paquet", () => {
    // S09 compte deux créateurs : cinq cartes sans doublon y sont impossibles.
    // Le paquet ne doit donc jamais la viser.
    const state = makeState({ cards: [] });
    const family = sceneFamily(state);
    expect(family).not.toBeNull();
    expect(family!.total).toBeGreaterThanOrEqual(SCENE_MIN_FAMILY);
    expect(family!.familyId).not.toBe("S09");
  });
});

describe("applyWallet : le solde du serveur fait foi", () => {
  it("adopte le solde du serveur, même plus petit que celui de l'appareil", () => {
    // Le cas qui compte : une sauvegarde gonflée à la main. Le serveur dit 45,
    // l'appareil affichera 45 — sinon le joueur croirait à un magot qui
    // n'achète rien.
    const state = { ...createInitialState(T0), points: 999_999 };
    expect(applyWallet(state, 45, T0).points).toBe(45);
  });

  it("ne touche à rien quand le solde est déjà le bon", () => {
    const state = { ...createInitialState(T0), points: 45 };
    // Le même objet : un solde identique ne doit pas provoquer d'écriture.
    expect(applyWallet(state, 45, T0)).toBe(state);
  });

  it("ne descend pas sous zéro et ignore un non-nombre", () => {
    const state = { ...createInitialState(T0), points: 45 };
    expect(applyWallet(state, -10, T0).points).toBe(0);
    expect(applyWallet(state, Number.NaN, T0).points).toBe(45);
  });
});

describe("la chaîne (le simulateur de streameur, 0036)", () => {
  const JOUR = 24 * 3_600_000;

  it("paie le retour du joueur, plafonné à sept journées de jeu", () => {
    // Trente journées d'absence, sept payées : au-delà, une absence paierait
    // mieux que le jeu.
    const state = { ...createInitialState(T0) };
    const visite = visitStreamerLocally(state, T0 + 30 * JOUR);
    expect(visite.summary.days).toBe(30);
    expect(visite.summary.countedDays).toBe(7);
    expect(visite.summary.gained).toBe(7 * growthPerDay(0));
    expect(visite.state.streamer.subscribers).toBe(7 * growthPerDay(0));
    expect(visite.state.streamer.lastSeenAt).toBe(T0 + 30 * JOUR);
  });

  it("ne crédite rien quand l'horloge recule", () => {
    const state = { ...createInitialState(T0) };
    const visite = visitStreamerLocally(state, T0 - 5 * JOUR);
    expect(visite.summary.days).toBe(0);
    expect(visite.summary.gained).toBe(0);
    expect(visite.state.streamer.subscribers).toBe(0);
  });

  it("ne paie l'absence qu'une fois", () => {
    // Deux ouvertures d'affilée : la seconde ne doit rien verser — sinon un
    // joueur pressé toucherait dix fois la même absence.
    const state = { ...createInitialState(T0) };
    const premiere = visitStreamerLocally(state, T0 + 3 * JOUR);
    const seconde = visitStreamerLocally(premiere.state, T0 + 3 * JOUR);
    expect(premiere.summary.gained).toBeGreaterThan(0);
    expect(seconde.summary.gained).toBe(0);
    expect(seconde.state.streamer.subscribers).toBe(premiere.state.streamer.subscribers);
  });

  it("publie une seule vidéo par journée de jeu", () => {
    const state = { ...createInitialState(T0) };
    // Deux jets à zéro : réussite, puis buzz. Let's Play : +240 × 3 = 720.
    const premiere = publishStreamerLocally(state, "letsplay", T0, () => 0);
    expect(premiere?.already).toBe(false);
    expect(premiere?.video.success).toBe(true);
    expect(premiere?.video.buzz).toBe(true);
    expect(premiere?.video.gained).toBe(720);
    expect(premiere?.video.tokens).toBe(16);
    expect(premiere?.state.streamer.subscribers).toBe(720);

    // La seconde publication du même jour relit la première, sans rien verser.
    const seconde = publishStreamerLocally(premiere!.state, "ragebait", T0 + 3_600_000, () => 0);
    expect(seconde?.already).toBe(true);
    expect(seconde?.video.format).toBe("letsplay");
    expect(seconde?.video.tokens).toBe(16);
    expect(seconde?.state.streamer.subscribers).toBe(720);
  });

  it("ne paie rien sur une vidéo ratée, et paie la journée suivante", () => {
    const state = { ...createInitialState(T0) };
    // 999 partout : la vidéo tombe à plat (Let's Play n'a pas de bad buzz).
    const rate = publishStreamerLocally(state, "letsplay", T0, () => 999);
    expect(rate?.video.success).toBe(false);
    expect(rate?.video.gained).toBe(0);
    expect(rate?.video.tokens).toBe(0);
    // Le lendemain, une réussite paie — et le compteur de jetons repart.
    const lendemain = publishStreamerLocally(rate!.state, "letsplay", T0 + JOUR, () => 0);
    expect(lendemain?.already).toBe(false);
    expect(lendemain?.video.tokens).toBe(16);
    expect(lendemain?.state.streamer.tokensToday).toBe(16);
  });

  it("refuse un format qui n'existe pas", () => {
    const state = { ...createInitialState(T0) };
    expect(publishStreamerLocally(state, "format-invente", T0, () => 0)).toBeNull();
  });

  it("adopte le miroir du serveur, et ne descend pas sous zéro", () => {
    const state = { ...createInitialState(T0) };
    const adopté = applyStreamerMirror(
      state,
      { subscribers: 2_640, lastSeenAt: T0 + JOUR, tokensDay: "2026-01-02", tokensToday: 6 },
      T0 + JOUR,
    );
    expect(adopté.streamer).toEqual({
      subscribers: 2_640,
      lastSeenAt: T0 + JOUR,
      tokensDay: "2026-01-02",
      tokensToday: 6,
      video: null,
      // Un miroir qui ne mentionne ni l'imprévu, ni le setup, ni le bureau ne
      // les efface pas : `undefined` veut dire « rien à dire », jamais « mets à
      // zéro ».
      event: null,
      setup: [],
      guests: [],
      raid: null,
    });
    expect(applyStreamerMirror(state, { subscribers: -5 }, T0).streamer.subscribers).toBe(0);
  });

  it("pose un invité qui est à toi, et refuse le reste", () => {
    const carte = ownedCard("c1", "ibai", "uncommon");
    const autre = ownedCard("c2", "ibai", "rare", "holo");
    const state = makeState({ cards: [carte, autre] });

    // Une carte de sa collection, et le créateur vient de la **carte**, pas de
    // l'appelant : l'écran n'a rien à décider.
    const pose = setStreamerGuestLocally(state, 1, "c1", T0);
    expect("error" in pose).toBe(false);
    if ("error" in pose) return;
    expect(pose.guests).toEqual([{ slot: 1, cardId: "c1", slug: "ibai", rarity: "uncommon", variant: "standard" }]);

    // Une carte qu'on ne possède pas : refus, et rien ne bouge.
    const volee = setStreamerGuestLocally(state, 1, "c-inconnue", T0);
    expect("error" in volee).toBe(true);
    // Deux fois le même créateur : refus (c'est la règle du bureau, et le
    // serveur la tient par un index unique).
    const doublon = setStreamerGuestLocally(pose.state, 2, "c2", T0);
    expect("error" in doublon).toBe(true);
    // Une place qui n'existe pas : refus aussi.
    expect("error" in setStreamerGuestLocally(state, 3, "c1", T0)).toBe(true);
    expect("error" in setStreamerGuestLocally(state, 0, "c1", T0)).toBe(true);

    // Retirer libère la place, et changer d'invité ne laisse pas de trace.
    const retire = setStreamerGuestLocally(pose.state, 1, null, T0);
    expect("error" in retire).toBe(false);
    if ("error" in retire) return;
    expect(retire.guests).toEqual([]);
    // Retirer une place déjà libre n'écrit rien du tout (même objet).
    expect(setStreamerGuestLocally(retire.state, 2, null, T0)).toMatchObject({ state: retire.state });
  });

  it("paie le raid une fois par journée, et seulement en direct", () => {
    const une = ownedCard("c1", "ibai", "uncommon"); // 25 pour mille
    const deux = ownedCard("c2", "kamet0", "legendary"); // 90 pour mille
    let state = makeState({ cards: [une, deux] });
    const bouge = (place: number, id: string) => {
      const pose = setStreamerGuestLocally(state, place, id, T0);
      if ("error" in pose) throw new Error(pose.error);
      state = pose.state;
    };
    bouge(1, "c1");
    bouge(2, "c2");

    // Personne en direct : rien, et surtout **aucune** journée consommée.
    const rien = payStreamerRaidLocally(state, T0, []);
    expect(rien.gained).toBe(0);
    expect(rien.state.streamer.raid).toBeNull();
    state = rien.state;

    // Un seul invité en direct : sa part, calculée sur la croissance du jour.
    const partiel = payStreamerRaidLocally(state, T0, ["ibai"]);
    expect(partiel.gained).toBe(Math.floor((240 * 25) / 1000));
    state = partiel.state;

    // Les deux, plus tard dans la même journée : le raid est déjà payé — le
    // journal du moteur, c'est `state.streamer.raid`.
    const encore = payStreamerRaidLocally(state, T0 + HOUR, ["ibai", "kamet0"]);
    expect(encore.gained).toBe(0);
    expect(encore.state).toBe(state);

    // Le lendemain, le raid repart : deux invités, deux parts.
    const demain = payStreamerRaidLocally(state, T0 + JOUR, ["ibai", "kamet0"]);
    expect(demain.gained).toBe(
      Math.floor((240 * 25) / 1000) + Math.floor((240 * 90) / 1000),
    );
    expect(demain.raid?.day).toBe(gameDay(T0 + JOUR));
    expect(demain.raid?.slugs).toEqual(["ibai", "kamet0"]);
    expect(demain.state.streamer.subscribers).toBe(state.streamer.subscribers + demain.gained);
  });

  it("paie le raid sur la croissance d'avant le relevé, comme le serveur", () => {
    // Juste sous le palier « Chaîne qui monte » (2 500) : une absence d'un jour
    // le franchit. Le serveur calcule `v_per_day` sur la ligne de la chaîne
    // **avant** de compter l'absence, et c'est ce même chiffre qui paie le raid.
    const carte = ownedCard("c1", "ibai", "legendary"); // 90 pour mille
    let state = makeState({ cards: [carte] });
    const pose = setStreamerGuestLocally(state, 1, "c1", T0);
    if ("error" in pose) throw new Error(pose.error);
    state = { ...pose.state, streamer: { ...pose.state.streamer, subscribers: 2_400, lastSeenAt: T0 } };

    const visite = visitStreamerLocally(state, T0 + JOUR);
    const raid = payStreamerRaidLocally(visite.state, T0 + JOUR, ["ibai"], state.streamer.subscribers);
    // Un jour d'absence : 240 (le palier du moment), puis le raid : 90 pour
    // mille de **240**, pas de 900 (le palier d'après, franchi entre-temps).
    expect(visite.summary.gained).toBe(240);
    expect(raid.gained).toBe(Math.floor((240 * 90) / 1000));
    expect(raid.state.streamer.subscribers).toBe(2_400 + 240 + 21);
  });

  it("joue l'imprévu du jour, une seule fois, et sans jeton", () => {
    const state = { ...createInitialState(T0) };
    const carte = eventForDay(gameDay(T0));
    const cote = carte.choices[0];
    // Deux jets à zéro : réussite, puis buzz. Le gain part de la croissance du
    // moment, pas de la carte : c'est `resolveEventChoice` qui la lit.
    const joue = chooseStreamerEventLocally(state, carte.id, cote.id, T0, () => 0);
    expect("error" in joue).toBe(false);
    if ("error" in joue) return;
    expect(joue.event).toMatchObject({ event: carte.id, choice: cote.id, success: true, buzz: true });
    expect(joue.event.gained).toBeGreaterThan(0);
    expect(joue.state.streamer.subscribers).toBe(joue.event.gained);
    expect(joue.state.streamer.tokensToday).toBe(0);

    // La seconde réponse relit la première : rien n'est rejoué, rien n'est payé.
    const seconde = chooseStreamerEventLocally(joue.state, carte.id, carte.choices[1].id, T0, () => 0);
    expect("error" in seconde).toBe(false);
    if ("error" in seconde) return;
    expect(seconde.already).toBe(true);
    expect(seconde.state.streamer.subscribers).toBe(joue.state.streamer.subscribers);
    expect(seconde.event.choice).toBe(cote.id);
  });

  it("refuse une carte qui n'est pas celle du jour, et un côté inconnu", () => {
    const state = { ...createInitialState(T0) };
    const jour = eventForDay(gameDay(T0));
    const autre = EVENTS.find((carte) => carte.id !== jour.id)!;
    // En mode local aussi, la carte doit être celle du jour : sinon l'écran et
    // le tirage pourraient diverger sans que personne ne le voie.
    const mauvaise = chooseStreamerEventLocally(state, autre.id, "gauche", T0);
    expect("error" in mauvaise && mauvaise.error).toMatch(/imprévu du jour/);
    const coteFaux = chooseStreamerEventLocally(state, jour.id, "milieu", T0);
    expect("error" in coteFaux && coteFaux.error).toMatch(/choix/);
  });

  it("achète le setup local dans l'ordre, et pas deux fois", () => {
    const riche = { ...createInitialState(T0), points: 10_000 };
    const premier = buyStreamerSetupLocally(riche, "webcam", T0);
    expect("error" in premier).toBe(false);
    if ("error" in premier) return;
    expect(premier.state.points).toBe(10_000 - setupLevelById("webcam")!.price);
    expect(premier.state.streamer.setup).toEqual(["webcam"]);

    // Le même palier ne se repaie pas, et le suivant ne se saute pas.
    expect(buyStreamerSetupLocally(premier.state, "webcam", T0)).toEqual({
      error: `« ${setupLevelById("webcam")!.label} » est déjà installé.`,
    });
    const saute = buyStreamerSetupLocally(premier.state, "studio", T0);
    expect("error" in saute && saute.error).toMatch(/d'abord/);

    // Un palier inaccessible en prix reste hors de portée, sans dette.
    const pauvre = { ...createInitialState(T0), points: 10 };
    const refus = buyStreamerSetupLocally(pauvre, "webcam", T0);
    expect("error" in refus && refus.error).toMatch(/manque/);
    expect(SETUP_LEVELS.map((niveau) => niveau.id)).toContain("webcam");
  });
});

describe("le studio : les paliers payés en doublons (0040)", () => {
  const POINTS = SETUP_LEVELS.filter((niveau) => niveau.currency === "points").map((niveau) => niveau.id);
  const LABEL6 = setupLevelById("webcam2")!.label;

  /** Un état avec les cinq paliers en points, et les cartes qu'on lui donne. */
  function studio(cards: OwnedCard[], setup: string[] = POINTS): PlayerState {
    const base = createInitialState(T0);
    return { ...base, cards, streamer: { ...base.streamer, setup } };
  }

  it("liste les doublons qui peuvent partir — et seulement ceux-là", () => {
    // Rares et Épiques, en double au moins : une Commune ne vaut rien, une
    // Légendaire ne part jamais, et une carte seule n'est pas un doublon.
    const state = studio([
      ownedCard("ra-1", "ibai", "rare"),
      ownedCard("ra-2", "ibai", "rare"),
      ownedCard("ep-1", "kamet0", "epic"),
      ownedCard("lg-1", "ibai", "legendary"),
      ownedCard("lg-2", "ibai", "legendary"),
      // Un Épique seul, et des Communes en double chez un autre créateur : ni
      // l'un ni les autres ne partent — la rareté d'abord.
      ownedCard("co-1", "zacknani", "common"),
      ownedCard("co-2", "zacknani", "common"),
    ]);
    const candidats = setupSacrificeCandidates(state);
    expect(candidats.map((entree) => entree.card.id).sort()).toEqual(["ra-1", "ra-2"]);
    expect(candidats[0].value).toBe(1);
    // Le doublon se compte par **créateur + variante** (la règle du recyclage) :
    // les deux Légendaires d'ibai comptent donc dans ses copies — elles ne
    // partent pas, mais elles restent au classeur, et c'est ce qui compte.
    expect(candidats[0].copies).toBe(4);
    expect(sacrificeTally([ownedCard("x", "ibai", "rare"), ownedCard("y", "kamet0", "epic")])).toBe(3);
  });

  it("paie le palier en doublons et retire les cartes du classeur", () => {
    const state = studio([
      ownedCard("ra-1", "ibai", "rare"),
      ownedCard("ra-2", "ibai", "rare"),
      ownedCard("rb-1", "kamet0", "rare"),
      ownedCard("rb-2", "kamet0", "rare"),
    ]);
    const sacrifice = sacrificeSetupLocally(state, ["ra-1", "rb-1"], T0 + 1000);
    expect("error" in sacrifice).toBe(false);
    if ("error" in sacrifice) return;
    expect(sacrifice.level).toEqual({ id: "webcam2", label: LABEL6 });
    expect(sacrifice.value).toBe(2);
    expect(sacrifice.state.streamer.setup).toEqual([...POINTS, "webcam2"]);
    // La dernière copie de chaque couple reste : il en reste une de chaque.
    expect(sacrifice.state.cards.map((card) => card.id).sort()).toEqual(["ra-2", "rb-2"]);
    // Et le bonus suit, tout de suite : 500 pour mille (les points) plus 100
    // (le palier), donc 240 × 1,6 = 384 par jour — contre 360 avant lui.
    expect(growthWithSetup(0, sacrifice.state.streamer.setup)).toBe(384);
    expect(growthWithSetup(0, POINTS)).toBe(360);
  });

  it("refuse une Légendaire, la dernière copie, et un compte qui ne tombe pas juste", () => {
    const state = studio([
      ownedCard("lg-1", "ibai", "legendary"),
      ownedCard("lg-2", "ibai", "legendary"),
      // Un Rare dont c'est la **seule** copie : il ne part jamais.
      ownedCard("seule", "kamet0", "rare"),
      ownedCard("autre", "zacknani", "rare"),
    ]);
    const legendaire = sacrificeSetupLocally(state, ["lg-1"], T0);
    expect("error" in legendaire && legendaire.error).toMatch(/jamais une Légendaire/);
    const derniere = sacrificeSetupLocally(state, ["seule"], T0);
    expect("error" in derniere && derniere.error).toMatch(/seule copie/);
    // Deux copies du même couple dans le même panier : la seconde serait la
    // dernière, donc le panier entier est refusé (rien ne part à moitié).
    const paire = studio([ownedCard("m-1", "ibai", "rare"), ownedCard("m-2", "ibai", "rare")]);
    const tout = sacrificeSetupLocally(paire, ["m-1", "m-2"], T0);
    expect("error" in tout && tout.error).toMatch(/seule copie/);
    // Un doublon qui ne suffit pas au prix : le compte doit tomber juste.
    const incomplet = sacrificeSetupLocally(paire, ["m-1"], T0);
    expect("error" in incomplet && incomplet.error).toMatch(/2 points de sacrifice/);
    const inconnue = sacrificeSetupLocally(state, ["fantome"], T0);
    expect("error" in inconnue && inconnue.error).toMatch(/collection/);
  });

  it("attend la fin des paliers en points, et l'achat en points refuse les doublons", () => {
    const debut = studio([ownedCard("ra-1", "ibai", "rare"), ownedCard("ra-2", "ibai", "rare")], []);
    const tropTot = sacrificeSetupLocally(debut, ["ra-1"], T0);
    expect("error" in tropTot && tropTot.error).toMatch(/paliers en points/);
    // La porte des points ne vend pas un palier en doublons (sinon « webcam2 »
    // coûterait deux points, le prix lu dans la même table).
    const riche = { ...createInitialState(T0), points: 10_000 };
    const mauvaisePorte = buyStreamerSetupLocally(riche, "webcam2", T0);
    expect("error" in mauvaisePorte && mauvaisePorte.error).toMatch(/se paie en doublons/);
  });

  it("applique le verdict du serveur, pas la sélection du joueur", () => {
    // En ligne, le serveur relit la collection et renvoie les cartes qu'il a
    // prises : c'est **cette liste** qui quitte le classeur.
    const state = studio([ownedCard("ra-1", "ibai", "rare"), ownedCard("ra-2", "ibai", "rare")]);
    const apres = applySetupSacrifice(state, ["ra-1"], "webcam2", T0 + 500);
    expect(apres.cards.map((card) => card.id)).toEqual(["ra-2"]);
    expect(apres.streamer.setup).toEqual([...POINTS, "webcam2"]);
  });
});

// ---------------------------------------------------------------------------
// Le Tribunal des Bannis : ce que le moteur **garde** d'une séance.
//
// Le tirage, lui, est vérifié dans `src/lib/tribunal.test.ts`. Ici, on vérifie
// ce qui touche à la sauvegarde : un verdict reste attaché à sa journée, un
// dossier hors tirage est refusé, et la récompense ne se verse qu'une fois.
// ---------------------------------------------------------------------------
describe("le Tribunal dans la sauvegarde", () => {
  const JOUR = Date.parse("2026-10-08T12:00:00.000Z");
  const LENDEMAIN = Date.parse("2026-10-09T12:00:00.000Z");
  const APRES_6H = Date.parse("2026-10-09T07:00:00.000Z");

  it("démarre une séance vide", () => {
    const state = createInitialState(JOUR);
    expect(state.tribunal).toEqual({ day: "", verdicts: {}, claimed: false });
  });

  it("garde un verdict rendu sur un dossier du jour", () => {
    const state = createInitialState(JOUR);
    const [premier] = dossiersDuJour(gameDay(JOUR), state.playerId);
    const apres = recordVerdict(state, premier.id, "deban", JOUR);
    expect(apres.tribunal.verdicts[premier.id]).toBe("deban");
    expect(apres.tribunal.day).toBe(gameDay(JOUR));
  });

  it("refuse un dossier qui n'est pas à l'ordre du jour", () => {
    const state = createInitialState(JOUR);
    expect(() => recordVerdict(state, "dossier-invente", "ban", JOUR)).toThrow(/ordre du jour/);
  });

  it("oublie la séance d'hier sans rien effacer d'autre", () => {
    const state = createInitialState(JOUR);
    const [premier] = dossiersDuJour(gameDay(JOUR), state.playerId);
    const hier = recordVerdict(state, premier.id, "ban", JOUR);
    const aujourdhui = recordVerdict(hier, dossiersDuJour(gameDay(LENDEMAIN), state.playerId)[0].id, "deban", LENDEMAIN);
    // La séance est repartie : le verdict de la veille n'est plus dedans.
    expect(Object.keys(aujourdhui.tribunal.verdicts)).toHaveLength(1);
    expect(aujourdhui.tribunal.day).toBe(gameDay(LENDEMAIN));
    expect(aujourdhui.cards).toEqual(hier.cards);
  });

  it("bascule à 6 h UTC : la séance du soir appartient au jour suivant", () => {
    // 23 h UTC le 8, puis 7 h UTC le 9 : deux journées de jeu distinctes.
    const soir = Date.parse("2026-10-08T23:00:00.000Z");
    const matin = Date.parse("2026-10-09T07:00:00.000Z");
    expect(gameDay(soir)).toBe(gameDay(JOUR));
    expect(gameDay(matin)).not.toBe(gameDay(soir));
    expect(tribunalSeance(createInitialState(soir), APRES_6H).verdicts).toEqual({});
  });

  it("paie la séance une seule fois", () => {
    const state = createInitialState(JOUR);
    const paye = claimTribunal(state, 40, JOUR);
    expect(paye.points).toBe(state.points + 40);
    expect(paye.tribunal.claimed).toBe(true);
    // Un second appel ne repaie pas — même geste, même journée.
    expect(claimTribunal(paye, 40, JOUR)).toBe(paye);
    // Et une séance qui ne paie pas (0 point) ne marque rien.
    expect(claimTribunal(state, 0, JOUR)).toBe(state);
  });
});
