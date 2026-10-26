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

test("Histoire : un double-tap ne saute pas la scène suivante", async ({ page }) => {
  await page.goto("/histoire");
  await expect(page.getByRole("heading", { name: "Le grand départ" })).toBeVisible();
  // Le bouton garde sa position entre les scènes : un double-tap sans garde
  // choisissait à tort deux fois, et sautait directement au chapitre 3.
  await page.locator(".story-actions .story-choice").first().dblclick();
  await expect(page.getByRole("heading", { name: "Une personne dans le chat" })).toBeVisible();
  await expect(page.locator(".story-progress")).toContainText("2 / 12");
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
    // La garde anti-double-tap protège le joueur pendant 450 ms entre deux scènes.
    // Ce test joue volontairement douze décisions distinctes, pas un multi-clic.
    await page.waitForTimeout(470);
  }
  await expect(page.getByRole("button", { name: /Recommencer l’histoire/ })).toBeVisible();
  await page.getByRole("button", { name: /Recommencer l’histoire/ }).click();
  await expect(page.getByRole("heading", { name: "Le grand départ" })).toBeVisible();
});

test("Histoire : la carte change d'identité quand le personnage change", async ({ page }) => {
  await page.goto("/histoire");
  const card = page.locator(".story-play-card");
  await expect(card).toHaveAttribute("data-character", "toi");
  await expect(card.locator(".story-scene-art")).toBeVisible();
  await expect(card.locator(".story-scene-art-label")).toHaveText("TOI");
  await page.locator(".story-actions .story-choice").first().click();
  await expect(card).toHaveAttribute("data-character", "flo");
  await expect(card.locator(".story-scene-art-label")).toHaveText("FLO");
});

test("Histoire : design utilisable sur écran étroit, sans débordement ni petites cibles", async ({ page }) => {
  for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/histoire");
    await expect(page.getByRole("heading", { name: "Le grand départ" })).toBeVisible();
    const result = await page.evaluate(() => {
      const controls = [...document.querySelectorAll<HTMLElement>(".story-choice")];
      const artwork = document.querySelector<HTMLElement>(".story-scene-art");
      return {
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
        targets: controls.map((el) => ({ width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height })),
        art: artwork?.getBoundingClientRect().width ?? 0,
      };
    });
    expect(result.overflow).toBe(false);
    expect(result.art).toBeGreaterThan(40);
    for (const target of result.targets) {
      expect(target.width).toBeGreaterThanOrEqual(44);
      expect(target.height).toBeGreaterThanOrEqual(44);
    }
  }
});

// Ce parcours croise Nox et Mona ; la carte ne doit masquer aucun des deux.
test("Histoire : double crise et jauge critique lisibles sans code couleur", async ({ page }) => {
  await page.goto("/histoire");
  const path = ["left", "left", "right", "right", "left", "right", "right", "left", "left"] as const;
  for (const [index, direction] of path.entries()) {
    await page.locator(".story-actions .story-choice").nth(direction === "left" ? 0 : 1).click();
    if (index === 6) {
      const confiance = page.locator(".story-stat").filter({ has: page.getByRole("progressbar", { name: "Confiance" }) });
      await expect(confiance.getByText("NIVEAU CRITIQUE")).toBeVisible();
      await expect(page.getByRole("progressbar", { name: "Confiance" })).toHaveAttribute("aria-valuetext", "11 sur 100, niveau critique");
    }
    await page.waitForTimeout(470);
  }
  const card = page.locator(".story-play-card");
  await expect(card).toHaveAttribute("data-character", "duo");
  await expect(card.locator(".story-scene-art-label")).toHaveText("NOX + MONA");
  await expect(page.getByRole("heading", { name: "Deux affaires, une caméra" })).toBeVisible();
});

test("Histoire : le titre et les choix se réorganisent en très petit viewport", async ({ page }) => {
  await page.setViewportSize({ width: 240, height: 640 });
  await page.goto("/histoire");
  await expect(page.getByRole("heading", { name: "Zéro spectateur" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Rester avec le téléphone/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
  const buttons = page.locator(".story-choice");
  const first = await buttons.first().boundingBox();
  const second = await buttons.last().boundingBox();
  expect(first).not.toBeNull();
  expect(second).not.toBeNull();
  if (first && second) expect(second.y).toBeGreaterThan(first.y + first.height - 1);
});
