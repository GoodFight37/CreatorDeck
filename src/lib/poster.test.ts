import { describe, expect, it } from "vitest";
import type { PlayerProfile } from "@/lib/cloud/api";
import { POSTER_HEIGHT, POSTER_WIDTH, posterFileName, posterModel } from "@/lib/poster";

/**
 * Ce qui se teste ici, c'est le **contenu** de l'affiche : les textes et les
 * chiffres. Le dessin lui-même (`drawPoster`) ne se vérifie qu'à l'œil — un
 * canvas simulé ne dirait rien de ce que voit le joueur.
 */
const PROFILE: PlayerProfile = {
  userId: "u1",
  displayName: "Diane",
  level: 12,
  points: 640,
  verified: true,
  uniqueCreators: 137,
  totalCards: 402,
  legendaryCards: 9,
  epicCards: 31,
  goldCards: 3,
  holoCards: 12,
  catalogSize: 1000,
  completion: 0.137,
  rankCompletion: 42,
  rankCards: 118,
  showcaseSlugs: ["kaicenat", "ibai", "createur-inconnu"],
  byRarity: [
    { rarity: "legendary", owned: 4, total: 50 },
    { rarity: "rare", owned: 40, total: 230 },
    { rarity: "common", owned: 93, total: 300 },
  ],
  byRegion: [
    { regionId: "S01", owned: 40, total: 155 },
    { regionId: "S04", owned: 97, total: 402 },
  ],
};

describe("affiche de partage", () => {
  it("raconte le profil avec des chiffres à la française", () => {
    const model = posterModel(PROFILE);

    expect(model.title).toBe("Diane");
    // `toLocaleString("fr-FR")` écrit une espace fine insécable : le test la
    // ramène à une espace normale pour rester lisible.
    const spaces = (text: string) => text.replace(/[\u202f\u00a0]/g, " ");
    expect(spaces(model.subtitle)).toBe("137 créateurs sur 1 000 · 13,7 %");
    expect(model.stats).toContainEqual({ label: "Complétion", value: "13,7 %" });
    expect(model.stats).toContainEqual({ label: "Cartes", value: "402" });
    expect(model.stats).toContainEqual({ label: "Classement", value: "42ᵉ" });
    expect(model.footer).toBe("CreatorDeck · niveau 12");
  });

  it("ne garde que les cartes du catalogue, avec leur rareté", () => {
    const model = posterModel(PROFILE);

    // Le créateur inconnu du catalogue local est écarté : l'affiche ne peut pas
    // montrer une carte qu'elle ne sait pas dessiner.
    expect(model.cards.map((card) => card.slug)).toEqual(["kaicenat", "ibai"]);
    expect(model.cards[0]?.displayName.length).toBeGreaterThan(0);
    expect(model.cards[0]?.image).toBe("/creators/kaicenat.jpg");
    expect(model.cards[0]?.color).toMatch(/^#|^rgb/);
  });

  it("donne la progression de chaque rareté", () => {
    const model = posterModel(PROFILE);

    expect(model.rarity[0]).toMatchObject({ label: "Légendaire", value: "4 / 50" });
    expect(model.rarity[0]?.ratio).toBeCloseTo(0.08);
    expect(model.rarity[1]?.ratio).toBeCloseTo(40 / 230);
  });

  it("ne classe pas une collection non vérifiée", () => {
    const model = posterModel({ ...PROFILE, verified: false, rankCompletion: null });

    expect(model.subtitle).toBe("Collection en cours de vérification");
    expect(model.stats).toContainEqual({ label: "Classement", value: "non classé" });
  });

  it("arrondit à 100 % plutôt que d'afficher 100,0 %", () => {
    const model = posterModel({ ...PROFILE, completion: 1, uniqueCreators: 1000 });
    expect(model.stats).toContainEqual({ label: "Complétion", value: "100 %" });
  });

  it("nomme le fichier d'après le pseudo, sans accent ni espace", () => {
    expect(posterFileName("Diane")).toBe("creatordeck-diane.png");
    expect(posterFileName("KaiCenat")).toBe("creatordeck-kaicenat.png");
    expect(posterFileName("Amélie #42")).toBe("creatordeck-amelie-42.png");
    expect(posterFileName("   ")).toBe("creatordeck-joueur.png");
    expect(posterFileName("x".repeat(80)).length).toBeLessThanOrEqual("creatordeck-".length + 40 + ".png".length);
  });

  it("garde le format 4:5 promis aux réseaux", () => {
    expect(POSTER_WIDTH / POSTER_HEIGHT).toBeCloseTo(0.8);
  });
});
