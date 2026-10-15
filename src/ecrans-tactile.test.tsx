/**
 * **Les gestes qui se sentent** : le reflet d'une carte sous le doigt, et les
 * vibrations du téléphone.
 *
 * Deux choses que le joueur ne lit pas — il les touche — et qui, pour cette
 * raison exacte, ne se font remarquer que le jour où elles disparaissent. Ce
 * banc les tient :
 *
 *   * le **foil** d'une carte Holo suit le doigt (`--px`/`--py` écrits en direct
 *     sur le `.card-foil`, sans re-rendu React) ;
 *   * le réglage « Reflets des cartes » coupe **tout** le reflet, pas seulement
 *     le capteur (`data-card-fx="off"` sur `<html>`, que le CSS écoute) ;
 *   * un défilement sur Drop ne déclenche ni ouverture ni vibration ;
 *   * couper le **Son** coupe aussi les vibrations : un joueur qui coupe le son
 *     dans le métro ne veut pas que son téléphone bourdonne.
 *
 * Les vibrations sont comptées par le banc (`src/ecrans.setup.ts` remplace
 * `navigator.vibrate` par un enregistreur) : c'est une promesse qu'on peut
 * vérifier, pas une intention.
 */
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { creerBanc, type Banc } from "@/ecrans-banc";

const T0 = Date.UTC(2026, 9, 8, 12, 0, 0);

/** Les motifs de vibration enregistrés depuis le début du banc. */
function vibrations(): number[][] {
  return (globalThis as unknown as { __vibrations: number[][] }).__vibrations;
}

describe("les gestes qui se sentent", () => {
  let banc: Banc;

  beforeEach(() => {
    vi.useFakeTimers({ now: T0 });
    banc = creerBanc();
    banc.preparer();
    vibrations().length = 0;
    window.localStorage.clear();
  });

  afterEach(() => {
    banc.nettoyer();
    vi.useRealTimers();
    vibrations().length = 0;
  });

  it("fait suivre le reflet de la carte sous le doigt", async () => {
    const [{ CreatorCard }, { CREATORS }] = await Promise.all([
      import("@/components/creator-card"),
      import("@/lib/catalog"),
    ]);
    const creator = CREATORS.find((item) => !item.slug.startsWith("retired")) ?? CREATORS[0];
    await banc.monter(<CreatorCard creator={creator} variant="holo" />);

    const carte = document.querySelector<HTMLElement>(".creator-card");
    const foil = document.querySelector<HTMLElement>(".card-foil");
    expect(carte, "aucune carte montée").toBeTruthy();
    expect(foil, "aucun foil : la variante Holo n'est plus brillante").toBeTruthy();
    // Au repos, le reflet est posé à sa place par défaut (le CSS) : rien n'est
    // écrit par le composant.
    expect(foil!.style.getPropertyValue("--px")).toBe("");

    // jsdom ne fait **aucune** mise en page : sans rectangle, la carte diviserait
    // par une largeur de zéro. Une carte de 200 × 300 suffit au calcul.
    const rect = { left: 0, top: 0, width: 200, height: 300 };
    carte!.getBoundingClientRect = () => ({ ...rect }) as DOMRect;

    // Le doigt glisse au quart de la largeur, à mi-hauteur.
    act(() => {
      carte!.dispatchEvent(
        new window.MouseEvent("pointermove", {
          bubbles: true,
          clientX: 50,
          clientY: 150,
        }),
      );
    });

    // La position est celle du doigt **dans la carte**, en pourcentage : c'est
    // ce que lit le `radial-gradient` du foil.
    expect(foil!.style.getPropertyValue("--px")).toBe("25.0%");
    expect(foil!.style.getPropertyValue("--py")).toBe("50.0%");

    // Le doigt sort : le reflet revient à sa place (sinon il resterait figé au
    // coin de la carte pour toujours). React n'écoute pas `pointerleave` (qui ne
    // bulle pas) : c'est le `pointerout` **vers l'extérieur** qui fait un leave.
    // Et le composant n'efface que si l'inclinaison est muette : sur un appareil
    // sans capteur, deux secondes suffisent à le déclarer silencieux.
    await act(async () => {
      vi.advanceTimersByTime(2_100);
    });
    act(() => {
      carte!.dispatchEvent(
        new window.MouseEvent("pointerout", { bubbles: true, relatedTarget: document.body }),
      );
    });
    expect(foil!.style.getPropertyValue("--px")).toBe("");
    banc.ecran("47-carte-foil");

    // Et sur une carte **standard**, il n'y a rien à suivre : le foil existe
    // (c'est une couche de la planche) mais il reste inerte — c'est `shiny` qui
    // décide qui écoute le doigt, pas la variante dessinée sous nos yeux.
    banc.vider();
    await banc.monter(<CreatorCard creator={creator} variant="standard" />);
    const sobre = document.querySelector<HTMLElement>(".creator-card");
    const foilSobre = document.querySelector<HTMLElement>(".card-foil");
    expect(sobre?.className).not.toContain("is-shiny");
    sobre!.getBoundingClientRect = () => ({ ...rect }) as DOMRect;
    act(() => {
      sobre!.dispatchEvent(
        new window.MouseEvent("pointermove", { bubbles: true, clientX: 150, clientY: 150 }),
      );
    });
    expect(foilSobre?.style.getPropertyValue("--px")).toBe("");
  });

  it("remplace un portrait manquant par un dos cohérent plutôt qu'une icône cassée", async () => {
    const [{ CreatorCard }, { CREATORS }] = await Promise.all([
      import("@/components/creator-card"),
      import("@/lib/catalog"),
    ]);
    const creator = CREATORS.find((item) => !item.slug.startsWith("retired")) ?? CREATORS[0];
    await banc.monter(<CreatorCard creator={creator} />);
    const portrait = document.querySelector<HTMLImageElement>(".card-photo");
    expect(portrait).toBeTruthy();
    await act(async () => {
      portrait!.dispatchEvent(new Event("error"));
    });
    expect(document.querySelector(".card-photo")).toBeNull();
    expect(document.querySelector(".card-photo-placeholder")?.getAttribute("role")).toBe("img");
    expect(document.querySelector(".card-photo-placeholder")?.textContent?.trim()).toBeTruthy();
  });

  it("sépare l’action d’inspection du lien Twitch de la carte", async () => {
    const [{ CreatorCard }, { CREATORS }] = await Promise.all([
      import("@/components/creator-card"),
      import("@/lib/catalog"),
    ]);
    const creator = CREATORS[0];
    const inspect = vi.fn();
    await banc.monter(<CreatorCard creator={creator} compact onClick={inspect} liveStream={{
      login: creator.login, displayName: creator.displayName, gameName: "Test",
      title: "En direct", viewers: 12, startedAt: null,
    }} />);

    const card = document.querySelector<HTMLElement>(".creator-card")!;
    const link = document.querySelector<HTMLAnchorElement>(".card-on-air")!;
    const inspectButton = document.querySelector<HTMLButtonElement>(".creator-card-inspect")!;
    expect(card.getAttribute("role")).not.toBe("button");
    expect(link.closest("button")).toBeNull();
    act(() => link.click());
    expect(inspect).not.toHaveBeenCalled();
    act(() => inspectButton.click());
    expect(inspect).toHaveBeenCalledOnce();
  });

  it("coupe tout le reflet quand le joueur le demande", async () => {
    const [{ CreatorCard }, { CREATORS }, { applyTiltChoice, setTiltEnabled }] = await Promise.all([
      import("@/components/creator-card"),
      import("@/lib/catalog"),
      import("@/lib/tilt"),
    ]);
    const creator = CREATORS[0];
    const avant = document.documentElement.dataset.cardFx;

    try {
      setTiltEnabled(false);
      applyTiltChoice();
      // Le CSS ne connaît pas `localStorage` : c'est cet attribut qui éteint le
      // foil (`[data-card-fx="off"] .card-foil { display: none; }`), et le même
      // attribut coupe les effets de rareté.
      expect(document.documentElement.dataset.cardFx).toBe("off");

      await banc.monter(<CreatorCard creator={creator} variant="gold" />);
      expect(document.querySelector(".card-foil")).toBeTruthy();
      banc.ecran("48-carte-reflet-coupe");
    } finally {
      setTiltEnabled(true);
      applyTiltChoice();
      expect(document.documentElement.dataset.cardFx).toBe(avant ?? "on");
    }
  });

  it("un défilement sur l’accueil ne déclenche ni ouverture ni vibration", async () => {
    const { CreatorDeckApp } = await import("@/components/creator-deck-app");
    await banc.monter(<CreatorDeckApp />);

    const stage = document.querySelector<HTMLElement>(".pack-stage");
    expect(stage, "aucune zone de tirage sur l'accueil").toBeTruthy();
    const doigt = (type: string, y: number) =>
      act(() => {
        stage!.dispatchEvent(
          new window.MouseEvent(type, { bubbles: true, cancelable: true, clientX: 100, clientY: y }),
        );
      });

    // Le doigt part de 400 et remonte de 100 px : le seuil est franchi (88 px).
    doigt("pointerdown", 400);
    doigt("pointermove", 340);
    doigt("pointermove", 300);
    doigt("pointermove", 260);
    await act(async () => {});

    doigt("pointerup", 260);
    expect(document.querySelector(".booster-physical-scene")).toBeNull();
    expect(document.querySelector(".reveal-overlay")).toBeNull();
    expect(vibrations()).toHaveLength(0);
  });

  it("ne vibre pas du tout quand le son est coupé", async () => {
    const [{ CreatorDeckApp }, { setMuted }] = await Promise.all([
      import("@/components/creator-deck-app"),
      import("@/lib/sfx"),
    ]);
    setMuted(true);
    await banc.monter(<CreatorDeckApp />);

    const stage = document.querySelector<HTMLElement>(".pack-stage")!;
    const doigt = (type: string, y: number) =>
      act(() => {
        stage.dispatchEvent(
          new window.MouseEvent(type, { bubbles: true, cancelable: true, clientX: 100, clientY: y }),
        );
      });

    doigt("pointerdown", 400);
    doigt("pointermove", 260);
    doigt("pointerup", 260);
    await act(async () => {});

    // C'est la règle du module de vibrations : le même interrupteur coupe les
    // deux. Un téléphone qui bourdonne dans une poche, son coupé, serait un
    // réglage qui ment.
    expect(vibrations()).toHaveLength(0);
    setMuted(false);
  });
});

describe("portrait de secours", () => {
  it("remplace une image en erreur par des initiales lisibles", async () => {
    const { CreatorCard } = await import("@/components/creator-card");
    const { CREATORS } = await import("@/lib/catalog");
    const banc = creerBanc();
    banc.preparer();
    await banc.monter(<CreatorCard creator={CREATORS.find((creator) => creator.displayName.trim().includes(" ")) ?? CREATORS[0]} />);
    const image = document.querySelector<HTMLImageElement>(".card-photo");
    expect(image).toBeTruthy();
    await act(async () => {
      image!.dispatchEvent(new Event("error"));
    });
    const fallback = document.querySelector<HTMLElement>(".card-photo-placeholder");
    expect(fallback?.getAttribute("role")).toBe("img");
    expect(fallback?.textContent?.trim()).toMatch(/^[A-Z]{1,2}$/);
    banc.nettoyer();
  });
});
