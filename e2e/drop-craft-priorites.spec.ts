import { expect, test, gotoDeck } from "./fixtures";

test("Drop garde le sachet accessible, sans débordement, en viewport mobile compact", async ({ page }) => {
  await gotoDeck(page);
  for (const viewport of [{ width: 360, height: 740 }, { width: 320, height: 568 }]) {
    await page.setViewportSize(viewport); await page.evaluate(() => window.scrollTo(0, 0));
    const pack = page.locator(".pack-stage .pack-artwork");
    const packRect = (await pack.boundingBox())!;
    expect(packRect.y).toBeGreaterThanOrEqual(0);
    expect(packRect.height).toBeGreaterThanOrEqual(Math.min(viewport.width * (viewport.height <= 620 ? .52 : .58), 230, viewport.height * (viewport.height <= 620 ? .31 : .35)) * 1.4);
    await expect(page.locator(".pack-stage .pack-copy")).toBeVisible();
    const stage = (await page.locator(".pack-stage").boundingBox())!;
    const ticket = (await page.locator(".open-panel").boundingBox())!;
    expect(ticket.y - (stage.y + stage.height)).toBeGreaterThanOrEqual(4);
    await expect(page.getByRole("button", { name: /Essayer|Ouvrir le booster/ })).toBeVisible();
    await expect(page.locator(".drop-secondary-details")).not.toHaveAttribute("open", "");
    const cta = (await page.locator(".primary-action").boundingBox())!;
    if (viewport.height <= 568) {
      const nav = (await page.getByRole("navigation", { name: "Navigation principale" }).boundingBox())!;
      expect(cta.y + cta.height).toBeLessThanOrEqual(nav.y);
    }
    const secondary = page.locator(".drop-secondary-details > summary");
    const pity = page.locator(".pity-row.now");
    const nextInfo = (await secondary.isVisible() ? await secondary.boundingBox() : await pity.boundingBox())!;
    expect(cta.y + cta.height).toBeLessThanOrEqual(nextInfo.y);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
    await page.screenshot({ path: `test-results/drop-priorites-${viewport.width}-${test.info().project.name}.png` });
  }
});

test("Drop conserve le grand sachet et ses labels à 390 × 844", async ({ page }) => {
  await gotoDeck(page);
  await page.setViewportSize({ width: 390, height: 844 });
  const pack = page.locator(".pack-stage .pack-artwork");
  const box = (await pack.boundingBox())!;
  expect(box.width).toBeGreaterThanOrEqual(Math.min(390 * .58, 220, 844 * .34) - 1);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(844);
  await expect(page.locator(".pack-stage .pack-copy")).toContainText("· 5");
  await expect(page.locator(".pack-stage .pull-hint")).toHaveCount(0);
  await expect(page.locator(".open-panel .primary-action")).toHaveCSS("min-height", "64px");
  expect(await page.locator(".pack-stage").evaluate((node) => getComputedStyle(node).overflow)).toBe("visible");
  expect(await pack.evaluate((node) => getComputedStyle(node).overflow)).toBe("visible");
  expect(await pack.evaluate((node) => getComputedStyle(node).filter)).toBe("none");
  const side = page.locator(".pack-stage .pack-3d-side-left");
  await expect(side).toBeVisible();
  expect(await side.evaluate((node) => getComputedStyle(node).width)).toBe("9px");
  expect(await side.evaluate((node) => getComputedStyle(node).backgroundImage)).toContain("linear-gradient");
  const sheenStyle = await page.locator(".pack-stage .pack-specular").evaluate((node) => getComputedStyle(node));
  expect(sheenStyle.animationIterationCount).toBe("infinite");
  expect(sheenStyle.animationDuration).toBe("4s");
  const stage = (await page.locator(".pack-stage").boundingBox())!;
  const ticket = (await page.locator(".open-panel").boundingBox())!;
  expect(ticket.y - (stage.y + stage.height)).toBeGreaterThanOrEqual(4);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await expect(page.locator(".open-panel > .primary-action")).toBeVisible();
  await page.screenshot({ path: `test-results/drop-390x844-${test.info().project.name}.png` });
  await expect(page.locator(".pack-idle")).toHaveCSS("animation-name", "drop-pack-idle");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".pack-idle")).toHaveCSS("animation-name", "none");
  expect(await page.locator(".pack-stage .pack-specular").evaluate((node) => getComputedStyle(node).animationName)).toBe("none");

  await page.locator(".open-panel").evaluate((panel) => {
    panel.dataset.tutorial = "true";
    panel.querySelector<HTMLDetailsElement>(".drop-secondary-details")!.open = false;
  });
  await expect(page.locator(".drop-secondary-details > summary")).toBeVisible();
  await expect(page.locator(".pity-row.now")).toBeHidden();
  await page.locator(".drop-secondary-details > summary").click();
  await expect(page.locator(".pity-row.now")).toBeVisible();
});

test("l'ombre suit le sachet et la pression ne relance pas son arrivée", async ({ page }) => {
  await gotoDeck(page);
  for (const height of [844, 680, 568]) {
    await page.setViewportSize({ width: 390, height });
    const geometry = await page.locator(".pack-stage.stage-live").evaluate((stage) => {
      const pack = stage.querySelector<HTMLElement>(".pack-artwork")!;
      const shadow = stage.querySelector<HTMLElement>(".pack-shadow")!;
      return { paddingTop: parseFloat(getComputedStyle(stage).paddingTop), top: parseFloat(getComputedStyle(shadow).top), packSize: parseFloat(getComputedStyle(pack).width) };
    });
    expect(Math.abs(geometry.top - (geometry.paddingTop + geometry.packSize * 1.4667 - 6))).toBeLessThan(2);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  const pack = page.locator(".pack-stage .pack-artwork");
  await expect(pack).toHaveCSS("animation-name", "drop-pack-arrive");
  await page.waitForTimeout(420);
  const box = (await pack.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x - 20, box.y + box.height / 2);
  await page.mouse.up();
  await expect(pack).toHaveCSS("animation-name", "drop-pack-arrive");
  expect(Number(await pack.evaluate((node) => getComputedStyle(node).opacity))).toBeGreaterThan(.95);
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
