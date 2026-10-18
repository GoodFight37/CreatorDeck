import { act } from "react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { creerBanc, type Banc } from "@/ecrans-banc";
import { usePackOpening, type PackOpeningResult } from "@/hooks/use-pack-opening";
import { gameStore } from "@/lib/game-store";
import { cloudStore } from "@/lib/cloud/cloud-store";
import { RevealOverlay } from "@/components/reveal-overlay";
import { CollectionView } from "@/components/binder-view";
import { CREATORS, CREATOR_BY_SLUG } from "@/lib/catalog";
import { createInitialState, getGameView, type DrawnCard } from "@/lib/game-engine";
import * as sounds from "@/lib/sfx";
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
  it("tire cinq chaînes du cercle à leur rareté du catalogue, sans toucher la partie", async () => {
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
      for (const card of result.cards) {
        expect(circle).toContain(card.creatorSlug);
        expect(card.rarity).toBe(CREATOR_BY_SLUG.get(card.creatorSlug)!.rarity);
        expect(card.displayRarity).toBeUndefined();
      }
    }
    expect(local).not.toHaveBeenCalled();
  });

  it("garde une préférée Commune à la révélation, au récap et dans le classeur malgré displayRarity", async () => {
    const favorite = CREATORS.find(creator => creator.rarity === "common")!;
    const circle = [favorite.slug, "kaicenat", "ibai", "ninja", "rubius"];
    window.localStorage.setItem("creatordeck.circle.v1", JSON.stringify({ v: 1, slugs: circle, at: 1 }));
    const reveal = vi.spyOn(sounds, "playReveal").mockImplementation(() => {});
    const bang = vi.spyOn(sounds, "playBang").mockImplementation(() => {});
    const legendary = vi.spyOn(sounds, "playLegendaryStinger").mockImplementation(() => {});
    const card: DrawnCard = { id: "favorite", creatorSlug: favorite.slug, rarity: "common", displayRarity: "legendary", variant: "standard", isNew: true, rareDrop: false };
    await banc.monter(<RevealOverlay cards={[card]} index={0} onNext={() => {}} onClose={() => {}} />);
    await act(async () => { await vi.advanceTimersByTimeAsync(2500); });
    expect(document.querySelector(".reveal-card")?.classList.contains("rarity-common")).toBe(true);
    expect(document.querySelector(".reveal-name")?.textContent).toContain("Commune");
    expect(document.querySelector(".reveal-name")?.textContent).toContain("Préférée");
    expect(document.querySelector(".reveal-rarity-kicker")).toBeNull();
    expect(reveal).toHaveBeenCalledWith("common", "standard");
    expect(bang).not.toHaveBeenCalled();
    expect(legendary).not.toHaveBeenCalled();
    banc.appuyer("Ranger dans le classeur");
    expect(document.querySelector(".reveal-summary-card")?.textContent).toContain("Commune");
    expect(document.querySelector(".reveal-summary-card")?.textContent).toContain("Préférée");
    const state = createInitialState(1000);
    state.cards = [{ ...card, obtainedAt: 1000 }];
    await banc.rendre(<CollectionView game={getGameView(state, 1000)} onCraft={async () => true} />);
    const pocket = [...document.querySelectorAll(".collection-grid .binder-pocket")]
      .find(element => element.querySelector(".creator-card")?.getAttribute("aria-label")?.startsWith(`${favorite.displayName},`));
    expect(pocket?.querySelector(".creator-card")?.getAttribute("aria-label")).toContain("Commune");
    expect(pocket?.textContent).toContain("Préférée");
    expect(pocket?.textContent).toContain("Commune");
    const member = document.querySelector('.circle-strip li[data-owned="true"]');
    expect(member?.textContent).toContain("Préférée");
    expect(member?.textContent).toContain("Commune");
    expect(CREATOR_BY_SLUG.get(favorite.slug)?.rarity).toBe("common");
  });

  it("les autres chaînes portent le signe Dans tes chaînes à leur rareté du catalogue", async () => {
    const creators = CREATORS.filter(creator => creator.rarity === "common").slice(0, 5);
    window.localStorage.setItem("creatordeck.circle.v1", JSON.stringify({ v: 1, slugs: creators.map(c => c.slug), at: 1 }));
    const cards: DrawnCard[] = creators.map((creator, i) => ({ id: `old-${i}`, creatorSlug: creator.slug, rarity: "common", displayRarity: "epic", variant: "standard", isNew: true, rareDrop: false }));
    await banc.monter(<RevealOverlay cards={cards} index={1} onNext={() => {}} onClose={() => {}} />);
    expect(document.querySelector(".reveal-name")?.textContent).toContain("Dans tes chaînes");
    expect(document.querySelector(".reveal-name")?.textContent).toContain("Commune");
    expect(document.querySelector(".reveal-card")?.classList.contains("rarity-common")).toBe(true);
  });
});
