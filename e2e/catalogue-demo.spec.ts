import { expect, test } from "./fixtures";

test("le prototype réunit deux univers fictifs et garde leurs classements séparés", async ({ page }) => {
  await page.goto("/catalogue-demo");

  await expect(page).toHaveTitle(/Prototype de classeur hybride/);
  await expect(page.getByRole("main")).toHaveCount(1);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Un classeur\.\s*Deux univers\./);
  await expect(page.getByRole("region", { name: "Créateurs Twitch" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Chroniques de Velune" })).toBeVisible();
  await expect(page.locator("[data-demo-card]")).toHaveCount(10);
  await expect(page.getByRole("img", { name: /Visuel temporaire abstrait/ })).toHaveCount(10);
  await expect(page.getByText("Tout est fictif et temporaire.")).toBeVisible();
  await expect(page.getByText("Liora Flux", { exact: true })).toBeVisible();
  await expect(page.getByText("Elya Solen", { exact: true })).toBeVisible();
  await expect(page.locator("img")).toHaveCount(0);
});

test("les filtres et la recherche fonctionnent au clavier et annoncent les résultats", async ({ page }) => {
  await page.goto("/catalogue-demo");

  const twitchFilter = page.getByRole("button", { name: "Afficher les créateurs Twitch" });
  await twitchFilter.focus();
  await expect(twitchFilter).toBeFocused();
  await page.keyboard.press("Space");
  await expect(twitchFilter).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("[data-demo-card]")).toHaveCount(5);
  await expect(page.locator('[data-demo-card][data-universe="fiction"]')).toHaveCount(0);

  const search = page.getByRole("searchbox", { name: "Rechercher une carte" });
  await search.fill("Liora");
  await expect(page.locator("[data-demo-card]")).toHaveCount(1);
  await expect(page.getByRole("status")).toHaveText("1 carte affichée sur 10.");
  await search.fill("carte-qui-nexiste-pas");
  await expect(page.locator("[data-demo-card]")).toHaveCount(0);
  await expect(page.getByRole("status")).toContainText("Aucune carte ne correspond");

  await page.getByRole("button", { name: "Réinitialiser les filtres" }).click();
  await expect(page.locator("[data-demo-card]")).toHaveCount(10);
  await expect(page.getByRole("button", { name: "Afficher tout le classeur" })).toHaveAttribute("aria-pressed", "true");

  const fictionRanking = page.getByRole("button", { name: "Voir les cartes de Chroniques de Velune" });
  await fictionRanking.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#classeur")).toBeFocused();
  await expect(page.getByRole("button", { name: "Afficher Fiction, personnages fictifs" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('[data-demo-card][data-universe="fiction"]')).toHaveCount(5);
});

test("la mise en page reste lisible sans débordement sur les petits écrans", async ({ page }) => {
  await page.goto("/catalogue-demo");

  for (const width of [320, 360, 390, 412]) {
    await page.setViewportSize({ width, height: 844 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Ton classeur démo" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Créateurs Twitch" })).toBeVisible();

    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth,
    }));
    expect(dimensions.document, `débordement horizontal à ${width}px`).toBeLessThanOrEqual(dimensions.viewport);

    const filterButtons = page.getByRole("group", { name: "Filtrer les cartes par univers" }).getByRole("button");
    for (const button of await filterButtons.all()) {
      const box = await button.boundingBox();
      expect(box, "le filtre doit rester visible").not.toBeNull();
      expect(box!.height, "hauteur de cible tactile").toBeGreaterThanOrEqual(44);
    }

    if (width === 320 || width === 390) {
      await page.screenshot({ path: `test-results/catalogue-demo-${width}-${test.info().project.name}.png`, fullPage: true });
    }
  }
});

test("la page expose ses repères et commandes accessibles", async ({ page }) => {
  await page.goto("/catalogue-demo");

  const skipLink = page.getByRole("link", { name: "Passer directement au classeur" });
  await expect(skipLink).toHaveAttribute("href", "#classeur");
  await page.keyboard.press("Tab");
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.locator("#classeur")).toBeFocused();

  const search = page.getByRole("searchbox", { name: "Rechercher une carte" });
  await expect(search).toBeVisible();
  await expect(page.getByRole("group", { name: "Filtrer les cartes par univers" })).toBeVisible();

  const namedButtons = await page.getByRole("button").evaluateAll((buttons) =>
    buttons.every((button) => Boolean(button.getAttribute("aria-label")?.trim() || button.textContent?.trim())),
  );
  expect(namedButtons, "chaque bouton doit avoir un nom accessible").toBe(true);

  const headingCounts = await page.locator("h1").count();
  expect(headingCounts, "une seule hiérarchie principale").toBe(1);

  const images = page.getByRole("img", { name: /Visuel temporaire abstrait/ });
  await expect(images).toHaveCount(10);
  await expect(page.getByRole("progressbar")).toHaveCount(2);

  await search.focus();
  await expect(search).toBeFocused();
  const focusOutline = await search.evaluate((input) => getComputedStyle(input).outlineStyle);
  expect(focusOutline).not.toBe("none");
});
