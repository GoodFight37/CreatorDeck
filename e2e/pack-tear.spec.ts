import { expect, test } from "@playwright/test";

/** Genuine 3D foil, responsive tear gesture, no fake CD card or loading screen. */
test("3D booster waits for the player and never shows a flat placeholder", async ({ page }) => {
  await page.goto("/");
  const button = page.getByRole("button", { name: "Ouvrir le booster" });
  await expect(button).toBeVisible({ timeout: 30_000 });
  await button.click();
  const dialog = page.getByRole("dialog", { name: "Ouvrir le booster" });
  await expect(dialog).toBeVisible({ timeout: 30_000 });
  const panel = await dialog.boundingBox();
  expect(panel).not.toBeNull();
  expect(Math.abs(panel?.y ?? Infinity)).toBeLessThanOrEqual(1);
  expect(panel?.height).toBeGreaterThan(500);
  await expect(page.locator(".opening-loader")).toHaveCount(0);
  await expect(dialog.locator("canvas.booster-pack-canvas")).toBeVisible();
  await expect(dialog.locator("canvas.booster-pack-fallback")).toBeVisible();
  // A mounted canvas is not enough: a previous GPU issue left the whole pack invisible.
  // Verify real opaque pixels are painted before accepting the scene.
  await expect.poll(async () => page.evaluate(() => {
    const gpu = document.querySelector<HTMLCanvasElement>(".booster-pack-canvas");
    if (gpu?.dataset.rendered === "true") return true;
    const fallback = document.querySelector<HTMLCanvasElement>(".booster-pack-fallback");
    if (!fallback || !fallback.width || !fallback.height) return false;
    const ctx = fallback.getContext("2d");
    if (!ctx) return false;
    return ctx.getImageData(Math.floor(fallback.width / 2),
      Math.floor(fallback.height / 2), 1, 1).data[3] > 20;
  })).toBe(true);
  await expect(dialog.locator(".booster-premium-caption")).toContainText("LIVE DROP");
  await expect(dialog.locator(".booster-card-extract")).toHaveCount(0);
  await expect(dialog.locator(".booster-cards-inside")).toHaveCount(0);
  const slider = dialog.getByRole("slider", { name: "Déchirer le haut du booster" });
  await expect(slider).toBeVisible();

  await page.screenshot({
    path: "test-results/booster-" + test.info().project.name + "-sealed.png",
    fullPage: false,
  });
  await page.waitForTimeout(2600);
  await expect(dialog).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Résultat du booster" })).not.toBeVisible();
  await slider.focus();
  await page.keyboard.press("ArrowRight");
  await expect(dialog.locator(".booster-foil-open")).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Résultat du booster" }))
    .toBeVisible({ timeout: 15_000 });
  await expect(page.locator(".booster-interactive")).toHaveCount(0);
});

test("pointer swipe physically tears the 3D cap then reveals cards", async ({ page }) => {
  await page.goto("/");
  const button = page.getByRole("button", { name: "Ouvrir le booster" });
  await expect(button).toBeVisible({ timeout: 30_000 });
  await button.click();
  const track = page.getByRole("slider", { name: "Déchirer le haut du booster" });
  await expect(track).toBeVisible();
  const bounds = await track.boundingBox();
  expect(bounds).not.toBeNull();
  if (!bounds) return;

  const startX = bounds.x + 22;
  const y = bounds.y + bounds.height / 2;
  await page.mouse.move(startX, y);
  await page.mouse.down();
  await page.mouse.move(startX + 80, y, { steps: 6 });
  await expect(page.locator(".booster-tear-trace")).toBeVisible();
  await expect(track).toHaveAttribute("aria-valuenow", /^[1-9][0-9]*$/);
  await page.screenshot({
    path: "test-results/booster-" + test.info().project.name + "-swiping.png",
    fullPage: false,
  });
  await page.mouse.move(startX + 165, y, { steps: 6 });
  await page.mouse.up();
  const opened = page.locator(".booster-foil-open");
  await expect(opened).toBeVisible();
  await expect(opened.locator("canvas.booster-pack-canvas")).toBeVisible();
  await expect(opened.locator(".booster-card-extract")).toHaveCount(0);
  const glow = await opened.locator(".booster-foil-glow").evaluate(element => {
    const style = window.getComputedStyle(element);
    return { image: style.backgroundImage, color: style.backgroundColor };
  });
  expect(glow.image).toContain("radial-gradient");
  expect(glow.color).toBe("rgba(0, 0, 0, 0)");
  await page.waitForTimeout(300);
  await page.screenshot({
    path: "test-results/booster-" + test.info().project.name + "-opening.png",
    fullPage: false,
  });
  await expect(page.getByRole("dialog", { name: "Résultat du booster" }))
    .toBeVisible({ timeout: 15_000 });
  await expect(page.locator(".booster-interactive")).toHaveCount(0);
});
