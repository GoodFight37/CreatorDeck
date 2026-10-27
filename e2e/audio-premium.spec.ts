import { expect, test, gotoDeck } from "./fixtures";

test("les gestes du booster jouent des fichiers, une seule déchirure, sans synthèse brute", async ({ page }) => {
  await page.addInitScript(() => {
    const probe = { effects: 0, loops: 0, oscillators: 0 };
    Object.assign(window, { __audioPremium: probe });
    const create = AudioContext.prototype.createBufferSource;
    AudioContext.prototype.createBufferSource = function () {
      const source = create.call(this), start = source.start.bind(source);
      source.start = (when, offset, duration) => {
        if (source.loop) probe.loops++; else probe.effects++;
        return start(when, offset, duration);
      };
      return source;
    };
    const oscillator = AudioContext.prototype.createOscillator;
    AudioContext.prototype.createOscillator = function () { probe.oscillators++; return oscillator.call(this); };
  });
  const probe = () => page.evaluate(() => (window as typeof window & { __audioPremium: { effects: number; loops: number; oscillators: number } }).__audioPremium);
  await gotoDeck(page);
  await expect.poll(async () => (await probe()).loops).toBe(1);
  await expect.poll(() => page.evaluate(() => performance.getEntriesByType("resource").filter(r => r.name.endsWith(".wav")).length)).toBeGreaterThan(30);
  const before = (await probe()).effects;
  await page.getByRole("button", { name: /^(Ouvrir le booster|Essayer)$/ }).click();
  expect((await probe()).effects).toBe(before);
  await page.getByRole("button", { name: "Ouvrir sans déchirer" }).click();
  // Le paquet et son extraction, puis la révélation commune (ou un impact + motif).
  await expect(page.getByRole("dialog", { name: "Résultat du booster" })).toBeVisible();
  await expect.poll(async () => (await probe()).effects - before).toBeGreaterThanOrEqual(3);
  const after = await probe();
  expect(after.effects - before).toBeLessThanOrEqual(4);
  expect(after.oscillators).toBe(0);
  expect(after.loops).toBe(1);
});

test("l'écoute comparative décode six candidates et ne superpose pas les musiques", async ({ page }) => {
  await page.goto("/audio-ecoute.html");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Une couleur pour tes aventures");
  const players = page.locator("audio");
  await expect(players).toHaveCount(6);
  // Un vrai geste précède la lecture des vrais fichiers, sans désactiver l'autoplay.
  await page.getByRole("heading", { level: 1 }).click();
  for (let i = 0; i < 6; i++) {
    await players.nth(i).evaluate(async (audio: HTMLAudioElement) => { await audio.play(); });
    await expect.poll(() => players.nth(i).evaluate((audio: HTMLAudioElement) => audio.currentTime)).toBeGreaterThan(0);
    expect(await players.evaluateAll(nodes => nodes.filter(n => !(n as HTMLAudioElement).paused).length)).toBe(1);
  }
  await page.getByRole("button", { name: "Tout arrêter" }).click();
  expect(await players.evaluateAll(nodes => nodes.every(n => (n as HTMLAudioElement).paused))).toBe(true);
});
