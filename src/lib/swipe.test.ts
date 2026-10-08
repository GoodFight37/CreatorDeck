/**
 * Le geste de la carte d'imprévu : ce qui arme, et surtout ce qui n'arme pas.
 *
 * Un geste ne se vérifie pas à l'œil, et un seuil trop gourmand se paie en
 * cartes qu'on ne peut plus jouer. Les deux refus qui comptent sont ici : un
 * effleurement ne choisit rien, et un défilement vertical non plus.
 */
import { describe, expect, it } from "vitest";

import { SWIPE_ARM_PX, swipeVerdict } from "@/lib/swipe";

describe("le glissement de la carte", () => {
  it("n'arme rien tant que le doigt n'a pas fait la course", () => {
    expect(swipeVerdict(0).armed).toBeNull();
    expect(swipeVerdict(SWIPE_ARM_PX - 1).armed).toBeNull();
    expect(swipeVerdict(-(SWIPE_ARM_PX - 1)).armed).toBeNull();
  });

  it("arme dès le seuil franchi, et de chaque côté", () => {
    expect(swipeVerdict(SWIPE_ARM_PX).armed).toBe("droite");
    expect(swipeVerdict(-SWIPE_ARM_PX).armed).toBe("gauche");
    expect(swipeVerdict(200).armed).toBe("droite");
    expect(swipeVerdict(-200).armed).toBe("gauche");
  });

  it("laisse le défilement vertical au navigateur", () => {
    // Un geste qui descend plus qu'il ne va de côté est un scroll (la feuille de
    // la chaîne se fait défiler au doigt) : il ne doit pas répondre à un imprévu.
    expect(swipeVerdict(30, 120).armed).toBeNull();
    expect(swipeVerdict(120, 400).armed).toBeNull();
    // Mais un geste franc, même un peu oblique, compte : on est permissif.
    expect(swipeVerdict(140, 90).armed).toBe("droite");
  });

  it("rend toujours la course, armée ou non — l'écran suit le doigt", () => {
    expect(swipeVerdict(42).dx).toBe(42);
    expect(swipeVerdict(-42).dx).toBe(-42);
    expect(swipeVerdict(-42).armed).toBeNull();
  });

  it("a un seuil atteignable au pouce (moins de deux centimètres)", () => {
    expect(SWIPE_ARM_PX).toBeGreaterThan(32);
    expect(SWIPE_ARM_PX).toBeLessThanOrEqual(96);
  });
});
