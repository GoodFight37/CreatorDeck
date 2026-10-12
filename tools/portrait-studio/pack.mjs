/** Prépare le ZIP autonome ; aucune recherche réseau, aucun changement du jeu. */
import { readFile, writeFile, mkdir, readdir, copyFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "../..");
const require = createRequire(path.join(repo, "package.json"));
const sharp = require("sharp");
const args = process.argv.slice(2);
const option = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const output = path.resolve(option("--output", path.join(here, "seed")));
const researchRoot = path.resolve(option("--research", path.join(repo, "reports/portrait-research")));
await mkdir(path.join(output, "avatars"), { recursive: true });
await mkdir(path.join(output, "portraits"), { recursive: true });
const creators = JSON.parse(await readFile(path.join(repo, "src/data/creators.json"), "utf8"));
const overrides = JSON.parse(await readFile(path.join(repo, "src/data/portrait-overrides.json"), "utf8"));
const baseline = JSON.parse(execFileSync("git", ["show", "HEAD:src/data/portrait-overrides.json"], { cwd: repo, encoding: "utf8" }));
const research = {};
try {
  for (const file of await readdir(path.join(researchRoot, "search"))) {
    if (file.endsWith(".json")) { const data = JSON.parse(await readFile(path.join(researchRoot, "search", file), "utf8")); research[data.slug] = data; }
  }
} catch (e) { if (e.code !== "ENOENT") throw e; }
let cursor = 0;
await Promise.all(Array.from({ length: 4 }, async () => {
  while (cursor < creators.length) {
    const c = creators[cursor++];
    await sharp(path.join(repo, "public/creators", c.slug + ".webp")).resize(180, 180).webp({ quality: 75 }).toFile(path.join(output, "avatars", c.slug + ".webp"));
  }
}));
for (const [slug, item] of Object.entries(overrides)) await copyFile(path.join(repo, "public" + item.image), path.join(output, "portraits", slug + ".webp"));
for (const [name, data] of Object.entries({ creators, overrides, published: baseline, research })) await writeFile(path.join(output, name + ".json"), JSON.stringify(data) + "\n");
console.log(`${creators.length} créateurs, ${Object.keys(overrides).length} portraits prêts, ${Object.keys(research).length} recherches reprises. Données : ${output}`);
