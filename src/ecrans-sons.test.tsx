/**
 * Le réglage du son **au doigt** : l'interrupteur, et les trois crans de volume.
 *
 * Ce que le banc regarde, et rien d'autre : que l'interrupteur existe et dise la
 * vérité, que le volume apparaisse **sous** lui quand le son est actif (et
 * disparaisse quand il est coupé), qu'un appui marque le cran choisi, et que le
 * choix soit **gardé** — c'est un réglage qu'on cherche une fois parce qu'un son
 * dérange, pas à chaque lancement.
 */
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
