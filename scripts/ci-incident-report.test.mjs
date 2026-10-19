import test from "node:test";
import assert from "node:assert/strict";
import { buildCiIncidentReport } from "./ci-incident-report.mjs";

test("CI success produces no incident packet", () => {
  assert.equal(buildCiIncidentReport({ jobs: { quality: "success", supabase: "success", navigateur: "success" } }), null);
});

test("CI failure report identifies run, exact SHA, failed jobs, and sanitized test names", () => {
  const report = buildCiIncidentReport({
    run: { id: 12345, attempt: 2, workflow: "Vérification", event: "pull_request", ref: "refs/pull/17/merge",
      sha: "a".repeat(40), repository: "GoodFight37/CreatorDeck" },
    jobs: { quality: "success", supabase: "failure", navigateur: "failure", "navigateur-cloud": "success" },
    failedTests: ["navigateur 2 : bouton introuvable", "cloud : clé TOKEN=ne-pas-garder"],
  });
  assert.match(report.id, /^a{40}-/);
  assert.deepEqual(report.failedJobs, ["navigateur", "supabase"]);
  assert.deepEqual(report.failedTests, ["navigateur 2 : bouton introuvable", "cloud : clé TOKEN=[masqué]"]);
  assert.equal(report.run.url, "https://github.com/GoodFight37/CreatorDeck/actions/runs/12345");
});
