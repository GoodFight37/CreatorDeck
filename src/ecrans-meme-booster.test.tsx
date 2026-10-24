import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { creerBanc, type Banc } from "@/ecrans-banc";
import { useMemeBooster } from "@/hooks/use-meme-booster";
import { MEME_CARDS } from "@/lib/memes";

const { identity, statusRpc, drawRpc } = vi.hoisted(() => ({
  identity: { userId: "compte-a" }, statusRpc: vi.fn(), drawRpc: vi.fn(),
}));
vi.mock("@/hooks/use-cloud", () => ({ useCloud: () => ({ configured: true, userId: identity.userId }) }));
vi.mock("@/lib/cloud/cloud-store", () => ({ cloudStore: { getSnapshot: () => ({ userId: identity.userId }) } }));
vi.mock("@/lib/cloud/config", () => ({ cloudConfig: () => ({ url: "https://example.invalid", anonKey: "test" }) }));
vi.mock("@/lib/cloud/api", () => ({
  CloudApi: class { session() { return { userId: identity.userId }; } memeStatus = statusRpc; openMemePack = drawRpc; },
  CloudError: class extends Error { status = 0; },
}));
const ids = MEME_CARDS.filter((card) => card.image).slice(0, 5).map((card) => card.id);
const initial = { stock: 4, nextAt: null, openings: 0, owned: [] };
const result = { cards: ids, stock: 3, nextAt: null, replayed: false };

function Harness() {
  const b = useMemeBooster();
  return <div><button onClick={b.prepare}>Préparer</button>
    <button onClick={b.cancel}>Retour</button>
    <button onClick={b.leavePending}>Quitter l’attente</button>
    <button onClick={() => void b.commit()} disabled={!b.prepared}>Valider</button>
    <output data-stock={b.status?.stock} data-copies={b.copies.size} data-result={b.opening?.cards.length ?? 0}
      data-prepared={b.prepared} data-busy={b.busy}>{b.problem}{b.notice}</output>
  </div>;
}
describe("préparation et tirage MEMES partagés", () => {
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
    expect(window.localStorage.getItem("creatordeck.meme.pending:compte-a")).toBeNull();
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
    const key = window.localStorage.getItem("creatordeck.meme.pending:compte-a");
    expect(key).toBeTruthy();
    banc.appuyer("Préparer"); await act(async () => banc.appuyer("Valider"));
    expect(drawRpc.mock.calls.map((args) => args[0])).toEqual([key, key]);
    expect(window.localStorage.getItem("creatordeck.meme.pending:compte-a")).toBeNull();
  });

  it("un rafraîchissement refusé après le tirage conserve les cinq cartes à révéler", async () => {
    statusRpc.mockResolvedValueOnce(initial).mockRejectedValueOnce(new Error("Lecture indisponible"));
    await banc.monter(<Harness />); banc.appuyer("Préparer");
    await act(async () => banc.appuyer("Valider"));
    expect(output().getAttribute("data-result")).toBe("5");
    expect(output().getAttribute("data-stock")).toBe("3");
    expect(output().textContent).toContain("Lecture indisponible");
  });

  it("une ancienne lecture de réserve ne remplace pas le résultat du nouveau tirage", async () => {
    let oldRead!: (value: typeof initial) => void;
    statusRpc.mockResolvedValueOnce(initial)
      .mockImplementationOnce(() => new Promise((done) => { oldRead = done; }))
      .mockResolvedValue({ ...initial, stock: 3, owned: ids.map((id) => ({ id, copies: 1 })) });
    await banc.monter(<Harness />);
    act(() => window.dispatchEvent(new Event("online")));
    banc.appuyer("Préparer"); await act(async () => banc.appuyer("Valider"));
    await act(async () => oldRead(initial));
    expect(output().getAttribute("data-stock")).toBe("3");
    expect(output().getAttribute("data-copies")).toBe("5");
  });

  it("quitter l’attente laisse finir le même tirage et annonce les cartes obtenues", async () => {
    let resolve!: (value: typeof result) => void;
    drawRpc.mockImplementation(() => new Promise((done) => { resolve = done; }));
    await banc.monter(<Harness />); banc.appuyer("Préparer"); banc.appuyer("Valider");
    banc.appuyer("Quitter l’attente");
    expect(output().getAttribute("data-busy")).toBe("true");
    expect(output().textContent).toContain("Le tirage continue");
    banc.appuyer("Préparer");
    expect(output().getAttribute("data-prepared")).toBe("false");
    await act(async () => resolve(result));
    expect(drawRpc).toHaveBeenCalledOnce();
    expect(output().getAttribute("data-busy")).toBe("false");
    expect(output().textContent).toContain("Booster ouvert");
  });

  it("quitter après la réponse réussie annonce que les cartes sont déjà dans le classeur", async () => {
    let resolve!: (value: typeof result) => void;
    drawRpc.mockImplementation(() => new Promise((done) => { resolve = done; }));
    await banc.monter(<Harness />); banc.appuyer("Préparer"); banc.appuyer("Valider");
    await act(async () => resolve(result));
    expect(output().getAttribute("data-result")).toBe("5");
    banc.appuyer("Quitter l’attente");
    expect(output().textContent).toContain("Booster ouvert");
    expect(output().textContent).not.toContain("Le tirage continue");
  });

  it("écarte une réponse tardive après un changement de compte", async () => {
    let resolve!: (value: typeof result) => void;
    drawRpc.mockImplementation(() => new Promise((done) => { resolve = done; }));
    await banc.monter(<Harness />); banc.appuyer("Préparer"); banc.appuyer("Valider");
    identity.userId = "compte-b"; await banc.rendre(<Harness />);
    await act(async () => resolve(result));
    expect(output().getAttribute("data-result")).toBe("0");
    expect(output().getAttribute("data-copies")).toBe("0");
    expect(output().getAttribute("data-stock")).toBe("4");
    expect(output().getAttribute("data-busy")).toBe("false");
  });
});
