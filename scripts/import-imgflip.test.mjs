import { test } from "node:test";
import assert from "node:assert/strict";
import { prepareCatalog, personalApprovals } from "./import-imgflip.mjs";

const digest = "a".repeat(64);
const bundle = { schema: "creatordeck.templates.v1", cards: [{ key: "imgflip:42", name: "Template", media_type: "gif", asset: "assets/animation.gif", original_asset: "assets/animation.gif", sha256: digest, source_sha256: digest }] };
const approval = { key: "imgflip:42", sourceSha256: digest, number: 3000, rarity: "common", rights: { owner: "Fixture author", evidenceUrl: "https://example.invalid/license", note: "Test fixture permission only", redistribute: true, modify: true, reviewedAt: "2026-01-01" } };

test("le top 999 reçoit les raretés par rang, sans mythique ni preuve de droits inventée", () => {
  const ranked = { ...bundle, ranking: "api-image-then-public-top-30-days", cards: Array.from({ length: 999 }, (_, i) => ({ ...bundle.cards[0], key: `imgflip:${i + 1}`, rank: i + 1 })) };
  const approvals = personalApprovals(ranked, [{ id: "meme-fr", number: 2303 }]);
  const counts = Object.fromEntries(["legendary", "epic", "rare", "uncommon", "common"].map(rarity => [rarity, approvals.filter(item => item.rarity === rarity).length]));
  assert.deepEqual(counts, { legendary: 49, epic: 120, rare: 230, uncommon: 300, common: 300 });
  assert.equal(approvals[0].number, 2304);
  assert.equal(approvals[998].number, 3302);
  const plan = prepareCatalog(ranked, approvals);
  assert.equal(plan.approved, 999);
  assert.equal(plan.cards[0].rights.status, "unverified");
  assert.equal(plan.cards[0].rights.redistribute, false);
  assert.equal(plan.cards[0].rights.modify, false);
  assert.equal(plan.cards[0].credit, "Imgflip — droits non vérifiés");
  assert.throws(() => personalApprovals(bundle));
  assert.throws(() => personalApprovals({ ...ranked, cards: ranked.cards.toReversed() }));
  const withRefusal = { ...ranked, cards: ranked.cards.map(card => card.rank === 277 ? { ...card, blocked: true } : card) };
  const available = personalApprovals(withRefusal, [{ id: "meme-fr", number: 2303 }]);
  assert.equal(available.length, 998);
  assert.equal(available[276].number, 2581);
  assert.equal(available[276].rarity, "rare");
  assert.equal(prepareCatalog(withRefusal, available).blocked, 1);
});

test("unapproved templates never enter the game", () => {
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
