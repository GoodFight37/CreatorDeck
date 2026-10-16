import { expect, test } from "@playwright/test";

test("l'univers Mèmes présente un booster et un classeur séparés sur téléphone", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/memes");
  await expect(page.getByRole("heading", { name: "MÈMES", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "OUVRIR UN BOOSTER" })).toBeDisabled();
  await expect(page.getByText("0 / 2151")).toBeVisible();
  await expect(page.locator(".meme-grid .meme-slot")).toHaveCount(12);
  await page.screenshot({ path: `test-results/memes-${test.info().project.name}.png` });
  await page.locator(".meme-grid .meme-slot").first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Fermer" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByPlaceholder("Nom ou numéro").fill("Risitas");
  await expect(page.locator(".meme-grid .meme-slot")).toHaveCount(1);
  await page.getByText("Composition du booster").click();
  await expect(page.getByText(/Rare 82 %/)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
