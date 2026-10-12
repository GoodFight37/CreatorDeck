import { expect, test, gotoDeck } from "./fixtures";

test("opening alone loads a mesh, follows peel, and keeps its node through the first face", async ({ page }) => {
  await page.addInitScript(() => { history.replaceState(null, "", "?opening3d=1"); });
  await gotoDeck(page);
  await expect(page.locator(".opening-foil-3d canvas")).toHaveCount(0);
  await page.getByRole("button", { name: "Ouvrir le booster" }).click();
  const root = page.locator(".opening-continuum");
  const mesh = root.locator('.opening-foil-3d[data-foil-renderer="webgl"]');
  await expect(mesh).toBeAttached({ timeout: 30_000 });
  const identity = await root.elementHandle();
  const canvas = mesh.locator("canvas");
  await expect(canvas).toBeVisible();
  await expect(root.locator(".foil-body-piece")).toBeHidden();
  const idle = await canvas.getAttribute("data-foil-frames");
  await page.waitForTimeout(150);
  expect(await canvas.getAttribute("data-foil-frames")).toBe(idle);
  const before = await canvas.screenshot();
  const seam = root.getByRole("button", { name: "Déchirer le sachet en passant le doigt sur sa soudure" });
  const box = (await seam.boundingBox())!;
  await page.mouse.move(box.x + box.width * .1, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * .4, box.y + box.height / 2, { steps: 8 });
  expect(Number(await canvas.getAttribute("data-foil-frames"))).toBeGreaterThan(Number(idle));
  expect((await canvas.screenshot()).equals(before)).toBe(false);
  await page.mouse.up();
  await expect(root).toHaveAttribute("data-opening-phase", "sealed");
  await page.screenshot({ path: `test-results/mesh-${test.info().project.name}-sealed.png` });
  await page.mouse.move(box.x + box.width * .1, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * .8, box.y + box.height / 2, { steps: 12 });
  await page.mouse.up();
  await expect(root).toHaveAttribute("data-opening-phase", "revealing");
  expect(await identity!.evaluate(node => node === document.querySelector(".opening-continuum"))).toBe(true);
  await expect(root.locator("canvas")).toBeAttached();
  await expect(root.locator(".reveal-embedded")).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await expect(root.locator(".reveal-next")).toBeEnabled();
  await root.getByRole("button", { name: "Fermer", exact: true }).click();
  await expect(page.locator(".opening-foil-3d canvas")).toHaveCount(0);
});

test("lost WebGL restores the 2D pouch and keeps the opening usable", async ({ page }) => {
  await page.addInitScript(() => { history.replaceState(null, "", "?opening3d=1"); });
  await gotoDeck(page);
  await page.getByRole("button", { name: "Ouvrir le booster" }).click();
  const root = page.locator(".opening-continuum");
  await expect(root.locator('[data-foil-renderer="webgl"]')).toBeAttached({ timeout: 30_000 });
  await root.locator("canvas").evaluate(canvas => {
    const gl = (canvas as HTMLCanvasElement).getContext("webgl2");
    gl!.getExtension("WEBGL_lose_context")!.loseContext();
  });
  await expect(root.locator('[data-foil-renderer="2d"]')).toBeAttached();
  await expect(root.locator("canvas")).toHaveCount(0);
  await expect(root.locator(".foil-body-piece")).toBeVisible();
  await root.getByRole("button", { name: "Ouvrir sans déchirer" }).click();
  await expect(root).toHaveAttribute("data-opening-phase", "revealing");
});

test("reduced motion uses the continuous 2D fallback without loading a canvas", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => { history.replaceState(null, "", "?opening3d=1"); });
  await gotoDeck(page);
  await page.getByRole("button", { name: "Ouvrir le booster" }).click();
  const root = page.locator(".opening-continuum");
  await expect(root.locator(".foil-body-piece")).toBeVisible();
  await expect(root.locator("canvas")).toHaveCount(0);
  await root.getByRole("button", { name: "Ouvrir sans déchirer" }).click();
  await expect(root).toHaveAttribute("data-opening-phase", "revealing");
  await expect(root.locator("canvas")).toHaveCount(0);
});


test("default opening is clean 2D and manual recovery keeps the same scene", async ({ page }) => {
  await gotoDeck(page);
  await page.getByRole("button", { name: "Ouvrir le booster" }).click();
  const root = page.locator(".opening-continuum");
  const identity = await root.elementHandle();
  await expect(root.locator('[data-foil-status="disabled"]')).toBeAttached();
  await expect(root.locator("canvas")).toHaveCount(0);
  await expect(root.locator(".foil-material-sheen")).toHaveCount(0);
  await expect(root.locator(".foil-printed-art").first()).toHaveAttribute("src", "/packs/live-opening.svg");
  await root.getByRole("button", { name: "Ouvrir sans déchirer" }).click();
  await root.getByRole("button", { name: "Afficher les cartes" }).click();
  await expect(root).toHaveAttribute("data-opening-phase", "revealing");
  expect(await identity!.evaluate(node => node === document.querySelector(".opening-continuum"))).toBe(true);
  await expect(root.locator(".reveal-next")).toBeEnabled();
});

for (const gesture of ["peel", "link"] as const) {
  test(`default ${gesture} reaches the first face on animationend with the watchdog frozen`, async ({ page }) => {
    await gotoDeck(page);
    await page.getByRole("button", { name: "Ouvrir le booster" }).click();
    const root = page.locator(".opening-continuum");
    // Allow the local draw to finish, then freeze JS timers but not native CSS.
    await page.waitForTimeout(750);
    await page.clock.install();
    await page.clock.pauseAt(new Date());
    if (gesture === "link") {
      await root.getByRole("button", { name: "Ouvrir sans déchirer" }).click();
    } else {
      const seam = root.getByRole("button", { name: "Déchirer le sachet en passant le doigt sur sa soudure" });
      const bounds = (await seam.boundingBox())!;
      await page.mouse.move(bounds.x + bounds.width * .1, bounds.y + bounds.height / 2);
      await page.mouse.down();
      await page.mouse.move(bounds.x + bounds.width * .8, bounds.y + bounds.height / 2, { steps: 12 });
      await page.mouse.up();
    }
    await expect(root).toHaveAttribute("data-opening-phase", "revealing");
    await expect(root.locator(".reveal-embedded")).toBeVisible();
    await expect(root.locator("canvas")).toHaveCount(0);
    await expect(page.getByRole("dialog")).toHaveCount(1);
    await page.clock.resume();
  });
}
