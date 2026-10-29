import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { STORY_PROLOGUE } from "../src/data/story-prologue";
import { STORY_SAVE_KEY, chooseStory, startStory } from "../src/lib/story-mode";

test("Histoire : HUD au pouce et inspection refermée au chapitre suivant", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/histoire");
  const icons = page.locator(".story-game-hud .story-stat-top");
  await expect(icons).toHaveCount(4);
  for (const icon of await icons.all()) {
    expect(await icon.evaluate((element) => element.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
  }
  const publicGauge = page.getByRole("button", { name: /Public : 35 sur 100/ });
  await publicGauge.click();
  await expect(page.locator(".story-stat").first()).toHaveAttribute("data-inspected", "true");
  await page.locator(".story-mission summary").click();
  await expect(page.locator(".story-mission-panel")).toBeVisible();
  await page.locator(".story-actions .story-choice").first().click();
  await expect(page.locator(".story-stat").first()).toHaveAttribute("data-inspected", "false");
  await expect(page.locator(".story-mission-panel")).not.toBeVisible();
  await expect(page.locator(".story-progress")).toContainText("2 / 40");
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
});

test("Histoire : le portrait change d'expression avec le canal", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/histoire");
  await expect(page.locator(".story-portrait")).toHaveAttribute("data-mood", "on-air");
  await page.locator(".story-actions .story-choice").first().click();
  await expect(page.locator(".story-portrait")).toHaveAttribute("data-mood", "calm");
  await expect(page.locator(".story-play-card")).toHaveAttribute("data-mood", "calm");
});

test("Histoire : retours sous forme de jetons sans consigne répétée", async ({ page }) => {
  await page.goto("/histoire");
  await expect(page.locator(".story-swipe-hint")).toBeVisible();
  await expect(page.locator(".story-footnote")).toHaveCount(0);
  await page.locator(".story-actions .story-choice").first().click();
  await expect(page.locator(".story-impact-value")).toHaveCount(3);
  await expect(page.locator(".story-impact-value .story-gauge-glyph")).toHaveCount(3);
  await expect(page.locator(".story-impact")).toContainText("Argent +9");
  await expect(page.locator(".story-swipe-hint")).toHaveCount(0);
});

test("Histoire : révélation progressive des options pendant un swipe partiel", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/histoire");
  const card = page.locator(".story-play-card");
  const box = await card.boundingBox();
  expect(box).not.toBeNull();
  if (!box) return;
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  const left = page.locator(".story-deck .story-direction-left");
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - 22, y, { steps: 3 });
  const partial = Number(await left.evaluate(node => getComputedStyle(node).opacity));
  expect(partial).toBeGreaterThan(0);
  expect(partial).toBeLessThan(1);
  await page.mouse.move(x - 39, y, { steps: 2 });
  await expect(left).toHaveCSS("opacity", "1");
  await page.mouse.move(x, y, { steps: 4 });
  await page.mouse.up();
  await expect(left).toHaveCSS("opacity", "0");
  await expect(page.locator(".story-progress")).toContainText("1 / 40");
});

test("Histoire : le portrait occupe l'espace disponible sur un téléphone haut", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/histoire");
  const card = page.locator(".story-play-card");
  const art = card.locator(".story-scene-art");
  const full = await card.boundingBox();
  const illustration = await art.boundingBox();
  expect(full).not.toBeNull();
  expect(illustration).not.toBeNull();
  if (full && illustration) {
    expect(illustration.height).toBeGreaterThanOrEqual(250);
    expect(full.height).toBeLessThan(530);
    expect(illustration.height / full.height).toBeGreaterThan(0.48);
  }
});

test("Histoire : paquet souple et reflet proportionnel au mouvement", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/histoire");
  await expect(page.locator(".story-card-monogram")).toHaveText("CD");
  const card = page.locator(".story-play-card");
  const box = await card.boundingBox();
  expect(box).not.toBeNull();
  if (!box) return;
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - 44, y, { steps: 4 });
  const light = await page.locator(".story-deck").evaluate((el) =>
    Number((el as HTMLElement).style.getPropertyValue("--story-drag-light")));
  expect(light).toBeGreaterThan(0.02);
  await expect(page.locator(".story-touch-sheen")).toBeVisible();
  await page.mouse.up();
  await expect(page.locator(".story-progress")).toContainText("1 / 40");
});

test("Histoire : les points de prévisualisation restent neutres et disparaissent après le geste", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/histoire");
  const card = page.locator(".story-play-card");
  const bounds = await card.boundingBox();
  expect(bounds).not.toBeNull();
  if (!bounds) return;
  const x = bounds.x + bounds.width / 2, y = bounds.y + bounds.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 40, y, { steps: 4 });
  await expect(page.locator(".story-stat[data-affected='true']")).toHaveCount(3);
  await expect(page.locator(".story-stat[data-affected='true'] .story-stat-orb")).toHaveCount(3);
  await expect(page.locator(".story-meter-preview")).toHaveCount(0);
  await page.mouse.up();
  await expect(page.locator(".story-stat[data-affected='true']")).toHaveCount(0);
  await expect(page.locator(".story-progress")).toContainText("1 / 40");
});
test("Histoire : objectif, épisode et noms des jauges découvrables au toucher", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/histoire");
  await expect(page.locator(".story-game-hud")).toBeVisible();
  await expect(page.locator(".story-run-clock")).toContainText("ÉP. 01");
  await expect(page.locator(".story-mission summary")).toContainText("Premier direct");
  await page.locator(".story-mission summary").click();
  await expect(page.locator(".story-mission-panel")).toContainText("Tenir jusqu'à l'acte II");
  await expect(page.getByRole("progressbar", { name: "Premier direct" })).toHaveAttribute("aria-valuenow", "0");
  await page.locator(".story-mission summary").click();
  const gauge = page.getByRole("button", { name: /Public : 35 sur 100/ });
  await gauge.click();
  await expect(page.locator(".story-stat").first()).toHaveAttribute("data-inspected", "true");
  await gauge.click();
  await expect(page.locator(".story-stat").first()).toHaveAttribute("data-inspected", "false");
  await expect(page.locator(".story-back-card-seal")).toHaveText("CDHISTOIRE");
  await expect(page.locator(".story-back-card-edition")).toContainText("S01");
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
});

test("Histoire : la mission passe d'un acte à l'autre sans modifier la sauvegarde", async ({ page }) => {
  await page.goto("/histoire");
  let run = startStory(STORY_PROLOGUE);
  for (let i = 0; i < 12; i++) run = chooseStory(STORY_PROLOGUE, run, "left");
  expect(run.ending).toBeNull();
  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
    key: STORY_SAVE_KEY, value: JSON.stringify(run),
  });
  await page.reload();
  await expect(page.locator(".story-run-clock")).toContainText("ÉP. 13");
  await expect(page.locator(".story-mission summary")).toContainText("Parole tenue");
  await expect(page.locator(".story-mission-outcome")).toContainText("Objectif premier direct : réussi");
  await expect(page.locator(".story-progress")).toContainText("13 / 40");
});
test("Histoire : emblèmes originaux, supports de diffusion et profondeur du paquet", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/histoire");
  await expect(page.locator(".story-gauge-glyph")).toHaveCount(4);
  await expect(page.locator(".story-gauge-glyph").first().locator("path")).not.toHaveCount(0);
  await expect(page.locator(".story-stat-name")).toHaveText(["Public", "Énergie", "Argent", "Confiance"]);
  await expect(page.locator(".story-channel-glyph")).toBeVisible();
  await expect(page.locator(".story-deck-back")).toHaveCount(2);
  const card = page.locator(".story-play-card");
  const deck = page.locator(".story-deck");
  const box = await card.boundingBox();
  expect(box).not.toBeNull();
  if (!box) return;
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - 82, y, { steps: 4 });
  await expect(deck).toHaveAttribute("data-pulling", "true");
  await page.mouse.up();
  await expect(page.locator(".story-progress")).toContainText("2 / 40");
  await expect(page.locator(".story-page")).toHaveAttribute("data-channel", "CHAT");
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
});

test("Histoire : les actes sont des interludes et les fins des affiches de direct", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/histoire");
  let run = startStory(STORY_PROLOGUE);
  for (let index = 0; index < 12; index++) run = chooseStory(STORY_PROLOGUE, run, "left");
  expect(run.ending).toBeNull();
  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), { key: STORY_SAVE_KEY, value: JSON.stringify(run) });
  await page.reload();
  const act = page.locator(".story-act-interlude");
  await expect(act).toContainText("ACTE II");
  await expect(act.locator(".story-act-roman")).toHaveText("II");
  await expect(page.locator(".story-play-card .story-act-interlude")).toHaveCount(0);

  let ending = startStory(STORY_PROLOGUE);
  for (const d of "RLRRRLRRR") ending = chooseStory(STORY_PROLOGUE, ending, d === "L" ? "left" : "right");
  expect(ending.ending).toBe("scandale");
  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), { key: STORY_SAVE_KEY, value: JSON.stringify(ending) });
  await page.reload();
  await expect(page.locator(".story-ending")).toHaveAttribute("data-ending", "scandale");
  await expect(page.locator(".story-ending-cover")).toContainText("DIRECT TERMINÉ");
  await expect(page.locator(".story-ending-cover .story-ending-artwork")).toBeVisible();
  await expect(page.locator(".story-replay")).toBeVisible();
});

test("Histoire : carte mobile dominante, portrait et options révélées au doigt", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/histoire");
  const card = page.locator(".story-play-card");
  const art = card.locator(".story-portrait-illustration");
  await expect(art).toBeVisible();
  const portraitBounds = await art.boundingBox();
  const monitorBounds = await card.locator(".story-scene-art").boundingBox();
  expect(portraitBounds).not.toBeNull();
  expect(monitorBounds).not.toBeNull();
  if (portraitBounds && monitorBounds) {
    // Les yeux et l'expression doivent être visibles dans le cadre, pas coupés.
    expect(portraitBounds.width).toBeLessThan(monitorBounds.width * 0.86);
    const eyes = await card.locator('.story-portrait-illustration path[d^="M93 99"]').boundingBox();
    expect(eyes).not.toBeNull();
    if (eyes) {
      expect(eyes.y).toBeGreaterThan(monitorBounds.y + 8);
      expect(eyes.y + eyes.height).toBeLessThan(monitorBounds.y + monitorBounds.height - 22);
    }
  }
  const screenshotsDir = "test-results/mobile-observation-histoire";
  await mkdir(screenshotsDir, { recursive: true });
  const suffix = testInfo.project.name === "téléphone" ? "telephone" : "bureau";
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  await page.screenshot({ path: `${screenshotsDir}/scene-01-${suffix}.png`, fullPage: true, animations: "disabled" });
  await expect(card).toHaveAttribute("data-character", "toi");
  const statsColumns = await page.locator(".story-stats").evaluate(
    (element) => getComputedStyle(element).gridTemplateColumns.split(" ").filter(Boolean).length,
  );
  expect(statsColumns).toBe(4);
  const bounds = await card.boundingBox();
  expect(bounds).not.toBeNull();
  if (!bounds) return;
  expect(bounds.height).toBeGreaterThanOrEqual(310);
  const x = bounds.x + bounds.width / 2;
  const y = bounds.y + bounds.height / 2;

  // Déplacer et revenir au centre n'est pas une décision.
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - 42, y, { steps: 4 });
  await expect(page.locator(".story-deck .story-direction-left")).toHaveAttribute("data-active", "true");
  await expect(page.locator(".story-deck .story-direction-left")).toContainText("Rester avec le téléphone");
  await page.mouse.move(x, y, { steps: 4 });
  await page.mouse.up();
  await expect(page.locator(".story-progress")).toContainText("1 / 40");

  // Le vrai glissement quitte la scène, change de personnage et garde le portrait.
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 96, y, { steps: 6 });
  await page.mouse.up();
  await expect(page.locator(".story-progress")).toContainText("2 / 40");
  await expect(page.locator(".story-play-card")).toHaveAttribute("data-character", "flo");
  await expect(page.locator(".story-play-card .story-scene-art .story-portrait-illustration").first()).toBeVisible();
  await page.screenshot({ path: `${screenshotsDir}/scene-02-${suffix}.png`, fullPage: true, animations: "disabled" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
});

test("Histoire : galerie visuelle des quatre personnages du premier acte", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "téléphone", "Captures dédiées au projet mobile.");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/histoire");
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  const screens = "test-results/mobile-observation-histoire";
  await mkdir(screens, { recursive: true });
  const characters = ["toi", "flo", "nox", "mona"];
  let run = startStory(STORY_PROLOGUE);
  for (let index = 0; index < characters.length; index++) {
    if (index > 0) run = chooseStory(STORY_PROLOGUE, run, "left");
    expect(run.ending).toBeNull();
    await page.evaluate(({ key, value }) => localStorage.setItem(key, value), { key: STORY_SAVE_KEY, value: JSON.stringify(run) });
    await page.reload();
    await expect(page.locator(".story-play-card")).toHaveAttribute("data-character", characters[index]);
    await expect(page.locator(".story-play-card .story-scene-art .story-portrait-illustration").first()).toBeVisible();
    await page.screenshot({ path: `${screens}/personnage-${characters[index]}.png`, fullPage: true, animations: "disabled" });
  }
});

test("Histoire : galerie des scènes signature et des épilogues mobiles", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "téléphone", "Captures dédiées au projet mobile.");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/histoire");
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  const folder = "test-results/mobile-observation-histoire";
  await mkdir(folder, { recursive: true });

  const show = async (run: ReturnType<typeof startStory>, filename: string) => {
    await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
      key: STORY_SAVE_KEY, value: JSON.stringify(run),
    });
    await page.reload();
    await expect(page.locator(run.ending ? ".story-ending-cover" : ".story-play-card")).toBeVisible();
    await page.screenshot({ path: `${folder}/${filename}.png`, fullPage: true, animations: "disabled" });
  };

  let long = startStory(STORY_PROLOGUE);
  const route = "LRRLLLRLLRRRLRRLRRLLLRRRRLRRLRRRLLLRRRRL";
  for (const [index, letter] of [...route].entries()) {
    long = chooseStory(STORY_PROLOGUE, long, letter === "L" ? "left" : "right");
    if (index === 12) {
      expect(long.ending).toBeNull();
      await show(long, "personnage-plateforme");
    }
    if (index === 16) {
      expect(long.ending).toBeNull();
      await show(long, "personnage-sam");
    }
    if (index === 17) {
      expect(long.ending).toBeNull();
      await show(long, "personnage-lina");
    }
  }
  expect(long.ending).not.toBeNull();
  await show(long, "epilogue-saison-longue");

  let conflict = startStory(STORY_PROLOGUE);
  for (const letter of "LLRRLRRLL") conflict = chooseStory(STORY_PROLOGUE, conflict, letter === "L" ? "left" : "right");
  expect(conflict.ending).toBeNull();
  await show(conflict, "personnage-duo-tension");

  let scandal = startStory(STORY_PROLOGUE);
  for (const letter of "RLRRRLRRR") scandal = chooseStory(STORY_PROLOGUE, scandal, letter === "L" ? "left" : "right");
  expect(scandal.ending).toBe("scandale");
  await show(scandal, "epilogue-scandale");
});

test("Histoire : saison complète de 40 décisions, navigation et reprise mobile", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "téléphone", "Stress test mobile seulement.");
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/histoire");
  const path = "LRRLLLRLLRRRLRRLRRLLLRRRRLRRLRRRLLLRRRRL";
  expect(path.length).toBe(STORY_PROLOGUE.totalSteps);
  let expected = startStory(STORY_PROLOGUE);
  for (const [index, letter] of [...path].entries()) {
    const direction = letter === "L" ? "left" : "right";
    expected = chooseStory(STORY_PROLOGUE, expected, direction);
    await page.locator(".story-actions .story-choice").nth(direction === "left" ? 0 : 1).click();
    if (index < path.length - 1) {
      await expect(page.locator(".story-progress")).toContainText(`${index + 2} / 40`);
      await expect(page.locator(".story-play-card")).toBeVisible();
    } else {
      await expect(page.locator(".story-ending")).toHaveAttribute("data-ending", expected.ending ?? "");
      await expect(page.locator(".story-recap li")).toHaveCount(40);
    }
    // L'interface bloque volontairement une double décision pendant 450 ms.
    if (index !== path.length - 1) await page.waitForTimeout(460);
  }
  await page.reload();
  await expect(page.locator(".story-ending")).toHaveAttribute("data-ending", expected.ending ?? "");
  await expect(page.locator(".story-recap summary")).toContainText("40 décisions");
});

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

test("Histoire : points neutres au-dessus de toutes les jauges touchées sans divulguer l'effet", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/histoire");
  const first = page.locator(".story-actions .story-choice").first();
  await expect(first.locator(".story-choice-signal")).toHaveCount(0);
  await expect(page.locator(".story-stat-orb")).toHaveCount(4);
  await expect(page.locator(".story-stat[data-affected='true']")).toHaveCount(0);
  const card = page.locator(".story-play-card");
  const bounds = await card.boundingBox();
  expect(bounds).not.toBeNull();
  if (!bounds) return;
  const x = bounds.x + bounds.width / 2, y = bounds.y + bounds.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - 40, y, { steps: 3 });
  await expect(page.locator(".story-stat[data-affected='true']")).toHaveCount(3);
  await expect(page.locator(".story-stat[data-affected='true'] .story-stat-orb")).toHaveCount(3);
  await expect(page.locator(".story-meter-preview")).toHaveCount(0);
  await expect(page.locator(".story-deck .story-direction-left")).toContainText("Rester avec le téléphone");
  await page.mouse.move(x, y, { steps: 3 });
  await page.mouse.up();
  await expect(page.locator(".story-stat[data-affected='true']")).toHaveCount(0);
  await expect(page.locator(".story-progress")).toContainText("1 / 40");
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
});
test("Histoire : les nouveaux intervenants ont une identité visuelle propre", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/histoire");
  await expect(page.getByRole("heading", { name: "Le grand départ" })).toBeVisible();
  const directions = "LRRLLLRLLRRRLRRLRRLLLRRRRLRRLRRRLLLRRRRL";
  const expectations = new Map([
    [13, { identity: "platform", name: "PLATEFORME" }],
    [17, { identity: "community", name: "SAM" }],
    [18, { identity: "lina", name: "LINA" }],
  ]);
  let run = startStory(STORY_PROLOGUE);
  for (let step = 1; step <= 18; step++) {
    run = chooseStory(STORY_PROLOGUE, run, directions[step - 1] === "L" ? "left" : "right");
    const expected = expectations.get(step);
    if (!expected) continue;
    expect(run.ending).toBeNull();
    await page.evaluate(({ key, value }) => window.localStorage.setItem(key, value), {
      key: STORY_SAVE_KEY, value: JSON.stringify(run),
    });
    await page.reload();
    const card = page.locator(".story-play-card");
    await expect(card).toHaveAttribute("data-character", expected.identity);
    await expect(card.locator(".story-scene-art-label")).toHaveText(expected.name);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
  }
});

test("Histoire : le journal montre seulement les décisions passées et survit au rechargement", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/histoire");
  await expect(page.locator(".story-recap-live")).toHaveCount(0);
  await page.locator(".story-actions .story-choice").first().click();
  const journal = page.locator(".story-recap-live");
  await expect(journal).toBeVisible();
  await expect(journal).not.toHaveAttribute("open", "");
  await journal.locator("summary").click();
  await expect(journal).toHaveAttribute("open", "");
  await expect(journal.locator("li")).toHaveCount(1);
  await expect(journal.locator("li").first()).toContainText("Le grand départ");
  await expect(journal.locator("li").first()).toContainText("Rester avec le téléphone");
  await expect(journal).not.toContainText("Le clip de trop");
  await page.reload();
  await expect(page.locator(".story-recap-live summary")).toContainText("1 décision");
  await page.locator(".story-recap-live summary").click();
  await expect(page.locator(".story-recap-live li")).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Une personne dans le chat" })).toBeVisible();
});

test("Histoire : nouvelle partie confirmée sans perdre une partie par erreur", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/histoire");
  await expect(page.getByRole("button", { name: /Nouvelle partie/ })).toHaveCount(0);
  await page.locator(".story-actions .story-choice").first().click();
  await expect(page.getByRole("heading", { name: "Une personne dans le chat" })).toBeVisible();

  await page.getByRole("button", { name: /Nouvelle partie/ }).click();
  await expect(page.getByRole("group", { name: "Confirmer une nouvelle partie" })).toBeVisible();
  await page.getByRole("button", { name: "Garder ma partie" }).click();
  await expect(page.getByRole("heading", { name: "Une personne dans le chat" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Une personne dans le chat" })).toBeVisible();

  await page.getByRole("button", { name: /Nouvelle partie/ }).click();
  await page.getByRole("button", { name: "Oui, recommencer" }).click();
  await expect(page.getByRole("heading", { name: "Le grand départ" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Nouvelle partie/ })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Le grand départ" })).toBeVisible();
  await expect(page.locator(".story-progress")).toContainText("1 / 40");
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
  await expect(page.locator(".story-progress")).toContainText("2 / 40");
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

test("Histoire : l’interlude du deuxième acte persiste après rechargement", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/histoire");
  await expect(page.getByRole("heading", { name: "Le grand départ" })).toBeVisible();
  for (let chapter = 0; chapter < 12; chapter++) {
    await page.locator(".story-actions .story-choice").first().click();
    await page.waitForTimeout(470);
  }
  await expect(page.locator(".story-progress")).toContainText("13 / 40");
  await expect(page.locator(".story-act-interlude")).toContainText("ACTE II · LE PRIX DES VUES");
  await expect(page.locator(".story-act-interlude")).toContainText("Flo");
  await page.reload();
  await expect(page.locator(".story-progress")).toContainText("13 / 40");
  await expect(page.locator(".story-act-interlude")).toContainText("Flo");
});

test("Histoire : la fin offre une nouvelle partie", async ({ page }) => {
  await page.goto("/histoire");
  await expect(page.locator(".story-play-card")).toBeVisible();
  for (let i = 0; i < 40; i++) {
    if (await page.getByRole("button", { name: /Recommencer l’histoire/ }).isVisible()) break;
    await page.locator(".story-actions .story-choice").first().click();
    // La garde anti-double-tap protège le joueur pendant 450 ms entre deux scènes.
    // Ce test joue volontairement des décisions distinctes, pas un multi-clic.
    await page.waitForTimeout(470);
  }
  await expect(page.getByRole("button", { name: /Recommencer l’histoire/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "CE QUE TU LAISSES DERRIÈRE TOI" })).toBeVisible();
  await expect(page.locator(".story-epilogue p").first()).toBeVisible();
  const recap = page.locator(".story-recap");
  await expect(recap).not.toHaveAttribute("open", "");
  await recap.locator("summary").click();
  await expect(recap).toHaveAttribute("open", "");
  await expect(recap.locator("li").first()).toContainText("Le grand départ");
  await expect(recap.locator("li").first()).toContainText("Rester avec le téléphone");
  const decisions = await recap.locator("li").count();
  expect(decisions).toBeGreaterThan(0);
  expect(decisions).toBeLessThanOrEqual(40);
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
      await expect(confiance.locator(".story-stat-alert")).toContainText("NIVEAU CRITIQUE");
      await expect(page.getByRole("progressbar", { name: "Confiance" })).toHaveAttribute("aria-valuetext", "11 sur 100, niveau critique");
      await expect(page.locator(".story-play-card")).toHaveAttribute("data-pressure", "confiance");
    }
    await page.waitForTimeout(470);
  }
  const card = page.locator(".story-play-card");
  await expect(card).toHaveAttribute("data-character", "duo");
  await expect(card.locator(".story-scene-art-label")).toHaveText("NOX + MONA");
  await expect(card.locator(".story-portrait-duo-panel")).toHaveCount(2);
  await expect(card.locator(".story-portrait-duo-panel[data-side='nox'] svg")).toBeVisible();
  await expect(card.locator(".story-portrait-duo-panel[data-side='mona'] svg")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Deux affaires, une caméra" })).toBeVisible();
  await mkdir("test-results/mobile-observation-histoire", { recursive: true });
  for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 568 }]) {
    await page.setViewportSize(viewport);
    const monitor = card.locator(".story-scene-art");
    const monitorHeight = await monitor.evaluate((el) => el.getBoundingClientRect().height);
    for (const panel of await card.locator(".story-portrait-duo-panel").all()) {
      const portraitHeight = await panel.locator("svg").evaluate((el) => el.getBoundingClientRect().height);
      expect(portraitHeight).toBeGreaterThanOrEqual(monitorHeight * 0.9);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
    await page.screenshot({
      path: `test-results/mobile-observation-histoire/scene-double-crise-${viewport.width}.png`,
      fullPage: true, animations: "disabled",
    });
  }
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

test.describe("Histoire : gestes natifs simulés dans Chromium mobile", () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });

  test("un vrai flux touchStart/touchMove/touchEnd déclenche exactement une carte", async ({ page }) => {
    await page.goto("/histoire");
    const card = page.locator(".story-play-card");
    await card.scrollIntoViewIfNeeded();
    const box = await card.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;
    const x = box.x + box.width / 2, y = box.y + box.height / 2;
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y, id: 1 }] });
    for (const dx of [-18, -37, -58, -79, -99]) {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x + dx, y, id: 1 }] });
    }
    await expect(page.locator(".story-deck .story-direction-left")).toHaveAttribute("data-ready", "true");
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect(page.locator(".story-progress")).toContainText("2 / 40");
    await expect(page.locator(".story-recap-live li")).toHaveCount(1);
    await cdp.detach();
  });

  test("un geste vertical conserve la scène et ne valide pas un choix", async ({ page }) => {
    await page.goto("/histoire");
    const card = page.locator(".story-play-card");
    await card.scrollIntoViewIfNeeded();
    const box = await card.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;
    const x = box.x + box.width / 2, y = Math.min(box.y + box.height / 2, 720);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y, id: 1 }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x + 5, y: y - 52, id: 1 }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x + 6, y: y - 106, id: 1 }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect(page.locator(".story-progress")).toContainText("1 / 40");
    await expect(page.locator(".story-recap-live")).toHaveCount(0);
    await cdp.detach();
  });
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
    await expect(page.locator(".story-progress")).toContainText("2 / 40");
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

test("Histoire : les quatre jauges restent nommées sous leurs pictogrammes", async ({ page }) => {
  await page.goto("/histoire");
  await expect(page.getByRole("heading", { name: "Le grand départ" })).toBeVisible();
  await expect(page.locator(".story-stat-name")).toHaveText(["Public", "Énergie", "Argent", "Confiance"]);
  await expect(page.locator(".story-stat-icon")).toHaveCount(4);
  for (const name of ["Public", "Énergie", "Argent", "Confiance"]) {
    await expect(page.getByRole("progressbar", { name })).toHaveAttribute("aria-valuemin", "0");
  }
});

test("Histoire : la barre de progression représente le chapitre en cours", async ({ page }) => {
  await page.goto("/histoire");
  await expect(page.getByRole("heading", { name: "Le grand départ" })).toBeVisible();
  const bar = page.locator(".story-progress-track span");
  expect(await bar.evaluate((el) => parseFloat((el as HTMLElement).style.width))).toBeCloseTo(100 / 40, 4);
  await page.locator(".story-actions .story-choice").first().click();
  await expect(page.locator(".story-progress")).toContainText("2 / 40");
  expect(await bar.evaluate((el) => parseFloat((el as HTMLElement).style.width))).toBeCloseTo(200 / 40, 4);
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

test.describe("Histoire : geste accessible en mouvement réduit", () => {
  test.use({ reducedMotion: "reduce", viewport: { width: 320, height: 568 } });
  test("la carte suit toujours le doigt sans effets décoratifs", async ({ page }) => {
    await page.goto("/histoire");
    const card = page.locator(".story-play-card");
    await expect(card).toBeVisible();
    const box = await card.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x - 45, y, { steps: 3 });
    expect(await card.evaluate((element) => getComputedStyle(element).transform)).not.toBe("none");
    await page.mouse.up();
    await expect(page.locator(".story-progress")).toContainText("1 / 40");
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 92, y, { steps: 5 });
    await page.mouse.up();
    await expect(page.locator(".story-progress")).toContainText("2 / 40");
  });
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
  await expect(page.locator(".story-progress")).toContainText("3 / 40");
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
  const preview = page.locator(".story-deck .story-direction-left");
  await expect(page.locator(".story-choice-preview-layer")).toHaveAttribute("aria-hidden", "true");

  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - 38, y, { steps: 5 });
  await expect(preview).toHaveAttribute("data-active", "true");
  await expect(preview).toHaveAttribute("data-ready", "false");
  await expect(preview).toHaveCSS("opacity", "1");
  await page.mouse.up();
  await expect(preview).toHaveAttribute("data-active", "false");
  await expect(page.getByRole("heading", { name: "Le grand départ" })).toBeVisible();
  await expect(page.locator(".story-progress")).toContainText("1 / 40");
  await expect(page.locator(".story-progress")).toContainText("ACTE I");

  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - 95, y, { steps: 6 });
  await expect(preview).toHaveAttribute("data-ready", "true");
  await page.mouse.up();
  await expect(page.getByRole("heading", { name: "Une personne dans le chat" })).toBeVisible();
  await expect(page.locator(".story-progress")).toContainText("2 / 40");
});

test("Histoire : les médias ont un décor propre et les choix laissent une trace à l'acte II", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/histoire");
  await expect(page.locator(".story-set-pieces[data-channel='LIVE'] svg")).toBeVisible();
  await page.locator(".story-actions .story-choice").first().click();
  await expect(page.locator(".story-set-pieces[data-channel='CHAT'] svg")).toBeVisible();
  let played = startStory(STORY_PROLOGUE);
  for (let i = 0; i < 12; i++) played = chooseStory(STORY_PROLOGUE, played, "left");
  expect(played.ending).toBeNull();
  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
    key: STORY_SAVE_KEY, value: JSON.stringify(played),
  });
  await page.reload();
  const { storyActEchoes } = await import("../src/lib/story-echoes");
  const echoes = storyActEchoes(played);
  expect(echoes.length).toBeGreaterThan(0);
  await expect(page.locator(".story-act-echo")).toHaveCount(echoes.length);
  for (const echo of echoes) await expect(page.locator(".story-act-echo").filter({ hasText: echo.title })).toHaveCount(1);
  await mkdir("test-results/mobile-observation-histoire", { recursive: true });
  await page.screenshot({ path: "test-results/mobile-observation-histoire/echoes-acte-II-390.png", fullPage: true, animations: "disabled" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
});

test("Histoire : l'entourage du journal suit la partie réellement restaurée", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/histoire");
  let played = startStory(STORY_PROLOGUE);
  for (let i = 0; i < 12; i++) played = chooseStory(STORY_PROLOGUE, played, "left");
  expect(played.ending).toBeNull();
  const { storyBonds } = await import("../src/lib/story-bonds");
  const bonds = storyBonds(played);
  expect(bonds.length).toBeGreaterThan(0);
  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
    key: STORY_SAVE_KEY, value: JSON.stringify(played),
  });
  await page.reload();
  await page.locator(".story-recap-live summary").click();
  await expect(page.locator(".story-bond")).toHaveCount(bonds.length);
  for (const bond of bonds) {
    await expect(page.locator(`.story-bond[data-person="${bond.id}"]`)).toContainText(bond.status);
  }
  await expect(page.locator(".story-recap-live li")).toHaveCount(12);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
});

test("Histoire : boutons lisibles sur les deux formats de téléphone", async ({ page }) => {
  for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/histoire");
    await expect(page.locator(".story-actions .story-choice")).toHaveCount(2);
    const controls = await page.locator(".story-actions .story-choice").evaluateAll(buttons =>
      buttons.map(button => {
        const style = getComputedStyle(button.querySelector("strong")!);
        const rect = button.getBoundingClientRect();
        return { font: Number.parseFloat(style.fontSize), height: rect.height, width: rect.width };
      }));
    for (const control of controls) {
      expect(control.font).toBeGreaterThanOrEqual(12);
      expect(control.height).toBeGreaterThanOrEqual(60);
      expect(control.width).toBeGreaterThanOrEqual(44);
    }
  }
});

test("Histoire : les relations montrent les vrais portraits et ne prédisent pas les rencontres", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/histoire");
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  const select = page.locator(".story-actions .story-choice").first();
  await select.click();
  await expect(page.locator(".story-progress")).toContainText("2 / 40");
  await page.waitForTimeout(460);
  await select.click();
  await expect(page.locator(".story-progress")).toContainText("3 / 40");
  const journal = page.locator(".story-recap-live");
  await journal.locator("summary").click();
  await expect(journal.locator(".story-bond")).toHaveCount(1);
  await expect(journal.locator(".story-bond[data-person='flo'] .story-portrait-illustration")).toBeVisible();
  await expect(journal.locator(".story-bond-portrait")).toHaveCount(1);
  await page.waitForTimeout(460);
  await select.click();
  await expect(page.locator(".story-progress")).toContainText("4 / 40");
  await expect(page.locator(".story-recap-live")).not.toHaveAttribute("open", "");
  await page.locator(".story-recap-live summary").click();
  await expect(page.locator(".story-bond[data-person='nox'] .story-portrait-illustration")).toBeVisible();
  const framing = await page.locator(".story-bond-portrait").evaluateAll(frames => frames.map(frame => ({
    portraitWidth: frame.querySelector(".story-portrait-illustration")!.getBoundingClientRect().width,
    frameWidth: frame.getBoundingClientRect().width,
  })));
  for (const { portraitWidth, frameWidth } of framing) expect(portraitWidth / frameWidth).toBeGreaterThan(2);
  await mkdir("test-results/mobile-observation-histoire", { recursive: true });
  await page.screenshot({ path: "test-results/mobile-observation-histoire/journal-portraits-320.png", fullPage: true, animations: "disabled" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
});

test("Histoire : le dénouement a une gravure dédiée, enregistrée à la fin de partie", async ({ page }) => {
  let played = startStory(STORY_PROLOGUE);
  for (let i = 0; i < STORY_PROLOGUE.totalSteps && !played.ending; i++) {
    played = chooseStory(STORY_PROLOGUE, played, "right");
  }
  expect(played.ending).not.toBeNull();
  await page.goto("/histoire");
  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
    key: STORY_SAVE_KEY, value: JSON.stringify(played),
  });
  await page.reload();
  await expect(page.locator(".story-ending-artwork")).toHaveAttribute("data-ending-symbol", played.ending!);
  await expect(page.locator(".story-ending-artwork")).toBeVisible();
  expect(await page.locator(".story-ending-artwork path").count()).toBeGreaterThan(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await mkdir("test-results/mobile-observation-histoire", { recursive: true });
  await page.screenshot({ path: "test-results/mobile-observation-histoire/fin-gravure-mobile-390.png", fullPage: true, animations: "disabled" });
  await expect(page.locator(".story-replay")).toBeVisible();
});

test("Histoire : les neuf fins ont chacune un visuel différent sur téléphone", async ({ page }) => {
  test.slow(); // Neuf rechargements et captures complètes de dénouements.
  const endingPaths = {
    independant: "LRRLLLRLLRRRLRRLRRLLLRRRRLRRLRRRLLLRRRRL",
    surexposition: "RLLRRLRLRRL",
    phenomene: "RLLRRRLLRLLRRRLRLLLLRLLRLRLLRLRLLRRRRLLL",
    epuisement: "LRRLLLRRLRRLLRRLLRRLRLRLRLLLRLR",
    faillite: "LRLLLLRRLLRLLRLRRLRRRLLLRRRLR",
    scandale: "RLRRRLRRR",
    business: "RLRRRRLLLRLLRRRLLLRLLRLRLLLRLRRLLRLRLLRL",
    survivant: "LLRLRLRLRLRRRLRLRLRLRLLRRRRLRLLRRRRLRLLL",
    silence: "RLLRLRRLLLRLLRRRRRRLRLRRRRRRLRRRLRL",
  } as const;
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/histoire");
  await mkdir("test-results/mobile-observation-histoire", { recursive: true });
  const uniqueArtwork = new Set<string>();
  for (const [ending, path] of Object.entries(endingPaths)) {
    let run = startStory(STORY_PROLOGUE);
    for (const direction of path) run = chooseStory(STORY_PROLOGUE, run, direction === "L" ? "left" : "right");
    expect(run.ending).toBe(ending);
    await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
      key: STORY_SAVE_KEY, value: JSON.stringify(run),
    });
    await page.reload();
    await expect(page.locator(".story-ending-artwork")).toHaveAttribute("data-ending-symbol", ending);
    const drawing = await page.locator(".story-ending-artwork").evaluate(node => node.innerHTML);
    expect(uniqueArtwork.has(drawing)).toBe(false);
    uniqueArtwork.add(drawing);
    await expect(page.locator(".story-ending h2")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
    await page.screenshot({
      path: `test-results/mobile-observation-histoire/fin-${ending}-390.png`,
      fullPage: true, animations: "disabled",
    });
  }
  expect(uniqueArtwork.size).toBe(9);
});


test("Histoire : mondes visuels stream, chat et vidéo gaming", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/histoire");
  const card = page.locator(".story-play-card");
  const stage = page.locator(".story-scene-art");
  await expect(card).toHaveAttribute("data-channel", "LIVE");
  await expect(card.locator(".story-card-medium")).toHaveText("STREAM");
  await expect(stage.locator(".story-scene-edition")).toHaveText("EN DIRECT");
  const live = await stage.evaluate(el => getComputedStyle(el).backgroundImage);
  await page.locator(".story-actions .story-choice").first().click();
  await expect(card).toHaveAttribute("data-channel", "CHAT");
  await expect(card.locator(".story-card-medium")).toHaveText("COMMUNAUTÉ");
  const chat = await stage.evaluate(el => getComputedStyle(el).backgroundImage);
  expect(chat).not.toBe(live);
  await page.waitForTimeout(470);
  await page.locator(".story-actions .story-choice").first().click();
  await expect(card).toHaveAttribute("data-channel", "CLIP");
  await expect(card.locator(".story-card-medium")).toHaveText("VIDÉO");
  await expect(stage.locator(".story-scene-edition")).toHaveText("GAMING & CRÉATION");
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
  await mkdir("test-results/mobile-observation-histoire", { recursive: true });
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  await page.screenshot({ path: "test-results/mobile-observation-histoire/media-video-390.png", fullPage: true, animations: "disabled" });
});

test("Histoire : panorama et hiérarchie sur téléphone 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/histoire");
  const card = page.locator(".story-play-card");
  await expect(card.locator(".story-world-shapes")).toHaveCount(1);
  const order = await card.evaluate(el => [
    Number(getComputedStyle(el.querySelector(".story-prompt")!).order),
    Number(getComputedStyle(el.querySelector(".story-scene-art")!).order),
  ]);
  expect(order[0]).toBeLessThan(order[1]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
  await mkdir("test-results/mobile-observation-histoire", { recursive: true });
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  await page.screenshot({ path: "test-results/mobile-observation-histoire/media-live-320.png", fullPage: true, animations: "disabled" });
});


test("Histoire : les décors de métier et les portraits restent accessibles sur téléphone", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/histoire");
  const active = page.locator(".story-play-card .story-scene-art");
  await expect(active.locator(".story-world-details")).toBeVisible();
  await expect(active.locator(".story-event-illustration")).toHaveCount(1);
  await expect(page.locator(".story-set-pieces")).toHaveAttribute("data-scene", "studio");
  const text = await page.locator(".story-prompt p").evaluate(el => getComputedStyle(el).textAlign);
  expect(text).toBe("left");
  await page.locator(".story-actions .story-choice").first().click();
  await expect(page.locator(".story-set-pieces")).toHaveAttribute("data-scene", "premier_chat");
  await expect(active.locator(".story-event-illustration")).toHaveCount(0);
  await page.waitForTimeout(470);
  await page.locator(".story-actions .story-choice").first().click();
  await expect(page.locator(".story-set-pieces")).toHaveAttribute("data-scene", "clip_risque");
  await expect(active.locator(".story-event-illustration")).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
  await mkdir("test-results/mobile-observation-histoire", { recursive: true });
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  await page.screenshot({ path: "test-results/mobile-observation-histoire/decor-gaming-320.png", fullPage: true, animations: "disabled" });
});


test("Histoire : murmures LIVE uniquement, sans spoiler ni encombrement mobile", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/histoire");
  const card = page.locator(".story-play-card");
  const scene = card.locator(".story-scene-art");
  await expect(scene).toHaveAttribute("data-career-stage", "debut");
  await expect(scene.locator(".story-career-gear")).toHaveAttribute("data-stage", "debut");
  const whispers = card.locator(".story-live-murmur");
  await expect(whispers).toHaveCount(2);
  await expect(whispers.first()).toBeHidden();
  const box = await card.boundingBox();
  expect(box).not.toBeNull();
  if (!box) return;
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - 45, y, { steps: 4 });
  await expect(whispers.first()).toHaveAttribute("data-active", "true");
  await expect(whispers.last()).toHaveAttribute("data-active", "false");
  await expect(whispers.first()).toBeHidden();
  await page.mouse.move(x, y, { steps: 4 });
  await page.mouse.up();
  await expect(whispers.first()).toHaveAttribute("data-active", "false");
  await expect(page.locator(".story-progress")).toContainText("1 / 40");
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
  await page.locator(".story-actions .story-choice").first().click();
  await expect(card).toHaveAttribute("data-channel", "CHAT");
  await expect(card.locator(".story-live-murmur")).toHaveCount(0);
  await expect(scene.locator(".story-career-gear")).toHaveCount(0);
});

test("Histoire : libellés visibles sur plateau au swipe mobile, face opaque au contact", async ({ page }) => {
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: width === 320 ? 568 : 844 });
    await page.goto("/histoire");
    const card = page.locator(".story-play-card");
    const left = page.locator(".story-deck .story-direction-left");
    const right = page.locator(".story-deck .story-direction-right");
    const outer = page.locator(".story-deck");
    await expect(card.locator(".story-direction")).toHaveCount(0);
    await expect(left).toHaveCount(1);
    const bounds = await card.boundingBox();
    expect(bounds).not.toBeNull();
    if (!bounds) continue;
    const x = bounds.x + bounds.width / 2, y = bounds.y + bounds.height / 2;

    // Un appui maintenu ne doit pas désactiver l'arrivée ou révéler le dos.
    await page.mouse.move(x, y);
    await page.mouse.down();
    await expect(card).toHaveAttribute("data-dragging", "false");
    await expect(card).toHaveCSS("opacity", "1");
    await expect(card).toHaveCSS("animation-name", "story-card-arrive");
    await page.mouse.up();

    for (const [dx, locator, label] of [
      [-100, left, "Rester avec le téléphone"],
      [100, right, "Acheter le micro"],
    ] as const) {
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(x + dx, y, { steps: 7 });
      await expect(locator).toHaveAttribute("data-active", "true");
      await expect(locator).toContainText(label);
      await expect(locator).toHaveCSS("opacity", "1");
      await expect(card).toHaveCSS("opacity", "1");
      const box = await locator.boundingBox();
      expect(box).not.toBeNull();
      if (box) {
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(width);
        expect(box.width).toBeGreaterThan(130);
      }
      const moved = await Promise.all([card.boundingBox(), outer.boundingBox()]);
      if (moved[0] && moved[1]) {
        // Le mouvement de la face peut dépasser légèrement sur un petit écran ;
        // seule la réponse doit rester intégralement visible sur le plateau fixe.
        const visibleWidth = Math.max(0, Math.min(width, moved[0].x + moved[0].width) - Math.max(0, moved[0].x));
        expect(visibleWidth / moved[0].width).toBeGreaterThan(0.7);
      }
      await page.mouse.move(x, y, { steps: 5 });
      await page.mouse.up();
      await expect(locator).toHaveAttribute("data-active", "false");
      await expect(page.locator(".story-progress")).toContainText("1 / 40");
    }
    await expect(card.locator(".story-live-murmur").first()).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
  }
});

test("Histoire : lancer rapide conserve le seuil et accélère la sortie", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/histoire");
  const card = page.locator(".story-play-card");
  const deck = page.locator(".story-deck");
  const box = await card.boundingBox();
  expect(box).not.toBeNull();
  if (!box) return;
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - 40, y, { steps: 5 });
  await expect(deck.locator(".story-direction-left")).toHaveAttribute("data-active", "true");
  await expect(card).toHaveAttribute("data-dragging", "true");
  const moved = await card.boundingBox();
  expect(moved).not.toBeNull();
  if (moved) expect(Math.abs(moved.x - box.x)).toBeLessThan(52);
  await page.mouse.move(x, y, { steps: 5 });
  await page.mouse.up();
  await expect(page.locator(".story-progress")).toContainText("1 / 40");
  await expect(card).toHaveAttribute("data-dragging", "false");
  await expect(card).toHaveCSS("opacity", "1");

  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 99, y, { steps: 2 });
  await page.mouse.up();
  await expect(page.locator(".story-progress")).toContainText("2 / 40");
  await expect(card).toHaveAttribute("data-exiting", "none");
  await expect(page.locator(".story-recap-live li")).toHaveCount(1);
});

test("Histoire : comparer les pièces du premier sponsor sans valider un choix", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/histoire");
  const firstChoice = page.locator(".story-actions .story-choice").first();
  for (let step = 0; step < 3; step++) {
    await firstChoice.click();
    await expect(page.locator(".story-progress")).toContainText(`${step + 2} / 40`);
    // Le joueur ne peut pas enchaîner deux choix en moins de 450 ms.
    // L'ancien test cliquait trop vite et restait au chapitre précédent.
    if (step < 2) await page.waitForTimeout(470);
  }

  const desk = page.locator(".story-inspection");
  await expect(desk).toHaveAttribute("data-scene", "premier_sponsor");
  await desk.locator("summary").click();
  await expect(desk.locator(".story-inspection-progress")).toContainText("0 / 2");
  const beforeInspect = await page.evaluate(() => localStorage.getItem("creatordeck.histoire.prologue.v4"));
  await desk.locator('[data-evidence-id="offre"]').click();
  await expect(desk.locator(".story-inspection-progress")).toContainText("1 / 2");
  await desk.locator('[data-evidence-id="loyer"]').click();
  await expect(desk.locator(".story-inspection-progress")).toContainText("2 / 2");
  expect(await page.evaluate(() => localStorage.getItem("creatordeck.histoire.prologue.v4"))).toBe(beforeInspect);
  await expect(desk.locator(".story-inspection-finding")).toHaveAttribute("data-found", "false");
  await expect(desk.locator(".story-inspection-finding")).toContainText("Pas de contradiction prouvée");

  await desk.getByRole("button", { name: "Recommencer la comparaison" }).click();
  await desk.locator('[data-evidence-id="brief"]').click();
  await desk.locator('[data-evidence-id="offre"]').click();
  await expect(desk.locator(".story-inspection-finding")).toHaveAttribute("data-found", "true");
  await expect(desk).toHaveAttribute("data-verified", "true");
  await expect(desk.locator(".story-inspection-finding")).toContainText("Le loyer n'efface pas cette contradiction");
  await expect(page.locator(".story-progress")).toContainText("4 / 40");
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);

  await page.locator(".story-actions .story-choice").first().click();
  await expect(page.locator(".story-progress")).toContainText("5 / 40");
  await expect(page.locator(".story-inspection")).toHaveCount(0);
});
