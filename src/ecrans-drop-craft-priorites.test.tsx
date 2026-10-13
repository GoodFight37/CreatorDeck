import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { creerBanc, type Banc } from "@/ecrans-banc";
import { AtelierView } from "@/components/atelier-view";
import { createInitialState, getGameView } from "@/lib/game-engine";
const NOW = Date.UTC(2026, 9, 13, 12);
const craft = vi.fn();
vi.mock("@/hooks/use-points", () => ({ usePoints: () => ({ craft, recycle: vi.fn(), recycleAll: vi.fn() }) }));
describe("priorité des recettes sans changement économique", () => {
  let banc: Banc;
  beforeEach(() => { banc = creerBanc(); banc.preparer(); vi.clearAllMocks(); });
  afterEach(() => banc.nettoyer());
  async function mount(points: number, tokens = 0) {
    const state = createInitialState(NOW); state.points = points; state.tokens = tokens;
    const game = getGameView(state, NOW), onGoDrop = vi.fn();
    await banc.monter(<AtelierView game={game} onNotice={vi.fn()} onError={vi.fn()} onGoDrop={onGoDrop} />);
    return { state, onGoDrop };
  }
  it("affiche uniquement les recettes finançables par défaut et permet l’exploration", async () => {
    await mount(90);
    expect(document.querySelector<HTMLDetailsElement>(".atelier-rules-details")!.open).toBe(false);
    const rows = [...document.querySelectorAll(".atelier-row")];
    expect(rows.length).toBeGreaterThan(0); expect(rows.length).toBeLessThanOrEqual(20);
    for (const row of rows) {
      const button = row.querySelector<HTMLButtonElement>(".craft-button")!;
      expect(button.disabled).toBe(false); expect(Number(button.textContent)).toBeLessThanOrEqual(90);
    }
    banc.appuyer("Toutes les recettes"); banc.appuyer("Légendaires");
    expect(document.querySelectorAll(".craft-locked").length).toBeGreaterThan(0);
    expect(craft).not.toHaveBeenCalled();
  });
  it("trie les recettes les moins chères si aucun achat n’est financé et propose la boucle vide", async () => {
    const { state, onGoDrop } = await mount(0); const before = JSON.stringify(state);
    expect(document.querySelector(".atelier-row .craft-button")?.textContent).toContain("45");
    expect(document.querySelector<HTMLButtonElement>(".atelier-row .craft-button")!.disabled).toBe(true);
    banc.appuyer(/^Voir mes doublons/);
    expect(document.body.textContent).toContain("Boosters → doublons → points → carte au choix");
    banc.appuyer("Retour au Drop"); expect(onGoDrop).toHaveBeenCalledOnce();
    expect(JSON.stringify(state)).toBe(before); expect(craft).not.toHaveBeenCalled();
  });
  it("recalcule les cartes à portée en jetons sans rendre les légendaires artisanables", async () => {
    await mount(90, 0);
    banc.appuyer(/^Jetons/);
    expect(document.querySelector<HTMLButtonElement>(".atelier-row .craft-button")!.disabled).toBe(true);
    expect(document.querySelectorAll(".craft-locked")).toHaveLength(0);
    banc.appuyer("Toutes les recettes"); banc.appuyer("Légendaires");
    expect(document.querySelectorAll(".craft-button")).toHaveLength(0);
  });
});
