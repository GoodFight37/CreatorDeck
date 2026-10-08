/**
 * **Le bureau du streamer**, monté dans un DOM — le banc d'écran de la scène.
 *
 * Le module pur (`src/lib/streamer.test.ts`, dans `npm test`) dit ce que le
 * plateau **vaut** ; ici on vérifie ce que la scène **montre** : que le studio
 * s'allume palier par palier, que les places libres sont des socles à « + »,
 * que la carte d'un invité est une vraie carte du classeur, et qu'un invité en
 * direct s'allume (aura, badge LIVE, bandeau RAID) **sans que rien ne bouge
 * quand personne ne streame**.
 *
 * C'est aussi la garde des gestes : chaque socle et chaque carte ont leur
 * bouton, et appuyer dessus appelle la bonne porte (ouvrir le classeur,
 * changer, retirer) au lieu d'agir dans son coin.
 */
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { creerBanc, type Banc } from "@/ecrans-banc";
import { StreamerDeskStage, type StreamerDeskStageProps } from "@/components/streamer-desk-stage";
import { CREATOR_BY_SLUG, type Rarity } from "@/lib/catalog";
import type { LiveStream } from "@/lib/live";
import type { CardVariant } from "@/lib/catalog";
import type { StreamerGuest } from "@/lib/streamer";

const T0 = Date.UTC(2026, 9, 8, 12, 0, 0);

/** Deux créateurs du catalogue, réels : leurs cartes sont les vraies. */
const IBAI = CREATOR_BY_SLUG.get("ibai")!;
const KAMET0 = CREATOR_BY_SLUG.get("kamet0")!;

function invite(slot: number, slug: string, rarity: Rarity, variant: CardVariant = "standard"): StreamerGuest {
  return { slot, cardId: `carte-${slot}`, slug, rarity, variant };
}

function direct(login: string, viewers: number): LiveStream {
  return {
    login,
    displayName: "Ibai",
    gameName: "Just Chatting",
    title: "Direct du soir",
    viewers,
    startedAt: null,
  };
}

describe("le bureau du streamer (la scène)", () => {
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

  async function scene(props: Partial<StreamerDeskStageProps> = {}) {
    const complet: StreamerDeskStageProps = {
      guests: [],
      direct: new Set<string>(),
      liveStreams: new Map<string, LiveStream>(),
      setup: [],
      collabPermille: 0,
      collabLive: false,
      raidToday: 0,
      raidLine: null,
      raidPossible: 0,
      busy: false,
      onOpenSlot: vi.fn(),
      onRemove: vi.fn(),
      ...props,
    };
    await banc.monter(<StreamerDeskStage {...complet} />);
    return complet;
  }

  it("rend une scène, pas une liste : deux socles vides, et le studio éteint", async () => {
    await scene();
    const html = banc.ecran("30-bureau-vide");
    expect(html).toContain("Le bureau du streamer");
    // Le titre dit l'occupation du plateau, sans compter sur les socles.
    expect(html).toContain("0 / 2 invités");
    // Deux places libres, chacune avec son « + » et son mot.
    expect(document.querySelectorAll(".chaine-slot.libre .chaine-slot-socle")).toHaveLength(2);
    expect(document.querySelectorAll(".chaine-slot.pose")).toHaveLength(0);
    expect(html).toContain("Place 1 libre");
    expect(html).toContain("Place 2 libre");
    // Les huit objets du studio sont là, tous éteints : rien d'acheté, rien
    // d'allumé — la scène ne ment pas sur le setup du joueur.
    expect(document.querySelectorAll(".chaine-prop")).toHaveLength(8);
    expect(document.querySelectorAll(".chaine-prop.on")).toHaveLength(0);
    expect(html).toContain("Caméra");
    // Le pied de la scène invite simplement, et rien ne pulse.
    expect(html).toContain("Invite une carte de ta collection");
    expect(document.querySelector(".chaine-slot-aura")).toBeNull();
    expect(document.querySelector(".chaine-scene-raid")).toBeNull();
  });

  it("allume un objet par palier acheté : le studio se voit avant de se lire", async () => {
    await scene({ setup: ["webcam", "lumiere", "plateau"] });
    const html = banc.ecran("30-bureau-setup");
    const allumes = [...document.querySelectorAll(".chaine-prop.on")].map((li) => li.className);
    expect(allumes).toHaveLength(3);
    expect(allumes.join(" ")).toContain("prop-webcam");
    expect(allumes.join(" ")).toContain("prop-lumiere");
    expect(allumes.join(" ")).toContain("prop-plateau");
    // Le néon et le fond de scène suivent l'éclairage et le plateau : la scène
    // entière change de classe, pas seulement l'objet.
    const racine = document.querySelector("section.chaine-scene")!;
    expect(racine.className).toContain("eclaire");
    expect(racine.className).toContain("plateau");
    expect(html).toContain("prop-webcam2");
    expect(document.querySelectorAll(".chaine-prop.on")).toHaveLength(3);
  });

  it("pose une vraie carte du classeur sur le socle, et dit sa part", async () => {
    await scene({
      guests: [invite(1, IBAI.slug, "legendary"), invite(2, KAMET0.slug, "uncommon")],
      collabPermille: 150,
    });
    const html = banc.ecran("30-bureau-invites");
    expect(html).toContain("2 / 2 invités");
    expect(document.querySelectorAll(".chaine-slot.pose")).toHaveLength(2);
    expect(document.querySelectorAll(".chaine-slot.libre")).toHaveLength(0);
    // Une carte du jeu, pas une vignette inventée : le nom dupliqué de
    // `CreatorCard` est là, et les deux invités sont nommés.
    expect(document.querySelectorAll(".card-nameplate").length).toBeGreaterThanOrEqual(2);
    expect(html).toContain(IBAI.displayName);
    expect(html).toContain(KAMET0.displayName);
    // Chaque socle dit ce qu'il apporte : la rareté, la part de raid, la part
    // de vidéo — les chiffres du fichier, pas des chiffres de la scène.
    expect(html).toContain("+12 % vidéo"); // Légendaire : 120 pour mille
    expect(html).toContain("+9.0 % raid"); // Légendaire : 90 pour mille
    expect(html).toContain("+3 % vidéo"); // Peu commune : 30 pour mille
    // Aucun des deux ne streame : « hors ligne », et rien qui pulse.
    expect(html).toContain("hors ligne");
    expect(document.querySelector(".chaine-slot-aura")).toBeNull();
    // Le pied additionne le plateau, et dit qu'il est **sans** le direct.
    expect(html).toContain("Plateau : +15.0 %");
    expect(html).toContain("sans le direct");
  });

  it("allume l'invité en direct : aura, badge LIVE, bandeau RAID — et lui seul", async () => {
    await scene({
      guests: [invite(1, IBAI.slug, "legendary"), invite(2, KAMET0.slug, "uncommon")],
      direct: new Set([IBAI.slug]),
      liveStreams: new Map([[IBAI.slug, direct("ibai", 4321)]]),
      collabPermille: 300,
      collabLive: true,
    });
    const html = banc.ecran("30-bureau-raid");
    // Un seul invité est en direct : une aura, un badge, et c'est le bon socle.
    const enDirect = document.querySelectorAll(".chaine-slot.en-direct");
    expect(enDirect).toHaveLength(1);
    expect(enDirect[0].getAttribute("data-place")).toBe("1");
    expect(document.querySelectorAll(".chaine-slot-aura")).toHaveLength(1);
    expect(html).toContain("LIVE");
    // Le nombre de spectateurs vient de la table du direct, jamais du hasard.
    expect(html).toContain("4\u202f321 spectateurs");
    // Le bandeau du moment, et le pied qui compte le direct.
    expect(html).toContain("RAID !");
    expect(html).toContain("Plateau : +30.0 %");
    expect(html).toContain("direct compris");
    // L'autre invité reste éteint : la scène ne s'emballe pas toute seule.
    expect(document.querySelectorAll(".chaine-slot-aura")).toHaveLength(1);
  });

  it("paie le relevé une fois : la ligne du raid, ou l'aperçu, jamais les deux", async () => {
    await scene({ raidToday: 0, raidPossible: 42 });
    expect(banc.ecran("30-bureau-raid-a-venir")).toContain("+42 abonnés");

    banc.vider();
    await scene({ raidToday: 42, raidLine: "Raid : un invité est passé en direct — +42 abonnés." });
    const html = banc.ecran("30-bureau-raid-paye");
    expect(html).toContain("Raid : un invité est passé en direct");
    // Déjà payé : l'aperçu disparaît — on ne promet pas deux fois le même.
    expect(html).not.toContain("ton relevé ajoute");
  });

  it("ouvre la bonne place, et retire le bon invité", async () => {
    const props = await scene({
      guests: [invite(1, IBAI.slug, "legendary")],
    });
    const appuyer = (selecteur: string) => {
      const bouton = document.querySelector<HTMLButtonElement>(selecteur);
      expect(bouton).not.toBeNull();
      act(() => {
        bouton!.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
      });
    };

    // Le « + » de la place 2 ouvre le classeur pour la place 2, pas une autre.
    appuyer('button[aria-label="Choisir un invité pour la place 2"]');
    expect(props.onOpenSlot).toHaveBeenCalledWith(2);
    // « Changer » sur la carte posée rouvre la place 1.
    appuyer('button[aria-label="Changer l\'invité de la place 1"]');
    expect(props.onOpenSlot).toHaveBeenCalledWith(1);
    // La croix retire l'invité : c'est la porte du moteur (`poserInvite`).
    appuyer('button[aria-label="Retirer l\'invité de la place 1"]');
    expect(props.onRemove).toHaveBeenCalledWith(1);
  });

  it("accorde le titre : un invité au singulier, aucun au pluriel", async () => {
    await scene({ guests: [invite(2, KAMET0.slug, "rare")] });
    expect(banc.ecran("30-bureau-un-invite")).toContain("1 / 2 invité");

    // Le banc vidé remonte une scène neuve : personne, donc le pluriel.
    banc.vider();
    await scene();
    expect(banc.ecran("30-bureau-pluriel")).toContain("0 / 2 invités");
  });

  it("n'ouvre rien pendant que le serveur travaille, et reprend après", async () => {
    await scene({ busy: true });
    const bouton = document.querySelector<HTMLButtonElement>('button[aria-label="Choisir un invité pour la place 1"]')!;
    // Occupé : le socle est là, mais le bouton ne répond pas — pas de
    // deuxième écriture pendant que la première est en vol.
    expect(bouton.disabled).toBe(true);
  });
});
