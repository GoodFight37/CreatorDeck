/**
 * « Tu donnes », la liste des cartes qu'on peut mettre dans une offre.
 *
 * Avant : vingt-quatre cartes posées, et **pas un mot** sur les suivantes. Un
 * joueur qui avait trois cents cartes distinctes ne pouvait ni voir la deux
 * centième, ni la choisir — elle existait, mais l'écran n'en parlait pas. Ce
 * banc tient la correction : vingt-quatre par page, une phrase qui dit la
 * tranche (« Cartes 1–24 sur 60 »), et la recherche qui ramène à la première
 * page.
 *
 * Le reste du panneau (joueur, offres) n'est pas de ce banc : l'état de jeu est
 * remplacé, le store cloud réel n'est pas configuré et ne parle à personne.
 */
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { creerBanc, type Banc } from "@/ecrans-banc";

const monde = vi.hoisted(() => ({
  etat: null as unknown,
  /** Le joueur d'en face : sans partenaire, le panneau ne montre pas « Tu donnes ». */
  partenaire: {
    userId: "22222222-2222-4222-8222-222222222222",
    displayName: "Bot de banc",
    level: 12,
    uniqueCreators: 40,
  },
}));

vi.mock("@/hooks/use-game", () => ({ useGame: () => monde.etat }));

// Le store cloud réel n'est pas configuré dans ce banc : on remplace l'état
// (comme partout ailleurs) **et** les quatre gestes que le panneau appelle.
vi.mock("@/hooks/use-cloud", () => ({
  useCloud: () => ({
    configured: true,
    userId: "11111111-1111-4111-8111-111111111111",
    busy: false,
    trades: [],
    message: null,
    isError: false,
  }),
}));

vi.mock("@/lib/cloud/cloud-store", () => ({
  cloudStore: {
    tradeRadar: vi.fn(async () => ({
      wishes: [{ friend: { id: 7, friendId: "33333333-3333-4333-8333-333333333333", friendName: "Ana", createdAt: "2026-10-15T00:00:00Z" }, slug: "kaicenat" }],
      scanned: 1, failed: 0, message: null,
    })),
    proposeTrade: vi.fn(async () => ({ status: "done", message: "" })),
    playerVariants: vi.fn(async () => ({ variants: ["standard"], message: null })),
    searchPlayers: vi.fn(async () => ({ players: [monde.partenaire], message: null })),
    loadTrades: vi.fn(async () => {}),
    respondTrade: vi.fn(async () => {}),
    cancelTrade: vi.fn(async () => {}),
  },
}));

/** Soixante cartes distinctes : trente créateurs, deux variantes chacun. */
async function soixanteCartes() {
  const { CREATORS } = await import("@/lib/catalog");
  const trente = CREATORS.slice(0, 30);
  return trente.flatMap((creator, index) =>
    (["standard", "holo"] as const).map((variant) => ({
      id: `c-${index}-${variant}`,
      creatorSlug: creator.slug,
      rarity: creator.rarity,
      variant,
      obtainedAt: Date.UTC(2026, 9, 1),
      rareDrop: false,
    })),
  );
}

describe("les échanges, « Tu donnes »", () => {
  let banc: Banc;

  beforeEach(() => {
    banc = creerBanc();
    banc.preparer();
  });

  afterEach(() => {
    banc.nettoyer();
    monde.etat = null;
    vi.clearAllMocks();
  });

  async function panneau() {
    const { TradesPanel } = await import("@/components/account/trades-panel");
    await banc.monter(<TradesPanel focus="trades" />);

    // Le panneau ne compose une offre qu'avec un joueur d'en face : on le
    // cherche (le store est remplacé, la réponse est immédiate) et on l'appuie.
    const pseudo = document.querySelector<HTMLInputElement>('input[placeholder="Pseudo au classement"]');
    expect(pseudo, "aucun champ de recherche de joueur").toBeTruthy();
    banc.saisir(pseudo!, "bot");
    act(() => document.querySelector<HTMLButtonElement>(".trade-search button")!.click());
    await act(async () => {});
    // Le bouton du joueur porte deux lignes (« Bot de banc » puis son niveau) :
    // `appuyer` cherche le texte **exact**, donc on vise l'élément.
    const joueur = document.querySelector<HTMLButtonElement>(".trade-player");
    expect(joueur, "le joueur trouvé n'est pas listé").toBeTruthy();
    act(() => {
      joueur!.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
    });
    await act(async () => {});
  }

  function cartes() {
    return [...document.querySelectorAll(".trade-choice b")].map((n) => n.textContent);
  }

  function pager() {
    return document.querySelector(".binder-pager")?.textContent ?? "";
  }

  it("montre vingt-quatre cartes sur soixante, et dit lesquelles", async () => {
    monde.etat = { cards: await soixanteCartes() };
    await panneau();
    banc.ecran("49-echanges-cartes-page-1");

    expect(cartes()).toHaveLength(24);
    expect(pager()).toContain("Cartes 1");
    expect(pager()).toContain("24 sur 60");
  });

  it("prépare une offre depuis le souhait d'une amie sans l'envoyer", async () => {
    monde.etat = { cards: [
      { id: "a", creatorSlug: "kaicenat", rarity: "legendary", variant: "standard" },
      { id: "b", creatorSlug: "kaicenat", rarity: "legendary", variant: "standard" },
    ] };
    const { TradesPanel } = await import("@/components/account/trades-panel");
    await banc.monter(<TradesPanel focus="trades" />);
    const scan = document.querySelector<HTMLButtonElement>(".trade-radar-head button")!;
    act(() => scan.click());
    await act(async () => {});
    expect(document.querySelectorAll(".trade-radar-list li")).toHaveLength(1);
    expect(document.querySelector(".trade-radar-list")?.textContent).toContain("Ana");
    act(() => document.querySelector<HTMLButtonElement>(".trade-radar-list button")!.click());
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
    expect(document.querySelector(".trade-partner")?.textContent).toContain("Ana");
    expect(document.querySelector(".trade-pick")?.querySelector<HTMLButtonElement>(".trade-choice.on")?.textContent).toContain("Kai");
    expect(document.querySelector<HTMLInputElement>('input[placeholder="Une de tes cartes"]')?.value).toBe("kaicenat");
    expect(document.activeElement).toBe(document.querySelector('input[placeholder="N\'importe quel créateur du catalogue"]'));
    const { cloudStore } = await import("@/lib/cloud/cloud-store");
    expect(cloudStore.proposeTrade).not.toHaveBeenCalled();
    banc.ecran("52-trade-radar");
  });

  it("protège le brouillon quand une piste change de partenaire", async () => {
    monde.etat = { cards: [
      { id: "a", creatorSlug: "kaicenat", rarity: "legendary", variant: "standard" },
      { id: "b", creatorSlug: "kaicenat", rarity: "legendary", variant: "standard" },
    ] };
    await panneau();
    act(() => document.querySelector<HTMLButtonElement>(".trade-pick .trade-choice")!.click());
    banc.appuyer("Lancer le radar");
    await act(async () => {});
    const prepare = document.querySelector<HTMLButtonElement>(".trade-radar-list button")!;
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    act(() => prepare.click());
    expect(document.querySelector(".trade-partner")?.textContent).toContain("Bot de banc");
    expect(confirm).toHaveBeenCalledOnce();
    confirm.mockReturnValue(true);
    act(() => prepare.click());
    expect(document.querySelector(".trade-partner")?.textContent).toContain("Ana");
    confirm.mockRestore();
  });

  it("explique pourquoi le radar attend un doublon", async () => {
    monde.etat = { cards: [{ id: "a", creatorSlug: "kaicenat", rarity: "legendary", variant: "standard" }] };
    const { TradesPanel } = await import("@/components/account/trades-panel");
    await banc.monter(<TradesPanel focus="trades" />);
    expect(document.querySelector<HTMLButtonElement>(".trade-radar-head button")?.disabled).toBe(true);
    expect(document.querySelector(".trade-radar")?.textContent).toContain("au moins deux exemplaires");
  });

  it("feuillette jusqu'au bout, sans jamais dépasser", async () => {
    monde.etat = { cards: await soixanteCartes() };
    await panneau();

    banc.appuyer("Suivant");
    banc.ecran("50-echanges-cartes-page-2");
    expect(cartes()).toHaveLength(24);
    expect(pager()).toContain("25");

    banc.appuyer("Suivant");
    // Dernière page : douze cartes, et la flèche « Suivant » s'éteint.
    expect(cartes()).toHaveLength(12);
    expect(pager()).toContain("49");
    expect(pager()).toContain("60");
    const fleches = [...document.querySelectorAll<HTMLButtonElement>(".binder-pager button")];
    expect(fleches.at(-1)?.disabled).toBe(true);

    // Appuyer encore ne fait rien : la page ne peut pas sortir de la liste.
    banc.appuyer("Suivant");
    expect(cartes()).toHaveLength(12);
  });

  it("ramène à la première page dès qu'une recherche change la liste", async () => {
    monde.etat = { cards: await soixanteCartes() };
    await panneau();

    banc.appuyer("Suivant");
    expect(pager()).toContain("25");

    // Une recherche qui trouve peu de choses : plus de pager du tout.
    const champ = document.querySelector<HTMLInputElement>('input[placeholder="Une de tes cartes"]');
    expect(champ, "aucun champ de recherche des cartes données").toBeTruthy();
    const { CREATORS } = await import("@/lib/catalog");
    const nom = CREATORS[0].displayName;
    banc.saisir(champ!, nom);

    expect(document.querySelector(".binder-pager")).toBeNull();
    expect(cartes().length).toBeGreaterThan(0);
    expect(cartes().length).toBeLessThan(24);
    banc.ecran("51-echanges-recherche");
  });

  it("écarte les variantes arrivées après un changement de partenaire", async () => {
    monde.etat = { cards: await soixanteCartes() };
    await panneau();
    const { cloudStore } = await import("@/lib/cloud/cloud-store");
    let terminer!: (result: { variants: string[]; message: null }) => void;
    vi.mocked(cloudStore.playerVariants).mockImplementationOnce(() => new Promise((resolve) => { terminer = resolve; }));
    banc.saisir(document.querySelector<HTMLInputElement>('input[placeholder="N\'importe quel créateur du catalogue"]')!, "kai");
    act(() => document.querySelector<HTMLButtonElement>(".trade-wanted .trade-choice")!.click());
    act(() => document.querySelector<HTMLButtonElement>('.trade-partner button[aria-label="Changer de partenaire"]')!.click());
    await act(async () => terminer({ variants: ["holo"], message: null }));
    expect(document.querySelector(".trade-variants")).toBeNull();
    expect(document.querySelector(".trade-partner")).toBeNull();
  });

  it("verrouille la proposition jusqu'à la réponse du réseau", async () => {
    monde.etat = { cards: await soixanteCartes() };
    await panneau();
    act(() => document.querySelector<HTMLButtonElement>(".trade-pick .trade-choice")!.click());
    const { cloudStore } = await import("@/lib/cloud/cloud-store");
    banc.saisir(document.querySelector<HTMLInputElement>('input[placeholder="N\'importe quel créateur du catalogue"]')!, "kai");
    act(() => document.querySelector<HTMLButtonElement>(".trade-wanted .trade-choice")!.click());
    await act(async () => {});
    act(() => document.querySelector<HTMLButtonElement>(".trade-variants button")!.click());
    let terminer!: (result: { status: "done"; message: string }) => void;
    vi.mocked(cloudStore.proposeTrade).mockImplementationOnce(() => new Promise((resolve) => { terminer = resolve; }));
    const envoyer = [...document.querySelectorAll<HTMLButtonElement>("button")].find((button) => button.textContent?.includes("Proposer l'échange"))!;
    act(() => { envoyer.click(); envoyer.click(); });
    expect(cloudStore.proposeTrade).toHaveBeenCalledTimes(1);
    expect(envoyer.disabled).toBe(true);
    await act(async () => terminer({ status: "done", message: "" }));
    expect(cloudStore.proposeTrade).toHaveBeenCalledTimes(1);
  });
});
