import { readFileSync } from "node:fs";
import { afterEach, expect, it } from "vitest";
import { creerBanc } from "@/ecrans-banc";
import { CreatorCard } from "@/components/creator-card";
import { CREATOR_BY_SLUG } from "@/lib/catalog";

const banc = creerBanc();
afterEach(() => banc.nettoyer());
it("remplit la carte avec le portrait et laisse la matière au CSS des variantes", async () => {
  banc.preparer();
  const creator = CREATOR_BY_SLUG.get("ibai")!;
  await banc.monter(<><CreatorCard creator={creator} /><CreatorCard creator={creator} variant="gold" /></>);
  // Aucun style en ligne : c'est la règle `.card-photo` (cover) qui s'applique.
  const images = [...document.querySelectorAll<HTMLImageElement>(".card-photo")];
  expect(images).toHaveLength(2);
  for (const image of images) {
    expect(image.style.objectFit).toBe("");
    expect(image.closest(".card-photo-wrap")).not.toBeNull();
  }
  const css = readFileSync("src/app/globals.css", "utf8");
  const photo = /\.card-photo \{([^}]*)\}/.exec(css)?.[1] ?? "";
  expect(photo).toContain("object-fit: cover");
  expect(photo).toContain("width: 100%");
  expect(photo).toContain("height: 100%");
  expect(/\.card-photo-wrap \{([^}]*)\}/.exec(css)?.[1]).toContain("inset: 0");
  // Le foil n'écrase plus Holo, Gold et Live.
  for (const foil of document.querySelectorAll<HTMLElement>(".card-foil")) expect(foil.getAttribute("style")).toBeNull();
  expect(document.querySelectorAll(".creator-card.variant-gold .card-foil")).toHaveLength(1);
  expect(css).toMatch(/\.creator-card\.variant-gold \.card-foil \{[^}]*background/);
});
