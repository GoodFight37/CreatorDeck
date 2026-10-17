import { expect, test, gotoDeck, cloudUrl } from "./fixtures";

test("Drop garde le sachet visible et le CTA accessible sur mobile compact, Tribunal accessible", async ({ page }) => {
  await gotoDeck(page, true, { withoutCircle: true });
  await page.setViewportSize({ width: 320, height: 568 });
  const pack = page.locator(".home-view .pack-stage .pack-artwork");
  const open = page.getByRole("button", { name: "Ouvrir le booster", exact: true });
  const packBox = await pack.boundingBox();
  const openBox = await open.boundingBox();
  expect(packBox).not.toBeNull();
  expect(openBox).not.toBeNull();
  expect(packBox!.y).toBeGreaterThanOrEqual(0);
  expect(packBox!.y + packBox!.height).toBeLessThan(568 - 64);
  await open.scrollIntoViewIfNeeded();
  await expect(open).toBeInViewport();

  await page.setViewportSize({ width: 412, height: 915 });
  const entry = page.getByRole("button", { name: /Ouvrir le Tribunal des Bannis/ });
  const tallBox = await entry.boundingBox();
  await expect(entry.locator(".tribunal-entry-badge")).toHaveText("5");
  expect(tallBox).not.toBeNull();
  await entry.scrollIntoViewIfNeeded();
  await expect(entry).toBeInViewport();

  await page.setViewportSize({ width: 320, height: 568 });
  await entry.scrollIntoViewIfNeeded();
  await expect(entry).toBeVisible();
  await entry.click();
  await expect(page.getByRole("dialog", { name: "Tribunal des Bannis", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Accorder la grâce" })).toBeVisible();
  await page.getByRole("button", { name: "Accorder la grâce" }).click();
  await expect(page.locator(".tribunal-verdict-mark")).toHaveText("GRÂCE");
  await expect(page.locator(".tribunal-session-karma")).toContainText("1/5 jugés");
});

test("sons, musique et reflets actifs par défaut, OFF conservé au rechargement", async ({ page }) => {
  await gotoDeck(page);
  await page.getByRole("button", { name: "Toi", exact: true }).click();
  await page.locator(".profile-settings-fold > summary").click();
  const sound = page.getByRole("switch", { name: "Son de l’application", exact: true });
  const music = page.getByRole("switch", { name: "Musique", exact: true });
  const fx = page.getByRole("switch", { name: "Reflets des cartes", exact: true });
  await expect(sound).toHaveAttribute("aria-checked", "true");
  await expect(music).toHaveAttribute("aria-checked", "true");
  await expect(fx).toHaveAttribute("aria-checked", "true");
  await sound.click();
  await expect(music).toHaveAttribute("aria-checked", "true");
  await music.click();
  await fx.click();
  await gotoDeck(page, false);
  await page.getByRole("button", { name: "Toi", exact: true }).click();
  await page.locator(".profile-settings-fold > summary").click();
  await expect(sound).toHaveAttribute("aria-checked", "false");
  await expect(music).toHaveAttribute("aria-checked", "false");
  await expect(fx).toHaveAttribute("aria-checked", "false");
  await expect(page.locator("html")).toHaveAttribute("data-card-fx", "off");
});

test("avec le serveur : pack tutoriel invité, sans gain ni appel de tirage", async ({ page }) => {
  test.skip(!cloudUrl(), "build sans cloud : essai invité spécifique au cloud");
  let calls = 0;
  await page.route("**/rest/v1/rpc/open_pack", async (route) => { calls++; await route.abort(); });
  await gotoDeck(page, false);
  await page.getByRole("button", { name: "Essayer", exact: true }).click();
  await page.getByRole("button", { name: "Ouvrir sans déchirer" }).click();
  const reveal = page.getByRole("dialog", { name: "Résultat du booster" });
  await expect(reveal).toBeVisible();
  await reveal.getByRole("button", { name: "Fermer", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Mon compte", exact: true })).toBeVisible();
  expect(calls).toBe(0);
  await gotoDeck(page, false);
  await expect(page.locator(".open-panel").getByRole("button", { name: "Se connecter pour ouvrir", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Binder", exact: true }).click();
  await expect(page.locator(".binder-empty-state")).toBeVisible();
});
