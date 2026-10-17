import { describe, expect, it } from "vitest";
import { MEMES_UNLOCK_OPENINGS, memesUnlockLine, memesUnlocked } from "@/lib/memes-unlock";

describe("le booster MEMES derrière un seuil (D-141)", () => {
  it("sans cercle : rien ne change", () => {
    expect(memesUnlocked(false, 0)).toBe(true);
  });
  it("avec cercle : caché jusqu'au seuil, visible à partir du seuil", () => {
    expect(MEMES_UNLOCK_OPENINGS).toBe(10);
    expect(memesUnlocked(true, 9)).toBe(false);
    expect(memesUnlocked(true, 10)).toBe(true);
  });
  it("dit où en est le joueur, sans dépasser le seuil", () => {
    expect(memesUnlockLine(3)).toBe("Le booster MEMES arrive après 10 boosters ouverts (3/10).");
    expect(memesUnlockLine(42)).toContain("(10/10)");
    expect(memesUnlockLine(-1)).toContain("(0/10)");
  });
});
