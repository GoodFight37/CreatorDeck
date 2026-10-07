/**
 * Le Last Pack côté écran : la fenêtre de dix minutes, le compte à rebours et
 * ce qu'il reste à prendre.
 *
 * Le serveur reste seul juge (un paquet expiré ne revient pas, un vol se refuse
 * en `0012_last_pack.sql`) ; ce qui est testé ici, c'est que l'écran ne raconte
 * pas autre chose que lui : même durée de fenêtre, même « rien à prendre », et
 * un compte à rebours qui ne dépend pas de l'horloge du téléphone.
 */
import { describe, expect, it } from "vitest";
import {
  LAST_PACK_WINDOW_MS,
  canPickCard,
  cardIsProtected,
  countdownLabel,
  emptyShelfHint,
  readySteals,
  remainingMs,
} from "@/lib/last-pack";
import type { LastPack, LastPackCard, LastPackShelf } from "@/lib/cloud/api";

const SERVER_NOW = "2026-10-06T20:00:00.000Z";

function pack(overrides: Partial<LastPack> = {}): LastPack {
  return {
    id: 1,
    ownerId: "lea",
    ownerName: "Léa",
    mine: false,
    drawnAt: SERVER_NOW,
    expiresAt: new Date(Date.parse(SERVER_NOW) + LAST_PACK_WINDOW_MS).toISOString(),
    stealable: true,
    cards: [],
    ...overrides,
  };
}

function card(overrides: Partial<LastPackCard> = {}): LastPackCard {
  return {
    index: 1,
    creatorSlug: "ibai",
    rarity: "rare",
    variant: "standard",
    taken: false,
    stealable: true,
    ...overrides,
  };
}

function shelf(overrides: Partial<LastPackShelf> = {}): LastPackShelf {
  return {
    now: SERVER_NOW,
    windowMinutes: 10,
    stealPerDay: 1,
    stoleToday: false,
    packs: [pack()],
    ...overrides,
  };
}

describe("last-pack.ts", () => {
  it("la fenêtre affichée est celle de la migration (dix minutes)", () => {
    expect(LAST_PACK_WINDOW_MS).toBe(600_000);
    const loaded = Date.parse(SERVER_NOW);
    const pack0 = pack();
    expect(remainingMs(pack0, SERVER_NOW, loaded, loaded)).toBe(600_000);
    expect(remainingMs(pack0, SERVER_NOW, loaded, loaded + 90_000)).toBe(510_000);
  });

  it("ne dépend pas de l'horloge de l'appareil", () => {
    // Appareil en avance de 20 minutes : la fenêtre reste celle du serveur.
    const loaded = Date.parse(SERVER_NOW) + 20 * 60_000;
    expect(remainingMs(pack(), SERVER_NOW, loaded, loaded)).toBe(600_000);
    // Et une fois la fenêtre écoulée, elle est terminée — jamais négative.
    expect(remainingMs(pack(), SERVER_NOW, loaded, loaded + 900_000)).toBe(0);
  });

  it("écrit un compte à rebours lisible, jamais zéro minute", () => {
    expect(countdownLabel(600_000)).toBe("10 min");
    expect(countdownLabel(42_000)).toBe("42 s");
    expect(countdownLabel(59_500)).toBe("1 min");
    expect(countdownLabel(0)).toBe("terminé");
  });

  it("compte les cartes encore prenables, et pas les paquets de la veille", () => {
    const loaded = Date.parse(SERVER_NOW);
    const troisAmis = shelf({
      packs: [pack({ id: 1 }), pack({ id: 2, ownerId: "lou" }), pack({ id: 3, ownerId: "sam" })],
    });
    expect(readySteals(troisAmis, loaded, loaded)).toBe(3);
    // Au bout de dix minutes, le serveur les retirera — l'écran aussi.
    expect(readySteals(troisAmis, loaded, loaded + 601_000)).toBe(0);
    // Mon paquet ne se prend pas, et un paquet déjà entamé non plus.
    expect(readySteals(shelf({ packs: [pack({ mine: true })] }), loaded, loaded)).toBe(0);
    expect(readySteals(shelf({ packs: [pack({ stealable: false })] }), loaded, loaded)).toBe(0);
    // Vol du jour déjà fait : plus rien, même avec des paquets frais.
    expect(readySteals(shelf({ stoleToday: true }), loaded, loaded)).toBe(0);
    expect(readySteals(null, loaded, loaded)).toBe(0);
  });

  it("grise une Légendaire et une Live, et rien d'autre", () => {
    // La règle du serveur (`0034_last_pack_protege.sql`) : ce qui compte est la
    // rareté **et** la variante, et le drapeau du serveur passe avant tout.
    expect(cardIsProtected(card({ rarity: "legendary" }))).toBe(true);
    expect(cardIsProtected(card({ variant: "live" }))).toBe(true);
    expect(cardIsProtected(card({ rarity: "legendary", variant: "live" }))).toBe(true);
    expect(cardIsProtected(card({ stealable: false }))).toBe(true);
    expect(cardIsProtected(card())).toBe(false);
    expect(cardIsProtected(card({ rarity: "epic", variant: "gold" }))).toBe(false);
  });

  it("n'autorise le choix que sur une carte vraiment prenable", () => {
    const loaded = Date.parse(SERVER_NOW);
    const frais = 600_000;
    const prenable = pack({ cards: [card()] });
    expect(canPickCard(prenable, card(), frais)).toBe(true);
    // Déjà prise par quelqu'un : la place est perdue.
    expect(canPickCard(pack({ cards: [card({ taken: true })] }), card({ taken: true }), frais)).toBe(
      false,
    );
    // Protégée : Légendaire, Live, ou refus annoncé par le serveur.
    expect(canPickCard(pack({ cards: [card()] }), card({ rarity: "legendary" }), frais)).toBe(false);
    expect(canPickCard(pack({ cards: [card()] }), card({ variant: "live" }), frais)).toBe(false);
    expect(canPickCard(pack({ cards: [card()] }), card({ stealable: false }), frais)).toBe(false);
    // Le paquet lui-même : plus de vol du jour, fenêtre fermée, mon paquet.
    expect(canPickCard(pack({ stealable: false, cards: [card()] }), card(), frais)).toBe(false);
    expect(canPickCard(pack({ mine: true, cards: [card()] }), card(), frais)).toBe(false);
    expect(canPickCard(prenable, card(), 0)).toBe(false);
    expect(canPickCard(prenable, card(), -1)).toBe(false);
    // Une carte déjà prise reste affichée telle quelle, même protégée.
    expect(canPickCard(pack({ cards: [card()] }), card({ taken: true }), frais)).toBe(false);
    expect(readySteals(shelf({ packs: [prenable] }), loaded, loaded)).toBe(1);
  });

  it("dit pourquoi il n'y a rien à prendre", () => {
    const loaded = Date.parse(SERVER_NOW);
    expect(emptyShelfHint(null, loaded, loaded)).toContain("Aucun paquet exposé");
    expect(emptyShelfHint(shelf({ stoleToday: true }), loaded, loaded)).toContain("un vol par jour");
    expect(emptyShelfHint(shelf({ packs: [pack({ mine: true })] }), loaded, loaded)).toContain(
      "Ton paquet est exposé",
    );
    expect(emptyShelfHint(shelf(), loaded, loaded)).toContain("Aucun paquet exposé");
  });
});
