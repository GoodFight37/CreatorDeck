/**
 * Génère les candidats audio ElevenLabs depuis les briefs
 * (`src/data/audio-briefs.json`) vers `public/music/candidates/` et
 * `public/sfx/candidates/`. N'écrase jamais un fichier existant et ne
 * touche pas aux originaux du jeu.
 *
 * SÉCURITÉ :
 * - La clé se lit dans l'environnement (`ELEVENLABS_API_KEY`), jamais dans
 *   le code, jamais affichée, jamais journalisée.
 * - Par défaut : `--dry-run` (plan + estimation en crédits, aucun appel).
 * - Un appel réel exige en plus `--budget <crédits>` : le script refuse de
 *   démarrer si l'estimation dépasse le plafond donné.
 *
 * Usage :
 *   node scripts/elevenlabs-generate.mjs --dry-run
 *   ELEVENLABS_API_KEY=… node scripts/elevenlabs-generate.mjs --budget 14000 [--only music|Effets]
 *
 * Coûts (vérifiés en octobre 2026) : musique 900 crédits/minute, effet
 * 200 crédits/génération. Le plan complet tient dans un mois Starter
 * (30 000 crédits) avec une réserve pour une seconde passe.
 */
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const API = "https://api.elevenlabs.io";

export function construirePlan(briefs) {
  const plan = [];
  for (const direction of briefs.musique.directions) {
    for (let v = 1; v <= direction.variantes; v += 1) {
      plan.push({
        type: "musique",
        fichier: `public/music/candidates/${direction.id}-v${v}.mp3`,
        credits: Math.ceil((direction.longueurMs / 60_000) * briefs.credits.musiqueParMinute),
        corps: {
          prompt: direction.prompt,
          music_length_ms: direction.longueurMs,
          model_id: briefs.musique.modele,
          force_instrumental: true,
          seed: direction.seeds[v - 1],
        },
        url: `${API}/v1/music?output_format=${briefs.musique.format}`,
      });
    }
  }
  for (const son of briefs.effets.sons) {
    for (let v = 1; v <= son.variantes; v += 1) {
      plan.push({
        type: "effet",
        fichier: `public/sfx/candidates/${son.nom}-v${v}.wav`,
        credits: briefs.credits.effetParGeneration,
        corps: {
          text: son.prompt,
          duration_seconds: son.dureeSecondes,
          loop: false,
          model_id: briefs.effets.modele,
        },
        url: `${API}/v1/sound-generation?output_format=${briefs.effets.format}`,
      });
    }
  }
  return plan;
}

export function estimerCredits(plan) {
  return plan.reduce((total, etape) => total + etape.credits, 0);
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes("--budget");
  const indexBudget = args.indexOf("--budget");
  const budget = indexBudget >= 0 ? Number(args[indexBudget + 1]) : null;
  const indexOnly = args.indexOf("--only");
  const only = indexOnly >= 0 ? args[indexOnly + 1] : null;

  const briefs = JSON.parse(
    await import("node:fs/promises").then((fs) => fs.readFile(path.join(RACINE, "src/data/audio-briefs.json"), "utf8")),
  );
  let plan = construirePlan(briefs);
  if (only === "music") plan = plan.filter((etape) => etape.type === "musique");
  if (only === "Effets") plan = plan.filter((etape) => etape.type === "effet");
  const total = estimerCredits(plan);

  console.log(`Plan : ${plan.length} fichiers, estimation ${total} crédits.`);
  for (const etape of plan) {
    const deja = existsSync(path.join(RACINE, etape.fichier)) ? " (déjà présent, ignoré)" : "";
    console.log(` - [${etape.type}] ${etape.fichier} — ${etape.credits} crédits${deja}`);
  }

  if (dryRun) {
    console.log("\nMode --dry-run : aucun appel réseau. Pour générer : ELEVENLABS_API_KEY=… node scripts/elevenlabs-generate.mjs --budget <crédits>");
    return;
  }

  const restant = plan.filter((etape) => !existsSync(path.join(RACINE, etape.fichier)));
  const coutReel = estimerCredits(restant);
  if (!Number.isFinite(budget) || budget <= 0) throw new Error("--budget <crédits> est requis et doit être positif.");
  if (coutReel > budget) {
    throw new Error(`Estimation des fichiers restants (${coutReel} crédits) supérieure au budget autorisé (${budget}). Rien n'a été généré.`);
  }
  const cle = process.env.ELEVENLABS_API_KEY;
  if (!cle) throw new Error("ELEVENLABS_API_KEY absente de l'environnement. Aucun appel effectué.");

  let consommes = 0;
  for (const etape of restant) {
    const reponse = await fetch(etape.url, {
      method: "POST",
      headers: { "xi-api-key": cle, "Content-Type": "application/json" },
      body: JSON.stringify(etape.corps),
    });
    if (!reponse.ok) {
      throw new Error(`Échec ${etape.fichier} : HTTP ${reponse.status}. Arrêt, les fichiers déjà écrits sont conservés.`);
    }
    const cible = path.join(RACINE, etape.fichier);
    await mkdir(path.dirname(cible), { recursive: true });
    await writeFile(cible, Buffer.from(await reponse.arrayBuffer()));
    consommes += etape.credits;
    console.log(`Écrit ${etape.fichier} (≈ ${etape.credits} crédits, cumul estimé ${consommes}/${coutReel})`);
  }
  console.log(`Terminé : ${restant.length} fichiers, ≈ ${consommes} crédits estimés.`);
  console.log("Prochaine étape : écouter dans le laboratoire (/audio-lab), choisir, puis seulement intégrer les fichiers validés.");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
