#!/usr/bin/env node
/**
 * Fabrique `latest.json` pour la mise à jour de l'APK de test (D-144).
 *
 *   node scripts/apk-manifest.mjs <apk> <metadata.json> <sha> <tag> <repo>
 *
 * Lit `versionCode` / `versionName` dans `output-metadata.json` (Gradle),
 * calcule l'empreinte SHA-256 de l'APK et écrit le manifeste sur la sortie
 * standard. L'appli le relit avec `parseUpdateManifest()` (src/lib/app-update.ts).
 */
import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const APK_ASSET_NAME = "creatordeck.apk";

/** Le manifeste, à partir de valeurs déjà lues (testable sans fichier). */
export function buildManifest({ versionCode, versionName, sha, sha256, size, tag, repo, builtAt }) {
  if (!Number.isInteger(versionCode) || versionCode <= 0) throw new Error("versionCode invalide");
  if (!/^[0-9a-f]{40}$/.test(sha)) throw new Error("sha invalide");
  if (!/^[0-9a-f]{64}$/.test(sha256)) throw new Error("sha256 invalide");
  return {
    versionCode,
    versionName: versionName || sha.slice(0, 7),
    sha,
    url: `https://github.com/${repo}/releases/download/${tag}/${APK_ASSET_NAME}`,
    sha256,
    size,
    builtAt,
  };
}

function main() {
  const [apk, metadataPath, sha, tag, repo] = process.argv.slice(2);
  if (!apk || !metadataPath || !sha || !tag || !repo) {
    console.error("Usage : node scripts/apk-manifest.mjs <apk> <metadata.json> <sha> <tag> <repo>");
    process.exit(2);
  }
  const metadata = JSON.parse(readFileSync(metadataPath, "utf8"));
  const element = metadata.elements?.[0] ?? {};
  const bytes = readFileSync(apk);
  const manifest = buildManifest({
    versionCode: element.versionCode,
    versionName: element.versionName,
    sha,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    size: statSync(apk).size,
    tag,
    repo,
    builtAt: new Date().toISOString(),
  });
  process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
