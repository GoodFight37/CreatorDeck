/**
 * **Le studio**, monté dans un DOM — le banc d'écran de la scène de « Ta chaîne ».
 *
 * Le module pur (`src/lib/studio-room.test.ts`, dans `npm test`) dit **où** tombe
 * chaque sprite et vérifie les images ; ici on vérifie ce que la scène
 * **montre**, et rien de plus :
 *
 *   * le **HUD arcade** (le badge de rang, la jauge d'abonnés, le rythme, les
 *     jetons) remplace les chiffres en colonne de l'ancien tableau de bord ;
 *   * la **pièce** : ce sont les images du kit (une balise `img` par sprite),
 *     et un palier acheté fait **entrer son objet** — ce qui n'est pas acheté
 *     n'est pas là, et rien ne se coche ;
 *   * les **deux socles** : une vraie carte du classeur posée dessus en
 *     miniature, un piédestal translucide (jamais une boîte pointillée) quand la
 *     place est libre ;
 *   * l'**aura du direct** : elle ne s'allume que pour un créateur qui streame
 *     maintenant, et l'écran dit « EN DIRECT » sans mentir sur les spectateurs ;
 *   * les **gestes** : chaque socle, chaque carte a sa porte (ouvrir, changer,
 *     retirer), et rien ne répond pendant que le serveur travaille ;
 *   * l'**arrivée d'un palier acheté** : ses objets tombent en place, dans
 *     l'ordre de la pièce, et une bouffée de fumée marque l'endroit — une seule
 *     fois, au moment de l'achat.
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
import { SETUP_LEVELS } from "@/lib/streamer";

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

  /** Toutes les images posées dans la pièce, par leur `src`. */
  function images() {
    return [...document.querySelectorAll<HTMLImageElement>(".chaine-room img")].map((img) =>
      img.getAttribute("src"),
    );
  }

  it("ouvre sur un HUD et une pièce : la jauge, le rythme, le décor du kit", async () => {
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
    // La pièce est là : un sol de neuf tuiles, deux murs, et le mobilier de base
    // — des **images**, jamais un dessin de la scène.
    const posees = images();
    expect(document.querySelector(".chaine-room")).not.toBeNull();
    expect(posees.filter((src) => src?.includes("floorFull_SE")).length).toBe(9);
    expect(posees.filter((src) => src?.includes("wall_")).length).toBe(6);
    expect(posees).toContain("/streamer/4/Isometric/deskCorner_SE.png");
    expect(posees).toContain("/streamer/4/Isometric/chairDesk_SE.png");
    // Aucun palier acheté : aucun équipement du setup n'est entré dans la pièce.
    expect(posees).not.toContain("/streamer/4/Isometric/speaker_SE.png");
    expect(posees).not.toContain("/streamer/4/Isometric/lampSquareFloor_SE.png");
    expect(document.querySelectorAll(".chaine-neon")).toHaveLength(0);
    expect(document.querySelectorAll(".chaine-gadget")).toHaveLength(0);
    // Deux socles libres : un piédestal translucide, jamais une boîte pointillée.
    expect(document.querySelectorAll(".chaine-stand.libre")).toHaveLength(2);
    expect(document.querySelectorAll(".chaine-stand-ghost")).toHaveLength(2);
    expect(document.querySelectorAll(".chaine-stand-socle")).toHaveLength(2);
    expect(html).toContain("Plateau");
    // Aucune aura, aucun bandeau de raid : personne ne streame.
    expect(document.querySelector(".chaine-stand-aura")).toBeNull();
    expect(document.querySelector(".chaine-chip.live")).toBeNull();
  });

  it("fait entrer un objet par palier : le studio se voit avant de se lire", async () => {
    await scene({ setup: ["webcam", "lumiere", "plateau"] });
    const html = banc.ecran("30-studio-setup");
    const posees = images();
    expect(posees).toContain("/streamer/4/Isometric/sideTable_SE.png");
    expect(posees).toContain("/streamer/4/Isometric/lampSquareFloor_SE.png");
    expect(posees).toContain("/streamer/4/Isometric/televisionModern_SE.png");
    // Ce qui n'est pas acheté n'est pas là — et les paliers voisins non plus.
    expect(posees).not.toContain("/streamer/4/Isometric/speaker_SE.png");
    expect(posees).not.toContain("/streamer/4/Isometric/radio_SE.png");
    // Les formes CSS suivent le même chemin : la webcam, le halo de la lampe.
    expect(document.querySelectorAll(".chaine-gadget.webcam")).toHaveLength(1);
    expect(document.querySelectorAll(".chaine-gadget.micro")).toHaveLength(0);
    expect(document.querySelectorAll(".chaine-halo")).toHaveLength(1);
    // La lumière change l'ambiance : la pièce porte la classe.
    expect(document.querySelector(".chaine-room")?.className).toContain("eclaire");
    expect(html).toContain("Plateau");
  });

  it("couvre les huit paliers : chacun fait entrer quelque chose", async () => {
    // Tous les paliers d'un coup : la pièce est complète, et c'est la même
    // scène qui doit le dire — si un palier n'avait rien à montrer, le joueur
    // paierait un objet invisible.
    await scene({ setup: SETUP_LEVELS.map((niveau) => niveau.id) });
    banc.ecran("30-studio-complet");
    const posees = images();
    for (const asset of [
      "sideTable_SE",
      "speaker_SE",
      "speakerSmall_SE",
      "lampSquareFloor_SE",
      "rugRectangle_SE",
      "paneling_SE",
      "paneling_SW",
      "loungeDesignSofa_SE",
      "laptop_SE",
      "radio_SE",
      "cabinetTelevision_SE",
      "televisionModern_SE",
    ]) {
      expect(posees, `objet manquant : ${asset}`).toContain(`/streamer/4/Isometric/${asset}.png`);
    }
    expect(document.querySelectorAll(".chaine-neon")).toHaveLength(2);
    expect(document.querySelectorAll(".chaine-gadget")).toHaveLength(2);
    expect(document.querySelector(".chaine-room")?.className).toContain("neon");
  });

  it("marque l'arrivée d'un palier : l'objet tombe, la fumée tombe avec lui", async () => {
    // Le moment de l'achat : la déco est installée **à l'instant** (sept objets
    // d'un coup). C'est le seul moment où la pièce a le droit de bouger.
    await scene({ setup: ["deco"], justInstalled: "deco" });
    banc.ecran("30-studio-arrivee");

    // Sept objets arrivent, chacun à son tour (90 ms d'écart) : ils tombent en
    // place au lieu de se téléporter entre deux images.
    const arrives = [...document.querySelectorAll<HTMLElement>(".chaine-room .vient-d-installer")];
    expect(arrives).toHaveLength(7);
    const retards = arrives.map((el) => el.style.getPropertyValue("--install-delay"));
    expect(new Set(retards).size).toBe(7);
    for (const retard of retards) expect(retard).toMatch(/^\d+ms$/);

    // La fumée : trois bouffées au plus, qui se suivent — et elles tombent bien
    // **dans** la pièce, pas dans un coin de l'écran.
    const fumees = [...document.querySelectorAll<HTMLElement>(".chaine-room .fx-burst.fx-fumee")];
    expect(fumees).toHaveLength(3);
    for (const fumee of fumees) {
      expect(fumee.style.getPropertyValue("--fx-left")).toMatch(/%$/);
      expect(fumee.style.getPropertyValue("--fx-offset")).toMatch(/%$/);
      expect(fumee.style.getPropertyValue("--fx-size")).toBe("150px");
    }
    expect(fumees.map((fumee) => fumee.style.getPropertyValue("--fx-delay"))).toEqual([
      "0ms",
      "140ms",
      "280ms",
    ]);
  });

  it("ne joue l'arrivée qu'une fois : au quotidien, la pièce ne bouge pas", async () => {
    // Sans achat en cours, rien ne tombe et rien ne fume — sinon la pièce
    // rejouerait la scène à chaque retour dans l'onglet.
    await scene({ setup: ["deco"] });
    banc.ecran("30-studio-deco-posée");
    expect(document.querySelectorAll(".chaine-room .vient-d-installer")).toHaveLength(0);
    expect(document.querySelectorAll(".chaine-room .fx-burst")).toHaveLength(0);
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
    // Chaque socle dit sa rareté et sa part de vidéo — les chiffres du fichier.
    expect(html).toContain("Légendaire");
    expect(html).toContain("+12 %");
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
    // Le voyant REC bat avec le direct : c'est la pièce qui dit « on est en
    // direct », pas une phrase.
    expect(document.querySelector(".chaine-room")?.className).toContain("en-direct");
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

    // Le piédestal libre de la place 2 ouvre le classeur pour la place 2.
    appuyer('button[aria-label="Choisir un invité pour la place 2"]');
    expect(props.onOpenSlot).toHaveBeenCalledWith(2);
    // La carte posée rouvre la place 1 (le tap la change).
    appuyer('button[aria-label="Changer l\'invité de la place 1"]');
    expect(props.onOpenSlot).toHaveBeenCalledWith(1);
    // La croix du socle retire l'invité : c'est la porte du moteur.
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
