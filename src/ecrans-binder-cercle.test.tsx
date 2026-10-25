import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { creerBanc, type Banc } from "@/ecrans-banc";
import { createInitialState, getGameView } from "@/lib/game-engine";
import { CollectionView } from "@/components/binder-view";
import { HomeView } from "@/components/drop-view";
import { CircleOnboarding } from "@/components/circle-onboarding";
import { CREATOR_BY_SLUG } from "@/lib/catalog";

const NOW = Date.UTC(2026, 9, 17, 20, 30);
vi.mock("@/hooks/use-game", () => ({ useNow: () => NOW }));
vi.mock("@/hooks/use-live", () => ({ useLive: () => ({ byLogin: new Map(), count: 0, stale: true, configured: false, refreshedAt: null, loading: false, error: null }) }));
vi.mock("@/hooks/use-cloud", () => ({ useCloud: () => ({ configured: false, userId: null, promoPacks: 0 }) }));

// ibai : Légendaire · anyme023 : Épique · jeanmassiet : Rare · swehyt : Peu commune · zeusspezial : Commune
const CIRCLE = ["ibai", "anyme023", "jeanmassiet", "swehyt", "zeusspezial"];

function gameWith(owned: string[], points = 100) {
  const state = { ...createInitialState(NOW), points };
  state.cards = owned.map((slug, index) => ({ id: `c-${index}`, creatorSlug: slug, rarity: CREATOR_BY_SLUG.get(slug)!.rarity,
    variant: "standard" as const, obtainedAt: NOW - index, rareDrop: false }));
  return getGameView(state, NOW);
}

describe("étape 3 : le Binder au service de mon cercle", () => {
  let banc: Banc;
  beforeEach(() => { banc = creerBanc(); banc.preparer(); });
  afterEach(() => { banc.nettoyer(); window.localStorage.clear(); vi.restoreAllMocks(); });
  const setCircle = (slugs: string[]) =>
    window.localStorage.setItem("creatordeck.circle.v1", JSON.stringify({ v: 1, slugs, at: 1 }));
  const name = (slug: string) => CREATOR_BY_SLUG.get(slug)!.displayName;
  const grid = () => [...document.querySelectorAll(".collection-grid .creator-card")]
    .map((card) => ({ name: card.getAttribute("aria-label")!.split(", rang")[0], locked: card.classList.contains("is-locked") }));

  it("s'ouvre sur mes visages : obtenues d'abord, cercle en tête, puis les dos à découvrir", async () => {
    setCircle(CIRCLE);
    const onEditCircle = vi.fn();
    // kaicenat est la plus récente, mais jeanmassiet est dans le cercle : il passe devant.
    await banc.monter(<CollectionView game={gameWith(["kaicenat", "jeanmassiet"])} onCraft={async () => true} onEditCircle={onEditCircle} />);
    const cards = grid();
    expect(cards.slice(0, 2)).toEqual([{ name: name("jeanmassiet"), locked: false }, { name: name("kaicenat"), locked: false }]);
    // Les manquantes suivent, en dos de carte, celles du cercle d'abord.
    expect(cards.slice(2, 6)).toEqual(["ibai", "anyme023", "swehyt", "zeusspezial"].map((slug) => ({ name: name(slug), locked: true })));
    expect(cards.slice(2).every((card) => card.locked)).toBe(true);
    // Un album, pas un tableau : ni score, ni filtres, ni tri, ni objectifs.
    for (const removed of [".collection-score", ".progress-track", ".filter-chips", 'select[aria-label="Trier le classeur"]',
      ".binder-active-page", ".binder-circle-goal", ".binder-next-pages", ".binder-collections-picker", ".pocket-count", ".binder-card-caption"]) {
      expect(document.querySelector(removed), removed).toBeNull();
    }
    expect(document.querySelector('input[aria-label="Rechercher un créateur"]')).not.toBeNull();
    banc.appuyer("Modifier");
    expect(onEditCircle).toHaveBeenCalledOnce();
  });

  it("sans cercle : les plus récentes d'abord, puis le reste au rang Twitch", async () => {
    await banc.monter(<CollectionView game={gameWith(["jeanmassiet", "ibai"])} onCraft={async () => true} />);
    const cards = grid();
    expect(cards.slice(0, 2)).toEqual([{ name: name("jeanmassiet"), locked: false }, { name: name("ibai"), locked: false }]);
    expect(cards.slice(2).every((card) => card.locked)).toBe(true);
    expect(cards).toHaveLength(12);
  });
});

describe("étape 3 : définir ou modifier mes chaînes", () => {
  let banc: Banc;
  beforeEach(() => { banc = creerBanc(); banc.preparer(); });
  afterEach(() => { banc.nettoyer(); window.localStorage.clear(); });

  async function home({ needsAccount = false, onShowObjectives = vi.fn() } = {}) {
    const onEditCircle = vi.fn();
    const noop = () => {};
    await banc.monter(<HomeView game={gameWith([])}
      onShowCollection={noop} onOpen={noop} onUseHourglass={noop} opening={false} usingHourglass={false}
      now={NOW} serverReserve={false} needsAccount={needsAccount} onEditCircle={onEditCircle}
      onShowObjectives={onShowObjectives} />);
    return { onEditCircle, onShowObjectives };
  }

  it("un joueur sans cercle voit « Choisir mes chaînes », et rien d'autre sous le sachet", async () => {
    const { onEditCircle } = await home();
    expect(document.querySelector(".circle-invite")).toBeNull();
    expect(document.querySelector(".drop-circle-invite")!.textContent).toContain("Choisir mes chaînes");
    banc.appuyer(/Choisir mes chaînes/);
    expect(onEditCircle).toHaveBeenCalledOnce();
    // Sous le sachet : la réserve, le minuteur, l'accès unique. Rien d'empilé.
    expect(document.querySelector(".open-panel .stock-row")).not.toBeNull();
    expect(document.querySelector(".drop-timer")).not.toBeNull();
    expect(document.querySelectorAll(".drop-hub-link")).toHaveLength(1);
  });

  it("garde « Choisir mes chaînes » sans cercle, même sans compte", async () => {
    await home({ needsAccount: true });
    expect(document.querySelector(".drop-circle-invite")!.textContent).toContain("Choisir mes chaînes");
  });

  it("avec un cercle : « Modifier » sur la rangée, et un seul accès aux objectifs", async () => {
    window.localStorage.setItem("creatordeck.circle.v1", JSON.stringify({ v: 1, slugs: CIRCLE, at: 1 }));
    const { onEditCircle, onShowObjectives } = await home();
    expect(document.querySelector(".drop-circle-invite")).toBeNull();
    banc.appuyer("Modifier");
    expect(onEditCircle).toHaveBeenCalledOnce();
    banc.appuyer(/Objectifs et activités/);
    expect(onShowObjectives).toHaveBeenCalledOnce();
  });

  it("un seul sachet : celui des créateurs, sans sélecteur ni voisin", async () => {
    window.localStorage.setItem("creatordeck.circle.v1", JSON.stringify({ v: 1, slugs: CIRCLE, at: 1 }));
    await home();
    // Un seul sachet, actif, et aucun autre univers à faire glisser.
    expect(document.querySelectorAll("[data-booster]")).toHaveLength(1);
    expect(document.querySelector('[data-booster="live"]')!.getAttribute("data-active")).toBe("true");
    expect(document.querySelector('[data-booster="memes"]')).toBeNull();
    expect(document.querySelector('[data-booster="imgflip"]')).toBeNull();
    expect(document.querySelector(".booster-switcher")).toBeNull();
    expect(document.querySelector(".booster-neighbor")).toBeNull();
    expect(document.querySelector('.booster-carousel')!.getAttribute("data-universe")).toBe("live");
  });

  it("0056 : l'accueil annonce le retour au classement seulement quand le cercle est complet", async () => {
    window.localStorage.setItem("creatordeck.circle.v1", JSON.stringify({ v: 1, slugs: CIRCLE, at: 1 }));
    const noop = () => {};
    await banc.monter(<HomeView game={gameWith(CIRCLE)}
      onShowCollection={noop} onOpen={noop} onUseHourglass={noop} opening={false} usingHourglass={false}
      now={NOW} serverReserve={false} needsAccount={false} onShowObjectives={noop} />);
    expect(document.body.textContent).toContain("Ton cercle est complet. Les boosters s’ouvrent au classement.");
  });

  it("« Mes chaînes » en modification ne parle pas de premier booster", async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    await banc.monter(<CircleOnboarding initial={CIRCLE} mode="edit" onConfirm={onConfirm} onCancel={onCancel} />);
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(dialog.textContent).not.toContain("premier booster");
    expect(dialog.textContent).toContain("Ton accueil et ton Binder se recentrent sur eux.");
    banc.appuyer("Enregistrer");
    expect(onConfirm).toHaveBeenCalledWith(CIRCLE);
    banc.appuyer("Annuler");
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
