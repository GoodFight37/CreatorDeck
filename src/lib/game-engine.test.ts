import { describe, expect, it } from "vitest";
import { CREATORS, PACKS, RARITY_META, type CardVariant, type Rarity } from "@/lib/catalog";
import { PULL_RATES, packOdds } from "@/lib/pull-rates";
import { SEASONS, seasonOf, seasonsCoverage } from "@/lib/seasons";
import {
  GameError,
  HOURGLASSES_PER_LEVEL,
  HOURGLASS_REDUCTION_MS,
  SAVE_VERSION,
  XP_PER_LEVEL,
  applyPackResult,
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
const HALF_HOUR = 30 * 60 * 1000;
const T0 = Date.parse("2026-01-01T12:00:00Z");

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
    const state = createInitialState(T0);
    expect(state).toMatchObject({
      version: SAVE_VERSION,
      level: 1,
      xp: 0,
      points: 120,
      hourglasses: 12,
      packs: 3,
      openings: 0,
      cards: [],
      claimedTiers: {},
      createdAt: T0,
    });
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
      const pack = drawPack("live", new Set());
      expectValidPack(pack, PACKS.live.size);
      expect(pack.filter((card) => card.variant === "live")).toHaveLength(1);
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
    const { state: next, cards } = openPack(state, T0);
    expect(cards).toHaveLength(PACKS.live.size);
    expect(next.packs).toBe(1);
    expect(next.points).toBe(state.points + PACKS.live.points);
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
    const { state: next, cards } = applyPackResult(state, SERVER_CARDS, 1, lastRegen, 6, T0);

    expect(cards).toHaveLength(5);
    expect(next.packs).toBe(1);
    expect(next.openings).toBe(6);
    expect(next.points).toBe(state.points + PACKS.live.points);
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
});

describe("spendHourglass", () => {
  it("avance la recharge de 15 min", () => {
    const state = makeState({ hourglasses: 3, lastPackRegen: T0 });
    const next = spendHourglass(state, T0);
    expect(next.hourglasses).toBe(2);
    expect(next.lastPackRegen).toBe(T0 - HOURGLASS_REDUCTION_MS.live);
    expect(getGameView(next, T0).player.nextPackAt).toBe(
      T0 + PACKS.live.regenMs - HOURGLASS_REDUCTION_MS.live,
    );
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
