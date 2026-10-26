import { expect, test, cloudUrl, openOtherActivities } from "./fixtures";
import { prepareActivities } from "./activities-fixture";

test.describe("avec le serveur : activités existantes", () => {
test.beforeEach(async () => { test.skip(!cloudUrl(), "RPC simulées : demande la configuration cloud factice."); });

test("Last Pack annonce la lecture puis affiche le booster de l’ami sans transfert", async ({ page }) => {
  const fixture = await prepareActivities(page, { lastPack: "waiting" });
  await page.goto("/");
  await openOtherActivities(page);
  await page.getByRole("button", { name: "Last Pack", exact: true }).click();
  const sheet = page.getByRole("dialog", { name: "Last Pack", exact: true });
  try {
    await expect(sheet.getByText("Lecture des derniers boosters…")).toBeVisible();
    await expect(sheet.getByText(/Invite quelqu’un/)).toHaveCount(0);
  } finally { fixture.releaseLastPack(); }
  await expect(sheet.getByRole("heading", { name: "Lina" })).toBeVisible();
  await expect(sheet.locator("li")).toHaveCount(5);
  await expect(sheet.getByText("Les dernières cartes de tes amis restent à leur propriétaire.")).toBeVisible();
  expect(fixture.requests).not.toContain("last_pack_steal");
});

test("Last Pack distingue l’échec d’une absence de boosters", async ({ page }) => {
  const fixture = await prepareActivities(page, { lastPack: "failed" });
  await page.goto("/");
  await openOtherActivities(page);
  await page.getByRole("button", { name: "Last Pack", exact: true }).click();
  const sheet = page.getByRole("dialog", { name: "Last Pack", exact: true });
  await expect(sheet.getByText("Lecture des derniers boosters indisponible.")).toBeVisible();
  await expect(sheet.getByRole("button", { name: "Réessayer" })).toBeEnabled();
  await expect(sheet.getByText(/Invite quelqu’un/)).toHaveCount(0);
  fixture.releaseLastPack();
  await sheet.getByRole("button", { name: "Réessayer" }).click();
  await expect(sheet.getByRole("heading", { name: "Lina" })).toBeVisible();
  await expect(sheet.getByText("Lecture des derniers boosters indisponible.")).toHaveCount(0);
});

test("le rang d’Arène n’utilise pas le top 100 comme total des participants", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-26T10:00:00Z"));
  await prepareActivities(page);
  await page.goto("/");
  await openOtherActivities(page);
  await page.getByRole("button", { name: "Arène", exact: true }).click();
  const rank = page.locator(".arena-rank");
  await expect(rank).toContainText("150");
  await expect(rank).not.toContainText("sur 100");
  await expect(page.locator(".arena-draft-head")).toContainText("samedi 31 octobre");
});

test("un échec de lecture de l’Hôtel ne reste pas en chargement", async ({ page }) => {
  const fixture = await prepareActivities(page, { marketFailed: true });
  await page.goto("/");
  await openOtherActivities(page);
  await page.getByRole("button", { name: "Hôtel des ventes", exact: true }).click();
  const sheet = page.getByRole("dialog", { name: "Hôtel des ventes", exact: true });
  await expect(sheet.getByText("Lecture du comptoir indisponible. Actualise pour réessayer.")).toBeVisible();
  await expect(sheet.getByText("Chargement du comptoir…")).toHaveCount(0);
  fixture.recoverMarket();
  await sheet.getByRole("button", { name: "Actualiser" }).click();
  await expect(sheet.getByText(/Le comptoir est vide/)).toBeVisible();
  await expect(sheet.getByText("Lecture du comptoir indisponible. Actualise pour réessayer.")).toHaveCount(0);
});
});
