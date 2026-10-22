/**
 * Retire de l'export de production les pages prototypes.
 *
 * `/catalogue-demo` reste disponible en développement (`npm run dev`) et dans
 * les tests E2E, mais ne doit pas partir sur le site. Next.js exporte toute
 * route statique, même quand elle répond 404 : on supprime donc ses fichiers
 * après `next build`.
 */
import { readFile, rm, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PROTOTYPES = ["catalogue-demo.html", "catalogue-demo.txt", "catalogue-demo"];

// Les originaux restent dans le dépôt pour le sourcing et les restaurations.
const manual = JSON.parse(await readFile(path.join(root, "src/data/manual-portrait-overrides.json"), "utf8"));
let portraits = 0, bytes = 0;
for (const [slug, replacement] of Object.entries(manual)) {
  if (!/^[a-z0-9-]+$/.test(slug) || replacement !== `/creators/manual/${slug}.webp`) {
    throw new Error(`Chemin de portrait manuel inattendu : ${slug}`);
  }
  const original = path.join(root, "out/creators", `${slug}.webp`);
  const replacementFile = path.join(root, "out", replacement.slice(1));
  // Ne retirer un fallback que si sa version réellement affichée est exportée.
  await stat(replacementFile);
  const info = await stat(original).catch(error => { if (error.code !== "ENOENT") throw error; return null; });
  if (info) {
    await rm(original);
    portraits += 1;
    bytes += info.size;
  }
}
console.log(`Portraits masqués retirés de out/ : ${portraits}, ${bytes} octets`);

for (const nom of PROTOTYPES) {
  await rm(path.join(root, "out", nom), { recursive: true, force: true });
}
console.log(`Prototypes retirés de out/ : ${PROTOTYPES.join(", ")}`);
