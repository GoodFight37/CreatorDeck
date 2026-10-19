import test from "node:test";
import assert from "node:assert/strict";
import { waitForAndroidApp } from "./lib/android-app-ready.mjs";

test("Android readiness waits for the application marker instead of accepting the launch splash", async () => {
  let now = 0;
  let attempts = 0;
  const result = await waitForAndroidApp({
    probe: async () => ({ ready: ++attempts === 3, detail: "Navigation principale" }),
    timeoutMs: 100, intervalMs: 10, now: () => now,
    sleep: async ms => { now += ms; },
  });
  assert.equal(result.ready, true);
  assert.equal(result.elapsedMs, 20);
  assert.equal(attempts, 3);
});

test("Android readiness reports a timeout and the last observed UI state", async () => {
  let now = 0;
  const result = await waitForAndroidApp({
    probe: async () => ({ ready: false, detail: "WebView encore sur Chargement" }),
    timeoutMs: 25, intervalMs: 10, now: () => now,
    sleep: async ms => { now += ms; },
  });
  assert.equal(result.ready, false);
  assert.equal(result.elapsedMs, 30);
  assert.equal(result.lastDetail, "WebView encore sur Chargement");
});
