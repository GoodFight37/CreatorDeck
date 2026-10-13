import { expect, test, gotoDeck } from "./fixtures";

test("booster remains CSS-only when the retired WebGL preview flag is present", async ({ page }) => {
  await page.addInitScript(() => { localStorage.clear(); history.replaceState(null, "", "?opening3d=1"); });
  await gotoDeck(page);
  await page.getByRole("button", { name: "Ouvrir le booster" }).click();
  const root = page.locator(".opening-continuum");
  await expect(root.locator("canvas")).toHaveCount(0);
  await expect(root.locator(".foil-body-piece")).toBeVisible();
  await root.getByRole("button", { name: "Ouvrir sans déchirer" }).click();
  await expect(root).toHaveAttribute("data-opening-phase", "revealing");
  await expect(root.locator("canvas")).toHaveCount(0);
});

test("CSS-only pouch keeps the same opening scene through the first face", async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await gotoDeck(page);
  await page.getByRole("button", { name: "Ouvrir le booster" }).click();
  const root = page.locator(".opening-continuum");
  const identity = await root.elementHandle();
  await expect(root.locator(".foil-body-piece")).toBeVisible();
  await expect(root.locator("canvas")).toHaveCount(0);
  await root.getByRole("button", { name: "Ouvrir sans déchirer" }).click();
  await expect(root).toHaveAttribute("data-opening-phase", "revealing");
  expect(await identity!.evaluate(node => node === document.querySelector(".opening-continuum"))).toBe(true);
  await expect(root.locator(".reveal-next")).toBeEnabled();
});
