// Charge TWITCH_CLIENT_ID / TWITCH_CLIENT_SECRET depuis `.env` (voir .env.example).
import "dotenv/config";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { downloadLargestAvatar, encodeAvatar } from "./lib/avatars.mjs";

const root = process.cwd();
const catalog = JSON.parse(
  await readFile(path.join(root, "src/data/creators.json"), "utf8"),
);
const outputDir = path.join(root, "public/creators");
await mkdir(outputDir, { recursive: true });

const clientId = process.env.TWITCH_CLIENT_ID;
const clientSecret = process.env.TWITCH_CLIENT_SECRET;
let twitchToken = null;

if (clientId && clientSecret) {
  const tokenResponse = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}&grant_type=client_credentials`,
    { method: "POST" },
  );
  if (!tokenResponse.ok) {
    throw new Error(`Impossible d'obtenir le jeton Twitch (${tokenResponse.status})`);
  }
  twitchToken = (await tokenResponse.json()).access_token;
}

async function resolveAvatar(login) {
  if (clientId && twitchToken) {
    const response = await fetch(
      `https://api.twitch.tv/helix/users?login=${encodeURIComponent(login)}`,
      {
        headers: {
          "Client-Id": clientId,
          Authorization: `Bearer ${twitchToken}`,
        },
      },
    );
    if (response.ok) {
      const body = await response.json();
      const url = body.data?.[0]?.profile_image_url;
      if (url) return { url, source: "twitch-helix" };
    }
  }

  const decapiResponse = await fetch(
    `https://decapi.me/twitch/avatar/${encodeURIComponent(login)}`,
    { signal: AbortSignal.timeout(15_000) },
  );
  if (decapiResponse.ok) {
    const url = (await decapiResponse.text()).trim();
    if (url.startsWith("https://")) return { url, source: "decapi-twitch" };
  }

  return {
    url: `https://unavatar.io/twitch/${encodeURIComponent(login)}?fallback=false`,
    source: "unavatar-twitch",
  };
}

const sleep = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

async function downloadImage(url) {
  let lastError = "échec inconnu";
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(20_000),
    });
    const contentType = response.headers.get("content-type") || "";
    const bytes = Buffer.from(await response.arrayBuffer());
    const binaryImage = contentType === "binary/octet-stream" && bytes.length >= 1_000;
    if (response.ok && (contentType.startsWith("image/") || binaryImage) && bytes.length >= 1_000) {
      return { bytes, contentType: binaryImage ? "image/jpeg" : contentType };
    }
    lastError = `réponse invalide ${response.status} ${contentType} ${bytes.length}o`;
    if (response.status !== 429) break;
    await sleep(8_000 * (attempt + 1));
  }
  throw new Error(lastError);
}

const report = [];
for (const creator of catalog) {
  try {
    // IMPORTANT : l'extension doit rester .jpg. catalog.ts (creatorImage)
    // pointe vers /creators/{slug}.jpg : écrire du .png ici faisait que les
    // 500 fichiers téléchargés n'étaient jamais demandés par l'app.
    const target = path.join(outputDir, `${creator.slug}.jpg`);
    try {
      const existing = await stat(target);
      if (existing.size >= 1_000) {
        report.push({
          slug: creator.slug,
          login: creator.login,
          ok: true,
          source: "cache-local",
          contentType: "image/jpeg",
          bytes: existing.size,
        });
        process.stdout.write(`↺ ${creator.displayName}\n`);
        continue;
      }
    } catch {}

    const resolved = await resolveAvatar(creator.login);
    // Pipeline partagé (scripts/lib/avatars.mjs) : variante 600x600 du CDN si
    // elle existe (URL Helix/decapi réécrite), sinon l'URL telle quelle.
    let downloaded;
    try {
      downloaded = await downloadLargestAvatar(resolved.url, { timeoutMs: 20_000 });
    } catch {
      const { bytes } = await downloadImage(resolved.url);
      downloaded = { bytes, size: null, url: resolved.url };
    }
    const size = await encodeAvatar(downloaded.bytes, target);
    await sleep(1_200);
    report.push({
      slug: creator.slug,
      login: creator.login,
      ok: true,
      source: resolved.source,
      size,
      bytes: downloaded.bytes.length,
    });
    process.stdout.write(`✓ ${creator.displayName}\n`);
  } catch (error) {
    report.push({
      slug: creator.slug,
      login: creator.login,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
    process.stderr.write(`✗ ${creator.displayName}: ${report.at(-1).error}\n`);
  }
}

await writeFile(
  path.join(outputDir, "_report.json"),
  `${JSON.stringify({ generatedAt: new Date().toISOString(), creators: report }, null, 2)}\n`,
);

const failures = report.filter((item) => !item.ok);
console.log(`\n${report.length - failures.length}/${report.length} avatars synchronisés.`);
if (failures.length) process.exitCode = 1;
