import { test, expect } from "./fixtures";

test("joueur neuf : ouvre un booster sans taper un seul nom", async ({ page }) => {
  await page.goto("/");
  const dialog = page.getByRole("dialog", { name: "Mes chaînes" });
  await expect(dialog).toBeVisible();
  await expect(dialog).not.toContainText(/encore \d+ pour|Compléter avec|entre 5/);
  await expect(dialog.locator(".circle-chip")).toHaveCount(0);
  await page.screenshot({ path: `test-results/cercle-facultatif-${test.info().project.name}.png` });
  await dialog.getByRole("button", { name: "Voir mon premier booster", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByRole("button", { name: "Ouvrir le booster", exact: true }).click();
  await page.getByRole("button", { name: "Ouvrir sans déchirer" }).click();
  const reveal = page.getByRole("dialog", { name: "Résultat du booster" });
  await expect(reveal).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("creatordeck.circle.v1") ?? "{}").slugs)).toEqual([]);
});
