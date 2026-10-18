import { expect, test, gotoDeck } from "./fixtures";
import creatorData from "../src/data/creators.json";
import type { Page } from "@playwright/test";

const legendary = creatorData.find((creator) => creator.rarity === "legendary")!;
const common = creatorData.find((creator) => creator.rarity === "common")!;
const rare = creatorData.find((creator) => creator.rarity === "rare")!;
const epic = creatorData.find((creator) => creator.rarity === "epic")!;
async function binder(page: Page) {
  await gotoDeck(page, true, { withoutCircle: true });
  await page.evaluate(({ legendary, common, rare, epic }) => {
    const key = Object.keys(localStorage).find((entry) => /^creatordeck.save.v\d+$/.test(entry))!;
    const state = JSON.parse(localStorage.getItem(key)!);
    const cards = [
      ...["standard", "standard", "live", "holo", "gold"].map((variant) => ({ creator: legendary, variant })),
      ...[common, rare, epic].map((creator) => ({ creator, variant: "standard" })),
    ];
    state.cards = cards.map(({ creator, variant }, i) => ({ id: `material-${i}`, creatorSlug: creator.slug,
      rarity: creator.rarity, variant, rareDrop: false, obtainedAt: Date.now() - i * 1000 }));
    localStorage.setItem(key, JSON.stringify(state));
  }, { legendary, common, rare, epic });
  await page.reload();
  await page.getByRole("button", { name: "Binder", exact: true }).click();
}

test("la matière distingue les raretés sans animation continue ni portrait masqué", async ({ page }) => {
  await binder(page);
  const opacity = (rarity: string) => page.locator(`.collection-grid .rarity-${rarity} .card-foil`)
    .evaluate((node) => Number(getComputedStyle(node).opacity));
  // D-148 : chaque rareté a sa matière, la Commune comprise (la plus discrète).
  expect(await opacity("common")).toBeGreaterThan(0);
  expect(await opacity("rare")).toBeGreaterThan(await opacity("common"));
  expect(await opacity("epic")).toBeGreaterThan(await opacity("rare"));
  expect(await opacity("legendary")).toBeGreaterThan(await opacity("epic"));
  await expect(page.locator(".collection-grid .rarity-legendary .card-identity")).toBeHidden();
  await expect(page.locator(".collection-grid .rarity-rare .card-foil")).toHaveCSS("animation-name", "none");
  // Le survol doit viser une carte, sans tomber sur les outils sticky.
  await page.locator(".collection-grid .creator-card").first().hover();
  expect(await page.locator(".binder-surface").evaluate((node) => (node as HTMLElement).style.getPropertyValue("--binder-light-x"))).not.toBe("");
  await page.screenshot({ path: `test-results/binder-matieres-${test.info().project.name}.png`, fullPage: true });
});

test("la fiche présente les variantes possédées et leurs vrais compteurs", async ({ page }) => {
  await binder(page);
  const trigger = page.locator(".collection-grid .rarity-legendary .creator-card-inspect");
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: `Carte de ${legendary.displayName}` });
  await expect(dialog).toHaveClass(/card-vault/);
  await expect(dialog).toBeFocused();
  await expect(dialog.locator(".card-rarity-label")).toHaveText("Légendaire");
  await expect(dialog.locator(".binder-feature-card")).toHaveCSS("animation-name", "card-vault-ink");
  expect(await dialog.locator(".binder-feature-card").evaluate((node) =>
    Number.parseFloat(getComputedStyle(node, "::after").borderTopWidth))).toBe(3);
  await expect(page.locator(".app-shell")).toHaveJSProperty("inert", true);
  const variants = dialog.getByRole("group", { name: "Variantes possédées" });
  await expect(variants.getByRole("button")).toHaveCount(4);
  await expect(variants.getByRole("button", { name: "Gold ×1" })).toHaveAttribute("aria-pressed", "true");
  await variants.getByRole("button", { name: "Standard ×2" }).click();
  await expect(dialog.locator(".binder-feature-card")).toHaveClass(/variant-standard/);
  await expect(dialog.locator(".odds-intro")).toHaveText("5 exemplaires au total · Standard : 2.");
  await variants.getByRole("button", { name: "Holographique ×1" }).click();
  await expect(dialog.locator(".odds-intro")).toHaveText("5 exemplaires au total · Holographique : 1.");
  await variants.getByRole("button", { name: "Gold ×1" }).click();
  await page.screenshot({ path: `test-results/binder-fiche-${test.info().project.name}.png` });
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(page.locator(".app-shell")).toHaveJSProperty("inert", false);
  await expect(trigger).toBeFocused();
});

test("les dos et la fiche manquante restent anonymes et consultables", async ({ page }) => {
  await binder(page);
  await page.getByRole("button", { name: "À découvrir", exact: true }).click();
  await expect(page.locator(".binder-back-seal")).toHaveCount(12);
  await expect(page.locator(".collection-grid .card-photo")).toHaveCount(0);
  await page.locator(".collection-grid .creator-card").first().click();
  const dialog = page.locator(".card-vault");
  await expect(dialog.locator(".inspect-back-seal")).toBeVisible();
  await expect(dialog.locator(".card-photo")).toHaveCount(0);
  await expect(dialog.getByRole("group", { name: "Variantes possédées" })).toHaveCount(0);
  await page.screenshot({ path: `test-results/binder-dos-${test.info().project.name}.png` });
  for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 1280, height: 900 }]) {
    await page.setViewportSize(viewport);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width);
    await expect(dialog.getByRole("button", { name: "Fermer", exact: true }).first()).toBeInViewport();
  }
  await dialog.getByRole("button", { name: "Fermer", exact: true }).last().click();
  await expect(dialog).toHaveCount(0);
});

for (const mode of ["off", "reduce"] as const) {
  test(`les matières et la fiche respectent le mode ${mode}`, async ({ page }) => {
    if (mode === "off") await page.addInitScript(() => localStorage.setItem("creatordeck.tilt", "off"));
    else await page.emulateMedia({ reducedMotion: "reduce" });
    await binder(page);
    await expect(page.locator(".collection-grid .rarity-legendary .card-foil")).toHaveCSS("display", "none");
    await page.locator(".collection-grid .rarity-legendary").click();
    await expect(page.locator(".card-vault .card-foil")).toHaveCSS("display", "none");
    await expect(page.locator(".card-vault .binder-feature-card")).toHaveCSS("animation-name", "none");
    await expect(page.locator(".binder-feature-card")).toHaveCSS("transform", "none");
    await page.keyboard.press("Escape");
    await expect(page.locator(".card-vault")).toHaveCount(0);
  });
}
