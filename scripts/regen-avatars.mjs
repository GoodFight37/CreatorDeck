/**
 * Régénère les 500 portraits de public/creators/ à la plus grande taille
 * servie par le CDN Twitch (600x600, voir scripts/lib/avatars.mjs).
 *
 * Stratégie de récupération (dans l'ordre) :
 *   1. GQL Twitch par lots de 30 -> URL du CDN jtvnw, réécrite en 600x600
 *      (repli automatique sur 300x300 si la variante n'existe pas)
 *   2. decapi.me -> URL du CDN (même réécriture)
 *   3. unavatar.io (image directe, taille variable)
 *   4. portrait de secours (initiales) pour une chaîne disparue
 * Les agrégateurs gratuits (unavatar/decapi) répondent 429 dès qu'on les
 * sollicite en parallèle : c'est pour ça que la résolution passe par le GQL.
 *
 * Usage :
 *   npm run assets:regen                 # complète/valide les 500 en 600 px
 *   node scripts/regen-avatars.mjs --force   # ré-encode même si déjà conforme
 *
 * Reprenable : un portrait déjà à la bonne taille est ignoré, donc on peut
 * relancer après une coupure sans tout re-télécharger. Un portrait resté en
 * 300 px (source Twitch sans variante 600) est retenté à chaque exécution.
 * Le rapport est écrit dans reports/avatars-regen.json (non versionné).
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  AVATAR_SIZE,
  downloadLargestAvatar,
  encodeAvatar,
  encodePlaceholder,
  readAvatarSize,
} from "./lib/avatars.mjs";

const ROOT = process.cwd();
const CATALOG = path.join(ROOT, "src/data/creators.json");
const OUT_DIR = path.join(ROOT, "public/creators");
// Les rapports de génération sont des artefacts internes : on les écrit hors de
// public/ pour ne pas les exposer sur le site.
const REPORTS_DIR = path.join(ROOT, "reports");
const BATCH = 30; // alias par requête GQL
const CONCURRENCY = 8; // le CDN jtvnw encaisse, les agrégateurs non
const FORCE = process.argv.includes("--force");
/**
 * Résolution cible : celle du pipeline (600 px) par défaut, surchargée par
 * `AVATAR_PX` quand le catalogue grossit — un Top 2000 en 600 px pèserait
 * ~70 Mo de JPEG dans l'APK, contre ~35 Mo en 300 px (voir docs/catalogue-twitch.md).
 */
const TARGET_SIZE = Math.max(150, Math.floor(Number(process.env.AVATAR_PX ?? AVATAR_SIZE)));
// Client-ID public du site web Twitch (API GQL non officielle, déjà employé
// par scripts/build-twitch-catalog.mjs).
const GQL_CLIENT_ID = "kimne78kx3ncx6brgo4mv6wki5h1ko";

await mkdir(OUT_DIR, { recursive: true });
await mkdir(REPORTS_DIR, { recursive: true });
const creators = JSON.parse(await readFile(CATALOG, "utf8"));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 1. Résolution par lots via le GQL Twitch : login -> URL du CDN. */
async function resolveViaGql(logins) {
  const urls = new Map();
  // width: 300 est la valeur historiquement acceptée ; la montée en 600 se
  // fait par réécriture d'URL dans downloadLargestAvatar().
  const query = logins
    .map(
      (login, index) =>
        `u${index}: user(login: "${login.replace(/[^a-z0-9_]/gi, "")}") ` +
        `{ login profileImageURL(width: 300) }`,
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

/** 2. Secours individuel : decapi renvoie l'URL CDN en texte brut. */
async function resolveViaDecapi(login) {
  const response = await fetch(`https://decapi.me/twitch/avatar/${encodeURIComponent(login)}`, {
    signal: AbortSignal.timeout(20_000),
  });
  const url = (await response.text()).trim();
  if (!response.ok || !url.startsWith("https://")) {
    throw new Error(`decapi HTTP ${response.status}`);
  }
  return url;
}

/** 3. Dernier recours : unavatar sert l'image directement. */
async function downloadUnavatar(login) {
  const url = `https://unavatar.io/twitch/${encodeURIComponent(login)}?fallback=false`;
  const response = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(25_000) });
  const bytes = Buffer.from(await response.arrayBuffer());
  const type = response.headers.get("content-type") || "";
  if (!response.ok || !type.startsWith("image/") || bytes.length < 1_000) {
    throw new Error(`unavatar HTTP ${response.status} ${type}`);
  }
  return bytes;
}

// --- 1. On écarte ce qui est déjà conforme -------------------------------
const pending = [];
const report = [];
for (const creator of creators) {
  const target = path.join(OUT_DIR, `${creator.slug}.jpg`);
  const current = await readAvatarSize(target);
  if (!FORCE && current === TARGET_SIZE) {
    report.push({ slug: creator.slug, ok: true, source: `deja-${TARGET_SIZE}`, size: current });
  } else {
    pending.push({ creator, target, current });
  }
}
console.log(
  `${creators.length} créateurs : ${report.length} déjà en ${TARGET_SIZE}px, ` +
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
            bytes = (await downloadLargestAvatar(url)).bytes;
          } catch (error) {
            reasons.push(`cdn ${error.message}`);
          }
        } else {
          reasons.push("gql non résolu");
        }

        if (!bytes) {
          try {
            bytes = (await downloadLargestAvatar(await resolveViaDecapi(creator.login))).bytes;
            source = "decapi";
          } catch (error) {
            reasons.push(error.message);
            bytes = await downloadUnavatar(creator.login);
            source = "unavatar";
          }
        }

        const size = await encodeAvatar(bytes, target, { size: TARGET_SIZE });
        report.push({ slug: creator.slug, ok: true, source, size });
        if (size < TARGET_SIZE) {
          process.stderr.write(`ℹ ${creator.slug}: seulement ${size}px disponible\n`);
        }
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        const cause = [...reasons, detail].join(" | ");
        try {
          await encodePlaceholder(creator, target);
          report.push({ slug: creator.slug, ok: true, source: "placeholder", size: TARGET_SIZE, cause });
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
const bySource = {};
const bySize = {};
for (const item of report) {
  if (!item.ok) continue;
  bySource[item.source] = (bySource[item.source] ?? 0) + 1;
  bySize[item.size] = (bySize[item.size] ?? 0) + 1;
}

await writeFile(
  path.join(REPORTS_DIR, "avatars-regen.json"),
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      targetSize: TARGET_SIZE,
      total: report.length,
      parSource: bySource,
      parTaille: bySize,
      echecs: failures.length,
      failures,
    },
    null,
    2,
  )}\n`,
);

console.log(
  `\n${report.length - failures.length}/${report.length} portraits — tailles ${JSON.stringify(bySize)} ` +
    `— sources ${JSON.stringify(bySource)} — ${failures.length} échec(s).`,
);
if (failures.length) {
  console.log("Échecs :", failures.map((f) => f.slug).join(", "));
  process.exitCode = 1;
}
