import { act } from "react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { creerBanc, type Banc } from "@/ecrans-banc";
import { usePackOpening, type PackOpeningResult } from "@/hooks/use-pack-opening";
import { gameStore } from "@/lib/game-store";
import { cloudStore } from "@/lib/cloud/cloud-store";
import { TUTORIAL_PACK_KEY } from "@/lib/tutorial-pack";
const connection = { configured: true, userId: null as string | null };
vi.mock("@/hooks/use-cloud", () => ({ useCloud: () => connection }));
let result: PackOpeningResult | undefined;
function Harness() {
  const { openLivePack, tutorialAvailable } = usePackOpening(null);
  return <button onClick={async () => { result = await openLivePack(); }}>{tutorialAvailable ? "Essayer" : "Compte"}</button>;
}
describe("l’essai invité sans récompense ni repli cloud", () => {
  let banc: Banc;
  beforeEach(() => { banc = creerBanc(); banc.preparer(); connection.userId = null; result = undefined; vi.useFakeTimers(); });
  afterEach(() => { banc.nettoyer(); vi.useRealTimers(); vi.restoreAllMocks(); });
  it("montre cinq cartes, ne touche ni la partie ni le serveur, puis demande un compte", async () => {
    const local = vi.spyOn(gameStore, "openPack");
    const server = vi.spyOn(cloudStore, "openPack");
    await banc.monter(<Harness />);
    banc.appuyer("Essayer");
    await act(async () => { await vi.advanceTimersByTimeAsync(650); });
    expect(result?.status).toBe("drawn");
    if (result?.status === "drawn") {
      expect(result.tutorial).toBe(true);
      expect(result.cards).toHaveLength(5);
      expect(result.cards.at(-1)?.rarity).toBe("rare");
      expect(result.streakReward).toBeUndefined();
    }
    expect(local).not.toHaveBeenCalled();
    expect(server).not.toHaveBeenCalled();
    expect(window.localStorage.getItem(TUTORIAL_PACK_KEY)).toBe("1");
    banc.appuyer("Compte");
    await act(async () => { await Promise.resolve(); });
    expect(result?.status).toBe("refused");
  });
  it("tire l'essai invité dans « Mes chaînes » quand le joueur les a nommées, sans toucher ses cartes", async () => {
    const circle = ["kaicenat", "ibai", "ninja", "auronplay", "rubius", "xqc", "shroud"];
    window.localStorage.setItem("creatordeck.circle.v1", JSON.stringify({ v: 1, slugs: circle, at: 1 }));
    const local = vi.spyOn(gameStore, "openPack");
    await banc.monter(<Harness />);
    banc.appuyer("Essayer");
    await act(async () => { await vi.advanceTimersByTimeAsync(650); });
    expect(result?.status).toBe("drawn");
    if (result?.status === "drawn") {
      expect(result.cards).toHaveLength(5);
      expect(new Set(result.cards.map((card) => card.creatorSlug)).size).toBe(5);
      for (const card of result.cards) expect(circle).toContain(card.creatorSlug);
      // Affichée Rare ou mieux dans le cercle ; la rareté du catalogue reste inchangée.
      expect(["rare", "epic", "legendary"]).toContain(result.cards.at(-1)?.displayRarity);
    }
    expect(local).not.toHaveBeenCalled();
  });
  it("garde la limite après un rechargement", async () => {
    window.localStorage.setItem(TUTORIAL_PACK_KEY, "1");
    await banc.monter(<Harness />);
    banc.appuyer("Compte");
    await act(async () => { await Promise.resolve(); });
    expect(result?.status).toBe("refused");
  });
  it("un refus serveur avec compte ne se transforme jamais en essai local", async () => {
    connection.userId = "linked-account";
    vi.spyOn(cloudStore, "openPack").mockResolvedValue({ status: "unavailable", reason: "offline", message: "Réseau indisponible" });
    await banc.monter(<Harness />);
    banc.appuyer(/Essayer|Compte/);
    await act(async () => { await Promise.resolve(); });
    expect(result?.status).toBe("refused");
    expect(window.localStorage.getItem(TUTORIAL_PACK_KEY)).toBeNull();
  });
});
