import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { creerBanc, type Banc } from "@/ecrans-banc";
import { PublicProfileSheet } from "@/components/public-profile-sheet";

vi.mock("@/hooks/use-cloud", () => ({ useCloud: () => ({
  userId: "u1", profileBusy: false, profileMarket: [],
  profile: {
    userId: "u1", displayName: "Amélie", level: 4, points: 0, verified: true,
    uniqueCreators: 2, totalCards: 3, legendaryCards: 0, epicCards: 0,
    goldCards: 0, holoCards: 0, catalogSize: 1000, completion: .002,
    rankCompletion: null, rankCards: null, showcaseSlugs: [], wishlistSlug: null,
    byRarity: [], byRegion: [],
  },
}) }));
vi.mock("@/lib/cloud/cloud-store", () => ({ cloudStore: { closeProfile: vi.fn() } }));
vi.mock("@/lib/poster", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/poster")>();
  return { ...actual, drawStory: vi.fn((canvas: HTMLCanvasElement) => { canvas.width = 1080; canvas.height = 1920; }) };
});

function nextTurn() { return new Promise((resolve) => setTimeout(resolve, 0)); }

describe("export Story de la fiche publique", () => {
  let banc: Banc;
  beforeEach(() => {
    banc = creerBanc(); banc.preparer();
    vi.stubGlobal("Image", class { onload: (() => void) | null = null; onerror: (() => void) | null = null; set src(_value: string) { this.onerror?.(); } });
    vi.stubGlobal("URL", { ...URL, createObjectURL: () => "blob:story-test", revokeObjectURL: vi.fn() });
    HTMLCanvasElement.prototype.toBlob = (callback) => callback(new Blob(["png"], { type: "image/png" }));
  });
  afterEach(() => { banc.nettoyer(); vi.unstubAllGlobals(); });

  it("propose les deux formats et restaure le focus après la Story", async () => {
    await banc.monter(<PublicProfileSheet />);
    const trigger = [...document.querySelectorAll<HTMLButtonElement>("button")]
      .find((button) => button.textContent?.includes("Story verticale"))!;
    expect(trigger).toBeDefined();
    expect(document.body.textContent).toContain("Affiche de partage");
    trigger.focus();
    act(() => trigger.click());
    await act(async () => { await nextTurn(); });
    const modal = document.querySelector<HTMLElement>('.poster-modal[aria-label="Story verticale"]');
    expect(modal).not.toBeNull();
    expect(modal?.querySelector<HTMLAnchorElement>("a[download]")?.download).toBe("creatordeck-amelie-story.png");
    expect(document.activeElement).toBe(modal?.querySelector("a[download]"));
    act(() => modal?.querySelector<HTMLButtonElement>("button")?.click());
    expect(document.querySelector(".poster-modal")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
});
