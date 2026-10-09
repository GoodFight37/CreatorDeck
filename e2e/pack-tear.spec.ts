import { expect, test } from "@playwright/test";

/**
 * The player must actually tear the booster before cards appear.
 * Run on desktop and mobile, including the touch-sized 412px viewport.
 */
test("opening is controlled by the player, not an automatic timer", async ({ page }) => {
  await page.goto("/");
  const open = page.getByRole("button", { name: "Ouvrir le booster" });
  await expect(open).toBeVisible({ timeout: 30_000 });
  await open.click();

  const tearing = page.getByRole("dialog", { name: "Ouvrir le booster" });
  await expect(tearing).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("slider", { name: "Déchirer le haut du booster" })).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Résultat du booster" })).not.toBeVisible();

  // No auto-complete: even after the old 2.4s animation duration.
  await page.waitForTimeout(2600);
  await expect(tearing).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Résultat du booster" })).not.toBeVisible();

  // Accessible keyboard interaction also opens the pack.
  await page.getByRole("slider", { name: "Déchirer le haut du booster" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("dialog", { name: "Résultat du booster" })).toBeVisible({ timeout: 15_000 });
});

test("a horizontal pointer swipe tears the booster", async ({ page }) => {
  await page.goto("/");
  const open = page.getByRole("button", { name: "Ouvrir le booster" });
  await expect(open).toBeVisible({ timeout: 30_000 });
  await open.click();

  const track = page.getByRole("slider", { name: "Déchirer le haut du booster" });
  await expect(track).toBeVisible({ timeout: 30_000 });
  const bounds = await track.boundingBox();
  expect(bounds).not.toBeNull();
  if (!bounds) return;

  const startX = bounds.x + 24;
  const middleY = bounds.y + bounds.height / 2;
  await page.mouse.move(startX, middleY);
  await page.mouse.down();
  await page.mouse.move(startX + 165, middleY, { steps: 12 });
  await page.mouse.up();

  await expect(page.getByRole("dialog", { name: "Résultat du booster" })).toBeVisible({ timeout: 15_000 });
});
