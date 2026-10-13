/** Pilote local : recherche/cadrage en brouillon ; ne modifie jamais le jeu. */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { renderGallery } from "./gallery.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "../..");
const readJson = async (file) => JSON.parse(await readFile(file, "utf8"));
const saveJson = async (file, data) => writeFile(file, JSON.stringify(data, null, 2) + "\n");
const normalize = (value) => String(value).normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

export function protectCreators(creators, registries) {
  const protectedSlugs = new Set([
    ...registries.flatMap((registry) => Object.keys(registry)),
    "solaryhs", "j0niq", "toaststix",
  ]);
  const seen = new Set();
  return creators.filter((creator) => {
    if (!/^[a-z0-9-]+$/.test(creator.slug)) throw Error("Identifiant de créateur invalide");
    if (protectedSlugs.has(creator.slug) || seen.has(creator.slug)) return false;
    seen.add(creator.slug);
    return true;
  });
}

export function normalizeSerpResults(payload) {
  if (payload.error && !/^Google(?: Images)? hasn't returned any results for this query\.?$/i.test(payload.error)) {
    throw Error("Recherche SerpApi refusée ; vérifier le tableau de bord du service.");
  }
  return (payload.images_results ?? []).flatMap((item) => {
    if (!item.original) return [];
    return [{ title: String(item.title ?? ""), source: String(item.link ?? ""), original: item.original,
      declaredWidth: Number(item.original_width) || null, declaredHeight: Number(item.original_height) || null,
      description: String(item.source ?? ""), provider: "serpapi-google-images" }];
  });
}

export function rankCandidates(creator, candidates, aliases = []) {
  const terms = [creator.name, creator.displayName, creator.login, creator.slug, ...aliases]
    .filter(Boolean).map(normalize).filter((term) => term.length >= 4);
  const unique = new Map();
  for (const candidate of candidates) {
    try {
      const image = new URL(candidate.original);
      if (image.protocol !== "https:" || image.username || image.password) continue;
      let sourceHref = "";
      try {
        const source = candidate.source ? new URL(candidate.source) : null;
        if (source?.protocol === "https:" && !source.username && !source.password) sourceHref = source.href;
      } catch { /* La page de contexte est facultative : seule l’image doit être accessible. */ }
      image.hash = "";
      const titleMatches = terms.some((term) => normalize(candidate.title).includes(term));
      const sourceMatches = sourceHref && terms.some((term) => normalize(new URL(sourceHref).pathname).includes(term));
      const score = Number(titleMatches) * 60 + Number(sourceMatches) * 40;
      const shortNameWithoutContext = normalize(creator.name ?? creator.login ?? creator.slug).length <= 4
        && !/twitch/i.test([candidate.title, candidate.source, candidate.description].join(" "));
      const declaredSize = Math.min(Number(candidate.declaredWidth) || 0, Number(candidate.declaredHeight) || 0);
      const record = { ...candidate, original: image.href, source: sourceHref,
        id: createHash("sha256").update(image.href).digest("hex").slice(0, 16),
        nameEvidence: score > 0, nameScore: score,
        declaredSize,
        shortNameWithoutContext };
      const previous = unique.get(image.href);
      if (!previous || previous.nameScore < score) unique.set(image.href, record);
    } catch { /* Une mauvaise URL est écartée, sans interrompre les autres candidates. */ }
  }
  return [...unique.values()].sort((a, b) => Number(b.nameEvidence) - Number(a.nameEvidence)
    || Number(b.declaredSize >= 600) - Number(a.declaredSize >= 600)
    || b.nameScore - a.nameScore || b.declaredSize - a.declaredSize);
}

async function searchSerpApi(creator, aliases) {
  const key = process.env.SERPAPI_API_KEY;
  if (!key) throw Error("SERPAPI_API_KEY manque. Utiliser --input pour les recherches enregistrées.");
  // Le cadrage/visage est filtré après téléchargement : ajouter « portrait » et
  // le jeu courant écartait beaucoup de bonnes photos de créateurs.
  const context = creator.slug === "mmorpg" ? "Old School RuneScape" : "";
  const query = `"${aliases[0] ?? creator.name}" Twitch ${context}`.trim();
  const url = new URL("https://serpapi.com/search.json");
  url.search = new URLSearchParams({ engine: "google_images", q: query, api_key: key });
  const response = await fetch(url, { signal: AbortSignal.timeout(45_000) });
  if (!response.ok) throw Error(`SerpApi HTTP ${response.status} (clé et quota à vérifier)`);
  const payload = await response.json();
  return { query, provider: "serpapi-google-images", candidates: normalizeSerpResults(payload) };
}

async function pythonAnalyze(python, model, jobsFile, output, retryDownloads = false) {
  if (!model) throw Error("Modèle MediaPipe manquant : renseigner --model avant toute recherche.");
  await new Promise((resolve, reject) => {
    const argumentsList = [path.join(here, "analyze.py"), "--model", model,
      ...(jobsFile ? ["--jobs", jobsFile, "--output", output] : ["--check"]),
      ...(retryDownloads ? ["--retry-downloads"] : [])];
    const child = spawn(python, argumentsList, { stdio: "inherit", env: process.env });
    child.on("error", () => reject(Error("Python indisponible : vérifier --python et le venv.")));
    child.on("exit", (code) => code === 0 ? resolve() : reject(Error(`Analyse locale échouée (${code})`)));
  });
}

export async function runPilot(options) {
  const output = path.resolve(options.output);
  // Les sorties ne peuvent toucher ni les assets du jeu, ni ses sources/outils.
  const inRepo = output === repo || output.startsWith(repo + path.sep);
  const reportsRoot = path.join(repo, "reports") + path.sep;
  if (inRepo && !output.startsWith(reportsRoot)) throw Error("Sortie dans le dépôt refusée : utiliser reports/ ou un dossier extérieur.");
  // Vérifier modèle/interpréteur/librairies avant toute consommation de recherches.
  await pythonAnalyze(options.python, options.model);
  const catalog = await readJson(path.join(repo, "src/data/creators.json"));
  const registries = await Promise.all(["manual-portrait-overrides", "portrait-overrides", "provided-portrait-overrides"]
    .map((name) => readJson(path.join(repo, "src/data", name + ".json"))));
  const requested = options.creators ? await readJson(options.creators) : catalog.slice().sort((a, b) => a.rank - b.rank);
  // Les slugs doivent appartenir au catalogue courant ; ne pas accepter des noms arbitraires.
  const bySlug = new Map(catalog.map((creator) => [creator.slug, creator]));
  const picked = protectCreators(requested.map((item) => {
    const entry = bySlug.get(item.slug);
    if (!entry) throw Error("Créateur absent du catalogue : " + item.slug);
    return { slug: entry.slug, name: entry.displayName, login: entry.login, rank: entry.rank, category: entry.category };
  }), registries).slice(0, options.limit);
  if (!picked.length) throw Error("Aucun créateur à traiter après protection des choix existants.");
  const aliases = options.aliases ? await readJson(options.aliases) : {};
  await mkdir(path.join(output, "search"), { recursive: true });
  const jobs = []; let requests = 0; let searchBlocked = false;
  for (const creator of picked) {
    const target = path.join(output, "search", creator.slug + ".json");
    let search;
    try {
      const input = options.input ? path.resolve(options.input, creator.slug + ".json") : target;
      try { search = await readJson(input); }
      catch (error) {
        if (options.input || error.code !== "ENOENT") throw error;
        if (searchBlocked) throw Error("Recherche suspendue après un refus du service ; aucune nouvelle requête envoyée.");
        // Pas de répétition automatique facturée ; les recherches réussies sont conservées.
        if (process.env.SERPAPI_API_KEY) requests++;
        try { search = await searchSerpApi(creator, aliases[creator.slug] ?? []); }
        catch (failure) { searchBlocked = true; throw failure; }
      }
      if (search.slug && search.slug !== creator.slug) throw Error("Recherche associée à un autre créateur");
      if (options.retryEmpty && !options.input && !(search.candidates?.length) && !searchBlocked) {
        const previous = { query: search.query, provider: search.provider, found: 0 };
        if (process.env.SERPAPI_API_KEY) requests++;
        try {
          const replacement = await searchSerpApi(creator, aliases[creator.slug] ?? []);
          search = { ...replacement, previousSearches: [...(search.previousSearches ?? []), previous] };
        } catch (failure) { searchBlocked = true; throw failure; }
      }
      await saveJson(target, { ...search, slug: creator.slug });
      const ranked = rankCandidates(creator, search.candidates ?? [], aliases[creator.slug] ?? []);
      jobs.push({ ...creator, provider: search.provider ?? "imported-search", query: search.query,
        found: search.candidates?.length ?? 0, candidates: ranked.slice(0, options.candidates),
        avatar: path.join(repo, "public/creators", creator.slug + ".webp") });
    } catch (error) {
      jobs.push({ ...creator, provider: options.input ? "imported-search" : "serpapi-google-images",
        error: error.message, found: 0, candidates: [], avatar: path.join(repo, "public/creators", creator.slug + ".webp") });
    }
    console.log(creator.slug + ": " + jobs.at(-1).found + " résultats");
  }
  await saveJson(path.join(output, "jobs.json"), { creators: jobs });
  await pythonAnalyze(options.python, options.model, path.join(output, "jobs.json"), output, options.retryDownloads);
  const analyzed = await readJson(path.join(output, "analysis.json"));
  const stats = {
    creators: picked.length, protected: requested.length - protectCreators(requested, registries).length,
    serpApiRequestsAttempted: requests,
    searchResults: jobs.reduce((n, job) => n + job.found, 0),
    downloaded: analyzed.creators.flatMap((creator) => creator.candidates).filter((c) => c.downloaded).length,
    analyzed: analyzed.creators.flatMap((creator) => creator.candidates).filter((c) => c.analyzed).length,
    creatorsWithCandidates: analyzed.creators.filter((creator) => creator.proposal).length,
    keptCurrent: analyzed.creators.filter((creator) => !creator.proposal).length,
    identityConfirmed: 0, publicationReady: 0,
  };
  const report = { ...analyzed, stats, generatedAt: new Date().toISOString(),
    note: "Comparaison visuelle préparatoire. Aucune image du jeu n’est modifiée." };
  await saveJson(path.join(output, "manifest.json"), report);
  await writeFile(path.join(output, "index.html"), renderGallery(report));
  console.log(JSON.stringify(stats, null, 2));
  console.log("Galerie : " + path.join(output, "index.html"));
  return report;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const option = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
  const limit = Number(option("--limit", "20")), candidates = Number(option("--candidates", "3"));
  if (!Number.isInteger(limit) || limit < 1 || limit > 50 || !Number.isInteger(candidates) || candidates < 1 || candidates > 5) {
    console.error("Limites : 1–50 créateurs, 1–5 candidates par créateur."); process.exitCode = 1;
  } else {
    await runPilot({ output: option("--output", path.join(repo, "reports/portrait-pilot")),
      input: option("--input"), creators: option("--creators"), aliases: option("--aliases"),
      retryEmpty: args.includes("--retry-empty"),
      retryDownloads: args.includes("--retry-downloads"),
      python: option("--python", "python"), model: option("--model"), limit, candidates })
      .catch((error) => { console.error(error.message); process.exitCode = 1; });
  }
}
