import { act } from "react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { creerBanc, type Banc } from "@/ecrans-banc";
import { CREATORS, CREATOR_BY_SLUG, RETIRED_BY_SLUG, RETIRED_CREATORS, type RetiredCreator } from "@/lib/catalog";
import { createInitialState, getGameView } from "@/lib/game-engine";
import { HomeView } from "@/components/drop-view";
import { CollectionView } from "@/components/binder-view";
import { CardInspectModal } from "@/components/card-inspect-modal";

const NOW = Date.UTC(2026, 9, 11, 12);
vi.mock("@/hooks/use-game", () => ({ useNow: () => NOW }));
vi.mock("@/hooks/use-live", () => ({ useLive: () => ({ byLogin: new Map(), count: 0, stale: true, configured: false }) }));
const cloudMock = vi.hoisted(() => ({ current: { configured: false, userId: null as string | null, promoPacks: 0 } }));
vi.mock("@/hooks/use-cloud", () => ({ useCloud: () => cloudMock.current }));

describe("le Binder se feuillette, ses visages d’abord", () => {
  let banc: Banc;
  beforeEach(() => { banc = creerBanc(); banc.preparer(); });
  afterEach(() => { banc.nettoyer(); cloudMock.current = { configured: false, userId: null, promoPacks: 0 }; });

  async function collection(slugs: string[]) {
    const state = createInitialState(NOW);
    state.cards = slugs.map((slug, index) => ({ id: `owned-${index}`, creatorSlug: slug,
      rarity: CREATOR_BY_SLUG.get(slug)!.rarity,
      variant: "standard" as const, obtainedAt: NOW - index * 1000, rareDrop: false }));
    const game = getGameView(state, NOW);
    const onGoDrop = vi.fn();
    await banc.monter(<CollectionView game={game} onCraft={async () => true} onGoDrop={onGoDrop} />);
    return { game, onGoDrop };
  }

  const gridCards = () => [...document.querySelectorAll(".collection-grid .creator-card")];

  it("le classeur vide propose le Drop et montre les dos à découvrir", async () => {
    const { onGoDrop } = await collection([]);
    expect(document.body.textContent).toContain("Ta collection commence avec le prochain booster.");
    expect(gridCards()).toHaveLength(12);
    expect(gridCards().every((node) => node.classList.contains("is-locked"))).toBe(true);
    banc.appuyer("Retour au Drop");
    expect(onGoDrop).toHaveBeenCalledOnce();
  });

  it("les doublons ne s'affichent que dans la fiche, pas sur la pochette", async () => {
    const [first, second] = CREATORS;
    await collection([first.slug, first.slug, second.slug]);
    expect(gridCards()[0].getAttribute("aria-label")).toContain(first.displayName);
    expect(gridCards()[1].getAttribute("aria-label")).toContain(second.displayName);
    expect(document.querySelector(".collection-grid")!.textContent).not.toContain("×2");
    act(() => document.querySelector<HTMLButtonElement>(".collection-grid .creator-card-inspect")!.click());
    expect(document.querySelector('[role="dialog"]')!.textContent).toContain("Possédée ×2");
  });

  it("garde les douze cartes et ignore un second feuilletage avant la pose", async () => {
    vi.useFakeTimers();
    try {
      await collection(CREATORS.slice(0, 25).map((creator) => creator.slug));
      const sheet = () => document.querySelector(".binder-page")!;
      expect(sheet().getAttribute("data-page")).toBe("1");
      expect(document.querySelector(".binder-pager")!.textContent).toContain(`/ ${Math.ceil(CREATORS.length / 12)}`);
      banc.appuyer("Suivant");
      expect(sheet().getAttribute("data-page")).toBe("2");
      expect(gridCards()).toHaveLength(12);
      banc.appuyer("Suivant");
      expect(sheet().getAttribute("data-page")).toBe("2");
      await act(async () => { await vi.advanceTimersByTimeAsync(420); });
      banc.appuyer("Suivant");
      expect(sheet().getAttribute("data-page")).toBe("3");
      // La 25e obtenue ouvre la page 3, les dos à découvrir suivent.
      expect(gridCards()[0].classList.contains("is-locked")).toBe(false);
      expect(gridCards().slice(1).every((node) => node.classList.contains("is-locked"))).toBe(true);
    } finally { vi.useRealTimers(); }
  });

  it("range les Sortants obtenus parmi ses cartes et les retrouve par la recherche", async () => {
    const base = CREATORS[0];
    const retiredRecords: RetiredCreator[] = [
      { ...base, slug: "audit-retired-binder-alpha", displayName: "Audit Sortant Alpha",
        login: "audit_sort_fixture_alpha", retiredEdition: 1, retiredAt: "2026-10-15" },
      { ...base, slug: "audit-retired-binder-omega", displayName: "Audit Sortant Omega",
        login: "audit_sort_fixture_omega", retiredEdition: 1, retiredAt: "2026-10-15" },
    ];
    RETIRED_CREATORS.push(...retiredRecords);
    for (const retired of retiredRecords) {
      RETIRED_BY_SLUG.set(retired.slug, retired);
      CREATOR_BY_SLUG.set(retired.slug, retired);
    }
    try {
      await collection(retiredRecords.map(creator => creator.slug));
      // Obtenues d'abord, la plus récente en tête.
      expect(gridCards().slice(0, 2).map(node => node.getAttribute("aria-label")?.split(", rang")[0]))
        .toEqual(["Audit Sortant Alpha", "Audit Sortant Omega"]);
      const search = document.querySelector<HTMLInputElement>('input[aria-label="Rechercher un créateur"]')!;
      banc.saisir(search, "audit_sort_fixture_alpha");
      expect(gridCards()).toHaveLength(1);
      expect(document.querySelector(".collection-grid")?.textContent).toContain("Audit Sortant Alpha");
      banc.saisir(search, "absent du catalogue");
      expect(gridCards()).toHaveLength(0);
      expect(document.body.textContent).toContain("Aucune carte ne correspond à cette recherche.");
    } finally {
      for (const retired of retiredRecords) {
        RETIRED_CREATORS.splice(RETIRED_CREATORS.indexOf(retired), 1);
        RETIRED_BY_SLUG.delete(retired.slug);
        CREATOR_BY_SLUG.delete(retired.slug);
      }
    }
  });
});

describe("les sabliers du Drop en ligne", () => {
  let banc: Banc;
  beforeEach(() => { banc = creerBanc(); banc.preparer(); });
  afterEach(() => banc.nettoyer());

  async function drop({ packs = 0, hourglasses = 2, needsAccount = false, busy = false } = {}) {
    const state = { ...createInitialState(NOW), packs, hourglasses };
    const onUseHourglass = vi.fn();
    const onShowOdds = vi.fn();
    const noop = () => {};
    await banc.monter(<HomeView game={getGameView(state, NOW)} friendsOpening={0}
      onShowInbox={noop} onShowCollection={noop} onOpen={noop} onOpenScene={noop}
      sceneBusy={false} onUseHourglass={onUseHourglass} onShowOdds={onShowOdds}
      onShowMissions={noop} onShowAtelier={noop} onShowArena={noop} onShowTribunal={noop}
      tribunalRestants={0} tribunalClose={true} opening={false} usingHourglass={busy}
      now={NOW} serverReserve={true} needsAccount={needsAccount} />);
    const button = banc.boutons().find((b) => /Utiliser 1 sablier|Utilisation/.test(b.textContent ?? ""))!;
    return { button, onUseHourglass, onShowOdds };
  }

  it("range les jetons dans les détails et garde la garantie légendaire accessible", async () => {
    const { onShowOdds } = await drop();
    const tokens = document.querySelector(".token-row")!;
    const pity = document.querySelector<HTMLButtonElement>(".pity-row.now")!;
    expect(tokens.closest("details")).not.toBeNull();
    expect((tokens.closest("details") as HTMLDetailsElement).open).toBe(false);
    expect(tokens.textContent).toMatch(/\d+ jetons · encore \d+ pour une carte/);
    expect(pity.textContent).toMatch(/Légendaire garanti (dans \d+ boosters|au prochain)/);
    act(() => pity.click());
    expect(onShowOdds).toHaveBeenCalledOnce();
  });

  it("replie les infos secondaires du tutoriel derrière un lien discret", async () => {
    await drop({ needsAccount: true });
    const details = document.querySelector<HTMLDetailsElement>(".drop-secondary-details")!;
    expect(details.open).toBe(false);
    expect(details.querySelector("summary")?.textContent).toBe("Plus d’infos");
    expect(details.querySelector(".pity-row.now")).not.toBeNull();
    expect(details.querySelector(".hourglass-action")).not.toBeNull();
    act(() => details.querySelector("summary")!.click());
    expect(details.open).toBe(true);
  });

  it("le sablier reste visible pour un joueur et crée un booster bonus à 4/4", async () => {
    const { button, onUseHourglass } = await drop({ packs: 4 });
    expect(button.disabled).toBe(false);
    const details = button.closest<HTMLDetailsElement>("details.drop-secondary-details")!;
    expect(details.open).toBe(false);
    act(() => details.querySelector("summary")!.click());
    expect(details.open).toBe(true);
    expect(button.textContent).toContain("2");
    expect(button.textContent).toContain("5/4");
    act(() => button.click());
    expect(onUseHourglass).toHaveBeenCalledOnce();
    expect(document.body.textContent).not.toContain("Sablier indisponible en ligne");
  });

  it("laisse ouvrir les boosters promo quand la réserve rechargeable est vide", async () => {
    cloudMock.current = { configured: true, userId: "malik", promoPacks: 50 };
    const state = { ...createInitialState(NOW), packs: 0 };
    const onOpen = vi.fn();
    await banc.monter(<HomeView game={getGameView(state, NOW)} friendsOpening={0}
      onShowInbox={vi.fn()} onShowCollection={vi.fn()} onOpen={onOpen} onOpenScene={vi.fn()}
      sceneBusy={false} onUseHourglass={vi.fn()} onShowOdds={vi.fn()}
      onShowMissions={vi.fn()} onShowAtelier={vi.fn()} onShowArena={vi.fn()} onShowTribunal={vi.fn()}
      tribunalRestants={0} tribunalClose={true} opening={false} usingHourglass={false}
      now={NOW} serverReserve={true} needsAccount={false} />);
    const button = banc.boutons().find((entry) => entry.textContent?.includes("Ouvrir un booster de test"))!;
    const sachet = document.querySelector<HTMLButtonElement>(".pack-stage .pack-artwork")!;
    expect(button.disabled).toBe(false);
    expect(sachet.disabled).toBe(false);
    expect(document.querySelector(".open-panel .stock-row")!.textContent).toMatch(/^50 sachets · prochain à \d\d h \d\d$/);
    act(() => sachet.click());
    expect(onOpen).toHaveBeenCalledOnce();
    act(() => button.click());
    expect(onOpen).toHaveBeenCalledTimes(2);
  });

  it("ne montre qu’une note contextuelle compacte pour la réserve", async () => {
    await drop({ packs: 5 });
    expect(document.querySelectorAll(".hourglass-note")).toHaveLength(1);
    expect(document.querySelector(".hourglass-note")?.textContent).toContain("Ouvre le booster bonus");
  });

  it.each([{ packs: 5 }, { hourglasses: 0 }, { needsAccount: true }, { busy: true }])(
    "bloque le bouton si aucune dépense n’est possible : %j", async (options) => {
      const { button, onUseHourglass } = await drop(options);
      expect(button.disabled).toBe(true);
      act(() => button.click());
      expect(onUseHourglass).not.toHaveBeenCalled();
    },
  );
});

describe("la fiche d’une carte Sortant", () => {
  let banc: Banc;
  beforeEach(() => { banc = creerBanc(); banc.preparer(); });
  afterEach(() => banc.nettoyer());

  it("ne promet pas un tirage booster pour un Sortant non artisanable", async () => {
    const base = CREATORS[0];
    const retired: RetiredCreator = { ...base, slug: "audit-retired-inspect-fixture",
      displayName: "Sortant non disponible", login: "audit_retired_inspect_fixture",
      retiredEdition: 1, retiredAt: "2026-10-15" };
    RETIRED_BY_SLUG.set(retired.slug, retired);
    try {
      await banc.monter(<CardInspectModal creator={retired} ownedCount={0} variant="standard"
        liveStream={null} quote={{ cost: null, craftable: false }} onClose={vi.fn()} />);
      expect(document.body.textContent).toContain("ne tombe plus en booster");
      expect(document.body.textContent).toContain("ne peut plus être rejoint à l'Atelier");
      expect(document.body.textContent).not.toContain("se tire en booster");
    } finally {
      RETIRED_BY_SLUG.delete(retired.slug);
    }
  });
});
