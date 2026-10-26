import { expect, test, cloudUrl } from "./fixtures";
import { prepareActivities } from "./activities-fixture";

for (const [label, rpc, panel, reserve] of [
  ["MEMES", "meme_status", 'section[aria-label="Réserve MEMES"]', ".meme-booster-reserve"],
  ["IMGFLIP", "imgflip_status", 'section[aria-label="Réserve IMGFLIP"]', ".imgflip-booster-reserve"],
]) test(`avec le serveur : ${label} distingue une panne de réserve de la nouvelle lecture`, async ({ page }) => {
  test.skip(!cloudUrl(), "Panne et reprise simulées.");
  await prepareActivities(page);
  let attempts = 0;
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route(`**/rpc/${rpc}`, async route => {
    if (++attempts === 1) return route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ message: "Panne simulée" }) });
    await gate;
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ stock: 4, next_at: null, openings: 0, owned: [] }) });
  });
  await page.goto("/");
  await page.getByRole("button", { name: label, exact: true }).click();
  await expect(page.locator(reserve)).toHaveText(`Réserve ${label} indisponible.`);
  await page.locator(panel).getByRole("button", { name: "Réessayer la lecture" }).click();
  try {
    await expect(page.locator(reserve)).toHaveText("Lecture de ta réserve…");
    await expect(page.locator(`${panel} [role=alert]`)).toHaveCount(0);
  } finally { release(); }
  await expect(page.locator(reserve)).toHaveText(`4 ${label}`);
});

test("avec le serveur : les sachets préparés restent au milieu et gardent leur taille", async ({ page }) => {
  test.skip(!cloudUrl(), "Réserves simulées, aucun tirage.");
  const fixture = await prepareActivities(page);
  await page.route(/\/rpc\/(meme_status|imgflip_status)$/, route => route.fulfill({ status: 200,
    contentType: "application/json", body: JSON.stringify({ stock: 4, next_at: null, openings: 0, owned: [] }) }));
  await page.goto("/");
  for (const [width, height] of [[320, 568], [390, 844], [844, 390]]) {
    await page.setViewportSize({ width, height });
    for (const label of ["Live Drop", "MEMES", "IMGFLIP"]) {
      await page.getByRole("button", { name: label, exact: true }).click();
      const pack = page.locator('.booster-pack-slot[data-active="true"] button.pack-artwork');
      await expect(pack).toBeEnabled();
      await pack.evaluate(async node => {
        await Promise.all(node.closest(".booster-pack-slot")!.getAnimations().map(animation => animation.finished.catch(() => {})));
      });
      const before = (await pack.boundingBox())!;
      await pack.click();
      const opening = page.locator('.opening-continuum[data-opening-phase="sealed"]');
      await expect(opening).toBeVisible();
      const scene = opening.locator(".booster-physical-scene");
      await expect.poll(async () => { const box = (await scene.boundingBox())!; return Math.abs(box.y + box.height / 2 - height / 2); }).toBeLessThan(8);
      const prepared = (await scene.boundingBox())!;
      expect(Math.abs(prepared.width - before.width)).toBeLessThan(before.width * .06);
      await page.keyboard.press("Escape");
      await expect(opening).toHaveCount(0);
    }
  }
  expect(fixture.requests.some(name => name.startsWith("open_"))).toBe(false);
});

test("avec le serveur : les trois réserves partagent le renouvellement de connexion", async ({ page }) => {
  test.skip(!cloudUrl(), "Session et réserves simulées.");
  const fixture = await prepareActivities(page, { expiredSession: true });
  let renewals = 0;
  await page.route("**/auth/v1/token?grant_type=refresh_token", async route => {
    const index = ++renewals;
    await new Promise(resolve => setTimeout(resolve, index * 150));
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
      access_token: `renewed-${index}`, refresh_token: `refresh-${index}`, expires_in: 3600,
      user: { id: "11111111-1111-4111-8111-111111111111" },
    }) });
  });
  await page.route(/\/rpc\/(meme_status|imgflip_status)$/, route => route.fulfill({ status: 200,
    contentType: "application/json", body: JSON.stringify({ stock: 4, next_at: null, openings: 0, owned: [] }) }));
  await page.goto("/");
  await page.getByRole("button", { name: "MEMES", exact: true }).click();
  await expect(page.locator(".meme-booster-reserve")).toHaveText("4 MEMES");
  await expect(page.getByRole("region", { name: "Réserve MEMES" }).getByRole("alert")).toHaveCount(0);
  await page.getByRole("button", { name: "IMGFLIP", exact: true }).click();
  await expect(page.locator(".imgflip-booster-reserve")).toHaveText("4 IMGFLIP");
  await expect(page.getByRole("region", { name: "Réserve IMGFLIP" }).getByRole("alert")).toHaveCount(0);
  expect(renewals).toBe(1);
  expect(fixture.requests.some(name => name.startsWith("open_"))).toBe(false);
});
