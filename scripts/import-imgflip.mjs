// Import local : aucune requête réseau, aucun déploiement, aucun droit supposé.
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir, copyFile, rename, realpath } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
import { rarityForRank } from "./lib/rarity-ladder.mjs";
const rarities = new Set(["common", "uncommon", "rare", "epic", "legendary", "mythic"]);
const hash = data => createHash("sha256").update(data).digest("hex");
const sql = text => "'" + text.replaceAll("'", "''") + "'";

export function personalApprovals(bundle, existing = []) {
  if (bundle?.cards?.length !== 999 || bundle.ranking !== "api-image-then-public-top-30-days") throw new Error("Top 999 complet requis avant attribution des raretés.");
  const offset = Math.max(0, ...existing.filter(card => !card.id.startsWith("imgflip-")).map(card => card.number));
  return bundle.cards.map((item, index) => {
    if (item.rank !== index + 1) throw new Error("Rang de popularité incohérent.");
    if (item.blocked === true) return null;
    return { key: item.key, sourceSha256: item.source_sha256, number: offset + index + 1,
      rarity: rarityForRank(index + 1, bundle.cards.length), rights: {
        owner: "Malik (projet personnel)", note: "droits non vérifiés, validation explicite de Malik",
        evidenceUrl: `https://imgflip.com/memetemplate/${item.key.slice(8)}`,
        personalProject: true, redistribute: false, modify: false, reviewedAt: new Date().toISOString(),
      } };
  }).filter(Boolean);
}

export function prepareCatalog(bundle, approvals, existing = []) {
  if (bundle?.schema !== "creatordeck.templates.v1" || !Array.isArray(bundle.cards) || !Array.isArray(approvals)) throw new Error("Bundle ou validations illisibles.");
  const decisions = new Map();
  for (const approval of approvals) {
    if (!approval || typeof approval.key !== "string" || decisions.has(approval.key)) throw new Error("Validation absente ou dupliquée.");
    decisions.set(approval.key, approval);
  }
  const keys = new Set(), numbers = new Set(existing.map(card => card.number));
  const cards = [], assets = [];
  for (const item of bundle.cards) {
    if (!/^imgflip:\d+$/.test(item?.key ?? "") || keys.has(item.key)) throw new Error("Identité Imgflip invalide ou dupliquée.");
    keys.add(item.key);
    const approval = decisions.get(item.key);
    if (!approval) continue;
    const rights = approval.rights;
    const personal = rights?.personalProject === true && rights.owner === "Malik (projet personnel)"
      && rights.note === "droits non vérifiés, validation explicite de Malik"
      && rights.evidenceUrl === `https://imgflip.com/memetemplate/${item.key.slice(8)}`
      && rights.redistribute === false && rights.modify === false;
    if (personal && (bundle.cards.length !== 999 || !Number.isInteger(item.rank)
      || item.rank < 1 || item.rank > 999 || approval.rarity !== rarityForRank(item.rank, 999))) {
      throw new Error("Rareté personnelle hors classement Top 999.");
    }
    let evidence;
    try { evidence = new URL(rights?.evidenceUrl); } catch { throw new Error("Source de validation manquante : " + item.key); }
    if (approval.sourceSha256 !== item.source_sha256 || !/^[a-f0-9]{64}$/.test(item.source_sha256 ?? "")
      || evidence.protocol !== "https:" || evidence.username || evidence.password
      || typeof rights?.owner !== "string" || !rights.owner.trim()
      || typeof rights?.note !== "string" || rights.note.trim().length < 10
      || (!personal && (rights.redistribute !== true || rights.modify !== true))
      || !Number.isFinite(Date.parse(rights.reviewedAt)) || Date.parse(rights.reviewedAt) > Date.now()
      || !rarities.has(approval.rarity) || !Number.isInteger(approval.number) || approval.number < 1
      || typeof item.name !== "string" || !item.name.trim() || item.name.length > 500
      || !/^[a-f0-9]{64}$/.test(item.sha256 ?? "") || !["image", "gif"].includes(item.media_type)) throw new Error("Validation incomplète : " + item.key);
    const id = item.key.replace(":", "-");
    if (numbers.has(approval.number) && !existing.some(card => card.id === id && card.number === approval.number)) throw new Error("Numéro de collection déjà utilisé.");
    numbers.add(approval.number);
    const extension = path.posix.extname(item.asset ?? "").toLowerCase();
    if (![".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(extension)
      || (item.media_type === "gif" && extension !== ".gif") || !item.asset.startsWith("assets/")
      || item.asset.includes("\\") || item.asset.split("/").includes("..")) throw new Error("Chemin média invalide.");
    const image = `/imgflip/${item.sha256}${extension}`;
    cards.push({ id, number: approval.number, name: item.name, rarity: approval.rarity, image,
      popularityRank: item.rank, sourceRank: item.source_rank ?? item.rank,
      top: "", bottom: "", flavor: "", credit: personal ? "Imgflip — droits non vérifiés" : rights.owner.trim(), year: null, fullArt: false, retired: false,
      sourceName: "Imgflip", sourceUrl: `https://imgflip.com/memetemplate/${item.key.slice(8)}`,
      rights: { reviewedAt: rights.reviewedAt, redistribute: !personal, modify: !personal, sourceSha256: item.source_sha256, status: personal ? "unverified" : "declared", evidenceUrl: rights.evidenceUrl, note: rights.note }, mediaType: item.media_type });
    if (typeof item.original_asset !== "string" || !item.original_asset.startsWith("assets/")
      || item.original_asset.includes("\\") || item.original_asset.split("/").includes("..")) throw new Error("Original absent ou hors du bundle.");
    assets.push({ source: item.asset, original: item.original_asset, image, sha256: item.sha256, sourceSha256: item.source_sha256 });
  }
  if ([...decisions.keys()].some(key => !keys.has(key))) throw new Error("Validation pour un modèle absent du bundle.");
  const merged = new Map(existing.map(card => [card.id, card]));
  for (const card of cards) merged.set(card.id, card);
  const migration = "-- creatordeck-deploy: manual\n-- Valider les droits et la cible avant toute application.\nBEGIN;\n"
    + cards.map(card => `INSERT INTO public.meme_catalog(id,title,rarity,full_art,pullable) VALUES (${sql(card.id)},${sql(card.name)},${sql(card.rarity)},false,true) ON CONFLICT(id) DO UPDATE SET title=excluded.title,rarity=excluded.rarity;`).join("\n") + "\nCOMMIT;\n";
  return { cards: [...merged.values()], assets, migration, approved: cards.length, blocked: bundle.cards.length - cards.length };
}

async function main() {
  const args = process.argv.slice(2);
  const option = name => args.includes(name) ? args[args.indexOf(name) + 1] : null;
  const filename = option("--bundle");
  if (!filename) throw new Error("Utilisation : node scripts/import-imgflip.mjs --bundle CHEMIN [--ranked | --approvals CHEMIN] [--write]");
  const bundlePath = await realpath(filename), directory = path.dirname(bundlePath);
  const bundle = JSON.parse(await readFile(bundlePath, "utf8"));
  let approvals = option("--approvals") ? JSON.parse(await readFile(option("--approvals"), "utf8")) : [];
  const catalogPath = path.join(root, "src/data/imgflip.json");
  const existing = JSON.parse(await readFile(catalogPath, "utf8"));
  const fr = JSON.parse(await readFile(path.join(root, "src/data/memes-fr.json"), "utf8"));
  if (args.includes("--ranked")) approvals = personalApprovals(bundle, [...fr, ...existing]);
  const prepared = prepareCatalog(bundle, approvals, [...fr, ...existing]);
  let totalBytes = 0;
  for (const asset of prepared.assets) {
    const source = await realpath(path.resolve(directory, asset.source));
    if (!source.startsWith(directory + path.sep)) throw new Error("Média hors du bundle.");
    const bytes = await readFile(source);
    totalBytes += bytes.length;
    if (totalBytes > 2 * 1024 ** 3) throw new Error("Médias > 2 Gio : conserver les originaux hors dépôt et préparer des dérivés.");
    if (bytes.length > 25 * 1024 * 1024 || hash(bytes) !== asset.sha256) throw new Error("Empreinte ou taille média invalide.");
    const original = await realpath(path.resolve(directory, asset.original));
    if (!original.startsWith(directory + path.sep)) throw new Error("Original hors du bundle.");
    const originalBytes = await readFile(original);
    if (originalBytes.length > 25 * 1024 * 1024 || hash(originalBytes) !== asset.sourceSha256) throw new Error("Empreinte originale invalide.");
    asset.source = source;
  }
  if (args.includes("--write")) {
    if (!prepared.approved) throw new Error("Aucun modèle autorisé : aucun fichier modifié.");
    await mkdir(path.join(root, "public/imgflip"), { recursive: true });
    for (const asset of prepared.assets) await copyFile(asset.source, path.join(root, "public", asset.image));
    await writeFile(path.join(root, "src/data/imgflip-approvals.json"), JSON.stringify(approvals, null, 2) + "\n");
    await writeFile(path.join(root, "src/data/imgflip-exclusions.json"), JSON.stringify(bundle.exclusions ?? bundle.cards.filter(item => item.blocked === true), null, 2) + "\n");
    const temporary = catalogPath + ".tmp";
    await writeFile(temporary, JSON.stringify(prepared.cards.filter(card => card.id.startsWith("imgflip-"))) + "\n");
    await rename(temporary, catalogPath);
  }
  console.log(JSON.stringify({ approved: prepared.approved, blocked: prepared.blocked, excluded: bundle.exclusions?.length ?? prepared.blocked, bytes: totalBytes, written: args.includes("--write"), databaseApplied: false }));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => { console.error(error.message); process.exitCode = 1; });
