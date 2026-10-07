/**
 * Le geste d'ouverture : ce qui arme, ce qui n'arme pas.
 *
 * Le test qui compte le plus est celui de la **permissivité** : un geste lent
 * de 64 px doit ouvrir, et une chiquenaude de 30 px aussi. Un geste vers le bas
 * ne doit jamais armer — c'est ce qui laisse la page défiler sous le doigt.
 */
import { describe, expect, it } from "vitest";
import {
  PULL_DEAD_ZONE_PX,
  PULL_FLICK_MS,
  PULL_FLICK_PX,
  PULL_THRESHOLD_PX,
  PULL_VISUAL_MAX_PX,
  pullVerdict,
} from "@/lib/pull";

describe("le geste d'ouverture", () => {
  it("n'arme rien au repos", () => {
    const repos = pullVerdict(0, 0);
    expect(repos.armed).toBe(false);
    expect(repos.active).toBe(false);
    expect(repos.progress).toBe(0);
  });

  it("laisse passer un geste vers le bas sans rien armer", () => {
    expect(pullVerdict(-40, 500).armed).toBe(false);
    expect(pullVerdict(-40, 500).active).toBe(false);
  });

  it("ignore un tremblement dans la zone morte", () => {
    const tremble = pullVerdict(PULL_DEAD_ZONE_PX - 1, 10);
    expect(tremble.armed).toBe(false);
    expect(tremble.active).toBe(false);
  });

  it("arme un geste lent qui monte assez haut — sans se presser", () => {
    const lent = pullVerdict(PULL_THRESHOLD_PX, 1_500);
    expect(lent.armed).toBe(true);
    expect(lent.active).toBe(true);
  });

  it("arme une chiquenaude courte, même sous le seuil de distance", () => {
    const sec = pullVerdict(PULL_FLICK_PX, PULL_FLICK_MS - 40);
    expect(sec.armed).toBe(true);
  });

  it("n'arme pas une montée trop courte et trop lente", () => {
    const mou = pullVerdict(PULL_FLICK_PX - 2, PULL_FLICK_MS + 500);
    expect(mou.armed).toBe(false);
    expect(mou.active).toBe(true);
  });

  it("montre l'avancement en continu, et se bloque à fond", () => {
    expect(pullVerdict(PULL_VISUAL_MAX_PX / 2, 300).progress).toBeCloseTo(0.5, 2);
    expect(pullVerdict(PULL_VISUAL_MAX_PX * 2, 300).progress).toBe(1);
  });

  it("armé veut dire armé : à partir du seuil, ça ne se dé-arme plus", () => {
    // Le geste continue de monter : le verdict reste armé, quelle que soit la
    // durée écoulée depuis (un doigt qui s'arrête en haut reste un doigt qui a
    // tiré — c'est volontaire).
    expect(pullVerdict(PULL_THRESHOLD_PX + 20, 5_000).armed).toBe(true);
  });
});
