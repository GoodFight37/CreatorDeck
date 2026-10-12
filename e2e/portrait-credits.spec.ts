import { expect, test, gotoDeck } from "./fixtures";
import creators from "../src/data/creators.json";
import manualPortraits from "../src/data/manual-portrait-overrides.json";

test("les portraits sélectionnés se chargent et leurs crédits restent dans les réglages", async ({ page }, testInfo) => {
  await gotoDeck(page);
  await page.evaluate((entries) => {
    const key = Object.keys(localStorage).find((entry) => /^creatordeck.save.v\d+$/.test(entry))!;
    const state = JSON.parse(localStorage.getItem(key)!);
    state.cards = entries.map((creator, index) => ({
      id: `portrait-${index}`, creatorSlug: creator.slug, rarity: creator.rarity,
      variant: "standard", obtainedAt: Date.now(), rareDrop: false,
    }));
    state.updatedAt = Date.now();
    localStorage.setItem(key, JSON.stringify(state));
  }, creators.filter((creator) => ["rubius", "shroud"].includes(creator.slug)));
  await page.reload();
  await page.getByRole("button", { name: "Toi", exact: true }).click();
  for (const slug of ["rubius", "shroud"]) {
    const portrait = page.locator(`img[src="${manualPortraits[slug as keyof typeof manualPortraits]}"]`).first();
    await expect(portrait).toBeVisible();
    await expect.poll(() => portrait.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth)).toBe(450);
  }
  await expect(page.locator(".creator-card")).not.toContainText(["Moritz Barcelona", "Nate Herrera"]);
  await expect(page.locator("#image-credits")).toHaveCount(0);
  await testInfo.attach("portraits-dans-les-cartes", { body: await page.screenshot(), contentType: "image/png" });
  const settings = page.getByRole("region", { name: "Réglages" });
  const toggle = settings.getByRole("button", { name: "Crédits des images" });
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(settings.locator("#image-credits")).toContainText("Moritz Barcelona");
  await expect(settings.locator("#image-credits")).toContainText("Nate Herrera n8bit_");
  await expect(settings.getByRole("link", { name: "CC BY-SA 4.0", exact: true }).first()).toHaveAttribute("href", "https://creativecommons.org/licenses/by-sa/4.0/");
  await toggle.click();
  await expect(settings.locator("#image-credits")).toHaveCount(0);
});
