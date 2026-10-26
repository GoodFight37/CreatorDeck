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
  const recap = page.locator(".story-recap");
  await expect(recap).not.toHaveAttribute("open", "");
  await recap.locator("summary").click();
  await expect(recap).toHaveAttribute("open", "");
  await expect(recap.locator("li").first()).toContainText("Le grand départ");
  await expect(recap.locator("li").first()).toContainText("Rester avec le téléphone");
  const decisions = await recap.locator("li").count();
  expect(decisions).toBeGreaterThan(0);
  expect(decisions).toBeLessThanOrEqual(12);
  await page.reload();
  await expect(page.locator(".story-recap")).toBeVisible();
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

test.describe("Histoire : interactions sur écran tactile", () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });

  test("le choix tapé ne colore ni ne préselectionne celui du chapitre suivant", async ({ page }) => {
    await page.goto("/histoire");
    await expect(page.getByRole("heading", { name: "Le grand départ" })).toBeVisible();
    const left = page.locator(".story-actions .story-choice").first();
    const right = page.locator(".story-actions .story-choice").last();
    const restingBackground = await right.evaluate((element) => getComputedStyle(element).backgroundColor);

    await left.tap();
    await expect(page.getByRole("heading", { name: "Une personne dans le chat" })).toBeVisible();
    await expect(left).toHaveCSS("background-color", restingBackground);
    expect(await left.evaluate((element) => document.activeElement === element)).toBe(false);
    await expect(page.locator(".story-progress")).toContainText("2 / 12");
  });
});

test("Histoire : le clavier conserve le focus sans présélection forcée", async ({ page }) => {
  await page.goto("/histoire");
  await expect(page.getByRole("heading", { name: "Le grand départ" })).toBeVisible();
  const left = page.locator(".story-actions .story-choice").first();
  await left.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Une personne dans le chat" })).toBeVisible();
  await expect(page.locator(".story-play-card")).toBeFocused();
});

test("Histoire : les jauges privilégient la lecture aux émojis", async ({ page }) => {
  await page.goto("/histoire");
  await expect(page.getByRole("heading", { name: "Le grand départ" })).toBeVisible();
  await expect(page.locator(".story-stat-top > span")).toHaveText(["Public", "Énergie", "Argent", "Confiance"]);
  for (const name of ["Public", "Énergie", "Argent", "Confiance"]) {
    await expect(page.getByRole("progressbar", { name })).toHaveAttribute("aria-valuemin", "0");
  }
});

test("Histoire : la barre de progression représente le chapitre en cours", async ({ page }) => {
  await page.goto("/histoire");
  await expect(page.getByRole("heading", { name: "Le grand départ" })).toBeVisible();
  const bar = page.locator(".story-progress-track span");
  expect(await bar.evaluate((el) => parseFloat((el as HTMLElement).style.width))).toBeCloseTo(100 / 12, 4);
  await page.locator(".story-actions .story-choice").first().click();
  await expect(page.locator(".story-progress")).toContainText("2 / 12");
  expect(await bar.evaluate((el) => parseFloat((el as HTMLElement).style.width))).toBeCloseTo(200 / 12, 4);
});

test("Histoire : le support narratif suit la scène et n'affiche LIVE que pour un direct", async ({ page }) => {
  await page.goto("/histoire");
  const monitor = page.locator(".story-scene-art");
  await expect(monitor).toHaveAttribute("data-channel", "LIVE");
  await expect(monitor.locator(".story-scene-art-channel")).toHaveText("LIVE");
  await page.locator(".story-actions .story-choice").first().click();
  await expect(page.getByRole("heading", { name: "Une personne dans le chat" })).toBeVisible();
  await expect(monitor).toHaveAttribute("data-channel", "CHAT");
  await expect(monitor.locator(".story-scene-art-channel")).toHaveText("CHAT");
});

test.describe("Histoire : mouvement réduit", () => {
  test.use({ reducedMotion: "reduce" });
  test("la transition du moniteur est supprimée sans cacher la scène", async ({ page }) => {
    await page.goto("/histoire");
    await expect(page.getByRole("heading", { name: "Le grand départ" })).toBeVisible();
    const monitor = page.locator(".story-scene-art");
    await expect(monitor).toBeVisible();
    await expect(monitor).toHaveCSS("animation-name", "none");
    await page.locator(".story-actions .story-choice").first().click();
    await expect(page.getByRole("heading", { name: "Une personne dans le chat" })).toBeVisible();
    await expect(monitor).toBeVisible();
  });
});

// Certains appareils hybrides exposent à la fois une souris et un écran tactile.
// Un tap ne doit pas laisser l'état :hover du choix précédent sur la nouvelle scène.
test.describe("Histoire : écran hybride tactile et souris", () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });

  test("un tap désactive le survol collant, puis la souris récupère son survol", async ({ page }) => {
    await page.goto("/histoire");
    await expect(page.getByRole("heading", { name: "Le grand départ" })).toBeVisible();
    const left = page.locator(".story-actions .story-choice").first();
    const right = page.locator(".story-actions .story-choice").last();
    const restingBackground = await right.evaluate((el) => getComputedStyle(el).backgroundColor);

    await left.tap();
    await expect(page.getByRole("heading", { name: "Une personne dans le chat" })).toBeVisible();
    await expect(left).toHaveAttribute("data-touch-activated", "true");
    await expect(left).not.toBeFocused();
    await expect(left).toHaveCSS("background-color", restingBackground);

    await left.scrollIntoViewIfNeeded();
    const box = await left.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;
    await page.mouse.move(0, 0);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await expect(left).not.toHaveAttribute("data-touch-activated", "true");
  });
});

test("Histoire : le prochain dilemme remonte dans la zone visible sur téléphone", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/histoire");
  await expect(page.getByRole("heading", { name: "Le grand départ" })).toBeVisible();
  const buttons = page.locator(".story-actions .story-choice");
  await buttons.first().scrollIntoViewIfNeeded();
  await buttons.first().click();
  await expect(page.getByRole("heading", { name: "Une personne dans le chat" })).toBeVisible();
  await expect.poll(async () => page.locator(".story-progress").evaluate((el) => el.getBoundingClientRect().top)).toBeGreaterThanOrEqual(0);
  const position = await page.locator(".story-progress").evaluate((el) => el.getBoundingClientRect().top);
  expect(position).toBeLessThan(70);
  const heading = await page.getByRole("heading", { name: "Une personne dans le chat" }).boundingBox();
  expect(heading).not.toBeNull();
  if (heading) expect(heading.y).toBeLessThan(568);
});

test("Histoire : après Entrée le focus suit la scène et les flèches restent utilisables", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/histoire");
  await expect(page.getByRole("heading", { name: "Le grand départ" })).toBeVisible();
  await page.locator(".story-actions .story-choice").first().focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Une personne dans le chat" })).toBeVisible();
  await expect(page.locator(".story-play-card")).toBeFocused();
  await page.waitForTimeout(470);
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator(".story-progress")).toContainText("3 / 12");
  await expect(page.locator(".story-play-card")).toBeFocused();
});


// Le geste à la Reigns doit permettre de lire le choix AVANT le seuil de validation.
// Revenir au centre sans franchir 64 px ne doit pas consommer une décision.
test("Histoire : aperçu au glissement, annulation et validation au seuil", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/histoire");
  const card = page.locator(".story-play-card");
  await expect(page.getByRole("heading", { name: "Le grand départ" })).toBeVisible();
  await card.scrollIntoViewIfNeeded();
  const bounds = await card.boundingBox();
  expect(bounds).not.toBeNull();
  if (!bounds) return;
  const x = bounds.x + bounds.width / 2;
  const y = bounds.y + bounds.height / 2;
  const preview = card.locator(".story-direction-left");
  await expect(preview).toHaveAttribute("aria-hidden", "true");

  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - 38, y, { steps: 5 });
  await expect(preview).toHaveAttribute("data-active", "true");
  await expect(preview).toHaveAttribute("data-ready", "false");
  await expect(preview).toHaveCSS("opacity", "1");
  await page.mouse.up();
  await expect(preview).toHaveAttribute("data-active", "false");
  await expect(page.getByRole("heading", { name: "Le grand départ" })).toBeVisible();
  await expect(page.locator(".story-progress")).toContainText("1 / 12");

  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - 95, y, { steps: 6 });
  await expect(preview).toHaveAttribute("data-ready", "true");
  await page.mouse.up();
  await expect(page.getByRole("heading", { name: "Une personne dans le chat" })).toBeVisible();
  await expect(page.locator(".story-progress")).toContainText("2 / 12");
});
