#!/usr/bin/env node
// Essai Android local, un seul émulateur déjà démarré. Aucune donnée distante.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [initialApk, updateApk] = process.argv.slice(2).map((file) => path.resolve(file));
const adbName = process.platform === "win32" ? "adb.exe" : "adb";
const sdkCandidates = [process.env.ANDROID_HOME, process.env.ANDROID_SDK_ROOT,
  process.env.USERPROFILE && path.join(process.env.USERPROFILE, "AppData", "Local", "Android", "Sdk"),
  process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, "Android", "Sdk")].filter(Boolean);
const sdk = sdkCandidates.find((candidate) => existsSync(path.join(candidate, "platform-tools", adbName)));
const adb = sdk ? path.join(sdk, "platform-tools", adbName) : "";
const applicationId = "com.creatordeck.app";

function run(args, { binary = adb, encoding = "utf8" } = {}) {
  const result = spawnSync(binary, args, { cwd: root, encoding, windowsHide: true, timeout: 90_000 });
  if (result.error || result.status !== 0) {
    throw new Error(`${path.basename(binary)} ${args.join(" ")}: ${result.error?.message || result.stderr || result.stdout || result.status}`);
  }
  return result.stdout;
}

function installedVersion(serial) {
  const dump = run(["-s", serial, "shell", "dumpsys", "package", applicationId]);
  const code = dump.match(/\bversionCode=(\d+)/)?.[1];
  if (!code) throw new Error(`Version Android de ${applicationId} introuvable.`);
  return Number(code);
}

async function capture(serial, destination) {
  const result = spawnSync(adb, ["-s", serial, "exec-out", "screencap", "-p"],
    { cwd: root, encoding: "buffer", windowsHide: true, timeout: 30_000 });
  if (result.error || result.status !== 0 || !result.stdout?.length) {
    throw new Error(`Capture Android impossible : ${result.error?.message || result.stderr?.toString() || result.status}`);
  }
  await writeFile(destination, result.stdout);
}

async function main() {
  if (!initialApk || !existsSync(initialApk) || !existsSync(adb)) {
    throw new Error("Usage : npm run quality:android -- <premiere.apk> [mise-a-jour.apk] ; Android SDK et APK requis.");
  }
  if (updateApk && !existsSync(updateApk)) throw new Error(`APK de mise à jour introuvable : ${updateApk}`);
  const devices = run(["devices", "-l"]).split(/\r?\n/).filter((line) => /^emulator-\d+\s+device\b/.test(line));
  if (devices.length !== 1) throw new Error(`Un seul émulateur Android démarré est requis ; trouvés : ${devices.length}.`);
  const serial = devices[0].split(/\s+/)[0];
  const runDir = path.join(root, "reports", "android-smoke", new Date().toISOString().replace(/[:.]/g, "-"));
  await mkdir(runDir, { recursive: true });
  const report = { serial, initialApk: path.basename(initialApk), updateApk: updateApk ? path.basename(updateApk) : null,
    initialVersion: null, updateVersion: null, launch: "non essayé", markerPreserved: null, captures: [], limits: [
      "La présence d'un marqueur dans les fichiers de l'application ne valide pas les préférences du jeu.",
      "L'installateur de mise à jour ouvert depuis l'application et le téléphone réel restent à essayer séparément.",
    ] };
  try {
    run(["-s", serial, "install", "-r", initialApk]);
    report.initialVersion = installedVersion(serial);
    const start = run(["-s", serial, "shell", "am", "start", "-W", "-n", `${applicationId}/.MainActivity`]);
    if (!start.includes("Status: ok")) throw new Error(`Démarrage Android non confirmé : ${start}`);
    report.launch = "confirmé par ActivityManager";
    await new Promise((resolve) => setTimeout(resolve, 3000));
    await capture(serial, path.join(runDir, "initial.png"));
    report.captures.push("initial.png");
    if (updateApk) {
      // Marqueur neutre dans le stockage privé de l'APK debug, pour tester install -r.
      run(["-s", serial, "shell", "run-as", applicationId, "mkdir", "-p", "files"]);
      run(["-s", serial, "shell", "run-as", applicationId, "touch", "files/creatordeck-quality-marker"]);
      run(["-s", serial, "install", "-r", updateApk]);
      report.updateVersion = installedVersion(serial);
      if (report.updateVersion <= report.initialVersion) throw new Error("Le versionCode n'a pas augmenté.");
      const marker = run(["-s", serial, "shell", "run-as", applicationId, "ls", "files/creatordeck-quality-marker"]);
      report.markerPreserved = marker.includes("creatordeck-quality-marker");
      if (!report.markerPreserved) throw new Error("Les fichiers privés ont disparu après install -r.");
      run(["-s", serial, "shell", "am", "force-stop", applicationId]);
      run(["-s", serial, "shell", "am", "start", "-W", "-n", `${applicationId}/.MainActivity`]);
      await new Promise((resolve) => setTimeout(resolve, 3000));
      await capture(serial, path.join(runDir, "apres-mise-a-jour.png"));
      report.captures.push("apres-mise-a-jour.png");
    }
    report.ok = true;
  } catch (error) {
    report.ok = false;
    report.error = String(error.message || error).slice(0, 500);
    process.exitCode = 1;
  }
  await writeFile(path.join(runDir, "result.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(path.join(runDir, "result.json"));
  if (!report.ok) console.error(report.error);
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
