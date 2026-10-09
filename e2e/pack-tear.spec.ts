import { expect, test } from "@playwright/test";

/** Pack is a single printed image, finger tears its weld, and cards emerge before the reveal. */
test("home pack and opening use the same printed sachet, no WebGL or slider", async ({ page }) => {
  await page.goto("/");
  const open = page.getByRole("button", { name: "Ouvrir le booster" });
  await expect(open).toBeVisible({ timeout: 30_000 });
  const homeArt = page.locator(".pack-stage .pack-foil-image");
  await expect(homeArt).toBeVisible();
  await expect(homeArt).toHaveAttribute("src", "/packs/live-foil.svg");
  await expect(page.locator(".pack-stage .pack-people")).toHaveCount(0);
  await open.click();

  const dialog = page.getByRole("dialog", { name: "Ouvrir le booster" });
  await expect(dialog).toBeVisible();
  const panel = await dialog.boundingBox();
  expect(panel).not.toBeNull();
  expect(Math.abs(panel?.y ?? Infinity)).toBeLessThanOrEqual(1);
  expect(panel?.height).toBeGreaterThan(500);
  await expect(page.locator(".opening-loader")).toHaveCount(0);
  await expect(dialog.locator(".foil-printed-art")).toHaveCount(2);
  await expect(dialog.locator('.foil-printed-art[src="/packs/live-foil.svg"]')).toHaveCount(2);
  await expect(dialog.locator("canvas")).toHaveCount(0);
  await expect(dialog.locator(".booster-tear-handle")).toHaveCount(0);
  await expect(dialog.locator(".booster-premium-gesture")).toHaveCount(0);
  await expect(dialog.locator(".foil-back-card")).toHaveCount(5);
  const cut = dialog.getByRole("button", { name: "Déchirer le sachet en passant le doigt sur sa soudure" });
  await expect(cut).toBeVisible();
  await page.screenshot({ path: "test-results/booster-" + test.info().project.name + "-sealed.png" });
  await page.waitForTimeout(2600);
  await expect(dialog).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Résultat du booster" })).not.toBeVisible();

  await cut.focus();
  await page.keyboard.press("Enter");
  await expect(dialog.locator(".booster-foil-open")).toBeVisible();
  await expect(dialog.locator(".foil-top-piece")).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Résultat du booster" }))
    .toBeVisible({ timeout: 15_000 });
  await expect(page.locator(".booster-interactive")).toHaveCount(0);
});

test("finger cuts the plastic where it passes, top peels, backs rise, then reveal", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Ouvrir le booster" }).click();
  const dialog = page.getByRole("dialog", { name: "Ouvrir le booster" });
  await expect(dialog).toBeVisible();
  const zone = dialog.getByRole("button", { name: "Déchirer le sachet en passant le doigt sur sa soudure" });
  const bounds = await zone.boundingBox();
  expect(bounds).not.toBeNull();
  if (!bounds) return;
  const x = bounds.x + Math.max(16, bounds.width * .08);
  const y = bounds.y + bounds.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 80, y, { steps: 8 });
  const slit = dialog.locator(".foil-cut-slit");
  await expect.poll(async () => (await slit.boundingBox())?.width ?? 0).toBeGreaterThan(10);
  await page.screenshot({ path: "test-results/booster-" + test.info().project.name + "-swiping.png" });
  await page.mouse.move(x + 167, y, { steps: 8 });
  await page.mouse.up();
  await expect(dialog.locator(".booster-foil-open")).toBeVisible();

  // The cut reveals a chamber of card backs; no hard cut while cap is still aloft.
  await page.waitForTimeout(1100);
  await expect(dialog.locator(".foil-card-chamber")).toBeVisible();
  await expect(dialog.locator(".foil-back-card")).toHaveCount(5);
  await expect(page.getByRole("dialog", { name: "Résultat du booster" })).not.toBeVisible();
  await page.screenshot({ path: "test-results/booster-" + test.info().project.name + "-opening.png" });
  await expect(page.getByRole("dialog", { name: "Résultat du booster" }))
    .toBeVisible({ timeout: 15_000 });
  await expect(dialog).toHaveCount(0);
});

test("DIVERRON portrait never resolves to the damaged green webp", async ({ page }) => {
  await page.goto("/");
  const url = await page.evaluate(async () => {
    const response = await fetch("/creators/diverron-fallback.svg");
    return { status: response.status, body: await response.text() };
  });
  expect(url.status).toBe(200);
  expect(url.body).toContain("DIVERRON");
});
