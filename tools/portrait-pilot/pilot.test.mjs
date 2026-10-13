import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { chromium } from "@playwright/test";
import { protectCreators, normalizeSerpResults, rankCandidates, runPilot } from "./pilot.mjs";
import { renderGallery } from "./gallery.mjs";

test("les 300 choix manuels et les autres portraits validés sont exclus, même en demande explicite", () => {
  const creators = ["manual", "commons", "provided", "new", "new", "solaryhs", "j0niq", "toaststix"].map((slug) => ({ slug }));
  assert.deepEqual(protectCreators(creators, [{ manual: "/manual" }, { commons: "/curated" }, { provided: "/provided" }]), [{ slug: "new" }]);
  assert.throws(() => protectCreators([{ slug: "../public" }], []));
});

test("les réponses SerpApi sont réduites aux données publiques d’image, jamais aux paramètres de clé", () => {
  const normalized = normalizeSerpResults({ search_parameters: { api_key: "secret" }, images_results: [
    { title: "Creator", link: "https://example.com/source", original: "https://example.com/image.jpg", thumbnail: "thumb" },
    { title: "Miniature sans originale", thumbnail: "thumb" },
  ] });
  assert.equal(normalized.length, 1);
  assert.equal(normalized[0].original, "https://example.com/image.jpg");
  assert.equal(JSON.stringify(normalized).includes("secret"), false);
  assert.deepEqual(normalizeSerpResults({ error: "Google Images hasn't returned any results for this query." }), []);
  assert.throws(() => normalizeSerpResults({ error: "Invalid API key: secret" }), /Recherche SerpApi refusée/);
});

test("les homonymes sans nom concordant restent signalés et les doublons d’URL ne gonflent pas la sélection", () => {
  const ranked = rankCandidates({ slug: "creator-one", name: "Creator One", login: "creator_one" }, [
    { title: "Autre personne", source: "https://example.com/other", original: "https://example.com/image.jpg#fragment" },
    { title: "Creator One portrait", source: "https://example.com/creator-one", original: "https://example.com/image.jpg" },
    { title: "Homonyme", source: "https://example.com/other", original: "https://example.com/other.jpg" },
    { title: "Interdit", source: "https://example.com/source", original: "http://example.com/no-tls.jpg" },
    { title: "Secret URL", source: "https://example.com/source", original: "https://user:secret@example.com/image.jpg" },
  ]);
  assert.equal(ranked.length, 2);
  assert.equal(ranked[0].nameEvidence, true);
  assert.equal(ranked[1].nameEvidence, false);
  assert.equal(ranked[0].rightsStatus, "à vérifier");
  assert.equal(ranked[0].identityStatus, "à vérifier");
});

test("les photos annoncées assez grandes passent avant les petites images de profil, sans certifier leurs dimensions", () => {
  const ranked = rankCandidates({ slug: "creator", name: "Creator" }, [
    { title: "Creator", source: "https://example.com/creator", original: "https://example.com/avatar.jpg", declaredWidth: 150, declaredHeight: 150 },
    { title: "Creator", source: "https://example.com/creator", original: "https://example.com/event.jpg", declaredWidth: 1600, declaredHeight: 1200 },
  ]);
  assert.match(ranked[0].original, /event.jpg/);
  assert.equal(ranked[0].rightsStatus, "à vérifier");
});

test("un nom court trouvé sur une autre plateforme garde un avertissement d’homonyme", () => {
  const candidates = rankCandidates({ slug: "arii", name: "arii" }, [
    { title: "Who is Arii?", source: "https://example.com/tiktok/arii", original: "https://example.com/photo.jpg" },
    { title: "Arii Twitch", source: "https://example.com/twitch/arii", original: "https://example.com/streamer.jpg" },
  ]);
  assert.equal(candidates.find((c) => c.title === "Who is Arii?").shortNameWithoutContext, true);
  assert.equal(candidates.find((c) => c.title === "Arii Twitch").shortNameWithoutContext, false);
});

test("une sortie vers les fichiers de production est refusée avant réseau ou écriture", async () => {
  await assert.rejects(runPilot({ output: path.resolve("public/creators"), limit: 20 }), /Sortie dans le dépôt refusée/);
});

test("galerie réelle : source échappée, revue persistante, filtre et export de brouillons sans patch publiable", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "portrait-pilot-"));
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ acceptDownloads: true });
    const malicious = "</script><script>window.injected=true</script>";
    const report = { generatedAt: "2026-10-13T00:00:00Z", stats: { creators: 2, searchResults: 1, technicalProposals: 1, keptCurrent: 1 }, creators: [
      { slug: "one", name: malicious, login: "one", rank: 1, before: "before.webp", proposal: "photo", candidates: [
        { id: "photo", title: malicious, source: "https://example.com/source", preview: "preview.webp", technicalEligible: true, dimensions: [900, 900], faceCount: 1, reasons: [] },
      ] },
      { slug: "two", name: "Two", login: "two", rank: 2, before: "before.webp", proposal: null, candidates: [] },
    ] };
    await page.route("http://pilot.test/**", (route) => route.fulfill({ contentType: route.request().resourceType() === "document" ? "text/html" : "image/webp", body: route.request().resourceType() === "document" ? renderGallery(report) : "" }));
    await page.goto("http://pilot.test/");
    assert.equal(await page.evaluate(() => window.injected), undefined);
    assert.equal(await page.locator("article").count(), 2);
    assert.equal(await page.locator('[data-slug="two"] button').filter({ hasText: "Garder la proposition" }).isDisabled(), true);
    await page.locator('[data-slug="one"] button').filter({ hasText: "Garder la proposition" }).click();
    await page.reload();
    assert.equal(await page.locator("#progress").textContent(), "1/2 créateurs examinés. Export : choix visuels uniquement, pas un fichier de publication.");
    await page.locator("#filter").selectOption("unreviewed");
    assert.equal(await page.locator("article").count(), 1);
    const downloading = page.waitForEvent("download");
    await page.locator("#export").click();
    const download = await downloading;
    const file = path.join(directory, download.suggestedFilename());
    await download.saveAs(file);
    const { readFile } = await import("node:fs/promises");
    const saved = JSON.parse(await readFile(file, "utf8"));
    assert.equal(saved.decisions.length, 1);
    assert.equal(saved.decisions[0].status, "visual-selected");
    assert.equal(saved.decisions[0].identityStatus, "à vérifier");
    assert.equal(saved.decisions[0].rightsStatus, "à vérifier");
    assert.match(saved.note, /Aucun patch de publication/);
  } finally {
    await browser.close();
    await rm(directory, { recursive: true, force: true });
  }
});
