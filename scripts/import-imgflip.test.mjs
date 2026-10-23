import { test } from "node:test";
import assert from "node:assert/strict";
import { prepareCatalog } from "./import-imgflip.mjs";

const digest = "a".repeat(64);
const bundle = { schema: "creatordeck.templates.v1", cards: [{ key: "imgflip:42", name: "Template", media_type: "gif", asset: "assets/animation.gif", original_asset: "assets/animation.gif", sha256: digest, source_sha256: digest }] };
const approval = { key: "imgflip:42", sourceSha256: digest, number: 3000, rarity: "common", rights: { owner: "Fixture author", evidenceUrl: "https://example.invalid/license", note: "Test fixture permission only", redistribute: true, modify: true, reviewedAt: "2026-01-01" } };

test("unverified templates never enter the game", () => {
  const plan = prepareCatalog(bundle, []);
  assert.equal(plan.cards.length, 0); assert.equal(plan.blocked, 1);
});
test("approved templates preserve existing cards and produce additive SQL", () => {
  const existing = [{ id: "existing", number: 1 }];
  const plan = prepareCatalog(bundle, [approval], existing);
  assert.equal(plan.cards[0], existing[0]);
  assert.equal(plan.cards[1].id, "imgflip-42");
  assert.match(plan.cards[1].image, /\.gif$/);
  assert.match(plan.migration, /ON CONFLICT/);
  assert.doesNotMatch(plan.migration, /DELETE|DROP|TRUNCATE/);
});
test("rights, paths, numbers and hashes cannot be silently guessed", () => {
  for (const invalid of [{ ...approval, sourceSha256: "bad" }, { ...approval, rarity: "popular" },
    { ...approval, rights: { ...approval.rights, redistribute: false } }, { ...approval, number: 1 }]) {
    assert.throws(() => prepareCatalog(bundle, [invalid], [{ id: "existing", number: 1 }]));
  }
  assert.throws(() => prepareCatalog({ ...bundle, cards: [{ ...bundle.cards[0], asset: "assets/../../secret.gif" }] }, [approval]));
  assert.throws(() => prepareCatalog({ ...bundle, cards: [...bundle.cards, ...bundle.cards] }, [approval]));
});
