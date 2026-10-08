/**
 * Le réglage du son **au doigt** : l'interrupteur, et les trois crans de volume.
 *
 * Ce que le banc regarde, et rien d'autre : que l'interrupteur existe et dise la
 * vérité, que le volume apparaisse **sous** lui quand le son est actif (et
 * disparaisse quand il est coupé), qu'un appui marque le cran choisi, et que le
 * choix soit **gardé** — c'est un réglage qu'on cherche une fois parce qu'un son
 * dérange, pas à chaque lancement.
 */
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { creerBanc, type Banc } from "@/ecrans-banc";

const T0 = Date.UTC(2026, 9, 8, 12, 0, 0);

describe("le réglage du son", () => {
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
  });

  async function ecranToi() {
    const { CreatorDeckApp } = await import("@/components/creator-deck-app");
    await banc.monter(<CreatorDeckApp />);
    banc.appuyer("Toi");
  }

  function chips() {
    return [...document.querySelectorAll<HTMLButtonElement>(".sound-row .sound-chip")];
  }

  it("montre l'interrupteur du son, et le volume juste en dessous", async () => {
    await ecranToi();
    const son = [...document.querySelectorAll<HTMLButtonElement>(".menu-row")].find(
      (bouton) => bouton.getAttribute("role") === "switch" && bouton.textContent?.includes("Son"),
    );
    expect(son, "l'interrupteur du son a disparu de l'écran Toi").toBeTruthy();
    expect(son!.getAttribute("aria-checked")).toBe("true");

    // Le volume n'est pas un curseur : trois crans, nommés.
    expect(chips().map((chip) => chip.textContent)).toEqual(["Discret", "Normal", "Fort"]);
    const actif = chips().find((chip) => chip.getAttribute("aria-pressed") === "true");
    expect(actif?.textContent).toBe("Normal");
    banc.ecran("41-toi-son");
  });

  it("garde le cran choisi, et le dit à l'écran", async () => {
    await ecranToi();
    const discret = chips().find((chip) => chip.textContent === "Discret")!;
    banc.appuyer("Discret");
    expect(discret.getAttribute("aria-pressed")).toBe("true");
    // Le choix est mémorisé : c'est le module du son qui le relira au prochain
    // démarrage (le banc regarde la mémoire du navigateur, pas la constante du
    // composant).
    expect(window.localStorage.getItem("creatordeck.sfx-level")).toBe("discret");

    banc.appuyer("Fort");
    expect(window.localStorage.getItem("creatordeck.sfx-level")).toBe("fort");
    expect(chips().find((chip) => chip.getAttribute("aria-pressed") === "true")?.textContent).toBe(
      "Fort",
    );
  });

  it("ne joue rien quand on se déplace : onglets et réglages sont muets", async () => {
    await ecranToi();
    // Les bruitages sont chargés (le banc les fait jouer pour de vrai) : ce qui
    // suit compte des sons **réellement** déclenchés, pas des intentions.
    await act(async () => {});
    const sons = (globalThis as unknown as { __sons: { oscillateurs: number; bruitages: number } })
      .__sons;
    const avant = sons.oscillateurs + sons.bruitages;

    // Un tour complet des onglets, dans les deux sens.
    for (const onglet of ["Drop", "Binder", "Craft", "Toi", "Drop", "Toi"]) banc.appuyer(onglet);
    // Puis les portes de l'écran Toi : le compte, les taux, les objectifs, le
    // classeur de thèmes — celles qui ouvrent une feuille et celles qui changent
    // d'écran, toutes muettes.
    for (const porte of ["Mon compte", "Taux de drop", "Thème du classeur"]) {
      banc.appuyer(porte);
      // Le bouton « Fermer » d'une feuille n'a pas de texte : il se nomme.
      banc.appuyerNom("Fermer");
    }
    banc.appuyer("Objectifs et saisons");

    expect(sons.oscillateurs + sons.bruitages, "un déplacement a sonné").toBe(avant);
  });

  it("et le classeur est muet aussi : filtre et pages ne sonnent plus", async () => {
    // Dernière demande du joueur (8 octobre 2026, le soir) : « enlève les deux
    // sons de déplacement ». C'étaient les deux derniers — le filtre du Binder
    // et ses pages. Ce test les touche vraiment, dans l'ordre, et compte.
    await ecranToi();
    await act(async () => {});
    const sons = (globalThis as unknown as { __sons: { oscillateurs: number; bruitages: number } })
      .__sons;
    banc.appuyer("Binder");
    const avant = sons.oscillateurs + sons.bruitages;

    // Un filtre, puis deux pages : trois gestes, aucun son.
    const filtres = [...document.querySelectorAll<HTMLButtonElement>(".filter-chips button")];
    expect(filtres.length, "aucun filtre dans le classeur").toBeGreaterThan(1);
    banc.appuyer(filtres[1]!.textContent!.trim());
    banc.appuyer("Suivant");
    banc.appuyer("Précédent");

    expect(sons.oscillateurs + sons.bruitages, "un déplacement a sonné").toBe(avant);
  });

  it("et le compteur fonctionne : acheter un booster, ça sonne", async () => {
    // Le contrôle qui donne sa valeur au test précédent : si le détecteur était
    // muet, le silence passerait pour une réussite. Ouvrir un booster, lui, doit
    // s'entendre (le pop du paquet, et la gamme de la première carte).
    const sons = (globalThis as unknown as { __sons: { oscillateurs: number; bruitages: number } })
      .__sons;
    const { CreatorDeckApp } = await import("@/components/creator-deck-app");
    await banc.monter(<CreatorDeckApp />);
    await act(async () => {});
    const avant = sons.oscillateurs + sons.bruitages;

    banc.appuyer("Ouvrir le booster");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_500);
    });

    expect(sons.oscillateurs + sons.bruitages, "le booster n'a rien joué").toBeGreaterThan(avant);
  });

  it("cache le volume quand le son est coupé", async () => {
    await ecranToi();
    expect(chips()).toHaveLength(3);

    banc.appuyer("Son");
    // Coupé : l'interrupteur le dit, et régler le volume de rien n'a pas de sens.
    const son = [...document.querySelectorAll<HTMLButtonElement>(".menu-row")].find(
      (bouton) => bouton.getAttribute("role") === "switch" && bouton.textContent?.includes("Son"),
    );
    expect(son!.getAttribute("aria-checked")).toBe("false");
    expect(chips()).toHaveLength(0);
    banc.ecran("42-toi-son-coupe");
  });
});
