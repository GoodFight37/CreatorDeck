import test from "node:test";
import assert from "node:assert/strict";
import { buildSummary, renderSummary, summarizePlaywright } from "./lib/mobile-quality-report.mjs";

test("un échec garde le SHA, la commande et une erreur courte sans divulguer la clé", () => {
  const summary = buildSummary({
    sha: "c4c458e", mode: "rapide", startedAt: "2026-10-18T10:00:00.000Z",
    stages: [{ name: "mobile", command: "npm run e2e", exitCode: 1, durationMs: 1200,
      output: "NEXT_PUBLIC_SUPABASE_ANON_KEY=cle-tres-secrete\nErreur utile\nBearer abc.def.ghi" }],
  });
  assert.equal(summary.ok, false);
  assert.equal(summary.sha, "c4c458e");
  const markdown = renderSummary(summary);
  assert.match(markdown, /npm run e2e/);
  assert.match(markdown, /Erreur utile/);
  assert.doesNotMatch(markdown, /cle-tres-secrete|abc\.def\.ghi/);
});

test("un rapport vert ne réclame aucune intervention et conserve les durées", () => {
  const summary = buildSummary({
    sha: "abc", mode: "rapide", startedAt: "2026-10-18T10:00:00.000Z",
    captures: ["captures/390-Drop.png"],
    stages: [{ name: "types", command: "npm run typecheck", exitCode: 0, durationMs: 3500, output: "ok" }],
  });
  assert.equal(summary.ok, true);
  assert.equal(summary.stages[0].durationMs, 3500);
  assert.match(renderSummary(summary), /Aucune intervention nécessaire/);
  assert.match(renderSummary(summary), /\[390-Drop\]\(captures\/390-Drop\.png\)/);
});

test("un échec Playwright remonte sa cause et le nombre de scénarios", () => {
  const report = { suites: [{ specs: [
    { title: "onglet tactile", tests: [{ results: [{ status: "failed", error: { message: "un portail masque le bouton" } }] }] },
    { title: "révélation", tests: [{ results: [{ status: "passed" }] }] },
  ] }] };
  assert.deepEqual(summarizePlaywright(report), {
    passed: 1, failed: 1, details: ["onglet tactile : un portail masque le bouton"],
  });
});

test("le résumé distingue une reprise transitoire et une reprise Codex persistante", () => {
  const transient = buildSummary({ sha: "abc", mode: "rapide", startedAt: "2026-10-19T10:00:00.000Z",
    classification: "transient", stages: [{ name: "mobile", command: "npm run e2e", exitCode: 0,
      initialExitCode: 1, retryCount: 1, durationMs: 100, output: "retry ok" }] });
  assert.match(renderSummary(transient), /transitoire/i);

  const confirmed = buildSummary({ sha: "abc", mode: "rapide", startedAt: "2026-10-19T10:00:00.000Z",
    classification: "confirmed", incident: { status: "confirmed-new", resumePath: "reports/incidents/reprise.md" },
    stages: [{ name: "mobile", command: "npm run e2e", exitCode: 1, initialExitCode: 1,
      retryCount: 1, durationMs: 100, output: "failure" }] });
  assert.match(renderSummary(confirmed), /Incident confirmé/);
  assert.match(renderSummary(confirmed), /reports\/incidents\/reprise\.md/);
});
