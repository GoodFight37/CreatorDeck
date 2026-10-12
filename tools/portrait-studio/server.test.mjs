import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createStudio, httpsUrl, webpSize, zipFiles, portraitOutputSize } from "./server.mjs";
import { createRequire } from "node:module";
const require = createRequire(new URL("../../package.json", import.meta.url)); const sharp = require("sharp");

test("les téléchargements restent HTTPS et sur Wikimedia", () => {
  assert.equal(httpsUrl("https://upload.wikimedia.org/a.jpg", ["upload.wikimedia.org"]), "https://upload.wikimedia.org/a.jpg");
  for (const url of ["http://upload.wikimedia.org/a.jpg", "https://127.0.0.1/a.jpg", "file:///etc/passwd", "https://user:pass@upload.wikimedia.org/a.jpg"]) assert.throws(() => httpsUrl(url, ["upload.wikimedia.org"]));
});
test("la taille du WebP est lue dans le fichier, pas dans le formulaire", async () => {
  const data = await readFile(new URL("../../public/creators/curated/mastu.webp", import.meta.url));
  assert.deepEqual(webpSize(data), [900, 900]); assert.throws(() => webpSize(Buffer.from("fichier arbitraire")));
});
test("les originaux moyens gardent leur résolution sans agrandissement", () => {
  assert.equal(portraitOutputSize(399), 399); assert.equal(portraitOutputSize(800), 800); assert.equal(portraitOutputSize(1200), 900); assert.throws(() => portraitOutputSize(299), /300 px minimum/);
});
test("un choix persiste et l’export préserve la base sans modifier un dépôt", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "portrait-studio-test-"));
  const fixture = await readFile(new URL("../../public/creators/curated/mastu.webp", import.meta.url));
  const seed = path.join(directory, "seed"); await mkdir(path.join(seed, "portraits"), { recursive: true });
  await writeFile(path.join(seed, "creators.json"), JSON.stringify(["existing", "prepared", "new"].map((slug) => ({ slug, displayName: slug, rank: 1 }))));
  const existing = { name: "existing", image: "/creators/curated/existing.webp" }; const prepared = { name: "prepared", image: "/creators/curated/prepared.webp" };
  await writeFile(path.join(seed, "overrides.json"), JSON.stringify({ existing, prepared }));
  await writeFile(path.join(seed, "published.json"), JSON.stringify({ existing }));
  await writeFile(path.join(seed, "portraits/prepared.webp"), fixture);
  const studio = await createStudio({ directory, port: 0, quiet: true });
  const origin = new URL(studio.url).origin;
  const post = (endpoint, body, customOrigin = origin) => fetch(origin + endpoint, { method: "POST", headers: { Authorization: `Bearer ${studio.token}`, Origin: customOrigin, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  try {
    assert.equal((await fetch(origin + "/api/state")).status, 403);
    assert.equal((await post("/api/skip", { slug: "new" }, "https://example.com")).status, 403);
    const body = { slug: "new", title: "Photo", author: "Auteur", source: "https://commons.wikimedia.org/wiki/File:Photo.jpg", license: "CC BY 4.0", licenseUrl: "https://creativecommons.org/licenses/by/4.0/", verified: true, crop: { x: 0, y: 0, size: 900 }, webp: fixture.toString("base64") };
    assert.equal((await post("/api/select", { ...body, crop: { x: 0, y: 0, size: 500 } })).status, 400);
    assert.equal((await post("/api/select", { ...body, verified: false })).status, 400);
    assert.equal((await post("/api/visual", { ...body, author: "", license: "", verified: false })).status, 200);
    const pendingExport = await (await post("/api/export", {})).json(); assert.equal(pendingExport.count, 1); assert.equal(pendingExport.pendingCount, 1);
    const pendingPatch = JSON.parse(await readFile(path.join(pendingExport.directory, "portrait-overrides.patch.json"), "utf8")); assert.equal(pendingPatch.new, undefined);
    const connection = await (await fetch(origin + "/api/connect", { headers: { Authorization: `Bearer ${studio.token}` } })).json();
    const bridgeToken = new URL(connection.connection).hash.slice(1);
    assert.equal((await fetch(origin + "/api/state", { headers: { Authorization: `Bearer ${bridgeToken}` } })).status, 403);
    await post("/api/session", { slug: "new" });
    const bridgeHeaders = { Authorization: `Bearer ${bridgeToken}`, "X-Studio-Bridge": "1", "Content-Type": "application/json" };
    const receiveBody = JSON.stringify({ slug: "new", original: fixture.toString("base64"), imageUrl: "https://example.com/photo.webp", source: "https://example.com/page", title: "Image reçue" });
    assert.equal((await fetch(origin + "/api/receive", { method: "POST", headers: { ...bridgeHeaders, Origin: "https://untrusted.example" }, body: receiveBody })).status, 403);
    assert.equal((await fetch(origin + "/api/receive", { method: "POST", headers: bridgeHeaders, body: receiveBody })).status, 200);
    const inbox = await (await fetch(origin + "/api/inbox", { headers: { Authorization: `Bearer ${studio.token}` } })).json(); assert.equal(inbox.items.length, 1); assert.equal(inbox.items[0].slug, "new");
    const duplicateBody = JSON.stringify({ slug: "prepared", original: fixture.toString("base64"), imageUrl: "https://example.com/other.webp", source: "https://example.com/other", title: "Même photo" });
    const duplicate = await (await fetch(origin + "/api/receive", { method: "POST", headers: bridgeHeaders, body: duplicateBody })).json(); assert.equal(duplicate.duplicates[0].slug, "new");
    const queryResponse = await post("/api/search-query", { slug: "new", query: "Ibai Llanos streamer" }); assert.equal(queryResponse.status, 200);
    const currentState = await (await fetch(origin + "/api/state", { headers: { Authorization: `Bearer ${studio.token}` } })).json(); assert.equal(currentState.searchQueries.new, "Ibai Llanos streamer");
    const medium = await sharp(fixture).resize(800, 800).webp().toBuffer(); const mediumBody = { ...body, crop: { x: 0, y: 0, size: 800 }, webp: medium.toString("base64") };
    assert.equal((await post("/api/select", mediumBody)).status, 200); assert.deepEqual(webpSize(await readFile(path.join(studio.work, "portraits/new.webp"))), [800, 800]);
    assert.equal((await post("/api/select", body)).status, 200);
    assert.equal((await post("/api/tracking", { slug: "new", status: "Trouvé", links: "https://example.com/source", notes: "Source officielle" })).status, 200);
    assert.equal((await post("/api/draft", { slug: "new", original: fixture.toString("base64"), title: "Photo à cadrer" })).status, 200);
    const draftResponse = await fetch(origin + "/api/draft-photo?slug=new", { headers: { Authorization: `Bearer ${studio.token}` } }); assert.deepEqual(Buffer.from(await draftResponse.arrayBuffer()), fixture);
    assert.equal((await post("/api/select", { ...body, license: "Autorisation directe", proofUrl: "https://example.com/permission", permission: "" })).status, 400);
    assert.equal((await post("/api/select", { ...body, license: "Autorisation directe", proofUrl: "https://example.com/permission", permission: "Utilisation dans CreatorDeck et recadrage autorisés" })).status, 200);
    const saved = JSON.parse(await readFile(path.join(studio.work, "state.json"), "utf8")); assert.equal(saved.choices.new.author, "Auteur"); assert.equal(saved.tracking.new.status, "Prêt"); assert.equal(saved.choices.new.licenseUrl, "https://example.com/permission");
    const response = await post("/api/export", {}); assert.equal(response.status, 200); const exported = await response.json(); assert.equal(exported.count, 2);
    const patch = JSON.parse(await readFile(path.join(exported.directory, "portrait-overrides.patch.json"), "utf8")); assert.deepEqual(Object.keys(patch).sort(), ["new", "prepared"]);
    assert.deepEqual(JSON.parse(await readFile(path.join(seed, "published.json"), "utf8")), { existing });
    assert.deepEqual(await readFile(path.join(exported.directory, "public/creators/curated/new.webp")), fixture);
  } finally { await new Promise((r) => studio.server.close(r)); await rm(directory, { recursive: true, force: true }); }
});

test("le ZIP exporté est lisible sans dépendance et conserve les données", () => {
  const data = Buffer.from("123456789"); const zip = zipFiles([["photo.webp", data]]);
  assert.equal(zip.readUInt32LE(0), 0x04034b50); assert.equal(zip.readUInt32LE(14), 0xcbf43926);
  assert.equal(zip.subarray(30, 40).toString(), "photo.webp"); assert.deepEqual(zip.subarray(40, 49), data);
  assert.equal(zip.readUInt32LE(zip.length-22), 0x06054b50); assert.equal(zip.readUInt16LE(zip.length-14), 1);
});
