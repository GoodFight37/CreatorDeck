import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const here = path.dirname(fileURLToPath(import.meta.url));

/**
 * Le banc d'essai **des écrans** (`npm run ecrans`) : l'application est montée
 * dans un DOM (jsdom) et parcourue comme au doigt — les onglets, les feuilles,
 * un booster ouvert. Il vit à côté des tests unitaires (`vitest.config.ts`), qui
 * restent sans DOM et rapides :
 *
 *   npm test     → la logique (moteur, cloud, migrations)
 *   npm run ecrans → les écrans (montage, onglets, feuilles, récompense)
 *
 * Il existe parce que ce dépôt se développe sans navigateur : dans
 * l'environnement de travail, `next build` pré-rend seulement l'accueil, et un
 * découpage de composant peut casser un écran sans qu'aucun test unitaire ne
 * s'en aperçoive. Le HTML des écrans peut être gardé sur disque pour comparer
 * avant/après un découpage : `ECRANS_DUMP=/tmp/rendu npm run ecrans`.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(here, "src"),
    },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.tsx"],
    testTimeout: 60_000,
    setupFiles: ["./src/ecrans.setup.ts"],
  },
});
