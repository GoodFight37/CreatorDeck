import { expect, test, gotoDeck } from "./fixtures";

test("Drop garde le sachet et le CTA complets avant la navigation sur mobile", async ({ page }) => {
  await gotoDeck(page);
  for (const viewport of [{ width: 360, height: 740 }, { width: 320, height: 568 }]) {
    await page.setViewportSize(viewport); await page.evaluate(() => window.scrollTo(0, 0));
    const nav = (await page.getByRole("navigation", { name: "Navigation principale" }).boundingBox())!;
    for (const selector of [".pack-artwork", ".open-panel .primary-action"]) {
      const rect = (await page.locator(selector).boundingBox())!;
      expect(rect.y).toBeGreaterThanOrEqual(0); expect(rect.y + rect.height).toBeLessThanOrEqual(nav.y);
    }
    const cta = (await page.locator(".primary-action").boundingBox())!;
    const pity = (await page.locator(".pity-row.now").boundingBox())!;
    expect(cta.y + cta.height).toBeLessThanOrEqual(pity.y);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
    await page.screenshot({ path: `test-results/drop-priorites-${viewport.width}-${test.info().project.name}.png` });
  }
});

test("Craft démarre sur les recettes à portée et le recyclage reste utile à vide", async ({ page }) => {
  await gotoDeck(page);
  await page.evaluate(() => {
    const key = Object.keys(localStorage).find(value => /^creatordeck.save.v\d+$/.test(value))!;
    const state = JSON.parse(localStorage.getItem(key)!); state.points = 90; state.cards = [];
    localStorage.setItem(key, JSON.stringify(state));
  });
  await page.reload(); await page.getByRole("button", { name: "Craft", exact: true }).click();
  await expect(page.locator(".atelier-scope button").first()).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".atelier-rules-details")).not.toHaveAttribute("open");
  await expect(page.locator(".craft-locked")).toHaveCount(0);
  await expect(page.locator(".atelier-row .craft-button:disabled")).toHaveCount(0);
  await page.screenshot({ path: `test-results/craft-priorites-${test.info().project.name}.png` });
  await page.getByRole("button", { name: /^Recycler/ }).click();
  await expect(page.getByText("Aucun doublon pour l'instant")).toBeVisible();
  await page.getByRole("button", { name: "Retour au Drop", exact: true }).click();
  await expect(page.locator(".home-view")).toBeVisible();
});
