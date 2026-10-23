import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { GIFEncoder } from "gifenc";
import { cloudUrl } from "./fixtures";
import cards from "../src/data/memes-fr.json";

const card = cards.find(card => card.image)!;
async function ownedCard(page: Page, owned: () => boolean) {
  test.skip(!cloudUrl(), "Configuration cloud factice requise.");
  await page.route("**/rest/v1/rpc/meme_*", route => route.fulfill({ status: 200, contentType: "application/json",
    body: JSON.stringify({ stock: 4, next_at: null, openings: 0, owned: owned() ? [{ id: card.id, copies: 2 }] : [] }) }));
  await page.addInitScript(() => localStorage.setItem("creatordeck.cloud.session", JSON.stringify({
    accessToken: "fake-token", refreshToken: "fake-refresh", expiresAt: Date.now() + 3_600_000,
    userId: "11111111-1111-4111-8111-111111111111", email: "test@example.invalid",
  })));
  await page.goto("/memes");
  await page.getByPlaceholder("Nom ou numéro").fill(card.name);
  await page.locator(".meme-slot").first().click();
}

test("une carte possédée crée un PNG sans changer la collection", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await ownedCard(page, () => true);
  await page.getByRole("button", { name: "Créer un mème avec cette carte" }).click();
  await page.getByRole("textbox", { name: "Texte de la zone", exact: true }).fill("CreatorDeck\nMon texte");
  await page.getByRole("button", { name: "Ajouter un texte" }).click();
  await page.getByRole("textbox", { name: "Texte de la zone", exact: true }).fill("Deuxième zone");
  await page.getByRole("slider", { name: "Horizontal", exact: true }).press("Home");
  await page.getByRole("slider", { name: "Horizontal", exact: true }).press("ArrowRight");
  await page.getByRole("button", { name: "Créer le fichier" }).click();
  await expect(page.getByRole("link", { name: "Télécharger", exact: true })).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "Télécharger", exact: true }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/\.png$/);
  const metadata = await sharp(await readFile((await file.path())!)).metadata();
  expect(metadata.format).toBe("png");
  await page.screenshot({ path: `test-results/meme-editor-${test.info().project.name}.png` });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Retour à la carte" }).click();
  await expect(page.getByText("2 exemplaire(s) obtenus", { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test("le GIF exporté garde ses frames, durées et boucles", async ({ page }) => {
  const gif = GIFEncoder();
  for (const [color, delay] of [[0, 80], [1, 140]]) gif.writeFrame(new Uint8Array(80 * 60).fill(color), 80, 60,
    { palette: [[255, 0, 0], [0, 0, 255]], delay, repeat: 2, dispose: 2, transparent: false, transparentIndex: 0 });
  gif.finish();
  await page.route("**" + card.image, route => route.fulfill({ contentType: "image/gif", body: Buffer.from(gif.bytes()) }));
  await ownedCard(page, () => true);
  await page.getByRole("button", { name: "Créer un mème avec cette carte" }).click();
  await page.getByRole("textbox", { name: "Texte de la zone", exact: true }).fill("GIF");
  await page.getByRole("button", { name: "Mettre l’aperçu en pause" }).click();
  await expect(page.getByRole("button", { name: "Animer l’aperçu" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Créer le fichier" }).click();
  await expect(page.getByRole("link", { name: "Télécharger", exact: true })).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "Télécharger", exact: true }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/\.gif$/);
  const metadata = await sharp(await readFile((await file.path())!), { animated: true }).metadata();
  expect(metadata.pages).toBe(2);
  expect(metadata.delay).toEqual([80, 140]);
  expect(metadata.loop).toBe(3);
});

test("carte non possédée et possession perdue ne permettent pas de créer", async ({ page }) => {
  let owned = false;
  await ownedCard(page, () => owned);
  await expect(page.getByRole("button", { name: "Créer un mème avec cette carte" })).toHaveCount(0);
  owned = true;
  await page.reload();
  await page.locator(".meme-slot").first().click();
  await page.getByRole("button", { name: "Créer un mème avec cette carte" }).click();
  owned = false;
  await page.getByRole("button", { name: "Créer le fichier" }).click();
  await expect(page.locator(".meme-editor [role=alert]")).toContainText("Cette carte ne figure plus dans ta collection");
  await expect(page.getByRole("link", { name: "Télécharger", exact: true })).toHaveCount(0);
});
