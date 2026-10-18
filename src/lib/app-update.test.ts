import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { buildManifest } from "../../scripts/apk-manifest.mjs";
import {
  UPDATE_REPO,
  downloadPercent,
  formatDownloadSize,
  isUpdateAvailable,
  parseUpdateManifest,
  updateManifestUrl,
} from "@/lib/app-update";

const SHA = "e376fa609804ea82b1b647b960788f8481ec1419";
const SHA256 = "3f7139cb5506e0ff4f1cbee714fa4fd64c0ad5f126646d0dc804bf2012d4bb02";
const manifest = () => buildManifest({ versionCode: 812345, versionName: "e376fa6", sha: SHA, sha256: SHA256,
  size: 110_659_107, tag: "v812345", repo: UPDATE_REPO, builtAt: "2026-10-18T00:00:00Z" });

describe("D-144 : mise à jour de l'APK de test", () => {
  it("le manifeste publié par le workflow est relu tel quel par l'appli", () => {
    const parsed = parseUpdateManifest(manifest());
    expect(parsed).toEqual(manifest());
    expect(parsed?.url).toBe("https://github.com/GoodFight37/creatordeck-apk/releases/download/v812345/creatordeck.apk");
    expect(updateManifestUrl()).toBe("https://github.com/GoodFight37/creatordeck-apk/releases/latest/download/latest.json");
  });

  it("refuse tout manifeste douteux : autre dépôt, http, empreinte ou numéro invalides", () => {
    expect(parseUpdateManifest({ ...manifest(), url: "https://github.com/autre/depot/releases/download/v1/creatordeck.apk" })).toBeNull();
    expect(parseUpdateManifest({ ...manifest(), url: "http://github.com/GoodFight37/creatordeck-apk/releases/download/v1/creatordeck.apk" })).toBeNull();
    expect(parseUpdateManifest({ ...manifest(), url: "https://github.com/GoodFight37/creatordeck-apk/releases/download/v1/autre.zip" })).toBeNull();
    expect(parseUpdateManifest({ ...manifest(), sha256: "abc" })).toBeNull();
    expect(parseUpdateManifest({ ...manifest(), versionCode: 0 })).toBeNull();
    expect(parseUpdateManifest({ ...manifest(), versionCode: "812345" })).toBeNull();
    expect(parseUpdateManifest(null)).toBeNull();
    expect(parseUpdateManifest([])).toBeNull();
  });

  it("le script refuse de publier un manifeste invalide", () => {
    expect(() => buildManifest({ ...{ versionCode: 0, versionName: "", sha: SHA, sha256: SHA256, size: 1, tag: "v0", repo: UPDATE_REPO, builtAt: "" } })).toThrow();
    expect(() => buildManifest({ versionCode: 2, versionName: "", sha: "court", sha256: SHA256, size: 1, tag: "v2", repo: UPDATE_REPO, builtAt: "" })).toThrow();
  });

  it("ne propose qu'une version strictement plus récente", () => {
    expect(isUpdateAvailable(812344, parseUpdateManifest(manifest()))).toBe(true);
    expect(isUpdateAvailable(812345, parseUpdateManifest(manifest()))).toBe(false);
    expect(isUpdateAvailable(1, null)).toBe(false);
  });

  it("taille et progression lisibles", () => {
    expect(formatDownloadSize(110_659_107)).toBe("106 Mo");
    expect(formatDownloadSize(5 * 1024 * 1024)).toBe("5,0 Mo");
    expect(formatDownloadSize(0)).toBe("");
    expect(downloadPercent(50, 200)).toBe(25);
    expect(downloadPercent(300, 200)).toBe(100);
    expect(downloadPercent(10, -1)).toBeNull();
  });
});

describe("le plugin Android de mise à jour", () => {
  it("lit versionCode sans dépendre du type Long (bug « Mise à jour invalide »)", () => {
    const java = readFileSync("android/app/src/main/java/com/creatordeck/app/AppUpdaterPlugin.java", "utf8");
    // Capacitor : un entier JSON < 2^31 est un Integer ; getLong() le lit comme null.
    expect(java).not.toMatch(/getLong\("versionCode"\)/);
    expect(java).toContain('call.getData().optLong("versionCode", -1L)');
  });
});
