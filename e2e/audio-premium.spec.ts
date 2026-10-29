import { expect, test, gotoDeck } from "./fixtures";

test("l'ouverture du booster fait entendre le paquet et le bruit de carte", async ({ page }) => {
  await page.addInitScript(() => {
    // Chaque tampon décodé garde le nom de son fichier : on sait quel bruitage part.
    const probe = { played: [] as string[], loops: 0, oscillators: 0 };
    Object.assign(window, { __audioPremium: probe });
    const fileOf = new WeakMap<object, string>();
    const fetchFile = window.fetch;
    window.fetch = async (...args) => {
      const response = await fetchFile(...args);
      const name = String(args[0]).match(/\/sfx\/([\w-]+)\.wav$/)?.[1];
      if (name) {
        const read = response.arrayBuffer.bind(response);
        response.arrayBuffer = async () => { const data = await read(); fileOf.set(data, name); return data; };
      }
      return response;
    };
    const decode = AudioContext.prototype.decodeAudioData;
    AudioContext.prototype.decodeAudioData = function (this: BaseAudioContext, data: ArrayBuffer) {
      const name = fileOf.get(data);
      return decode.call(this, data).then(buffer => { if (name) fileOf.set(buffer, name); return buffer; });
    } as typeof decode;
    const create = AudioContext.prototype.createBufferSource;
    AudioContext.prototype.createBufferSource = function () {
      const source = create.call(this), start = source.start.bind(source);
      source.start = (when, offset, duration) => {
        if (source.loop) probe.loops++;
        else probe.played.push(source.buffer ? fileOf.get(source.buffer) ?? "?" : "?");
        return start(when, offset, duration);
      };
      return source;
    };
    const oscillator = AudioContext.prototype.createOscillator;
    AudioContext.prototype.createOscillator = function () { probe.oscillators++; return oscillator.call(this); };
  });
  const probe = () => page.evaluate(() => (window as typeof window & { __audioPremium: { played: string[]; loops: number; oscillators: number } }).__audioPremium);
  await gotoDeck(page);
  await expect.poll(async () => (await probe()).loops).toBe(1);
  expect(await page.evaluate(() => performance.getEntriesByType("resource").filter(r => r.name.endsWith("/music/candidates/collection-electronique-v1.mp3")).length)).toBe(1);
  await expect.poll(() => page.evaluate(() => performance.getEntriesByType("resource").filter(r => r.name.endsWith(".wav")).length)).toBeGreaterThanOrEqual(7);
  const before = (await probe()).played.length;
  await page.getByRole("button", { name: /^(Ouvrir le booster|Essayer)$/ }).click();
  expect((await probe()).played).toHaveLength(before);
  await page.getByRole("button", { name: "Ouvrir sans déchirer" }).click();
  await expect(page.getByRole("dialog", { name: "Résultat du booster" })).toBeVisible();
  // Le paquet sonne (« pop » + synthèse), puis la première carte (« card-draw » + gamme).
  await expect.poll(async () => (await probe()).played.slice(before)).toEqual(expect.arrayContaining(["pop", "card-draw"]));
  const after = await probe();
  expect(after.oscillators).toBeGreaterThan(0);
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
