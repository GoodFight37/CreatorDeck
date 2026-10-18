import { describe, expect, it } from "vitest";
import { decideCircleSync } from "@/lib/circle-sync";

const A = ["kaicenat", "ibai", "ninja", "auronplay", "rubius"];
const B = ["xqc", "shroud", "ibai", "ninja", "rubius"];
const NOW = 1_800_000_000_000;

describe("D-143 : synchroniser le cercle entre l'appareil et le compte", () => {
  it("rien en ligne : on envoie le cercle de l'appareil", () => {
    expect(decideCircleSync({ slugs: A, savedAt: 1 }, null, NOW)).toEqual({ kind: "push", slugs: A });
  });
  it("rien sur l'appareil : on reprend celui du compte, avec sa date", () => {
    expect(decideCircleSync({ slugs: [], savedAt: null }, { slugs: B, updatedAt: 42 }, NOW)).toEqual({ kind: "adopt", slugs: B, at: 42 });
  });
  it("identiques : rien à faire", () => {
    expect(decideCircleSync({ slugs: A, savedAt: 5 }, { slugs: [...A], updatedAt: 9 }, NOW)).toEqual({ kind: "nothing" });
  });
  it("différents : le plus récent gagne", () => {
    expect(decideCircleSync({ slugs: A, savedAt: 20 }, { slugs: B, updatedAt: 10 }, NOW)).toEqual({ kind: "push", slugs: A });
    expect(decideCircleSync({ slugs: A, savedAt: 10 }, { slugs: B, updatedAt: 20 }, NOW)).toEqual({ kind: "adopt", slugs: B, at: 20 });
  });
  it("l'ordre compte : la préférée a changé, c'est un autre cercle", () => {
    const reordered = [A[1], A[0], ...A.slice(2)];
    expect(decideCircleSync({ slugs: reordered, savedAt: 30 }, { slugs: A, updatedAt: 10 }, NOW).kind).toBe("push");
  });
  it("sans date sur l'appareil, le compte gagne", () => {
    expect(decideCircleSync({ slugs: A, savedAt: null }, { slugs: B, updatedAt: 10 }, NOW).kind).toBe("adopt");
  });
  it("un cercle invalide en ligne n'est jamais recopié", () => {
    expect(decideCircleSync({ slugs: A, savedAt: 1 }, { slugs: ["ibai", "ibai"], updatedAt: 99 }, NOW)).toEqual({ kind: "push", slugs: A });
    expect(decideCircleSync({ slugs: [], savedAt: null }, { slugs: ["ibai", "ibai"], updatedAt: 99 }, NOW)).toEqual({ kind: "nothing" });
  });

  it("0058 : une seule chaîne est un cercle ; un cercle vide ne vide jamais le compte", () => {
    expect(decideCircleSync({ slugs: [], savedAt: null }, { slugs: ["ibai"], updatedAt: 99 }, NOW)).toEqual({ kind: "adopt", slugs: ["ibai"], at: 99 });
    expect(decideCircleSync({ slugs: [], savedAt: 500 }, { slugs: A, updatedAt: 99 }, NOW)).toEqual({ kind: "adopt", slugs: A, at: 99 });
    expect(decideCircleSync({ slugs: [], savedAt: 500 }, null, NOW)).toEqual({ kind: "nothing" });
  });
});
