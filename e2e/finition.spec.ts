import { test, expect } from "./fixtures";
import type { Locator } from "@playwright/test";
import creators from "../src/data/creators.json";

test("téléphone : portrait plein cadre et même nom Atelier dans la barre et le titre", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/*", (route) => ["localhost", "127.0.0.1"].includes(new URL(route.request().url()).hostname)
    ? route.continue() : route.abort());
  await page.addInitScript(() => {
    localStorage.setItem("creatordeck-tutorial:local", "done");
    localStorage.setItem("creatordeck-tutorial:completed:local", "done");
    localStorage.setItem("creatordeck.circle.v1", JSON.stringify({ v: 1, slugs: ["ibai", "ninja", "rubius", "xqc", "shroud"], at: 1 }));
  });
  await page.goto("/");
  await expect(page.locator(".home-view")).toBeVisible();
  await page.evaluate((creator) => {
    const key = Object.keys(localStorage).find((key) => /^creatordeck.save.v\d+$/.test(key))!;
    const state = JSON.parse(localStorage.getItem(key)!);
    state.cards = [{ id: "portrait-cercle", creatorSlug: creator.slug, rarity: creator.rarity,
      variant: "standard", obtainedAt: Date.now(), rareDrop: false }, { id: "portrait-gold",
      creatorSlug: creator.slug, rarity: creator.rarity, variant: "gold", obtainedAt: Date.now() - 1, rareDrop: false }];
    localStorage.setItem(key, JSON.stringify(state));
  }, creators.find((creator) => creator.slug === "ibai")!);
  await page.reload();
  await page.getByRole("button", { name: "Binder", exact: true }).click();
  // Classeur puis fiche Gold : le visage remplit la carte (cover), rogné sur les
  // côtés, sans déformation ni bande noire, et la Gold garde sa matière CSS.
  await fullFrame(page.locator(".collection-grid .creator-card").first());
  await page.getByRole("button", { name: "Voir la fiche de ibai", exact: true }).click();
  const vault = page.locator(".card-vault .binder-feature-card");
  await expect(vault).toHaveClass(/variant-gold/);
  await fullFrame(vault);
  await expect(vault.locator(".card-foil")).not.toHaveAttribute("style", /./);
  expect(await vault.locator(".card-foil").evaluate((node) => getComputedStyle(node).backgroundImage)).toContain("221, 164, 74");
  await page.getByRole("group", { name: "Variantes possédées" }).getByRole("button", { name: "Standard ×1" }).click();
  await expect(vault).toHaveClass(/variant-standard/);
  await fullFrame(vault);
  await page.screenshot({ path: "test-results/finition-portrait-cercle.png" });
  await page.locator('.card-vault button[aria-label="Fermer"]').click();
  await page.getByRole("button", { name: "Atelier", exact: true }).click();
  await expect(page.locator(".atelier-view h1")).toHaveText("Atelier");
  await expect(page.getByRole("button", { name: "Craft", exact: true })).toHaveCount(0);
  await page.screenshot({ path: "test-results/finition-atelier.png" });
});

async function fullFrame(card: Locator) {
  const photo = card.locator(".card-photo");
  await expect(photo).toBeVisible();
  await expect(photo).toHaveCSS("object-fit", "cover");
  await expect(photo).toHaveCSS("transform", "none");
  await expect.poll(() => photo.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
  const image = (await photo.boundingBox())!;
  const wrap = (await card.locator(".card-photo-wrap").boundingBox())!;
  // Le portrait touche les quatre bords du cadre.
  expect(Math.abs(image.x - wrap.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(image.y - wrap.y)).toBeLessThanOrEqual(1);
  expect(Math.abs(image.x + image.width - (wrap.x + wrap.width))).toBeLessThanOrEqual(1);
  expect(Math.abs(image.y + image.height - (wrap.y + wrap.height))).toBeLessThanOrEqual(1);
  expect(wrap.height).toBeGreaterThan(wrap.width);
}
