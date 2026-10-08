import { defineConfig, devices } from "@playwright/test";

/**
 * Tests de bout en bout : le jeu est ouvert dans un vrai navigateur et on
 * clique dedans, comme le joueur.
 *
 * Deux projets, les mêmes tests : un écran de bureau et un écran de téléphone
 * (412 × 915, la taille d'un Pixel courant). La barre du bas doit se comporter
 * pareil sur les deux — c'est justement ce qu'on veut vérifier.
 *
 * Lancer : `npm run e2e` (la première fois : `npx playwright install chromium`).
 */
export default defineConfig({
  testDir: "./e2e",
  // Le premier chargement compile la page en mode développement : large.
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  // Un seul ouvrier : `next dev` compile à la demande, et plusieurs onglets
  // simultanés le font surtout attendre.
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    timeout: 120_000,
    // Un serveur déjà lancé (le `npm run dev` du joueur) est réutilisé : les
    // tests ne se battent pas avec lui pour le port 3000.
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: "bureau",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "téléphone",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 412, height: 915 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 2,
      },
    },
  ],
});
