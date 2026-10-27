import { test } from "node:test";
import assert from "node:assert/strict";
import { preparerPcm } from "./prepare-audio.mjs";
test("le traitement retire le silence, borne les crêtes et ferme les extrémités", () => {
  const bytes = Buffer.alloc(44100 * 2);
  for (let i = 10000; i < 20000; i++) bytes.writeInt16LE(Math.round(20000 * Math.sin(i / 10)), i * 2);
  const { output, debut, fin } = preparerPcm(bytes, -25);
  assert(debut > .2 && fin > .5);
  assert.equal(output.readInt16LE(0), 0);
  assert.equal(output.readInt16LE(output.length - 2), 0);
  for (let i = 0; i < output.length; i += 2) assert(Math.abs(output.readInt16LE(i)) < 11630);
  assert.throws(() => preparerPcm(Buffer.alloc(100), -25), /silencieux/);
});
