/**
 * Régénère les 500 portraits dans public/creators/ en 300x300 natif.
 *
 * Pourquoi ce script existe : build-top500-fr.mjs rétrécissait les images vers
 * 240x240 avant de les écrire, puis le navigateur les ré-agrandissait pour
 * remplir la carte -> flou. Ce script ré-encode les portraits à la résolution
 * native du CDN Twitch (300x300, son maximum) SANS toucher à creators.json.
 *
 * Stratégie de récupération (dans l'ordre) :
 *   1. GQL Twitch par lots de 30 -> URL du CDN jtvnw  (source de l'app d'origine)
 *   2. decapi.me -> URL du CDN
 *   3. unavatar.io (image directe)
 * Les agrégateurs gratuits (unavatar/decapi) répondent 429 dès qu'on les
 * sollicite en parallèle : c'est pour ça que la résolution passe par le GQL,
 * qui accepte les requêtes par alias sans limite pratique.
 *
 * Usage :
 *   node scripts/regen-avatars-300.mjs            # complète/valide les 500
 *   node scripts/regen-avatars-300.mjs --force    # ré-encode même si déjà en 300
 *
 * Reprenable : un portrait déjà en 300x300 est ignoré, donc on peut relancer
 * après une coupure sans tout re-télécharger.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const CATALOG = path.join(ROOT, "src/data/creators.json");
const OUT_DIR = path.join(ROOT, "public/creators");
// Les rapports de génération sont des artefacts internes : on les écrit hors de
// public/ pour ne pas les exposer sur le site.
const REPORTS_DIR = path.join(ROOT, "reports");
const SIZE = 300; // plafond du CDN Twitch (profileImageURL(width: 300))
const BATCH = 30; // alias par requête GQL
const CONCURRENCY = 8; // le CDN jtvnw encaisse, les agrégateurs non
const FORCE = process.argv.includes("--force");
// Client-ID public du site web Twitch : celui utilisé par le site lui-même,
// déjà employé par scripts/build-top500-fr.mjs.
const GQL_CLIENT_ID = "kimne78kx3ncx6brgo4mv6wki5h1ko";

await mkdir(OUT_DIR, { recursive: true });
await mkdir(REPORTS_DIR, { recursive: true });
const creators = JSON.parse(await readFile(CATALOG, "utf8"));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Renvoie true si le fichier existe déjà à la bonne résolution. */
async function isAlreadyGood(target) {
  try {
    const meta = await sharp(target).metadata();
    return meta.width === SIZE && meta.height === SIZE;
  } catch {
    return false;
  }
}

/** 1. Résolution par lots via le GQL Twitch : login -> URL du CDN. */
async function resolveViaGql(logins) {
  const urls = new Map();
  const query = logins
    .map(
      (login, index) =>
        `u${index}: user(login: "${login.replace(/[^a-z0-9_]/gi, "")}") ` +
        `{ login profileImageURL(width: ${SIZE}) }`,
    )
    .join(" ");

  try {
    const response = await fetch("https://gql.twitch.tv/gql", {
      method: "POST",
      headers: { "Client-ID": GQL_CLIENT_ID, "Content-Type": "application/json" },
      body: JSON.stringify({ query: `{ ${query} }` }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) return urls;
    const body = await response.json();
    for (const value of Object.values(body.data ?? {})) {
      const url = value?.profileImageURL;
      if (value?.login && typeof url === "string" && url.startsWith("https://")) {
        urls.set(value.login.toLowerCase(), url);
      }
    }
  } catch {
    // Un lot en échec n'est pas bloquant : les secours prennent le relais.
  }
  return urls;
}

/** 2/3. Secours individuels pour les logins non résolus par le GQL. */
async function resolveFallback(login) {
  const reasons = [];
  try {
    const response = await fetch(
      `https://decapi.me/twitch/avatar/${encodeURIComponent(login)}`,
      { signal: AbortSignal.timeout(20_000) },
    );
    const url = (await response.text()).trim();
    if (response.ok && url.startsWith("https://")) return { url, source: "decapi" };
    reasons.push(`decapi ${response.status}`);
  } catch (error) {
    reasons.push(`decapi ${error.name}`);
  }
  // unavatar sert l'image directement : on l'utilise comme dernier recours.
  reasons.push("unavatar=direct");
  return { url: null, source: "unavatar", reasons };
}

async function download(url) {
  const response = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(25_000),
  });
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!response.ok || bytes.length < 1_000) {
    throw new Error(`CDN HTTP ${response.status} ${bytes.length}o`);
  }
  return bytes;
}

async function downloadUnavatar(login) {
  const response = await fetch(
    `https://unavatar.io/twitch/${encodeURIComponent(login)}?fallback=false`,
    { redirect: "follow", signal: AbortSignal.timeout(25_000) },
  );
  const bytes = Buffer.from(await response.arrayBuffer());
  const type = response.headers.get("content-type") || "";
  if (!response.ok || !type.startsWith("image/") || bytes.length < 1_000) {
    throw new Error(`unavatar HTTP ${response.status} ${type}`);
  }
  return bytes;
}

/** Même pipeline d'encodage que build-top500-fr.mjs corrigé. */
/**
 * Portrait de secours pour les chaînes disparues ou renommées (le GQL renvoie
 * alors user: null). Sans ça, la carte s'affiche avec une image cassée.
 */
async function encodePlaceholder(creator, target) {
  const initials = (creator.displayName || creator.login)
    .replace(/[^a-z0-9 ]/gi, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");
  const label = initials || (creator.login[0] ?? "?").toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#6d3ade"/><stop offset="100%" stop-color="#150f28"/>
  </linearGradient></defs>
  <rect width="${SIZE}" height="${SIZE}" fill="url(#g)"/>
  <circle cx="${SIZE / 2}" cy="${SIZE * 0.42}" r="${SIZE * 0.16}" fill="rgba(255,255,255,.16)"/>
  <path d="M${SIZE * 0.22} ${SIZE * 0.92} a${SIZE * 0.28} ${SIZE * 0.28} 0 0 1 ${SIZE * 0.56} 0 z"
        fill="rgba(255,255,255,.16)"/>
  <text x="50%" y="${SIZE * 0.9}" font-family="Arial, sans-serif" font-size="${SIZE * 0.11}"
        font-weight="700" fill="rgba(255,255,255,.55)" text-anchor="middle">${label}</text>
</svg>`;
  await sharp(Buffer.from(svg)).jpeg({ quality: 88, mozjpeg: true }).toFile(target);
}

async function encode(bytes, target) {
  await sharp(bytes)
    .resize(SIZE, SIZE, {
      fit: "cover",
      position: "centre",
      withoutEnlargement: true,
      kernel: "lanczos3",
    })
    .sharpen({ sigma: 0.6 })
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile(target);
}

// --- 1. On écarte ce qui est déjà conforme -------------------------------
const pending = [];
const report = [];
for (const creator of creators) {
  const target = path.join(OUT_DIR, `${creator.slug}.jpg`);
  if (!FORCE && (await isAlreadyGood(target))) {
    report.push({ slug: creator.slug, ok: true, source: "deja-300" });
  } else {
    pending.push({ creator, target });
  }
}
console.log(
  `${creators.length} créateurs : ${report.length} déjà conformes, ` +
    `${pending.length} à régénérer.\n`,
);

// --- 2. Résolution GQL par lots ------------------------------------------
const urlByLogin = new Map();
for (let start = 0; start < pending.length; start += BATCH) {
  const slice = pending.slice(start, start + BATCH);
  const resolved = await resolveViaGql(slice.map((item) => item.creator.login));
  for (const [login, url] of resolved) urlByLogin.set(login, url);
  process.stdout.write(
    `  GQL ${Math.min(start + BATCH, pending.length)}/${pending.length} ` +
      `(${urlByLogin.size} URL résolues)\n`,
  );
  await sleep(250);
}

// --- 3. Téléchargement + encodage ----------------------------------------
let done = 0;
const queue = [...pending];

await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) {
      const item = queue.shift();
      if (!item) break;
      const { creator, target } = item;
      const login = creator.login.toLowerCase();
      const reasons = [];
      try {
        let bytes = null;
        let source = "gql";

        const url = urlByLogin.get(login);
        if (url) {
          try {
            bytes = await download(url);
          } catch (error) {
            reasons.push(`cdn ${error.message}`);
          }
        } else {
          reasons.push("gql non résolu");
        }

        if (!bytes) {
          const fallback = await resolveFallback(creator.login);
          if (fallback.url) {
            bytes = await download(fallback.url);
            source = "decapi";
          } else {
            bytes = await downloadUnavatar(creator.login);
            source = "unavatar";
          }
        }

        await encode(bytes, target);
        report.push({ slug: creator.slug, ok: true, source });
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        const cause = [...reasons, detail].join(" | ");
        try {
          await encodePlaceholder(creator, target);
          report.push({ slug: creator.slug, ok: true, source: "placeholder", cause });
          process.stderr.write(`⚠ ${creator.slug}: portrait de secours (${cause})\n`);
        } catch {
          report.push({ slug: creator.slug, ok: false, error: cause });
          process.stderr.write(`✗ ${creator.slug}: ${cause}\n`);
        }
      } finally {
        done += 1;
        if (done % 25 === 0) {
          process.stdout.write(`  encodage ${done}/${pending.length}\n`);
        }
      }
    }
  }),
);

// --- 4. Rapport ----------------------------------------------------------
const failures = report.filter((item) => !item.ok);
const counts = report.reduce((acc, item) => {
  if (item.ok) acc[item.source] = (acc[item.source] ?? 0) + 1;
  return acc;
}, {});

await writeFile(
  path.join(REPORTS_DIR, "avatars-regen.json"),
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      size: SIZE,
      total: report.length,
      parSource: counts,
      echecs: failures.length,
      failures,
    },
    null,
    2,
  )}\n`,
);

console.log(
  `\n${report.length - failures.length}/${report.length} portraits en ` +
    `${SIZE}x${SIZE} — ${JSON.stringify(counts)} — ${failures.length} échec(s).`,
);
if (failures.length) {
  console.log("Échecs :", failures.map((f) => f.slug).join(", "));
  process.exitCode = 1;
}
