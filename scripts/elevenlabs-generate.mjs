/** Génération explicite, reprise sans doublon, journal de facturation sans secret. */
import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "dotenv";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const API = "https://api.elevenlabs.io";
const JOURNAL = path.join(ROOT, "docs/audio-generation-ledger.json");
export function construirePlan(briefs) {
  return [
    ...briefs.musique.directions.flatMap(d => Array.from({ length: d.variantes }, (_, i) => ({
      type: "musique", fichier: `public/music/candidates/${d.id}-v${i + 1}.mp3`,
      credits: Math.ceil(d.longueurMs / 60000 * briefs.credits.musiqueParMinute),
      corps: { prompt: d.prompt + ` Alternative arrangement ${i + 1}. Avoid: ${d.negativeStyles.join(", ")}.`, music_length_ms: d.longueurMs, model_id: briefs.musique.modele, force_instrumental: true },
      url: `${API}/v1/music?output_format=${briefs.musique.format}`,
    }))),
    ...briefs.effets.sons.flatMap(s => Array.from({ length: s.variantes }, (_, i) => ({
      type: "effet", fichier: `public/sfx/candidates/${s.nom}-v${i + 1}.mp3`,
      credits: Math.ceil(Math.max(briefs.credits.effetParGeneration, s.dureeSecondes * briefs.credits.effetParSeconde)),
      corps: { text: s.prompt, duration_seconds: s.dureeSecondes, loop: false, model_id: briefs.effets.modele, prompt_influence: 0.55 },
      url: `${API}/v1/sound-generation?output_format=${briefs.effets.format}`,
    }))),
  ];
}
export const estimerCredits = plan => plan.reduce((n, e) => n + e.credits, 0);

export function verifierBudget(journal, solde, estimation, budget) {
  if (!Number.isFinite(budget) || budget <= 0 || budget > 14000) throw Error("Budget requis, maximum autorisé 14000 crédits.");
  if (journal.appels.some(a => a.statut === "incertain")) throw Error("Appel incertain : rapprocher la facturation et le résultat avant toute reprise.");
  const consommation = journal.depart.character_count <= solde.character_count
    ? Math.max(solde.character_count - journal.depart.character_count, journal.appels.reduce((n, a) => n + (a.creditsObserves ?? 0), 0)) : NaN;
  const restant = solde.character_limit - journal.depart.character_count - consommation;
  if (!Number.isFinite(consommation) || consommation + estimation > budget || restant - estimation < journal.reserve) throw Error("Plafond du chantier ou réserve protégée dépassé : aucun appel.");
  if (solde.status !== "active" || solde.can_extend_character_limit || solde.allowed_to_extend_character_limit) throw Error("Compte inactif ou dépassement facturé activé : arrêt.");
  return consommation;
}

async function main() {
  const args = process.argv.slice(2);
  const option = name => args.includes(name) ? args[args.indexOf(name) + 1] : undefined;
  const budget = Number(option("--budget"));
  const briefs = JSON.parse(readFileSync(path.resolve(ROOT, option("--briefs") ?? "src/data/audio-briefs.json"), "utf8"));
  let plan = construirePlan(briefs);
  const only = option("--only");
  if (only && !["music", "Effets"].includes(only)) throw Error("--only music|Effets attendu.");
  if (only) plan = plan.filter(e => e.type === (only === "music" ? "musique" : "effet"));
  plan = plan.filter(e => !existsSync(path.join(ROOT, e.fichier)));
  const limite = Number(option("--limit") ?? plan.length);
  if (!Number.isInteger(limite) || limite < 0) throw Error("--limit entier positif attendu.");
  plan = plan.slice(0, limite);
  console.log(`${plan.length} fichiers manquants, provision prudente ${estimerCredits(plan)} crédits.`);
  if (!args.includes("--budget") || args.includes("--dry-run")) return;
  const keyFile = option("--key-file");
  const key = process.env.ELEVENLABS_API_KEY ?? (keyFile ? parse(readFileSync(keyFile)).ELEVENLABS_API_KEY : null);
  if (!key) throw Error("Clé absente ; aucun appel.");
  const headers = { "xi-api-key": key, "Content-Type": "application/json" };
  let dernierSolde = 0;
  async function solde() {
    await new Promise(resolve => setTimeout(resolve, Math.max(0, 3500 - (Date.now() - dernierSolde))));
    dernierSolde = Date.now();
    let r = await fetch(`${API}/v1/user/subscription`, { headers });
    if (r.status === 429) {
      await new Promise(resolve => setTimeout(resolve, 30000));
      r = await fetch(`${API}/v1/user/subscription`, { headers });
      dernierSolde = Date.now();
    }
    if (!r.ok) throw Error(`Solde inaccessible HTTP ${r.status} ; arrêt.`);
    const s = await r.json();
    return { character_count: s.character_count, character_limit: s.character_limit, status: s.status, tier: s.tier, can_extend_character_limit: s.can_extend_character_limit, allowed_to_extend_character_limit: s.allowed_to_extend_character_limit };
  }
  const depart = await solde();
  const journal = existsSync(JOURNAL) ? JSON.parse(readFileSync(JOURNAL, "utf8")) : { date: new Date().toISOString(), plafond: 14000, reserve: Math.max(24764, depart.character_limit - depart.character_count - 14000), depart, appels: [] };
  const sauver = () => writeFile(JOURNAL, JSON.stringify(journal, null, 2) + "\n");
  verifierBudget(journal, depart, estimerCredits(plan), budget);
  for (const etape of plan) {
    if (journal.appels.some(a => a.fichier === etape.fichier)) throw Error(`Appel déjà journalisé sans fichier : ${etape.fichier}. Vérification manuelle requise.`);
    const avant = await solde();
    const cumul = verifierBudget(journal, avant, etape.credits, budget);
    const appel = { fichier: etape.fichier, estimation: etape.credits, avant: avant.character_count, date: new Date().toISOString(), statut: "incertain" };
    journal.appels.push(appel);
    await sauver(); // Écrit avant le POST : une interruption ne doit jamais entraîner un second achat.
    console.log(`Prochain appel ${etape.fichier} : provision ${etape.credits}, consommation observée ${cumul}/${budget}.`);
    const r = await fetch(etape.url, { method: "POST", headers, body: JSON.stringify(etape.corps) });
    appel.http = r.status;
    appel.requestId = r.headers.get("request-id");
    appel.creditsEntete = r.headers.get("character-cost");
    if (r.ok) {
      const bytes = Buffer.from(await r.arrayBuffer());
      if (bytes.length < 100 || !r.headers.get("content-type")?.includes("audio")) throw Error("Réponse audio invalide : arrêt sans nouvel appel.");
      const cible = path.join(ROOT, etape.fichier);
      await mkdir(path.dirname(cible), { recursive: true });
      await writeFile(cible, bytes, { flag: "wx" });
      appel.octets = bytes.length;
    } else {
      const error = await r.json().catch(() => ({}));
      appel.refus = JSON.stringify(error).slice(0, 1500).replaceAll(key, "[secret]");
    }
    let apres = await solde();
    // Le compteur musique est différé ; seuls des GET sont réessayés, jamais le POST.
    for (let i = 0; r.ok && !appel.creditsEntete && apres.character_count === avant.character_count && i < 24; i++) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      apres = await solde();
    }
    appel.apres = apres.character_count;
    appel.deltaCompteur = apres.character_count - avant.character_count;
    const coutEntete = Number(appel.creditsEntete);
    appel.creditsObserves = Number.isFinite(coutEntete) && coutEntete > 0 ? coutEntete : Math.max(0, apres.character_count - journal.depart.character_count - journal.appels.reduce((n, a) => n + (a.creditsObserves ?? 0), 0));
    appel.sourceConsommation = coutEntete > 0 ? "character-cost" : "compteur";
    appel.soldeCompte = apres.character_limit - apres.character_count;
    appel.soldeRestant = apres.character_limit - journal.depart.character_count - Math.max(apres.character_count - journal.depart.character_count, journal.appels.reduce((n, a) => n + (a.creditsObserves ?? 0), 0));
    appel.statut = r.ok && appel.creditsObserves > 0 ? "obtenu" : !r.ok && r.status >= 400 && r.status < 500 && appel.creditsObserves === 0 ? "refuse" : "incertain";
    await sauver();
    console.log(`${appel.statut} HTTP ${r.status}, ${appel.creditsObserves} crédits observés ; solde ${appel.soldeRestant}.`);
    if (appel.statut !== "obtenu") throw Error(appel.refus ?? "Facturation incertaine : arrêt.");
    verifierBudget(journal, apres, 0, budget);
    if (appel.creditsObserves > etape.credits) throw Error("Coût réel supérieur à la provision : réviser les estimations avant de poursuivre.");
  }
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main().catch(e => { console.error(e.message); process.exitCode = 1; });
