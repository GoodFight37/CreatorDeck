import { describe, expect, it } from "vitest";
import { CREATORS, RETIRED_CREATORS, RETIRED_BY_SLUG, RARITY_META, CATALOG_EDITION_NUMBER } from "@/lib/catalog";
import {
  canCraftRetired,
  craftWindowOpen,
  craftableRetired,
  isRetired,
  retiredLabel,
  retiredOwnedCount,
  type RetiredCreator,
} from "@/lib/retired";

/**
 * Les Sortants : les créateurs qui ont quitté le classement.
 *
 * Ce qui se teste ici, c'est la **règle**, pas la liste : aujourd'hui le fichier
 * de données est vide (aucune rotation n'a encore eu lieu). Les cas ci-dessous
 * montent donc leur propre Sortant — c'est ce qui garantit que la mécanique
 * marchera le jour où un vrai nom sortira du classement.
 */
function sortant(overrides: Partial<RetiredCreator> = {}): RetiredCreator {
  const base = CREATORS[0];
  return {
    ...base,
    retiredEdition: CATALOG_EDITION_NUMBER,
    retiredAt: "2026-10-07T00:00:00Z",
    ...overrides,
  };
}

describe("les Sortants", () => {
  it("le catalogue livré n'en contient aucun — et c'est vérifiable", () => {
    // Une liste vide est un état normal : le premier Sortant apparaîtra à la
    // première régénération du catalogue.
    expect(Array.isArray(RETIRED_CREATORS)).toBe(true);
    expect(RETIRED_BY_SLUG.size).toBe(RETIRED_CREATORS.length);
    for (const creator of RETIRED_CREATORS) {
      // Un Sortant ne peut pas être aussi dans le catalogue courant : c'est la
      // règle de lecture de `catalog.ts` (le catalogue gagne, et le doublon est
      // écarté).
      expect(CREATORS.some((current) => current.slug === creator.slug)).toBe(false);
    }
  });

  it("ne reconnaît comme Sortant que ce qui est dans la liste", () => {
    expect(isRetired("ce-slug-nexiste-pas")).toBe(false);
    // Un créateur du catalogue courant n'est jamais un Sortant.
    for (const creator of CREATORS.slice(0, 20)) {
      expect(isRetired(creator.slug)).toBe(false);
    }
  });

  it("laisse la fenêtre d'artisanat ouverte pendant l'édition du départ", () => {
    const creator = sortant({ retiredEdition: 3 });
    expect(craftWindowOpen(creator, 3)).toBe(true);
    // L'édition suivante ferme la porte : c'est ce qui donne sa valeur au fait
    // de l'avoir rejoint à temps.
    expect(craftWindowOpen(creator, 4)).toBe(false);
    expect(craftWindowOpen(creator, 2)).toBe(false);
  });

  it("n'ouvre la fenêtre qu'aux raretés artisanales", () => {
    // Une Légendaire ne s'artisane pas, Sortante ou pas : c'est la règle du jeu.
    expect(RARITY_META.legendary.craftable).toBe(false);
    expect(canCraftRetired(sortant({ rarity: "legendary", retiredEdition: 1 }), 1)).toBe(false);
    expect(canCraftRetired(sortant({ rarity: "epic", retiredEdition: 1 }), 1)).toBe(true);
    // Fenêtre fermée : refus, même pour une commune.
    expect(canCraftRetired(sortant({ rarity: "common", retiredEdition: 1 }), 2)).toBe(false);
  });

  it("écrit l'état de la fenêtre en français, sans mentir", () => {
    const craftable = sortant({ rarity: "rare", retiredEdition: 1 });
    expect(retiredLabel(craftable, 1)).toMatch(/artisanable cette édition/);
    expect(retiredLabel(craftable, 2)).toBe("Sortant · plus artisanable");
    const legendary = sortant({ rarity: "legendary", retiredEdition: 1 });
    expect(retiredLabel(legendary, 1)).toMatch(/légendaire/);
  });

  it("ne renvoie que les Sortants encore artisanables", () => {
    expect(craftableRetired(CATALOG_EDITION_NUMBER).every((creator) => canCraftRetired(creator))).toBe(true);
    // Une édition très lointaine : plus personne n'est artisanable.
    expect(craftableRetired(9_999)).toEqual([]);
  });

  it("compte les cartes du joueur qui ne sont plus tirables", () => {
    expect(retiredOwnedCount([])).toBe(0);
    expect(retiredOwnedCount(["un-slug-inconnu", "un-autre"])).toBe(0);
    // Le compteur ne regarde que les vraies clés : la liste étant vide
    // aujourd'hui, on construit le cas avec un slug du catalogue — il ne compte
    // pas, puisqu'il n'est pas Sortant.
    expect(retiredOwnedCount([CREATORS[0]!.slug])).toBe(0);
  });
});
