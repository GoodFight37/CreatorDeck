import { defineConfig, devices } from "@playwright/test";

/** Tests Safari / WebKit de la branche Histoire, séparés de la suite Chromium. */
export default defineConfig({
  testDir: "./e2e",
  testMatch: "story-webkit.spec.ts",
  timeout: 90_000,
  expect: { timeout: 12_000 },
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:3000",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: "Safari iPhone simulé",
      use: { ...devices["iPhone 13"] },
    },
  ],
});
