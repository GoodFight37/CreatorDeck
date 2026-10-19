import test from "node:test";
import assert from "node:assert/strict";
import { evaluateApkRelease } from "./apk-release-gate.mjs";

const verification = (overrides = {}) => ({
  event: "push", head_branch: "main", head_sha: "a".repeat(40), conclusion: "success",
  head_repository: { full_name: "GoodFight37/CreatorDeck" }, ...overrides,
});

test("automatic publication accepts only a successful same-repository main push", () => {
  const payload = { workflow_run: {
    event: "push", head_branch: "main", head_sha: "a".repeat(40), conclusion: "success",
    head_repository: { full_name: "GoodFight37/CreatorDeck" },
  } };
  assert.equal(evaluateApkRelease({ eventName: "workflow_run", ref: "refs/heads/main", sha: "a".repeat(40),
    repository: "GoodFight37/CreatorDeck", payload }).allowed, true);
  for (const patch of [
    { conclusion: "failure" }, { event: "pull_request" }, { head_branch: "codex/branch" },
    { head_repository: { full_name: "fork/CreatorDeck" } },
  ]) {
    const rejected = evaluateApkRelease({ eventName: "workflow_run", ref: "refs/heads/main", sha: "a".repeat(40),
      repository: "GoodFight37/CreatorDeck", payload: { workflow_run: { ...payload.workflow_run, ...patch } } });
    assert.equal(rejected.allowed, false);
  }
});

test("manual dispatch cannot publish an APK, even if a caller supplies a successful run", () => {
  const result = evaluateApkRelease({ eventName: "workflow_dispatch", ref: "refs/heads/main", sha: "a".repeat(40),
    repository: "GoodFight37/CreatorDeck", payload: {}, verificationRuns: [verification()] });
  assert.equal(result.allowed, false);
});

test("an automatic publication requires a successful push of the same repository main SHA", () => {
  const base = { eventName: "workflow_dispatch", ref: "refs/heads/main", sha: "a".repeat(40),
    repository: "GoodFight37/CreatorDeck", payload: {} };
  for (const patch of [
    { conclusion: "failure" }, { event: "workflow_dispatch" }, { head_branch: "other" },
    { head_sha: "b".repeat(40) }, { head_repository: { full_name: "fork/CreatorDeck" } },
  ]) {
    const result = evaluateApkRelease({ ...base, verificationRuns: [verification(patch)] });
    assert.equal(result.allowed, false);
  }
});
