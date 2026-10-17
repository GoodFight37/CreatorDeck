import { act } from "react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { creerBanc, type Banc } from "@/ecrans-banc";
import { usePackOpening, type PackOpeningResult } from "@/hooks/use-pack-opening";
import { gameStore } from "@/lib/game-store";
import { cloudStore } from "@/lib/cloud/cloud-store";
const connection = { configured: true, userId: null as string | null };
vi.mock("@/hooks/use-cloud", () => ({ useCloud: () => connection }));
let result: PackOpeningResult | undefined;
function Harness() {
  const { openLivePack, tutorialAvailable } = usePackOpening(null);
  return <button onClick={async () => { result = await openLivePack(); }}>{tutorialAvailable ? "Essayer" : "Compte"}</button>;
}
// Fichier à part : le marqueur « essai déjà consommé » vit dans le module pour la session.
describe("l’essai invité tiré dans « Mes chaînes »", () => {
  let banc: Banc;
  beforeEach(() => { banc = creerBanc(); banc.preparer(); connection.userId = null; result = undefined; vi.useFakeTimers(); });
  afterEach(() => { banc.nettoyer(); vi.useRealTimers(); vi.restoreAllMocks(); });
  it("tire cinq chaînes du cercle, dernière Rare ou mieux, sans toucher la partie", async () => {
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
});
