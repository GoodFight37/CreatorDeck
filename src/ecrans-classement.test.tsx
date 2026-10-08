/**
 * Le classement mondial **feuilleté** : cent joueurs reçus, vingt par page.
 *
 * Ce que ce banc surveille : le panneau affiche vingt lignes (pas cent), la
 * phrase du pager dit la vérité, les flèches changent de page, changer de tri
 * ramène à la première page, et un classement court **n'affiche pas de pager du
 * tout** — un pager à un seul cran est un bouton qui ne fait rien.
 *
 * Le réseau n'existe pas ici : `useCloud` est remplacé par un état figé de cent
 * joueurs, et `cloudStore.loadLeaderboard` (appelé par les boutons de tri)
 * retombe sur le store réel, qui ne fait rien sans cloud configuré — c'est
 * exactement ce qu'on veut : ce banc regarde l'**affichage**, pas la requête.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { creerBanc, type Banc } from "@/ecrans-banc";

/** Cent joueurs, rangs 1 à 100 : de quoi remplir cinq pages. */
const CENT = Array.from({ length: 100 }, (_, index) => ({
  rank: index + 1,
  userId: `u-${String(index + 1).padStart(3, "0")}`,
  displayName: `Joueur ${index + 1}`,
  uniqueCreators: 1_000 - index,
  totalCards: 2_000 - index,
  legendaryCards: 100 - Math.floor(index / 2),
  goldCards: 50 - Math.floor(index / 4),
  familyOwned: 300 - index,
  familyTotal: 400,
  completion: Math.max(0, 1 - index / 100),
}));

const monde = vi.hoisted(() => ({
  surcharge: {
    configured: true,
    userId: "11111111-1111-4111-8111-111111111111",
    leaderboardMetric: "unique_creators" as string,
    leaderboardRegion: null as string | null,
    leaderboard: [] as unknown[],
    busy: false,
  },
}));

vi.mock("@/hooks/use-cloud", () => ({
  useCloud: () => ({ ...monde.surcharge }),
}));

describe("le classement mondial", () => {
  let banc: Banc;

  beforeEach(() => {
    banc = creerBanc();
    banc.preparer();
    monde.surcharge.leaderboard = CENT;
  });

  afterEach(() => {
    banc.nettoyer();
  });

  async function classement() {
    const { LeaderboardSection } = await import("@/components/account/leaderboard-section");
    await banc.monter(<LeaderboardSection />);
  }

  /** Les rangs réellement posés dans le DOM. */
  function rangs() {
    return [...document.querySelectorAll(".leaderboard-row b")].map((n) => Number(n.textContent));
  }

  it("pose vingt lignes sur cent, et le dit", async () => {
    await classement();
    banc.ecran("43-classement-page-1");

    // Vingt lignes, pas cent : c'est tout l'intérêt du pager.
    expect(rangs()).toHaveLength(20);
    expect(rangs()[0]).toBe(1);
    expect(rangs().at(-1)).toBe(20);
    expect(document.querySelector(".leaderboard li")?.textContent).toContain("Joueur 1");
    // Le pager compte les joueurs reçus, pas ceux de la page.
    expect(document.querySelector(".binder-pager")?.textContent).toContain("Page 1 sur 5 · 100 joueurs");
  });

  it("avance et recule d'une page, sans perdre le compte", async () => {
    await classement();
    banc.appuyer("Suivant");
    banc.ecran("44-classement-page-2");
    expect(rangs()[0]).toBe(21);
    expect(rangs().at(-1)).toBe(40);
    expect(document.querySelector(".binder-pager")?.textContent).toContain("Page 2 sur 5");

    banc.appuyer("Suivant");
    expect(rangs()[0]).toBe(41);

    banc.appuyer("Précédent");
    expect(rangs()[0]).toBe(21);

    // Le dernier cran : la flèche « Suivant » s'éteint, « Précédent » reste.
    for (let i = 0; i < 5; i += 1) banc.appuyer("Suivant");
    banc.ecran("45-classement-derniere-page");
    expect(rangs()[0]).toBe(81);
    expect(rangs().at(-1)).toBe(100);
    const suivants = [...document.querySelectorAll<HTMLButtonElement>(".binder-pager button")];
    expect(suivants.at(-1)?.disabled).toBe(true);
    expect(suivants[0]?.disabled).toBe(false);
  });

  it("ramène à la première page quand on change de tri", async () => {
    await classement();
    banc.appuyer("Suivant");
    banc.appuyer("Suivant");
    expect(document.querySelector(".binder-pager")?.textContent).toContain("Page 3 sur 5");

    // Changer de tri : la page 3 d'un autre classement ne veut rien dire.
    banc.appuyer("Gold");
    expect(document.querySelector(".binder-pager")?.textContent).toContain("Page 1 sur 5");
    expect(rangs()[0]).toBe(1);
  });

  it("n'affiche aucun pager quand tout tient sur une page", async () => {
    monde.surcharge.leaderboard = CENT.slice(0, 7);
    await classement();
    banc.ecran("46-classement-une-page");

    expect(rangs()).toHaveLength(7);
    expect(document.querySelector(".binder-pager")).toBeNull();
    // Et le reste du panneau est toujours là : sept lignes, puis l'explication.
    expect(document.body.textContent).toContain("Classement mondial");
  });

  it("ne pose rien du tout quand le classement est vide", async () => {
    monde.surcharge.leaderboard = [];
    await classement();
    expect(document.querySelectorAll(".leaderboard-row")).toHaveLength(0);
    expect(document.querySelector(".binder-pager")).toBeNull();
    expect(document.body.textContent).toContain("Personne au classement");
  });
});
