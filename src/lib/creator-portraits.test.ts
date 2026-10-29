import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { CREATORS, creatorImage } from "@/lib/catalog";
import { creatorPortraitUrl, MANUAL_PORTRAIT_OVERRIDES, PORTRAIT_OVERRIDES, PROVIDED_PORTRAIT_OVERRIDES, UPSCALED_PORTRAIT_OVERRIDES } from "@/lib/creator-portraits";

describe("portraits sélectionnés", () => {
  it("garde les avatars et le secours existants pour les autres créateurs", () => {
    expect(creatorPortraitUrl("squeezie")).toBe(MANUAL_PORTRAIT_OVERRIDES.squeezie);
    expect(creatorPortraitUrl("diverron")).toBe(PROVIDED_PORTRAIT_OVERRIDES.diverron);
    expect(creatorPortraitUrl("constructor")).toBe("/creators/constructor.webp");
    expect(CREATORS.filter((creator) => !MANUAL_PORTRAIT_OVERRIDES[creator.slug]
      && !UPSCALED_PORTRAIT_OVERRIDES[creator.slug]
      && !PORTRAIT_OVERRIDES[creator.slug]
      && !PROVIDED_PORTRAIT_OVERRIDES[creator.slug]
      && creator.slug !== "diverron")).toEqual([]);
  });

  // 29/10/2026 : dix choix manuels n'étaient que la photo créditée réduite à 450 px ; la version 900 px reprend la main.
  it("charge les 444 portraits manuels et les 699 versions Upscayl utilisables", async () => {
    expect(Object.keys(MANUAL_PORTRAIT_OVERRIDES)).toHaveLength(444);
    expect(Object.keys(UPSCALED_PORTRAIT_OVERRIDES)).toHaveLength(699);
    for (const [slug, imagePath] of Object.entries(MANUAL_PORTRAIT_OVERRIDES)) {
      expect(CREATORS.some((creator) => creator.slug === slug)).toBe(true);
      expect(creatorPortraitUrl(slug)).toBe(imagePath);
      expect(creatorImage({ slug })).toBe(imagePath);
      expect(imagePath).toMatch(/^\/creators\/manual\/[a-z0-9-]+\.webp$/);
      const image = sharp(`public${imagePath}`);
      const info = await image.metadata();
      expect(info).toMatchObject({ format: "webp", width: 450, height: 450 });
      await expect(image.raw().toBuffer()).resolves.toBeInstanceOf(Buffer);
    }
    for (const [slug, imagePath] of Object.entries(UPSCALED_PORTRAIT_OVERRIDES)) {
      expect(CREATORS.some((creator) => creator.slug === slug)).toBe(true);
      const expectedPath = creatorPortraitUrl(slug);
      expect(expectedPath).toBe(
        MANUAL_PORTRAIT_OVERRIDES[slug]
          ?? PORTRAIT_OVERRIDES[slug]?.image
          ?? PROVIDED_PORTRAIT_OVERRIDES[slug]
          ?? `/creators/${slug}.webp`,
      );
      expect(creatorPortraitUrl(slug)).toBe(expectedPath);
      expect(creatorImage({ slug })).toBe(expectedPath);
      expect(imagePath).toMatch(/^\/creators\/upscaled\/[a-z0-9-]+\.webp$/);
      // Archives hors de public/ : elles ne partent plus dans out/.
      const image = sharp(imagePath.replace("/creators/upscaled/", "archive/upscaled/"));
      const info = await image.metadata();
      expect(info).toMatchObject({ format: "webp", width: 720, height: 720 });
      await expect(image.raw().toBuffer()).resolves.toBeInstanceOf(Buffer);
    }
  }, 90_000);

  it("utilise le portrait fourni et restauré pour Diverron", async () => {
    expect(Object.keys(PROVIDED_PORTRAIT_OVERRIDES)).toEqual(["diverron"]);
    const imagePath = PROVIDED_PORTRAIT_OVERRIDES.diverron;
    expect(creatorPortraitUrl("diverron")).toBe(imagePath);
    expect(creatorImage({ slug: "diverron" })).toBe(imagePath);
    const image = sharp(`public${imagePath}`);
    expect(await image.metadata()).toMatchObject({ format: "webp", width: 900, height: 900 });
    await expect(image.raw().toBuffer()).resolves.toBeInstanceOf(Buffer);
  });

  for (const [slug, portrait] of Object.entries(PORTRAIT_OVERRIDES)) {
    it(`${slug} : image décodable en 900 px, utilisée par les cartes et attribuée`, async () => {
      expect(CREATORS.some((creator) => creator.slug === slug)).toBe(true);
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
