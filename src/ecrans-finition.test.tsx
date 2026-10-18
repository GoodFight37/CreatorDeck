import { afterEach, expect, it } from "vitest";
import { creerBanc } from "@/ecrans-banc";
import { CreatorCard } from "@/components/creator-card";
import { CREATOR_BY_SLUG } from "@/lib/catalog";

const banc = creerBanc();
afterEach(() => banc.nettoyer());
it("conserve le portrait entier et une matière unique à rareté égale", async () => {
  banc.preparer();
  const creator = CREATOR_BY_SLUG.get("ibai")!;
  await banc.monter(<><CreatorCard creator={creator} /><CreatorCard creator={creator} variant="gold" /></>);
  for (const image of document.querySelectorAll<HTMLImageElement>(".card-photo")) {
    expect(image.style.objectFit).toBe("contain");
  }
  const foils = [...document.querySelectorAll<HTMLElement>(".card-foil")];
  expect(foils[0].style.background).not.toBe("");
  expect(foils[0].style.background).toBe(foils[1].style.background);
  expect(foils[0].style.opacity).toBe(foils[1].style.opacity);
});
