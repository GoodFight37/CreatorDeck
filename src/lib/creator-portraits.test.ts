import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { CREATORS, creatorImage } from "@/lib/catalog";
import { creatorPortraitUrl, PORTRAIT_OVERRIDES } from "@/lib/creator-portraits";

describe("portraits sélectionnés", () => {
  it("garde les avatars et le secours existants pour les autres créateurs", () => {
    expect(creatorPortraitUrl("squeezie")).toBe("/creators/squeezie.webp");
    expect(creatorPortraitUrl("diverron")).toBe("/creators/diverron-fallback.svg");
    expect(creatorPortraitUrl("constructor")).toBe("/creators/constructor.webp");
  });

  for (const [slug, portrait] of Object.entries(PORTRAIT_OVERRIDES)) {
    it(`${slug} : image décodable en 900 px, utilisée par les cartes et attribuée`, async () => {
      expect(CREATORS.some((creator) => creator.slug === slug)).toBe(true);
      expect(creatorImage({ slug })).toBe(portrait.image);
      expect(portrait.image).toMatch(/^\/creators\/curated\/[a-z0-9-]+\.webp$/);
      const image = sharp(`public${portrait.image}`);
      const info = await image.metadata();
      expect(info).toMatchObject({ format: "webp", width: 900, height: 900 });
      await expect(image.raw().toBuffer()).resolves.toBeInstanceOf(Buffer);
      expect(portrait.author).not.toBe("");
      expect(portrait.title).not.toBe("");
      expect(portrait.changes).toContain("Recadrage");
      expect(new URL(portrait.source).protocol).toBe("https:");
      expect(new URL(portrait.licenseUrl).hostname).toBe("creativecommons.org");
    });
  }
});
