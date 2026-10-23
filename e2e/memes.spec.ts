import { expect, test } from "@playwright/test";
import { cloudUrl } from "./fixtures";
import source from "../src/data/memes-fr.json";
import imgflipSource from "../src/data/imgflip.json";

/** La collection Mèmes compte les deux catalogues affichés (FR + Imgflip). */
const COLLECTION_TOTAL = source.length + imgflipSource.length;

test("l'univers Mèmes présente un booster et un classeur séparés sur téléphone", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/memes");
  await expect(page.getByRole("heading", { name: "MÈMES", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "OUVRIR UN BOOSTER" })).toBeDisabled();
  await expect(page.getByText(`0 / ${COLLECTION_TOTAL}`)).toBeVisible();
  await expect(page.locator(".meme-grid .meme-slot")).toHaveCount(12);
  await page.screenshot({ path: `test-results/memes-${test.info().project.name}.png` });
  await page.locator(".meme-grid .meme-slot").first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Fermer" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByPlaceholder("Nom ou numéro").fill("Risitas");
  await expect(page.locator(".meme-grid .meme-slot")).toHaveCount(1);
  await page.getByText("Composition du booster").click();
  await expect(page.getByText(/Rare 82 %/)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test("la grande carte Mèmes réagit au geste et respecte Reflets désactivés", async ({ page }) => {
  await page.goto("/memes");
  await page.getByPlaceholder("Nom ou numéro").fill("Non mais allô, quoi");
  await page.locator(".meme-slot").first().click();
  const card = page.locator(".meme-inspect .meme-card");
  const foil = card.locator(".meme-card-foil");
  await expect(card).toHaveClass(/is-reactive/);
  const box = (await card.boundingBox())!;
  await page.mouse.move(box.x + box.width * .75, box.y + box.height * .35);
  await expect.poll(() => foil.evaluate((element) => element.style.getPropertyValue("--px"))).toBe("75.0%");
  await page.evaluate(() => document.documentElement.setAttribute("data-card-fx", "off"));
  await expect(foil).toHaveCSS("display", "none");
  await page.mouse.move(box.x + box.width * .25, box.y + box.height * .6);
  await expect(foil).toHaveAttribute("style", /--px: 75\.0%/);
  await page.evaluate(() => document.documentElement.removeAttribute("data-card-fx"));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(foil).toHaveCSS("display", "none");
  await page.getByRole("button", { name: "Fermer" }).click();
  await page.getByPlaceholder("Nom ou numéro").fill("Martine — Full Art");
  await page.locator(".meme-slot").first().click();
  await expect(page.locator(".meme-inspect .meme-card")).toHaveClass(/is-full-art/);
});

test("avec le serveur : le booster Mèmes se déchire, retourne cinq cartes et tient son récap", async ({ page }) => {
  test.skip(!cloudUrl(), "Cloud factice requis pour simuler les RPC Mèmes.");
  const ids = [
    ...source.filter((card) => card.rarity === "common" && card.image).slice(0, 3).map((card) => card.id),
    source.find((card) => card.rarity === "epic" && card.image)!.id,
    source.find((card) => card.rarity === "rare" && card.image)!.id,
  ];
  let draws = 0;
  await page.route("**/rest/v1/rpc/meme_*", async (route) => {
    const owned = draws ? ids.map((id) => ({ id, copies: 1 })) : [];
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ stock: draws ? 3 : 4, next_at: null, openings: draws, owned }) });
  });
  await page.route("**/rest/v1/rpc/open_meme_pack", async (route) => {
    draws++;
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ cards: ids, stock: 3, next_at: null, replayed: false }) });
  });
  await page.addInitScript(() => localStorage.setItem("creatordeck.cloud.session", JSON.stringify({
    accessToken: "fake-token", refreshToken: "fake-refresh", expiresAt: Date.now() + 3_600_000,
    userId: "11111111-1111-4111-8111-111111111111", email: "test@example.invalid",
  })));
  await page.goto("/memes");
  await page.getByRole("button", { name: "OUVRIR UN BOOSTER" }).click();
  const scene = page.locator(".opening-continuum");
  await expect(scene).toHaveAttribute("data-opening-phase", "sealed");
  await expect(scene.locator(".booster-opening-instruction")).toHaveText("TIRE");
  await expect(scene.locator(".foil-printed-art").first()).toHaveAttribute("src", /memes-opening/);
  await page.screenshot({ path: `test-results/memes-peel-${test.info().project.name}.png` });
  const zone = (await scene.locator(".booster-peel-zone").boundingBox())!;
  const x = zone.x + zone.width * .04, y = zone.y + zone.height * .65;
  await page.mouse.move(x, y); await page.mouse.down();
  await page.mouse.move(x + zone.width * .92, y - zone.height * .95, { steps: 12 });
  await expect(scene.locator(".booster-opening-instruction")).toHaveText("RELÂCHE");
  await page.mouse.up();
  await expect(scene.locator(".foil-back-card")).toHaveCount(5);
  await expect(scene.locator(".meme-reveal-flow")).toBeVisible();
  const revealedTitle = scene.locator(".meme-reveal-front .meme-card .card-nameplate h3");
  await expect(revealedTitle).toBeVisible();
  await expect.poll(() => revealedTitle.evaluate((node) => ({
    text: node.textContent,
    whiteSpace: getComputedStyle(node).whiteSpace,
    overflow: getComputedStyle(node).textOverflow,
  }))).toMatchObject({ whiteSpace: "normal", overflow: "clip" });
  await expect(scene.locator(".meme-reveal-next")).toBeDisabled();
  for (let i = 0; i < 5; i++) {
    await expect(scene.locator(".meme-reveal-counter")).toHaveText(`CARTE ${i + 1} / 5`);
    await expect(scene.locator(".meme-reveal-next")).toBeEnabled();
    if (i === 0) await page.screenshot({ path: `test-results/memes-flip-${test.info().project.name}.png` });
    if (i === 0) {
      const card = (await scene.locator(".meme-reveal-card-wrap").boundingBox())!;
      await page.mouse.move(card.x + card.width * .75, card.y + card.height * .5);
      await page.mouse.down();
      await page.mouse.move(card.x + card.width * .25, card.y + card.height * .5, { steps: 5 });
      await page.mouse.up();
    } else await scene.locator(".meme-reveal-next").click();
  }
  await expect(scene.locator(".meme-reveal-summary-grid > div")).toHaveCount(5);
  await page.screenshot({ path: `test-results/memes-recap-${test.info().project.name}.png` });
  await expect(scene.locator(".meme-reveal-next")).toBeDisabled();
  await expect(scene.locator(".meme-reveal-next")).toBeEnabled();
  await scene.locator(".meme-reveal-next").click();
  await expect(scene).toHaveCount(0);
  await expect(page.locator(".meme-collection-head strong")).toHaveText(`5 / ${COLLECTION_TOTAL}`);
  expect(draws).toBe(1);
});
