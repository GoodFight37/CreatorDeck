/**
 * Les deux interrupteurs audio, indépendants et mémorisés.
 *
 * Ce que le banc regarde, et rien d'autre : que l'interrupteur existe et dise la
 * vérité, qu'ils restent indépendants, et que les deux choix soient gardés.
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
    vi.resetModules();
  });

  async function ecranToi() {
    const { CreatorDeckApp } = await import("@/components/creator-deck-app");
    await banc.monter(<CreatorDeckApp />);
    banc.appuyer("Toi");
  }

  function switches() {
    return [...document.querySelectorAll<HTMLButtonElement>('.menu-row[role="switch"]')].filter(
      (bouton) => bouton.textContent?.includes("Son de l’application") || bouton.textContent?.includes("Musique"),
    );
  }

  it("montre deux interrupteurs indépendants, sans réglage de volume", async () => {
    await ecranToi();
    expect(switches().map((bouton) => bouton.textContent?.trim())).toEqual([
      "Son de l’application",
      "Musique",
    ]);
    expect(switches().map((bouton) => bouton.getAttribute("aria-checked"))).toEqual(["true", "true"]);
    expect(document.querySelector(".sound-row"), "le choix de volume devrait avoir disparu").toBeNull();
    banc.ecran("41-toi-son");
  });

  it("garde les choix séparément et ne coupe pas l'autre canal", async () => {
    await ecranToi();
    banc.appuyer("Musique");
    expect(window.localStorage.getItem("creatordeck.music-muted")).toBe("1");
    expect(switches()[0]?.getAttribute("aria-checked")).toBe("true");
    expect(switches()[1]?.getAttribute("aria-checked")).toBe("false");

    banc.appuyer("Son de l’application");
    expect(window.localStorage.getItem("creatordeck.muted")).toBe("1");
    expect(switches().map((bouton) => bouton.getAttribute("aria-checked"))).toEqual(["false", "false"]);
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
    for (const onglet of ["Drop", "Binder", "Atelier", "Toi", "Drop", "Toi"]) banc.appuyer(onglet);
    // Puis les portes de l'écran Toi : le compte, les taux, les objectifs, le
    // classeur de thèmes — celles qui ouvrent une feuille et celles qui changent
    // d'écran, toutes muettes.
    for (const porte of ["Mon compte", "Taux officiels", "Thème du classeur"]) {
      banc.appuyer(porte);
      // Le bouton « Fermer » d'une feuille n'a pas de texte : il se nomme.
      banc.appuyerNom("Fermer");
    }
    banc.appuyer(/^Objectifs et saisons/);

    expect(sons.oscillateurs + sons.bruitages, "un déplacement a sonné").toBe(avant);
  });

  it("garde la recherche muette, mais donne un son bref au feuilletage", async () => {
    await ecranToi();
    await act(async () => {});
    const sons = (globalThis as unknown as { __sons: { oscillateurs: number; bruitages: number } })
      .__sons;
    banc.appuyer("Binder");
    const avant = sons.oscillateurs + sons.bruitages;

    // L'album n'a plus de filtres ; chercher un nom est de la navigation muette,
    // seuls les tours de page sont sonores.
    expect(document.querySelector(".filter-chips"), "des filtres dans le classeur").toBeNull();
    const champ = document.querySelector<HTMLInputElement>('input[aria-label="Rechercher un créateur"]')!;
    banc.saisir(champ, "a");
    banc.saisir(champ, "");
    expect(sons.oscillateurs + sons.bruitages, "la recherche a sonné").toBe(avant);
    banc.appuyer("Suivant");
    expect(sons.oscillateurs + sons.bruitages, "la page n'a pas sonné").toBe(avant + 1);
    // jsdom ne joue pas le tour de feuille : attendre son filet de sécurité.
    await act(async () => { await vi.advanceTimersByTimeAsync(420); });
    banc.appuyer("Précédent");

    expect(sons.oscillateurs + sons.bruitages, "le retour de page n'a pas sonné").toBe(avant + 2);
  });

  it("le son du booster démarre à la déchirure, jamais avant", async () => {
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

    // Le premier appui ne déchire rien : le son doit attendre le geste.
    expect(sons.oscillateurs + sons.bruitages, "le son a joué avant la déchirure").toBe(avant);
    banc.appuyer("Ouvrir sans déchirer");
    expect(sons.oscillateurs + sons.bruitages, "la déchirure n'a rien joué").toBeGreaterThan(avant);
  });

  it("coupe les sons du jeu sans ajouter de contrôle de volume", async () => {
    await ecranToi();
    expect(switches()[0]?.getAttribute("aria-checked")).toBe("true");
    banc.appuyer("Son de l’application");
    expect(switches()[0]?.getAttribute("aria-checked")).toBe("false");
    expect(switches()[1]?.getAttribute("aria-checked")).toBe("true");
    expect(document.querySelector(".sound-row")).toBeNull();
    banc.ecran("42-toi-son-coupe");
  });
});
