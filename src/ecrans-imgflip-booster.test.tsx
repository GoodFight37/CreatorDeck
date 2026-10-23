import { act, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { creerBanc, type Banc } from "@/ecrans-banc";
import { BoosterCarousel, type BoosterUniverse } from "@/components/booster-carousel";
import { useImgflipBooster } from "@/hooks/use-imgflip-booster";
import { drawImgflipPack } from "@/lib/imgflip-booster";

vi.mock("@/lib/imgflip-booster", async importOriginal => {
  const original = await importOriginal<typeof import("@/lib/imgflip-booster")>();
  return { ...original, drawImgflipPack: vi.fn(original.drawImgflipPack) };
});

function Harness() {
  const [universe, select] = useState<BoosterUniverse>("live");
  const booster = useImgflipBooster();
  return <><BoosterCarousel value={universe} onChange={select} disabled={false} canPrepare
    onPrepare={kind => { if (kind === "imgflip") booster.prepare(); }} />
    <button onClick={booster.commit}>Déchirer</button><button onClick={booster.cancel}>Annuler</button>
    <button onClick={booster.complete}>Extraire</button><button onClick={booster.close}>Fermer</button>
    <output data-prepared={booster.prepared} data-presenting={booster.presenting} data-extracted={booster.extracted}>
      {booster.opening?.cards.join(",")}
    </output></>;
}

describe("troisième sachet Imgflip", () => {
  let banc: Banc;
  beforeEach(() => { banc = creerBanc(); banc.preparer(); vi.clearAllMocks(); });
  afterEach(() => banc.nettoyer());
  it("place Imgflip après MEMES et garde un seul sachet accessible", async () => {
    await banc.monter(<Harness />);
    expect([...document.querySelectorAll("[data-booster]")].map(node => node.getAttribute("data-booster")))
      .toEqual(["live", "memes", "imgflip"]);
    banc.appuyer("IMGFLIP");
    expect(document.querySelector('[data-booster="imgflip"] img')?.getAttribute("src")).toContain("imgflip-opening.svg");
    expect(document.querySelectorAll('.booster-pack-slot button:not([inert])')).toHaveLength(1);
    expect(document.querySelector('.booster-carousel')?.getAttribute("data-universe")).toBe("imgflip");
    banc.appuyer("MEMES");
    expect(document.querySelector('.booster-carousel')?.getAttribute("data-universe")).toBe("memes");
    expect(drawImgflipPack).not.toHaveBeenCalled();
  });

  it("ne tire qu'à la déchirure, protège le double geste et ne sauvegarde rien", async () => {
    await banc.monter(<Harness />);
    banc.appuyer("IMGFLIP"); banc.appuyer("Ouvrir le booster IMGFLIP");
    expect(document.querySelector("output")?.getAttribute("data-prepared")).toBe("true");
    banc.appuyer("Annuler");
    expect(drawImgflipPack).not.toHaveBeenCalled();
    banc.appuyer("Ouvrir le booster IMGFLIP");
    const tear = banc.boutons().find(button => button.textContent === "Déchirer")!;
    act(() => { tear.click(); tear.click(); });
    expect(drawImgflipPack).toHaveBeenCalledOnce();
    const ids = document.querySelector("output")!.textContent!.split(",");
    expect(ids).toHaveLength(5);
    expect(ids.every(id => id.startsWith("imgflip-"))).toBe(true);
    banc.appuyer("Extraire");
    expect(document.querySelector("output")?.getAttribute("data-extracted")).toBe("true");
    banc.appuyer("Fermer");
    expect(document.querySelector("output")?.getAttribute("data-presenting")).toBe("false");
    expect(window.localStorage.length).toBe(0);
  });

  it("glisse de MEMES à IMGFLIP et résiste au bout du carrousel sans ouvrir", async () => {
    await banc.monter(<Harness />);
    banc.appuyer("MEMES");
    const stage = document.querySelector(".booster-carousel")!;
    function swipe(from: number, to: number) {
      act(() => {
        for (const [type, x] of [["pointerdown", from], ["pointermove", to], ["pointerup", to]] as const) {
          const event = new window.MouseEvent(type, { bubbles: true, clientX: x, clientY: 200, button: 0 });
          Object.defineProperty(event, "pointerId", { value: 1 });
          stage.dispatchEvent(event);
        }
      });
    }
    swipe(250, 100);
    expect(stage.getAttribute("data-universe")).toBe("imgflip");
    swipe(250, 100);
    expect(stage.getAttribute("data-universe")).toBe("imgflip");
    swipe(100, 250);
    expect(stage.getAttribute("data-universe")).toBe("memes");
    expect(drawImgflipPack).not.toHaveBeenCalled();
  });
});
