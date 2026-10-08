/**
 * Le garde-fou des **1 000 cartes** : ce que le DOM porte vraiment.
 *
 * La feuille de route promet « un scroll fluide sur les 1 000 cartes ». Un
 * téléphone ne rame pas parce qu'un tableau contient mille entrées — il rame
 * parce que **mille nœuds** sont posés dans le document : mille images à
 * décoder, mille mises en page à recalculer, à chaque frappe dans la recherche.
 * Rien ne rattrape ça après coup, sinon ne pas les poser.
 *
 * Ce banc **compte** au lieu de chronométrer : une durée en jsdom ne dit rien du
 * téléphone du joueur (et changerait à chaque machine), alors que le nombre de
 * cartes et de portraits présents dans le DOM est un coût réel, et il est
 * **déterministe**. Le catalogue embarqué fait bien `CATALOG_SIZE` entrées
 * (vérifié ici, sinon le banc ne prouverait rien), et chaque écran de liste est
 * traversé dans son pire cas : collection **complète**, recherche qui matche
 * des centaines de noms, dernier page, onglet des doublons.
 *
 * Si un jour quelqu'un remplace une pagination par un `.map()` sur le
 * catalogue, ce banc tombe — et il tombe avant le téléphone.
 */
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { creerBanc, type Banc } from "@/ecrans-banc";

import { CATALOG_SIZE, CREATORS } from "@/lib/catalog";
import { createInitialState, getGameView, type PlayerState } from "@/lib/game-engine";

const T0 = Date.UTC(2026, 9, 8, 12, 0, 0);

/** Une page de classeur : 9 pochettes (3 × 3). */
const CARTES_PAR_PAGE = 9;
/** Une page d'Atelier : 20 lignes. */
const LIGNES_PAR_PAGE = 20;

/** Le catalogue embarqué, tel que le joueur le reçoit. */
const CATALOGUE = [...CREATORS];

vi.mock("@/hooks/use-game", () => ({ useNow: () => T0 }));
vi.mock("@/hooks/use-live", () => ({
  useLive: () => ({
    byLogin: new Map(),
    count: 0,
    refreshedAt: null,
    stale: true,
    loading: false,
    configured: false,
    error: null,
  }),
}));
vi.mock("@/hooks/use-points", () => ({
  usePoints: () => ({
    serverSide: false,
    recycle: async () => ({ status: "done" }),
    recycleAll: async () => ({ status: "done" }),
    craft: async () => ({ status: "done" }),
    claimMilestone: async () => ({ status: "done" }),
    claimSeason: async () => ({ status: "done" }),
  }),
}));

/** Tout le catalogue possédé : le pire cas du classeur. */
function collectionComplete(now: number): PlayerState {
  const state = createInitialState(now);
  state.cards = CATALOGUE.map((creator, index) => ({
    id: `carte-${index}`,
    creatorSlug: creator.slug,
    rarity: creator.rarity,
    variant: "standard" as const,
    obtainedAt: now - index * 1_000,
    rareDrop: false,
  }));
  return state;
}

/** Et par-dessus, des doublons : un sur trois, soit ~330 groupes à recycler. */
function avecDoublons(state: PlayerState, now: number): PlayerState {
  const doublons = state.cards
    .filter((_, index) => index % 3 === 0)
    .map((card, index) => ({ ...card, id: `doublon-${index}`, obtainedAt: now - index }));
  return { ...state, cards: [...state.cards, ...doublons] };
}

/** Combien de cartes et de portraits le document porte à cet instant. */
function pose() {
  return {
    cartes: document.querySelectorAll(".creator-card").length,
    lignes: document.querySelectorAll(".atelier-row").length,
    portraits: document.querySelectorAll("img").length,
  };
}

describe("mille cartes dans le classeur", () => {
  let banc: Banc;
  beforeEach(() => {
    banc = creerBanc();
    banc.preparer();
  });
  afterEach(() => banc.nettoyer());

  it("a bien les mille créateurs sous la main (sinon ce banc ne prouve rien)", () => {
    expect(CATALOG_SIZE).toBe(1_000);
    expect(collectionComplete(T0).cards).toHaveLength(CATALOG_SIZE);
  });

  it("ne pose qu'une page de cartes, même avec tout le catalogue possédé", async () => {
    const { CollectionView } = await import("@/components/binder-view");
    const game = getGameView(collectionComplete(T0), T0);
    expect(game.stats.uniqueCreators).toBe(CATALOG_SIZE);

    await banc.monter(<CollectionView game={game} onCraft={async () => true} />);

    // Le classeur s'ouvre sur ce qu'on possède : 1 000 cartes, 112 pages.
    expect(document.body.textContent).toContain(`/ ${CATALOG_SIZE}`);
    expect(pose().cartes).toBe(CARTES_PAR_PAGE);
    // Neuf portraits, pas mille : c'est le décodage d'images qui coûte.
    expect(pose().portraits).toBeLessThanOrEqual(CARTES_PAR_PAGE + 3);

    // Feuilleter ne change rien au poids : la page suivante remplace la
    // précédente, elle ne s'y ajoute pas.
    for (let tour = 0; tour < 3; tour += 1) {
      banc.appuyer(/^Suivant/);
      expect(pose().cartes).toBe(CARTES_PAR_PAGE);
      expect(pose().portraits).toBeLessThanOrEqual(CARTES_PAR_PAGE + 3);
    }
    expect(document.body.textContent).toContain("Page 4");
  });

  it("garde le plafond quand la recherche matche des centaines de noms", async () => {
    const { CollectionView } = await import("@/components/binder-view");
    const game = getGameView(collectionComplete(T0), T0);
    await banc.monter(<CollectionView game={game} onCraft={async () => true} />);

    // « a » est dans une grande partie des noms du catalogue : c'est le pire
    // cas d'une recherche, celui où un `.map()` non coupé se verrait tout de
    // suite.
    const champ = document.querySelector<HTMLInputElement>('input[aria-label="Rechercher un créateur"]');
    expect(champ).not.toBeNull();
    banc.saisir(champ!, "a");

    expect(pose().cartes).toBeLessThanOrEqual(CARTES_PAR_PAGE);
    expect(pose().cartes).toBeGreaterThan(0);
    expect(pose().cartes).toBe(CARTES_PAR_PAGE);
    expect(pose().portraits).toBeLessThanOrEqual(CARTES_PAR_PAGE + 3);
  });

  it("ne pose jamais plus d'une page quand on filtre par rareté", async () => {
    const { CollectionView } = await import("@/components/binder-view");
    const game = getGameView(collectionComplete(T0), T0);
    await banc.monter(<CollectionView game={game} onCraft={async () => true} />);

    banc.appuyer(/^Communes/);
    expect(pose().cartes).toBe(CARTES_PAR_PAGE);
    banc.appuyer(/^Légendaires/);
    expect(pose().cartes).toBe(CARTES_PAR_PAGE);
    banc.appuyer(/^Toutes/);
    expect(pose().cartes).toBe(CARTES_PAR_PAGE);
  });
});

describe("mille créateurs dans l'Atelier", () => {
  let banc: Banc;
  beforeEach(() => {
    banc = creerBanc();
    banc.preparer();
  });
  afterEach(() => banc.nettoyer());

  it("ne pose qu'une page de créateurs manquants", async () => {
    const { AtelierView } = await import("@/components/atelier-view");
    const game = getGameView(createInitialState(T0), T0);
    expect(game.stats.uniqueCreators).toBe(0);

    await banc.monter(
      <AtelierView game={game} onNotice={() => {}} onError={() => {}} />,
    );

    // « Page 1 / 50 · 1000 manquants » : les comptes sont ceux du catalogue.
    expect(document.body.textContent).toContain(`Page 1 / ${Math.ceil(CATALOG_SIZE / LIGNES_PAR_PAGE)}`);
    expect(pose().lignes).toBe(LIGNES_PAR_PAGE);
    expect(pose().portraits).toBeLessThanOrEqual(LIGNES_PAR_PAGE);

    banc.appuyer(/^Suivant/);
    expect(document.body.textContent).toContain("Page 2");
    expect(pose().lignes).toBe(LIGNES_PAR_PAGE);
  });

  it("ne pose qu'une page de doublons, même avec trois cents groupes", async () => {
    const { AtelierView } = await import("@/components/atelier-view");
    const state = avecDoublons(collectionComplete(T0), T0);
    const game = getGameView(state, T0);
    const groupes = state.cards.length - CATALOG_SIZE;
    expect(game.stats.duplicates).toBe(groupes);

    await banc.monter(
      <AtelierView game={game} onNotice={() => {}} onError={() => {}} />,
    );

    // L'onglet dit la vérité : le nombre de doublons recyclables ne bouge pas.
    banc.appuyer(/^Recycler/);
    expect(document.body.textContent).toContain(`Recycler (${groupes})`);

    // Et la liste, elle, tient sur une page — la deuxième se demande. Le
    // nombre total de doublons reste affiché à côté du feuilletage : c'est le
    // chiffre qui compte pour le joueur, pas la page qu'il regarde.
    expect(document.body.textContent).toContain(
      `Page 1 / ${Math.ceil(groupes / LIGNES_PAR_PAGE)} · ${groupes} doublons`,
    );
    expect(pose().lignes).toBe(LIGNES_PAR_PAGE);
    expect(pose().portraits).toBeLessThanOrEqual(LIGNES_PAR_PAGE);

    banc.ecran("32-atelier-doublons");
    banc.appuyer(/^Suivant/);
    expect(document.body.textContent).toContain("Page 2");
    expect(pose().lignes).toBe(LIGNES_PAR_PAGE);
    // « Tout recycler » ne connaît pas la page : le bouton emporte **tous** les
    // doublons recyclables, comme avant.
    expect(document.body.textContent).toContain("Tout recycler");
  });
});
