/**
 * Retire de l'export de production les pages prototypes.
 *
 * `/catalogue-demo` reste disponible en développement (`npm run dev`) et dans
 * les tests E2E, mais ne doit pas partir sur le site. Next.js exporte toute
 * route statique, même quand elle répond 404 : on supprime donc ses fichiers
 * après `next build`.
 */
import { rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PROTOTYPES = ["catalogue-demo.html", "catalogue-demo.txt", "catalogue-demo"];

for (const nom of PROTOTYPES) {
  await rm(path.join(root, "out", nom), { recursive: true, force: true });
}
console.log(`Prototypes retirés de out/ : ${PROTOTYPES.join(", ")}`);
