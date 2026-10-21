import { loadEnvConfig } from "@next/env";
import { readCloudConfig } from "../src/lib/cloud/config";
import { expect, type Page } from "@playwright/test";
export { expect, test } from "@playwright/test";

/** Les cinq chaînes que les scénarios nomment : les cinq premières du catalogue. */
export const E2E_CIRCLE = ["kaicenat", "ibai", "ninja", "auronplay", "rubius"] as const;

/** Répondre à « Quelles chaînes regardes-tu déjà ? » comme le ferait un joueur. */
export async function answerCircle(dialog: ReturnType<Page["getByRole"]>): Promise<void> {
  await dialog.getByLabel("Nom d’une chaîne").fill(E2E_CIRCLE.join(", "));
  await dialog.getByRole("button", { name: "Ajouter", exact: true }).click();
  await dialog.getByRole("button", { name: "Voir mon premier booster", exact: true }).click();
}

/**
 * Préparer le joueur via la vraie question d'accueil, après hydratation.
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

/** Même configuration publique que Next dev ; aucun RPC réel dans les scénarios cloud. */
export function cloudUrl(): string | null {
  loadEnvConfig(process.cwd(), true);
  return readCloudConfig()?.url ?? null;
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
