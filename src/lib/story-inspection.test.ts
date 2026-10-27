import { describe, expect, it } from "vitest";
import { STORY_PROLOGUE } from "../data/story-prologue";
import { allStoryInspections, compareStoryEvidence, storyInspectionFor } from "./story-inspection";

describe("Dossiers d'inspection du mode Histoire", () => {
  it("chaque dossier correspond à une scène réelle et possède trois pièces distinctes", () => {
    const scenes = new Set(STORY_PROLOGUE.scenes.map(scene => scene.id));
    for (const entry of allStoryInspections()) {
      expect(scenes.has(entry.sceneId)).toBe(true);
      expect(entry.evidence).toHaveLength(3);
      const ids = entry.evidence.map(item => item.id);
      expect(new Set(ids).size).toBe(3);
      expect(new Set(entry.cluePair).size).toBe(2);
      expect(entry.cluePair.every(id => ids.includes(id))).toBe(true);
      expect(compareStoryEvidence(entry, entry.cluePair)?.spotted).toBe(true);
      expect(compareStoryEvidence(entry, [entry.cluePair[1], entry.cluePair[0]])?.spotted).toBe(true);
      expect(entry.evidence.some(item => !entry.cluePair.includes(item.id))).toBe(true);
    }
  });

  it("une comparaison erronée ne révèle pas l'indice et les sélections partielles ne révèlent rien", () => {
    const entry = allStoryInspections()[0];
    expect(compareStoryEvidence(entry, [])).toBeNull();
    expect(compareStoryEvidence(entry, ["offre"])).toBeNull();
    expect(compareStoryEvidence(entry, ["offre", "offre"])).toBeNull();
    expect(compareStoryEvidence(entry, ["n'importe quoi", "brief"])).toBeNull();
    const incorrect = compareStoryEvidence(entry, ["offre", "loyer"]);
    expect(incorrect?.spotted).toBe(false);
    expect(incorrect?.detail).not.toContain("La marque paie");
  });

  it("le premier mail de sponsor comporte un dossier, pas un live sans pièce", () => {
    expect(storyInspectionFor({ id: "premier_sponsor" })?.evidence).toHaveLength(3);
    expect(storyInspectionFor({ id: "studio" })).toBeNull();
  });
});
