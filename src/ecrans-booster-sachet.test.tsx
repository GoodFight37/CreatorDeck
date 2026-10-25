import { act } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { BoosterCarousel } from "@/components/booster-carousel";
import { creerBanc, type Banc } from "@/ecrans-banc";

/**
 * Le sachet du Drop penche sous la souris (008) : `transform` écrit sur
 * `.pack-3d-object`, position du reflet sur `.pack-holo`, et rien du tout quand
 * les reflets sont coupés.
 */
function Carrousel() {
  return <BoosterCarousel onPrepare={() => {}} disabled={false} canPrepare />;
}

function souris(cible: HTMLElement, x: number, y: number) {
  const event = new window.MouseEvent("pointermove", { bubbles: true, clientX: x, clientY: y });
  Object.defineProperty(event, "pointerType", { value: "mouse" });
  act(() => { cible.dispatchEvent(event); });
}

describe("sachet holographique du Drop", () => {
  let banc: Banc;
  beforeEach(() => {
    banc = creerBanc();
    banc.preparer();
    delete document.documentElement.dataset.cardFx;
  });
  afterEach(() => {
    banc.nettoyer();
    delete document.documentElement.dataset.cardFx;
  });

  it("incline le sachet et déplace le reflet sous la souris", async () => {
    await banc.monter(<Carrousel />);
    const bouton = document.querySelector<HTMLElement>('.booster-pack-slot[data-active="true"] button')!;
    const objet = bouton.querySelector<HTMLElement>(".pack-3d-object")!;
    const holo = bouton.querySelector<HTMLElement>(".pack-holo-film")!;
    expect(objet, "objet 3D absent").toBeTruthy();
    expect(holo, "reflet holographique absent").toBeTruthy();
    // jsdom ne fait aucune mise en page : on lui donne la boîte du sachet.
    bouton.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 300 }) as DOMRect;

    souris(bouton, 150, 60);
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 120)); });

    expect(objet.style.transform).toMatch(/^perspective\(1050px\) rotateX\(-?[\d.]+deg\) rotateY\(-?[\d.]+deg\) rotateZ\(1deg\)$/);
    // Le reflet glisse par transform, jamais par background-position (repeint à chaque image).
    expect(holo.style.transform).toMatch(/^translate\(-?[\d.]+%, -?[\d.]+%\)$/);
    expect(holo.style.backgroundPosition).toBe("");
  });

  it("ne touche à rien quand Reflets est coupé", async () => {
    document.documentElement.dataset.cardFx = "off";
    await banc.monter(<Carrousel />);
    const bouton = document.querySelector<HTMLElement>('.booster-pack-slot[data-active="true"] button')!;
    const objet = bouton.querySelector<HTMLElement>(".pack-3d-object")!;
    bouton.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 300 }) as DOMRect;

    souris(bouton, 150, 60);
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 120)); });

    expect(objet.style.transform).toBe("");
  });
});
