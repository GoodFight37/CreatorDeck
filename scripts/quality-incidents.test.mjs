import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { classifyQualityRun, recordConfirmedIncident } from "./lib/quality-incidents.mjs";

const failed = (name = "Navigateur mobile", detail = "Drop: bouton introuvable") => ({
  name, command: "npm run e2e", exitCode: 1, output: `Erreur: ${detail}`,
});
const passed = name => ({ name, command: "npm run e2e", exitCode: 0, output: "" });

test("un passage vert ne devient jamais un incident", () => {
  assert.deepEqual(classifyQualityRun([passed("Types")], []), { status: "passed", failedStages: [], retriedStageCount: 0 });
});

test("un échec corrigé à l'unique reprise est transitoire", () => {
  const result = classifyQualityRun([failed()], [passed("Navigateur mobile")]);
  assert.equal(result.status, "transient");
  assert.deepEqual(result.failedStages, []);
  assert.equal(result.retriedStageCount, 1);
});

test("un échec persistant est nouveau une seule fois et son rapport reste court et expurgé", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "creatordeck-incidents-"));
  try {
    const first = classifyQualityRun([failed("Navigateur mobile", "sélecteur X_SECRET=ne-pas-garder absent")],
      [failed("Navigateur mobile", "sélecteur X_SECRET=ne-pas-garder absent")]);
    assert.equal(first.status, "confirmed");
    const recorded = await recordConfirmedIncident({ directory, sha: "a".repeat(40), startedAt: "2026-10-19T12:00:00Z",
      failures: first.failures, resumeCommand: "npm run quality:mobile -- --full" });
    assert.equal(recorded.status, "confirmed-new");
    const packet = await readFile(recorded.resumePath, "utf8");
    assert.match(packet, /a{40}/);
    assert.match(packet, /npm run quality:mobile -- --full/);
    assert.match(packet, /codex exec --sandbox read-only/);
    assert.match(packet, /reports\/mobile-quality\/incidents\//);
    assert.doesNotMatch(packet, /ne-pas-garder/);

    const repeated = await recordConfirmedIncident({ directory, sha: "a".repeat(40), startedAt: "2026-10-19T13:00:00Z",
      failures: first.failures, resumeCommand: "npm run quality:mobile -- --full" });
    assert.equal(repeated.status, "confirmed-duplicate");
    const ledger = JSON.parse(await readFile(path.join(directory, "incidents.json"), "utf8"));
    assert.equal(ledger.incidents.length, 1);
    assert.equal(ledger.incidents[0].seenCount, 2);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
