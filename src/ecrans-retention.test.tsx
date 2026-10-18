import { act } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { creerBanc } from "@/ecrans-banc";
import { MarketSheet } from "@/components/market-sheet";
import { LastPackSheet } from "@/components/last-pack-sheet";
import { TradesPanel } from "@/components/account/trades-panel";
import { LeaderboardSection } from "@/components/account/leaderboard-section";
import { MissionsView } from "@/components/missions-view";
import { createInitialState, getGameView } from "@/lib/game-engine";
import { cloudStore } from "@/lib/cloud/cloud-store";

vi.mock("@/hooks/use-other-players", () => ({ useOtherPlayers: () => false }));
vi.mock("@/hooks/use-cloud", () => ({ useCloud: () => ({ ...cloudStore.getSnapshot(), configured: false, userId: null }) }));
const banc = creerBanc();
beforeEach(() => {
  banc.preparer();
  localStorage.setItem("creatordeck.circle.v1", JSON.stringify({ v: 1, slugs: ["ibai", "ninja", "rubius", "xqc", "shroud"], at: 1 }));
});
afterEach(() => { banc.nettoyer(); vi.restoreAllMocks(); });

it.each([
  ["Hôtel", () => <MarketSheet onClose={() => {}} />],
  ["Last Pack", () => <LastPackSheet onClose={() => {}} />],
  ["Échanges", () => <TradesPanel focus="trades" />],
  ["Classement", () => <LeaderboardSection />],
] as const)("%s sans autre joueur : une seule action partage, sans transfert", async (_, element) => {
  const share = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "share", { configurable: true, value: share });
  const steal = vi.spyOn(cloudStore, "stealLastPack");
  await banc.monter(element());
  const actions = [...document.querySelectorAll<HTMLButtonElement>("button")].filter((b) => b.getAttribute("aria-label") !== "Fermer");
  expect(actions.map((b) => b.textContent)).toEqual(["Partager une carte de mes chaînes"]);
  await act(async () => actions[0].click());
  expect(share).toHaveBeenCalledWith(expect.objectContaining({ text: expect.stringContaining("ibai") }));
  expect(steal).not.toHaveBeenCalled();
});

it("Objectifs conserve les trois activités dans un panneau fermé et annonce des boosters", async () => {
  const now = Date.UTC(2026, 9, 18, 12);
  const onScene = vi.fn();
  await banc.monter(<MissionsView game={getGameView(createInitialState(now), now)}
    onClaimSeason={vi.fn()} onClaimMilestone={vi.fn()} onNotice={vi.fn()} onError={vi.fn()}
    onOpenScene={onScene} onShowTribunal={vi.fn()} onShowArena={vi.fn()} />);
  const details = [...document.querySelectorAll("details")].find((d) => d.querySelector("summary")?.textContent === "Autres activités")!;
  expect(details.open).toBe(false);
  expect(details.textContent).toContain("Tribunal");
  expect(details.textContent).toContain("Arène");
  banc.appuyer("Ouvrir le Paquet Scène");
  expect(onScene).toHaveBeenCalledOnce();
  expect(document.querySelector(".streak-plan")!.textContent).toContain("booster");
  expect(document.querySelector(".streak-plan")!.textContent).not.toMatch(/pts|jetons|sabliers/);
  expect(document.querySelector(".day-missions")!.textContent).not.toMatch(/Recycle un doublon|Juge 5 dossiers/);
});
