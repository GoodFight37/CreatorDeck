import { expect, type Page } from "@playwright/test";
import { E2E_CLOUD_URL, e2eCloudActive } from "./cloud-factice";
export { expect, test } from "@playwright/test";

/** Les cinq chaînes que les scénarios nomment : les cinq premières du catalogue. */
export const E2E_CIRCLE = ["kaicenat", "ibai", "ninja", "auronplay", "rubius"] as const;

/** Renseigner les chaînes à l'accueil ou en édition, comme le ferait un joueur. */
export async function answerCircle(dialog: ReturnType<Page["getByRole"]>): Promise<void> {
  await dialog.getByLabel("Nom d’une chaîne").fill(E2E_CIRCLE.join(", "));
  await dialog.getByRole("button", { name: "Ajouter", exact: true }).click();
  await dialog.getByRole("button", { name: /^(Voir mon premier booster|Enregistrer)$/ }).click();
}

/**
 * Préparer le joueur via le formulaire de chaînes, après hydratation.
 *
 * `withoutCircle` : le joueur répond, puis son cercle est effacé de l'appareil.
 * C'est l'état d'un joueur d'avant « Mes chaînes » (accueil complet, Binder par
 * pages, Paquet Scène, MEMES dès le début) : les scénarios qui vérifient ces
 * écrans-là l'utilisent. Le parcours avec cercle a ses propres scénarios.
 */
export async function gotoDeck(page: Page, tutorial = true, options: { withoutCircle?: boolean } = {}): Promise<void> {
  await page.goto("/");
  const dialog = page.getByRole("dialog", { name: "Mes chaînes" });
  if (tutorial) {
    await expect(page.locator(".home-view")).toBeVisible();
    if (!await dialog.isVisible()) await page.getByRole("button", { name: "Définir mes chaînes", exact: true }).click();
    await expect(dialog).toBeVisible();
    await answerCircle(dialog);
  }
  await expect(dialog).toHaveCount(0);
  if (options.withoutCircle) {
    await page.evaluate(() => localStorage.removeItem("creatordeck.circle.v1"));
    await page.reload();
    await expect(page.locator(".home-view")).toBeVisible();
    await expect(page.locator(".home-view.is-lean")).toHaveCount(0);
  }
}

/** URL factice du mode cloud simulé (voir `playwright.config.ts`) ; `null` sans cloud. */
export function cloudUrl(): string | null {
  return e2eCloudActive() ? E2E_CLOUD_URL : null;
}

/**
 * Depuis D-148, Tribunal, Scène et Arène vivent dans « Autres activités »
 * (replié) de Objectifs, et non plus sur l'accueil. Ouvre ce volet et le rend.
 */
export async function openOtherActivities(page: Page) {
  await page.getByRole("button", { name: "Objectifs", exact: true }).click({ force: true });
  const details = page.locator("details").filter({ has: page.locator("summary", { hasText: /^Autres activités$/ }) });
  await details.locator("summary").click();
  await expect(details).toHaveAttribute("open", "");
  return details;
}
