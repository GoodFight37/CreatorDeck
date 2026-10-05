import { describe, expect, it } from "vitest";
import { CREATORS } from "@/lib/catalog";
import {
  DEFAULT_THEME_ID,
  GRAND_SLAM_THEME_ID,
  THEMES,
  seasonHue,
  themeById,
} from "@/lib/cosmetics";
import {
  activeTheme,
  claimSeason,
  createInitialState,
  equipTheme,
  seasonViews,
  themeViews,
  type OwnedCard,
  type PlayerState,
} from "@/lib/game-engine";
import { SEASONS } from "@/lib/seasons";

const T0 = Date.parse("2026-01-01T12:00:00Z");

function ownedCard(id: string, creatorSlug: string, rarity: OwnedCard["rarity"]): OwnedCard {
  return { id, creatorSlug, rarity, variant: "standard", obtainedAt: T0, rareDrop: false };
}

function cardsOfSeason(seasonIndex: number): OwnedCard[] {
  return SEASONS[seasonIndex].slugs.map((slug, index) => {
    const creator = CREATORS.find((entry) => entry.slug === slug) as (typeof CREATORS)[number];
    return ownedCard(`card-${seasonIndex}-${index}`, slug, creator.rarity);
  });
}

function makeState(overrides: Partial<PlayerState> = {}): PlayerState {
  return { ...createInitialState(T0), ...overrides };
}

describe("cosmétiques", () => {
  it("déclare un thème par famille, plus le départ et le grand chelem", () => {
    const ids = THEMES.map((theme) => theme.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(THEMES.length).toBe(SEASONS.length + 2);
    expect(THEMES[0]?.id).toBe(DEFAULT_THEME_ID);
    expect(THEMES.at(-1)?.id).toBe(GRAND_SLAM_THEME_ID);
    for (const theme of THEMES) {
      expect(theme.name.length).toBeGreaterThan(0);
      expect(theme.tokens.purple.startsWith("#") || theme.tokens.purple.startsWith("hsl")).toBe(true);
      expect(theme.tokens.glow.length).toBeGreaterThan(0);
    }
    expect(themeById("inconnu")).toBeUndefined();
    expect(themeById(undefined)).toBeUndefined();
  });

  it("teinte les familles de façon distincte et stable", () => {
    const hues = SEASONS.map((season) => seasonHue(season.id));
    expect(new Set(hues).size).toBe(hues.length);

    // Deux familles voisines doivent rester visuellement séparables.
    const sorted = [...hues].sort((a, b) => a - b);
    for (let index = 1; index < sorted.length; index += 1) {
      const gap = sorted[index] - sorted[index - 1];
      const wrapped = 360 - sorted[sorted.length - 1] + sorted[0];
      expect(Math.min(gap, wrapped)).toBeGreaterThanOrEqual(15);
    }

    // Un morceau découpé garde la teinte de sa famille.
    for (const season of SEASONS) {
      if (season.id.includes("-")) {
        const base = season.id.replace(/-\d+$/, "");
        expect(seasonHue(season.id)).toBe(seasonHue(base));
      }
    }
    // Un identifiant inconnu reste colorable (pas de plantage).
    expect(seasonHue("Z99")).toBeGreaterThanOrEqual(0);
    expect(seasonHue("Z99")).toBeLessThan(360);
  });

  it("part avec le thème d'origine et tout le reste verrouillé", () => {
    const state = makeState();
    const themes = themeViews(state);
    expect(themes.find((theme) => theme.id === DEFAULT_THEME_ID)?.unlocked).toBe(true);
    expect(themes.find((theme) => theme.id === DEFAULT_THEME_ID)?.equipped).toBe(true);
    expect(themes.filter((theme) => theme.unlocked).length).toBe(1);
    expect(activeTheme(state).id).toBe(DEFAULT_THEME_ID);

    // Chaque thème de famille annonce ce qu'il reste à faire.
    const locked = themes.find((theme) => !theme.unlocked && theme.id !== GRAND_SLAM_THEME_ID);
    expect(locked?.unlockHint).toMatch(/Complète la saison/);
  });

  it("débloque la teinte d'une famille avec son emblème", () => {
    const season = SEASONS[0];
    const state = makeState({ cards: cardsOfSeason(0) });
    const themeId = `theme-${season.id}`;

    // Saison complète mais paliers non réclamés : pas encore d'emblème.
    expect(themeViews(state).find((theme) => theme.id === themeId)?.unlocked).toBe(false);
    expect(() => equipTheme(state, themeId, T0)).toThrowError(/verrouillé/i);

    const claimed = claimSeason(state, season.id, T0);
    expect(seasonViews(claimed).find((view) => view.id === season.id)?.emblem).toBe(true);
    expect(themeViews(claimed).find((theme) => theme.id === themeId)?.unlocked).toBe(true);

    const equipped = equipTheme(claimed, themeId, T0);
    expect(equipped.themeId).toBe(themeId);
    expect(activeTheme(equipped).id).toBe(themeId);
    expect(themeViews(equipped).find((theme) => theme.id === themeId)?.equipped).toBe(true);

    expect(() => equipTheme(claimed, "inconnu", T0)).toThrowError(/inconnu/i);
  });

  it("retombe sur le thème d'origine si le thème équipé est verrouillé", () => {
    // Sauvegarde trafiquée : le thème est connu mais pas débloqué.
    const themeId = `theme-${SEASONS[0].id}`;
    const hacked = makeState({ themeId });
    expect(activeTheme(hacked).id).toBe(DEFAULT_THEME_ID);
    expect(themeViews(hacked).find((theme) => theme.id === themeId)?.equipped).toBe(false);

    // Thème disparu (famille absente d'une autre version du catalogue).
    expect(activeTheme(makeState({ themeId: "theme-supprime" })).id).toBe(DEFAULT_THEME_ID);
  });

  it("réserve le grand chelem à la complétion de toutes les familles", () => {
    const allCards = SEASONS.flatMap((_, index) => cardsOfSeason(index));
    let state: PlayerState = makeState({ cards: allCards });

    for (const season of SEASONS) {
      state = claimSeason(state, season.id, T0);
    }

    const themes = themeViews(state);
    expect(themes.filter((theme) => theme.unlocked).length).toBe(THEMES.length);
    expect(themes.find((theme) => theme.id === GRAND_SLAM_THEME_ID)?.unlocked).toBe(true);
  });
});
