import { expect, test, gotoDeck } from "./fixtures";
import creators from "../src/data/creators.json";
import manualPortraits from "../src/data/manual-portrait-overrides.json";
import curatedPortraits from "../src/data/portrait-overrides.json";
const displayedPortraits = ["rubius", "shroud", "gotaga", "mastu", "maghla", "livibee", "9pasha"];

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
  }, creators.filter((creator) => displayedPortraits.includes(creator.slug)));
  await page.reload();
  await page.getByRole("button", { name: "Binder", exact: true }).click();
  for (const slug of displayedPortraits) {
    const manual = manualPortraits[slug as keyof typeof manualPortraits];
    const image = manual ?? curatedPortraits[slug as keyof typeof curatedPortraits].image;
    const portrait = page.locator(`img[src="${image}"]`).first();
    await expect(portrait).toBeVisible();
    await expect.poll(() => portrait.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth)).toBe(manual ? 450 : 900);
  }
  await expect(page.locator(".creator-card")).not.toContainText(["Moritz Barcelona", "Nate Herrera"]);
  await expect(page.locator("#image-credits")).toHaveCount(0);
  await testInfo.attach("portraits-dans-les-cartes", { body: await page.screenshot(), contentType: "image/png" });
  await page.getByRole("button", { name: "Toi", exact: true }).click();
  const settings = page.getByRole("region", { name: "Réglages" });
  const toggle = settings.getByRole("button", { name: "Crédits des images" });
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(settings.locator("#image-credits")).toContainText("Moritz Barcelona");
  await expect(settings.locator("#image-credits")).toContainText("Nate Herrera n8bit_");
  for (const slug of ["livibee", "9pasha"] as const) {
    await expect(settings.locator("#image-credits")).toContainText(curatedPortraits[slug].author);
    await expect(settings.locator(`#image-credits a[href="${curatedPortraits[slug].source}"]`)).toHaveCount(1);
  }
  await expect(settings.getByRole("link", { name: "CC BY-SA 4.0", exact: true }).first()).toHaveAttribute("href", "https://creativecommons.org/licenses/by-sa/4.0/");
  await toggle.click();
  await expect(settings.locator("#image-credits")).toHaveCount(0);
});
