/**
 * Applique les migrations Drizzle (dossier drizzle/) à la base DATABASE_URL.
 *
 * Usage :
 *   cp .env.example .env   # puis renseigner DATABASE_URL
 *   npm run db:migrate
 *
 * Ce script construit sa propre connexion (il n'importe pas src/db, qui est en
 * TypeScript et lève une erreur sans DATABASE_URL) puis délègue au migrateur
 * officiel de drizzle-orm.
 */
import "dotenv/config";
import path from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error(
    "DATABASE_URL manquant. Copie .env.example vers .env et renseigne-le, " +
      "ou exporte DATABASE_URL avant de lancer ce script.",
  );
  process.exit(1);
}

const pool = new Pool({ connectionString: databaseUrl });
const db = drizzle(pool);

try {
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  console.log("✔ Migrations appliquées avec succès.");
} catch (error) {
  console.error("✗ Échec des migrations :", error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
