import { describe, expect, it } from "vitest";
import { CREATORS, PACKS, RARITY_META, type CardVariant, type Rarity } from "@/lib/catalog";
import { PULL_RATES, packOdds } from "@/lib/pull-rates";
import { SEASONS, seasonOf, seasonsCoverage } from "@/lib/seasons";
import {
  GameError,
  HOURGLASSES_PER_LEVEL,
  HOURGLASS_REDUCTION_MS,
  XP_PER_LEVEL,
  claimSeason,
  craftCreator,
  createInitialState,
  drawPack,
  duplicateGroups,
  getGameView,
  openPack,
  recycleCard,
  refreshBalances,
  seasonViews,
  spendHourglass,
  type DrawnCard,
  type OwnedCard,
  type PlayerState,
} from "@/lib/game-engine";

const HOUR = 60 * 60 * 1000;
const T0 = Date.parse("2026-01-01T12:00:00Z");

function makeState(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    ...createInitialState(T0),
    playerId: "00000000-0000-4000-8000-000000000000",
    livePacks: 0,
    archivePacks: 0,
    ...overrides,
  };
}

describe("createInitialState", () => {
  it("donne les ressources de départ", () => {
    const state = createInitialState(T0);
    expect(state).toMatchObject({
      version: 2,
      level: 1,
      xp: 0,
      points: 120,
      hourglasses: 12,
      livePacks: 2,
      archivePacks: 1,
      openings: 0,
      cards: [],
      claimedSeasons: [],
      createdAt: T0,
    });
    expect(state.playerId).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe("refreshBalances", () => {
  it("régénère les boosters Live avec le temps", () => {
    // 2 h 30 avant `now` -> 2 packs Live regagnés (1/h), ancre avancée de 2 h.
    const state = makeState({ lastLiveRegen: T0 - 2.5 * HOUR });
    const refreshed = refreshBalances(state, T0);
    expect(refreshed.livePacks).toBe(2);
    expect(refreshed.lastLiveRegen).toBe(T0 - 0.5 * HOUR);
  });

  it("plafonne au maximum du pack et ré-ancre sur now", () => {
    const state = makeState({ lastLiveRegen: T0 - 100 * HOUR });
    const refreshed = refreshBalances(state, T0);
    expect(refreshed.livePacks).toBe(PACKS.live.max);
    expect(refreshed.lastLiveRegen).toBe(T0);
  });

  it("ne régénère rien si le stock est déjà plein", () => {
    const state = makeState({ livePacks: PACKS.live.max });
    expect(refreshBalances(state, T0).livePacks).toBe(PACKS.live.max);
  });

  it("retourne la même référence quand rien ne change", () => {
    const state = makeState({ lastLiveRegen: T0 - 1000, lastArchiveRegen: T0 - 1000 });
    expect(refreshBalances(state, T0)).toBe(state);
  });

  it("n'offre rien si l'horloge de l'appareil recule", () => {
    const state = makeState({ lastLiveRegen: T0 + 5 * HOUR });
    const refreshed = refreshBalances(state, T0);
    expect(refreshed.livePacks).toBe(0);
    expect(refreshed.lastLiveRegen).toBe(T0);
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
      const pack = drawPack("live", new Set());
      expectValidPack(pack, PACKS.live.size);
      expect(pack.filter((card) => card.variant === "live")).toHaveLength(1);
    }
  });

  it("un booster Archives contient 3 cartes dont une rare ou mieux", () => {
    for (let i = 0; i < 25; i += 1) {
      const pack = drawPack("archive", new Set());
      expectValidPack(pack, PACKS.archive.size);
      expect(pack.every((card) => card.variant !== "live")).toBe(true);
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
    const state = makeState({ livePacks: 2 });
    const { state: next, cards } = openPack(state, "live", T0);
    expect(cards).toHaveLength(PACKS.live.size);
    expect(next.livePacks).toBe(1);
    expect(next.archivePacks).toBe(0);
    expect(next.points).toBe(state.points + PACKS.live.points);
    expect(next.xp).toBe(PACKS.live.xp);
    expect(next.openings).toBe(1);
    expect(next.cards.map((card) => card.id)).toEqual(cards.map((card) => card.id));
    expect(next.cards.every((card) => card.obtainedAt === T0)).toBe(true);
    expect(next.updatedAt).toBe(T0);
    // Pureté : l'état d'origine n'est pas modifié.
    expect(state.livePacks).toBe(2);
    expect(state.cards).toHaveLength(0);
  });

  it("refuse d'ouvrir sans booster disponible", () => {
    expect(() => openPack(makeState(), "archive", T0)).toThrowError(GameError);
    try {
      openPack(makeState(), "archive", T0);
    } catch (error) {
      expect((error as GameError).code).toBe("PACK_NOT_READY");
    }
  });

  it("utilise un booster régénéré par le temps", () => {
    const state = makeState({ lastArchiveRegen: T0 - PACKS.archive.regenMs });
    const { state: next } = openPack(state, "archive", T0);
    expect(next.archivePacks).toBe(0);
    expect(next.openings).toBe(1);
  });

  it("monte de niveau et offre des sabliers", () => {
    const state = makeState({ livePacks: 1, xp: XP_PER_LEVEL - 1, level: 1 });
    const { state: next } = openPack(state, "live", T0);
    expect(next.level).toBe(2);
    expect(next.hourglasses).toBe(state.hourglasses + HOURGLASSES_PER_LEVEL);
  });

  it("marque isNew=false pour un créateur déjà possédé", () => {
    let state = makeState({ livePacks: PACKS.live.max, archivePacks: PACKS.archive.max });
    const owned = new Set<string>();
    for (let i = 0; i < PACKS.live.max; i += 1) {
      const result = openPack(state, "live", T0 + i);
      for (const card of result.cards) {
        expect(card.isNew).toBe(!owned.has(card.creatorSlug));
        owned.add(card.creatorSlug);
      }
      state = result.state;
    }
    expect(getGameView(state, T0 + 10).stats.uniqueCreators).toBe(owned.size);
  });
});

describe("spendHourglass", () => {
  it("avance la recharge de 15 min pour le Live", () => {
    const state = makeState({ hourglasses: 3, lastLiveRegen: T0 });
    const next = spendHourglass(state, "live", T0);
    expect(next.hourglasses).toBe(2);
    expect(next.lastLiveRegen).toBe(T0 - HOURGLASS_REDUCTION_MS.live);
    expect(getGameView(next, T0).player.nextLiveAt).toBe(
      T0 + PACKS.live.regenMs - HOURGLASS_REDUCTION_MS.live,
    );
  });

  it("peut débloquer un booster immédiatement", () => {
    // Il reste 10 min de recharge Archives : un sablier (-1 h) suffit.
    const state = makeState({
      hourglasses: 1,
      lastArchiveRegen: T0 - (PACKS.archive.regenMs - 10 * 60 * 1000),
    });
    const next = spendHourglass(state, "archive", T0);
    expect(next.archivePacks).toBe(1);
    expect(next.hourglasses).toBe(0);
  });

  it("refuse sans sablier ou si la réserve est pleine", () => {
    expect(() => spendHourglass(makeState({ hourglasses: 0 }), "live", T0)).toThrowError(
      /sablier/i,
    );
    expect(() =>
      spendHourglass(makeState({ hourglasses: 5, livePacks: PACKS.live.max }), "live", T0),
    ).toThrowError(/pleine/i);
  });
});

describe("getGameView", () => {
  it("calcule les prochaines recharges et les statistiques", () => {
    const state = makeState({
      livePacks: 1,
      archivePacks: PACKS.archive.max,
      lastLiveRegen: T0 - 10 * 60 * 1000,
    });
    const view = getGameView(state, T0);
    expect(view.player.nextLiveAt).toBe(T0 - 10 * 60 * 1000 + PACKS.live.regenMs);
    expect(view.player.nextArchiveAt).toBeNull();
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
      const pack = drawPack("live", new Set(), { rareDrop: true });
      expect(pack).toHaveLength(PACKS.live.size);
      expect(pack.every((card) => card.rareDrop)).toBe(true);
      expect(
        pack.every((card) => RARITY_META[card.rarity].order >= RARITY_META.epic.order),
      ).toBe(true);
      // La garantie du booster Live tient même en Perfect : une seule Live.
      expect(pack.filter((card) => card.variant === "live")).toHaveLength(1);
    }
  });

  it("reste fidèle aux taux annoncés dans pull-rates.json", () => {
    const expected = PULL_RATES.live.rareDrop.chancePermille / 1000;
    let perfects = 0;
    const runs = 3_000;
    for (let i = 0; i < runs; i += 1) {
      if (drawPack("live", new Set())[0].rareDrop) perfects += 1;
    }
    expect(perfects).toBeGreaterThan(0);
    // Marge généreuse (×3) : on teste un ordre de grandeur, pas un RNG exact.
    expect(perfects / runs).toBeLessThan(expected * 3);
  });

  it("n'altère pas les boosters normaux", () => {
    const pack = drawPack("archive", new Set(), { rareDrop: false });
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

  it("refuse une carte absente ou unique", () => {
    const rare = creatorOfRarity("rare");
    const state = makeState({ cards: [ownedCard("a", rare.slug, "rare")] });
    expect(() => recycleCard(state, "zzz", T0)).toThrowError(/collection/i);
    expect(() => recycleCard(state, "a", T0)).toThrowError(/seule copie/i);
  });
});

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
    expect(next.points).toBe(season.reward.points);
    expect(next.hourglasses).toBe(season.reward.hourglasses);
    expect(next.claimedSeasons).toEqual([season.id]);
    expect(seasonViews(next).find((view) => view.id === season.id)?.claimed).toBe(true);

    expect(() => claimSeason(next, season.id, T0)).toThrowError(/déjà/i);
    expect(() => claimSeason(makeState(), season.id, T0)).toThrowError(/incomplète/i);
    expect(() => claimSeason(next, "S99", T0)).toThrowError(/inconnue/i);
  });
});
