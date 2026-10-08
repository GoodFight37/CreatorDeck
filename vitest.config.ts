import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const here = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(here, "src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Le détail technique part au journal quand une partie du jeu n'est pas
    // encore ouverte : les bancs n'ont pas à le crier. Celui qui vérifie le
    // journal (`src/lib/cloud/api.test.ts`) lève le silence lui-même.
    env: { CREATORDECK_SILENCE_JOURNAL: "1" },
  },
});
