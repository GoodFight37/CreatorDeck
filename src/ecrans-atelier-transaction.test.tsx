import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { creerBanc, type Banc } from "@/ecrans-banc";
import { AtelierView } from "@/components/atelier-view";
import { CREATORS } from "@/lib/catalog";
import { createInitialState, getGameView } from "@/lib/game-engine";
const craft = vi.fn(), recycle = vi.fn(), recycleAll = vi.fn();
vi.mock("@/hooks/use-points", () => ({ usePoints: () => ({ craft, recycle, recycleAll }) }));
const NOW = Date.UTC(2026, 9, 14);
describe("rituel Atelier", () => {
  let banc: Banc;
  beforeEach(() => { banc = creerBanc(); banc.preparer(); vi.resetAllMocks(); });
  afterEach(() => banc.nettoyer());
  async function mount(balance = 90, variant: "standard" | "live" = "standard", tokens = 0) {
    const state = createInitialState(NOW); state.points = balance; state.tokens = tokens;
    const creator = CREATORS.find((entry) => entry.rarity === "common")!;
    state.cards = Array.from({ length: 3 }, (_, index) => ({ id: `copy-${index}`, creatorSlug: creator.slug, rarity: creator.rarity, variant, obtainedAt: NOW + index, rareDrop: false }));
    await banc.monter(<AtelierView game={getGameView(state, NOW)} onNotice={vi.fn()} onError={vi.fn()} onGoBinder={vi.fn()} />);
  }
  function open() { act(() => document.querySelector<HTMLButtonElement>(".atelier-row .craft-button")!.click()); }
  it("demande confirmation et verrouille les doubles activations jusqu’au vrai résultat", async () => {
    await mount(); let finish!: (value: {status: "done"; delta: number}) => void;
    craft.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    open(); expect(craft).not.toHaveBeenCalled();
    const button = [...document.querySelectorAll<HTMLButtonElement>("button")].find((entry) => entry.textContent?.startsWith("Créer ·"))!;
    act(() => { button.click(); button.click(); });
    expect(craft).toHaveBeenCalledTimes(1); expect(button.disabled).toBe(true);
    expect(document.querySelector('[role="dialog"]')?.getAttribute("aria-busy")).toBe("true");
    await act(async () => finish({status: "done", delta: -45}));
    expect(document.body.textContent).toContain("Elle est à toi");
    expect(document.querySelector('[role="status"]')?.textContent).toContain("45 points");
    expect(document.body.textContent).toContain("Voir le classeur");
  });
  it("garde le refus visible, autorise une nouvelle tentative sans faux succès", async () => {
    await mount(); craft.mockResolvedValue({status: "refused", message: "Connecte-toi pour créer."}); open();
    await act(async () => banc.appuyer(/^Créer ·/));
    expect(document.querySelector('[role="alert"]')?.textContent).toContain("Connecte-toi");
    expect(document.body.textContent).not.toContain("Elle est à toi");
    expect(document.querySelector<HTMLButtonElement>(".atelier-transaction .primary-action")!.disabled).toBe(false);
  });
  it("aperçu sans dépense si solde insuffisant et fermeture Escape", async () => {
    await mount(0);
    act(() => document.querySelector<HTMLButtonElement>(".atelier-preview-name")!.click());
    expect(document.body.textContent).toContain("Il te manque 45 points");
    expect(document.querySelector<HTMLButtonElement>(".atelier-transaction .primary-action")!.disabled).toBe(true);
    act(() => document.querySelector('[role="dialog"]')!.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    expect(document.querySelector('[role="dialog"]')).toBeNull(); expect(craft).not.toHaveBeenCalled();
  });
  it("affiche le gain et l’arrêt partiel réels du recyclage groupé", async () => {
    await mount(); recycleAll.mockResolvedValue({status: "done", count: 1, delta: 8, message: "Deuxième carte refusée."});
    banc.appuyer(/^Recycler/); banc.appuyer(/^Tout recycler/); expect(recycleAll).not.toHaveBeenCalled();
    await act(async () => banc.appuyer(/^Recycler ·/));
    expect(document.querySelector('[role="status"]')?.textContent).toContain("1 doublon recyclé · +8 points. Deuxième carte refusée.");
    banc.appuyer("Choisir une carte"); expect(document.querySelector('[role="dialog"]')).toBeNull();
  });
  it("confirme un Live séparément et ne le recycle jamais en masse", async () => {
    await mount(90, "live"); recycle.mockResolvedValue({status: "done", delta: 12});
    banc.appuyer(/^Recycler/);
    expect([...document.querySelectorAll<HTMLButtonElement>("button")].find((entry) => entry.textContent?.startsWith("Tout recycler"))!.disabled).toBe(true);
    open(); expect(document.body.textContent).toContain("Tu confirmes le recyclage de ce doublon Live");
    expect(recycle).not.toHaveBeenCalled();
    await act(async () => banc.appuyer(/^Recycler ·/));
    expect(recycle).toHaveBeenCalledTimes(1); expect(recycleAll).not.toHaveBeenCalled();
  });
  it("ne crée jamais une Légendaire depuis son aperçu", async () => {
    await mount(10000); banc.appuyer("Toutes les recettes"); banc.appuyer("Légendaires");
    act(() => document.querySelector<HTMLButtonElement>(".atelier-preview-name")!.click());
    expect(document.body.textContent).toContain("uniquement en booster");
    expect(document.querySelector<HTMLButtonElement>(".atelier-transaction .primary-action")!.disabled).toBe(true);
    expect(craft).not.toHaveBeenCalled();
  });
  it("envoie la monnaie choisie et garde une exception réseau dans la confirmation", async () => {
    await mount(); banc.appuyer(/^Jetons/);
    act(() => document.querySelector<HTMLButtonElement>(".atelier-preview-name")!.click());
    expect(document.querySelector<HTMLButtonElement>(".atelier-transaction .primary-action")!.disabled).toBe(true);
    banc.appuyer("Annuler"); banc.appuyer(/^Points/); open();
    craft.mockRejectedValue(new Error("Réseau indisponible"));
    await act(async () => banc.appuyer(/^Créer ·/));
    expect(craft.mock.calls[0][1]).toBe(false);
    expect(document.querySelector('[role="alert"]')?.textContent).toContain("Réseau indisponible");
    expect(document.body.textContent).not.toContain("Elle est à toi");
  });

  it("confirme aux jetons avec le bon portefeuille et affiche le débit retourné", async () => {
    await mount(90, "standard", 500); banc.appuyer(/^Jetons/); open();
    craft.mockResolvedValue({ status: "done", delta: -10 });
    await act(async () => banc.appuyer(/^Créer ·/));
    expect(craft.mock.calls[0][1]).toBe(true);
    expect(document.querySelector('[role="status"]')?.textContent).toContain("10 jetons");
  });

});
