import { describe, expect, it } from "vitest";

import { RARITY_META } from "@/lib/catalog";
import { boosterOnlyMessage, circleGoal, missingPreview } from "@/lib/circle-goal";

// ibai : Légendaire · anyme023 : Épique · jeanmassiet : Rare · swehyt : Peu commune · zeusspezial : Commune
const CIRCLE = ["ibai", "anyme023", "jeanmassiet", "swehyt", "zeusspezial"];

describe("circleGoal : l'objectif « Ton cercle à compléter »", () => {
  it("compte les chaînes obtenues et garde l'ordre du cercle pour les manquantes", () => {
    const goal = circleGoal(CIRCLE, new Set(["jeanmassiet", "hors-cercle"]), 0);
    expect(goal.owned).toBe(1);
    expect(goal.total).toBe(5);
    expect(goal.missing.map((creator) => creator.slug)).toEqual(["ibai", "anyme023", "swehyt", "zeusspezial"]);
  });

  it("vise la première chaîne fabricable, au prix de l'Atelier, et jamais une Légendaire", () => {
    const goal = circleGoal(CIRCLE, new Set(), 100);
    expect(goal.craftTarget?.creator.slug).toBe("anyme023");
    expect(goal.craftTarget?.cost).toBe(RARITY_META.epic.craftCost);
    expect(goal.craftTarget?.affordable).toBe(false);
    expect(goal.craftTarget?.missingPoints).toBe((RARITY_META.epic.craftCost as number) - 100);
    expect(goal.boosterOnly.map((creator) => creator.slug)).toEqual(["ibai"]);
  });

  it("dit quand les points suffisent", () => {
    const goal = circleGoal(["ibai", "zeusspezial", "swehyt", "anyme023", "jeanmassiet"], new Set(), 5_000);
    expect(goal.craftTarget).toMatchObject({ affordable: true, missingPoints: 0 });
    expect(goal.craftTarget?.creator.slug).toBe("zeusspezial");
  });

  it("cercle de Légendaires : rien à fabriquer, tout se tire en booster", () => {
    const goal = circleGoal(["kaicenat", "ibai", "ninja", "auronplay", "rubius"], new Set(["ninja"]), 9_999);
    expect(goal.craftTarget).toBeNull();
    expect(goal.boosterOnly).toHaveLength(4);
    expect(boosterOnlyMessage(goal.boosterOnly)).toContain("à tirer en booster");
  });

  it("une préférée Commune reste fabricable au prix Commune du catalogue", () => {
    const circle = ["zeusspezial", ...CIRCLE.filter(slug => slug !== "zeusspezial")];
    const goal = circleGoal(circle, new Set(), 9999);
    expect(goal.craftTarget?.creator.rarity).toBe("common");
    expect(goal.craftTarget?.cost).toBe(RARITY_META.common.craftCost);
    expect(boosterOnlyMessage(goal.boosterOnly)).toContain("ibai ne se fabrique pas : à tirer");
  });

  it("cercle complet ou inconnu : aucune cible", () => {
    expect(circleGoal(CIRCLE, new Set(CIRCLE), 0)).toMatchObject({ owned: 5, total: 5, missing: [], craftTarget: null });
    expect(circleGoal(["chaine-inconnue"], new Set(), 0)).toMatchObject({ owned: 0, total: 0, craftTarget: null });
  });

  it("aperçu des manquantes", () => {
    const goal = circleGoal(CIRCLE, new Set(), 0);
    expect(missingPreview(goal.missing)).toBe("À trouver : ibai, Anyme023, JeanMassiet et 2 autres.");
    expect(missingPreview(goal.missing.slice(0, 2))).toBe("À trouver : ibai, Anyme023.");
    expect(missingPreview([])).toBe("Toutes tes chaînes sont dans ta collection.");
  });
});
