import assert from "node:assert/strict";
import test from "node:test";
import { assertPseudoDeTest, PSEUDO_MAX_CARACTERES } from "./fixture-pseudo.mjs";

test("accepte un pseudo de 24 caractères, refuse le 25e", () => {
  assert.equal(assertPseudoDeTest("a".repeat(PSEUDO_MAX_CARACTERES)), "a".repeat(PSEUDO_MAX_CARACTERES));
  assert.throws(() => assertPseudoDeTest("a".repeat(PSEUDO_MAX_CARACTERES + 1)), /pseudo de test trop long/);
});

test("compte les caractères, pas les unités UTF-16", () => {
  // Une lettre accentuée ou un emoji composé ne doit pas faire dépasser la limite à tort.
  assert.equal(assertPseudoDeTest("é".repeat(PSEUDO_MAX_CARACTERES)), "é".repeat(PSEUDO_MAX_CARACTERES));
  assert.throws(() => assertPseudoDeTest("😀".repeat(PSEUDO_MAX_CARACTERES + 1)), /trop long/);
});
