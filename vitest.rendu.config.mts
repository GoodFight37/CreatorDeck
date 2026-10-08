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
    environment: "jsdom",
    include: ["src/**/*.rendu.tsx"],
    testTimeout: 60_000,
    setupFiles: ["./src/ecrans-smoke.setup.ts"],
  },
});
