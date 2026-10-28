import { defineConfig, devices } from "@playwright/test";
import { E2E_CLOUD_KEY, E2E_CLOUD_URL, e2eCloudActive } from "./e2e/cloud-factice";

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
  reporter: process.env.CI
    ? [["list"], ["github"], ["html", { open: "never" }],
      ["json", { outputFile: "test-results/results.json" }]]
    : process.env.CREATORDECK_LOCAL_QUALITY
      ? [["list"], ["html", { open: "never" }], ["json", { outputFile: "test-results/mobile-quality-results.json" }]]
      : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: process.env.CREATORDECK_LOCAL_QUALITY ? "npm run dev -- --webpack" : "npm run dev",
    url: "http://localhost:3000",
    timeout: process.env.CREATORDECK_LOCAL_QUALITY ? 180_000 : 120_000,
    // Sans cloud par défaut, quel que soit `.env.local` ; `CREATORDECK_E2E_CLOUD=1`
    // donne la configuration factice (RPC interceptés). Vider les variables ne
    // suffit pas si un serveur déjà lancé garde les vraies : il n'est donc
    // réutilisé que sur demande (`CREATORDECK_E2E_REUSE=1`).
    env: e2eCloudActive()
      ? { NEXT_PUBLIC_SUPABASE_URL: E2E_CLOUD_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY: E2E_CLOUD_KEY }
      : { NEXT_PUBLIC_SUPABASE_URL: "", NEXT_PUBLIC_SUPABASE_ANON_KEY: "" },
    reuseExistingServer: !process.env.CI && process.env.CREATORDECK_E2E_REUSE === "1",
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
        ...(process.env.CREATORDECK_BROWSER_CHANNEL ? { channel: process.env.CREATORDECK_BROWSER_CHANNEL } : {}),
      },
    },
  ],
});
