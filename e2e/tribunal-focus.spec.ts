import { expect, test, gotoDeck, openOtherActivities } from "./fixtures";

test("le Tribunal confine le clavier, transmet le focus au bilan et le rend à la sortie", async ({ page }, testInfo) => {
  await gotoDeck(page);
  const entry = (await openOtherActivities(page)).getByRole("button", { name: "Tribunal des Bannis", exact: true });
  await entry.click();
  const tribunal = page.getByRole("dialog", { name: "Tribunal des Bannis", exact: true });
  await expect(tribunal).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(tribunal.getByRole("button", { name: "Maintenir le ban", exact: true })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(tribunal.getByRole("button", { name: "Quitter", exact: true })).toBeFocused();
  await page.screenshot({ path: testInfo.outputPath("tribunal.png") });
  await page.keyboard.press("Escape");
  await expect(tribunal).toHaveCount(0);
  await expect(entry).toBeFocused();

  await entry.click();
  for (let i = 0; i < 5; i++) {
    await tribunal.getByRole("button", { name: "Maintenir le ban", exact: true }).click();
    await tribunal.getByRole("button", { name: i === 4 ? "Voir le bilan" : "Dossier suivant", exact: true }).click();
  }
  const bilan = page.getByRole("dialog", { name: "Bilan de la séance", exact: true });
  await expect(bilan).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(bilan.getByRole("button", { name: "Voir mon objectif du jour", exact: true })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(bilan.getByRole("button", { name: "Quitter", exact: true })).toBeFocused();
  await page.screenshot({ path: testInfo.outputPath("bilan.png") });
  await page.keyboard.press("Escape");
  await expect(bilan).toHaveCount(0);
  await expect(entry).toBeFocused();
});
