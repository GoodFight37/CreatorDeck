import { expect, test, gotoDeck } from "./fixtures";

const tabs = ["Binder", "Drop", "Objectifs"] as const;

async function sampleFrames(page: import("@playwright/test").Page, windowMs = 600) {
  return page.evaluate((durationMs) => new Promise<{ frames: number; slowFrames: number; maxFrameMs: number }>((resolve) => {
    const samples: number[] = [];
    const start = performance.now();
    let last = start;
    function frame(now: number) {
      samples.push(now - last);
      last = now;
      if (now - start < durationMs) requestAnimationFrame(frame);
      else resolve({ frames: samples.length, slowFrames: samples.filter((ms) => ms > 50).length,
        maxFrameMs: Math.round(Math.max(0, ...samples)) });
    }
    requestAnimationFrame(frame);
  }), windowMs);
}

for (const [width, height] of [[320, 568], [390, 844], [412, 915]] as const) {
  test(`observation mobile ${width}×${height} : trois espaces visibles, sans débordement`, async ({ page }) => {
    test.skip(test.info().project.name !== "téléphone", "Parcours réservé au profil tactile.");
    await page.setViewportSize({ width, height });
    await page.route("**/*", (route) => ["localhost", "127.0.0.1"].includes(new URL(route.request().url()).hostname)
      ? route.continue() : route.abort());
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await gotoDeck(page);
    // Le portail de diagnostic Next en mode dev peut recouvrir le dock à 320 px.
    await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
    const metrics = [];
    for (const tab of tabs) {
      const button = page.getByRole("button", { name: tab, exact: true });
      const framePromise = sampleFrames(page);
      const start = Date.now();
      await button.click({ force: true });
      await expect(button).toHaveAttribute("aria-current", "page");
      await expect(button).toBeInViewport();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      const interactionMs = Date.now() - start;
      const frame = await framePromise;
      metrics.push({ tab, interactionMs, ...frame });
      const capture = test.info().outputPath(`${width}-${tab.toLowerCase()}.png`);
      await page.screenshot({ path: capture });
      await test.info().attach(`${width}-${tab}`, { path: capture, contentType: "image/png" });
    }
    await test.info().attach(`mesures-${width}`, { body: Buffer.from(JSON.stringify(metrics, null, 2)), contentType: "application/json" });
    expect(errors).toEqual([]);
  });
}

test("observation mobile : ouverture du sachet et révélation capturées", async ({ page }) => {
  test.skip(test.info().project.name !== "téléphone", "Parcours réservé au profil tactile.");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/*", (route) => ["localhost", "127.0.0.1"].includes(new URL(route.request().url()).hostname)
    ? route.continue() : route.abort());
  await gotoDeck(page);
  await page.getByRole("button", { name: "Ouvrir le booster", exact: true }).tap();
  const scene = page.locator(".opening-continuum");
  await expect(scene).toBeVisible();
  const sealed = test.info().outputPath("sachet-ferme.png");
  await page.screenshot({ path: sealed });
  await test.info().attach("sachet-ferme", { path: sealed, contentType: "image/png" });
  const revealFrames = sampleFrames(page, 1200);
  await scene.getByRole("button", { name: "Ouvrir sans déchirer" }).tap();
  await expect(page.getByRole("dialog", { name: "Résultat du booster" })).toBeVisible();
  await expect(page.locator(".reveal-next")).toBeEnabled();
  const reveal = test.info().outputPath("revelation.png");
  await page.screenshot({ path: reveal });
  await test.info().attach("revelation", { path: reveal, contentType: "image/png" });
  await test.info().attach("fluidite-revelation", { body: Buffer.from(JSON.stringify(await revealFrames)), contentType: "application/json" });
});

test("diagnostic mobile : option volontaire, aucun contenu conservé, effacement à l'arrêt", async ({ page }) => {
  test.skip(test.info().project.name !== "téléphone", "Parcours réservé au profil tactile.");
  await gotoDeck(page);
  await page.getByRole("button", { name: /^Réglages/ }).click();
  await page.locator(".settings-advanced > summary").click();
  const option = page.getByRole("switch", { name: "Diagnostics sur cet appareil" });
  await expect(option).toHaveAttribute("aria-checked", "false");
  await option.tap();
  await expect(option).toHaveAttribute("aria-checked", "true");
  const saved = await page.evaluate(() => {
    window.dispatchEvent(new ErrorEvent("error", { message: "secret-ne-jamais-stocker" }));
    return localStorage.getItem("creatordeck.diagnostics.events.v1");
  });
  expect(saved).toContain("script-error");
  expect(saved).not.toContain("secret-ne-jamais-stocker");
  await option.tap();
  await expect(option).toHaveAttribute("aria-checked", "false");
  expect(await page.evaluate(() => localStorage.getItem("creatordeck.diagnostics.events.v1"))).toBeNull();
});
