#!/usr/bin/env node
// Essai Android local, un seul émulateur déjà démarré. Aucune donnée distante.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { _android } from "@playwright/test";
import { waitForAndroidApp } from "./lib/android-app-ready.mjs";

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
    { cwd: root, encoding: "buffer", windowsHide: true, timeout: 30_000, maxBuffer: 64 * 1024 * 1024 });
  if (result.error || result.status !== 0 || !result.stdout?.length) {
    throw new Error(`Capture Android impossible : ${result.error?.message || result.stderr?.toString() || result.status}`);
  }
  await writeFile(destination, result.stdout);
}

// Le rendu SwiftShader de l'émulateur fait planter QEMU dès que la WebView dessine (dumps WER du 19/10/2026).
function graphicsRenderer(serial) {
  const gles = run(["-s", serial, "shell", "dumpsys", "SurfaceFlinger"]).match(/^GLES: (.+)$/m)?.[1]?.trim();
  if (!gles) throw new Error("Moteur de rendu Android introuvable dans SurfaceFlinger.");
  if (/swiftshader/i.test(gles)) throw new Error(`Émulateur en rendu SwiftShader (${gles}) : relancer l’AVD avec -gpu host.`);
  return gles;
}

// connectOverCDP échoue sur une WebView (Browser.setDownloadBehavior refusé) ; l'API _android la prend en charge.
// install -r et force-stop laissent la WebView de l'ancien processus listée : page() y reste bloquée sans fin.
async function connectReadyWebView(device, serial) {
  const pid = Number(run(["-s", serial, "shell", "pidof", applicationId]).trim());
  const webView = device.webViews().find(candidate => candidate.pkg() === applicationId && candidate.pid() === pid);
  if (!webView) return { ready: false, detail: `WebView du processus ${pid} pas encore exposée.` };
  try {
    let timer;
    const page = await Promise.race([webView.page(), new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error("Connexion à la WebView trop longue.")), 5_000);
    })]).finally(() => clearTimeout(timer));
    await page.waitForFunction(() => {
      const nav = document.querySelector('nav[aria-label="Navigation principale"]');
      const labels = nav?.innerText ?? "";
      return nav?.getBoundingClientRect().height > 0
        && ["Drop", "Binder", "Atelier", "Toi"].every(label => labels.includes(label));
    }, null, { timeout: 1_500 });
    return { ready: true, detail: "Navigation principale visible dans la WebView.", value: { page } };
  } catch (error) {
    return { ready: false, detail: String(error.message || error).slice(0, 250) };
  }
}

async function openReadyApp(device, serial) {
  const result = await waitForAndroidApp({ probe: () => connectReadyWebView(device, serial), timeoutMs: 60_000, intervalMs: 1_000 });
  if (!result.ready) throw new Error(`Application Android non prête après ${result.elapsedMs} ms : ${result.lastDetail}`);
  return { ...result.value, elapsedMs: result.elapsedMs };
}

async function exerciseApp(page) {
  const welcome = page.getByRole("dialog", { name: "Mes chaînes" });
  if (await welcome.isVisible().catch(() => false)) {
    await welcome.getByRole("button", { name: "Voir mon premier booster" }).click();
  }
  const nav = page.getByRole("navigation", { name: "Navigation principale" });
  const path = [];
  for (const [label, heading] of [["Binder", "Mon classeur"], ["Atelier", "Atelier"], ["Drop", null]]) {
    const button = nav.getByRole("button", { name: label, exact: true });
    await button.click();
    if (heading) await page.getByRole("heading", { name: heading }).waitFor({ state: "visible", timeout: 10_000 });
    if (await button.getAttribute("aria-current") !== "page") throw new Error(`L’onglet ${label} n’est pas devenu actif.`);
    path.push(label);
  }
  const savedValue = await page.evaluate(() => {
    const entry = Object.entries(localStorage).find(([key]) => /^creatordeck\.save\.v\d+$/.test(key));
    return entry?.[1] ?? null;
  });
  if (!savedValue) throw new Error("Sauvegarde locale du jeu absente après le démarrage.");
  return { path, saveFingerprint: createHash("sha256").update(savedValue).digest("hex") };
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
    renderer: null, initialVersion: null, updateVersion: null, launch: "non essayé", appReadyWaitMs: null,
    navigation: [], savePreserved: null, markerPreserved: null, captures: [], limits: [
      "La présence d'un marqueur dans les fichiers de l'application ne valide pas les préférences du jeu.",
      "L’installateur du bandeau et le téléphone réel restent à essayer séparément.",
    ] };
  let app = null;
  let device = null;
  try {
    report.renderer = graphicsRenderer(serial);
    device = (await _android.devices()).find(candidate => candidate.serial() === serial);
    if (!device) throw new Error(`Playwright ne voit pas l’émulateur ${serial}.`);
    // Allow repeated runs after a previous test left the newer APK installed; -r keeps app data intact.
    run(["-s", serial, "install", "-r", "-d", initialApk]);
    report.initialVersion = installedVersion(serial);
    const start = run(["-s", serial, "shell", "am", "start", "-W", "-n", `${applicationId}/.MainActivity`]);
    if (!start.includes("Status: ok")) throw new Error(`Démarrage Android non confirmé : ${start}`);
    report.launch = "confirmé par ActivityManager";
    app = await openReadyApp(device, serial);
    report.appReadyWaitMs = app.elapsedMs;
    const initialState = await exerciseApp(app.page);
    report.navigation = initialState.path;
    report.initialSaveFingerprint = initialState.saveFingerprint;
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
      app = null;
      run(["-s", serial, "shell", "am", "force-stop", applicationId]);
      const updatedStart = run(["-s", serial, "shell", "am", "start", "-W", "-n", `${applicationId}/.MainActivity`]);
      if (!updatedStart.includes("Status: ok")) throw new Error(`Relancement Android non confirmé après mise à jour : ${updatedStart}`);
      app = await openReadyApp(device, serial);
      report.appReadyAfterUpdateWaitMs = app.elapsedMs;
      const updatedState = await exerciseApp(app.page);
      report.savePreserved = updatedState.saveFingerprint === initialState.saveFingerprint;
      if (!report.savePreserved) throw new Error("La sauvegarde locale du jeu a changé après install -r.");
      await capture(serial, path.join(runDir, "apres-mise-a-jour.png"));
      report.captures.push("apres-mise-a-jour.png");
    }
    report.ok = true;
  } catch (error) {
    report.ok = false;
    report.error = String(error.message || error).slice(0, 500);
    process.exitCode = 1;
  }
  await device?.close().catch(() => {});
  await writeFile(path.join(runDir, "result.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(path.join(runDir, "result.json"));
  if (!report.ok) console.error(report.error);
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
