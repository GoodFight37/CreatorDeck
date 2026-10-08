/**
 * Le live de vingt secondes, **joué au doigt** — le banc d'écran de l'étape 5.
 *
 * Le module pur (`src/lib/live-game.test.ts`, dans `npm test`) dit que le plan
 * est juste ; ici on vérifie que le **branchement** l'est : que la scène
 * s'affiche, qu'une bulle arrive vraiment à l'écran au moment du plan, qu'on
 * peut l'attraper au doigt, que le bilan compte juste, et que le bouton du bilan
 * publie bien la vidéo du jour. L'horloge est figée (`vi.useFakeTimers`), donc
 * les vingt secondes se jouent en quelques millisecondes.
 */
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { creerBanc, type Banc } from "@/ecrans-banc";
import { livePlan, tierIndexFor } from "@/lib/live-game";
import { formatById } from "@/lib/streamer";

const T0 = Date.UTC(2026, 9, 8, 12, 0, 0);
const JOUR = "2026-10-08";
/** Palier « Chaîne qui monte » : assez de bulles pour que la scène ait de quoi jouer. */
const ABONNES = 30_000;
const FORMAT = formatById("letsplay")!;

describe("le live de vingt secondes", () => {
  let banc: Banc;
  const plan = livePlan(JOUR, tierIndexFor(ABONNES));

  beforeEach(() => {
    vi.useFakeTimers({ now: T0 });
    banc = creerBanc();
    banc.preparer();
  });

  afterEach(() => {
    banc.nettoyer();
    vi.useRealTimers();
  });

  async function avancer(ms: number) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ms);
    });
  }

  /** Avance par petits pas jusqu'à ce que la condition soit vraie. */
  async function jusquA(condition: () => boolean, max = 22_000) {
    for (let t = 0; t < max; t += 200) {
      if (condition()) return;
      await avancer(200);
    }
    throw new Error("la condition n'est jamais devenue vraie");
  }

  async function monter(onPublish = vi.fn(), onLeave = vi.fn(), busy = false) {
    const { StreamerLiveGame } = await import("@/components/streamer-live-game");
    await banc.monter(
      <StreamerLiveGame
        day={JOUR}
        subscribers={ABONNES}
        format={FORMAT}
        busy={busy}
        onPublish={onPublish}
        onLeave={onLeave}
      />,
    );
    return { onPublish, onLeave };
  }

  it("entre en direct, laisse attraper une bulle, puis publie la vidéo", async () => {
    const publier = vi.fn();
    const quitter = vi.fn();
    await monter(publier, quitter);

    // À l'ouverture : le bandeau du direct, la jauge, et **aucune bulle encore**.
    const debut = banc.ecran("live-debut");
    expect(debut).toContain("EN DIRECT");
    expect(document.querySelectorAll(".live-alert")).toHaveLength(0);
    expect(debut).toContain(`0 / ${plan.alerts.length} pour l'instant`);

    // La première bulle du plan finit par tomber à l'écran, avec ses mots.
    await jusquA(() => document.querySelectorAll(".live-alert").length > 0);
    const bulle = document.querySelector<HTMLElement>(".live-alert")!;
    expect(bulle.getAttribute("aria-label")).toContain(plan.alerts[0].label);
    banc.ecran("live-bulle");

    // On l'attrape **au doigt** (le geste de la scène, pas un clic).
    await act(async () => {
      bulle.dispatchEvent(new window.MouseEvent("pointerdown", { bubbles: true }));
    });
    expect(banc.ecran("live-attrape")).toContain(`1 / ${plan.alerts.length} pour l'instant`);

    // Puis le direct va au bout tout seul : les bulles oubliées comptent.
    await jusquA(() => document.querySelector(".live-recap") !== null);
    const bilan = banc.ecran("live-bilan");
    expect(bilan).toContain(`1 sur ${plan.alerts.length}`);
    expect(bilan).toContain("Le direct ne paie rien");

    // Publier depuis le bilan : c'est le seul bouton qui touche au serveur.
    banc.appuyer(/Publier ma vidéo/);
    await avancer(0);
    expect(publier).toHaveBeenCalledTimes(1);
    expect(quitter).not.toHaveBeenCalled();
  });

  it("laisse partir sans publier, et la journée n'est pas consommée", async () => {
    const publier = vi.fn();
    const quitter = vi.fn();
    await monter(publier, quitter);

    // La croix du direct : on sort, rien n'est publié.
    await act(async () => {
      document
        .querySelector<HTMLButtonElement>('button[aria-label="Quitter le live"]')!
        .dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
    });
    expect(quitter).toHaveBeenCalledTimes(1);
    expect(publier).not.toHaveBeenCalled();

    // Et depuis le bilan, « Retour à la chaîne » ne publie pas non plus.
    await jusquA(() => document.querySelector(".live-recap") !== null);
    banc.appuyer("Retour à la chaîne");
    await avancer(0);
    expect(publier).not.toHaveBeenCalled();
    expect(quitter).toHaveBeenCalledTimes(2);
  });

  it("rejoue exactement la même scène quand on rouvre le même jour", async () => {
    // Deux montages, même journée, même palier : le HTML doit être identique,
    // sinon un joueur pourrait relancer le live jusqu'à tomber sur un tirage
    // plus clément.
    await monter();
    await jusquA(() => document.querySelectorAll(".live-alert").length > 0);
    const premier = banc.ecran("live-une-fois");
    banc.vider();
    vi.setSystemTime(T0); // le banc `vider()` ne remet pas l'horloge à zéro
    await monter();
    await jusquA(() => document.querySelectorAll(".live-alert").length > 0);
    expect(banc.ecran("live-deux-fois")).toBe(premier);
  });
});
