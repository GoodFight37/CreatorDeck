/**
 * E2E sur l'export compilé, quatre ouvriers : 4,9 min au lieu de 11 en dev (29/10/2026).
 *   npm run e2e:rapide -- e2e/memes.spec.ts --grep "..."
 */
import { spawnSync } from "node:child_process";

const run = spawnSync("npx", ["playwright", "test", ...process.argv.slice(2)], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, CREATORDECK_E2E_BUILD: "1" },
});
process.exit(run.status ?? 1);
