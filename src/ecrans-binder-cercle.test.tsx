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

  async function home({ needsAccount = false } = {}) {
    const onEditCircle = vi.fn();
    const noop = () => {};
    await banc.monter(<HomeView game={gameWith([])} friendsOpening={0}
      onShowInbox={noop} onShowCollection={noop} onOpen={noop} onUseHourglass={noop} onShowOdds={noop} onShowAtelier={noop} opening={false} usingHourglass={false}
      now={NOW} serverReserve={false} needsAccount={needsAccount} onEditCircle={onEditCircle} />);
    return onEditCircle;
  }

  it("un joueur sans cercle voit « Définir mes chaînes »", async () => {
    const onEditCircle = await home();
    expect(document.querySelector(".circle-invite h2")!.textContent).toBe("Quelles chaînes regardes-tu ?");
    banc.appuyer(/Définir mes chaînes/);
    expect(onEditCircle).toHaveBeenCalledOnce();
  });

  it("garde Définir mes chaînes sans cercle, même sans compte", async () => {
    await home({ needsAccount: true });
    expect(document.querySelector(".circle-invite")!.textContent).toContain("Définir mes chaînes");
  });

  it("avec un cercle : « Modifier » sur la rangée, et les jetons sur une seule ligne", async () => {
    window.localStorage.setItem("creatordeck.circle.v1", JSON.stringify({ v: 1, slugs: CIRCLE, at: 1 }));
    const onEditCircle = await home();
    expect(document.querySelector(".circle-invite")).toBeNull();
    banc.appuyer("Modifier");
    expect(onEditCircle).toHaveBeenCalledOnce();
    const tokens = document.querySelector(".drop-secondary .token-row, .token-row")!;
    expect(tokens.closest("details.drop-token-details")).toBeNull();
  });

  it("avec un cercle, MEMES est visible à droite dès le premier lancement", async () => {
    window.localStorage.setItem("creatordeck.circle.v1", JSON.stringify({ v: 1, slugs: CIRCLE, at: 1 }));
    const universes = () => [...document.querySelectorAll('[aria-label="Choisir un univers"] button')].map((b) => b.textContent?.trim());
    const noop = () => {};
    const mount = async (openings: number) => {
      const state = { ...createInitialState(NOW), openings };
      await banc.monter(<HomeView game={getGameView(state, NOW)} friendsOpening={0}
        onShowInbox={noop} onShowCollection={noop} onOpen={noop} onUseHourglass={noop} onShowOdds={noop} onShowAtelier={noop} opening={false} usingHourglass={false}
        now={NOW} serverReserve={false} needsAccount={false} />);
    };
    // Nuit de direct : MEMES est un second paquet visible dès le départ, Live devant.
    await mount(0);
    expect(universes()).toEqual(["Live Drop", "MEMES"]);
    expect(document.querySelector('[data-booster="live"]')!.getAttribute("data-active")).toBe("true");
    expect(document.querySelector('[data-booster="memes"] .booster-neighbor')).not.toBeNull();
    expect(document.querySelector(".memes-unlock-note")).toBeNull();
  });

  it("D-142 : la garantie Légendaire annonce une de tes chaînes tant qu'une Légendaire du cercle manque", async () => {
    window.localStorage.setItem("creatordeck.circle.v1", JSON.stringify({ v: 1, slugs: CIRCLE, at: 1 }));
    await home();
    expect(document.querySelector(".pity-row")!.textContent).toContain("· une de tes chaînes");
  });

  it("D-142 : rien à promettre quand toutes les Légendaires du cercle sont obtenues", async () => {
    // CIRCLE ne contient qu'une Légendaire (ibai).
    window.localStorage.setItem("creatordeck.circle.v1", JSON.stringify({ v: 1, slugs: CIRCLE, at: 1 }));
    const noop = () => {};
    await banc.monter(<HomeView game={gameWith(["ibai"])} friendsOpening={0}
      onShowInbox={noop} onShowCollection={noop} onOpen={noop} onUseHourglass={noop} onShowOdds={noop} onShowAtelier={noop} opening={false} usingHourglass={false}
      now={NOW} serverReserve={false} needsAccount={false} />);
    expect(document.querySelector(".pity-row")!.textContent).not.toContain("une de tes chaînes");
  });

  it("0056 : l'accueil annonce le retour au classement seulement quand le cercle est complet", async () => {
    window.localStorage.setItem("creatordeck.circle.v1", JSON.stringify({ v: 1, slugs: CIRCLE, at: 1 }));
    const noop = () => {};
    await banc.monter(<HomeView game={gameWith(CIRCLE)} friendsOpening={0}
      onShowInbox={noop} onShowCollection={noop} onOpen={noop} onUseHourglass={noop} onShowOdds={noop} onShowAtelier={noop} opening={false} usingHourglass={false}
      now={NOW} serverReserve={false} needsAccount={false} />);
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
