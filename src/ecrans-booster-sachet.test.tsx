import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BoosterCarousel, PackArtwork } from "@/components/booster-carousel";
import { creerBanc, type Banc } from "@/ecrans-banc";

/**
 * Le sachet du Drop penche sous la souris (008) : `transform` écrit sur
 * `.pack-3d-object`, position du reflet sur `.pack-holo`, et rien du tout quand
 * les reflets sont coupés.
 */
function Carrousel() {
  return <BoosterCarousel value="live" onChange={() => {}} onPrepare={() => {}} disabled={false} canPrepare />;
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

  it("valide le tap tactile une seule fois et distingue glissé, annulation et clavier", async () => {
    const open = vi.fn();
    await banc.monter(<PackArtwork disabled={false} onClick={open} />);
    const button = document.querySelector("button")!;
    const pointer = (type: string, x = 10, primary = true) => {
      const event = new window.MouseEvent(type, { bubbles: true, button: 0, clientX: x, clientY: 10 });
      Object.defineProperties(event, { pointerType: { value: "touch" }, isPrimary: { value: primary } });
      act(() => { button.dispatchEvent(event); });
    };
    const compatibilityClick = () => act(() => { button.dispatchEvent(new window.MouseEvent("click", { bubbles: true, detail: 1 })); });

    pointer("pointerdown"); pointer("pointerup"); compatibilityClick();
    expect(open).toHaveBeenCalledTimes(1);
    pointer("pointerdown"); pointer("pointermove", 50); pointer("pointerup", 50); compatibilityClick();
    expect(open).toHaveBeenCalledTimes(1);
    pointer("pointerdown"); pointer("pointercancel"); pointer("pointerup"); compatibilityClick();
    expect(open).toHaveBeenCalledTimes(1);
    pointer("pointerdown"); pointer("pointerdown", 20, false); pointer("pointerup"); compatibilityClick();
    expect(open).toHaveBeenCalledTimes(1);
    pointer("pointerdown"); pointer("pointerup"); compatibilityClick();
    expect(open).toHaveBeenCalledTimes(2);
    act(() => { button.click(); });
    expect(open).toHaveBeenCalledTimes(3);
  });
});
