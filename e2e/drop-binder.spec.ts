import { expect, test, gotoDeck } from "./fixtures";
import creatorData from "../src/data/creators.json";

test("le Binder est un album calme : ni score, ni filtres, ni objectifs, à 320 px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await gotoDeck(page, true, { withoutCircle: true });
  await page.getByRole("button", { name: "Binder", exact: true }).dispatchEvent("click"); // le « N » de Next couvre Binder à 320 px (dev seulement)
  await expect(page.getByRole("heading", { name: "Mon classeur" })).toBeVisible();
  for (const removed of [".collection-score", ".filter-chips", ".binder-next-pages", ".binder-circle-goal",
    ".binder-collections-picker", ".binder-active-page", ".pocket-count", ".binder-card-caption"]) {
    await expect(page.locator(removed)).toHaveCount(0);
  }
  await expect(page.getByRole("combobox", { name: "Trier le classeur" })).toHaveCount(0);
  await expect(page.getByRole("textbox", { name: "Rechercher un créateur" })).toBeVisible();
  // Un classeur neuf se feuillette déjà : douze dos à découvrir.
  await expect(page.locator(".collection-grid .creator-card.is-locked")).toHaveCount(12);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await page.screenshot({ path: `test-results/binder-album-${test.info().project.name}.png` });
});

test("le Drop garde l’ouverture à portée et mène au Binder", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await gotoDeck(page, true, { withoutCircle: true });
  await expect(page.getByRole("heading", { name: "Drop", exact: true })).toBeVisible();
  const open = page.getByRole("button", { name: "Ouvrir le booster", exact: true });
  await expect(open).toBeEnabled();
  await expect(open).toBeInViewport();
  await expect(page.locator(".pack-stage .pack-artwork")).toBeInViewport();
  const hourglass = page.getByRole("button", { name: /Utiliser 1 sablier/ });
  await page.locator(".drop-secondary-details > summary").click();
  await expect(hourglass).toBeVisible();
  await hourglass.scrollIntoViewIfNeeded();
  await expect(hourglass).toBeInViewport();
  await expect(page.locator(".drop-secondary-details")).toHaveAttribute("open", "");
  await page.getByRole("button", { name: "Binder", exact: true }).dispatchEvent("click"); // le « N » de Next couvre Binder à 320 px (dev seulement)
  await expect(page.getByRole("heading", { name: "Mon classeur" })).toBeVisible();
  await page.getByRole("button", { name: "Drop", exact: true }).click();
  await expect(open).toBeEnabled();
});

test("le Binder s’ouvre sur les dernières reçues, les manquantes après", async ({ page }) => {
  await gotoDeck(page, true, { withoutCircle: true });
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
  await page.getByRole("button", { name: "Binder", exact: true }).dispatchEvent("click"); // le « N » de Next couvre Binder à 320 px (dev seulement)
  // Ses visages d'abord, la plus récente en tête ; les manquantes suivent en dos.
  const cards = page.locator(".collection-grid .creator-card");
  await expect(cards).toHaveCount(12);
  const labels = await cards.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("aria-label")));
  expect(labels.slice(0, 3).map((label) => label?.split(", rang")[0])).toEqual([creators[2], creators[1], creators[0]].map((creator) => creator.displayName));
  expect(labels.slice(0, 3).some((label) => label?.includes("non obtenue"))).toBe(false);
  expect(labels.slice(3).every((label) => label?.includes("non obtenue"))).toBe(true);
});

test("Drop et Binder restent contenus à 320 px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await gotoDeck(page);
  for (const name of ["Drop", "Binder"] as const) {
    if (name === "Drop") await expect(page.getByRole("button", { name: "Ouvrir le booster", exact: true })).toBeInViewport();
    if (name === "Binder") await page.getByRole("button", { name, exact: true }).dispatchEvent("click");
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
    await expect(page.getByRole("navigation", { name: "Navigation principale" })).toBeInViewport();
  }
});

test("avec un cercle, le Binder s'ouvre sur ses visages sans objectif affiché (D-140)", async ({ page }) => {
  await gotoDeck(page);
  // Accueil épuré : le sachet garde la taille du Drop (préférence de Malik ; la refonte UI l'avait réduit).
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".home-view.is-lean")).toBeVisible();
  const packBox = (await page.locator(".pack-stage .pack-artwork").boundingBox())!;
  expect(packBox.width).toBeGreaterThanOrEqual(Math.min(390 * .58, 220, 844 * .34) - 1);
  await page.getByRole("button", { name: "Binder", exact: true }).dispatchEvent("click"); // le « N » de Next couvre Binder à 320 px (dev seulement)
  // Plus de puce « Mon cercle » ni d'objectif : l'album s'ouvre sur ses visages, cercle en tête.
  await expect(page.locator(".filter-chips")).toHaveCount(0);
  await expect(page.locator(".binder-circle-goal")).toHaveCount(0);
  await expect(page.locator(".circle-strip")).toBeVisible();
  const locked = await page.locator(".collection-grid .creator-card").evaluateAll((nodes) => nodes.map((node) => node.classList.contains("is-locked")));
  expect(locked.indexOf(false) < 0 || locked.lastIndexOf(false) < locked.indexOf(true)).toBe(true);
  await page.getByRole("button", { name: "Modifier mes chaînes" }).click();
  await expect(page.getByRole("dialog", { name: "Mes chaînes" })).toContainText("Ton accueil et ton Binder se recentrent sur eux.");
  await page.getByRole("button", { name: "Annuler", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Mes chaînes" })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
});
