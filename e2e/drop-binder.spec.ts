import { expect, test, gotoDeck } from "./fixtures";
import creatorData from "../src/data/creators.json";

test("une collection choisie reste mémorisée sans remplacer la vue Obtenues", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await gotoDeck(page);
  await page.getByRole("button", { name: "Binder", exact: true }).click();
  await expect(page.locator(".binder-next-pages")).toHaveCount(0);
  await page.locator(".binder-collections-picker summary").click();
  const family = page.getByRole("combobox", { name: "Famille de collection" });
  const secondFamily = await family.locator("option").nth(1).getAttribute("value");
  await family.selectOption(secondFamily!);
  const choice = page.locator(".binder-collection-choices button").first();
  const name = await choice.locator("strong").innerText();
  await choice.click();
  await expect(page.locator(".binder-next-pages")).toContainText(name);
  await expect(page.locator(".binder-next-pages")).toContainText("0 / 12");
  await expect(page.locator(".collection-grid .creator-card")).toHaveCount(12);
  const firstLabels = await page.locator(".collection-grid .creator-card").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("aria-label")));
  expect(firstLabels.every((label) => label?.includes("non obtenue"))).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await page.reload();
  await page.getByRole("button", { name: "Binder", exact: true }).click();
  await expect(page.getByRole("button", { name: /^Obtenues/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".collection-grid .creator-card")).toHaveCount(0);
  await expect(page.locator(".binder-next-pages")).toContainText(name);
  await page.locator(".binder-collections-picker summary").click();
  await expect(family).toHaveValue(secondFamily!);
  await page.locator(".binder-next-pages > button").click();
  const restoredLabels = await page.locator(".collection-grid .creator-card").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("aria-label")));
  expect(restoredLabels).toEqual(firstLabels);
  await page.locator(".binder-next-pages").screenshot({ path: `test-results/binder-collection-${test.info().project.name}.png` });
});

test("le Drop garde l’ouverture à portée et mène au Binder", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await gotoDeck(page);
  await expect(page.getByRole("heading", { name: "Cinq créateurs." })).toBeVisible();
  const open = page.getByRole("button", { name: "Ouvrir le booster", exact: true });
  await expect(open).toBeEnabled();
  await expect(open).toBeInViewport();
  await expect(page.locator(".pack-stage .pack-artwork")).toBeInViewport();
  const hourglass = page.getByRole("button", { name: /Utiliser 1 sablier/ });
  await expect(hourglass).toBeVisible();
  const hourglassBox = await hourglass.boundingBox();
  const navBox = await page.getByRole("navigation", { name: "Navigation principale" }).boundingBox();
  expect(hourglassBox!.y + hourglassBox!.height, "sablier entièrement au-dessus de la navigation").toBeLessThanOrEqual(navBox!.y);
  await expect(page.locator(".hourglass-action").locator("xpath=ancestor::details")).toHaveCount(0);
  await page.getByRole("button", { name: "Mon Binder", exact: false }).click();
  await expect(page.getByRole("heading", { name: "Mon classeur" })).toBeVisible();
  await page.getByRole("button", { name: "Retour au Drop", exact: true }).click();
  await expect(open).toBeEnabled();
});

test("les pages à compléter montrent leurs manquantes ; les dernières reçues retrouvent les obtenues", async ({ page }) => {
  await gotoDeck(page);
  const creators = creatorData.filter((creator) => creator.region === "S01").slice(0, 3);
  await page.evaluate((cards) => {
    const key = Object.keys(localStorage).find((entry) => /^creatordeck.save.v\d+$/.test(entry));
    if (!key) throw new Error("La sauvegarde de départ doit exister.");
    const state = JSON.parse(localStorage.getItem(key)!);
    state.cards = cards.map((creator, index) => ({ id: `fixture-${index}`, creatorSlug: creator.slug, rarity: creator.rarity,
      variant: "standard", obtainedAt: Date.now() - (2 - index) * 1000, rareDrop: false }));
    state.updatedAt = Date.now();
    localStorage.setItem(key, JSON.stringify(state));
  }, creators);
  await page.reload();
  await page.locator(".mini-card-row .creator-card").first().click();
  const finding = page.getByRole("dialog", { name: /^Carte de / });
  await expect(finding).toBeVisible();
  await expect(finding).toBeInViewport();
  await expect(page.locator(".app-shell")).toHaveJSProperty("inert", true);
  await finding.locator(".odds-head").getByRole("button", { name: "Fermer", exact: true }).click();
  await expect(page.locator(".app-shell")).toHaveJSProperty("inert", false);
  await expect(page.locator(".mini-card-row .creator-card").first()).toBeFocused();
  await page.getByRole("button", { name: "Binder", exact: true }).click();
  const goals = page.getByRole("region", { name: "Pages à compléter" });
  await expect(goals).toBeVisible();
  await goals.getByRole("button").first().click();
  await expect(page.getByRole("button", { name: "À découvrir", exact: true })).toHaveAttribute("aria-pressed", "true");
  const cards = page.locator(".collection-grid .creator-card");
  await expect(goals).toContainText("3 / 12");
  await expect(cards).toHaveCount(9);
  const labels = await cards.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("aria-label")));
  expect(labels.every((label) => label?.includes("non obtenue"))).toBe(true);
  for (const creator of creators) expect(labels.some((label) => label?.startsWith(`${creator.displayName},`))).toBe(false);
  await page.getByRole("button", { name: "Dernières reçues" }).click();
  await expect(page.locator(".binder-active-page")).toHaveCount(0);
  await expect(cards).toHaveCount(3);
  await expect(cards.first()).toHaveAttribute("aria-label", new RegExp(`^${creators[2].displayName},`));
});

test("Drop et Binder restent contenus à 320 px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await gotoDeck(page);
  for (const name of ["Drop", "Binder"] as const) {
    if (name === "Drop") await expect(page.getByRole("button", { name: "Ouvrir le booster", exact: true })).toBeInViewport();
    if (name === "Binder") await page.getByRole("button", { name, exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
    await expect(page.getByRole("navigation", { name: "Navigation principale" })).toBeInViewport();
  }
});
