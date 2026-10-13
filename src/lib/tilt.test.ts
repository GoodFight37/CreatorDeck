import { afterEach, describe, expect, it, vi } from "vitest";
import { applyTiltChoice, cardEffectsAllowed, setTiltEnabled, tiltEnabled } from "@/lib/tilt";

function fakeBrowser(reducedMotion = false) {
  const data = new Map<string, string>();
  const root = { dataset: {} as Record<string, string> };
  const browser = {
    localStorage: {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => { data.set(key, value); },
    },
    matchMedia: () => ({ matches: reducedMotion }),
  };
  vi.stubGlobal("window", browser);
  vi.stubGlobal("document", { documentElement: root });
  return { data, root };
}

afterEach(() => vi.unstubAllGlobals());

describe("réglage Reflets des cartes", () => {
  it("reste activé par défaut même si le système réduit le mouvement", () => {
    fakeBrowser();
    expect(tiltEnabled()).toBe(true);
    fakeBrowser(true);
    expect(tiltEnabled()).toBe(true);
  });

  it("mémorise le choix et l'applique au document", () => {
    const { data, root } = fakeBrowser();
    setTiltEnabled(false);
    expect(data.get("creatordeck.tilt")).toBe("off");
    expect(root.dataset.cardFx).toBe("off");
    setTiltEnabled(true);
    expect(data.get("creatordeck.tilt")).toBe("on");
    expect(root.dataset.cardFx).toBe("on");
  });

  it("applique le choix mémorisé et respecte le mouvement réduit", () => {
    const { data, root } = fakeBrowser(true);
    data.set("creatordeck.tilt", "on");
    applyTiltChoice();
    expect(root.dataset.cardFx).toBe("on");
    expect(cardEffectsAllowed()).toBe(false);
    data.set("creatordeck.tilt", "off");
    applyTiltChoice();
    expect(cardEffectsAllowed()).toBe(false);
  });
});
