import { E2E_CIRCLE, expect, test, gotoDeck } from "./fixtures";
import { CIRCLE_STORAGE_KEY } from "../src/lib/circle-store";

test("la préparation enregistre les chaînes et les conserve sans nouveau formulaire", async ({ page }, testInfo) => {
  await gotoDeck(page);
  await expect(page.locator(".home-view.is-lean")).toBeVisible();
  await expect.poll(() => page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).slugs, CIRCLE_STORAGE_KEY)).toEqual([...E2E_CIRCLE]);

  await gotoDeck(page, false);
  await expect(page.locator(".home-view.is-lean")).toBeVisible();
  await expect.poll(() => page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).slugs, CIRCLE_STORAGE_KEY)).toEqual([...E2E_CIRCLE]);
  await page.screenshot({ path: testInfo.outputPath("avec-chaines.png") });
});

test("la préparation sans cercle garde le même accueil, sans rangée", async ({ page }, testInfo) => {
  await gotoDeck(page, true, { withoutCircle: true });
  await expect(page.locator(".home-view")).toBeVisible();
  await expect(page.locator(".booster-pack-slot")).toHaveCount(1);
  await expect(page.locator(".circle-strip")).toHaveCount(0);
  expect(await page.evaluate((key) => localStorage.getItem(key), CIRCLE_STORAGE_KEY)).toBeNull();
  await expect(page.getByRole("button", { name: "Définir mes chaînes", exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("sans-chaines.png") });
});
