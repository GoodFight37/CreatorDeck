/**
 * Tests des mécaniques de progression ajoutées par l'étape 3 : jetons,
 * missions du jour, série de jours et plancher de malchance.
 *
 * Ces règles ont un point commun : elles décident de ce que le joueur gagne
 * **dans le temps**. Une journée qui bascule au mauvais moment, une série
 * comptée deux fois, un compteur qui ne repart pas : ce sont des bugs qu'on ne
 * voit pas à l'œil, et qui se paient en confiance. Ils sont donc testés ici,
 * chiffre par chiffre, sur des instants choisis.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { CREATORS, CREATOR_BY_SLUG, type Rarity } from "@/lib/catalog";
import { PITY } from "@/lib/pull-rates";
import { PROGRESSION, TOKEN_TARGET_COST, gameDay } from "@/lib/progression";
import {
  GameError,
  applyPackResult,
  applyServerProgression,
  buyWithTokens,
  cardTouchesFamily,
  claimMissions,
  claimStreakJackpot,
  createInitialState,
  getGameView,
  missionsAfterPack,
  openPack,
  ownedSlugs,
  pityAfter,
  recycleCard,
  type PlayerState,
} from "@/lib/game-engine";

/**
 * Gèle l'aléa sur une suite de valeurs : `randomInt(n)` échantillonne par rejet
 * sur 32 bits, donc une petite valeur passe toujours et arrive telle quelle.
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

const DAY = 86_400_000;
/** Un midi UTC : ni une journée de jeu qui vient de basculer, ni Prime Time. */
const MIDI = Date.parse("2026-03-10T12:00:00Z");
/** 21 h **locales** — la fenêtre Prime Time, quelle que soit la machine. */
const PRIME = new Date(2026, 2, 10, 21, 0, 0, 0).getTime();

afterEach(() => {
  vi.unstubAllGlobals();
});

function makeState(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    ...createInitialState(MIDI),
    playerId: "00000000-0000-4000-8000-000000000000",
    packs: 3,
    ...overrides,
  };
}

function legendarySlug(): string {
  return CREATORS.find((creator) => creator.rarity === "legendary")!.slug;
}

function commonSlug(): string {
  return CREATORS.find((creator) => creator.rarity === "common")!.slug;
}

describe("jetons", () => {
  it("paie 5 jetons par booster ouvert", () => {
    stubRandom([0]);
    const state = makeState({ tokens: 30 });
    const after = openPack(state, MIDI).state;
    expect(after.tokens).toBe(35);
  });

  it("paie 7 jetons pendant le Prime Time (heure locale)", () => {
    stubRandom([0]);
    const state = makeState();
    const after = openPack(state, PRIME).state;
    expect(after.tokens).toBe(PROGRESSION.tokens.perPack + PROGRESSION.tokens.primeTimeBonus);
  });

  it("paie aussi les tirages décidés par le serveur", () => {
    // Un joueur avec un compte ouvre ses boosters côté serveur : c'est
    // `applyPackResult` qui range les cartes reçues, et les jetons sont
    // crédités là aussi — sinon un joueur connecté n'en gagnerait jamais.
    const state = makeState();
    const applied = applyPackResult(
      state,
      [{ creatorSlug: commonSlug(), rarity: "common", variant: "standard", rareDrop: false }],
      0,
      MIDI,
      1,
      MIDI,
    );
    expect(applied.state.tokens).toBe(state.tokens + PROGRESSION.tokens.perPack);
  });
});

describe("plancher de malchance", () => {
  it("ne garantit rien avant le seuil, et avance d'un booster", () => {
    stubRandom([0]);
    const state = makeState({ pityCounter: 5 });
    const after = openPack(state, MIDI).state;
    expect(after.pityCounter).toBe(6);
  });

  it(`garantit une Légendaire au ${PITY.threshold}ᵉ booster, puis remet le compteur à zéro`, () => {
    // Le compteur est à « seuil - 1 » tirages déjà sortis sans Légendaire : le
    // tirage qu'on déclenche est celui du seuil, donc c'est lui qui paie.
    stubRandom([0]);
    const state = makeState({ pityCounter: PITY.threshold - 1 });
    const { state: after, cards } = openPack(state, MIDI);
    expect(cards.some((card) => card.rarity === "legendary")).toBe(true);
    expect(cards.filter((card) => card.rarity === "legendary")).toHaveLength(1);
    expect(after.pityCounter).toBe(0);
  });

  it("garde le dernier slot garanti même quand le Perfect tombe (tirage rare)", () => {
    stubRandom([999, 0]);
    const state = makeState({ pityCounter: PITY.threshold - 1 });
    const { cards } = openPack(state, MIDI, { rareDrop: true });
    // Le slot garanti est Légendaire par le plancher : le tirage rare ne fait
    // que relever les quatre autres cartes.
    expect(cards).toHaveLength(5);
    expect(cards[4].rarity).toBe("legendary");
  });

  it("pityAfter : un Légendaire n'importe où remet à zéro, sinon +1", () => {
    expect(pityAfter(12, [{ rarity: "legendary" }])).toBe(0);
    expect(pityAfter(12, [{ rarity: "epic" }, { rarity: "legendary" }])).toBe(0);
    expect(pityAfter(12, [{ rarity: "epic" }, { rarity: "rare" }])).toBe(13);
  });

  it("publie le compteur qui reste à courir, et le seuil", () => {
    const view = getGameView(makeState({ pityCounter: 5 }), MIDI);
    expect(view.pity.threshold).toBe(PITY.threshold);
    expect(view.pity.counter).toBe(5);
    expect(view.pity.remaining).toBe(PITY.threshold - 5);
  });

  it("un compteur déjà au-delà du seuil ne passe pas sous zéro", () => {
    // Les joueurs d'avant le 7 octobre ont pu enchaîner bien plus que 12
    // boosters sans Légendaire : leur compteur dépasse le nouveau seuil. Le
    // prochain booster paie, et l'écran ne doit pas annoncer « dans -56 ».
    const view = getGameView(makeState({ pityCounter: PITY.threshold + 56 }), MIDI);
    expect(view.pity.remaining).toBe(0);
  });
});

describe("missions du jour", () => {
  it("compte le booster ouvert sur la journée de jeu en cours", () => {
    stubRandom([0]);
    const state = makeState();
    const after = openPack(state, MIDI).state;
    expect(after.missionDay).toBe(gameDay(MIDI));
    expect(after.missions.pack).toBe(1);
  });

  it("remet les compteurs à zéro quand la journée de jeu change", () => {
    // Deux jours plus tard : le « 1/1 » d'hier ne doit pas s'afficher comme
    // déjà fait.
    const state = makeState({
      missionDay: gameDay(MIDI),
      missions: { pack: 1, recycle: 1, family: 1 },
    });
    const tomorrow = MIDI + DAY;
    const fresh = missionsAfterPack(state, tomorrow);
    expect(fresh.pack).toBe(1);
    expect(fresh.recycle).toBeUndefined();
    expect(fresh.family).toBeUndefined();
  });

  it("compte le recyclage d'un doublon", () => {
    const card = { creatorSlug: commonSlug(), rarity: "common" as Rarity };
    const state = makeState({
      missionDay: gameDay(MIDI),
      missions: {},
      cards: [
        { id: "a", ...card },
        { id: "b", ...card },
      ].map((entry) => ({
        ...entry,
        variant: "standard" as const,
        obtainedAt: MIDI,
        rareDrop: false,
      })),
    });
    const after = recycleCard(state, "b", MIDI);
    expect(after.missions.recycle).toBe(1);
  });

  it("paie un sablier par mission terminée, une seule fois", () => {
    const state = makeState({
      hourglasses: 2,
      missionDay: gameDay(MIDI),
      missions: { pack: 1, recycle: 1 },
    });
    const paid = claimMissions(state, MIDI);
    expect(paid.hourglasses).toBe(4);
    // Le second appui de la journée ne repaie pas : c'est la même journée.
    expect(() => claimMissions(paid, MIDI)).toThrowError(GameError);
  });

  it("refuse de payer une mission encore en cours", () => {
    const state = makeState({ missionDay: gameDay(MIDI), missions: {} });
    expect(() => claimMissions(state, MIDI)).toThrowError(/Aucune mission terminée/);
  });

  it("montre trois missions, jamais « 2/1 »", () => {
    const state = makeState({
      missionDay: gameDay(MIDI),
      missions: { pack: 1, recycle: 2 },
    });
    const view = getGameView(state, MIDI);
    expect(view.missions).toHaveLength(PROGRESSION.missions.list.length);
    expect(view.missions.find((mission) => mission.id === "pack")?.progress).toBe(1);
    for (const mission of view.missions) {
      expect(mission.progress).toBeLessThanOrEqual(mission.target);
    }
  });

  it("une carte en variante Live touche toujours la mission de famille", () => {
    expect(cardTouchesFamily({ creatorSlug: commonSlug(), variant: "live" }, null)).toBe(true);
    // Une carte Standard ne compte que si elle appartient à la famille visée.
    expect(cardTouchesFamily({ creatorSlug: commonSlug(), variant: "standard" }, null)).toBe(false);
    const creator = CREATOR_BY_SLUG.get(commonSlug())!;
    expect(
      cardTouchesFamily({ creatorSlug: creator.slug, variant: "standard" }, creator.region ?? null),
    ).toBe(true);
  });
});

describe("série de jours", () => {
  function openOn(state: PlayerState, day: number): PlayerState {
    stubRandom([0]);
    return applyPackResult(
      state,
      [{ creatorSlug: commonSlug(), rarity: "common", variant: "standard", rareDrop: false }],
      2,
      MIDI,
      1,
      MIDI + day * DAY,
    ).state;
  }

  it("compte les jours d'affilée et repart après un jour manqué", () => {
    let state = makeState({ streakDay: "", streak: 0 });
    state = openOn(state, 0);
    expect(state.streak).toBe(1);
    state = openOn(state, 1);
    expect(state.streak).toBe(2);
    state = openOn(state, 2);
    expect(state.streak).toBe(3);
    // Deux jours plus tard : la série est cassée, on repart de 1.
    state = openOn(state, 4);
    expect(state.streak).toBe(1);
  });

  it("allume la récompense au 7ᵉ jour, et pas avant", () => {
    let state = makeState({ streakDay: "", streak: 0 });
    for (let day = 0; day < PROGRESSION.streak.days; day += 1) {
      state = openOn(state, day);
      const expected = day + 1 >= PROGRESSION.streak.days;
      expect(state.streakJackpot).toBe(expected);
    }
  });

  it("le Perfect du 7ᵉ jour est consommé par un seul booster", () => {
    // Le joueur a atteint le 7ᵉ jour hier : le compteur de série est reparti de
    // zéro, la récompense attend. Le prochain tirage la dépense.
    stubRandom([0]);
    const state = makeState({ streakJackpot: true, streak: 0, streakDay: gameDay(MIDI - DAY) });
    const first = openPack(state, MIDI);
    expect(first.cards.every((card) => card.rareDrop)).toBe(true);
    expect(first.state.streakJackpot).toBe(false);
    // Et un deuxième booster de la journée est un booster normal : 999 au
    // tirage, c'est-à-dire pas de Perfect (la chance est de 1 sur 1000).
    stubRandom([999]);
    const second = openPack({ ...first.state, packs: 3 }, MIDI);
    expect(second.cards.some((card) => card.rareDrop)).toBe(false);
  });

  it("le 7ᵉ jour n'allume qu'une récompense, même en la gardant", () => {
    // Le piège : le joueur qui garde son Perfect le jour 7 ne doit pas en
    // gagner un deuxième en ouvrant son booster suivant. On ouvre de vrais
    // boosters (`openPack`), donc le jackpot est bien consommé.
    stubRandom([999]);
    let state = makeState({ streakDay: "", streak: 0, streakJackpot: false });
    for (let day = 0; day < PROGRESSION.streak.days - 1; day += 1) {
      state = openPack(state, MIDI + day * DAY).state;
    }
    state = openPack(state, MIDI + (PROGRESSION.streak.days - 1) * DAY).state;
    expect(state.streakJackpot).toBe(true);
    expect(state.streak).toBe(0);
    // Le lendemain : le booster consomme la récompense, et le cycle est au
    // jour 1 — pas de deuxième Perfect pour la même série.
    const after = openPack(state, MIDI + PROGRESSION.streak.days * DAY).state;
    expect(after.streakJackpot).toBe(false);
    expect(after.streak).toBe(1);
  });

  it("échange la récompense contre 3 sabliers, une fois", () => {
    const state = makeState({ streakJackpot: true, hourglasses: 1, streak: 6 });
    const paid = claimStreakJackpot(state, "hourglasses", MIDI);
    expect(paid.hourglasses).toBe(1 + PROGRESSION.streak.jackpotHourglasses);
    expect(paid.streakJackpot).toBe(false);
    expect(() => claimStreakJackpot(paid, "hourglasses", MIDI)).toThrowError(/Aucune récompense/);
  });

  it("garder le Perfect le laisse en attente pour le prochain booster", () => {
    const state = makeState({ streakJackpot: true, streak: 6 });
    const kept = claimStreakJackpot(state, "perfect", MIDI);
    expect(kept.streakJackpot).toBe(true);
    expect(kept.hourglasses).toBe(state.hourglasses);
  });

  it("publie la série et la récompense dans la vue", () => {
    const view = getGameView(makeState({ streak: 6, streakJackpot: true }), MIDI);
    expect(view.streak).toMatchObject({
      days: 6,
      target: PROGRESSION.streak.days,
      jackpot: true,
      jackpotHourglasses: PROGRESSION.streak.jackpotHourglasses,
    });
  });
});

describe("buyWithTokens", () => {
  it("rejoint un créateur manquant pour 400 jetons", () => {
    const state = makeState({ tokens: TOKEN_TARGET_COST + 12 });
    const after = buyWithTokens(state, commonSlug(), MIDI);
    expect(after.tokens).toBe(12);
    expect(after.cards).toHaveLength(1);
    expect(after.cards[0].creatorSlug).toBe(commonSlug());
  });

  it("refuse une Légendaire, quel que soit le solde", () => {
    const state = makeState({ tokens: 10_000 });
    expect(() => buyWithTokens(state, legendarySlug(), MIDI)).toThrowError(/ne s'achète pas/);
  });

  it("refuse de payer deux fois le même créateur", () => {
    const state = buyWithTokens(makeState({ tokens: 900 }), commonSlug(), MIDI);
    expect(() => buyWithTokens(state, commonSlug(), MIDI)).toThrowError(/déjà/);
  });

  it("refuse un solde insuffisant, en disant combien il manque", () => {
    const state = makeState({ tokens: TOKEN_TARGET_COST - 7 });
    expect(() => buyWithTokens(state, commonSlug(), MIDI)).toThrowError(/7 jetons/);
  });

  it("vise les créateurs que le catalogue ne laisse pas artisaner en Légendaire", () => {
    // La règle est la même des deux côtés : ni les points, ni les jetons
    // n'ouvrent une Légendaire. Seuls les boosters (et le plancher) le font.
    const state = makeState({ tokens: 10_000 });
    const legendary = CREATORS.filter((creator) => creator.rarity === "legendary");
    for (const creator of legendary.slice(0, 3)) {
      expect(() => buyWithTokens(state, creator.slug, MIDI)).toThrowError(/ne s'achète pas/);
    }
    expect(ownedSlugs(state).size).toBe(0);
  });
});

describe("applyServerProgression", () => {
  it("adopte les compteurs du serveur, qui calcule depuis le journal des tirages", () => {
    const state = makeState({ pityCounter: 3, streak: 1, streakJackpot: false });
    const aligned = applyServerProgression(
      state,
      { pity: 42, streak: 5, jackpotReady: true },
      MIDI + 1_000,
    );
    expect(aligned.pityCounter).toBe(42);
    expect(aligned.streak).toBe(5);
    expect(aligned.streakJackpot).toBe(true);
    expect(aligned.updatedAt).toBe(MIDI + 1_000);
  });

  it("ne touche pas aux jetons, qui ne vivent que sur l'appareil", () => {
    const state = makeState({ tokens: 250 });
    const aligned = applyServerProgression(state, { pity: 0, streak: 0 }, MIDI);
    expect(aligned.tokens).toBe(250);
  });

  it("renvoie le même objet quand rien ne change (pas de rendu inutile)", () => {
    const state = makeState({ pityCounter: 10, streak: 2, streakJackpot: false });
    expect(applyServerProgression(state, { pity: 10, streak: 2 }, MIDI)).toBe(state);
  });
});

describe("la vue publiée", () => {
  it("dit combien de jetons un booster donne, et s'il reste à réunir", () => {
    const view = getGameView(makeState({ tokens: 340 }), MIDI);
    expect(view.tokens.perPack).toBe(PROGRESSION.tokens.perPack);
    expect(view.tokens.targetCost).toBe(TOKEN_TARGET_COST);
    expect(view.tokens.missing).toBe(TOKEN_TARGET_COST - 340);
  });

  it("annonce le Prime Time en cours, et le bonus qui va avec", () => {
    const view = getGameView(makeState(), PRIME);
    expect(view.tokens.primeTime).toBe(true);
    expect(view.tokens.perPack).toBe(PROGRESSION.tokens.perPack + PROGRESSION.tokens.primeTimeBonus);
  });
});
