import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { creerBanc, type Banc } from "@/ecrans-banc";
import { BoosterCarousel } from "@/components/booster-carousel";
import { useImgflipBooster } from "@/hooks/use-imgflip-booster";
import { IMGFLIP_POOL } from "@/lib/imgflip-booster";
import { CloudError } from "@/lib/cloud/api";

const { identity, statusRpc, drawRpc } = vi.hoisted(() => ({
  identity: { userId: "compte-a" as string | null }, statusRpc: vi.fn(), drawRpc: vi.fn(),
}));
vi.mock("@/hooks/use-cloud", () => ({ useCloud: () => ({ configured: true, userId: identity.userId }) }));
vi.mock("@/lib/cloud/cloud-store", () => ({ cloudStore: { getSnapshot: () => ({ userId: identity.userId }) } }));
vi.mock("@/lib/cloud/config", () => ({ cloudConfig: () => ({ url: "https://example.invalid", anonKey: "test" }) }));
vi.mock("@/lib/cloud/api", () => ({
  CloudApi: class { session() { return { userId: identity.userId }; } imgflipStatus = statusRpc; openImgflipPack = drawRpc; },
  CloudError: class extends Error { status: number; constructor(message: string, _code?: string, status = 0) { super(message); this.status = status; } },
}));

const ids = IMGFLIP_POOL.slice(0, 5).map((card) => card.id);
const initial = { stock: 4, nextAt: null, openings: 0, owned: [] as { id: string; copies: number }[] };
const result = { cards: ids, stock: 3, nextAt: null, replayed: false };
const PENDING_KEY = "creatordeck.imgflip.pending:compte-a";

function Harness() {
  const b = useImgflipBooster();
  return <div><button onClick={b.prepare}>Préparer</button>
    <button onClick={b.cancel}>Retour</button>
    <button onClick={b.leavePending}>Quitter l’attente</button>
    <button onClick={() => void b.commit()} disabled={!b.prepared}>Valider</button>
    <output data-stock={b.status?.stock} data-copies={b.copies.size} data-result={b.opening?.cards.length ?? 0}
      data-prepared={b.prepared} data-busy={b.busy}>{b.problem}{b.notice}</output>
  </div>;
}

function CarouselHarness() {
  const onPrepare = vi.fn();
  return <div><BoosterCarousel onPrepare={onPrepare} disabled={false} canPrepare /></div>;
}

describe("le sachet du Drop n'a plus de carrousel d'univers", () => {
  let banc: Banc;
  beforeEach(() => { banc = creerBanc(); banc.preparer(); });
  afterEach(() => banc.nettoyer());

  it("ne montre que le sachet des créateurs", async () => {
    await banc.monter(<CarouselHarness />);
    expect([...document.querySelectorAll("[data-booster]")].map(node => node.getAttribute("data-booster")))
      .toEqual(["live"]);
    expect(document.querySelector('.booster-carousel')?.getAttribute("data-universe")).toBe("live");
    expect(document.querySelector(".booster-switcher")).toBeNull();
    expect(document.querySelectorAll(".booster-neighbor")).toHaveLength(0);
    expect(document.querySelector(".pack-stage img")?.getAttribute("src")).toContain("live-opening.webp");
  });

  it("un glissé ne change plus d'univers et n'ouvre rien", async () => {
    await banc.monter(<CarouselHarness />);
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
    swipe(250, 100);
    expect(stage.getAttribute("data-universe")).toBe("live");
    expect(document.querySelectorAll("[data-booster]")).toHaveLength(1);
  });
});

describe("troisième sachet Imgflip : tirage serveur (0062)", () => {
  let banc: Banc;
  beforeEach(() => {
    banc = creerBanc(); banc.preparer(); identity.userId = "compte-a"; vi.clearAllMocks();
    statusRpc.mockReset(); drawRpc.mockReset();
    statusRpc.mockResolvedValue(initial); drawRpc.mockResolvedValue(result);
  });
  afterEach(() => banc.nettoyer());
  const output = () => document.querySelector("output")!;

  it("préparer et revenir ne tire rien et ne crée pas de clé de tirage", async () => {
    await banc.monter(<Harness />);
    expect(output().getAttribute("data-stock")).toBe("4");
    banc.appuyer("Préparer"); expect(output().getAttribute("data-prepared")).toBe("true");
    banc.appuyer("Retour");
    expect(drawRpc).not.toHaveBeenCalled();
    expect(output().getAttribute("data-prepared")).toBe("false");
    expect(window.localStorage.getItem(PENDING_KEY)).toBeNull();
  });

  it("un double engagement n’envoie qu’un seul tirage et adopte la réserve serveur", async () => {
    statusRpc.mockResolvedValueOnce(initial).mockResolvedValue({ ...initial, stock: 3, owned: ids.map((id) => ({ id, copies: 1 })) });
    await banc.monter(<Harness />); banc.appuyer("Préparer");
    const button = banc.boutons().find((b) => b.textContent === "Valider")!;
    await act(async () => { button.click(); button.click(); });
    expect(drawRpc).toHaveBeenCalledOnce();
    expect(output().getAttribute("data-stock")).toBe("3");
    expect(output().getAttribute("data-copies")).toBe("5");
    expect(output().getAttribute("data-result")).toBe("5");
  });

  it("une réponse perdue reprend la même clé au prochain geste", async () => {
    drawRpc.mockRejectedValueOnce(new Error("Réponse perdue")).mockResolvedValueOnce(result);
    await banc.monter(<Harness />); banc.appuyer("Préparer");
    await act(async () => banc.appuyer("Valider"));
    expect(output().textContent).toContain("Réponse perdue");
    const key = window.localStorage.getItem(PENDING_KEY);
    expect(key).toBeTruthy();
    banc.appuyer("Préparer"); await act(async () => banc.appuyer("Valider"));
    expect(drawRpc.mock.calls.map((args) => args[0])).toEqual([key, key]);
    expect(window.localStorage.getItem(PENDING_KEY)).toBeNull();
  });

  it("un refus du serveur (4xx) efface la clé et affiche son message", async () => {
    const refus = new CloudError("Aucun booster Imgflip disponible pour le moment.", "refus_serveur", 400);
    drawRpc.mockRejectedValueOnce(refus);
    await banc.monter(<Harness />); banc.appuyer("Préparer");
    await act(async () => banc.appuyer("Valider"));
    expect(output().textContent).toContain("Aucun booster Imgflip disponible");
    expect(output().getAttribute("data-prepared")).toBe("false");
    expect(window.localStorage.getItem(PENDING_KEY)).toBeNull();
  });

  it("une carte hors catalogue Imgflip est refusée, rien n’est présenté", async () => {
    drawRpc.mockResolvedValueOnce({ ...result, cards: ["meme-hors-imgflip", ...ids.slice(1)] });
    await banc.monter(<Harness />); banc.appuyer("Préparer");
    await act(async () => banc.appuyer("Valider"));
    expect(output().getAttribute("data-result")).toBe("0");
    expect(output().textContent).toContain("manque au catalogue");
  });

  it("sans compte : pas de réserve lue, préparer ne fait rien", async () => {
    identity.userId = null;
    await banc.monter(<Harness />);
    expect(statusRpc).not.toHaveBeenCalled();
    banc.appuyer("Préparer");
    expect(output().getAttribute("data-prepared")).toBe("false");
    expect(drawRpc).not.toHaveBeenCalled();
  });
});
