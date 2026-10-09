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
  const panel = await tearing.boundingBox();
  expect(panel, "Le booster doit être dans la fenêtre, pas sous la page").not.toBeNull();
  expect(Math.abs(panel?.y ?? Infinity)).toBeLessThanOrEqual(1);
  expect(panel?.height).toBeGreaterThan(500);
  await expect(page.getByRole("slider", { name: "Déchirer le haut du booster" })).toBeVisible();
  // A real foil pouch should keep its branding below the crimped tear strip.
  const brand = page.locator(".booster-foil-live .pack-brand");
  const crimp = page.locator(".booster-foil-strip");
  await expect(brand).toBeVisible();
  const brandBox = await brand.boundingBox();
  const crimpBox = await crimp.boundingBox();
  expect(brandBox).not.toBeNull();
  expect(crimpBox).not.toBeNull();
  expect(brandBox!.y).toBeGreaterThanOrEqual(crimpBox!.y + crimpBox!.height - 4);
  await page.screenshot({ path: `test-results/booster-${test.info().project.name}-sealed.png`, fullPage: false });
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
  await page.mouse.move(startX + 80, middleY, { steps: 6 });
  // The foil is visibly cut while the finger moves, not only at release.
  await expect(page.locator(".booster-tear-trace")).toBeVisible();
  await expect(track).toHaveAttribute("aria-valuenow", /^[1-9][0-9]*$/);
  await page.screenshot({ path: `test-results/booster-${test.info().project.name}-swiping.png`, fullPage: false });
  await page.mouse.move(startX + 165, middleY, { steps: 6 });
  await page.mouse.up();

  const opened = page.locator(".booster-foil-open");
  await expect(opened).toBeVisible();
  // The burst is a transparent radial halo, never a solid white square.
  const glowBackground = await opened.locator(".booster-foil-glow").evaluate(
    (element) => {
      const style = window.getComputedStyle(element);
      return { image: style.backgroundImage, color: style.backgroundColor };
    },
  );
  expect(glowBackground.image).toContain("radial-gradient");
  expect(glowBackground.color).toBe("rgba(0, 0, 0, 0)");
  await page.waitForTimeout(170);
  await page.screenshot({ path: `test-results/booster-${test.info().project.name}-opening.png`, fullPage: false });
  await expect(page.getByRole("dialog", { name: "Résultat du booster" })).toBeVisible({ timeout: 15_000 });
});
