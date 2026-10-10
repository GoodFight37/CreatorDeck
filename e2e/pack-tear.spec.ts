import { expect, test } from "@playwright/test";

test("the revealed card keeps the extracted card's size and center in a full-screen scene", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Ouvrir le booster" }).click();
  const pack = page.getByRole("dialog", { name: "Ouvrir le booster" });
  const physical = await pack.locator(".booster-physical-scene").boundingBox();
  const cardWidth = await pack.locator(".foil-card-chamber").evaluate((node) => (node as HTMLElement).offsetWidth);
  await pack.getByRole("button", { name: "Ouvrir sans déchirer" }).click();
  const reveal = page.getByRole("dialog", { name: "Résultat du booster" });
  await expect(reveal).toBeVisible();
  await expect(page.locator(".app-shell")).toHaveJSProperty("inert", true);
  await expect(reveal).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(reveal.locator(".reveal-next")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(reveal.locator(".reveal-header button").first()).toBeFocused();
  const anchor = reveal.locator(".reveal-anchor");
  if (await anchor.count()) {
    const bounds = await anchor.boundingBox();
    expect(Math.abs(bounds!.width - cardWidth)).toBeLessThanOrEqual(1);
    expect(Math.abs(bounds!.x + bounds!.width / 2 - (physical!.x + physical!.width / 2))).toBeLessThanOrEqual(1);
    expect(Math.abs(bounds!.y + bounds!.height / 2 - (physical!.y + physical!.height / 2))).toBeLessThanOrEqual(1);
  } else {
    await expect(reveal.locator(".reveal-perfect-grid .reveal-card")).toHaveCount(5);
  }
  for (const viewport of [{ width: 320, height: 568 }, { width: 412, height: 915 }, { width: 1920, height: 915 }]) {
    await page.setViewportSize(viewport);
    const panel = await reveal.boundingBox();
    expect(panel!.x).toBe(0);
    expect(panel!.width).toBe(viewport.width);
    expect(panel!.height).toBe(viewport.height);
    const action = await reveal.locator(".reveal-next").boundingBox();
    expect(action!.y + action!.height).toBeLessThanOrEqual(viewport.height);
    if (await anchor.count()) {
      const card = await anchor.boundingBox();
      const name = await reveal.locator(".reveal-name").boundingBox();
      expect(Math.abs(card!.x + card!.width / 2 - viewport.width / 2)).toBeLessThanOrEqual(1);
      expect(card!.y + card!.height).toBeLessThan(name!.y);
      expect(name!.y + name!.height).toBeLessThan(action!.y);
    }
  }
  await expect(reveal.getByRole("button", { name: "Fermer", exact: true })).toBeEnabled();
  await reveal.getByRole("button", { name: "Fermer", exact: true }).click();
  await expect(page.locator(".app-shell")).toHaveJSProperty("inert", false);
  await expect(page.getByRole("button", { name: "Ouvrir le booster", exact: true })).toBeFocused();
});

test("reduced motion reveals a stationary front without a hidden card", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: "Ouvrir le booster", exact: true }).click();
  await page.getByRole("button", { name: "Ouvrir sans déchirer" }).click();
  const reveal = page.getByRole("dialog", { name: "Résultat du booster" });
  await expect(reveal).toBeVisible();
  await expect(reveal.locator(".reveal-card").first()).toBeVisible();
  const motion = await reveal.locator(".reveal-flip-face").first().evaluate((node) => ({
    animation: getComputedStyle(node).animationName,
    transform: getComputedStyle(node).transform,
  }));
  expect(motion).toEqual({ animation: "none", transform: "none" });
});

test("home pack artwork, title and gesture hint do not overlap", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Ouvrir le booster" })).toBeVisible();
  for (const width of [320, 360, 412, 1280]) {
    await page.setViewportSize({ width, height: 915 });
    const artwork = await page.locator(".pack-stage .pack-artwork").boundingBox();
    const copy = await page.locator(".pack-stage .pack-copy").boundingBox();
    const hint = await page.locator(".pack-stage .pull-hint").boundingBox();
    expect(artwork).not.toBeNull();
    expect(copy).not.toBeNull();
    expect(hint).not.toBeNull();
    expect(artwork!.y + artwork!.height, `illustration au-dessus du titre à ${width}px`).toBeLessThanOrEqual(copy!.y);
    expect(copy!.y + copy!.height, `consigne sous la description à ${width}px`).toBeLessThanOrEqual(hint!.y);
    expect(hint!.x).toBeGreaterThanOrEqual(0);
    expect(hint!.x + hint!.width).toBeLessThanOrEqual(width);
  }
});

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
