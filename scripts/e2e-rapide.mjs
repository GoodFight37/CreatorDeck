/**
 * E2E sur l'export compilé, quatre ouvriers : 4,9 min au lieu de 11 en dev (29/10/2026).
 *   npm run e2e:rapide -- e2e/memes.spec.ts --grep "..."
 */
import { spawnSync } from "node:child_process";

// Sans shell : un `--grep "avec le serveur"` doit rester un seul argument.
const run = spawnSync(process.execPath, ["node_modules/@playwright/test/cli.js", "test", ...process.argv.slice(2)], {
  stdio: "inherit",
  env: { ...process.env, CREATORDECK_E2E_BUILD: "1" },
});
process.exit(run.status ?? 1);
