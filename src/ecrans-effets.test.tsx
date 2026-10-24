/**
 * Les effets de **moment rare**, montés pour de vrai : l'éclat d'une Épique,
 * l'éclat en grand (et l'écran blanc) d'une Légendaire, et rien du tout sur
 * une carte ordinaire.
 *
 * Ce banc monte `RevealOverlay` directement, avec des cartes écrites à la main :
 * c'est le seul moyen de choisir la rareté. Le tirage, lui, a ses propres bancs
 * (`src/lib/pull.test.ts`, `src/ecrans.test.tsx`).
 *
 * Ce qui compte ici :
 *
 *   * **le rare se mérite** — pas d'effet sous l'Épique ;
 *   * l'effet est **branché sur le son** : le retard vaut le silence de la
 *     rareté, sinon on verrait les étincelles avant d'entendre le bang ;
 *   * l'effet **part** (l'animation est bornée), il ne tourne pas en boucle.
 */
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { creerBanc, type Banc } from "@/ecrans-banc";
import { PERFECT_LOCK_MS, revealTiming, silenceBefore } from "@/lib/reveal";
import { CREATORS, PACKS, RARITY_META } from "@/lib/catalog";
import { createInitialState } from "@/lib/game-engine";
import { gameStore } from "@/lib/game-store";
import { EMPTY_LIVE, indexLive, type LiveSnapshot } from "@/lib/live";

// Le direct est lu tel quel, sauf quand un test pose une chaîne en direct.
const liveMock = vi.hoisted(() => ({ current: null as unknown }));
vi.mock("@/hooks/use-live", async (original) => {
  const actual = await original<typeof import("@/hooks/use-live")>();
  return { ...actual, useLive: () => (liveMock.current as LiveSnapshot | null) ?? actual.useLive() };
});

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://exemple.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "sb_publishable_exemple_de_banc_d_essai_0000";
});

const T0 = Date.UTC(2026, 9, 8, 12, 0, 0);

type Rarete = "common" | "uncommon" | "rare" | "epic" | "legendary";

/** Une carte tirée, réduite à ce que la révélation regarde. */
function carte(rarity: Rarete, id: string = rarity) {
  return {
    id,
    creatorSlug: CREATORS.find(creator => creator.rarity === rarity)!.slug,
    rarity,
    variant: "standard" as const,
    // Les effets de rareté se jouent sur une carte nouvelle ; un doublon rejoint la pile.
    isNew: true,
    rareDrop: false,
  };
}

describe("les effets de révélation", () => {
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

  async function reveler(cards: ReturnType<typeof carte>[], index = 0) {
    const { RevealOverlay } = await import("@/components/reveal-overlay");
    await banc.monter(
      <RevealOverlay
        cards={cards as never}
        index={index}
        overlay
        onNext={() => {}}
        onClose={() => {}}
      />,
    );
    return banc.ecran(`reveal-${cards[index]?.rarity}-${cards[index]?.id}`);
  }

  it("ne met rien du tout sur une carte ordinaire", async () => {
    // Le point qui compte : des étincelles sur du commun rendraient la
    // Légendaire ordinaire.
    const html = await reveler([carte("common")]);
    expect(html).not.toContain("fx-burst");
    expect(html).not.toContain("reveal-rare-aura");
    expect(html).not.toContain("reveal-cinematic-field");
    expect(html).not.toContain("fx-flash");
  });

  it("donne au Rare son aura bordeaux, sans flash d'Épique", async () => {
    const html = await reveler([carte("rare")]);
    expect(html).toContain("reveal-rare-aura-rare");
    expect(html).not.toContain("CARTE D'EXCEPTION");
    expect(html).not.toContain("reveal-cinematic-field");
    expect(html).not.toContain("fx-flash");
  });

  it("donne un éclat à l'Épique, sans écran blanc", async () => {
    const html = await reveler([carte("epic")]);
    expect(html).toContain("reveal-rare-aura");
    expect(html).toContain("reveal-cinematic-field");
    expect(html).not.toContain("fx-burst");
    // La planche est décrite **en CSS** (nombre d'images, durée) : ce qui est
    // écrit dans le document, c'est la taille et le retard.
    expect(html).toContain("--rare-delay: 520ms");
    // Pas de flash : une Épique n'a pas droit au plein écran.
    expect(html).not.toContain("fx-flash");
  });

  it("donne le même éclat **en plus grand**, et l'écran blanc, à la Légendaire", async () => {
    // L'explosion dorée est partie le 9 octobre 2026 : le joueur ne la trouvait
    // pas belle. Le Légendaire garde l'éclat de l'Épique, une fois et demie
    // plus grand — la taille fait la hiérarchie, plus un autre dessin.
    const html = await reveler([carte("legendary")]);
    expect(html).toContain("reveal-rare-aura");
    expect(html).toContain("reveal-cinematic-field");
    expect(html).not.toContain("fx-burst");
    expect(html).not.toContain("fx-explosion");
    expect(html).toContain("fx-flash");
    expect(html).toContain("reveal-rare-aura-legendary");
  });

  it("écrit la rareté sur la carte, pour que l'entrée la suive", async () => {
    // Le CSS accroche l'animation sur `.reveal-card.rarity-legendary` : sans la
    // classe dans le document, une Légendaire entrerait comme une commune. La
    // classe est posée par `CreatorCard` — ce test vérifie que les deux se
    // rencontrent bien sur le **même** élément.
    const legende = await reveler([carte("legendary")]);
    const classes = /class="([^"]*reveal-card[^"]*)"/.exec(legende)?.[1] ?? "";
    expect(classes, "aucune carte révélée").toContain("reveal-card");
    expect(classes, `la rareté n'est pas sur la carte : ${classes}`).toContain("rarity-legendary");

    banc.vider();
    banc.preparer();
    const commune = await reveler([carte("common")]);
    const classesCommunes = /class="([^"]*reveal-card[^"]*)"/.exec(commune)?.[1] ?? "";
    expect(classesCommunes, `la rareté n'est pas sur la carte : ${classesCommunes}`).toContain(
      "rarity-common",
    );
  });

  it("cale l'effet sur le son : le retard est le silence de la rareté", async () => {
    // `silenceBefore()` vaut 520 ms pour une Épique ou une Légendaire : l'éclat
    // part avec le bang, pas avant.
    const epique = await reveler([carte("epic")]);
    expect(epique).toContain("--rare-delay: 520ms");

    banc.vider();
    banc.preparer();
    const legendaire = await reveler([carte("legendary")]);
    expect(legendaire).toContain("--rare-delay: 520ms");
    // Et la taille suit la rareté : l'éclat d'une Légendaire vaut une fois et
    // demie celui d'une Épique (280 px → 420 px). Les deux débordent
    // largement de la carte, sinon elle les cache.
    expect(legendaire).toContain("reveal-rare-aura-legendary");
    expect(epique).toContain("reveal-rare-aura-epic");
    // La durée vient de `FX_SHEETS`, écrite en ligne : 40 ms par image, de
    // quoi laisser le temps de voir.
    expect(legendaire).not.toContain("fx-burst");
  });

  it("joue l'éclat en grand d'emblée sur un Perfect, sans silence", async () => {
    // Le Perfect est le paquet entier : il n'a pas de silence, il est le moment.
    const cinq = [carte("epic", "a"), carte("epic", "b"), carte("epic", "c"), carte("epic", "d"), carte("epic", "e")];
    cinq[0]!.rareDrop = true;
    const html = await reveler(cinq as never);
    expect(html).toContain("reveal-rare-aura");
    expect(html).toContain("reveal-cinematic-field");
    expect(html).not.toContain("fx-burst");
    // Tout le paquet est rare : l'éclat est à sa taille maximale.
    expect(html).toContain("reveal-rare-aura-perfect");
    expect(html).toContain("--rare-delay: 0ms");
    // Le blanc du Perfect est déjà là depuis le verrouillage… et l'effet part
    // au premier rendu, pas après un temps d'attente.
    expect(html).toContain("fx-flash");
  });

  it("range les cinq cartes du Perfect d’un appui une fois le verrou levé", async () => {
    /*
     * Le bogue du 9 octobre 2026 : un joueur ouvre un booster, les **cinq**
     * cartes apparaissent ensemble — c'est le tirage Perfect, voulu — et le
     * bouton du bas propose « Carte suivante ». Il n'y a plus rien à
     * révéler : l'appui ne faisait rien de visible, le joueur croyait à une
     * panne. Quand les cinq sont à l'écran, le paquet se **range**.
     */
    const suivant = vi.fn();
    const fermer = vi.fn();
    const cinq = [carte("epic", "a"), carte("epic", "b"), carte("epic", "c"), carte("epic", "d"), carte("epic", "e")];
    cinq[0]!.rareDrop = true;
    for (const item of cinq) item.isNew = false;
    cinq[2]!.isNew = true;
    const { RevealOverlay } = await import("@/components/reveal-overlay");
    await banc.monter(
      <RevealOverlay cards={cinq as never} index={0} streakReward={{ day: 2, packs: 1, points: 0, hourglasses: 0, tokens: 0 }} onNext={suivant} onClose={fermer} />,
    );
    expect(document.querySelector(".reveal-corner-handle"), "le Perfect garde ses cinq cartes immédiates").toBeNull();
    expect(document.querySelector(".reveal-fifth-card"), "le Perfect ne reçoit pas le temps de pose séquentiel").toBeNull();
    expect(document.querySelectorAll(".streak-gain")).toHaveLength(0);
    expect(document.querySelectorAll(".perfect-card-caption")).toHaveLength(5);
    expect(document.querySelectorAll(".perfect-card-caption strong")).toHaveLength(0);
    expect(document.querySelectorAll(".reveal-perfect-grid .creator-card.is-compact")).toHaveLength(5);
    expect(document.querySelector(".perfect-card-new .perfect-card-caption")?.textContent).toContain("Nouvelle");

    const bouton = () => document.querySelector<HTMLButtonElement>(".reveal-next")!;
    // Pendant le verrou, le bouton est bien verrouillé — mais il **montre**
    // l'attente (classe `locked` + barre) au lieu de ressembler à une panne.
    expect(bouton().disabled, "le verrou du Perfect ne verrouille plus").toBe(true);
    expect(bouton().className).toContain("locked");
    expect(bouton().style.getPropertyValue("--lock-ms")).toBe(`${PERFECT_LOCK_MS}ms`);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(PERFECT_LOCK_MS + 50);
    });

    expect(bouton().disabled, "le Perfect reste verrouillé").toBe(false);
    expect(bouton().textContent).toContain("Ranger dans le classeur");
    expect(bouton().textContent).not.toContain("Carte suivante");
    expect(document.querySelectorAll(".streak-gain")).toHaveLength(1);
    expect(document.querySelector(".streak-gain")?.textContent).toContain("Série J2 — +1 booster");
    banc.ecran("12-perfect-range");

    // Personne en direct : les cartes se rangent d'un appui, sans récap à lire.
    banc.appuyer("Ranger dans le classeur");
    expect(document.querySelector(".reveal-summary")).toBeNull();
    expect(fermer).toHaveBeenCalledTimes(1);
    expect(suivant, "le Perfect repart en arrière").not.toHaveBeenCalled();
  });

  it.each(["rare", "epic", "legendary"] as const)("range la dernière carte %s dès le premier appui", async (rarity) => {
    const fermer = vi.fn();
    const suivant = vi.fn();
    const { RevealOverlay } = await import("@/components/reveal-overlay");
    await banc.monter(
      <RevealOverlay cards={[carte("common", "un"), carte(rarity, "deux")] as never}
        index={1} onNext={suivant} onClose={fermer} />,
    );
    banc.ecran(`jeu-derniere-${rarity}`);
    await act(async () => { await vi.advanceTimersByTimeAsync(1_200 + silenceBefore(rarity)); });
    banc.appuyer("Ranger dans le classeur");
    expect(document.querySelector(".reveal-summary")).toBeNull();
    expect(fermer).toHaveBeenCalledTimes(1);
    expect(suivant).not.toHaveBeenCalled();
  });

  it("révèle la suivante tant que le paquet n'est pas terminé", async () => {
    // Hors Perfect, « Carte suivante » reste le geste normal après le flip ;
    // pendant le retournement, le bouton est verrouillé.
    const suivant = vi.fn();
    const { RevealOverlay } = await import("@/components/reveal-overlay");
    await banc.monter(
      <RevealOverlay
        cards={[carte("common", "un"), carte("rare", "deux")] as never}
        index={0}
        onNext={suivant}
        onClose={() => {}}
      />,
    );
    const bouton = () => document.querySelector<HTMLButtonElement>(".reveal-next")!;
    expect(bouton().textContent).toContain("Révélation…");
    expect(bouton().disabled).toBe(true);
    act(() => {
      bouton().dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
      bouton().dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
    });
    expect(bouton().textContent).toContain("Révélation…");
    expect(suivant).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(1_200); });
    expect(suivant).not.toHaveBeenCalled();
    expect(bouton().disabled).toBe(false);
    banc.appuyer("Carte suivante");
    expect(suivant).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["horizontal", 120, 2],
    ["vers le haut", 2, -120],
  ])("avance par balayage %s une fois la face visible", async (_direction, dx, dy) => {
    const suivant = vi.fn();
    const { RevealOverlay } = await import("@/components/reveal-overlay");
    await banc.monter(<RevealOverlay cards={[carte("common", "a"), carte("rare", "b")] as never}
      index={0} onNext={suivant} onClose={() => {}} />);
    await act(async () => { await vi.advanceTimersByTimeAsync(1_200); });
    const anchor = document.querySelector<HTMLDivElement>(".reveal-anchor")!;
    const pointer = (type: string, x: number, y: number) => new window.MouseEvent(type, {
      bubbles: true, clientX: x, clientY: y,
    });
    act(() => {
      anchor.dispatchEvent(pointer("pointerdown", 100, 100));
      anchor.dispatchEvent(pointer("pointermove", 100 + dx, 100 + dy));
      anchor.dispatchEvent(pointer("pointerup", 100 + dx, 100 + dy));
    });
    expect(suivant).toHaveBeenCalledOnce();
  });

  it("ne saute pas le flip et ramène une carte relâchée avant le seuil", async () => {
    const { RevealOverlay } = await import("@/components/reveal-overlay");
    const next = vi.fn();
    await banc.monter(<RevealOverlay cards={[carte("common", "a"), carte("rare", "b")] as never}
      index={0} onNext={next} onClose={() => {}} />);
    const anchor = document.querySelector<HTMLDivElement>(".reveal-anchor")!;
    const pointer = (type: string, x: number, y: number) => new window.MouseEvent(type, {
      bubbles: true, clientX: x, clientY: y,
    });
    act(() => {
      anchor.dispatchEvent(pointer("pointerdown", 100, 100));
      anchor.dispatchEvent(pointer("pointerup", 200, 100));
    });
    expect(next).not.toHaveBeenCalled();
    expect(document.querySelector(".reveal-swipe-prompt")).toBeNull();
    await act(async () => { await vi.advanceTimersByTimeAsync(1_200); });
    expect(document.querySelector(".reveal-swipe-prompt")?.textContent).toContain("Glisse la carte");
    act(() => {
      anchor.dispatchEvent(pointer("pointerdown", 100, 100));
      anchor.dispatchEvent(pointer("pointermove", 124, 100));
    });
    expect(anchor.classList.contains("is-swiping")).toBe(true);
    expect(anchor.style.getPropertyValue("--reveal-drag-x")).toBe("24px");
    expect(anchor.style.getPropertyValue("--reveal-tilt-y")).toBe("");
    act(() => { anchor.dispatchEvent(pointer("pointerup", 124, 100)); });
    expect(next).not.toHaveBeenCalled();
    expect(anchor.classList.contains("is-swiping")).toBe(false);
    expect(anchor.style.getPropertyValue("--reveal-drag-x")).toBe("");
  });

  it("le balayage de la dernière carte range le paquet sans avancer", async () => {
    const { RevealOverlay } = await import("@/components/reveal-overlay");
    const next = vi.fn(), close = vi.fn();
    await banc.monter(<RevealOverlay cards={[carte("common", "a")] as never}
      index={0} onNext={next} onClose={close} />);
    await act(async () => { await vi.advanceTimersByTimeAsync(1_200); });
    const anchor = document.querySelector<HTMLDivElement>(".reveal-anchor")!;
    act(() => {
      anchor.dispatchEvent(new window.MouseEvent("pointerdown", { bubbles: true, clientX: 100, clientY: 180 }));
      anchor.dispatchEvent(new window.MouseEvent("pointermove", { bubbles: true, clientX: 100, clientY: 90 }));
      anchor.dispatchEvent(new window.MouseEvent("pointerup", { bubbles: true, clientX: 100, clientY: 90 }));
    });
    expect(document.querySelector(".reveal-summary")).toBeNull();
    expect(next).not.toHaveBeenCalled();
    expect(close).toHaveBeenCalledOnce();
  });

  it("le filet de sécurité n’avance pas avant la fin d’un flip retardé Épique", async () => {
    const { RevealOverlay } = await import("@/components/reveal-overlay");
    const next = vi.fn();
    await banc.monter(<RevealOverlay cards={[carte("epic", "a"), carte("common", "b")] as never}
      index={0} onNext={next} onClose={() => {}} />);
    expect(document.querySelector<HTMLButtonElement>(".reveal-next")?.disabled).toBe(true);
    act(() => document.querySelector<HTMLButtonElement>(".reveal-next")!
      .dispatchEvent(new window.MouseEvent("click", { bubbles: true })));
    await act(async () => { await vi.advanceTimersByTimeAsync(1_200); });
    expect(next).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(520); });
    expect(next).not.toHaveBeenCalled();
    banc.appuyer("Carte suivante");
    expect(next).toHaveBeenCalledOnce();
  });

  it("révèle directement la cinquième carte sans languette", async () => {
    const fermer = vi.fn();
    const cinq = Array.from({ length: 5 }, (_, index) => carte("common", `garantie-${index}`));
    const { RevealOverlay } = await import("@/components/reveal-overlay");
    await banc.monter(
      <RevealOverlay cards={cinq as never} index={4} onNext={() => {}} onClose={fermer} />,
    );

    expect(document.querySelector(".reveal-corner-handle")).toBeNull();
    expect(document.querySelector(".reveal-flip.reveal-fifth-card .reveal-flip-face"),
      "la cinquième carte garde le retournement automatique ordinaire").not.toBeNull();
    expect(document.querySelectorAll(".reveal-next")).toHaveLength(1);
    expect(document.querySelector<HTMLButtonElement>(".reveal-next")?.textContent)
      .toContain("Révélation…");

    await act(async () => { await vi.advanceTimersByTimeAsync(1_600); });
    expect(document.querySelector<HTMLButtonElement>(".reveal-next")?.textContent)
      .toContain("Ranger dans le classeur");
  });

  it("ignore l'appui pendant le flip de la cinquième carte", async () => {
    const fermer = vi.fn();
    const cinq = Array.from({ length: 5 }, (_, index) => carte("common", `filet-${index}`));
    const { RevealOverlay } = await import("@/components/reveal-overlay");
    await banc.monter(
      <RevealOverlay cards={cinq as never} index={4} overlay onNext={() => {}} onClose={fermer} />,
    );

    expect(document.querySelector<HTMLButtonElement>(".reveal-next")?.disabled).toBe(true);
    act(() => document.querySelector<HTMLButtonElement>(".reveal-next")!
      .dispatchEvent(new window.MouseEvent("click", { bubbles: true })));
    expect(fermer).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(1_200); });
    expect(fermer).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(359); });
    expect(fermer).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(document.querySelector<HTMLButtonElement>(".reveal-next")?.disabled).toBe(false);
    banc.appuyer("Ranger dans le classeur");
    expect(fermer).toHaveBeenCalledOnce();
  });

  it("conserve le retournement direct quand les effets de carte sont coupés", async () => {
    document.documentElement.dataset.cardFx = "off";
    try {
      const cinq = Array.from({ length: 5 }, (_, index) => carte("common", `sobre-${index}`));
      const fermer = vi.fn();
      const { RevealOverlay } = await import("@/components/reveal-overlay");
      await banc.monter(<RevealOverlay cards={cinq as never} index={4} onNext={() => {}} onClose={fermer} />);
      expect(document.querySelector(".reveal-flip.reveal-fifth-card .reveal-flip-face"),
        "Reflets OFF garde le même emplacement sans la pause CSS").not.toBeNull();
      await act(async () => { await vi.advanceTimersByTimeAsync(0); });
      expect(document.querySelector<HTMLButtonElement>(".reveal-next")?.textContent)
        .toContain("Ranger dans le classeur");
      // Le mode sobre saute le flip ; personne en direct, un appui range le paquet.
      act(() => document.querySelector<HTMLButtonElement>(".reveal-next")!.click());
      expect(fermer).toHaveBeenCalledOnce();
    } finally {
      delete document.documentElement.dataset.cardFx;
    }
  });

  it("ignore les appuis répétés pendant le retournement", async () => {
    const { RevealOverlay } = await import("@/components/reveal-overlay");
    const suivant = vi.fn();
    await banc.monter(
      <RevealOverlay cards={[carte("common", "a"), carte("common", "b")] as never}
        index={0} overlay onNext={suivant} onClose={() => {}} />,
    );
    const bouton = document.querySelector<HTMLButtonElement>(".reveal-next")!;
    expect(bouton.disabled).toBe(true);
    act(() => {
      bouton.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
      bouton.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
    });
    expect(bouton.textContent).toContain("Révélation…");
    expect(suivant).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(1_200); });
    expect(suivant).not.toHaveBeenCalled();
    expect(bouton.disabled).toBe(false);
    banc.appuyer("Carte suivante");
    expect(suivant).toHaveBeenCalledOnce();
  });

  it.each(["rare", "epic", "legendary"] as const)("synchronise le SFX %s sur l'impact, y compris au cinquième emplacement", async (rarity) => {
    const sounds = await import("@/lib/sfx");
    const bang = vi.spyOn(sounds, "playBang").mockImplementation(() => {});
    const stinger = vi.spyOn(sounds, "playLegendaryStinger").mockImplementation(() => {});
    const { RevealOverlay } = await import("@/components/reveal-overlay");
    const cards = Array.from({ length: 5 }, (_, i) => carte(i === 4 ? rarity : "common", `impact-${i}`));
    try {
      await banc.monter(<RevealOverlay cards={cards as never} index={4} onNext={() => {}} onClose={() => {}} />);
      const timing = revealTiming(rarity, true, true);
      const next = document.querySelector<HTMLButtonElement>(".reveal-next")!;
      expect(next.disabled).toBe(true);
      await act(async () => { await vi.advanceTimersByTimeAsync(timing.impactMs - 1); });
      expect(bang).not.toHaveBeenCalled();
      await act(async () => { await vi.advanceTimersByTimeAsync(1); });
      expect(bang).toHaveBeenCalledExactlyOnceWith(rarity, "standard");
      expect(stinger).toHaveBeenCalledTimes(rarity === "legendary" ? 1 : 0);
      expect(next.disabled).toBe(true);
      // jsdom ne joue pas les animations CSS : vérifier le filet de sécurité.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1_200 + silenceBefore(rarity) + 360 - timing.impactMs);
      });
      expect(next.disabled).toBe(false);
    } finally {
      bang.mockRestore();
      stinger.mockRestore();
    }
  });

  it("se choisit sur la carte du moment, pas sur la première du paquet", async () => {
    // Un paquet où la Légendaire est en deuxième position : à l'index 1, c'est
    // bien l'explosion qu'on doit voir. Le rejeu de l'animation, lui, tient à
    // la clé (`key={card.id}`) — le choix de la carte, au calcul testé ici.
    const html = await reveler([carte("common", "un"), carte("legendary", "deux")], 1);
    expect(html).toContain("reveal-rare-aura");
    expect(html).toContain("reveal-cinematic-field");
    expect(html).not.toContain("fx-burst");
    expect(html).toContain("reveal-rare-aura-legendary");
    expect(html).toContain("fx-flash");
  });
});

describe("nuit de direct : nouvelle ou doublon", () => {
  let banc: Banc;
  beforeEach(() => { vi.useFakeTimers({ now: T0 }); banc = creerBanc(); banc.preparer(); });
  afterEach(() => { banc.nettoyer(); vi.useRealTimers(); });

  it("une carte nouvelle a son flash de rareté, sans second nom sous la carte", async () => {
    const { RevealOverlay } = await import("@/components/reveal-overlay");
    const nouvelle = carte("rare");
    await banc.monter(<RevealOverlay cards={[nouvelle] as never} index={0} onNext={vi.fn()} onClose={vi.fn()} />);
    const flash = document.querySelector<HTMLElement>(".reveal-new-flash")!;
    expect(flash.style.getPropertyValue("--flash-color")).toBe(RARITY_META.rare.color);
    expect(document.querySelector(".reveal-big-name")).toBeNull();
    expect(document.querySelector(".reveal-stage.is-duplicate")).toBeNull();
  });

  it.each(["common", "rare", "legendary"] as const)("un doublon %s reste affiché sans effets et n'avance jamais sans l'appui du joueur", async (rarity) => {
    const sounds = await import("@/lib/sfx");
    const bang = vi.spyOn(sounds, "playBang").mockImplementation(() => {});
    const reveal = vi.spyOn(sounds, "playReveal").mockImplementation(() => {});
    const { RevealOverlay } = await import("@/components/reveal-overlay");
    const doublon = { ...carte(rarity, "doublon"), isNew: false };
    const suivant = vi.fn();
    try {
      await banc.monter(<RevealOverlay cards={[carte("rare", "a"), doublon, carte("common", "c")] as never}
        index={1} onNext={suivant} onClose={vi.fn()} />);
      expect(document.querySelector(".reveal-stage.is-duplicate")).not.toBeNull();
      expect(document.querySelector(".reveal-stage.is-piling")).toBeNull();
      expect(document.querySelector(".reveal-new-flash")).toBeNull();
      expect(document.querySelector(".reveal-rare-aura")).toBeNull();
      expect(document.querySelector(".reveal-cinematic-field")).toBeNull();
      expect(document.querySelector(".fx-flash")).toBeNull();
      expect(document.querySelector(".new-badge")).toBeNull();
      expect(document.querySelector(".reveal-rarity-kicker")).toBeNull();
      expect(document.querySelector(".reveal-dupe-pile")?.getAttribute("aria-label")).toBe("Doublons de ce booster : 1");
      // La rareté et le statut restent lus par les lecteurs d'écran.
      expect(document.querySelector(".reveal-meta-sr")?.textContent).toContain(`${RARITY_META[rarity].label}`);
      expect(document.querySelector(".reveal-meta-sr")?.textContent).toContain("Doublon");
      expect(document.querySelector(".reveal-swipe-prompt")).toBeNull();
      // Le son part tout de suite, avant que la carte suivante n'arrive.
      await act(async () => { await vi.advanceTimersByTimeAsync(0); });
      expect(bang.mock.calls.length + reveal.mock.calls.length).toBe(1);
      expect(suivant).not.toHaveBeenCalled();
      await act(async () => { await vi.advanceTimersByTimeAsync(5_000); });
      expect(suivant, "un doublon ne doit jamais avancer sans appui").not.toHaveBeenCalled();
      banc.appuyer("Carte suivante");
      expect(suivant).toHaveBeenCalledOnce();
    } finally {
      bang.mockRestore();
      reveal.mockRestore();
    }
  });

  it("un doublon en dernière carte rejoint la pile et le paquet se range d'un appui", async () => {
    const { RevealOverlay } = await import("@/components/reveal-overlay");
    const suivant = vi.fn(), fermer = vi.fn();
    await banc.monter(<RevealOverlay cards={[carte("rare", "a"), { ...carte("epic"), isNew: false }] as never}
      index={1} onNext={suivant} onClose={fermer} />);
    expect(document.querySelector(".reveal-stage.is-duplicate")).not.toBeNull();
    expect(document.querySelector(".reveal-stage.is-piling")).toBeNull();
    await act(async () => { await vi.advanceTimersByTimeAsync(1_000); });
    expect(suivant).not.toHaveBeenCalled();
    banc.appuyer("Ranger dans le classeur");
    expect(fermer).toHaveBeenCalledOnce();
  });
});

describe("fin du booster : regarder ou ranger", () => {
  let banc: Banc;
  beforeEach(() => { vi.useFakeTimers({ now: T0 }); banc = creerBanc(); banc.preparer(); });
  afterEach(() => { liveMock.current = null; banc.nettoyer(); vi.useRealTimers(); });

  const deux = () => [carte("common", "un"), carte("rare", "deux")];

  it("la dernière chaîne est en direct : son visage et un bouton pour la regarder", async () => {
    const last = CREATORS.find(creator => creator.rarity === "rare")!;
    liveMock.current = {
      ...EMPTY_LIVE, configured: true, stale: false, refreshedAt: T0 - 60_000, count: 1,
      byLogin: indexLive([{ login: last.login, displayName: last.displayName, gameName: "Just Chatting", title: "", viewers: 4120, startedAt: new Date(T0 - 3_600_000).toISOString() }]),
    } satisfies LiveSnapshot;
    const fermer = vi.fn();
    const { RevealOverlay } = await import("@/components/reveal-overlay");
    await banc.monter(<RevealOverlay cards={deux() as never} index={1} onNext={vi.fn()} onClose={fermer} />);
    await act(async () => { await vi.advanceTimersByTimeAsync(1_200); });
    expect(document.querySelector(".reveal-next-pack"), "pas d'heure de sachet quand on va regarder").toBeNull();
    banc.appuyer("Ranger dans le classeur");
    expect(fermer).not.toHaveBeenCalled();
    const fin = document.querySelector(".pack-end-live")!;
    expect(fin.querySelector(".pack-end-face img")).not.toBeNull();
    expect(fin.textContent).toContain(last.displayName);
    const watch = fin.querySelector<HTMLAnchorElement>("a.pack-end-watch")!;
    expect(watch.textContent).toContain(`Regarder ${last.displayName} sur Twitch`);
    expect(watch.href).toBe(`https://www.twitch.tv/${encodeURIComponent(last.login)}`);
    expect(watch.target).toBe("_blank");
    // « Ranger » reste discret et ne part pas sur un double appui.
    const ranger = document.querySelector<HTMLButtonElement>(".reveal-next")!;
    expect(ranger.textContent).toContain("Ranger");
    expect(ranger.className).toContain("is-secondary");
    expect(ranger.disabled).toBe(true);
    await act(async () => { await vi.advanceTimersByTimeAsync(1_500); });
    banc.appuyer("Ranger");
    expect(fermer).toHaveBeenCalledOnce();
  });

  it("personne en direct : une ligne dit l'heure du prochain sachet", async () => {
    const state = createInitialState(T0);
    state.packs = 0;
    state.lastPackRegen = T0;
    gameStore.replaceState(state);
    const { RevealOverlay } = await import("@/components/reveal-overlay");
    await banc.monter(<RevealOverlay cards={deux() as never} index={1} onNext={vi.fn()} onClose={vi.fn()} />);
    expect(document.querySelector(".reveal-next-pack")).toBeNull();
    await act(async () => { await vi.advanceTimersByTimeAsync(1_200); });
    const heure = new Date(T0 + PACKS.live.regenMs).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }).replace(":", " h ");
    expect(document.querySelector(".reveal-next-pack")?.textContent).toBe(`Prochain sachet à ${heure}`);
    expect(document.querySelectorAll(".reveal-next-pack")).toHaveLength(1);
  });

  it("un sachet en réserve : la ligne le dit", async () => {
    const state = createInitialState(T0);
    state.packs = 1;
    gameStore.replaceState(state);
    const { RevealOverlay } = await import("@/components/reveal-overlay");
    await banc.monter(<RevealOverlay cards={deux() as never} index={1} onNext={vi.fn()} onClose={vi.fn()} />);
    await act(async () => { await vi.advanceTimersByTimeAsync(1_200); });
    expect(document.querySelector(".reveal-next-pack")?.textContent).toBe("Un sachet t’attend");
  });
});
