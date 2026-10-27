import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { construirePlan, estimerCredits, verifierBudget } from "./elevenlabs-generate.mjs";

const briefs = JSON.parse(readFileSync(new URL("../src/data/audio-briefs.json", import.meta.url), "utf8"));

test("le plan couvre 3 directions × 2 variantes et les effets utiles", () => {
  const plan = construirePlan(briefs);
  const musique = plan.filter((etape) => etape.type === "musique");
  const effets = plan.filter((etape) => etape.type === "effet");
  assert.equal(musique.length, 6);
  assert.equal(effets.length, 36);
  for (const etape of musique) {
    assert.match(etape.fichier, /^public\/music\/candidates\/.+-v[12]\.mp3$/);
    assert.equal(etape.corps.force_instrumental, true);
    assert.ok(etape.corps.music_length_ms >= 30_000);
  }
  for (const etape of effets) {
    assert.match(etape.fichier, /^public\/sfx\/candidates\/.+-v[12]\.mp3$/);
    assert.equal(etape.corps.loop, false);
    assert.ok(etape.corps.duration_seconds >= 0.5);
  }
});

test("le budget cumulé protège la réserve, le plafond et les reprises incertaines", () => {
  const j = { depart: { character_count: 0 }, reserve: 24764, appels: [] };
  const s = { character_count: 0, character_limit: 38764, status: "active" };
  assert.equal(verifierBudget(j, s, 11040, 14000), 0);
  assert.throws(() => verifierBudget(j, { ...s, character_count: 13900 }, 200, 14000));
  assert.throws(() => verifierBudget(j, s, 1, 14001));
  assert.throws(() => verifierBudget({ ...j, appels: [{ statut: "incertain" }] }, s, 1, 14000));
  assert.throws(() => verifierBudget(j, { ...s, can_extend_character_limit: true }, 1, 14000));
  assert.ok(construirePlan(briefs).every(e => !("seed" in e.corps)));
});

test("l'estimation tient dans un mois Starter avec réserve", () => {
  const total = estimerCredits(construirePlan(briefs));
  assert.ok(total > 0);
  assert.ok(total <= briefs.credits.planStarterMensuel * 0.6, `${total} crédits estimés`);
});

test("aucun chemin du plan n'écrase un original du jeu", () => {
  for (const etape of construirePlan(briefs)) {
    assert.ok(etape.fichier.includes("/candidates/"), etape.fichier);
  }
});
