/** Recherche Commons reprenable ; aucune image n'est activée automatiquement. */
import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import path from "node:path";
import { createHash, X509Certificate } from "node:crypto";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(name);
  return index < 0 ? fallback : args[index + 1];
};
const root = path.resolve(option("--output", "reports/portrait-research"));
const limit = Number(option("--limit", "1000"));
const workers = Math.min(3, Math.max(1, Number(option("--workers", "2"))));
const stage = option("--stage", "search");
const creators = JSON.parse(await readFile("src/data/creators.json", "utf8"));
const overrides = JSON.parse(await readFile("src/data/portrait-overrides.json", "utf8"));
const excluded = new Set(Object.keys(overrides));
const aliases = {
  kaicenat: "Kai Cenat", "rivers-gg": "Samy Rivera", adinross: "Adin Ross",
  caseoh: "CaseOh", ludwig: "Ludwig Ahgren", faker: "Faker esports",
  ninja: "Tyler Blevins", dream: "Dream YouTuber", buster: "Buster streamer",
  casimito: "Casimiro Miguel", philza: "Philza", karljacobs: "Karl Jacobs",
  michou: "Michou YouTuber", locklear: "Locklear streamer", domingo: "Domingo streamer",
  rebeudeter: "Billy RebeuDeter", couragejd: "CouRageJD", trainwreckstv: "Trainwrecks streamer",
  wankilstudio: "Wankil", etoiles: "Étoiles streamer", bobross: "Bob Ross",
  samueletienne: "Samuel Étienne", bagherajones: "Baghera Jones",
  maximebiaggi: "Maxime Biaggi", esfandtv: "Esfand", zacknani: "Zack Nani",
  littlebigwhale: "LittleBigWhale", sylvainlyve: "Sylvain Levy",
  "kato-junichi0817": "Junichi Kato", mcflyetcarlito: "McFly Carlito",
  hugodecrypte: "Hugo Travers", jeanmassiet: "Jean Massiet", piratesoftware: "Jason Thor Hall",
  "bob-lennon": "Bob Lennon", hanssama: "Hans sama", ramzes: "RAMZES666",
  "saken-lol": "Saken", cabochardlol: "Cabochard", "rhobalas-lol": "Rhobalas",
  kenbogard: "Ken Bogard", willneff: "Will Neff", matthdgamer: "MattHDGamer",
  "luzu-tv": "Luzu", lazarbeam: "LazarBeam", "ta1yo-tv": "Ta1yo",
};
const normalize = (s) => s.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
const plain = (s = "") => s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const value = (metadata, key) => metadata?.[key]?.value ?? "";
const loadJson = async (file) => {
  try { return JSON.parse(await readFile(file, "utf8")); }
  catch (error) { if (error.code === "ENOENT") return null; throw error; }
};
const saveJson = async (file, data) => {
  await writeFile(`${file}.tmp`, JSON.stringify(data, null, 2) + "\n");
  await rename(`${file}.tmp`, file);
};
await Promise.all(["search", "images", "downloads", "proofs"].map((dir) => mkdir(path.join(root, dir), { recursive: true })));
const browserArgs = ["--no-sandbox"];
const proxyCa = option("--proxy-ca", process.env.NODE_EXTRA_CA_CERTS);
if (proxyCa) {
  const certificate = new X509Certificate(await readFile(proxyCa));
  const hash = createHash("sha256").update(certificate.publicKey.export({ type: "spki", format: "der" })).digest("base64");
  browserArgs.push(`--ignore-certificate-errors-spki-list=${hash}`);
}
const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
const browser = await chromium.launch({
  executablePath: option("--chromium", "/usr/bin/chromium"), headless: true,
  args: browserArgs, ...(proxy ? { proxy: { server: proxy } } : {}),
});
let cursor = 0;
let completed = 0;
let errors = 0;
const queue = creators.filter((creator) => !excluded.has(creator.slug)).sort((a, b) => a.rank - b.rank).slice(0, limit);
const pending = [];
for (const creator of queue) {
  const cached = await loadJson(path.join(root, "search", `${creator.slug}.json`));
  if (stage === "search" && cached?.state === "searched") completed++;
  else pending.push(creator);
}

async function search(page, creator) {
  const name = creator.displayName.replace(/_/g, " ").trim();
  const terms = [...new Set([name, aliases[creator.slug]].filter(Boolean))];
  const query = terms.map((term) => `"${term.replaceAll('"', "")}"`).join(" OR ");
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  url.search = new URLSearchParams({
    action: "query", generator: "search", gsrsearch: query, gsrnamespace: "6",
    gsrlimit: "12", prop: "imageinfo", iiprop: "url|size|extmetadata", format: "json", maxlag: "5",
  });
  const response = await page.goto(url.href, { waitUntil: "domcontentloaded", timeout: 30000 });
  if (response.status() !== 200) throw new Error(`Commons HTTP ${response.status()}`);
  const payload = JSON.parse(await response.text());
  if (payload.error) throw new Error(`Commons ${payload.error.code}: ${payload.error.info}`);
  const pages = Object.values(payload.query?.pages ?? {}).sort((a, b) => a.index - b.index);
  const candidates = pages.flatMap((item) => {
    const info = item.imageinfo?.[0];
    if (!info) return [];
    const meta = info.extmetadata;
    const extension = new URL(info.url).pathname.split(".").pop().toLowerCase();
    const raster = ["jpg", "jpeg", "png", "webp"].includes(extension);
    const license = value(meta, "LicenseShortName");
    const categories = value(meta, "Categories");
    const reviewNeeded = /license review needed|no permission|deletion requests|possibly unfree|copyright violations/i.test(categories);
    const reuseLicense = /^(CC BY(?:-SA)? [234]\.0|CC0|Public domain)$/i.test(license);
    const words = plain([item.title, value(meta, "ImageDescription"), categories].join(" "));
    const titleMatch = terms.some((term) => normalize(item.title).includes(normalize(term))) || normalize(item.title).includes(normalize(creator.slug));
    const portraitHint = !/\b(signature|logo|flag|banner|autograph)\b/i.test(item.title);
    const eligible = raster && portraitHint && Math.min(info.width, info.height) >= 900 && info.size <= 20 * 1024 * 1024 && reuseLicense;
    const score = Number(eligible) * 100 + Number(titleMatch) * 30 + Number(!reviewNeeded) * 20 + Math.min(Math.min(info.width, info.height) / 1000, 5);
    return [{
      pageid: item.pageid, title: item.title, source: info.descriptionurl,
      original: info.url.split("?")[0], width: info.width, height: info.height, bytes: info.size,
      author: plain(value(meta, "Artist")), license, licenseUrl: value(meta, "LicenseUrl"),
      credit: value(meta, "Credit"), categories, description: plain(value(meta, "ImageDescription")),
      date: value(meta, "DateTimeOriginal"), restrictions: value(meta, "Restrictions"),
      permission: value(meta, "Permission"), reuseLicense, reviewNeeded, titleMatch,
      identity: "à vérifier individuellement", visual: "non examinée", eligible, score,
      observation: words.slice(0, 1200),
    }];
  }).sort((a, b) => b.score - a.score);
  return { slug: creator.slug, name: creator.displayName, rank: creator.rank, state: "searched", queriedAt: new Date().toISOString(), query, searchUrl: url.href, limitedTo: 12, hasMore: Boolean(payload.continue), candidates };
}

async function download(page, creator) {
  const result = await loadJson(path.join(root, "search", `${creator.slug}.json`));
  if (!result || result.state !== "searched") return;
  const selected = result.candidates.filter((candidate) => candidate.eligible && candidate.titleMatch).slice(0, 2);
  for (const candidate of selected) {
    const key = `${creator.slug}-${candidate.pageid}`;
    const metaFile = path.join(root, "downloads", `${key}.json`);
    if ((await loadJson(metaFile))?.state === "downloaded") continue;
    try {
      const response = await page.goto(candidate.original, { waitUntil: "load", timeout: 45000 });
      if (response.status() !== 200) throw new Error(`Image HTTP ${response.status()}`);
      if (!response.headers()["content-type"]?.startsWith("image/")) throw new Error("Réponse non image");
      const data = await response.body();
      const extension = new URL(candidate.original).pathname.split(".").pop().toLowerCase();
      const filename = `${key}.${extension}`;
      await writeFile(path.join(root, "images", filename), data);
      await saveJson(metaFile, { ...candidate, slug: creator.slug, name: creator.displayName, rank: creator.rank, state: "downloaded", file: `images/${filename}`, sha256: createHash("sha256").update(data).digest("hex"), downloadedAt: new Date().toISOString(), downloadedBytes: data.length });
    } catch (error) {
      await saveJson(metaFile, { ...candidate, slug: creator.slug, state: "download-error", error: error.message });
      errors++;
    }
  }
}

try {
  await Promise.all(Array.from({ length: workers }, async () => {
    const page = await browser.newPage();
    while (cursor < pending.length) {
      const creator = pending[cursor++];
      try {
        if (stage === "search") {
          const result = await search(page, creator);
          await saveJson(path.join(root, "search", `${creator.slug}.json`), result);
        } else if (stage === "download") await download(page, creator);
        else throw new Error("Stage inconnu ; utiliser search ou download");
      } catch (error) {
        errors++;
        if (stage === "search") await saveJson(path.join(root, "search", `${creator.slug}.json`), { slug: creator.slug, name: creator.displayName, rank: creator.rank, state: "error", error: error.message, queriedAt: new Date().toISOString() });
        console.log(`${creator.slug}: ${error.message}`);
      }
      completed++;
      if (completed % 25 === 0 || completed === queue.length) console.log(`${stage}: ${completed}/${queue.length}, erreurs ${errors}`);
      await page.waitForTimeout(700);
    }
    await page.close();
  }));
} finally { await browser.close(); }
console.log(JSON.stringify({ stage, total: queue.length, excluded: [...excluded], completed, errors, output: root }));
if (errors) process.exitCode = 1;
