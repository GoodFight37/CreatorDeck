import { expect, test, gotoDeck, cloudUrl } from "./fixtures";

test("Tribunal visible sans défilement, accessible en un appui", async ({ page }) => {
  await gotoDeck(page);
  for (const viewport of [{ width: 320, height: 568 }, { width: 412, height: 915 }]) {
    await page.setViewportSize(viewport);
    const entry = page.getByRole("button", { name: /Ouvrir le Tribunal des Bannis/ });
    const box = await entry.boundingBox();
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height).toBeLessThan(viewport.height - 64);
    await expect(entry.locator(".tribunal-entry-badge")).toHaveText("5");
  }
  await page.getByRole("button", { name: /Ouvrir le Tribunal des Bannis/ }).click();
  await expect(page.getByRole("dialog", { name: "Tribunal des Bannis", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Accorder la grâce" })).toBeVisible();
  await page.getByRole("button", { name: "Accorder la grâce" }).click();
  await expect(page.locator(".tribunal-verdict-mark")).toHaveText("GRÂCE");
  await expect(page.locator(".tribunal-session-karma")).toContainText("1/5 jugés");
});

test("son et reflets actifs par défaut, OFF conservé au rechargement", async ({ page }) => {
  await gotoDeck(page);
  await page.getByRole("button", { name: "Toi", exact: true }).click();
  const sound = page.getByRole("switch", { name: "Son", exact: true });
  const fx = page.getByRole("switch", { name: "Reflets des cartes", exact: true });
  await expect(sound).toHaveAttribute("aria-checked", "true");
  await expect(fx).toHaveAttribute("aria-checked", "true");
  await sound.click();
  await fx.click();
  await gotoDeck(page, false);
  await page.getByRole("button", { name: "Toi", exact: true }).click();
  await expect(sound).toHaveAttribute("aria-checked", "false");
  await expect(fx).toHaveAttribute("aria-checked", "false");
  await expect(page.locator("html")).toHaveAttribute("data-card-fx", "off");
});

test("avec le serveur : pack tutoriel invité, sans gain ni appel de tirage", async ({ page }) => {
  test.skip(!cloudUrl(), "build sans cloud : essai invité spécifique au cloud");
  let calls = 0;
  await page.route("**/rest/v1/rpc/open_pack", async (route) => { calls++; await route.abort(); });
  await gotoDeck(page, false);
  await page.getByRole("button", { name: "Essayer le pack tutoriel", exact: true }).click();
  await page.getByRole("button", { name: "Ouvrir sans déchirer" }).click();
  const reveal = page.getByRole("dialog", { name: "Résultat du booster" });
  await expect(reveal).toBeVisible();
  await reveal.getByRole("button", { name: "Fermer", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Mon compte", exact: true })).toBeVisible();
  expect(calls).toBe(0);
  await gotoDeck(page, false);
  await expect(page.getByRole("button", { name: "Se connecter pour ouvrir", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Binder", exact: true }).click();
  await expect(page.locator(".binder-empty-state")).toBeVisible();
});
