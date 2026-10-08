/**
 * **Le studio**, monté dans un DOM — le banc d'écran de la scène de « Ta chaîne ».
 *
 * Le module pur (`src/lib/streamer.test.ts`, dans `npm test`) dit ce que le
 * plateau **vaut** ; ici on vérifie ce que la scène **montre**, et rien de plus :
 *
 *   * le **HUD** (rang, jauge d'abonnés, rythme, jetons) remplace les chiffres
 *     en texte de l'ancien tableau de bord ;
 *   * le **décor** : un objet par palier acheté, et huit silhouettes éteintes
 *     tant que rien n'est acheté — un palier se voit, il ne se coche pas ;
 *   * les **deux socles** : une vraie carte du classeur posée dessus, un socle
 *     translucide (jamais une boîte pointillée) quand la place est libre ;
 *   * l'**aura du direct** : elle ne s'allume que pour un créateur qui streame
 *     maintenant, et l'écran dit « EN DIRECT » sans mentir sur les spectateurs ;
 *   * les **gestes** : chaque socle, chaque carte a sa porte (ouvrir, changer,
 *     retirer), et rien ne répond pendant que le serveur travaille.
 */
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { creerBanc, type Banc } from "@/ecrans-banc";
import {
  StreamerStudioStage,
  type StreamerStudioStageProps,
} from "@/components/streamer-studio-stage";
import { CREATOR_BY_SLUG, type CardVariant, type Rarity } from "@/lib/catalog";
import type { LiveStream } from "@/lib/live";
import type { StreamerGuest } from "@/lib/streamer";

const T0 = Date.UTC(2026, 9, 8, 12, 0, 0);

/** Deux créateurs du catalogue, réels : leurs cartes sont les vraies. */
const IBAI = CREATOR_BY_SLUG.get("ibai")!;
const KAMET0 = CREATOR_BY_SLUG.get("kamet0")!;

function invite(
  slot: number,
  slug: string,
  rarity: Rarity,
  variant: CardVariant = "standard",
): StreamerGuest {
  return { slot, cardId: `carte-${slot}`, slug, rarity, variant };
}

function enDirect(login: string, viewers: number): LiveStream {
  return {
    login,
    displayName: "Ibai",
    gameName: "Just Chatting",
    title: "Direct du soir",
    viewers,
    startedAt: null,
  };
}

describe("le studio (la scène)", () => {
  let banc: Banc;

  beforeEach(() => {
    vi.useFakeTimers({ now: T0 });
    banc = creerBanc();
    banc.preparer();
  });

  afterEach(() => {
    banc.nettoyer();
    vi.useRealTimers();
  });

  async function scene(props: Partial<StreamerStudioStageProps> = {}) {
    const complet: StreamerStudioStageProps = {
      guests: [],
      direct: new Set<string>(),
      liveStreams: new Map<string, LiveStream>(),
      setup: [],
      collabPermille: 0,
      collabLive: false,
      raidToday: 0,
      raidLine: null,
      raidPossible: 0,
      subscribers: 0,
      perDay: 240,
      tierLabel: "Petit canal",
      nextTierAt: 2500,
      progressRatio: 0,
      tokens: 0,
      tokensCap: 40,
      busy: false,
      onOpenSlot: vi.fn(),
      onRemove: vi.fn(),
      ...props,
    };
    await banc.monter(<StreamerStudioStage {...complet} />);
    return complet;
  }

  it("ouvre sur un HUD et une pièce : la jauge, le rythme, huit silhouettes éteintes", async () => {
    await scene();
    const html = banc.ecran("30-studio-vide");
    // Le rang et la jauge : « 0 / 2 500 » à trouver, pas une phrase d'explication.
    expect(html).toContain("Petit canal");
    expect(html).toContain("0 / 2\u202f500");
    expect(document.querySelector(".chaine-hud-track i")?.getAttribute("style")).toContain(
      "width: 0%",
    );
    expect(html).toContain("+240 / jour");
    expect(html).toContain("0/40");
    // La pièce est là, et **tout est éteint** : huit objets, aucun allumé.
    expect(document.querySelector(".chaine-room")).not.toBeNull();
    expect(document.querySelectorAll(".chaine-object")).toHaveLength(8);
    expect(document.querySelectorAll(".chaine-object.on")).toHaveLength(0);
    // Deux socles libres : un socle translucide, jamais une boîte pointillée.
    expect(document.querySelectorAll(".chaine-stand.libre")).toHaveLength(2);
    expect(document.querySelectorAll(".chaine-stand-empty")).toHaveLength(2);
    expect(document.querySelectorAll(".chaine-stand.plate")).toHaveLength(0);
    expect(html).toContain("Place 1");
    expect(html).toContain("Plateau");
    // Aucune aura, aucun bandeau de raid : personne ne streame.
    expect(document.querySelector(".chaine-stand-aura")).toBeNull();
    expect(document.querySelector(".chaine-chip.live")).toBeNull();
  });

  it("allume un objet par palier : le studio se voit avant de se lire", async () => {
    await scene({ setup: ["webcam", "lumiere", "plateau"] });
    const html = banc.ecran("30-studio-setup");
    const allumes = [...document.querySelectorAll(".chaine-object.on")].map((g) =>
      g.getAttribute("class"),
    );
    expect(allumes).toHaveLength(3);
    expect(allumes.join(" ")).toContain("obj-webcam");
    expect(allumes.join(" ")).toContain("obj-lumiere");
    expect(allumes.join(" ")).toContain("obj-plateau");
    // La pièce change de classe : la lumière et le plateau transforment la scène.
    const racine = document.querySelector("section.chaine-stage")!;
    expect(racine.className).toContain("eclaire");
    expect(racine.className).toContain("plateau");
    expect(html).toContain("obj-regie");
    expect(document.querySelectorAll(".chaine-object")).toHaveLength(8);
  });

  it("pose une vraie carte du classeur sur son socle, et dit sa part", async () => {
    await scene({
      guests: [invite(1, IBAI.slug, "legendary"), invite(2, KAMET0.slug, "uncommon")],
      collabPermille: 150,
    });
    const html = banc.ecran("30-studio-invites");
    expect(document.querySelectorAll(".chaine-stand.pose")).toHaveLength(2);
    expect(document.querySelectorAll(".chaine-stand.libre")).toHaveLength(0);
    // Une carte du jeu, pas une vignette inventée : le nom dupliqué de
    // `CreatorCard` est là, et les deux invités sont nommés.
    expect(document.querySelectorAll(".card-nameplate").length).toBeGreaterThanOrEqual(2);
    expect(html).toContain(IBAI.displayName);
    expect(html).toContain(KAMET0.displayName);
    // Chaque socle dit ce qu'il apporte : la rareté, la part de vidéo, la part
    // de raid — les chiffres du fichier, pas des chiffres de la scène.
    expect(html).toContain("+12 %");
    expect(html).toContain("+9.0 % raid");
    // Personne ne streame : aucune aura, aucun badge.
    expect(document.querySelector(".chaine-stand-aura")).toBeNull();
    expect(html).not.toContain("EN DIRECT");
    // Le plateau du moment, et son état : il n'y a pas de direct.
    expect(html).toContain("Plateau +15.0 %");
  });

  it("allume l'invité en direct : aura, badge EN DIRECT, bandeau RAID — et lui seul", async () => {
    await scene({
      guests: [invite(1, IBAI.slug, "legendary"), invite(2, KAMET0.slug, "uncommon")],
      direct: new Set([IBAI.slug]),
      liveStreams: new Map([[IBAI.slug, enDirect("ibai", 4321)]]),
      collabPermille: 300,
      collabLive: true,
    });
    const html = banc.ecran("30-studio-raid");
    // Un seul invité est en direct : une aura, un badge, et c'est le bon socle.
    const allume = document.querySelectorAll(".chaine-stand.en-direct");
    expect(allume).toHaveLength(1);
    expect(allume[0].getAttribute("data-place")).toBe("1");
    expect(document.querySelectorAll(".chaine-stand-aura")).toHaveLength(1);
    expect(html).toContain("EN DIRECT");
    // Le nombre de spectateurs vient de la table du direct, jamais du hasard.
    expect(html).toContain("4\u202f321");
    // Le bandeau du moment, et le plateau qui compte le direct.
    expect(html).toContain("RAID !");
    expect(html).toContain("Plateau +30.0 %");
    expect(html).toContain("direct compris");
    expect(document.querySelector("section.chaine-stage")?.className).toContain("raid");
  });

  it("paie le relevé une fois : la ligne du raid, ou l'aperçu, jamais les deux", async () => {
    await scene({ raidToday: 0, raidPossible: 42 });
    expect(banc.ecran("30-studio-raid-a-venir")).toContain("+42 abonnés");

    banc.vider();
    await scene({ raidToday: 42, raidLine: "Raid : un invité est passé en direct — +42 abonnés." });
    const html = banc.ecran("30-studio-raid-paye");
    expect(html).toContain("Raid : un invité est passé en direct");
    // Déjà payé : l'aperçu disparaît — on ne promet pas deux fois le même.
    expect(html).not.toContain("Relevé du soir");
  });

  it("au sommet, le HUD le dit sans promettre un palier qui n'existe pas", async () => {
    await scene({
      subscribers: 1_250_000,
      perDay: 45_000,
      tierLabel: "Légende du direct",
      nextTierAt: null,
      progressRatio: 1,
    });
    const html = banc.ecran("30-studio-sommet");
    expect(html).toContain("Légende du direct");
    expect(html).toContain("1\u202f250\u202f000 abonnés");
    expect(document.querySelector(".chaine-hud-track")?.getAttribute("aria-label")).toBe(
      "Palier au sommet",
    );
  });

  it("ouvre la bonne place, change la bonne carte, retire le bon invité", async () => {
    const props = await scene({ guests: [invite(1, IBAI.slug, "legendary")] });
    const appuyer = (selecteur: string) => {
      const bouton = document.querySelector<HTMLButtonElement>(selecteur);
      expect(bouton).not.toBeNull();
      act(() => {
        bouton!.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
      });
    };

    // Le socle libre de la place 2 ouvre le classeur pour la place 2.
    appuyer('button[aria-label="Choisir un invité pour la place 2"]');
    expect(props.onOpenSlot).toHaveBeenCalledWith(2);
    // « Changer » sur la carte posée rouvre la place 1.
    appuyer('button[aria-label="Changer l\'invité de la place 1"]');
    expect(props.onOpenSlot).toHaveBeenCalledWith(1);
    // La croix retire l'invité : c'est la porte du moteur (`poserInvite`).
    appuyer('button[aria-label="Retirer l\'invité de la place 1"]');
    expect(props.onRemove).toHaveBeenCalledWith(1);
  });

  it("n'ouvre rien pendant que le serveur travaille", async () => {
    await scene({ busy: true });
    const bouton = document.querySelector<HTMLButtonElement>(
      'button[aria-label="Choisir un invité pour la place 1"]',
    )!;
    // Occupé : le socle est là, mais le bouton ne répond pas — pas de deuxième
    // écriture pendant que la première est en vol.
    expect(bouton.disabled).toBe(true);
  });
});
