import { expect, test, gotoDeck } from "./fixtures";
import creators from "../src/data/creators.json";
import manualPortraits from "../src/data/manual-portrait-overrides.json";
import curatedPortraits from "../src/data/portrait-overrides.json";
import upscaledPortraits from "../src/data/upscaled-portrait-overrides.json";
const displayedPortraits = ["rubius", "shroud", "gotaga", "mastu", "maghla", "livibee", "9pasha", "2lew"];

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
  // Le Binder s’ouvre sur sa collection à compléter ; cette vue regroupe les
  // cartes obtenues de toutes les familles avant de vérifier les portraits.
  await page.getByRole("button", { name: "Dernières reçues" }).click();
  for (const slug of displayedPortraits) {
    const manual = manualPortraits[slug as keyof typeof manualPortraits];
    const curated = curatedPortraits[slug as keyof typeof curatedPortraits];
    const creator = creators.find((entry) => entry.slug === slug)!;
    const portrait = page.getByRole("img", { name: `Portrait de ${creator.displayName}`, exact: true });
    await expect(portrait).toBeVisible();
    await expect.poll(() => portrait.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth))
      .toBe(manual ? 450 : curated ? 900 : 600);
  }
  await expect(page.locator(".creator-card")).not.toContainText(["Moritz Barcelona", "Nate Herrera"]);
  await expect(page.locator("#image-credits")).toHaveCount(0);
  await testInfo.attach("portraits-dans-les-cartes", { body: await page.screenshot(), contentType: "image/png" });
  await page.getByRole("button", { name: "Toi", exact: true }).click();
  await page.locator(".profile-settings-fold > summary").click();
  const settings = page.getByRole("region", { name: "Réglages" });
  const toggle = settings.getByRole("button", { name: "Crédits des images" });
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(settings.locator("#image-credits")).not.toContainText("Moritz Barcelona");
  await expect(settings.locator("#image-credits")).not.toContainText("Nate Herrera n8bit_");
  await expect(settings.locator("#image-credits")).toContainText("Kevin Chang");
  await expect(settings.locator("#image-credits")).toContainText("Versions Upscayl archivées (699)");
  await expect(settings.locator("#image-credits")).toContainText("ne sont plus affichées sur les cartes");
  expect(upscaledPortraits["2lew"]).toBe("/creators/upscaled/2lew.webp");
  await expect(settings.locator("#image-credits")).toContainText(curatedPortraits.livibee.author);
  await expect(settings.locator(`#image-credits a[href="${curatedPortraits.livibee.source}"]`)).toHaveCount(1);
  await expect(settings.locator("#image-credits")).not.toContainText(curatedPortraits["9pasha"].author);
  await expect(settings.locator(`#image-credits a[href="${curatedPortraits["9pasha"].source}"]`)).toHaveCount(0);
  await expect(settings.getByRole("link", { name: "CC BY-SA 3.0", exact: true })).toHaveAttribute("href", "https://creativecommons.org/licenses/by-sa/3.0/");
  await toggle.click();
  await expect(settings.locator("#image-credits")).toHaveCount(0);
});
