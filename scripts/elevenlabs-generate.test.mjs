import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { construirePlan, estimerCredits } from "./elevenlabs-generate.mjs";

const briefs = JSON.parse(readFileSync(new URL("../src/data/audio-briefs.json", import.meta.url), "utf8"));

test("le plan couvre 3 directions × 2 variantes et chaque effet × 3 variantes", () => {
  const plan = construirePlan(briefs);
  const musique = plan.filter((etape) => etape.type === "musique");
  const effets = plan.filter((etape) => etape.type === "effet");
  assert.equal(musique.length, 6);
  assert.equal(effets.length, briefs.effets.sons.length * 3);
  for (const etape of musique) {
    assert.match(etape.fichier, /^public\/music\/candidates\/.+-v[12]\.mp3$/);
    assert.equal(etape.corps.force_instrumental, true);
    assert.ok(etape.corps.music_length_ms >= 30_000);
  }
  for (const etape of effets) {
    assert.match(etape.fichier, /^public\/sfx\/candidates\/.+-v[123]\.wav$/);
    assert.equal(etape.corps.loop, false);
  }
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
