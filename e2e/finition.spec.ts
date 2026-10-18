import { test, expect } from "./fixtures";
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
      variant: "standard", obtainedAt: Date.now(), rareDrop: false }];
    localStorage.setItem(key, JSON.stringify(state));
  }, creators.find((creator) => creator.slug === "ibai")!);
  await page.reload();
  await page.getByRole("button", { name: "Binder", exact: true }).click();
  await page.getByRole("button", { name: "Voir la fiche de ibai", exact: true }).click();
  const photo = page.locator(".card-vault .card-photo");
  await expect(photo).toBeVisible();
  // Plein cadre : le carré Twitch est rogné, jamais rétréci au milieu d'un cadre noir.
  await expect(photo).toHaveCSS("object-fit", "cover");
  await expect(photo).toHaveCSS("transform", "none");
  await expect.poll(() => photo.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
  const bounds = (await photo.boundingBox())!;
  const wrap = (await page.locator(".card-vault .card-photo-wrap").boundingBox())!;
  for (const [a, b] of [[bounds.x, wrap.x], [bounds.y, wrap.y], [bounds.x + bounds.width, wrap.x + wrap.width], [bounds.y + bounds.height, wrap.y + wrap.height]]) {
    expect(Math.abs(a - b)).toBeLessThanOrEqual(1);
  }
  expect(bounds.height).toBeGreaterThan(bounds.width);
  await expect(page.locator(".card-vault .card-foil")).not.toHaveAttribute("style", /./);
  await page.screenshot({ path: "test-results/finition-portrait-cercle.png" });
  await page.locator('.card-vault button[aria-label="Fermer"]').click();
  await page.getByRole("button", { name: "Atelier", exact: true }).click();
  await expect(page.locator(".atelier-view h1")).toHaveText("Atelier");
  await expect(page.getByRole("button", { name: "Craft", exact: true })).toHaveCount(0);
  await page.screenshot({ path: "test-results/finition-atelier.png" });
});
