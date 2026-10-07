import { describe, expect, it } from "vitest";
import { createInitialState } from "@/lib/game-engine";
import {
  ARENA_DRAFT_CHOICES,
  ARENA_LINEUP_SIZE,
  ARENA_MAX_LEGENDARY,
  applyArenaReward,
  arenaDraftChoose,
  arenaDraftLineup,
  arenaDraftWindow,
  arenaEmblemEarned,
  arenaHourglasses,
  arenaLineupProblems,
  arenaRankLabel,
  arenaScore,
  arenaWeekEndsAt,
  arenaWeekKey,
  arenaWeekLabel,
  arenaWeekStartAt,
} from "@/lib/arena";
import { CREATORS } from "@/lib/catalog";

/** Lundi 5 octobre 2026, 06:00 UTC — le début d'une semaine d'arène. */
const WEEK_START = Date.UTC(2026, 9, 5, 6, 0, 0);
const HOUR = 60 * 60 * 1000;

describe("semaine d'arène", () => {
  it("commence le lundi à 6 h UTC et se publie par la date de ce lundi", () => {
    expect(arenaWeekKey(WEEK_START)).toBe("2026-10-05");
    expect(arenaWeekStartAt(WEEK_START)).toBe(WEEK_START);
    // Une minute avant, on est encore dans la semaine précédente.
    expect(arenaWeekKey(WEEK_START - 1)).toBe("2026-09-28");
    expect(arenaWeekKey(WEEK_START + 6 * 24 * HOUR + 23 * HOUR)).toBe("2026-10-05");
  });

  it("se referme au lundi suivant, à la même heure", () => {
    expect(arenaWeekEndsAt(WEEK_START)).toBe(WEEK_START + 7 * 24 * HOUR);
    // Après la fermeture, la clé a changé : les deux ne peuvent pas diverger.
    expect(arenaWeekKey(arenaWeekEndsAt(WEEK_START))).toBe("2026-10-12");
  });

  it("une semaine dure sept jours pleins, hiver compris", () => {
    // Changement d'heure en Europe (25 octobre 2026) : le calcul est en UTC,
    // aucune heure ne doit manquer ni s'ajouter.
    for (const day of ["2026-10-19", "2026-10-26"]) {
      const start = Date.parse(`${day}T06:00:00Z`);
      expect(arenaWeekEndsAt(start) - arenaWeekStartAt(start)).toBe(7 * 24 * HOUR);
    }
  });
});

describe("draft du week-end", () => {
  it("ouvre le samedi 6 h UTC et ferme le lundi 6 h UTC — 48 h", () => {
    const saturday = Date.UTC(2026, 9, 10, 6, 0, 0); // samedi 10 oct. 2026
    const window = arenaDraftWindow(saturday);
    expect(window.open).toBe(true);
    expect(window.opensAt).toBe(saturday);
    expect(window.closesAt - window.opensAt).toBe(2 * 24 * HOUR);
    // La fermeture tombe exactement sur le début de la semaine suivante.
    expect(window.closesAt).toBe(arenaWeekStartAt(saturday) + 7 * 24 * HOUR);
  });

  it("est ouvert tout le dimanche, et fermé en semaine", () => {
    const sunday = Date.UTC(2026, 9, 11, 21, 30, 0);
    expect(arenaDraftWindow(sunday).open).toBe(true);
    for (const day of [5, 12, 13, 14]) {
      expect(arenaDraftWindow(Date.UTC(2026, 9, day, 18, 0, 0)).open).toBe(false);
    }
    // Le lundi à 5 h 59 UTC, la journée de jeu est encore le dimanche : la
    // fenêtre est ouverte jusqu'à 6 h pile (le décalage de six heures est le
    // même pour la semaine, le draft et les missions).
    expect(arenaDraftWindow(Date.UTC(2026, 9, 12, 5, 59, 0)).open).toBe(true);
    expect(arenaDraftWindow(Date.UTC(2026, 9, 12, 6, 0, 0)).open).toBe(false);
  });

  it("propose trois cartes par emplacement, sur cinq emplacements", () => {
    expect(ARENA_DRAFT_CHOICES).toBe(3);
    expect(ARENA_DRAFT_CHOICES * ARENA_LINEUP_SIZE).toBe(15);
  });
});

describe("composition de l'arène", () => {
  const owned = new Set(CREATORS.map((creator) => creator.slug));
  const liveLogins = new Set([CREATORS[0].login]);
  const five = CREATORS.filter((creator) => creator.rarity !== "legendary")
    .slice(0, 5)
    .map((creator) => creator.slug);

  it("accepte cinq cartes possédées, dont une en direct", () => {
    const slugs = [CREATORS[0].slug, ...five.slice(1)];
    expect(arenaLineupProblems(slugs, { owned, liveLogins })).toEqual([]);
  });

  it("refuse ce qui n'est pas cinq cartes, ou deux fois la même", () => {
    expect(arenaLineupProblems(five.slice(0, 4), { owned, liveLogins })[0]).toMatch(/5 cartes/);
    expect(arenaLineupProblems([...five, five[0]], { owned, liveLogins })[0]).toMatch(/cartes/);
    const doubled = [five[0], five[0], ...five.slice(2)];
    expect(arenaLineupProblems(doubled, { owned, liveLogins })).toContain(
      "Deux fois la même carte dans l'arène : non.",
    );
  });

  it("refuse une carte qu'on ne possède pas, et le dit avec le nom", () => {
    const missing = CREATORS.find((creator) => !five.includes(creator.slug))!;
    const problems = arenaLineupProblems([...five.slice(1), missing.slug], {
      owned: new Set(five.slice(1)),
      liveLogins,
    });
    expect(problems.join(" ")).toContain(missing.displayName);
  });

  it("plafonne les Légendaires à une", () => {
    expect(ARENA_MAX_LEGENDARY).toBe(1);
    const legendaries = CREATORS.filter((creator) => creator.rarity === "legendary").slice(0, 2);
    const others = CREATORS.filter((creator) => creator.rarity !== "legendary").slice(0, 3);
    const twoLegendaries = [legendaries[0], legendaries[1], ...others].map((c) => c.slug);
    expect(arenaLineupProblems(twoLegendaries, { owned, liveLogins })[0]).toMatch(/Légendaire/);
  });

  it("exige au moins un créateur en direct", () => {
    const problems = arenaLineupProblems(five, { owned, liveLogins: new Set() });
    expect(problems).toContain("Il faut au moins un créateur en direct dans l'arène.");
  });
});

describe("score de l'arène", () => {
  it("additionne les viewers réels des créateurs alignés", () => {
    const chosen = CREATORS.slice(0, 5);
    const viewers = new Map([
      [chosen[0].login, 12_400],
      [chosen[1].login, 3_100],
    ]);
    const score = arenaScore(chosen.map((creator) => creator.slug), viewers);
    expect(score.total).toBe(15_500);
    expect(score.liveCount).toBe(2);
    // Le détail est trié du plus regardé au moins regardé.
    expect(score.lines[0].slug).toBe(chosen[0].slug);
    expect(score.lines.at(-1)?.viewers).toBe(0);
  });

  it("vaut zéro pour une carte hors direct, jamais une pénalité", () => {
    const creator = CREATORS[0];
    const score = arenaScore([creator.slug], new Map());
    expect(score.total).toBe(0);
    expect(score.lines[0]).toMatchObject({ live: false, viewers: 0 });
  });

  it("ignore un slug inconnu et ne compte pas deux fois la même carte", () => {
    const slug = CREATORS[0].slug;
    const viewers = new Map([[CREATORS[0].login, 5_000]]);
    const score = arenaScore([slug, slug, "slug-qui-nexiste-pas"], viewers);
    expect(score.total).toBe(5_000);
    expect(score.lines).toHaveLength(1);
  });

  it("arrondit les viewers, jamais de fractions", () => {
    const creator = CREATORS[1];
    const score = arenaScore([creator.slug], new Map([[creator.login, 41.6]]));
    expect(score.total).toBe(42);
  });
});

describe("récompenses hebdomadaires", () => {
  it("paie le podium, puis les dix premiers", () => {
    expect(arenaHourglasses(1)).toBe(5);
    expect(arenaHourglasses(2)).toBe(3);
    expect(arenaHourglasses(3)).toBe(2);
    expect(arenaHourglasses(10)).toBe(1);
    expect(arenaHourglasses(11)).toBe(0);
    expect(arenaHourglasses(null)).toBe(0);
  });

  it("donne l'emblème à qui termine dans le top 10, une fois", () => {
    expect(arenaEmblemEarned(1)).toBe(true);
    expect(arenaEmblemEarned(10)).toBe(true);
    expect(arenaEmblemEarned(11)).toBe(false);
    expect(arenaEmblemEarned(null)).toBe(false);
  });
});

describe("cohérence avec le catalogue", () => {
  it("une arène valide existe toujours : 5 cartes dont une en direct", () => {
    // Sans cette garantie, l'écran pourrait proposer une arène impossible.
    expect(CREATORS.length).toBeGreaterThanOrEqual(ARENA_LINEUP_SIZE);
    expect(CREATORS.filter((creator) => creator.rarity === "legendary").length).toBeGreaterThanOrEqual(
      ARENA_MAX_LEGENDARY,
    );
  });
});

describe("la récompense arrive dans la partie", () => {
  it("crédite les sabliers du rang, et rien pour zéro", () => {
    const state = createInitialState(Date.parse("2026-10-07T12:00:00Z"));
    const rich = applyArenaReward(state, 5, Date.parse("2026-10-12T06:00:00Z"));
    expect(rich.hourglasses).toBe(state.hourglasses + 5);
    expect(rich.updatedAt).toBe(Date.parse("2026-10-12T06:00:00Z"));
    // Zéro sablier : la partie revient telle quelle, sans copie inutile.
    expect(applyArenaReward(state, 0)).toBe(state);
    expect(applyArenaReward(state, -3)).toBe(state);
    // La partie d'origine n'est jamais modifiée.
    expect(state.hourglasses).toBe(12);
  });

  it("écrit le rang en français, jamais « 1ᵉ »", () => {
    expect(arenaRankLabel(1)).toBe("1er");
    expect(arenaRankLabel(2)).toBe("2e");
    expect(arenaRankLabel(10)).toBe("10e");
  });

  it("nomme la semaine par sa date de lundi", () => {
    expect(arenaWeekLabel("2026-09-28")).toBe("la semaine du 28 septembre");
    expect(arenaWeekLabel("2026-10-05")).toBe("la semaine du 5 octobre");
    // Une clé illisible ne casse rien : elle s'affiche telle quelle.
    expect(arenaWeekLabel("n'importe quoi")).toBe("n'importe quoi");
  });
});

describe("le choix du draft", () => {
  it("déplace une carte déjà choisie ailleurs, plutôt que de la dupliquer", () => {
    let picks = arenaDraftChoose({}, 0, "kaicenat");
    picks = arenaDraftChoose(picks, 1, "ibai");
    picks = arenaDraftChoose(picks, 2, "kaicenat");
    // La carte a quitté l'emplacement 1 pour le 3 : aucun doublon.
    expect(picks).toEqual({ 1: "ibai", 2: "kaicenat" });
    expect(new Set(arenaDraftLineup(5, picks)).size).toBe(2);
  });

  it("garde l'ordre des emplacements et ignore les trous", () => {
    const picks = arenaDraftChoose(arenaDraftChoose({}, 3, "michou"), 0, "ibai");
    expect(arenaDraftLineup(5, picks)).toEqual(["ibai", "michou"]);
    expect(arenaDraftLineup(5, {})).toEqual([]);
  });
});
