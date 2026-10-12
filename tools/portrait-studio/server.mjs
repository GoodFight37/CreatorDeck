import http from "node:http";
import { readFile, writeFile, mkdir, rename, copyFile, readdir, unlink } from "node:fs/promises";
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
export function zipFiles(entries) {
  const table = Array.from({ length: 256 }, (_, n) => { let c = n; for (let i = 0; i < 8; i++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const parts = []; const central = []; let offset = 0;
  for (const [name, data] of entries) {
    const filename = Buffer.from(name); let crc = 0xffffffff; for (const byte of data) crc = table[(crc ^ byte) & 255] ^ (crc >>> 8); crc = (crc ^ 0xffffffff) >>> 0;
    const local = Buffer.alloc(30); local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x800, 6); local.writeUInt16LE(33, 12); local.writeUInt32LE(crc, 14); local.writeUInt32LE(data.length, 18); local.writeUInt32LE(data.length, 22); local.writeUInt16LE(filename.length, 26);
    const index = Buffer.alloc(46); index.writeUInt32LE(0x02014b50, 0); index.writeUInt16LE(20, 4); index.writeUInt16LE(20, 6); index.writeUInt16LE(0x800, 8); index.writeUInt16LE(33, 14); index.writeUInt32LE(crc, 16); index.writeUInt32LE(data.length, 20); index.writeUInt32LE(data.length, 24); index.writeUInt16LE(filename.length, 28); index.writeUInt32LE(offset, 42);
    parts.push(local, filename, data); central.push(index, filename); offset += local.length + filename.length + data.length;
  }
  const directory = Buffer.concat(central); const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10); end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...parts, directory, end]);
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
  state.drafts ??= {}; state.tracking ??= {}; state.rejected ??= {}; state.session ??= {}; state.inbox ??= {}; state.visual ??= {};
  const catalog = new Map(creators.map((c) => [c.slug, c]));
  await mkdir(path.join(work, "originales"), { recursive: true });
  await mkdir(path.join(work, "portraits"), { recursive: true });
  let saves = Promise.resolve(); let batch = { running: false, done: 0, total: 0, error: "" };
  const token = randomBytes(24).toString("hex");
  const bridgeFile = path.join(work, "connexion-navigateur.json");
  const bridge = await jsonFile(bridgeFile, { token: randomBytes(24).toString("hex") });
  await writeFile(bridgeFile, JSON.stringify(bridge));
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
        const fromBridge = req.headers.authorization === `Bearer ${bridge.token}` && ["/api/bridge-state", "/api/receive"].includes(url.pathname);
        if (req.headers.authorization !== `Bearer ${token}` && !fromBridge) { res.writeHead(403, { "Content-Type": "application/json" }).end(JSON.stringify({ error: "Accès refusé : relance LANCER.cmd et utilise la nouvelle fenêtre." })); return; }
        if (req.method !== "GET" && req.headers.origin !== `http://${host}` && !(fromBridge && ((/^chrome-extension:\/\/[a-p]{32}$/.test(req.headers.origin || "")) || (!req.headers.origin && req.headers["x-studio-bridge"] === "1")))) { res.writeHead(403).end(); return; }
      }
      const reply = (data) => { res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" }); res.end(JSON.stringify(data)); };
      if (url.pathname === "/api/connect") { reply({ connection: `http://127.0.0.1:${server.address().port}/#${bridge.token}` }); return; }
      if (url.pathname === "/api/bridge-state") { const c = catalog.get(state.session.slug); reply({ slug: c?.slug, name: c?.displayName }); return; }
      if (req.method === "POST" && url.pathname === "/api/receive") {
        const b = await bodyJson(req); const c = creator(b.slug); const source = httpsUrl(b.source); const imageUrl = httpsUrl(b.imageUrl);
        const bytes = Buffer.from(b.original, "base64"); if (!bytes.length || bytes.length > 24 * 1024 * 1024) throw Error("Image vide ou trop lourde");
        const id = randomBytes(12).toString("hex"); await writeFile(path.join(work, "originales", "inbox-" + id), bytes);
        state.inbox[id] = { id, slug: c.slug, name: c.displayName, source, imageUrl, title: String(b.title || "Photo reçue"), receivedAt: new Date().toISOString(), opened: false }; await save(); reply({ ok: true }); return;
      }
      if (url.pathname === "/api/inbox") { reply({ items: Object.values(state.inbox).filter(x => !x.opened) }); return; }
      if (url.pathname === "/api/inbox-photo") { const id = url.searchParams.get("id"); if (!/^[a-f0-9]{24}$/.test(id || "") || !state.inbox[id]) throw Error("Photo inconnue"); res.writeHead(200, { "Content-Type": "application/octet-stream", "Cache-Control": "no-store" }); res.end(await readFile(path.join(work, "originales", "inbox-" + id))); return; }
      if (req.method === "POST" && url.pathname === "/api/inbox-opened") { const b = await bodyJson(req); if (!state.inbox[b.id]) throw Error("Photo inconnue"); state.inbox[b.id].opened = true; await save(); reply({ ok: true }); return; }
      if (url.pathname === "/api/state") { reply({ creators, base, choices: state.choices, skipped: state.skipped, tracking: state.tracking, drafts: state.drafts, received: state.inbox, rejected: state.rejected, session: state.session, visual: state.visual, batch }); return; }
      if (url.pathname === "/api/candidates") { const slug = url.searchParams.get("slug"); creator(slug); reply({ candidates: candidates(slug) }); return; }
      if (url.pathname === "/api/photo") { const bytes = await original(url.searchParams.get("slug"), url.searchParams.get("id")); res.writeHead(200, { "Content-Type": "application/octet-stream", "Cache-Control": "no-store" }); res.end(bytes); return; }
      if (req.method === "POST" && url.pathname === "/api/search") { const b = await bodyJson(req); reply({ candidates: await search(b.slug) }); return; }
      if (req.method === "POST" && url.pathname === "/api/batch") {
        if (batch.running) throw Error("Un lot est déjà en cours");
        const slugs = creators.filter((c) => !base[c.slug] && !state.choices[c.slug] && !state.visual[c.slug] && !state.skipped[c.slug] && !research[c.slug] && !state.searches[c.slug]).slice(0, 20).map((c) => c.slug);
        batch = { running: true, done: 0, total: slugs.length, error: "" }; reply(batch);
        (async () => { try { for (const slug of slugs) { await search(slug); batch.done++; await new Promise((r) => setTimeout(r, 1500)); } } catch (e) { batch.error = e.message; } finally { batch.running = false; } })(); return;
      }
      if (req.method === "POST" && url.pathname === "/api/skip") { const b = await bodyJson(req); creator(b.slug); state.skipped[b.slug] = true; await save(); reply({ ok: true }); return; }
      if (url.pathname === "/api/update-check") {
        const local = await jsonFile(path.join(directory, "release.json"), { version: "ancienne" });
        const latest = await remote("https://raw.githubusercontent.com/GoodFight37/CreatorDeck/main/tools/portrait-studio/release.json");
        reply({ current: local.version, latest: latest.version, available: local.version !== latest.version }); return;
      }
      if (url.pathname === "/api/review") {
        reply({ items: creators.filter((c) => !base[c.slug] && !state.choices[c.slug] && !state.visual[c.slug] && !state.skipped[c.slug]).map((c) => ({ ...c, candidates: candidates(c.slug).filter((p) => Math.min(p.width, p.height) >= 900 && /\.(jpg|jpeg|png|webp)(\?|$)/i.test(p.original || "") && !(state.rejected[c.slug] || []).includes(p.pageid)).sort((a,b) => Number(Boolean(b.titleMatch))-Number(Boolean(a.titleMatch)) || Number(Boolean(a.reviewNeeded))-Number(Boolean(b.reviewNeeded)) || Math.min(b.width,b.height)-Math.min(a.width,a.height)).slice(0,3) })).sort((a,b) => Number(Boolean(b.candidates.length))-Number(Boolean(a.candidates.length))) }); return;
      }
      if (req.method === "POST" && url.pathname === "/api/session") { const b = await bodyJson(req); creator(b.slug); state.session.slug = b.slug; await save(); reply({ ok: true }); return; }
      if (req.method === "POST" && url.pathname === "/api/reject") { const b = await bodyJson(req); creator(b.slug); state.rejected[b.slug] = [...new Set([...(state.rejected[b.slug] || []), Number(b.pageid)])]; await save(); reply({ ok: true }); return; }
      if (req.method === "POST" && url.pathname === "/api/tracking") {
        const b = await bodyJson(req); creator(b.slug);
        if (!["À chercher", "Trouvé", "À cadrer", "Droits à vérifier"].includes(b.status)) throw Error("Étape inconnue");
        const links = String(b.links || "").split("\n").map((x) => x.trim()).filter(Boolean).map((x) => httpsUrl(x));
        state.tracking[b.slug] = { status: b.status, links, notes: String(b.notes || "").slice(0, 10000) }; await save(); reply({ ok: true }); return;
      }
      if (req.method === "POST" && url.pathname === "/api/draft") {
        const b = await bodyJson(req); creator(b.slug); const bytes = Buffer.from(b.original, "base64");
        if (!bytes.length || bytes.length > 24 * 1024 * 1024) throw Error("Originale vide ou trop lourde (24 Mo maximum)");
        await writeFile(path.join(work, "originales", b.slug + "-draft"), bytes);
        state.drafts[b.slug] = { title: String(b.title || "Photo importée"), source: b.source ? httpsUrl(b.source) : "", author: String(b.author || ""), license: String(b.license || ""), permission: String(b.permission || ""), crop: b.crop, reviewNeeded: Boolean(b.reviewNeeded), proofUrl: b.proofUrl ? httpsUrl(b.proofUrl) : "", pageid: b.pageid };
        state.tracking[b.slug] = { ...state.tracking[b.slug], status: "À cadrer" }; await save(); reply({ ok: true }); return;
      }
      if (url.pathname === "/api/draft-photo" && req.method === "GET") {
        const slug = url.searchParams.get("slug"); creator(slug); res.writeHead(200, { "Content-Type": "application/octet-stream", "Cache-Control": "no-store" }); res.end(await readFile(path.join(work, "originales", slug + "-draft"))); return;
      }
      if (req.method === "POST" && ["/api/select", "/api/visual"].includes(url.pathname)) {
        const b = await bodyJson(req); const c = creator(b.slug); const pending = url.pathname === "/api/visual";
        const candidate = b.pageid ? (state.drafts[b.slug]?.pageid === b.pageid ? state.drafts[b.slug] : findCandidate(b.slug, b.pageid)) : null;
        if (!pending && (!b.verified || !b.author?.trim() || !b.title?.trim())) throw Error("Vérifie l’identité, la licence et les crédits avant de garder la photo");
        const source = b.source ? httpsUrl(b.source) : "";
        if (!pending && !source) throw Error("Source requise");
        const direct = b.license === "Autorisation directe";
        if (!pending && direct && (!b.permission?.trim() || !b.proofUrl)) throw Error("Précise la portée de l’autorisation et son lien de preuve");
        const licenseUrl = pending ? "" : direct ? httpsUrl(b.proofUrl) : httpsUrl(b.licenseUrl, ["creativecommons.org"]);
        if (!pending && !direct && !/^(CC BY(?:-SA)? [234]\.0|CC0)$/.test(b.license)) throw Error("Choisis une licence ou une autorisation directe documentée");
        const bytes = Buffer.from(b.webp, "base64"); const size = webpSize(bytes);
        if (size[0] !== 900 || size[1] !== 900) throw Error("Le portrait doit être un WebP carré de 900 px");
        if (![b.crop?.size, b.crop?.x, b.crop?.y].every(Number.isFinite) || b.crop.size < 900 || b.crop.x < 0 || b.crop.y < 0) throw Error("Cadrage incorrect ou agrandissement interdit");
        if (pending) {
          await mkdir(path.join(work, "selections"), { recursive: true }); await writeFile(path.join(work, "selections", b.slug + ".webp"), bytes);
          if (candidate && state.downloaded[`${b.slug}-${b.pageid}`]) {
            await copyFile(path.join(work, "originales", `${b.slug}-${b.pageid}`), path.join(work, "originales", b.slug + "-draft"));
            state.drafts[b.slug] = { ...candidate, title: b.title || candidate.title, author: b.author || candidate.author, source, crop: b.crop };
          }
          state.visual[b.slug] = { name: c.displayName, title: b.title || c.displayName, author: b.author || "", source, license: b.license || "", proofUrl: b.proofUrl || "", permission: b.permission || "", crop: b.crop, rightsStatus: "à vérifier" };
          state.tracking[b.slug] = { ...state.tracking[b.slug], status: "Droits à vérifier" }; delete state.skipped[b.slug]; await save(); reply({ ok: true }); return;
        }
        delete state.visual[b.slug];
        await writeFile(path.join(work, "portraits", b.slug + ".webp"), bytes);
        let changes = `Recadrage carré individuel (${Math.round(b.crop.x)}, ${Math.round(b.crop.y)}, ${Math.round(b.crop.size)} px) et conversion WebP, 900 × 900 px, sans agrandissement.`;
        if (direct) changes += ` Autorisation déclarée : ${b.permission.trim()}. Preuve : ${licenseUrl}`;
        if (b.license.includes("BY-SA")) changes += ` Cette adaptation reste sous ${b.license}.`;
        state.choices[b.slug] = { name: c.displayName, image: `/creators/curated/${b.slug}.webp`, title: b.title, author: b.author.trim(), source, license: b.license, licenseUrl, changes, original: candidate?.original ?? "fichier fourni sur le PC", selectedAt: new Date().toISOString() };
        state.tracking[b.slug] = { ...state.tracking[b.slug], status: "Prêt" };
        delete state.skipped[b.slug]; await save(); reply({ ok: true }); return;
      }
      if (req.method === "POST" && url.pathname === "/api/export") {
        const target = path.join(work, "EXPORT"); const images = path.join(target, "public", "creators", "curated"); await mkdir(images, { recursive: true });
        const patch = {};
        for (const [slug, item] of Object.entries(base)) if (!published[slug]) { await copyFile(path.join(seed, "portraits", slug + ".webp"), path.join(images, slug + ".webp")); patch[slug] = item; }
        for (const [slug, item] of Object.entries(state.choices)) { await copyFile(path.join(work, "portraits", slug + ".webp"), path.join(images, slug + ".webp")); const { original: ignoredOriginal, selectedAt: ignoredDate, ...entry } = item; void ignoredOriginal; void ignoredDate; patch[slug] = entry; }
        await writeFile(path.join(target, "portrait-overrides.patch.json"), JSON.stringify(patch, null, 2) + "\n");
        const pendingDir = path.join(target, "A-VERIFIER"); await mkdir(pendingDir, { recursive: true });
        for (const file of await readdir(pendingDir)) if (file.endsWith(".webp") && catalog.has(file.slice(0, -5)) && !state.visual[file.slice(0, -5)]) await unlink(path.join(pendingDir, file));
        for (const slug of Object.keys(state.visual)) await copyFile(path.join(work, "selections", slug + ".webp"), path.join(pendingDir, slug + ".webp"));
        await writeFile(path.join(pendingDir, "selections-non-publiables.json"), JSON.stringify(state.visual, null, 2));
        await writeFile(path.join(target, "suivi-sources.json"), JSON.stringify({ tracking: state.tracking, drafts: state.drafts, received: state.inbox }, null, 2));
        await writeFile(path.join(target, "README.txt"), "Importer les images dans public/creators/curated et fusionner les entrées du JSON avec src/data/portrait-overrides.json. Ne pas écraser le registre complet. A-VERIFIER contient des sélections non publiables : ne pas les intégrer sans vérification des droits. Les crédits sont déjà affichés par CreatorDeck. Ce dossier ne publie rien automatiquement.\n");
        reply({ directory: target, count: Object.keys(patch).length, pendingCount: Object.keys(state.visual).length }); return;
      }
      if (url.pathname === "/api/export-zip" && req.method === "GET") {
        const target = path.join(work, "EXPORT"); const patch = await jsonFile(path.join(target, "portrait-overrides.patch.json"), null); if (!patch) throw Error("Lance d’abord l’export");
        const pending = await jsonFile(path.join(target, "A-VERIFIER", "selections-non-publiables.json"), {}); const entries = [];
        const names = ["portrait-overrides.patch.json", "suivi-sources.json", "README.txt", "A-VERIFIER/selections-non-publiables.json"];
        for (const slug of Object.keys(patch)) { creator(slug); names.push(`public/creators/curated/${slug}.webp`); }
        for (const slug of Object.keys(pending)) { creator(slug); names.push(`A-VERIFIER/${slug}.webp`); }
        for (const name of names) entries.push([name, await readFile(path.join(target, name))]);
        res.writeHead(200, { "Content-Type": "application/zip", "Content-Disposition": 'attachment; filename="CreatorDeck-Portraits.zip"', "Cache-Control": "no-store" }); res.end(zipFiles(entries)); return;
      }
      if (url.pathname === "/" || url.pathname === "/app.js") { const file = url.pathname === "/" ? "index.html" : "app.js"; res.writeHead(200, { "Content-Type": mime[path.extname(file)], "Cache-Control": "no-store" }); res.end(await readFile(path.join(directory, file))); return; }
      const visual = url.pathname.match(/^\/visual\/([a-z0-9-]+)\.webp$/);
      if (visual) { creator(visual[1]); res.writeHead(200, { "Content-Type": "image/webp", "Cache-Control": "no-store" }); res.end(await readFile(path.join(work, "selections", visual[1] + ".webp"))); return; }
      const picked = url.pathname.match(/^\/chosen\/([a-z0-9-]+)\.webp$/);
      if (picked) { creator(picked[1]); res.writeHead(200, { "Content-Type": "image/webp", "Cache-Control": "no-store" }); res.end(await readFile(path.join(work, "portraits", picked[1] + ".webp"))); return; }
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
