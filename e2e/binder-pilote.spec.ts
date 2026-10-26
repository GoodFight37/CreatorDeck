import { expect, test, gotoDeck, E2E_CIRCLE } from "./fixtures";
import creators from "../src/data/creators.json";

test("les filtres se combinent, le tri et la recherche reviennent à la première page", async ({ page }) => {
  await gotoDeck(page);
  const selected = [creators[0], creators.find((c) => c.rarity === "common")!];
  await page.evaluate((cards) => {
    const key = Object.keys(localStorage).find((key) => /^creatordeck.save.v\d+$/.test(key))!;
    const state = JSON.parse(localStorage.getItem(key)!);
    state.cards = [...cards, cards[0]].map((creator, i) => ({ id: `pilot-${i}`, creatorSlug: creator.slug,
      rarity: creator.rarity, variant: "standard", rareDrop: false, obtainedAt: Date.now() - i * 1000 }));
    localStorage.setItem(key, JSON.stringify(state));
  }, selected);
  await page.reload();
  await page.getByRole("button", { name: "Binder", exact: true }).click();
  await expect(page.locator(".binder-total")).toHaveText("2 / 1000 possédées");
  await page.getByLabel("Cartes affichées", { exact: true }).selectOption("owned");
  await expect(page.locator(".collection-grid .creator-card")).toHaveCount(2);
  await page.getByLabel("Filtrer par cercle").selectOption("circle");
  await expect(page.locator(".collection-grid .creator-card")).toHaveCount(selected.filter((c) => (E2E_CIRCLE as readonly string[]).includes(c.slug)).length);
  await page.getByLabel("Filtrer par rareté").selectOption("common");
  await expect(page.locator(".collection-grid .creator-card")).toHaveCount(0);
  await page.getByLabel("Filtrer par cercle").selectOption("all");
  await expect(page.locator(".collection-grid .creator-card")).toHaveCount(1);
  await page.getByLabel("Cartes affichées", { exact: true }).selectOption("missing");
  await expect(page.locator(".collection-grid .creator-card:not(.is-locked)")).toHaveCount(0);
  await page.getByRole("button", { name: "Suivant", exact: true }).click();
  await expect(page.locator(".binder-page")).toHaveAttribute("data-page", "2");
  await page.getByLabel("Trier le classeur").selectOption("alpha");
  await expect(page.locator(".binder-page")).toHaveAttribute("data-page", "1");
  await page.getByLabel("Cartes affichées", { exact: true }).selectOption("owned");
  await page.getByLabel("Filtrer par rareté").selectOption("all");
  await page.getByLabel("Trier le classeur").selectOption("duplicates");
  await expect(page.locator(".collection-grid h3").first()).toHaveText(selected[0].displayName);
  await page.getByLabel("Rechercher un créateur").fill("introuvablexyz");
  await expect(page.locator(".collection-grid .creator-card")).toHaveCount(0);
  await page.getByRole("button", { name: "Effacer la recherche" }).click();
  await expect(page.locator(".collection-grid .creator-card")).toHaveCount(2);
});

test("une page se génère à la demande en PNG sans partage automatique", async ({ page }) => {
  await gotoDeck(page, true, { withoutCircle: true });
  await page.getByRole("button", { name: "Binder", exact: true }).click();
  await expect(page.locator(".binder-export img")).toHaveCount(0);
  await page.getByRole("button", { name: "Exporter cette page" }).click();
  const image = page.locator(".binder-export img");
  await expect(image).toBeVisible();
  expect(await image.evaluate((node) => ({ width: (node as HTMLImageElement).naturalWidth, height: (node as HTMLImageElement).naturalHeight }))).toEqual({ width: 1080, height: 1640 });
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: "Enregistrer l’image" }).click()]);
  expect(download.suggestedFilename()).toBe("creatordeck-classeur-page-1.png");
  await download.saveAs(`test-results/classeur-export-${test.info().project.name}.png`);
  await page.getByRole("button", { name: "Suivant", exact: true }).click();
  await expect(image).toHaveCount(0);
});

test("la réserve et la dernière rangée se dégagent de la navigation, les champs et cibles restent tactiles", async ({ page }) => {
  await gotoDeck(page, true, { withoutCircle: true });
  for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 1024, height: 768 }]) {
    await page.setViewportSize(viewport);
    await page.getByRole("button", { name: "Drop", exact: true }).click({ force: true });
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const stock = await page.locator(".stock-row:visible").boundingBox();
    const nav = await page.locator(".nav-object.hub .nav-object-art").boundingBox();
    expect(stock!.y + stock!.height).toBeLessThan(nav!.y);
    // L'indicateur Next dev couvre ce bouton à 320 px ; absent du build et de l'APK.
    await page.getByRole("button", { name: "Binder", exact: true }).dispatchEvent("click");
    await page.getByLabel("Rechercher un créateur").fill("a");
    for (const control of [page.getByRole("button", { name: "Effacer la recherche" }), ...await page.locator(".binder-filters select").all()]) {
      const box = await control.boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
    const coarse = await page.evaluate(() => matchMedia("(pointer: coarse)").matches);
    for (const input of await page.locator(coarse ? ".binder-tools input, .binder-filters select" : ".binder-filters select").all()) {
      expect(await input.evaluate((node) => parseFloat(getComputedStyle(node).fontSize))).toBeGreaterThanOrEqual(16);
    }
    await page.getByRole("button", { name: "Effacer la recherche" }).click();
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const row = await page.locator(".binder-pocket").last().boundingBox();
    const hub = await page.locator(".nav-object.hub .nav-object-art").boundingBox();
    expect(row!.y + row!.height).toBeLessThan(hub!.y);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width);
    await page.screenshot({ path: `test-results/binder-pilote-${viewport.width}-${test.info().project.name}.png` });
  }
});
