/**
 * Le Tribunal des Bannis **au doigt** : le ticket, les deux gros boutons, la
 * réaction du chat, et le bilan.
 *
 * Le calcul est vérifié à part (`src/lib/tribunal.test.ts`) et la sauvegarde
 * aussi (`src/lib/game-engine.test.ts`). Ce que ce banc regarde, c'est ce
 * qu'aucun test unitaire ne peut voir :
 *
 *   * que le ticket montre les quatre choses à lire (pseudo, motif, pièce,
 *     plaidoyer) **avant** les boutons ;
 *   * qu'une grâce et un ban **s'entendent** — et que l'interrupteur du joueur
 *     coupe les deux (le son du Tribunal n'a pas le droit d'être une exception) ;
 *   * qu'une séance quittée au deuxième dossier **reprend au troisième** : c'est
 *     la promesse « pas de reset en boucle », vue depuis l'écran ;
 *   * que le bilan récapitule les cinq verdicts et annonce la récompense.
 *
 * L'état de la séance vit **à l'extérieur** du composant (dans le harnais),
 * comme dans l'application où c'est la sauvegarde qui tient les verdicts.
 */
import { act, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { creerBanc, type Banc } from "@/ecrans-banc";
import { TribunalView } from "@/components/tribunal-view";
import { CREATOR_BY_SLUG, type Creator } from "@/lib/catalog";
import { EMPTY_LIVE, type LiveSnapshot, type LiveStream } from "@/lib/live";
import { gameDay } from "@/lib/progression";
import { setMuted } from "@/lib/sfx";
import { dossiersDuJour } from "@/lib/tribunal";
import type { OwnedCard, TribunalSeance } from "@/lib/game-engine";

const T0 = Date.UTC(2026, 9, 8, 12, 0, 0);
const JOUR = gameDay(T0);
const JOUEUSE = "joueuse-de-test";

/** Le compteur de sons du banc (oscillateurs réellement créés). */
function compteur() {
  return (globalThis as unknown as { __sons: { oscillateurs: number; bruitages: number } }).__sons;
}

/** Un créateur du catalogue, pour présider et pour fabriquer un direct. */
function premierCreateur(): Creator {
  const creator = [...CREATOR_BY_SLUG.values()][0];
  if (!creator) throw new Error("catalogue vide dans le banc du Tribunal");
  return creator;
}

function direct(creator: Creator): LiveSnapshot {
  const stream: LiveStream = {
    login: creator.login.toLowerCase(),
    displayName: creator.displayName,
    gameName: "Just Chatting",
    title: "Le Tribunal siège",
    viewers: 1_204,
    startedAt: new Date(T0 - 600_000).toISOString(),
  };
  return {
    ...EMPTY_LIVE,
    byLogin: new Map([[creator.login.toLowerCase(), stream]]),
    count: 1,
    refreshedAt: T0,
    stale: false,
    configured: true,
  };
}

/**
 * Le harnais : la séance est tenue **dehors**, comme par la sauvegarde, et le
 * Tribunal ne garde que ce qu'il montre.
 */
function Harness({
  etat,
  mesCartes,
  live,
}: {
  etat: { seance: TribunalSeance; paiements: number[] };
  mesCartes: OwnedCard[];
  live: LiveSnapshot;
}) {
  const [seance, setSeance] = useState<TribunalSeance>(etat.seance);
  return (
    <TribunalView
      playerId={JOUEUSE}
      seance={seance}
      cards={mesCartes}
      live={live}
      now={T0}
      onVerdict={(dossierId, verdict) =>
        setSeance((actuelle) => {
          const suivante = {
            ...actuelle,
            verdicts: { ...actuelle.verdicts, [dossierId]: verdict },
          };
          etat.seance = suivante;
          return suivante;
        })
      }
      onClaim={async (request) => {
        etat.paiements.push(request.points);
        return { status: "done", message: `Séance payée : +${request.points} points.`, delta: request.points };
      }}
      onClose={() => {}}
    />
  );
}

describe("le Tribunal des Bannis", () => {
  let banc: Banc;

  beforeEach(() => {
    vi.useFakeTimers({ now: T0 });
    banc = creerBanc();
    banc.preparer();
  });

  afterEach(() => {
    banc.nettoyer();
    vi.useRealTimers();
    window.localStorage.clear();
    setMuted(false);
  });

  it.each([
    ["refus", { status: "refused", message: "Service temporairement indisponible", delta: 0 }, "Service temporairement indisponible"],
    ["erreur réseau", new Error("réseau coupé"), "Récompense indisponible"],
  ])("garde la réclamation disponible après %s", async (_scenario, firstOutcome, alertText) => {
    const verdicts = Object.fromEntries(dossiersDuJour(JOUR, JOUEUSE).map((dossier) => [dossier.id, "ban" as const]));
    const onClaim = vi.fn();
    if (firstOutcome instanceof Error) onClaim.mockRejectedValueOnce(firstOutcome);
    else onClaim.mockResolvedValueOnce(firstOutcome);
    onClaim.mockResolvedValueOnce({ status: "done", message: "Séance payée", delta: 10 });
    await banc.monter(<TribunalView playerId={JOUEUSE}
      seance={{ day: JOUR, verdicts, claimed: false }} cards={[]} live={EMPTY_LIVE} now={T0}
      onVerdict={() => {}} onClaim={onClaim} onClose={() => {}} />);
    const reclamer = () => [...document.querySelectorAll<HTMLButtonElement>("button")]
      .find((button) => button.textContent?.trim() === "Réclamer la récompense")!;
    await act(async () => { reclamer().click(); });
    expect(document.querySelector(".tribunal-alerte")?.textContent).toContain(alertText);
    expect(reclamer().disabled).toBe(false);
    await act(async () => { reclamer().click(); });
    expect(onClaim).toHaveBeenCalledTimes(2);
    expect(document.querySelector(".tribunal-paye")?.textContent).toContain("Séance payée");
    expect(document.querySelector(".tribunal-alerte")).toBeNull();
  });

  /**
   * Monte le Tribunal. `etat` joue le rôle de la sauvegarde : il survit à un
   * démontage, ce qui permet de « quitter et revenir ».
   */
  async function ouvrir(options: { mesCartes?: OwnedCard[]; live?: LiveSnapshot } = {}) {
    const createur = premierCreateur();
    const mesCartes = options.mesCartes ?? [
      {
        id: "carte-0",
        creatorSlug: createur.slug,
        rarity: "rare" as const,
        variant: "standard" as const,
        obtainedAt: T0,
        rareDrop: false,
      },
    ];
    const live = options.live ?? EMPTY_LIVE;
    const etat: { seance: TribunalSeance; paiements: number[] } = {
      seance: { day: JOUR, verdicts: {}, claimed: false },
      paiements: [],
    };

    async function rendre() {
      await banc.monter(<Harness etat={etat} mesCartes={mesCartes} live={live} />);
    }
    await rendre();

    /** Choisit la première carte proposée (le classeur n'est pas vide). */
    function presider() {
      const choix = document.querySelector<HTMLButtonElement>(".tribunal-choice");
      if (!choix) return;
      act(() => {
        choix.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
      });
    }

    /** Rend un verdict, laisse la réaction s'afficher, puis passe au suivant. */
    async function juger(verdict: "deban" | "ban") {
      await banc.appuyerEtAttendre(verdict === "deban" ? "Accorder la grâce" : "Maintenir le ban");
      await act(async () => {
        await Promise.resolve();
      });
      const suivant = [...document.querySelectorAll<HTMLButtonElement>("button")].find(
        (bouton) => (bouton.textContent ?? "").trim() === "Dossier suivant" || (bouton.textContent ?? "").trim() === "Voir le bilan",
      );
      if (suivant) {
        act(() => {
          suivant.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
        });
      }
    }

    return { presider, juger, etat, rendre };
  }

  it.each(["choix", "séance", "bilan"])("confine le clavier et restaure le focus : %s", async (etat) => {
    const visible = vi.spyOn(HTMLElement.prototype, "getClientRects").mockReturnValue({ length: 1 } as DOMRectList);
    const entree = document.createElement("button");
    document.body.append(entree);
    entree.focus();
    const onClose = vi.fn();
    const verdicts = etat === "bilan"
      ? Object.fromEntries(dossiersDuJour(JOUR, JOUEUSE).map((dossier) => [dossier.id, "ban" as const]))
      : {};
    try {
      await banc.monter(<TribunalView playerId={JOUEUSE}
        seance={{ day: JOUR, verdicts, claimed: false }}
        cards={etat === "choix" ? [{ id: "president", creatorSlug: premierCreateur().slug,
          rarity: "rare", variant: "standard", obtainedAt: T0, rareDrop: false }] : []}
        live={EMPTY_LIVE} now={T0} onVerdict={() => {}}
        onClaim={async () => ({ status: "done", message: "", delta: 0 })} onClose={onClose} />);
      const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
      expect(document.activeElement).toBe(dialog);
      expect(entree.inert).toBe(true);
      expect(dialog.closest("[inert]")).toBeNull();
      const controls = dialog.querySelectorAll<HTMLButtonElement>("button:not(:disabled)");
      const first = controls[0];
      const last = controls[controls.length - 1];
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", shiftKey: true, bubbles: true }));
      expect(document.activeElement).toBe(last);
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }));
      expect(document.activeElement).toBe(first);
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      expect(onClose).toHaveBeenCalledTimes(1);
      banc.vider();
      expect(document.activeElement).toBe(entree);
      expect(entree.inert).not.toBe(true);
    } finally {
      entree.remove();
      visible.mockRestore();
    }
  });

  it("transmet le focus au bilan après les cinq dossiers", async () => {
    const { presider, juger } = await ouvrir();
    presider();
    for (let i = 0; i < 5; i++) await juger("ban");
    const bilan = document.querySelector<HTMLElement>('[aria-label="Bilan de la séance"]');
    expect(bilan).not.toBeNull();
    expect(document.activeElement).toBe(bilan);
    expect(bilan?.closest("[inert]")).toBeNull();
  });

  it("montre le dossier à lire avant les boutons", async () => {
    const { presider } = await ouvrir();
    presider();

    const dossier = dossiersDuJour(JOUR, JOUEUSE)[0]!;
    const ticket = banc.ecran("52-tribunal-ticket");
    // Les quatre choses qu'on lit avant de juger : qui, pourquoi, la pièce, et
    // ce qu'il répond.
    expect(ticket, "le pseudo a disparu du ticket").toContain(dossier.username);
    expect(ticket, "le motif a disparu du ticket").toContain(dossier.banReason);
    expect(document.querySelector(".tribunal-evidence blockquote")?.textContent).toBe(
      dossier.chatMessage,
    );
    expect(document.querySelector(".tribunal-appeal p")?.textContent).toBe(dossier.appealText);
    // Les deux gros boutons, grâce puis ban, dans cet ordre.
    const actions = [...document.querySelectorAll<HTMLButtonElement>(".tribunal-actions button")];
    expect(actions.map((bouton) => (bouton.textContent ?? "").trim())).toEqual([
      "Accorder la grâce",
      "Maintenir le ban",
    ]);
    expect(document.querySelectorAll(".tribunal-badge").length).toBeGreaterThan(0);
  });

  it("fait entendre la grâce et le marteau, et se tait quand le son est coupé", async () => {
    const { presider, juger } = await ouvrir();
    presider();
    const sons = compteur();

    const avant = sons.oscillateurs;
    await juger("deban");
    const apresGrace = sons.oscillateurs;
    expect(apresGrace, "la grâce n'a pas sonné").toBeGreaterThan(avant);

    await juger("ban");
    expect(sons.oscillateurs, "le marteau n'a pas sonné").toBeGreaterThan(apresGrace);

    // L'interrupteur du joueur coupe le Tribunal comme le reste du jeu.
    setMuted(true);
    const avantMuet = sons.oscillateurs;
    await juger("deban");
    await juger("ban");
    expect(sons.oscillateurs, "le Tribunal a sonné malgré le silence").toBe(avantMuet);
  });

  it("reprend au troisième dossier quand on quitte et qu'on revient", async () => {
    const { presider, juger, etat, rendre } = await ouvrir();
    presider();
    await juger("ban");
    await juger("ban");
    expect(Object.keys(etat.seance.verdicts)).toHaveLength(2);

    // L'écran est quitté, puis rouvert avec la même sauvegarde : les deux
    // verdicts sont toujours là, et c'est le **troisième** dossier qui
    // s'affiche — pas le premier, et sans rejouer ceux qui sont rendus.
    banc.vider();
    await rendre();
    presider();

    const tirage = dossiersDuJour(JOUR, JOUEUSE);
    expect(document.querySelector(".tribunal-count")?.textContent).toContain("3");
    expect(document.body.innerHTML).toContain(tirage[2]!.username);
    expect(document.querySelector(".tribunal-evidence blockquote")?.textContent).toBe(
      tirage[2]!.chatMessage,
    );
    banc.ecran("52-tribunal-reprise");
  });

  it("résume les cinq verdicts et paie la séance", async () => {
    const { presider, juger, etat } = await ouvrir();
    presider();
    for (let i = 0; i < 5; i += 1) await juger("ban");

    const bilan = banc.ecran("52-tribunal-bilan");
    expect(document.querySelectorAll(".tribunal-lignes li")).toHaveLength(5);
    // Le karma est une vraie jauge : la valeur est lisible par une technologie
    // d'assistance, pas seulement dessinée.
    const jauge = document.querySelector<HTMLElement>('[role="progressbar"]');
    expect(jauge?.getAttribute("aria-valuenow")).toBeTruthy();
    expect(bilan).toContain("Karma de modération");
    // La récompense est versée à la cinquième décision : aucun bouton à oublier.
    expect(etat.paiements.length, "la séance n'a pas été encaissée").toBe(1);
    expect(bilan).toContain("Séance payée");
    expect(bilan.split(`+${etat.paiements[0]} points`).length - 1).toBe(1);
    expect(bilan).toContain("Fermer le bilan");
    expect(bilan).not.toContain("Retour au Drop");
  });

  it("double la séance quand le créateur qui préside est en direct", async () => {
    const { presider } = await ouvrir({ live: direct(premierCreateur()) });
    presider();

    // Le badge rouge, et le multiplicateur annoncé avant de juger.
    const badge = document.querySelector(".tribunal-live");
    expect(badge, "le badge « en direct » ne s'affiche pas").toBeTruthy();
    expect(badge?.textContent).toContain("EN DIRECT");
    expect(badge?.textContent).toContain("×2");
    banc.ecran("52-tribunal-direct");
  });

  it("garde la journée du jour, même quand la sauvegarde n'en a aucune", async () => {
    // Le bug qui a rendu les boutons morts (8 octobre 2026, au soir) : une
    // sauvegarde neuve porte `day: ""`. L'écran tirait les dossiers de cette
    // journée vide, le moteur rangeait le verdict dans celle du jour — les deux
    // tiroirs étaient différents, le verdict était refusé, et **l'appui ne
    // faisait rien**, pour toujours puisque rien n'était jamais enregistré.
    const { presider, etat } = await ouvrir();
    presider();

    // Une sauvegarde neuve : pas de journée, pas de verdict. On juge « à la
    // main » (sans enchaîner sur « Dossier suivant ») pour regarder l'écran au
    // moment exact où l'appui aurait dû mourir.
    etat.seance = { day: "", verdicts: {}, claimed: false };
    await banc.appuyerEtAttendre("Accorder la grâce");
    await act(async () => {
      await Promise.resolve();
    });

    expect(Object.keys(etat.seance.verdicts), "le verdict n'a pas été enregistré").toHaveLength(1);
    expect(document.querySelector(".tribunal-reaction")).toBeTruthy();
    expect(document.querySelector(".tribunal-alerte")).toBeNull();
  });

  it("passe automatiquement au dossier suivant après la réaction", async () => {
    const { presider } = await ouvrir();
    presider();
    await banc.appuyerEtAttendre("Accorder la grâce");
    expect(document.querySelector(".tribunal-reaction")).toBeTruthy();
    await act(async () => { await vi.advanceTimersByTimeAsync(600); });
    expect(document.querySelector(".tribunal-reaction")).toBeNull();
    expect(document.querySelector(".tribunal-count")?.textContent).toContain("Dossier 2");
  });

  it("s'ouvre depuis les activités repliées d'Objectifs", async () => {
    const { CreatorDeckApp } = await import("@/components/creator-deck-app");
    await banc.monter(<CreatorDeckApp />);
    expect(document.querySelector(".home-view")!.textContent).not.toContain("Tribunal");
    await banc.appuyerEtAttendre("Objectifs");
    const details = [...document.querySelectorAll("details")].find((d) => d.querySelector("summary")?.textContent === "Autres activités")!;
    expect(details.open).toBe(false);
    await banc.appuyerEtAttendre("Tribunal des Bannis");

    // Le classeur est vide sur une partie neuve : le Tribunal siège quand même.
    expect(document.querySelector(".tribunal-overlay")).toBeTruthy();
    expect(document.querySelector(".tribunal-ticket")).toBeTruthy();

    // Et le **premier** verdict passe, avec une sauvegarde qui n'a jamais siégé.
    // C'est ici que le bug des boutons morts se voyait : l'écran tirait les
    // dossiers de la journée vide de la sauvegarde, le moteur rangeait le verdict
    // dans celle du jour, et l'appui mourait sans rien dire. Ce test monte
    // l'application entière (donc le vrai moteur), lui seul a des dents.
    await banc.appuyerEtAttendre("Accorder la grâce");
    await act(async () => {
      await Promise.resolve();
    });
    expect(document.querySelector(".tribunal-reaction"), "le premier verdict n'a rien fait").toBeTruthy();
    expect(document.querySelector(".tribunal-alerte")).toBeNull();
    banc.ecran("53-tribunal-ouvert");
  });

  it("siège quand même avec un classeur vide", async () => {
    // Personne pour présider : le Tribunal se tient, sans bonus de direct.
    await ouvrir({ mesCartes: [] });
    expect(document.querySelector(".tribunal-choice")).toBeNull();
    expect(document.querySelector(".tribunal-seat-vide")).toBeTruthy();
    expect(document.querySelector(".tribunal-ticket")).toBeTruthy();
    banc.ecran("52-tribunal-sans-carte");
  });
});
