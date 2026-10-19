#!/usr/bin/env node
// Contrôles locaux séquentiels : aucun appel IA, compte ni secret requis.
import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { copyFile, cp, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildSummary, renderSummary, summarizePlaywright } from "./lib/mobile-quality-report.mjs";
import { classifyQualityRun, recordConfirmedIncident } from "./lib/quality-incidents.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const full = process.argv.includes("--full");
const stages = [
  { name: "Orchestration autonome", args: ["run", "test:autonomy"] },
  ...(full ? [
    { name: "Unitaires", args: ["test", "--", "--maxWorkers=2"] },
    { name: "Écrans", args: ["run", "ecrans", "--", "--maxWorkers=2"] },
  ] : []),
  { name: "Types", args: ["run", "typecheck"] },
  { name: "Navigateur mobile", args: ["run", "e2e", "--", "--project=téléphone", ...(full ? [] : [
    "e2e/mobile-observation.spec.ts", "e2e/pack-tear.spec.ts", "e2e/product-audit.spec.ts", "--grep", "observation mobile|diagnostic mobile|compact sachet keeps|sons, musique et reflets actifs",
  ])] },
];
const maxOutput = 64_000;
const maxDurationMs = full ? 20 * 60_000 : 8 * 60_000;
const keptCaptures = new Set(["390-Drop", "390-Binder", "390-Atelier", "390-Toi", "sachet-ferme", "revelation"]);

async function archiveObservations(report, runDir, prefix = "") {
  const captures = [];
  const metrics = {};
  const outputRoot = path.join(root, "test-results") + path.sep;
  for (const suite of report.suites ?? []) for (const spec of suite.specs ?? []) {
    for (const item of spec.tests ?? []) for (const result of item.results ?? []) {
      for (const attachment of result.attachments ?? []) {
        if (keptCaptures.has(attachment.name) && attachment.path && attachment.contentType === "image/png") {
          const source = path.resolve(attachment.path);
          if (!source.toLowerCase().startsWith(outputRoot.toLowerCase())) continue;
          const target = path.join(runDir, "captures", `${prefix}${attachment.name}.png`);
          await mkdir(path.dirname(target), { recursive: true });
          await copyFile(source, target);
          const relative = `captures/${prefix}${attachment.name}.png`;
          if (!captures.includes(relative)) captures.push(relative);
        }
        if (/^(mesures-|fluidite-)/.test(attachment.name) && attachment.body) {
          try { metrics[attachment.name] = JSON.parse(Buffer.from(attachment.body, "base64").toString("utf8")); }
          catch { /* Une pièce jointe illisible n'invalide pas les tests. */ }
        }
      }
    }
  }
  if (Object.keys(metrics).length) await writeFile(path.join(runDir, "metrics.json"), `${JSON.stringify(metrics, null, 2)}\n`, "utf8");
  return { captures, metricsFile: Object.keys(metrics).length ? "metrics.json" : null };
}

async function preserveFailedBrowserEvidence(runDir) {
  const evidence = path.join(runDir, "premier-essai");
  for (const folder of ["test-results", "playwright-report"]) {
    const source = path.join(root, folder);
    if (existsSync(source)) await cp(source, path.join(evidence, folder), { recursive: true, force: true });
  }
  return path.relative(root, evidence).replace(/\\/g, "/");
}

async function collectPlaywright(result, runDir, prefix = "") {
  if (result.name !== "Navigateur mobile") return { captures: [], metricsFile: null };
  const json = path.join(root, "test-results", "mobile-quality-results.json");
  try {
    if ((await stat(json)).mtimeMs < result.startedAtMs - 1000) return { captures: [], metricsFile: null };
    const report = JSON.parse(await readFile(json, "utf8"));
    result.tests = summarizePlaywright(report);
    const artifacts = await archiveObservations(report, runDir, prefix);
    if (result.tests.failed) result.output += `\n${result.tests.details.join("\n")}`;
    return artifacts;
  } catch { return { captures: [], metricsFile: null }; }
}

function runStage(stage) {
  return new Promise((resolve) => {
    const start = Date.now();
    const command = stage.binary ?? "npm";
    const installedNpmCli = path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js");
    const npmCli = !stage.binary ? (process.env.npm_execpath || (existsSync(installedNpmCli) ? installedNpmCli : null)) : null;
    const executable = npmCli ? process.execPath : command;
    const args = npmCli ? [npmCli, ...stage.args] : stage.args;
    const child = spawn(executable, args, {
      cwd: root, windowsHide: true, shell: process.platform === "win32" && !npmCli && !stage.binary,
      env: { ...process.env, CREATORDECK_LOCAL_QUALITY: "1", CREATORDECK_BROWSER_CHANNEL: process.platform === "win32" ? "chrome" : "",
        NEXT_PUBLIC_SUPABASE_URL: "", NEXT_PUBLIC_SUPABASE_ANON_KEY: "", NEXT_TELEMETRY_DISABLED: "1" },
    });
    let output = "";
    let timedOut = false;
    const append = (chunk) => { output = (output + chunk.toString()).slice(-maxOutput); };
    child.stdout?.on("data", append);
    child.stderr?.on("data", append);
    const timer = setTimeout(() => {
      timedOut = true;
      if (process.platform === "win32" && child.pid) {
        spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true });
      } else child.kill("SIGKILL");
    }, maxDurationMs);
    let settled = false;
    const finish = (exitCode, extra = "") => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ name: stage.name, command: `${command} ${stage.args.join(" ")}`, exitCode, durationMs: Date.now() - start, startedAtMs: start,
        output: `${output}\n${extra || (timedOut ? "Délai dépassé." : "")}` });
    };
    child.once("error", (error) => finish(1, error.message));
    child.once("close", (code) => finish(timedOut ? 124 : code ?? 1));
  });
}

async function main() {
  const startedAt = new Date().toISOString();
  const git = spawnSync("git", ["-c", `safe.directory=${root.replace(/\\/g, "/")}`, "rev-parse", "HEAD"],
    { cwd: root, encoding: "utf8", windowsHide: true });
  const sha = git.status === 0 ? git.stdout.trim() : "SHA indisponible";
  const runDir = path.join(root, "reports", "mobile-quality", `${startedAt.replace(/[:.]/g, "-")}-${sha.slice(0, 8)}`);
  await mkdir(runDir, { recursive: true });
  const results = [];
  const initialResults = [];
  const retryResults = [];
  let artifacts = { captures: [], metricsFile: null };
  for (const stage of stages) {
    process.stdout.write(`${stage.name}…\n`);
    const first = await runStage(stage);
    initialResults.push(first);
    const firstArtifacts = await collectPlaywright(first, runDir,
      first.exitCode === 0 ? "" : "premier-essai-");
    artifacts.captures.push(...firstArtifacts.captures);
    if (firstArtifacts.metricsFile) artifacts.metricsFile = firstArtifacts.metricsFile;

    let result = first;
    if (first.exitCode !== 0) {
      const preserved = stage.name === "Navigateur mobile" ? await preserveFailedBrowserEvidence(runDir) : null;
      process.stdout.write(`${stage.name} : reprise unique après échec…\n`);
      const retry = await runStage(stage);
      retryResults.push(retry);
      const retryArtifacts = await collectPlaywright(retry, runDir, "reprise-");
      artifacts.captures.push(...retryArtifacts.captures);
      if (retryArtifacts.metricsFile) artifacts.metricsFile = retryArtifacts.metricsFile;
      result = { ...retry, initialExitCode: first.exitCode, retryCount: 1,
        initialOutput: first.output, evidenceDir: preserved,
        output: `Premier essai (code ${first.exitCode}):\n${first.output}\nReprise (code ${retry.exitCode}):\n${retry.output}` };
    } else {
      retryResults.push({ name: first.name, command: first.command, exitCode: 0, output: "" });
    }
    results.push(result);
    process.stdout.write(`${result.exitCode === 0 ? "OK" : "ÉCHEC"} (${Math.round(result.durationMs / 1000)} s)\n`);
  }
  const classification = classifyQualityRun(initialResults, retryResults);
  let incident = null;
  if (classification.status === "confirmed") {
    incident = await recordConfirmedIncident({
      directory: path.join(root, "reports", "mobile-quality", "incidents"),
      sha,
      startedAt,
      failures: classification.failures,
      resumeCommand: full ? "npm run quality:mobile:full" : "npm run quality:mobile",
      evidenceDir: path.relative(root, runDir).replace(/\\/g, "/"),
    });
  }
  const summary = buildSummary({ sha, mode: full ? "complet" : "rapide", startedAt,
    stages: results, classification: classification.status, incident, ...artifacts });
  await writeFile(path.join(runDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  await writeFile(path.join(runDir, "summary.md"), renderSummary(summary), "utf8");
  process.stdout.write(`${path.join(runDir, "summary.md")}\n`);
  process.exitCode = summary.ok ? 0 : 1;
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
