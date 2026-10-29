import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { STORY_SAVE_KEY } from "../src/lib/story-mode";

// Exclure ces tests de la suite Chromium habituelle : WebKit a sa propre CI.
test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== "Safari iPhone simulé", "Suite réservée au projet WebKit.");
});

test("Histoire Safari : cartes, jauges et mise en page sur iPhone", async ({ page }) => {
  await page.goto("/histoire");
  const card = page.locator(".story-play-card");
  await expect(page.getByRole("heading", { name: "Le grand départ" })).toBeVisible();
  await expect(card.locator(".story-portrait-illustration")).toBeVisible();
  await expect(page.locator(".story-gauge-glyph")).toHaveCount(4);
  await expect(page.locator(".story-run-clock")).toContainText("ÉP. 01");
  await expect(page.locator(".story-mission summary")).toContainText("Premier direct");
  await expect(page.locator(".story-stat-orb")).toHaveCount(4);
  const screen = page.viewportSize();
  expect(screen).not.toBeNull();
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(width).toBeLessThanOrEqual((screen?.width ?? 390) + 1);
  await mkdir("test-results/histoire-webkit", { recursive: true });
  await page.screenshot({ path: "test-results/histoire-webkit/safari-scene-01.png", fullPage: true, animations: "disabled" });
});

test("Histoire Safari : le swipe et la sauvegarde fonctionnent", async ({ page }) => {
  await page.goto("/histoire");
  const card = page.locator(".story-play-card");
  await card.scrollIntoViewIfNeeded();
  const rect = await card.boundingBox();
  expect(rect).not.toBeNull();
  if (!rect) return;
  const x = rect.x + rect.width / 2;
  const y = rect.y + rect.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - 90, y, { steps: 6 });
  await expect(page.locator(".story-deck .story-direction-left")).toHaveAttribute("data-ready", "true");
  await page.mouse.up();
  await expect(page.getByRole("heading", { name: "Une personne dans le chat" })).toBeVisible();
  await expect.poll(() => page.evaluate((key) => JSON.parse(localStorage.getItem(key) || "{}").step ?? -1, STORY_SAVE_KEY)).toBe(1);
  await page.reload();
  await expect(page.locator(".story-progress")).toContainText("2 / 40");
  await expect(page.locator(".story-recap-live li")).toHaveCount(1);
});

test("Histoire Safari : choix accessible au doigt, animations réduites", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/histoire");
  await page.locator(".story-actions .story-choice").first().tap();
  await expect(page.getByRole("heading", { name: "Une personne dans le chat" })).toBeVisible();
  await expect(page.locator(".story-play-card")).toHaveAttribute("data-character", "flo");
  await expect(page.locator(".story-scene-art")).toHaveCSS("animation-name", "none");
  await page.locator(".story-recap-live summary").tap();
  await expect(page.locator(".story-recap-live li")).toHaveCount(1);
});

test("Histoire Safari : HUD lisible en 320 px et swipe annulé", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/histoire");
  for (const icon of await page.locator(".story-game-hud .story-stat-top").all()) {
    expect(await icon.evaluate((element) => element.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
  }
  const card = page.locator(".story-play-card");
  await card.scrollIntoViewIfNeeded();
  const rect = await card.boundingBox();
  expect(rect).not.toBeNull();
  if (!rect) return;
  const x = rect.x + rect.width / 2;
  const y = rect.y + rect.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - 35, y, { steps: 5 });
  await expect(page.locator(".story-deck .story-direction-left")).toHaveAttribute("data-active", "true");
  await page.mouse.up();
  await expect(page.locator(".story-progress")).toContainText("1 / 40");
  await expect(page.locator(".story-deck .story-direction-left")).toHaveAttribute("data-active", "false");
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
});

test("Histoire Safari : décors des médias et confirmation tactile", async ({ page }) => {
  await page.goto("/histoire");
  await expect(page.locator(".story-set-pieces[data-channel='LIVE'] svg")).toBeVisible();
  const card = page.locator(".story-play-card");
  await card.scrollIntoViewIfNeeded();
  const rect = await card.boundingBox();
  expect(rect).not.toBeNull();
  if (!rect) return;
  const x = rect.x + rect.width / 2, y = rect.y + rect.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - 90, y, { steps: 6 });
  await expect(card).toHaveAttribute("data-ready", "left");
  await page.mouse.up();
  await expect(page.locator(".story-progress")).toContainText("2 / 40");
  await expect(page.locator(".story-set-pieces[data-channel='CHAT'] svg")).toBeVisible();
});
