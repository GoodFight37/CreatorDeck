/**
 * Les effets de **moment rare**, montés pour de vrai : l'éclat d'une Épique,
 * l'explosion dorée (et l'écran blanc) d'une Légendaire, et rien du tout sur
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
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { creerBanc, type Banc } from "@/ecrans-banc";

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
    creatorSlug: "kamet0",
    rarity,
    variant: "standard" as const,
    isNew: false,
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
    expect(html).not.toContain("fx-flash");
  });

  it("donne un éclat à l'Épique, sans écran blanc", async () => {
    const html = await reveler([carte("epic")]);
    expect(html).toContain("fx-burst fx-eclat");
    // La planche est décrite **en CSS** (nombre d'images, durée) : ce qui est
    // écrit dans le document, c'est la taille et le retard.
    expect(html).toContain("--fx-size: 280px");
    // Pas de flash : une Épique n'a pas droit au plein écran.
    expect(html).not.toContain("fx-flash");
  });

  it("donne l'explosion dorée **et** l'écran blanc à la Légendaire", async () => {
    const html = await reveler([carte("legendary")]);
    expect(html).toContain("fx-burst fx-explosion");
    expect(html).toContain("fx-flash");
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
    expect(epique).toContain("--fx-delay: 520ms");

    banc.vider();
    banc.preparer();
    const legendaire = await reveler([carte("legendary")]);
    expect(legendaire).toContain("--fx-delay: 520ms");
    // Et la taille suit l'effet : l'explosion est plus grande que l'éclat — et
    // les deux débordent maintenant largement de la carte, sinon elle les
    // cache.
    expect(legendaire).toContain("--fx-size: 420px");
    // La durée vient de `FX_SHEETS`, écrite en ligne : 40 ms par image, de
    // quoi laisser le temps de voir.
    expect(legendaire).toContain("--fx-duration: 620ms");
  });

  it("joue l'explosion d'emblée sur un Perfect, sans silence", async () => {
    // Le Perfect est le paquet entier : il n'a pas de silence, il est le moment.
    const cinq = [carte("epic", "a"), carte("epic", "b"), carte("epic", "c")];
    cinq[0]!.rareDrop = true;
    const html = await reveler(cinq as never);
    expect(html).toContain("fx-burst fx-explosion");
    expect(html).toContain("--fx-delay: 0ms");
    // Le blanc du Perfect est déjà là depuis le verrouillage… et l'effet part
    // au premier rendu, pas après un temps d'attente.
    expect(html).toContain("fx-flash");
  });

  it("se choisit sur la carte du moment, pas sur la première du paquet", async () => {
    // Un paquet où la Légendaire est en deuxième position : à l'index 1, c'est
    // bien l'explosion qu'on doit voir. Le rejeu de l'animation, lui, tient à
    // la clé (`key={card.id}`) — le choix de la carte, au calcul testé ici.
    const html = await reveler([carte("common", "un"), carte("legendary", "deux")], 1);
    expect(html).toContain("fx-burst fx-explosion");
    expect(html).toContain("fx-flash");
  });
});
