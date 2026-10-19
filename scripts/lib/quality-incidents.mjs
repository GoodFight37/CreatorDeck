import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

function shortDetail(stage) {
  const source = String(stage.output ?? stage.tests?.details?.join("\n") ?? "");
  const safe = source
    .replace(/\u001b\[[0-9;]*m/g, "")
    .replace(/\bBearer\s+[^\s"']+/gi, "Bearer [masqué]")
    .replace(/\b((?:[A-Z_]*KEY|[A-Z_]*TOKEN|[A-Z_]*SECRET|[A-Z_]*PASSWORD)\s*[=:]\s*)[^\s"']+/gi, "$1[masqué]")
    .replace(/\b[0-9a-f]{40}\b/gi, "[SHA]")
    .replace(/\b\d{4}-\d\d-\d\dT\S+/g, "[date]")
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);
  const relevant = safe.filter(line => /error|fail|assert|expect|timeout|not found|introuvable|échec|échoué|exception/i.test(line));
  return (relevant.length ? relevant : safe.slice(-3)).slice(-5).join("\n").slice(0, 700) || `Code de sortie ${stage.exitCode}.`;
}

function fingerprint(failure) {
  return createHash("sha256").update(`${failure.stage}\n${failure.command}\n${failure.detail.toLocaleLowerCase("fr")}`).digest("hex");
}

export function classifyQualityRun(firstStages, retryStages) {
  const failedFirst = firstStages.filter(stage => stage.exitCode !== 0);
  if (!failedFirst.length) return { status: "passed", failedStages: [], retriedStageCount: 0 };

  const retryByName = new Map(retryStages.map(stage => [stage.name, stage]));
  const persistent = failedFirst.flatMap(stage => {
    const retry = retryByName.get(stage.name);
    return !retry || retry.exitCode !== 0 ? [{
      stage: stage.name,
      command: stage.command,
      detail: shortDetail(retry && retry.exitCode !== 0 ? retry : stage),
    }] : [];
  });
  if (!persistent.length) return { status: "transient", failedStages: [], retriedStageCount: failedFirst.length };
  return { status: "confirmed", failures: persistent.map(failure => ({ ...failure, fingerprint: fingerprint(failure) })),
    failedStages: persistent.map(failure => failure.stage), retriedStageCount: failedFirst.length };
}

async function loadLedger(file) {
  try {
    const parsed = JSON.parse(await readFile(file, "utf8"));
    if (!Array.isArray(parsed.incidents)) throw new Error("Format de registre d'incidents invalide.");
    return parsed;
  } catch (error) {
    if (error.code === "ENOENT") return { version: 1, incidents: [] };
    throw error;
  }
}

async function saveLedger(file, ledger) {
  const temp = `${file}.${process.pid}.tmp`;
  await writeFile(temp, `${JSON.stringify(ledger, null, 2)}\n`, "utf8");
  // Windows may refuse rename-over-existing; the scheduled task is single-instance.
  await copyFile(temp, file);
  await rm(temp, { force: true });
}

function renderResume({ sha, startedAt, failures, resumeCommand, evidenceDir, resumeReference }) {
  return [
    "# Incident CreatorDeck — reprise Codex",
    "",
    `SHA testé : \`${sha}\``,
    `Premier constat : ${startedAt}`,
    `Commande de reproduction : \`${resumeCommand}\``,
    "",
    "Échecs confirmés après une reprise automatique :",
    ...failures.map(failure => `- ${failure.stage} · \`${failure.command}\` · ${failure.detail.replace(/\r?\n/g, " / ")}`),
    "",
    `Preuves locales : \`${evidenceDir}\` (captures/rapports peuvent contenir des données de test; ne pas les joindre intégralement sans les relire).`,
    "",
    "Reprise : ouvrir ce projet avec Codex, commencer par vérifier le SHA et les fichiers de preuve indiqués, reproduire l’échec, puis proposer un correctif isolé avec un test de régression.",
    `Diagnostic sans écriture : \`codex exec --sandbox read-only -C . "Lis ${resumeReference}, vérifie le SHA et les preuves, puis diagnostique sans modifier de fichier ni appeler un service externe."\``,
    "Aucun appel IA, aucune modification et aucune publication n’ont été déclenchés par le générateur de ce paquet.",
    "",
  ].join("\n");
}

export async function recordConfirmedIncident({ directory, sha, startedAt, failures, resumeCommand, evidenceDir = "test-results",
  displayDirectory = "reports/mobile-quality/incidents" }) {
  if (!/^[0-9a-f]{7,40}$/i.test(sha)) throw new Error("SHA d’incident invalide.");
  if (!failures?.length) throw new Error("Un incident confirmé doit contenir un échec.");
  await mkdir(directory, { recursive: true });
  const ledgerPath = path.join(directory, "incidents.json");
  const ledger = await loadLedger(ledgerPath);
  const keys = failures.map(failure => `${sha}:${failure.fingerprint}`);
  const existing = ledger.incidents.find(item => item.key === keys[0]);
  if (existing) {
    existing.seenCount += 1;
    existing.lastSeen = startedAt;
    await saveLedger(ledgerPath, ledger);
    return { status: "confirmed-duplicate", incidentId: existing.id, resumePath: existing.resumePath };
  }

  const id = `${sha.slice(0, 8)}-${failures[0].fingerprint.slice(0, 12)}`;
  const relative = path.join(id, "reprise.md");
  const resumePath = path.join(directory, relative);
  await mkdir(path.dirname(resumePath), { recursive: true });
  const resumeReference = path.posix.join(displayDirectory.replace(/\\/g, "/"), relative.replace(/\\/g, "/"));
  await writeFile(resumePath, renderResume({ sha, startedAt, failures, resumeCommand, evidenceDir, resumeReference }), "utf8");
  ledger.incidents.push({ id, key: keys[0], sha, fingerprint: failures[0].fingerprint, stage: failures[0].stage,
    detail: failures[0].detail, firstSeen: startedAt, lastSeen: startedAt, seenCount: 1, status: "confirmed", resumePath: relative });
  ledger.incidents = ledger.incidents.slice(-500);
  await saveLedger(ledgerPath, ledger);
  return { status: "confirmed-new", incidentId: id, resumePath };
}
