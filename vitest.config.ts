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
    // src/db/index.ts lève une erreur sans DATABASE_URL ; un URL factice suffit
    // ici car le pool pg ne se connecte pas à l'import.
    env: {
      DATABASE_URL: "postgresql://user:pass@localhost:5432/creatordeck_test",
    },
  },
});
