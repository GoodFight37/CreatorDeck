import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { creerBanc, type Banc } from "@/ecrans-banc";
import { MissionsView } from "@/components/missions-view";
import { createInitialState, getGameView } from "@/lib/game-engine";
import { gameDay } from "@/lib/progression";

const NOW = Date.UTC(2026, 9, 11, 16);

describe("missions quotidiennes", () => {
  let banc: Banc;
  beforeEach(() => { banc = creerBanc(); banc.preparer(); });
  afterEach(() => banc.nettoyer());

  async function mount(state = createInitialState(NOW)) {
    await banc.monter(<MissionsView game={getGameView(state, NOW)} onClaimSeason={() => ({ status: "done" })}
      onClaimMilestone={() => ({ status: "done" })} onNotice={() => {}} onError={() => {}} />);
  }

  it("compte bien les quatre missions et explique l'action du Tribunal", async () => {
    await mount({ ...createInitialState(NOW), createdAt: NOW - 86_400_000 });
    expect(document.querySelectorAll(".day-missions .mission-row")).toHaveLength(4);
    const tribunal = [...document.querySelectorAll(".day-missions .mission-row")]
      .find((row) => row.textContent?.includes("Juge 5 dossiers"));
    expect(tribunal?.textContent).toContain("Rends un verdict sur 5 dossiers distincts au Tribunal des Bannis");
    expect(document.querySelector(".day-head")?.textContent).not.toContain("trois missions");
  });

  it("annonce que toutes les missions du jour sont faites", async () => {
    const state = createInitialState(NOW);
    state.missionDay = gameDay(NOW);
    state.missions = { pack: 2, recycle: 2, family: 2, tribunal: 6 };
    await mount(state);
    expect(document.querySelector(".day-head")?.textContent).toContain("Toutes les missions du jour sont faites");
  });
});
