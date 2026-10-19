import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

test("une délégation Claude sans accord de coût s'arrête avant tout appel", () => {
  const script = fileURLToPath(new URL("./delegate-claude.mjs", import.meta.url));
  const env = { ...process.env };
  delete env.CREATORDECK_ALLOW_PAID_CLAUDE;
  const result = spawnSync(process.execPath, [script, "incident artificiel"], {
    encoding: "utf8", env, timeout: 5_000, windowsHide: true,
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Appel Claude désactivé/);
});
