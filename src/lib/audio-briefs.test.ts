import { describe, expect, it } from "vitest";
import briefs from "@/data/audio-briefs.json";

/**
 * Les briefs ElevenLabs alimentent le laboratoire et le script de génération :
 * ils doivent rester cohérents (3 directions distinctes, budget Starter).
 */
describe("briefs de génération audio", () => {
  it("propose trois directions musicales réellement différentes", () => {
    const directions = briefs.musique.directions;
    expect(directions).toHaveLength(3);
    expect(new Set(directions.map((direction) => direction.id)).size).toBe(3);
    expect(new Set(directions.map((direction) => direction.prompt)).size).toBe(3);
    for (const direction of directions) {
      expect(direction.label.length).toBeGreaterThan(3);
      expect(direction.prompt.length).toBeGreaterThan(80);
      expect(direction.longueurMs).toBeGreaterThanOrEqual(30_000);
      expect(direction.variantes).toBeGreaterThanOrEqual(2);
      expect(direction.negativeStyles.length).toBeGreaterThan(0);
    }
  });

  it("couvre les gestes sonores du jeu, avec des variantes", () => {
    const noms = briefs.effets.sons.map((son) => son.nom);
    for (const attendu of ["card-draw", "card-turn", "pack-tear", "chip-place", "pop", "close", "coins", "chime", "craft", "reveal-common", "reveal-legendary"]) {
      expect(noms).toContain(attendu);
    }
    for (const son of briefs.effets.sons) {
      expect(son.variantes).toBeGreaterThanOrEqual(1);
      expect(son.dureeSecondes).toBeGreaterThanOrEqual(0.5);
      expect(son.dureeSecondes).toBeLessThanOrEqual(30);
      expect(son.prompt.length).toBeGreaterThan(40);
    }
  });

  it("tient dans un mois Starter, avec une réserve pour une seconde passe", () => {
    const musique = briefs.musique.directions.reduce(
      (total, direction) => total + direction.variantes * (direction.longueurMs / 60_000) * briefs.credits.musiqueParMinute,
      0,
    );
    const effets = briefs.effets.sons.reduce(
      (total, son) => total + son.variantes * briefs.credits.effetParGeneration,
      0,
    );
    expect(musique + effets).toBeLessThanOrEqual(briefs.credits.planStarterMensuel);
    expect(musique + effets).toBeLessThanOrEqual(briefs.credits.planStarterMensuel * 0.6);
  });
});
