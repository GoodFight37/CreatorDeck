// Essai explicite du plugin local : PNG volumineux, SAF réel, application isolée.
import { _android } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { randomBytes, createHash } from "node:crypto";
import sharp from "sharp";
import { waitForAndroidApp } from "./lib/android-app-ready.mjs";

const adb = process.env.LOCALAPPDATA + "/Android/Sdk/platform-tools/adb.exe";
const pkg = "com.creatordeck.app.memeeditor";
const devices = await _android.devices();
if (devices.length !== 1) throw new Error("Un émulateur unique est requis.");
const [device] = devices;
const run = (args) => execFileSync(adb, ["-s", device.serial(), ...args], { encoding: "utf8", windowsHide: true });
try {
  run(["shell", "am", "force-stop", pkg]);
  run(["shell", "am", "start", "-n", pkg + "/com.creatordeck.app.MainActivity"]);
  const ready = await waitForAndroidApp({ probe: async () => {
    const pid = Number(run(["shell", "pidof", pkg]).trim());
    const view = device.webViews().find(view => view.pkg() === pkg && view.pid() === pid);
    return view ? { ready: true, value: await view.page() } : { ready: false };
  } });
  if (!ready.ready) throw new Error("WebView absente.");
  const page = ready.value;
  await page.evaluate(() => {
    const capacitor = window.Capacitor, original = capacitor.nativePromise.bind(capacitor);
    capacitor.nativePromise = (plugin, method, options) => plugin === "CapacitorHttp"
      ? Promise.resolve({ status: 503, data: {}, headers: {}, url: options.url })
      : original(plugin, method, options);
  });
  const bytes = await sharp(randomBytes(2700 * 2600 * 3), { raw: { width: 2700, height: 2600, channels: 3 } })
    .png({ compressionLevel: 0 }).toBuffer();
  const name = "creatordeck-stream-check-" + Date.now() + ".png";
  await page.evaluate(({ name, base64 }) => {
    window.exportOutcome = null;
    window.Capacitor.nativePromise("MemeExport", "save", { name, mime: "image/png", base64 })
      .then(result => { window.exportOutcome = result; }, error => { window.exportOutcome = { error: String(error) }; });
  }, { name, base64: bytes.toString("base64") });
  run(["shell", "uiautomator", "dump", "/sdcard/creatordeck-stream-ui.xml"]);
  const xml = run(["shell", "cat", "/sdcard/creatordeck-stream-ui.xml"]);
  const button = xml.match(/<node\b[^>]*resource-id="android:id\/button1"[^>]*>/)?.[0];
  const bounds = button?.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
  if (!bounds || !button.includes('package="com.google.android.documentsui"') || !button.includes('enabled="true"')) {
    throw new Error("Bouton Enregistrer du sélecteur SAF absent.");
  }
  const [, x, y, xx, yy] = bounds.map(Number);
  run(["shell", "input", "tap", String(Math.round((x + xx) / 2)), String(Math.round((y + yy) / 2))]);
  await page.waitForFunction(() => window.exportOutcome !== null, null, { timeout: 30_000 });
  const outcome = await page.evaluate(() => window.exportOutcome);
  if (!outcome.saved) throw new Error(JSON.stringify(outcome));
  const actual = execFileSync(adb, ["-s", device.serial(), "exec-out", "cat", "/sdcard/Download/" + name], {
    maxBuffer: 40 * 1024 * 1024, windowsHide: true,
  });
  if (!actual.equals(bytes)) throw new Error("Le fichier enregistré diffère de l'original.");
  const small = await sharp({ create: { width: 8, height: 8, channels: 3, background: "red" } }).png().toBuffer();
  await page.evaluate(({ base64 }) => {
    window.exportOutcome = null;
    window.Capacitor.nativePromise("MemeExport", "save", { name: "creatordeck-cancel-check.png", mime: "image/png", base64 })
      .then(result => { window.exportOutcome = result; }, error => { window.exportOutcome = { error: String(error) }; });
  }, { base64: small.toString("base64") });
  run(["shell", "uiautomator", "dump", "/sdcard/creatordeck-stream-ui.xml"]);
  const cancelUI = run(["shell", "cat", "/sdcard/creatordeck-stream-ui.xml"]);
  if (!cancelUI.includes('package="com.google.android.documentsui"')) throw new Error("Sélecteur d'annulation absent.");
  run(["shell", "input", "keyevent", "4"]);
  await page.waitForFunction(() => window.exportOutcome !== null);
  if ((await page.evaluate(() => window.exportOutcome)).saved !== false) throw new Error("Annulation non respectée.");
  const invalid = await page.evaluate(() => window.Capacitor.nativePromise("MemeExport", "save", {
    name: "creatordeck-invalid-check.png", mime: "image/png", base64: btoa("not-an-image"),
  }).then(() => false, () => true));
  if (!invalid) throw new Error("Image invalide acceptée.");
  const cached = run(["shell", "run-as", pkg, "ls", "cache"]);
  if (cached.split(/\r?\n/).some(name => /^meme-export-.*\.tmp$/.test(name))) throw new Error("Fichier temporaire non nettoyé.");
  console.log(JSON.stringify({ nativeSaved: true, bytes: bytes.length,
    sha256: createHash("sha256").update(actual).digest("hex"), identical: true,
    cancelled: true, invalidRejected: true, cacheCleaned: true, package: pkg }));
  await page.screenshot({ path: "reports/gemini-export-native.png" });
} finally {
  await device.close();
  run(["shell", "am", "force-stop", pkg]);
}
