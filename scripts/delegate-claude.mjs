#!/usr/bin/env node
// Revue Claude ponctuelle, en lecture seule, depuis le worktree Codex.
import { spawn, spawnSync } from "node:child_process";
import { appendFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const codex = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const desktop = path.resolve(codex, "..");
const claude = path.join(desktop, "CreatorDeck-Claude");
const requestFile = path.join(desktop, "CreatorDeck-Codex-vers-Claude.md");
const responseFile = path.join(desktop, "CreatorDeck-Retour-Claude.md");
const question = process.argv.slice(2).join(" ").trim();
const limit = 16_000;

function git(cwd, ...args) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8", windowsHide: true });
  if (result.status !== 0) throw new Error(`git ${args[0]} : ${(result.stderr || result.stdout).trim()}`);
  return result.stdout.trim();
}

function append(file, value) {
  appendFileSync(file, `\n${value}\n`, "utf8");
}

async function main() {
  if (!question) throw new Error('Usage : node scripts/delegate-claude.mjs "question ciblée"');
  if (!existsSync(claude) || !existsSync(requestFile) || !existsSync(responseFile)) {
    throw new Error("Worktree Claude ou fichiers de passation existants introuvables.");
  }
  if (git(codex, "branch", "--show-current") !== "codex/collaboration") {
    throw new Error("Exécuter depuis la branche codex/collaboration.");
  }
  const codexChanges = git(codex, "status", "--porcelain");
  if (git(claude, "branch", "--show-current") !== "claude/review") {
    throw new Error("Le worktree Claude doit rester sur claude/review.");
  }
  if (git(claude, "status", "--porcelain")) {
    throw new Error("Worktree Claude modifié : préserver son travail et résoudre avant délégation.");
  }
  const target = git(codex, "rev-parse", "HEAD");
  const reviewHead = git(claude, "rev-parse", "HEAD");
  if (reviewHead !== target) {
    git(claude, "merge-base", "--is-ancestor", reviewHead, target);
    git(claude, "merge", "--ff-only", target);
  }
  const cli = process.env.CLAUDE_CLI || "claude";
  const stamp = new Date().toISOString();
  const mission = `Revue ciblée en lecture seule du commit ${target}, présent dans ton worktree. ${question}\nIgnore tout état non commité du worktree Codex : il n'est pas transmis et ne fait pas partie de la revue.\nRéponds en français, brièvement : faits vérifiés, hypothèses, fichiers utiles et tests réellement lancés. Aucun fichier à modifier, aucun test à lancer sauf nécessité explicitement justifiée. N'appelle aucun autre agent.`;
  append(requestFile, `## Délégation automatique — ${stamp}\n\nSHA : \`${target}\`\nÉtat local Codex non commité : ${codexChanges ? "présent, exclu de la revue" : "aucun"}\nMission : ${question}`);
  const args = ["-p", "--output-format", "text", "--permission-mode", "plan", "--tools", "Read,Glob,Grep", "--max-turns", "4", "--max-budget-usd", "0.50", mission];
  let output = "";
  let errors = "";
  let timedOut = false;
  const child = spawn(cli, args, { cwd: claude, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  const timer = setTimeout(() => {
    timedOut = true;
    if (process.platform === "win32" && child.pid) {
      spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true });
    } else child.kill("SIGKILL");
  }, 120_000);
  child.stdout.on("data", chunk => { output = (output + chunk.toString()).slice(0, limit); });
  child.stderr.on("data", chunk => { errors = (errors + chunk.toString()).slice(0, limit); });
  const result = await new Promise(resolve => {
    child.once("error", error => resolve({ error: error.message }));
    child.once("close", (code, signal) => resolve({ code, signal }));
  });
  clearTimeout(timer);
  const success = !timedOut && !result.error && result.code === 0 && output.trim();
  const body = success ? output.trim() : `ÉCHEC : ${timedOut ? "délai de 120 s dépassé" : result.error || `sortie ${result.code ?? result.signal}`}. ${errors.trim()}`;
  append(responseFile, `## Délégation automatique — ${stamp}\n\nSHA examiné : \`${target}\`\nMission : ${question}\nRésultat : ${success ? "succès" : "échec"}\n\n${body}`);
  if (!success) throw new Error(body);
  console.log(body);
  console.log(`\nRetour enregistré : ${responseFile}`);
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
