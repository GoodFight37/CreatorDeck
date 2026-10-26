import { expect, test } from "@playwright/test";

test("Histoire : les choix persistent après un rechargement", async ({ page }) => {
  await page.goto("/histoire");
  await expect(page.getByRole("heading", { name: "Le grand départ" })).toBeVisible();
  await page.getByRole("button", { name: /Rester avec le téléphone/ }).click();
  await expect(page.getByRole("heading", { name: "Une personne dans le chat" })).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "Argent +9" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Une personne dans le chat" })).toBeVisible();
  await expect(page.getByRole("progressbar", { name: "Argent" })).toHaveAttribute("aria-valuenow", "64");
});

test("Histoire : clavier et boutons sans glissement obligatoire", async ({ page }) => {
  await page.goto("/histoire");
  await expect(page.getByRole("heading", { name: "Le grand départ" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Acheter le micro/ })).toBeVisible();
  await page.locator(".story-play-card").focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("heading", { name: "Une personne dans le chat" })).toBeVisible();
  await expect(page.getByRole("progressbar", { name: "Argent" })).toHaveAttribute("aria-valuenow", "38");
});

test("Histoire : le geste vertical ne décide rien, l'horizontal choisit", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/histoire");
  const card = page.locator(".story-play-card");
  await expect(card).toBeVisible();
  await card.scrollIntoViewIfNeeded();
  const box = await card.boundingBox();
  expect(box).not.toBeNull();
  if (!box) return;
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 8, y + 80, { steps: 5 });
  await page.mouse.up();
  await expect(page.getByRole("heading", { name: "Le grand départ" })).toBeVisible();

  await card.scrollIntoViewIfNeeded();
  const next = await card.boundingBox();
  expect(next).not.toBeNull();
  if (!next) return;
  const cx = next.x + next.width / 2, cy = next.y + next.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx - 100, cy, { steps: 5 });
  await page.mouse.up();
  await expect(page.getByRole("heading", { name: "Une personne dans le chat" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
});

test("Histoire : la fin offre une nouvelle partie", async ({ page }) => {
  await page.goto("/histoire");
  await expect(page.locator(".story-play-card")).toBeVisible();
  for (let i = 0; i < 12; i++) {
    if (await page.getByRole("button", { name: /Recommencer l’histoire/ }).isVisible()) break;
    await page.locator(".story-actions .story-choice").first().click();
  }
  await expect(page.getByRole("button", { name: /Recommencer l’histoire/ })).toBeVisible();
  await page.getByRole("button", { name: /Recommencer l’histoire/ }).click();
  await expect(page.getByRole("heading", { name: "Le grand départ" })).toBeVisible();
});
