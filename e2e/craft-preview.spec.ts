import { expect, test, gotoDeck } from "./fixtures";
import creatorData from "../src/data/creators.json";

test("Craft prépare une carte sans dépenser avant dix doublons", async ({ page }) => {
  await gotoDeck(page);
  const creator = creatorData.find((entry) => entry.rarity === "common")!;
  await page.evaluate((entry) => {
    const key = Object.keys(localStorage).find((value) => /^creatordeck.save.v\d+$/.test(value))!;
    const state = JSON.parse(localStorage.getItem(key)!);
    state.cards = Array.from({ length: 10 }, (_, index) => ({ id: `copy-${index}`, creatorSlug: entry.slug,
      rarity: entry.rarity, variant: "standard", obtainedAt: Date.now() + index, rareDrop: false }));
    state.updatedAt = Date.now();
    localStorage.setItem(key, JSON.stringify(state));
  }, creator);
  await page.reload();
  const readCards = () => page.evaluate(() => {
    const key = Object.keys(localStorage).find((value) => /^creatordeck.save.v\d+$/.test(value))!;
    return JSON.parse(localStorage.getItem(key)!).cards;
  });
  const before = await readCards();
  await page.getByRole("button", { name: "Craft", exact: true }).click();
  await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "9");
  await expect(page.locator(".atelier-preview-wallet")).toContainText("+108 points");
  await expect(page.locator(".atelier-preview-card")).toHaveCount(3);
  await expect(page.locator(".atelier-row")).toHaveCount(0);
  await expect(page.locator(".atelier-preview-card button, .atelier-preview-card [role=button]")).toHaveCount(0);
  for (const viewport of [{ width: 320, height: 568 }, { width: 412, height: 915 }]) {
    await page.setViewportSize(viewport);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
    await expect(page.locator(".atelier-preview-grid")).toBeVisible();
  }
  await page.locator(".atelier-preview").screenshot({ path: `test-results/craft-preview-${test.info().project.name}.png` });
  expect(await readCards()).toEqual(before);
  await page.getByRole("button", { name: "Choisir ma collection dans le Binder" }).click();
  await expect(page.getByRole("heading", { name: "Mon classeur" })).toBeVisible();
  await page.locator(".binder-collections-picker summary").click();
  const choice = page.locator(".binder-collection-choices button").nth(4);
  const goalName = await choice.locator("strong").innerText();
  await choice.click();
  await page.getByRole("button", { name: "Craft", exact: true }).click();
  await expect(page.locator(".atelier-preview")).toContainText(goalName);
  expect(await readCards()).toEqual(before);
  await page.getByRole("button", { name: "Retour au Drop", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Un sachet. Cinq créateurs." })).toBeVisible();
});
