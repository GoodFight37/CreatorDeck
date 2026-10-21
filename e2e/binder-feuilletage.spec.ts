import { expect, test, gotoDeck } from "./fixtures";
import creatorData from "../src/data/creators.json";
import type { Page } from "@playwright/test";

const longName = [...creatorData].sort((a, b) => b.displayName.length - a.displayName.length)[0];
const collection = [...creatorData.slice(0, 35), longName];

async function openBinder(page: Page) {
  await gotoDeck(page, true, { withoutCircle: true });
  // Collection factice du navigateur de test uniquement ; aucun RPC ni compte.
  await page.evaluate((creators) => {
    const key = Object.keys(localStorage).find((entry) => /^creatordeck.save.v\d+$/.test(entry));
    if (!key) throw new Error("Sauvegarde locale de test absente");
    const state = JSON.parse(localStorage.getItem(key)!);
    state.cards = creators.map((creator, i) => ({ id: `binder-${i}`, creatorSlug: creator.slug,
      rarity: creator.rarity, variant: "standard", obtainedAt: Date.now() - i * 1000, rareDrop: false }));
    localStorage.setItem(key, JSON.stringify(state));
  }, collection);
  await page.reload();
  await page.getByRole("button", { name: "Binder", exact: true }).click();
  await expect(page.locator(".binder-page")).toHaveAttribute("data-page", "1");
}

async function dragPage(page: Page, dx: number) {
  const surface = page.locator(".binder-surface");
  await surface.locator(".binder-card-slot").first().scrollIntoViewIfNeeded();
  const bounds = (await surface.boundingBox())!;
  const x = bounds.x + bounds.width * (dx < 0 ? .75 : .25);
  const y = Math.max(120, bounds.y + 80);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y + 2, { steps: 10 });
  await page.mouse.up();
}

test("les flèches tournent la feuille dans le bon sens sans sauter de page", async ({ page }) => {
  await openBinder(page);
  const sheet = page.locator(".binder-page");
  const next = page.getByRole("button", { name: "Suivant", exact: true });
  const previous = page.getByRole("button", { name: "Précédent", exact: true });
  await expect(previous).toBeDisabled();
  await page.evaluate(() => {
    const turns: { direction: string; animation: string }[] = [];
    (window as typeof window & { binderTurns?: typeof turns }).binderTurns = turns;
    new MutationObserver(() => {
      const sheet = document.querySelector<HTMLElement>(".binder-page")!;
      if (sheet.dataset.turn !== "none") turns.push({ direction: sheet.dataset.turn!, animation: getComputedStyle(sheet).animationName });
    }).observe(document.querySelector(".binder-surface")!, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-turn"] });
  });
  // Deux activations dans le même tour : aucune latence Playwright ne peut
  // déplacer le second appui après la fin légitime de l'animation.
  await next.evaluate((button) => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await expect(sheet).toHaveAttribute("data-page", "2");
  await expect(page.locator(".collection-grid .creator-card")).toHaveCount(12);
  await expect(previous).toBeEnabled();
  await previous.click();
  await expect(sheet).toHaveAttribute("data-page", "1");
  const turns = await page.evaluate(() => (window as typeof window & {
    binderTurns?: { direction: string; animation: string }[];
  }).binderTurns!);
  expect(turns).toContainEqual({ direction: "next", animation: "binder-sheet-turn" });
  expect(turns).toContainEqual({ direction: "previous", animation: "binder-sheet-turn" });
});

test("glisser feuillette, un petit geste revient et un tap ouvre toujours la fiche", async ({ page }) => {
  await openBinder(page);
  const sheet = page.locator(".binder-page");
  await dragPage(page, -150);
  await expect(sheet).toHaveAttribute("data-page", "2");
  await expect(page.getByRole("dialog", { name: /^Carte de / })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Précédent", exact: true })).toBeEnabled();
  await dragPage(page, 150);
  await expect(sheet).toHaveAttribute("data-page", "1");
  await expect(page.getByRole("button", { name: "Suivant", exact: true })).toBeEnabled();
  await dragPage(page, -30);
  await expect(sheet).toHaveAttribute("data-page", "1");
  await expect(page.getByRole("dialog", { name: /^Carte de / })).toHaveCount(0);
  await page.locator(".collection-grid .creator-card").first().click();
  await expect(page.getByRole("dialog", { name: /^Carte de / })).toBeVisible();
});

test("les bords et la recherche annulent le feuilletage sans avance différée", async ({ page }) => {
  await openBinder(page);
  const sheet = page.locator(".binder-page");
  await dragPage(page, 150);
  await expect(sheet).toHaveAttribute("data-page", "1");
  await page.getByRole("button", { name: "Suivant", exact: true }).click();
  await page.getByRole("textbox", { name: "Rechercher un créateur" }).fill(collection[0].displayName);
  await expect(sheet).toHaveAttribute("data-page", "1");
  await expect(sheet).toHaveAttribute("data-turn", "none");
  await page.waitForTimeout(450); // L'ancien secours ne doit pas rétablir sa page.
  await expect(sheet).toHaveAttribute("data-page", "1");
  await page.getByRole("textbox", { name: "Rechercher un créateur" }).fill("");
  await expect(sheet).toHaveAttribute("data-page", "1");
  // Les 36 obtenues d'abord : aucun dos sur la première page.
  await expect(page.locator(".collection-grid .creator-card.is-locked")).toHaveCount(0);
  const surface = page.locator(".binder-surface");
  await surface.focus();
  await page.keyboard.press("ArrowRight");
  await expect(sheet).toHaveAttribute("data-page", "2");
});

test("le défilement vertical sur les cartes reste un défilement", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Geste tactile réel émulé dans le projet téléphone");
  await openBinder(page);
  const bounds = (await page.locator(".binder-card-slot").nth(1).boundingBox())!;
  const x = bounds.x + bounds.width / 2;
  const y = bounds.y + bounds.height / 2;
  const before = await page.evaluate(() => window.scrollY);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
  for (let i = 1; i <= 8; i++) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x + 2, y: y - i * 18 }] });
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before + 30);
  await expect(page.locator(".binder-page")).toHaveAttribute("data-page", "1");
  await expect(page.getByRole("dialog", { name: /^Carte de / })).toHaveCount(0);
});

for (const mode of ["off", "reduce"] as const) {
  test(`le mode ${mode} feuillette immédiatement sans animation`, async ({ page }) => {
    if (mode === "off") await page.addInitScript(() => localStorage.setItem("creatordeck.tilt", "off"));
    else await page.emulateMedia({ reducedMotion: "reduce" });
    await openBinder(page);
    await page.getByRole("button", { name: "Suivant", exact: true }).click();
    await expect(page.locator(".binder-page")).toHaveAttribute("data-page", "2");
    await expect(page.locator(".binder-page")).toHaveCSS("animation-name", "none");
    await page.getByRole("button", { name: "Précédent", exact: true }).click();
    await expect(page.locator(".binder-page")).toHaveAttribute("data-page", "1");
  });
}

test("les noms longs et les pochettes restent lisibles à 320 et 390 px", async ({ page }) => {
  await openBinder(page);
  await page.getByRole("textbox", { name: "Rechercher un créateur" }).fill(longName.displayName);
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    // Le nom est imprimé sur la carte (plus répété dans la légende d'une carte possédée).
    const caption = page.locator(".collection-grid .creator-card h3");
    await expect(caption).toHaveText(longName.displayName);
    expect(await caption.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await expect(page.locator(".binder-pager")).toHaveCount(0);
  }
  await page.getByRole("textbox", { name: "Rechercher un créateur" }).fill("");
  await page.screenshot({ path: `test-results/binder-feuille-${test.info().project.name}.png`, fullPage: true });
});
