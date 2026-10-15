import { act } from "react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { creerBanc, type Banc } from "@/ecrans-banc";
import { CREATORS } from "@/lib/catalog";
import { BINDER_COLLECTION_BY_ID, BINDER_COLLECTIONS } from "@/lib/binder-collections";
import { createInitialState, getGameView } from "@/lib/game-engine";
import { HomeView } from "@/components/drop-view";
import { CollectionView } from "@/components/binder-view";

const NOW = Date.UTC(2026, 9, 11, 12);
vi.mock("@/hooks/use-game", () => ({ useNow: () => NOW }));
vi.mock("@/hooks/use-live", () => ({ useLive: () => ({ byLogin: new Map(), count: 0, stale: true, configured: false }) }));
const cloudMock = vi.hoisted(() => ({ current: { configured: false, userId: null as string | null, promoPacks: 0 } }));
vi.mock("@/hooks/use-cloud", () => ({ useCloud: () => cloudMock.current }));

describe("le Binder guide la collection sans inventer de progression", () => {
  let banc: Banc;
  beforeEach(() => { banc = creerBanc(); banc.preparer(); });
  afterEach(() => { banc.nettoyer(); cloudMock.current = { configured: false, userId: null, promoPacks: 0 }; });

  async function collection(slugs: string[]) {
    const state = createInitialState(NOW);
    state.cards = slugs.map((slug, index) => ({ id: `owned-${index}`, creatorSlug: slug,
      rarity: CREATORS.find((creator) => creator.slug === slug)!.rarity,
      variant: "standard" as const, obtainedAt: NOW - index * 1000, rareDrop: false }));
    const game = getGameView(state, NOW);
    const onGoDrop = vi.fn();
    await banc.monter(<CollectionView game={game} onCraft={async () => true} onGoDrop={onGoDrop} />);
    return { game, onGoDrop };
  }

  it("le classeur vide propose le Drop et n’invente pas de page avancée", async () => {
    const { onGoDrop } = await collection([]);
    expect(document.querySelector(".binder-next-pages")).toBeNull();
    banc.appuyer("Retour au Drop");
    expect(onGoDrop).toHaveBeenCalledOnce();
  });

  it("les doublons ne gonflent pas les pages et leurs filtres ne montrent que les manquantes", async () => {
    const family = CREATORS.filter((creator) => creator.region === "S01").slice(0, 2);
    await collection([family[0].slug, family[0].slug, family[1].slug]);
    const goal = document.querySelector<HTMLButtonElement>(".binder-next-pages > button")!;
    const season = BINDER_COLLECTIONS.find((entry) => goal.textContent?.includes(entry.name))!;
    expect(goal.textContent).toContain(`2 / ${season.slugs.length}`);
    act(() => goal.click());
    const allowed = new Set(BINDER_COLLECTION_BY_ID.get(season.id)!.slugs);
    const labels = [...document.querySelectorAll(".collection-grid .creator-card")].map((node) => node.getAttribute("aria-label")!);
    expect(labels).toHaveLength(season.slugs.length - 2);
    for (const label of labels) {
      expect(label).toContain("non obtenue");
      const creator = CREATORS.find((entry) => label.startsWith(`${entry.displayName},`))!;
      expect(allowed.has(creator.slug)).toBe(true);
      expect(family.some((entry) => entry.slug === creator.slug)).toBe(false);
    }
    banc.appuyer("Dernières reçues");
    expect(document.querySelector(".binder-active-page")).toBeNull();
    expect(document.querySelectorAll(".collection-grid .creator-card")).toHaveLength(2);
  });

  it("garde les douze cartes et ignore un second feuilletage avant la pose", async () => {
    vi.useFakeTimers();
    try {
      await collection(CREATORS.slice(0, 25).map((creator) => creator.slug));
      const sheet = () => document.querySelector(".binder-page")!;
      expect(sheet().getAttribute("data-page")).toBe("1");
      banc.appuyer("Suivant");
      expect(sheet().getAttribute("data-page")).toBe("2");
      expect(document.querySelectorAll(".collection-grid .creator-card")).toHaveLength(12);
      banc.appuyer("Suivant");
      expect(sheet().getAttribute("data-page")).toBe("2");
      await act(async () => { await vi.advanceTimersByTimeAsync(420); });
      banc.appuyer("Suivant");
      expect(sheet().getAttribute("data-page")).toBe("3");
      expect(document.querySelectorAll(".collection-grid .creator-card")).toHaveLength(1);
      await act(async () => { await vi.advanceTimersByTimeAsync(420); });
      banc.appuyer("Suivant");
      expect(sheet().getAttribute("data-page")).toBe("3");
    } finally { vi.useRealTimers(); }
  });

  it("999 cartes ne sont pas annoncées comme une collection complète", async () => {
    await collection(CREATORS.slice(0, -1).map((creator) => creator.slug));
    expect(document.querySelector(".collection-score")?.textContent).toContain("99%");
  });

  it("permet de choisir une page encore vide sans inventer de cartes obtenues", async () => {
    await collection([]);
    const choice = document.querySelector<HTMLButtonElement>(".binder-collection-choices button")!;
    act(() => choice.click());
    expect(document.querySelector(".binder-next-pages")?.textContent).toContain("0 / 12");
    expect(document.querySelectorAll(".collection-grid .creator-card")).toHaveLength(12);
    expect([...document.querySelectorAll(".collection-grid .creator-card")].every((node) => node.getAttribute("aria-label")?.includes("non obtenue"))).toBe(true);
    banc.appuyer("Revenir à la suggestion automatique");
    expect(document.querySelector(".binder-next-pages")).toBeNull();
    expect(document.querySelectorAll(".collection-grid .creator-card")).toHaveLength(0);
  });

  it("affiche une page choisie complétée avec ses cartes et son compteur exact", async () => {
    const first = BINDER_COLLECTIONS[0];
    await collection(first.slugs);
    const choice = document.querySelector<HTMLButtonElement>(".binder-collection-choices button")!;
    act(() => choice.click());
    expect(document.querySelector(".binder-next-pages")?.textContent).toContain("COLLECTION COMPLÉTÉE");
    expect(document.querySelector(".binder-next-pages progress")?.getAttribute("value")).toBe("12");
    expect(document.querySelectorAll(".collection-grid .creator-card")).toHaveLength(12);
    expect([...document.querySelectorAll(".collection-grid .creator-card")].every((node) => !node.getAttribute("aria-label")?.includes("non obtenue"))).toBe(true);
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
    expect(button.disabled).toBe(false);
    expect(document.body.textContent).toContain("50 boosters de test");
    act(() => button.click());
    expect(onOpen).toHaveBeenCalledOnce();
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
