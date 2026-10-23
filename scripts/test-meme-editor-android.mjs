// Test explicite sur émulateur, comptes/RPC factices, application isolée.
import { _android, expect } from "@playwright/test";
import gifenc from "gifenc";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { waitForAndroidApp } from "./lib/android-app-ready.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { GIFEncoder } = gifenc;
const packageName = "com.creatordeck.app.memeeditor";
const adb = path.join(process.env.LOCALAPPDATA, "Android/Sdk/platform-tools/adb.exe");
const card = JSON.parse(await readFile(path.join(root, "src/data/memes-fr.json"), "utf8")).find(card => card.image);
const report = path.join(root, "reports/meme-editor-android");
await mkdir(report, { recursive: true });
const run = args => {
  const result = spawnSync(adb, args, { encoding: "utf8", windowsHide: true, timeout: 60_000 });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout);
  return result.stdout;
};
const devices = await _android.devices();
if (devices.length !== 1) throw new Error("Un émulateur Android unique est requis.");
const device = devices[0], serial = device.serial();
device.setDefaultTimeout(20_000);
let currentPage;
const gif = GIFEncoder();
for (const [color, delay] of [[0, 80], [1, 140]]) gif.writeFrame(new Uint8Array(80 * 60).fill(color), 80, 60,
  { palette: [[255, 0, 0], [0, 0, 255]], delay, repeat: 2, dispose: 2 });
gif.finish();
try {
  run(["-s", serial, "shell", "am", "force-stop", packageName]);
  run(["-s", serial, "shell", "am", "start", "-n", packageName + "/com.creatordeck.app.MainActivity"]);
  console.log("Android test app launched");
  const connected = await waitForAndroidApp({ timeoutMs: 60_000, intervalMs: 1000, probe: async () => {
    const pid = Number(run(["-s", serial, "shell", "pidof", packageName]).trim());
    const webview = device.webViews().find(view => view.pkg() === packageName && view.pid() === pid);
    if (!webview) return { ready: false, detail: "WebView du processus courant absente" };
    let timer;
    try {
      const page = await Promise.race([webview.page(), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("Connexion trop longue")), 5000); })]);
      await page.waitForFunction(() => Boolean(document.querySelector("main")), null, { timeout: 1500 });
      return { ready: true, value: page };
    } catch (error) { return { ready: false, detail: error.message }; }
    finally { clearTimeout(timer); }
  } });
  if (!connected.ready) throw new Error("WebView indisponible : " + connected.lastDetail);
  const page = connected.value;
  currentPage = page;
  page.setDefaultTimeout(20_000);
  console.log("Android test WebView connected");
  await page.addInitScript(({ card, gif }) => {
    localStorage.setItem("creatordeck.cloud.session", JSON.stringify({ accessToken: "fake-token", refreshToken: "fake-refresh",
      expiresAt: Date.now() + 3_600_000, userId: "11111111-1111-4111-8111-111111111111", email: "test@example.invalid" }));
    const original = window.fetch.bind(window);
    const responseData = pathname => pathname.endsWith("meme_status")
      ? { stock: 4, next_at: null, openings: 0, owned: [{ id: card.id, copies: 2 }] } : {};
    function mockNativeHttp() {
      const capacitor = window.Capacitor;
      if (!capacitor?.nativePromise || capacitor.__memeTestPatched) return;
      const nativePromise = capacitor.nativePromise.bind(capacitor);
      capacitor.nativePromise = (plugin, method, options) => {
        if (plugin === "CapacitorHttp") return Promise.resolve({ status: 200,
          data: responseData(new URL(options.url).pathname), headers: { "content-type": "application/json" }, url: options.url });
        return nativePromise(plugin, method, options);
      };
      capacitor.__memeTestPatched = true;
    }
    const localFetch = async (input, options) => {
      const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url, location.href);
      if (url.pathname === card.image) return new Response(Uint8Array.from(atob(gif), char => char.charCodeAt(0)), { headers: { "content-type": "image/gif" } });
      if (url.pathname.includes("/rest/v1/") || url.pathname.includes("/auth/v1/")) return new Response(JSON.stringify(responseData(url.pathname)), { headers: { "content-type": "application/json" } });
      return original(input, options);
    };
    window.fetch = localFetch;
    mockNativeHttp();
    document.addEventListener("DOMContentLoaded", () => { window.fetch = localFetch; mockNativeHttp(); }, { once: true });
  }, { card, gif: Buffer.from(gif.bytes()).toString("base64") });
  await page.goto("https://localhost/memes.html");
  console.log("Android meme page: " + page.url());
  await page.getByPlaceholder("Nom ou numéro").fill(card.name);
  await page.locator(".meme-slot").first().click();
  await page.getByRole("button", { name: "Créer un mème avec cette carte" }).click();
  await page.getByRole("textbox", { name: "Texte de la zone" }).fill("Android GIF");
  await page.getByRole("button", { name: "Créer le fichier" }).click();
  const save = page.getByRole("button", { name: "Enregistrer sur l’appareil" });
  await expect(save).toBeVisible();
  await page.screenshot({ path: path.join(report, "editor.png") });
  await save.click();
  // DocumentsUI selectors fail with this API 36 driver; use its live button bounds.
  run(["-s", serial, "shell", "uiautomator", "dump", "/sdcard/creatordeck-meme-test-ui.xml"]);
  const hierarchy = run(["-s", serial, "shell", "cat", "/sdcard/creatordeck-meme-test-ui.xml"]);
  const button = hierarchy.match(/<node\b[^>]*resource-id="android:id\/button1"[^>]*>/)?.[0];
  const bounds = button?.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
  if (!bounds || !button.includes('package="com.google.android.documentsui"') || !button.includes('enabled="true"')) throw new Error("Bouton du sélecteur système absent.");
  const [, x1, y1, x2, y2] = bounds.map(Number);
  run(["-s", serial, "shell", "input", "tap", String(Math.round((x1 + x2) / 2)), String(Math.round((y1 + y2) / 2))]);
  await expect(page.locator(".meme-editor")).toBeVisible();
  // DocumentsUI writes to Downloads on this emulator. Only inspect this test's new files.
  const names = run(["-s", serial, "shell", "ls", "-t", "/sdcard/Download"]).trim().split(/\r?\n/);
  const name = names.find(name => name.startsWith("creatordeck-" + card.id + "-") && name.endsWith(".gif"));
  if (!name) throw new Error("Fichier GIF natif introuvable après validation du sélecteur.");
  await expect.poll(() => Number(run(["-s", serial, "shell", "stat", "-c", "%s", "/sdcard/Download/" + name]).trim()), { timeout: 10_000 }).toBeGreaterThan(0);
  const target = path.join(report, "created.gif");
  run(["-s", serial, "pull", "/sdcard/Download/" + name, target]);
  const metadata = await sharp(target, { animated: true }).metadata();
  expect(metadata.pages).toBe(2); expect(metadata.delay).toEqual([80, 140]); expect(metadata.loop).toBe(3);
  const result = { emulator: serial, packageName, pages: metadata.pages, delay: metadata.delay, loop: metadata.loop,
    nativeSaved: true, productionAccountUsed: false };
  await writeFile(path.join(report, "result.json"), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} catch (error) {
  if (currentPage) {
    await currentPage.screenshot({ path: path.join(report, "failure.png") }).catch(() => {});
    console.error(await currentPage.locator(".meme-status").textContent().catch(() => "Page Mèmes absente"));
  }
  throw error;
} finally { await device.close(); }
