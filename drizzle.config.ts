import "dotenv/config";
import { defineConfig } from "drizzle-kit";

// L'URL de la base vient de l'environnement (`.env` via dotenv), plus de
// credentials codés en dur comme dans l'ancien drizzle.config.json.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      "postgresql://postgres:postgres@127.0.0.1:5432/app_db",
  },
});
