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
import { PACKS } from "@/lib/catalog";
import { PITY } from "@/lib/pull-rates";
import {
  PROGRESSION,
  STREAK_REWARDS,
  TOKEN_TARGET_COST,
  gameDay,
  streakRewardFor,
  streakRewardLabel,
  streakRewardParts,
} from "@/lib/progression";
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
    // Le compteur **affiche le jour gagné** (7/7) et s'y tient jusqu'à la
    // journée suivante : c'est le chiffre que montre le planning, et c'est
    // aussi celui du serveur (`_pack_streak` renvoie 7 ce jour-là). Le cycle
    // repart à 1 demain, pas maintenant — sinon l'écran annoncerait « Série
    // 0/7 » pendant que la septième case vient d'être cochée.
    expect(state.streak).toBe(PROGRESSION.streak.days);
    // Le lendemain : le booster consomme la récompense, et le cycle est au
    // jour 1 — pas de deuxième Perfect pour la même série.
    const after = openPack(state, MIDI + PROGRESSION.streak.days * DAY).state;
    expect(after.streakJackpot).toBe(false);
    expect(after.streak).toBe(1);
  });

  it("paie les jours 1 à 6, un par jour coché, et rien au 7ᵉ", () => {
    // La table publiée (`progression.json`) : six jours qui paient, le 7ᵉ qui
    // paie le jackpot — jamais les deux. Et rien hors bornes : un compteur
    // bricolé ne doit pas inventer une récompense.
    expect(STREAK_REWARDS.map((reward) => reward.day)).toEqual([1, 2, 3, 4, 5, 6]);
    for (const reward of STREAK_REWARDS) {
      const granted = streakRewardFor(reward.day)!;
      expect(granted.day).toBe(reward.day);
      // Chaque jour paie quelque chose : une case cochée sans rien recevoir
      // serait une frustration, pas une récompense.
      expect(granted.points + granted.hourglasses + granted.tokens).toBeGreaterThan(0);
    }
    expect(streakRewardFor(PROGRESSION.streak.days)).toBeNull();
    expect(streakRewardFor(0)).toBeNull();
    expect(streakRewardFor(8)).toBeNull();
  });

  it("la récompense en une phrase liste ce qu'elle donne", () => {
    expect(streakRewardLabel({ points: 40, hourglasses: 0, tokens: 0 })).toBe("+40 points");
    expect(streakRewardLabel({ points: 80, hourglasses: 0, tokens: 10 })).toBe("+80 points · +10 jetons");
    expect(streakRewardLabel({ points: 0, hourglasses: 2, tokens: 0 })).toBe("+2 sabliers");
    expect(streakRewardLabel({ points: 0, hourglasses: 0, tokens: 0 })).toBe("");
  });

  it("les cases du planning disent le barème, en morceaux courts", () => {
    // Le planning n'a que quelques pixels par case : les morceaux s'écrivent
    // en abrégé, un par ligne, mais ils viennent **du même barème** que le
    // badge de révélation — l'écran ne peut pas annoncer autre chose que ce que
    // le moteur verse.
    expect(streakRewardParts({ points: 40 })).toEqual(["+40 pts"]);
    expect(streakRewardParts({ hourglasses: 1 })).toEqual(["+1 sablier"]);
    expect(streakRewardParts({ hourglasses: 3 })).toEqual(["+3 sabliers"]);
    expect(streakRewardParts({ points: 120, hourglasses: 1 })).toEqual(["+120 pts", "+1 sablier"]);
    expect(streakRewardParts({ points: 80, tokens: 10 })).toEqual(["+80 pts", "+10 jetons"]);
    expect(streakRewardParts({})).toEqual([]);
    // Chaque jour du fichier sait s'écrire, et le 7ᵉ n'y est pas : il paie le
    // jackpot, qui a sa propre phrase (« Perfect ou N sabliers »).
    for (const reward of STREAK_REWARDS) {
      const parts = streakRewardParts(reward);
      expect(parts.length, `jour ${reward.day}`).toBeGreaterThan(0);
      expect(parts.join(" ")).not.toContain("undefined");
    }
  });

  it("deux boosters le même jour : la série ne bouge pas et le jour ne paie qu'une fois", () => {
    stubRandom([999]);
    const premier = openPack(makeState({ packs: 4 }), MIDI);
    expect(premier.streakReward?.day).toBe(1);
    const second = openPack({ ...premier.state, packs: 4 }, MIDI + 60_000);
    // Même journée : rien de neuf à cocher, donc rien de neuf à payer. Sans
    // cette garde, ouvrir dix boosters d'affilée aurait versé dix fois le
    // jour 1 — et remis la série à 1 à chaque fois.
    expect(second.streakReward).toBeNull();
    expect(second.state.streak).toBe(premier.state.streak);
    expect(second.state.points).toBe(premier.state.points + PACKS.live.points);
  });

  it("en ligne, un jour déjà payé par le serveur n'est pas repayé localement", () => {
    // Le serveur dit le jour **et** les points qu'il a versés (`0032`). Quand il
    // annonce 0 point pour un jour qui en vaut, c'est que la journée de jeu
    // était déjà payée : le moteur ne doit alors rien créditer du tout — ni
    // sabliers, ni jetons — sinon l'écran verserait une deuxième fois ce que le
    // serveur a déjà donné. Et quand un jour ne paie pas de points **par
    // nature** (J2, un sablier), il est annoncé 0 lui aussi : là, le sablier
    // doit bien tomber.
    const base = makeState({ streakDay: "", streak: 0, hourglasses: 0 });
    const carte = {
      creatorSlug: commonSlug(),
      rarity: "common" as const,
      variant: "standard" as const,
      rareDrop: false,
    };
    /** Ouvre un booster cloud, avec ce que le serveur annonce. */
    function ouvrir(depuis: PlayerState, day: number | null, points: number | null) {
      stubRandom([0]);
      return applyPackResult(depuis, [carte], 2, MIDI, 1, MIDI + 2 * DAY, {
        pointsFromServer: true,
        rewardDay: day,
        rewardPoints: points,
      });
    }

    // La référence : un jour 1 frais, qui ne donne ni sablier ni jeton.
    const temoin = ouvrir(base, 1, 40);
    const jetonsDuBooster = temoin.state.tokens - base.tokens;
    const sabliersDuBooster = temoin.state.hourglasses - base.hourglasses;
    const pointsDuBooster = temoin.state.points - base.points;
    expect(temoin.streakReward?.day).toBe(1);
    expect(jetonsDuBooster).toBeGreaterThan(0);

    // Jour 4 frais : les 10 jetons du barème tombent, les points restent au
    // serveur (le moteur ne les compte pas deux fois).
    const jour4 = ouvrir(base, 4, 80);
    expect(jour4.streakReward?.day).toBe(4);
    expect(jour4.state.tokens).toBe(base.tokens + jetonsDuBooster + 10);
    expect(jour4.state.hourglasses).toBe(base.hourglasses + sabliersDuBooster);
    expect(jour4.state.points).toBe(base.points + pointsDuBooster);

    // Le deuxième booster du même jour de jeu : le serveur annonce le jour et
    // 0 point → rien n'est crédité, et rien n'est annoncé à l'écran.
    const repete = ouvrir(base, 4, 0);
    expect(repete.streakReward).toBeNull();
    expect(repete.state.tokens).toBe(base.tokens + jetonsDuBooster);
    expect(repete.state.hourglasses).toBe(base.hourglasses + sabliersDuBooster);

    // Jour 2 : le serveur verse 0 point (c'est un sablier, il vit ici), et le
    // sablier tombe bien.
    const jour2 = ouvrir(base, 2, 0);
    expect(jour2.streakReward?.day).toBe(2);
    expect(jour2.streakReward?.hourglasses).toBe(1);
    expect(jour2.state.hourglasses).toBe(base.hourglasses + sabliersDuBooster + 1);
    expect(jour2.state.tokens).toBe(base.tokens + jetonsDuBooster);
  });

  it("le 8ᵉ jour d'affilée est un jour 1, pas un deuxième jackpot", () => {
    stubRandom([999]);
    let state = makeState({ streakDay: "", streak: 0, streakJackpot: false });
    const rewards: Array<number | null> = [];
    for (let day = 0; day < PROGRESSION.streak.days + 1; day += 1) {
      const drawn = openPack(state, MIDI + day * DAY);
      state = drawn.state;
      rewards.push(drawn.streakReward?.day ?? null);
    }
    // Sept jours : six récompenses (1 → 6), puis le jackpot (aucune
    // micro-récompense), puis un nouveau cycle qui repaie le jour 1.
    expect(rewards).toEqual([1, 2, 3, 4, 5, 6, null, 1]);
    expect(state.streak).toBe(1);
    expect(state.streakJackpot).toBe(false);
  });

  it("un compteur de série venu du serveur s'affiche dans le cycle 1 → 7", () => {
    // Le serveur compte les jours d'affilée sans fin de cycle : 9 le 9ᵉ jour.
    // L'écran, lui, montre toujours un jour du planning.
    stubRandom([999]);
    const neuvieme = () => applyServerProgression(makeState(), { pity: 0, streak: 9 }, MIDI).streak;
    expect(neuvieme()).toBe(2);
    expect(applyServerProgression(makeState(), { pity: 0, streak: 7 }, MIDI).streak).toBe(7);
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
