/**
 * Les règles de progression, testées sur leurs points sensibles : la journée
 * qui commence à 6 h UTC (et pas à minuit), le Prime Time en heure locale, et
 * les jetons qui suivent la fenêtre.
 */
import { describe, expect, it } from "vitest";
import {
  MISSIONS,
  PROGRESSION,
  TOKEN_TARGET_COST,
  follows,
  gameDay,
  isPrimeTime,
  nextGameDay,
  primeTimeLabel,
  tokensForPack,
} from "@/lib/progression";

/** Un instant à une heure UTC donnée (l'appareil des tests est en UTC). */
function at(iso: string): number {
  return Date.parse(iso);
}

describe("la journée de jeu", () => {
  it("commence à 6 h UTC, pas à minuit", () => {
    // 5 h 59 UTC : encore la journée de la veille.
    expect(gameDay(at("2026-10-07T05:59:00Z"))).toBe("2026-10-06");
    // 6 h pile : la nouvelle journée commence.
    expect(gameDay(at("2026-10-07T06:00:00Z"))).toBe("2026-10-07");
    // 23 h 30 : toujours la même journée (la soirée d'un streameur ne se coupe
    // pas en deux).
    expect(gameDay(at("2026-10-07T23:30:00Z"))).toBe("2026-10-07");
  });

  it("n'a pas de trou ni de doublon entre deux journées", () => {
    const day = "2026-10-07";
    expect(nextGameDay(day)).toBe("2026-10-08");
    expect(follows(day, "2026-10-08")).toBe(true);
    expect(follows(day, "2026-10-09")).toBe(false);
    expect(follows(day, day)).toBe(false);
    // Passage de mois et d'année.
    expect(nextGameDay("2026-10-31")).toBe("2026-11-01");
    expect(nextGameDay("2026-12-31")).toBe("2027-01-01");
    // Une entrée illisible ne fait pas planter : elle ne « suit » rien.
    expect(follows("hier", "2026-10-08")).toBe(false);
  });

  it("le décalage vient du fichier, pas d'un 6 écrit en dur ailleurs", () => {
    expect(PROGRESSION.missions.resetHourUtc).toBe(6);
  });
});

describe("le Prime Time", () => {
  it("couvre 20 h – 23 h, borne de fin exclue", () => {
    const local = (hour: number) => new Date(2026, 9, 7, hour, 30).getTime();
    expect(isPrimeTime(local(19))).toBe(false);
    expect(isPrimeTime(local(20))).toBe(true);
    expect(isPrimeTime(local(22))).toBe(true);
    expect(isPrimeTime(new Date(2026, 9, 7, 23, 0).getTime())).toBe(false);
    expect(isPrimeTime(new Date(2026, 9, 7, 3, 0).getTime())).toBe(false);
  });

  it("s'écrit avec ses horaires dans l'interface", () => {
    expect(primeTimeLabel()).toBe("Prime Time 20 h – 23 h");
  });

  it("paie 2 jetons de plus par booster", () => {
    const soir = new Date(2026, 9, 7, 21, 0).getTime();
    const matin = new Date(2026, 9, 7, 10, 0).getTime();
    expect(tokensForPack(matin)).toBe(PROGRESSION.tokens.perPack);
    expect(tokensForPack(soir)).toBe(PROGRESSION.tokens.perPack + PROGRESSION.tokens.primeTimeBonus);
  });
});

describe("les jetons et les missions", () => {
  it("400 jetons font exactement 80 boosters — l'effort de la garantie Légendaire", () => {
    expect(TOKEN_TARGET_COST).toBe(400);
    expect(TOKEN_TARGET_COST / PROGRESSION.tokens.perPack).toBe(80);
  });

  it("il y a trois missions, et chacune paie un sablier", () => {
    expect(MISSIONS).toHaveLength(3);
    expect(MISSIONS.map((mission) => mission.id)).toEqual(["pack", "recycle", "family"]);
    expect(MISSIONS.every((mission) => mission.target === 1)).toBe(true);
    expect(PROGRESSION.missions.reward.hourglasses).toBe(1);
  });

  it("la série se joue sur sept jours", () => {
    expect(PROGRESSION.streak.days).toBe(7);
    expect(PROGRESSION.streak.jackpotHourglasses).toBe(3);
  });
});
