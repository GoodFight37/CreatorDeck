import { describe, expect, it } from "vitest";
import {
  deservesSpotlight,
  EPIC_SILENCE_MS,
  isFinalSlot,
  isPerfect,
  PERFECT_HAPTIC,
  PERFECT_LOCK_MS,
  RESIST_SHAKE_MS,
  resistCount,
  resistHaptic,
  revealHaptic,
  silenceBefore,
} from "@/lib/reveal";

/**
 * La mise en scène de la révélation : le silence, le refus, le verrou. Ce sont
 * des nombres et des règles — donc ils se testent, et c'est tant mieux : une
 * animation qui déraille ne se voit qu'à l'écran, une règle qui déraille se voit
 * ici.
 */
describe("la révélation", () => {
  it("ne reconnaît que le dernier emplacement comme le slot garanti", () => {
    expect(isFinalSlot(4, 5)).toBe(true);
    expect(isFinalSlot(0, 5)).toBe(false);
    expect(isFinalSlot(4, 0)).toBe(false);
  });

  it("fait résister la dernière carte, et deux fois si elle est Épique ou mieux", () => {
    // Les quatre premières ne résistent pas : le rythme avant le dernier slot.
    expect(resistCount(0, 5, "common")).toBe(0);
    expect(resistCount(2, 5, "legendary")).toBe(0);
    // La dernière résiste toujours une fois — c'est le moment qu'on a annoncé.
    expect(resistCount(4, 5, "common")).toBe(1);
    expect(resistCount(4, 5, "rare")).toBe(1);
    // …et deux fois quand la carte vaut le coup.
    expect(resistCount(4, 5, "epic")).toBe(2);
    expect(resistCount(4, 5, "legendary")).toBe(2);
    // Un paquet d'une seule carte : elle est le dernier slot.
    expect(resistCount(0, 1, "legendary")).toBe(2);
  });

  it("ne fait de silence que devant une Épique ou une Légendaire", () => {
    expect(silenceBefore("common")).toBe(0);
    expect(silenceBefore("uncommon")).toBe(0);
    expect(silenceBefore("rare")).toBe(0);
    expect(silenceBefore("epic")).toBe(EPIC_SILENCE_MS);
    expect(silenceBefore("legendary")).toBe(EPIC_SILENCE_MS);
    expect(EPIC_SILENCE_MS).toBe(400);
  });

  it("vibre de plus en plus fort avec la rareté", () => {
    const patternLength = (rarity: Parameters<typeof revealHaptic>[0]) =>
      revealHaptic(rarity).reduce((total, value) => total + value, 0);
    expect(patternLength("common")).toBeLessThan(patternLength("rare"));
    expect(patternLength("rare")).toBeLessThan(patternLength("epic"));
    expect(patternLength("epic")).toBeLessThan(patternLength("legendary"));
    // Le Perfect est le plus long de tous, et de loin.
    const perfectLength = PERFECT_HAPTIC.reduce((total, value) => total + value, 0);
    expect(perfectLength).toBeGreaterThan(patternLength("legendary"));
  });

  it("ajoute une pulsation pour une variante spéciale", () => {
    // La matière (Gold, Live) se sent, elle aussi : c'est la rareté **et** la
    // variante qui décident du motif.
    expect(revealHaptic("rare", "gold").length).toBeGreaterThan(revealHaptic("rare").length);
    expect(revealHaptic("rare", "standard")).toEqual(revealHaptic("rare"));
  });

  it("garde le refus court et discret", () => {
    const total = resistHaptic().reduce((sum, value) => sum + value, 0);
    expect(total).toBeLessThan(RESIST_SHAKE_MS);
    expect(resistHaptic().length).toBeGreaterThan(1);
  });

  it("reconnaît le Perfect au tirage, pas aux cartes reçues", () => {
    // La règle du jeu : `rareDrop` est décidé par le tirage. Un paquet de cinq
    // Légendaires tirés un par un n'est **pas** un Perfect.
    expect(isPerfect([{ rareDrop: true }, { rareDrop: false }])).toBe(true);
    expect(isPerfect([{ rareDrop: false }])).toBe(false);
    expect(isPerfect([])).toBe(false);
  });

  it("réserve le plein écran au Légendaire et au Perfect", () => {
    expect(deservesSpotlight("legendary", false)).toBe(true);
    expect(deservesSpotlight("epic", true)).toBe(true);
    expect(deservesSpotlight("epic", false)).toBe(false);
    expect(deservesSpotlight("common", false)).toBe(false);
    // Le verrou du Perfect laisse le temps de lire cinq cartes : deux secondes.
    expect(PERFECT_LOCK_MS).toBe(2_000);
  });
});
