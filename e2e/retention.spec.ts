import { test, expect } from "./fixtures";

for (const withCircle of [true, false]) {
  test(`rétention : accueil téléphone ${withCircle ? "avec" : "sans"} cercle`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    // Ce contrôle local n'envoie rien aux services de production.
    await page.route("**/*", (route) => {
      const url = new URL(route.request().url());
      return ["localhost", "127.0.0.1"].includes(url.hostname) ? route.continue() : route.abort();
    });
    await page.addInitScript(({ withCircle }) => {
      localStorage.setItem("creatordeck-tutorial:local", "done");
      localStorage.setItem("creatordeck-tutorial:completed:local", "done");
      if (withCircle) localStorage.setItem("creatordeck.circle.v1", JSON.stringify({ v: 1,
        slugs: ["ibai", "ninja", "rubius", "xqc", "shroud"], at: 1 }));
    }, { withCircle });
    await page.goto("/");
    const home = page.locator(".home-view");
    await expect(home).toBeVisible();
    await expect(home).not.toContainText("Tribunal");
    await expect(home).not.toContainText("Pas de Légendaire dans ce paquet");
    await expect(home.locator(".scene-block, .arena-row")).toHaveCount(0);
    if (withCircle) await expect(home.locator(".circle-strip")).toBeVisible();
    else await expect(home.getByRole("button", { name: "Définir mes chaînes" })).toBeVisible();
    await page.screenshot({ path: `test-results/retention-${withCircle ? "avec" : "sans"}-cercle.png`, fullPage: true });
  });
}
