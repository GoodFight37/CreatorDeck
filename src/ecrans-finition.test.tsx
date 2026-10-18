import { readFileSync } from "node:fs";
import { afterEach, expect, it } from "vitest";
import { creerBanc } from "@/ecrans-banc";
import { CreatorCard } from "@/components/creator-card";
import { CREATOR_BY_SLUG } from "@/lib/catalog";

const banc = creerBanc();
afterEach(() => banc.nettoyer());
it("remplit la carte avec le portrait, nom en affiche, matière laissée au CSS des variantes", async () => {
  banc.preparer();
  const creator = CREATOR_BY_SLUG.get("ibai")!;
  await banc.monter(<><CreatorCard creator={creator} /><CreatorCard creator={creator} variant="gold" /></>);
  for (const image of document.querySelectorAll<HTMLImageElement>(".card-photo")) {
    // Aucun style en ligne : la règle CSS (cover) s'applique.
    expect(image.style.objectFit).toBe("");
  }
  for (const foil of document.querySelectorAll<HTMLElement>(".card-foil")) expect(foil.getAttribute("style")).toBeNull();
  expect(document.querySelector<HTMLElement>(".creator-card")!.style.getPropertyValue("--name-len")).toBe("4");
  const css = readFileSync("src/app/globals.css", "utf8");
  expect(css).toMatch(/\.creator-card \.card-photo \{ object-fit: cover;/);
  expect(css).not.toMatch(/\.card-photo[^{]*\{[^}]*object-fit: contain/);
  expect(css).toMatch(/\.creator-card\.variant-gold \.card-foil \{[^}]*background/);
  expect(css).toMatch(/\.creator-card\.rarity-legendary \{\s*box-shadow:[^}]*rgb\(255 189 69/);
});
