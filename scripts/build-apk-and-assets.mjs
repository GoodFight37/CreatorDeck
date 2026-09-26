import { mkdir, readdir, readFile, rm, unlink, writeFile, copyFile } from "node:fs/promises";
import path from "node:path";
import { execSync, execFileSync } from "node:child_process";
import sharp from "sharp";

const ROOT = process.cwd();
const CREATORS_DIR = path.join(ROOT, "public/creators");
const DOWNLOADS_DIR = path.join(ROOT, "public/downloads");
const BUNDLE_DIR = path.join(ROOT, ".tmp-creatordeck-bundle");

// Résolution des portraits embarqués dans photos.js (APK hors-ligne).
// 300 = plafond du CDN Twitch ; voir le commentaire au point d'encodage.
const APK_PHOTO_SIZE = 300;
const APK_PHOTO_QUALITY = 80;

async function main() {
  const creators = JSON.parse(
    await readFile(path.join(ROOT, "src/data/creators.json"), "utf8"),
  );

  // 1. Nettoyage strict de public/creators pour n'avoir que les 500 fichiers du Top 500
  const validFiles = new Set(creators.map((c) => `${c.slug}.jpg`));
  for (const entry of await readdir(CREATORS_DIR)) {
    if (!validFiles.has(entry)) {
      await unlink(path.join(CREATORS_DIR, entry));
    }
  }

  await mkdir(DOWNLOADS_DIR, { recursive: true });
  await rm(BUNDLE_DIR, { recursive: true, force: true });
  await mkdir(path.join(BUNDLE_DIR, "web"), { recursive: true });
  await mkdir(path.join(BUNDLE_DIR, "android/app/assets"), { recursive: true });
  await mkdir(path.join(BUNDLE_DIR, "creators"), { recursive: true });

  console.log("1/4 Encodage optimisé des 500 portraits pour photos.js (APK hors-ligne)...");
  const photosMap = {};
  const creditsMap = {};

  for (const creator of creators) {
    const srcFile = path.join(CREATORS_DIR, `${creator.slug}.jpg`);
    await copyFile(srcFile, path.join(BUNDLE_DIR, "creators", `${creator.slug}.jpg`));
    const tinyBuf = await sharp(srcFile)
      .resize(APK_PHOTO_SIZE, APK_PHOTO_SIZE, {
        fit: "cover",
        position: "centre",
        withoutEnlargement: true,
        kernel: "lanczos3",
      })
      .jpeg({ quality: APK_PHOTO_QUALITY, mozjpeg: true })
      .toBuffer();
    photosMap[creator.slug] = `data:image/jpeg;base64,${tinyBuf.toString("base64")}`;
    creditsMap[creator.slug] = {
      nom: creator.displayName,
      login: creator.login,
      categorie: creator.category,
      followers: creator.followers || 0,
      source: `https://twitch.tv/${creator.login}`,
    };
  }

  const photosJsContent = [
    "// CreatorDeck Top 500 Twitch FR - 500 portraits officiels embarqués",
    "// Généré automatiquement : assigne explicitement window.PHOTOS et window.PHOTO_CREDITS",
    `const PHOTOS = ${JSON.stringify(photosMap)};`,
    `const PHOTO_CREDITS = ${JSON.stringify(creditsMap)};`,
    "if (typeof window !== 'undefined') {",
    "  window.PHOTOS = PHOTOS;",
    "  window.PHOTO_CREDITS = PHOTO_CREDITS;",
    "  window.PHOTO_CREDIT = PHOTO_CREDITS;",
    "}",
    "",
  ].join("\n");

  await writeFile(path.join(BUNDLE_DIR, "web/photos.js"), photosJsContent);
  await writeFile(path.join(BUNDLE_DIR, "android/app/assets/photos.js"), photosJsContent);
  await writeFile(
    path.join(BUNDLE_DIR, "creators.json"),
    `${JSON.stringify(creators, null, 2)}\n`,
  );

  console.log("2/4 Génération de l'application Android/Web autonome Top 500...");
  const standaloneHtml = buildStandaloneAppHtml(creators);
  await writeFile(path.join(BUNDLE_DIR, "web/index.html"), standaloneHtml);
  await writeFile(path.join(BUNDLE_DIR, "android/app/assets/index.html"), standaloneHtml);

  await createAndroidNativeFiles(path.join(BUNDLE_DIR, "android"));

  console.log("3/4 Création de l'archive creatordeck-assets-top500.zip...");
  const zipPath = path.join(DOWNLOADS_DIR, "creatordeck-assets-top500.zip");
  await rm(zipPath, { force: true });

  // Adaptation spécifique Windows pour la création du fichier .zip
  if (process.platform === "win32") {
    execSync(
      `powershell -Command "Compress-Archive -Path '${path.join(BUNDLE_DIR, "creators.json")}', '${path.join(BUNDLE_DIR, "creators")}', '${path.join(BUNDLE_DIR, "web")}', '${path.join(BUNDLE_DIR, "android")}' -DestinationPath '${zipPath}' -Force"`
    );
  } else {
    execFileSync(
      "zip",
      ["-r", "-q", zipPath, "creators.json", "creators", "web", "android"],
      { cwd: BUNDLE_DIR },
    );
  }

  console.log("4/4 Compilation et signature de l'APK Android creatordeck-top500.apk...");
  const apkPath = path.join(DOWNLOADS_DIR, "creatordeck-top500.apk");
  await compileAndroidApk(path.join(BUNDLE_DIR, "android"), apkPath);

  console.log("✅ APK et archive d'assets générés dans public/downloads/ !");
}

function buildStandaloneAppHtml(creators) {
  const compactCatalog = creators.map((c) => ({
    id: `c${c.rank}`,
    slug: c.slug,
    name: c.displayName,
    login: c.login,
    cat: c.category,
    rarity: c.rarity,
    rank: c.rank,
    followers: c.followers || 0,
  }));

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,viewport-fit=cover,user-scalable=no">
<meta name="theme-color" content="#090812">
<meta name="color-scheme" content="dark">
<title>CreatorDeck — Top 500 Twitch FR</title>
<style>
:root{
  --bg:#090812;--panel:#151224;--panel2:#1d1930;--line:rgba(255,255,255,.1);
  --txt:#f7f5ff;--muted:#9a94ad;--purple:#8f64ff;--pink:#ff4fa3;--gold:#ffbd45;--green:#43d69c;--blue:#40a9ff;
}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent;user-select:none}
html,body{height:100%;margin:0;background:var(--bg);color:var(--txt);font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;overflow:hidden}
.app{display:flex;flex-direction:column;height:100%;max-width:540px;margin:0 auto;background:radial-gradient(circle at 50% 0%,rgba(143,100,255,.18),transparent 55%),var(--bg)}
header{display:flex;align-items:center;justify-content:space-between;padding:calc(10px + env(safe-area-inset-top)) 14px 10px;border-bottom:1px solid var(--line);background:rgba(9,8,18,.92)}
.brand{display:flex;align-items:center;gap:9px}
.logo{width:32px;height:36px;border-radius:8px;background:linear-gradient(145deg,#9d73ff,#5430d9);display:grid;place-items:center;font-weight:900;font-size:11px;border:1px solid rgba(255,255,255,.35)}
.brand b{font-size:14px;display:block}
.brand small{font-size:10px;color:var(--muted)}
.res{display:flex;gap:6px;align-items:center}
.pill{padding:5px 9px;border-radius:10px;background:rgba(143,100,255,.12);border:1px solid rgba(143,100,255,.25);font-size:11px;font-weight:700}
.pill.gold{background:rgba(255,189,69,.12);border-color:rgba(255,189,69,.28);color:#ffd584}
main{flex:1;overflow-y:auto;padding:14px 14px 96px}
nav{position:fixed;bottom:0;left:0;right:0;max-width:540px;margin:0 auto;display:grid;grid-template-columns:repeat(4,1fr);background:rgba(11,9,20,.96);border-top:1px solid var(--line);padding:6px 6px calc(6px + env(safe-area-inset-bottom));z-index:20}
nav button{background:none;border:0;color:var(--muted);padding:7px 4px;font-size:10px;font-weight:700;display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer}
nav button.on{color:#d5c2ff}
.tabs{display:grid;grid-template-columns:1fr 1fr;gap:6px;background:rgba(255,255,255,.03);padding:4px;border-radius:12px;border:1px solid var(--line)}
.tabs button{padding:10px;border-radius:9px;border:0;background:transparent;color:var(--muted);font-weight:800;font-size:12px;cursor:pointer}
.tabs button.on{background:#231b3a;color:#fff;box-shadow:inset 0 0 0 1px rgba(180,145,255,.25)}
.pack-box{margin:16px 0;padding:20px 16px;border-radius:18px;background:linear-gradient(160deg,#251842,#120f1d);border:1px solid rgba(180,145,255,.22);text-align:center;position:relative;overflow:hidden}
.pack-box.archive{background:linear-gradient(160deg,#3d2914,#14100d);border-color:rgba(255,189,69,.25)}
.pack-visual{width:155px;height:225px;margin:6px auto 14px;border-radius:14px;background:linear-gradient(150deg,#7a45f0,#231542 58%,#0d0a18);border:1px solid rgba(255,255,255,.28);box-shadow:0 20px 40px rgba(0,0,0,.65);display:flex;flex-direction:column;justify-content:space-between;padding:12px;position:relative;overflow:hidden}
.pack-box.archive .pack-visual{background:linear-gradient(150deg,#cf8428,#472c12 58%,#120d08)}
.pack-faces{display:flex;justify-content:center;align-items:center;gap:4px;margin:auto 0}
.pack-faces img{width:42px;height:42px;border-radius:50%;object-fit:cover;border:2px solid rgba(255,255,255,.4)}
.cta{width:100%;padding:14px;border-radius:12px;border:0;background:linear-gradient(110deg,#7443e9,#9c6eff);color:#fff;font-weight:800;font-size:13px;cursor:pointer;margin-top:10px}
.cta:disabled{opacity:.45;cursor:not-allowed}
.subbtn{width:100%;padding:10px;border-radius:10px;border:1px solid var(--line);background:rgba(255,255,255,.04);color:#ddd;font-weight:700;font-size:11px;margin-top:8px;cursor:pointer}
.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin-top:12px}
.card{position:relative;aspect-ratio:.72;border-radius:11px;overflow:hidden;background:#141220;border:1.5px solid var(--c,#8d95a7);box-shadow:0 8px 18px rgba(0,0,0,.5)}
.card img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.card.locked img{filter:grayscale(1) brightness(.24)}
.card .shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.18) 0%,transparent 42%,rgba(7,6,12,.95) 92%)}
.card .top{position:absolute;top:6px;left:6px;right:6px;display:flex;justify-content:space-between;font-size:8px;font-weight:800}
.card .top span{background:rgba(0,0,0,.68);padding:2px 5px;border-radius:4px;border:1px solid rgba(255,255,255,.15)}
.card .vtag{position:absolute;top:24px;right:6px;font-size:7px;font-weight:900;padding:2px 5px;border-radius:4px;background:#d62976;color:#fff}
.card .bot{position:absolute;bottom:6px;left:7px;right:7px}
.card .bot small{display:block;font-size:7px;color:var(--c,#ccc);text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:700}
.card .bot b{display:block;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.card .bot .meta{display:flex;justify-content:space-between;font-size:7.5px;color:#aaa;margin-top:2px}
.search{width:100%;padding:11px 12px;border-radius:10px;border:1px solid var(--line);background:rgba(255,255,255,.04);color:#fff;font-size:12px;margin-top:10px}
.chips{display:flex;gap:6px;overflow-x:auto;padding:8px 0}
.chips button{flex:0 0 auto;padding:6px 10px;border-radius:8px;border:1px solid var(--line);background:transparent;color:var(--muted);font-size:10px;font-weight:700}
.chips button.on{background:rgba(143,100,255,.2);color:#fff;border-color:#8f64ff}
.pager{display:flex;justify-content:space-between;align-items:center;margin-top:12px;padding:8px 10px;border-radius:10px;background:rgba(255,255,255,.03);border:1px solid var(--line);font-size:11px}
.pager button{padding:6px 11px;border-radius:7px;border:1px solid var(--line);background:#1f1932;color:#fff;font-size:11px;font-weight:700}
.pager button:disabled{opacity:.35}
.modal{position:fixed;inset:0;background:rgba(6,5,12,.96);z-index:50;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px}
.modal .big-card{width:min(72vw,270px)}
.toast{position:fixed;bottom:78px;left:50%;transform:translateX(-50%);background:#231b3a;border:1px solid #8f64ff;color:#fff;padding:9px 14px;border-radius:10px;font-size:11px;font-weight:700;z-index:80}
</style>
</head>
<body>
<div class="app">
  <header>
    <div class="brand">
      <div class="logo">CD</div>
      <div><b>CreatorDeck</b><small>Top 500 Twitch FR</small></div>
    </div>
    <div class="res">
      <span class="pill" id="hdrHg">⏳ 12</span>
      <span class="pill gold" id="hdrPts">✨ 120</span>
      <span class="pill" id="hdrLv">Niv. 1</span>
    </div>
  </header>
  <main id="main"></main>
  <nav>
    <button id="nav-home" class="on" onclick="setTab('home')"><span>🎴</span><span>Boosters</span></button>
    <button id="nav-col" onclick="setTab('col')"><span>📖</span><span>Classeur (500)</span></button>
    <button id="nav-mis" onclick="setTab('mis')"><span>🎯</span><span>Missions</span></button>
    <button id="nav-info" onclick="setTab('info')"><span>ℹ️</span><span>Infos</span></button>
  </nav>
</div>
<div id="modalRoot"></div>
<script src="photos.js"></script>
<script>
const CATALOG = ${JSON.stringify(compactCatalog)};
const BY_SLUG = Object.fromEntries(CATALOG.map(c => [c.slug, c]));
const RARITY = {
  legendary: { name: "Légendaire", short: "L", color: "#ffbd45", weightLive: 2, weightArch: 4 },
  epic:      { name: "Épique",     short: "E", color: "#a46cff", weightLive: 8, weightArch: 13 },
  rare:      { name: "Rare",       short: "R", color: "#40a9ff", weightLive: 18, weightArch: 25 },
  uncommon:  { name: "Peu commune",short: "PC",color: "#43d69c", weightLive: 30, weightArch: 31 },
  common:    { name: "Commune",    short: "C", color: "#8d95a7", weightLive: 42, weightArch: 27 }
};
const LIVE = { regen: 3600000, max: 4 };
const ARCH = { regen: 14400000, max: 3 };
const SAB  = { live: 900000, archive: 3600000 };
const KEY_STORE = "creatordeck_top500_v2";

function freshState() {
  return {
    live: 2, lastLive: Date.now(),
    arch: 1, lastArch: Date.now(),
    hg: 12, points: 120, xp: 0, level: 1,
    opened: 0, liveOpened: 0, archOpened: 0,
    own: {}, claimed: {}
  };
}

let S = freshState();
try {
  const raw = localStorage.getItem(KEY_STORE);
  if (raw) S = Object.assign(freshState(), JSON.parse(raw));
} catch (e) {}

function save() {
  try { localStorage.setItem(KEY_STORE, JSON.stringify(S)); } catch (e) {}
  updateHeader();
}

function syncRegen() {
  const now = Date.now();
  if (S.live < LIVE.max) {
    const g = Math.floor((now - S.lastLive) / LIVE.regen);
    if (g > 0) {
      S.live = Math.min(LIVE.max, S.live + g);
      S.lastLive = S.live >= LIVE.max ? now : S.lastLive + g * LIVE.regen;
    }
  } else S.lastLive = now;
  if (S.arch < ARCH.max) {
    const g = Math.floor((now - S.lastArch) / ARCH.regen);
    if (g > 0) {
      S.arch = Math.min(ARCH.max, S.arch + g);
      S.lastArch = S.arch >= ARCH.max ? now : S.lastArch + g * ARCH.regen;
    }
  } else S.lastArch = now;
}

function photoOf(slug) {
  return (window.PHOTOS && window.PHOTOS[slug]) || ("../creators/" + slug + ".jpg");
}

function fmtFollowers(n) {
  if (!n) return "Twitch FR";
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(".", ",") + " M";
  if (n >= 1000) return Math.round(n / 1000) + " k";
  return String(n);
}

function fmtTime(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? h + "h " + String(m).padStart(2, "0") + "m" : String(m).padStart(2, "0") + ":" + String(sec).padStart(2, "0");
}

function toast(msg) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2000);
}

function pickCard(packType, used, minRare) {
  const allowed = minRare ? ["rare", "epic", "legendary"] : ["common", "uncommon", "rare", "epic", "legendary"];
  const pool = CATALOG.filter(c => !used.has(c.slug) && allowed.includes(c.rarity));
  const weights = allowed.map(r => ({
    r,
    w: packType === "live" ? RARITY[r].weightLive : RARITY[r].weightArch
  }));
  const total = weights.reduce((a, b) => a + b.w, 0);
  let roll = Math.random() * total;
  let chosen = weights[0].r;
  for (const item of weights) {
    if (roll < item.w) { chosen = item.r; break; }
    roll -= item.w;
  }
  const bucket = pool.filter(c => c.rarity === chosen);
  const list = bucket.length ? bucket : pool;
  return list[Math.floor(Math.random() * list.length)];
}

function drawPack(packType) {
  const size = packType === "live" ? 5 : 3;
  const used = new Set();
  const drawn = [];
  for (let i = 0; i < size; i++) {
    const isLast = i === size - 1;
    const c = pickCard(packType, used, isLast);
    used.add(c.slug);
    let variant = "standard";
    if (packType === "live" && isLast) variant = "live";
    else if (packType === "archive" && c.rarity === "legendary" && Math.random() < 0.25) variant = "gold";
    else if (Math.random() < 0.18) variant = "holo";
    const isNew = !S.own[c.slug];
    S.own[c.slug] = (S.own[c.slug] || 0) + 1;
    drawn.push({ creator: c, variant, isNew });
  }
  return drawn;
}

let tab = "home";
let packType = "live";
let colFilter = "all";
let colQuery = "";
let colPage = 0;
let revealQueue = [];
let revealIdx = 0;

function updateHeader() {
  syncRegen();
  document.getElementById("hdrHg").textContent = "⏳ " + S.hg;
  document.getElementById("hdrPts").textContent = "✨ " + S.points;
  document.getElementById("hdrLv").textContent = "Niv. " + S.level;
}

function cardHtml(c, count, locked, variant) {
  const r = RARITY[c.rarity];
  const vLabel = variant === "live" ? "LIVE" : variant === "gold" ? "GOLD" : variant === "holo" ? "HOLO" : "";
  return '<div class="card ' + (locked ? 'locked' : '') + '" style="--c:' + r.color + '">' +
    '<img src="' + photoOf(c.slug) + '" alt="' + c.name.replace(/"/g, '') + '" loading="lazy">' +
    '<div class="shade"></div>' +
    '<div class="top"><span>#' + String(c.rank).padStart(3, "0") + '</span><span style="color:' + r.color + '">' + r.short + '</span></div>' +
    (vLabel && !locked ? '<div class="vtag">' + vLabel + '</div>' : '') +
    '<div class="bot"><small>' + c.cat + '</small><b>' + (locked ? '???' : c.name) + '</b>' +
    '<div class="meta"><span>' + (locked ? r.name : fmtFollowers(c.followers)) + '</span><span>' + (!locked && count > 1 ? '×' + count : '') + '</span></div></div></div>';
}

function setTab(next) {
  tab = next;
  ["home", "col", "mis", "info"].forEach(id => {
    document.getElementById("nav-" + id).classList.toggle("on", id === next);
  });
  render();
}

function openBooster() {
  syncRegen();
  const isLive = packType === "live";
  if ((isLive ? S.live : S.arch) <= 0) return toast("Réserve vide, utilise un sablier !");
  if (isLive) { S.live--; S.liveOpened++; } else { S.arch--; S.archOpened++; }
  S.opened++;
  S.points += isLive ? 12 : 25;
  S.xp += isLive ? 20 : 30;
  const nextLv = Math.floor(S.xp / 100) + 1;
  if (nextLv > S.level) {
    S.hg += (nextLv - S.level) * 3;
    S.level = nextLv;
  }
  revealQueue = drawPack(packType);
  revealIdx = 0;
  save();
  renderReveal();
  render();
}

function spendSablier() {
  syncRegen();
  if (S.hg <= 0) return toast("Plus de sabliers disponibles");
  const isLive = packType === "live";
  if ((isLive ? S.live : S.arch) >= (isLive ? LIVE.max : ARCH.max)) return toast("Réserve déjà pleine");
  S.hg--;
  if (isLive) S.lastLive -= SAB.live;
  else S.lastArch -= SAB.archive;
  syncRegen();
  save();
  toast("Sablier utilisé !");
  render();
}

function renderReveal() {
  const root = document.getElementById("modalRoot");
  if (!revealQueue.length) { root.innerHTML = ""; return; }
  const item = revealQueue[revealIdx];
  const isLast = revealIdx >= revealQueue.length - 1;
  root.innerHTML = '<div class="modal">' +
    '<div style="font-size:12px;color:#aaa;margin-bottom:10px">Carte ' + (revealIdx + 1) + ' / ' + revealQueue.length + (item.isNew ? ' · <b style="color:#43d69c">NOUVELLE !</b>' : '') + '</div>' +
    '<div class="big-card">' + cardHtml(item.creator, S.own[item.creator.slug] || 1, false, item.variant) + '</div>' +
    '<h2 style="margin:14px 0 4px">' + item.creator.name + '</h2>' +
    '<div style="font-size:12px;color:#aaa;margin-bottom:16px">Rang #' + item.creator.rank + ' · ' + fmtFollowers(item.creator.followers) + ' abonnés</div>' +
    '<button class="cta" style="max-width:270px" onclick="' + (isLast ? 'closeReveal()' : 'nextReveal()') + '">' + (isLast ? 'Ranger dans le classeur' : 'Carte suivante →') + '</button>' +
    '</div>';
}

function nextReveal() { revealIdx++; renderReveal(); }
function closeReveal() { revealQueue = []; renderReveal(); }

function render() {
  updateHeader();
  const main = document.getElementById("main");
  const uniqueOwned = Object.keys(S.own).length;

  if (tab === "home") {
    const isLive = packType === "live";
    const bank = isLive ? S.live : S.arch;
    const max = isLive ? LIVE.max : ARCH.max;
    const nextMs = isLive ? LIVE.regen - ((Date.now() - S.lastLive) % LIVE.regen) : ARCH.regen - ((Date.now() - S.lastArch) % ARCH.regen);
    const faces = (isLive ? [CATALOG[0], CATALOG[1], CATALOG[2]] : [CATALOG[3], CATALOG[4], CATALOG[5]])
      .map(c => '<img src="' + photoOf(c.slug) + '" alt="">').join("");

    main.innerHTML =
      '<div class="tabs">' +
        '<button class="' + (isLive ? 'on' : '') + '" onclick="packType=\\'live\\';render()">Booster Live (' + S.live + '/' + LIVE.max + ')</button>' +
        '<button class="' + (!isLive ? 'on' : '') + '" onclick="packType=\\'archive\\';render()">Archives (' + S.arch + '/' + ARCH.max + ')</button>' +
      '</div>' +
      '<div class="pack-box ' + (isLive ? '' : 'archive') + '">' +
        '<div style="font-size:10px;font-weight:800;letter-spacing:.14em;color:#cbbaff">SAISON 01 · TOP 500 TWITCH FR</div>' +
        '<div class="pack-visual">' +
          '<div style="font-weight:900;font-size:14px">CREATOR DECK</div>' +
          '<div class="pack-faces">' + faces + '</div>' +
          '<div style="font-size:10px;font-weight:800">' + (isLive ? '5 CARTES · 1 LIVE' : '3 CARTES · RARE+') + '</div>' +
        '</div>' +
        '<div style="font-size:12px;color:#ccc">En réserve : <b>' + bank + ' / ' + max + '</b> · ' + (bank >= max ? 'Plein' : 'Prochain dans ' + fmtTime(nextMs)) + '</div>' +
        '<button class="cta" ' + (bank <= 0 ? 'disabled' : '') + ' onclick="openBooster()">OUVRIR UN BOOSTER (' + (isLive ? '5' : '3') + ' CARTES)</button>' +
        '<button class="subbtn" onclick="spendSablier()">Utiliser 1 sablier (' + S.hg + ' disp.) · -' + (isLive ? '15 min' : '1 h') + '</button>' +
      '</div>' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:14px">' +
        '<b>Progression Top 500 FR</b><span>' + uniqueOwned + ' / 500 (' + Math.round(uniqueOwned / 5) + '%)</span>' +
      '</div>';
    return;
  }

  if (tab === "col") {
    const filtered = CATALOG.filter(c => {
      if (colFilter === "owned" && !S.own[c.slug]) return false;
      if (colFilter !== "all" && colFilter !== "owned" && c.rarity !== colFilter) return false;
      if (colQuery && !(c.name + " " + c.cat + " " + c.login).toLowerCase().includes(colQuery.toLowerCase())) return false;
      return true;
    });
    const perPage = 30;
    const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
    if (colPage >= totalPages) colPage = 0;
    const slice = filtered.slice(colPage * perPage, (colPage + 1) * perPage);

    main.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:center">' +
        '<div><b style="font-size:17px">Classeur Top 500 FR</b><div style="font-size:11px;color:#9a94ad">' + uniqueOwned + ' / 500 streameurs débloqués</div></div>' +
        '<span class="pill">' + filtered.length + ' cartes</span>' +
      '</div>' +
      '<input class="search" placeholder="Rechercher un streameur (#1 à #500)..." value="' + colQuery.replace(/"/g, '') + '" oninput="colQuery=this.value;colPage=0;render()">' +
      '<div class="chips">' +
        [['all','Toutes (500)'],['owned','Obtenues ('+uniqueOwned+')'],['legendary','Légendaires (25)'],['epic','Épiques (60)'],['rare','Rares (115)'],['uncommon','Peu communes (150)'],['common','Communes (150)']].map(([k,lbl]) =>
          '<button class="' + (colFilter===k?'on':'') + '" onclick="colFilter=\\''+k+'\\';colPage=0;render()">' + lbl + '</button>'
        ).join('') +
      '</div>' +
      '<div class="pager">' +
        '<button ' + (colPage<=0?'disabled':'') + ' onclick="colPage--;render()">← Préc.</button>' +
        '<span>Page <b>' + (colPage + 1) + '</b> / ' + totalPages + '</span>' +
        '<button ' + (colPage>=totalPages-1?'disabled':'') + ' onclick="colPage++;render()">Suiv. →</button>' +
      '</div>' +
      '<div class="grid">' + slice.map(c => cardHtml(c, S.own[c.slug] || 0, !S.own[c.slug], "standard")).join('') + '</div>';
    return;
  }

  if (tab === "mis") {
    const missions = [
      { id: "m1", title: "Ouvrir 2 boosters", cur: S.opened, max: 2, hg: 4 },
      { id: "m2", title: "Débloquer 15 streameurs du Top 500", cur: uniqueOwned, max: 15, hg: 6 },
      { id: "m3", title: "Débloquer 50 streameurs du Top 500", cur: uniqueOwned, max: 50, hg: 12 },
      { id: "m4", title: "Ouvrir 10 boosters", cur: S.opened, max: 10, hg: 10 }
    ];
    main.innerHTML = '<b style="font-size:17px">Missions & Objectifs</b>' +
      missions.map(m => {
        const done = m.cur >= m.max;
        const claimed = !!S.claimed[m.id];
        return '<div style="margin-top:10px;padding:12px;border-radius:12px;background:rgba(255,255,255,.03);border:1px solid var(--line);display:flex;justify-content:space-between;align-items:center">' +
          '<div><b>' + m.title + '</b><div style="font-size:11px;color:#9a94ad">' + Math.min(m.cur, m.max) + ' / ' + m.max + ' · Récompense : +' + m.hg + ' sabliers</div></div>' +
          (claimed ? '<span class="pill">Réclamé ✓</span>' : done ? '<button class="cta" style="width:auto;margin:0;padding:8px 12px" onclick="S.claimed[\\''+m.id+'\\']=true;S.hg+='+m.hg+';save();render()">Réclamer</button>' : '<span class="pill">' + Math.min(m.cur, m.max) + '/' + m.max + '</span>') +
        '</div>';
      }).join('');
    return;
  }

  main.innerHTML =
    '<b style="font-size:17px">CreatorDeck — Édition Top 500 FR</b>' +
    '<p style="font-size:12px;color:#bbb;line-height:1.5">Catalogue complet des 500 chaînes Twitch francophones avec leurs 500 photos de profil officielles embarquées hors-ligne dans <code>photos.js</code>.</p>' +
    '<button class="subbtn" style="color:#ff6d82" onclick="if(confirm(\\'Réinitialiser la sauvegarde locale ?\\')){localStorage.removeItem(KEY_STORE);S=freshState();render();}">Réinitialiser la progression</button>';
}

function androidBack() {
  if (revealQueue.length) { closeReveal(); return "true"; }
  if (tab !== "home") { setTab("home"); return "true"; }
  return "false";
}

render();
</script>
</body>
</html>`;
}

async function createAndroidNativeFiles(androidDir) {
  const javaDir = path.join(androidDir, "app/java/com/creatordeck");
  const resDir = path.join(androidDir, "app/java/res");
  await mkdir(javaDir, { recursive: true });
  await mkdir(path.join(resDir, "values"), { recursive: true });
  await mkdir(path.join(resDir, "drawable"), { recursive: true });

  await writeFile(
    path.join(androidDir, "app/java/AndroidManifest.xml"),
    `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.creatordeck"
    android:versionCode="500"
    android:versionName="3.0-top500">
    <uses-sdk android:minSdkVersion="24" android:targetSdkVersion="34" />
    <application
        android:label="@string/app_name"
        android:icon="@drawable/ic_launcher"
        android:theme="@style/AppTheme"
        android:hardwareAccelerated="true"
        android:allowBackup="true">
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:launchMode="singleTop"
            android:screenOrientation="portrait"
            android:configChanges="orientation|screenSize|keyboardHidden|uiMode">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
`,
  );

  await writeFile(
    path.join(resDir, "values/strings.xml"),
    `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">CreatorDeck Top 500</string>
</resources>
`,
  );

  await writeFile(
    path.join(resDir, "values/styles.xml"),
    `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="AppTheme" parent="@android:style/Theme.DeviceDefault.NoActionBar">
        <item name="android:windowBackground">@android:color/black</item>
        <item name="android:statusBarColor">#090812</item>
        <item name="android:navigationBarColor">#090812</item>
    </style>
</resources>
`,
  );

  await writeFile(
    path.join(resDir, "drawable/ic_launcher.xml"),
    `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <path android:fillColor="#090812" android:pathData="M0,0h108v108h-108z"/>
    <path android:fillColor="#7C4DFF" android:pathData="M24,18h60v72h-60z"/>
    <path android:fillColor="#FFFFFF" android:pathData="M36,36h36v36h-36z"/>
</vector>
`,
  );

  await writeFile(
    path.join(javaDir, "MainActivity.java"),
    `package com.creatordeck;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.webkit.ValueCallback;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends Activity {
    private WebView web;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Window w = getWindow();
        w.setStatusBarColor(Color.parseColor("#090812"));
        w.setNavigationBarColor(Color.parseColor("#090812"));

        web = new WebView(this);
        web.setBackgroundColor(Color.parseColor("#090812"));
        web.setLayoutParams(new ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(true);
        s.setAllowFileAccessFromFileURLs(false);
        s.setAllowUniversalAccessFromFileURLs(false);
        s.setAllowContentAccess(false);
        s.setSupportZoom(false);
        s.setTextZoom(100);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        }

        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                return true;
            }
        });

        setContentView(web);
        web.loadUrl("file:///android_asset/index.html");
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK && web != null) {
            web.evaluateJavascript(
                "(function(){try{return (typeof androidBack==='function')?androidBack():'false';}catch(e){return 'false';}})()",
                new ValueCallback<String>() {
                    @Override
                    public void onReceiveValue(String value) {
                        boolean handled = value != null && value.contains("true");
                        if (!handled) moveTaskToBack(true);
                    }
                }
            );
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }
}
`,
  );
}

async function compileAndroidApk(androidDir, outputApkPath) {
  if (process.platform === "win32") {
    console.log("⚠️ Sous Windows, la compilation directe d'APK nécessite le SDK Android et Java.");
    console.log("L'archive ZIP des assets a été générée avec succès dans public/downloads/.");
    return;
  }

  const tc = "/tmp/android-toolchain";
  await mkdir(tc, { recursive: true });

  const buildHelper = path.join(tc, "compile-apk.sh");
  await writeFile(
    buildHelper,
    `#!/usr/bin/env bash
set -euo pipefail
TC="/tmp/android-toolchain"
mkdir -p "$TC"
cd "$TC"

if [ ! -x "$TC/jdk/bin/javac" ]; then
  echo "Téléchargement du JDK 17 portable..."
  curl -sL "https://api.adoptium.net/v3/binary/latest/17/ga/linux/x64/jdk/hotspot/normal/eclipse" -o jdk17.tar.gz
  mkdir -p "$TC/jdk"
  tar -xzf jdk17.tar.gz -C "$TC/jdk" --strip-components=1
fi

if [ ! -x "$TC/sdk/build-tools/34.0.0/aapt2" ]; then
  echo "Téléchargement d'Android SDK build-tools 34 & platform 34..."
  curl -sL "https://dl.google.com/android/repository/build-tools_r34-linux.zip" -o bt.zip
  curl -sL "https://dl.google.com/android/repository/platform-34-ext7_r03.zip" -o pf.zip
  unzip -q -o bt.zip -d bt
  unzip -q -o pf.zip -d pf
  mkdir -p "$TC/sdk/build-tools" "$TC/sdk/platforms"
  rm -rf "$TC/sdk/build-tools/34.0.0" "$TC/sdk/platforms/android-34"
  mv bt/android-14 "$TC/sdk/build-tools/34.0.0"
  mv pf/android-34 "$TC/sdk/platforms/android-34"
fi

export JAVA_HOME="$TC/jdk"
export PATH="$JAVA_HOME/bin:$PATH"
BT="$TC/sdk/build-tools/34.0.0"
PLATFORM="$TC/sdk/platforms/android-34/android.jar"
APPDIR="${androidDir}/app"
OUT="${androidDir}/build"
rm -rf "$OUT"
mkdir -p "$OUT/compiled" "$OUT/gen" "$OUT/classes" "$OUT/stage/assets"

"$BT/aapt2" compile --dir "$APPDIR/java/res" -o "$OUT/compiled/res.zip"
"$BT/aapt2" link -o "$OUT/base.apk" -I "$PLATFORM" \\
  --manifest "$APPDIR/java/AndroidManifest.xml" \\
  -R "$OUT/compiled/res.zip" --java "$OUT/gen" \\
  --min-sdk-version 24 --target-sdk-version 34 \\
  --version-code 500 --version-name 3.0-top500 --auto-add-overlay

find "$APPDIR/java/com/creatordeck" "$OUT/gen" -name '*.java' > "$OUT/sources.txt"
"$JAVA_HOME/bin/javac" -encoding UTF-8 --release 8 -classpath "$PLATFORM" -d "$OUT/classes" @"$OUT/sources.txt"

find "$OUT/classes" -name '*.class' > "$OUT/classes.txt"
"$BT/d8" --release --min-api 24 --lib "$PLATFORM" --output "$OUT" @"$OUT/classes.txt"

cp "$APPDIR/assets/index.html" "$OUT/stage/assets/index.html"
cp "$APPDIR/assets/photos.js" "$OUT/stage/assets/photos.js"
cp "$OUT/classes.dex" "$OUT/stage/classes.dex"

python3 - "$OUT/base.apk" "$OUT/unsigned.apk" "$OUT/stage" <<'PY'
import shutil, sys, zipfile, os
base, out, stage = sys.argv[1], sys.argv[2], sys.argv[3]
shutil.copyfile(base, out)
with zipfile.ZipFile(out, "a", zipfile.ZIP_DEFLATED) as z:
    z.write(os.path.join(stage, "classes.dex"), "classes.dex")
    z.write(os.path.join(stage, "assets/index.html"), "assets/index.html")
    z.write(os.path.join(stage, "assets/photos.js"), "assets/photos.js")
PY

"$BT/zipalign" -f -p 4 "$OUT/unsigned.apk" "$OUT/aligned.apk"

KS="$TC/debug.keystore"
if [ ! -f "$KS" ]; then
  "$JAVA_HOME/bin/keytool" -genkeypair -v -keystore "$KS" -storepass android -keypass android \\
    -alias androiddebugkey -keyalg RSA -keysize 2048 -validity 10000 \\
    -dname "CN=CreatorDeck Top500, OU=Mobile, O=CreatorDeck, L=Paris, C=FR" >/dev/null 2>&1
fi

"$BT/apksigner" sign --ks "$KS" --ks-pass pass:android --key-pass pass:android \\
  --v1-signing-enabled true --v2-signing-enabled true \\
  --out "${outputApkPath}" "$OUT/aligned.apk"

"$BT/apksigner" verify --print-certs "${outputApkPath}" | head -3
`,
    { mode: 0o755 },
  );

  execFileSync("bash", [buildHelper], { stdio: "inherit" });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});