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

/** Préparer le joueur via la vraie question d'accueil, après hydratation. */
export async function gotoDeck(page: Page, tutorial = true): Promise<void> {
  await page.goto("/");
  const dialog = page.getByRole("dialog", { name: "Mes chaînes" });
  if (tutorial) {
    await expect(dialog).toBeVisible();
    await answerCircle(dialog);
  }
  await expect(dialog).toHaveCount(0);
}

/** Même configuration publique que Next dev ; aucun RPC réel dans les scénarios cloud. */
export function cloudUrl(): string | null {
  loadEnvConfig(process.cwd(), true);
  return readCloudConfig()?.url ?? null;
}
