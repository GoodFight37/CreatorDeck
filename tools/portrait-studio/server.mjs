import http from "node:http";
import { readFile, writeFile, mkdir, rename, copyFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes, createHash } from "node:crypto";
import { spawn } from "node:child_process";

const here = path.dirname(fileURLToPath(import.meta.url));
const MAX_BYTES = 32 * 1024 * 1024;
const mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".webp": "image/webp", ".jpg": "image/jpeg", ".png": "image/png" };
const clean = (s = "") => String(s).replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
const safeId = (s) => /^[a-z0-9-]+$/.test(s);
export function httpsUrl(value, hosts) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || (hosts && !hosts.includes(url.hostname))) throw Error("Adresse de source non autorisée");
  return url.href;
}
export function webpSize(data) {
  if (data.length < 30 || data.toString("ascii", 0, 4) !== "RIFF" || data.toString("ascii", 8, 12) !== "WEBP") throw Error("Fichier WebP invalide");
  const kind = data.toString("ascii", 12, 16);
  if (kind === "VP8X") return [data.readUIntLE(24, 3) + 1, data.readUIntLE(27, 3) + 1];
  if (kind === "VP8 ") return [data.readUInt16LE(26) & 16383, data.readUInt16LE(28) & 16383];
  if (kind === "VP8L") { const bits = data.readUInt32LE(21); return [(bits & 16383) + 1, ((bits >>> 14) & 16383) + 1]; }
  throw Error("Format WebP non reconnu");
}
async function jsonFile(file, fallback) {
  try { return JSON.parse(await readFile(file, "utf8")); } catch (e) { if (e.code === "ENOENT") return fallback; throw e; }
}
async function bodyJson(req) {
  let length = 0; const parts = [];
  for await (const part of req) { length += part.length; if (length > MAX_BYTES) throw Error("Fichier trop lourd : maximum 24 Mo environ"); parts.push(part); }
  return JSON.parse(Buffer.concat(parts).toString("utf8"));
}
async function remote(url, binary = false) {
  const response = await fetch(url, { signal: AbortSignal.timeout(45000), redirect: "error", headers: { "User-Agent": "CreatorDeckPortraitStudio/1.0 (local research)" } });
  if (!response.ok) throw Error(`La source répond HTTP ${response.status}. Réessaye plus tard ou utilise ton navigateur.`);
  if (!binary) return response.json();
  if (!response.headers.get("content-type")?.startsWith("image/")) throw Error("La source ne renvoie pas une image");
  const chunks = []; let size = 0;
  for await (const chunk of response.body) { size += chunk.length; if (size > 24 * 1024 * 1024) { await response.body.cancel().catch(() => {}); throw Error("Originale trop lourde : 24 Mo maximum"); } chunks.push(chunk); }
  return Buffer.concat(chunks);
}
export async function createStudio({ directory = here, port = 4317, open = false, quiet = false } = {}) {
  const seed = path.join(directory, "seed"); const work = path.join(directory, "_travail");
  const creators = await jsonFile(path.join(seed, "creators.json"), null);
  if (!creators) throw Error("Données seed absentes : utiliser le ZIP prêt pour Windows ou lancer pack.mjs depuis le dépôt.");
  const base = await jsonFile(path.join(seed, "overrides.json"), {});
  const published = await jsonFile(path.join(seed, "published.json"), {});
  const research = await jsonFile(path.join(seed, "research.json"), {});
  const stateFile = path.join(work, "state.json");
  const state = await jsonFile(stateFile, { choices: {}, skipped: {}, downloaded: {}, searches: {} });
  const catalog = new Map(creators.map((c) => [c.slug, c]));
  await mkdir(path.join(work, "originales"), { recursive: true });
  await mkdir(path.join(work, "portraits"), { recursive: true });
  let saves = Promise.resolve(); let batch = { running: false, done: 0, total: 0, error: "" };
  const token = randomBytes(24).toString("hex");
  const save = () => { const text = JSON.stringify(state, null, 2); saves = saves.catch(() => {}).then(async () => { await writeFile(stateFile + ".tmp", text); await rename(stateFile + ".tmp", stateFile); }); return saves; };
  const creator = (slug) => { if (!safeId(slug) || !catalog.has(slug)) throw Error("Créateur inconnu"); return catalog.get(slug); };
  const candidates = (slug) => state.searches[slug]?.candidates ?? research[slug]?.candidates ?? [];
  const findCandidate = (slug, id) => { creator(slug); const c = candidates(slug).find((x) => String(x.pageid) === String(id)); if (!c) throw Error("Candidate inconnue"); return c; };
  async function search(slug) {
    const c = creator(slug); const query = research[slug]?.query || `"${c.displayName.replaceAll('"', "")}"`;
    const params = new URLSearchParams({ action: "query", generator: "search", gsrsearch: query, gsrnamespace: "6", gsrlimit: "12", prop: "imageinfo", iiprop: "url|size|extmetadata", iiurlwidth: "320", format: "json", maxlag: "5" });
    const payload = await remote("https://commons.wikimedia.org/w/api.php?" + params);
    if (payload.error) throw Error(payload.error.info);
    const list = Object.values(payload.query?.pages ?? {}).flatMap((p) => {
      const i = p.imageinfo?.[0]; if (!i || !/\.(jpg|jpeg|png|webp)(\?|$)/i.test(i.url)) return [];
      const m = i.extmetadata; const v = (k) => m?.[k]?.value ?? "";
      return [{ pageid: p.pageid, title: p.title, original: i.url, thumbnail: i.thumburl, source: i.descriptionurl, width: i.width, height: i.height, author: clean(v("Artist")), license: v("LicenseShortName"), licenseUrl: v("LicenseUrl"), reviewNeeded: /license review needed/i.test(v("Categories")), description: clean(v("ImageDescription")) }];
    });
    state.searches[slug] = { queriedAt: new Date().toISOString(), candidates: list }; await save(); return list;
  }
  async function original(slug, id) {
    const c = findCandidate(slug, id); const key = `${slug}-${id}`;
    if (!safeId(key)) throw Error("Identifiant incorrect");
    if (!state.downloaded[key]) {
      const bytes = await remote(httpsUrl(c.original, ["upload.wikimedia.org"]), true);
      await writeFile(path.join(work, "originales", key), bytes);
      state.downloaded[key] = { sha256: createHash("sha256").update(bytes).digest("hex"), bytes: bytes.length }; await save();
    }
    return readFile(path.join(work, "originales", key));
  }
  const server = http.createServer(async (req, res) => {
    try {
      const host = req.headers.host;
      if (host !== `127.0.0.1:${server.address().port}` && host !== `localhost:${server.address().port}`) { res.writeHead(403).end(); return; }
      const url = new URL(req.url, `http://${host}`);
      if (url.pathname.startsWith("/api/")) {
        if (req.headers.authorization !== `Bearer ${token}`) { res.writeHead(403, { "Content-Type": "application/json" }).end(JSON.stringify({ error: "Accès refusé : relance LANCER.cmd et utilise la nouvelle fenêtre." })); return; }
        if (req.method !== "GET" && req.headers.origin !== `http://${host}`) { res.writeHead(403).end(); return; }
      }
      const reply = (data) => { res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" }); res.end(JSON.stringify(data)); };
      if (url.pathname === "/api/state") { reply({ creators, base, choices: state.choices, skipped: state.skipped, batch }); return; }
      if (url.pathname === "/api/candidates") { const slug = url.searchParams.get("slug"); creator(slug); reply({ candidates: candidates(slug) }); return; }
      if (url.pathname === "/api/photo") { const bytes = await original(url.searchParams.get("slug"), url.searchParams.get("id")); res.writeHead(200, { "Content-Type": "application/octet-stream", "Cache-Control": "no-store" }); res.end(bytes); return; }
      if (req.method === "POST" && url.pathname === "/api/search") { const b = await bodyJson(req); reply({ candidates: await search(b.slug) }); return; }
      if (req.method === "POST" && url.pathname === "/api/batch") {
        if (batch.running) throw Error("Un lot est déjà en cours");
        const slugs = creators.filter((c) => !base[c.slug] && !state.choices[c.slug] && !state.skipped[c.slug] && !research[c.slug] && !state.searches[c.slug]).slice(0, 20).map((c) => c.slug);
        batch = { running: true, done: 0, total: slugs.length, error: "" }; reply(batch);
        (async () => { try { for (const slug of slugs) { await search(slug); batch.done++; await new Promise((r) => setTimeout(r, 1500)); } } catch (e) { batch.error = e.message; } finally { batch.running = false; } })(); return;
      }
      if (req.method === "POST" && url.pathname === "/api/skip") { const b = await bodyJson(req); creator(b.slug); state.skipped[b.slug] = true; await save(); reply({ ok: true }); return; }
      if (req.method === "POST" && url.pathname === "/api/select") {
        const b = await bodyJson(req); const c = creator(b.slug);
        const candidate = b.pageid ? findCandidate(b.slug, b.pageid) : null;
        if (!b.verified || !b.author?.trim() || !b.title?.trim()) throw Error("Vérifie l’identité, la licence et les crédits avant de garder la photo");
        const source = httpsUrl(b.source); const licenseUrl = httpsUrl(b.licenseUrl, ["creativecommons.org"]);
        if (!/^(CC BY(?:-SA)? [234]\.0|CC0)$/.test(b.license)) throw Error("Choisis une licence CC autorisant ce cadrage ; autres droits à traiter séparément");
        const bytes = Buffer.from(b.webp, "base64"); const size = webpSize(bytes);
        if (size[0] !== 900 || size[1] !== 900) throw Error("Le portrait doit être un WebP carré de 900 px");
        if (![b.crop?.size, b.crop?.x, b.crop?.y].every(Number.isFinite) || b.crop.size < 900 || b.crop.x < 0 || b.crop.y < 0) throw Error("Cadrage incorrect ou agrandissement interdit");
        await writeFile(path.join(work, "portraits", b.slug + ".webp"), bytes);
        let changes = `Recadrage carré individuel (${Math.round(b.crop.x)}, ${Math.round(b.crop.y)}, ${Math.round(b.crop.size)} px) et conversion WebP, 900 × 900 px, sans agrandissement.`;
        if (b.license.includes("BY-SA")) changes += ` Cette adaptation reste sous ${b.license}.`;
        state.choices[b.slug] = { name: c.displayName, image: `/creators/curated/${b.slug}.webp`, title: b.title, author: b.author.trim(), source, license: b.license, licenseUrl, changes, original: candidate?.original ?? "fichier fourni sur le PC", selectedAt: new Date().toISOString() };
        delete state.skipped[b.slug]; await save(); reply({ ok: true }); return;
      }
      if (req.method === "POST" && url.pathname === "/api/export") {
        const target = path.join(work, "EXPORT"); const images = path.join(target, "public", "creators", "curated"); await mkdir(images, { recursive: true });
        const patch = {};
        for (const [slug, item] of Object.entries(base)) if (!published[slug]) { await copyFile(path.join(seed, "portraits", slug + ".webp"), path.join(images, slug + ".webp")); patch[slug] = item; }
        for (const [slug, item] of Object.entries(state.choices)) { await copyFile(path.join(work, "portraits", slug + ".webp"), path.join(images, slug + ".webp")); const { original: ignoredOriginal, selectedAt: ignoredDate, ...entry } = item; void ignoredOriginal; void ignoredDate; patch[slug] = entry; }
        await writeFile(path.join(target, "portrait-overrides.patch.json"), JSON.stringify(patch, null, 2) + "\n");
        await writeFile(path.join(target, "README.txt"), "Importer les images dans public/creators/curated et fusionner les entrées du JSON avec src/data/portrait-overrides.json. Ne pas écraser le registre complet. Les crédits sont déjà affichés par CreatorDeck. Ce dossier ne publie rien automatiquement.\n");
        reply({ directory: target, count: Object.keys(patch).length }); return;
      }
      if (url.pathname === "/" || url.pathname === "/app.js") { const file = url.pathname === "/" ? "index.html" : "app.js"; res.writeHead(200, { "Content-Type": mime[path.extname(file)], "Cache-Control": "no-store" }); res.end(await readFile(path.join(directory, file))); return; }
      const match = url.pathname.match(/^\/seed\/(avatars|portraits)\/([a-z0-9-]+)\.webp$/);
      if (match) { creator(match[2]); res.writeHead(200, { "Content-Type": "image/webp" }); res.end(await readFile(path.join(seed, match[1], match[2] + ".webp"))); return; }
      res.writeHead(404).end();
    } catch (e) { if (!res.headersSent) res.writeHead(400, { "Content-Type": "application/json" }); res.end(JSON.stringify({ error: e.message })); }
  });
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(port, "127.0.0.1", resolve); });
  const url = `http://127.0.0.1:${server.address().port}/#${token}`;
  if (!quiet) {
    console.log("Atelier portraits prêt. Aucun modèle IA, aucun envoi vers GitHub. Fermer cette fenêtre arrête l’outil.");
    console.log("Interface locale : " + url);
  }
  if (open) {
    if (process.platform === "win32") spawn("cmd", ["/c", "start", "", url], { stdio: "ignore" });
    else spawn(process.platform === "darwin" ? "open" : "xdg-open", [url], { stdio: "ignore" }).on("error", () => {});
  }
  return { server, url, token, state, work };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  createStudio({ open: process.argv.includes("--open") }).catch((e) => { console.error(e.message); process.exitCode = 1; });
}
