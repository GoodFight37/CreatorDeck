import { describe, expect, it } from "vitest";
import { createInitialState, type PlayerState } from "@/lib/game-engine";
import {
  SYNC_GRACE_MS,
  decideSync,
  describeSync,
  stateFingerprint,
  syncStats,
} from "@/lib/cloud/sync";

const T0 = Date.parse("2026-03-01T10:00:00Z");

function stateWith(overrides: Partial<PlayerState> = {}): PlayerState {
  return { ...createInitialState(T0), ...overrides };
}

function card(id: string, slug: string, rarity: "common" | "legendary" = "common") {
  return { id, creatorSlug: slug, rarity, variant: "standard" as const, obtainedAt: T0, rareDrop: false };
}

describe("décision de synchronisation", () => {
  it("envoie la partie locale quand le cloud est vide", () => {
    const decision = decideSync({ state: stateWith(), updatedAt: T0 }, null);
    expect(decision.action).toBe("push");
  });

  it("ne fait rien quand les deux côtés sont identiques", () => {
    const state = stateWith({ cards: [card("a", "kaicenat")] });
    // Même contenu, horodatages différents : c'est bien le contenu qui tranche.
    const decision = decideSync(
      { state, updatedAt: T0 },
      { state: stateWith({ cards: [card("a", "kaicenat")], updatedAt: T0 + 5 * 60_000 }), deviceUpdatedAt: T0 + 5 * 60_000 },
    );
    expect(decision.action).toBe("noop");
  });

  it("pousse quand la partie locale est nettement plus récente", () => {
    const local = stateWith({ updatedAt: T0 + 10 * SYNC_GRACE_MS });
    const remote = stateWith({ cards: [card("a", "ibai")] });
    const decision = decideSync({ state: local, updatedAt: local.updatedAt }, { state: remote, deviceUpdatedAt: T0 });
    expect(decision.action).toBe("push");
    expect(decision.reason).toMatch(/plus récente/);
  });

  it("propose de charger le cloud quand il est nettement plus récent", () => {
    const local = stateWith({ updatedAt: T0 });
    const remote = stateWith({ cards: [card("b", "ibai")], updatedAt: T0 + 10 * SYNC_GRACE_MS });
    const decision = decideSync(
      { state: local, updatedAt: local.updatedAt },
      { state: remote, deviceUpdatedAt: remote.updatedAt },
    );
    expect(decision.action).toBe("pull");
    expect(decision.reason).toMatch(/autre appareil/);
  });

  it("demande l'avis du joueur quand les deux ont bougé en même temps", () => {
    const local = stateWith({ updatedAt: T0 + 5_000, cards: [card("a", "kaicenat")] });
    const remote = stateWith({ updatedAt: T0 - 5_000, cards: [card("b", "ibai")] });
    const decision = decideSync(
      { state: local, updatedAt: local.updatedAt },
      { state: remote, deviceUpdatedAt: remote.updatedAt },
    );
    expect(decision.action).toBe("conflict");
    expect(decision.reason).toMatch(/choisir/);
  });
});

describe("empreinte d'une partie", () => {
  it("ignore l'ordre des cartes", () => {
    const first = stateWith({ cards: [card("a", "kaicenat"), card("b", "ibai")] });
    const second = stateWith({ cards: [card("b", "ibai"), card("a", "kaicenat")] });
    expect(stateFingerprint(first)).toBe(stateFingerprint(second));
  });

  it("change dès qu'une carte, une variante ou un palier change", () => {
    const base = stateWith({ cards: [card("a", "kaicenat")] });
    expect(stateFingerprint(stateWith({ cards: [card("a", "kaicenat"), card("b", "ibai")] }))).not.toBe(
      stateFingerprint(base),
    );
    expect(
      stateFingerprint(stateWith({ cards: [{ ...card("a", "kaicenat"), variant: "gold" as const }] })),
    ).not.toBe(stateFingerprint(base));
    expect(stateFingerprint(stateWith({ claimedTiers: { S01: 2 } }))).not.toBe(stateFingerprint(base));
    expect(stateFingerprint(stateWith({ points: base.points + 1 }))).not.toBe(stateFingerprint(base));
  });

  // L'économie « secondaire » compte aussi : sans elle, deux appareils dont
  // seuls les jetons, la série ou le plancher de malchance avaient divergé
  // étaient déclarés identiques, et le `noop` laissait la divergence en place.
  it("change dès que l'économie secondaire change", () => {
    const base = stateWith({ cards: [card("a", "kaicenat")] });
    const fingerprint = stateFingerprint(base);
    const variants: Partial<PlayerState>[] = [
      { tokens: base.tokens + 5 },
      { hourglasses: base.hourglasses + 1 },
      { pityCounter: base.pityCounter + 1 },
      { missionDay: "2026-03-02", missions: { pack: 1 } },
      { streakDay: "2026-03-02", streak: base.streak + 1 },
      { streakJackpot: true },
      { sceneDay: "2026-03-02" },
    ];
    for (const variant of variants) {
      expect(stateFingerprint(stateWith({ ...variant, cards: base.cards })), JSON.stringify(variant)).not.toBe(
        fingerprint,
      );
    }
  });
});

describe("statistiques locales", () => {
  it("compte les créateurs uniques et les raretés comme le serveur", () => {
    const state = stateWith({
      cards: [
        card("a", "kaicenat"),
        card("b", "kaicenat"),
        card("c", "ibai", "legendary"),
        card("d", "ibai", "legendary"),
        card("e", "ninja"),
      ],
      level: 4,
      points: 320,
    });
    expect(syncStats(state)).toEqual({
      uniqueCreators: 3,
      totalCards: 5,
      legendaryCards: 2,
      epicCards: 0,
      level: 4,
      points: 320,
    });
  });
});

describe("texte de l'écran de compte", () => {
  it("reste lisible quel que soit l'écart", () => {
    const decision = decideSync({ state: stateWith(), updatedAt: T0 }, null);
    expect(describeSync(decision, null)).toBe("Jamais synchronisé.");
    expect(describeSync(decision, T0, T0 + 30_000)).toBe("Synchronisé à l'instant.");
    expect(describeSync(decision, T0, T0 + 60_000)).toBe("Synchronisé il y a 1 min.");
    expect(describeSync(decision, T0, T0 + 12 * 60_000)).toBe("Synchronisé il y a 12 min.");
    expect(describeSync(decision, T0, T0 + 5 * 3_600_000)).toBe("Synchronisé il y a 5 h.");
    expect(describeSync(decision, T0, T0 + 3 * 86_400_000)).toMatch(/3 j/);
  });
});
