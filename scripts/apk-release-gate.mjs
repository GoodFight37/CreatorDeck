import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

function trustedRun(run, sha, repository) {
  return run?.event === "push"
    && run.head_branch === "main"
    && run.head_sha === sha
    && run.conclusion === "success"
    && run.head_repository?.full_name === repository;
}

export function evaluateApkRelease({ eventName, ref, sha, repository, payload }) {
  if (!sha || !repository || !payload) return { allowed: false, reason: "Événement incomplet." };

  if (eventName === "workflow_run") {
    const run = payload.workflow_run;
    const allowed = ref === "refs/heads/main"
      && trustedRun(run, sha, repository);
    return { allowed, reason: allowed ? "Vérification main réussie pour ce SHA." : "La révision n'est pas une main vérifiée du dépôt." };
  }

  return { allowed: false, reason: `Événement non autorisé : ${eventName || "inconnu"}.` };
}

async function main() {
  const eventName = process.env.GITHUB_EVENT_NAME;
  const ref = process.env.GITHUB_REF;
  const repository = process.env.GITHUB_REPOSITORY;
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventName || !ref || !repository || !eventPath) throw new Error("Contexte GitHub Actions incomplet.");

  const payload = JSON.parse(await readFile(eventPath, "utf8"));
  const sha = eventName === "workflow_run" ? payload.workflow_run?.head_sha : process.env.GITHUB_SHA;
  if (!sha) throw new Error("SHA de la révision vérifiée absent.");
  const decision = evaluateApkRelease({ eventName, ref, sha, repository, payload });
  process.stdout.write(`${decision.allowed ? "AUTORISÉ" : "REFUSÉ"} : ${decision.reason}\n`);
  if (!decision.allowed) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
