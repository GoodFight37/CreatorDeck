import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { summarizePlaywright } from "./lib/mobile-quality-report.mjs";

function sanitize(value) {
  return String(value ?? "")
    .replace(/\bBearer\s+[^\s"']+/gi, "Bearer [masqué]")
    .replace(/\b((?:[A-Z_]*KEY|[A-Z_]*TOKEN|[A-Z_]*SECRET|[A-Z_]*PASSWORD)\s*[=:]\s*)[^\s"']+/gi, "$1[masqué]")
    .replace(/\b[0-9a-f]{40}\b/gi, "[SHA]")
    .replace(/[\r\n]+/g, " ")
    .slice(0, 500);
}

export function buildCiIncidentReport({ run = {}, jobs = {}, failedTests = [] }) {
  const failedJobs = Object.entries(jobs).filter(([, result]) => result === "failure").map(([name]) => name).sort();
  if (!failedJobs.length) return null;
  const sha = /^[0-9a-f]{7,40}$/i.test(run.sha ?? "") ? run.sha : "inconnu";
  const tests = [...new Set(failedTests.map(sanitize).filter(Boolean))].slice(0, 30);
  const fingerprint = createHash("sha256").update(`${failedJobs.join(",")}\n${tests.join("\n")}`).digest("hex").slice(0, 12);
  const repository = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(run.repository ?? "") ? run.repository : "repository-inconnu";
  return {
    id: `${sha}-${fingerprint}`,
    createdAt: new Date().toISOString(),
    run: {
      id: Number.isSafeInteger(Number(run.id)) ? Number(run.id) : null,
      attempt: Number.isSafeInteger(Number(run.attempt)) ? Number(run.attempt) : null,
      workflow: sanitize(run.workflow),
      event: sanitize(run.event),
      ref: sanitize(run.ref),
      sha,
      url: Number.isSafeInteger(Number(run.id)) ? `https://github.com/${repository}/actions/runs/${Number(run.id)}` : null,
    },
    failedJobs,
    failedTests: tests,
    automation: { aiCalls: 0, ticketsCreated: 0, retry: "à lancer via la reprise du run" },
  };
}

async function findTestFailures(directory) {
  const found = [];
  async function visit(current) {
    let entries;
    try { entries = await readdir(current, { withFileTypes: true }); }
    catch { return; }
    for (const entry of entries) {
      const file = path.join(current, entry.name);
      if (entry.isDirectory()) await visit(file);
      else if (entry.isFile() && ["results.json", "mobile-quality-results.json"].includes(entry.name)) {
        try {
          const report = JSON.parse(await readFile(file, "utf8"));
          found.push(...summarizePlaywright(report).details);
        } catch { /* Rapport absent/incomplet; les échecs de jobs restent consignés. */ }
      }
    }
  }
  await visit(directory);
  return found;
}

async function main() {
  const reportDirectory = path.resolve(process.argv[2] ?? "incident/playwright");
  const output = path.resolve(process.argv[3] ?? "incident/incident.json");
  let jobs;
  try { jobs = JSON.parse(process.env.CREATORDECK_JOBS ?? "{}"); }
  catch { throw new Error("CREATORDECK_JOBS doit être un objet JSON."); }
  const run = { id: process.env.GITHUB_RUN_ID, attempt: process.env.GITHUB_RUN_ATTEMPT,
    workflow: process.env.GITHUB_WORKFLOW, event: process.env.GITHUB_EVENT_NAME,
    ref: process.env.GITHUB_REF, sha: process.env.GITHUB_SHA, repository: process.env.GITHUB_REPOSITORY };
  const report = buildCiIncidentReport({ run, jobs, failedTests: await findTestFailures(reportDirectory) });
  if (!report) throw new Error("Aucun job en échec; aucun rapport d’incident ne doit être produit.");
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  process.stdout.write(`${output}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
