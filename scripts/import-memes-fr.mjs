#!/usr/bin/env node
/**
 * Import reproductible du pack français autorisé par Malik.
 * Exécuter explicitement avec --sync ; le build ne dépend jamais du site tiers.
 */
import { execFile } from "node:child_process";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);
const root = path.resolve(import.meta.dirname, "..");
const dataPath = path.join(root, "src/data/memes-fr.json");
const imageDir = path.join(root, "public/memes-fr");
const source = "https://mymemecards.com/cards-memes-fr.json";
const slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
// Fiche retirée à la demande de Malik : la source ne fournit qu'une image de remplacement.
const excludedCardIds = new Set(["juventus-rose"]);

async function curl(url, output) {
  await run("curl", ["--fail", "--location", "--silent", "--show-error", "--retry", "3",
    "--max-time", "30", "--output", output, url], { maxBuffer: 1024 * 1024 });
}

function clean(value) {
  return typeof value === "string" ? value.trim().slice(0, 500) : "";
}

async function sync() {
  await mkdir(imageDir, { recursive: true });
  const sourcePath = path.join(root, ".tmp-memes-fr-source.json");
  try {
    await curl(source, sourcePath);
    const rows = JSON.parse(await readFile(sourcePath, "utf8"));
    if (!Array.isArray(rows) || rows.length !== 2151) {
      throw new Error(`Catalogue inattendu : ${Array.isArray(rows) ? rows.length : "format invalide"} fiches.`);
    }
    const excludedRows = rows.filter((row) => excludedCardIds.has(row.id));
    if (excludedRows.length !== 1 || (excludedRows[0].fr?.name || excludedRows[0].name) !== "Carte supprimée") {
      throw new Error("La fiche source attendue « Carte supprimée » a changé ; vérifier avant de synchroniser.");
    }
    const seen = new Set();
    const cards = rows.filter((row) => !excludedCardIds.has(row.id)).map((row) => {
      if (row.pack !== "memes-fr" || !slug.test(row.id) || seen.has(row.id)) {
        throw new Error(`Identifiant ou pack invalide : ${row.id}`);
      }
      seen.add(row.id);
      const art = row.art || row.id;
      if (!slug.test(art)) throw new Error(`Image invalide : ${art}`);
      if (!["common", "rare", "epic", "legendary", "mythic"].includes(row.rarity)) {
        throw new Error(`Rareté invalide : ${row.id}`);
      }
      const french = row.fr && typeof row.fr === "object" ? row.fr : {};
      return {
        id: row.id,
        number: row.n,
        name: clean(french.name || row.name),
        rarity: row.rarity,
        image: `/memes-fr/${art}.webp`,
        top: clean(french.top),
        bottom: clean(french.bottom),
        flavor: clean(french.flavor),
        credit: clean(row.by),
        year: Number.isInteger(row.year) ? row.year : null,
        fullArt: row.fullArt === true,
        retired: row.retired === true || row.outOfPrint === true,
      };
    });
    if (cards.length !== 2150) throw new Error(`Catalogue distribué inattendu : ${cards.length} fiches.`);
    if (cards.filter((card) => card.fullArt).length !== 21) {
      throw new Error("Le nombre de Full Art a changé.");
    }
    const images = [...new Set(cards.map((card) => card.image))];
    let next = 0;
    let done = 0;
    const failures = [];
    await Promise.all(Array.from({ length: 4 }, async () => {
      while (next < images.length) {
        const image = images[next++];
        const target = path.join(root, "public", image);
        let valid = false;
        try {
          const existing = await readFile(target);
          valid = existing.length >= 12 && existing.toString("ascii", 0, 4) === "RIFF"
            && existing.toString("ascii", 8, 12) === "WEBP";
        } catch { /* Téléchargement nécessaire. */ }
        if (!valid) {
          const temporary = target + ".tmp";
          try {
            await curl(`https://mymemecards.com/cards/img/${path.basename(image)}`, temporary);
            const bytes = await readFile(temporary);
            if (bytes.length < 12 || bytes.toString("ascii", 0, 4) !== "RIFF"
              || bytes.toString("ascii", 8, 12) !== "WEBP") throw new Error("Réponse non WebP");
            await rename(temporary, target);
          } catch (error) {
            failures.push(`${image}: ${error instanceof Error ? error.message : String(error)}`);
            await rm(temporary, { force: true });
          }
        }
        done += 1;
        if (done % 200 === 0) process.stdout.write(`${done}/${images.length} images contrôlées\n`);
      }
    }));
    if (failures.length) throw new Error(`${failures.length} images manquantes :\n${failures.slice(0, 20).join("\n")}`);
    let placeholders = 0;
    for (const card of cards) {
      if ((await readFile(path.join(root, "public", card.image))).length < 1024) {
        card.image = null;
        placeholders += 1;
      }
    }
    await writeFile(dataPath, JSON.stringify(cards) + "\n");
    process.stdout.write(`${cards.length} cartes et ${images.length} fichiers WebP contrôlés ; ${placeholders} visuel indisponible.\n`);
  } finally {
    await rm(sourcePath, { force: true });
  }
}

if (process.argv.includes("--sync")) sync().catch((error) => { console.error(error); process.exitCode = 1; });
else console.error("Utilisation : node scripts/import-memes-fr.mjs --sync");
