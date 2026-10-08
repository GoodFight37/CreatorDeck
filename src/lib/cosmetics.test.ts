import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CREATORS } from "@/lib/catalog";
import {
  DEFAULT_THEME_ID,
  FAMILIES,
  GRAND_SLAM_THEME_ID,
  THEMES,
  THEME_VAR_NAMES,
  THEME_VARS,
  seasonHue,
  themeById,
  type ThemeTokens,
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
    // Un thème par famille — pas par saison : une famille découpée en morceaux
    // ne doit pas produire deux thèmes identiques.
    expect(THEMES.length).toBe(FAMILIES.length + 2);
    expect(FAMILIES.length).toBeLessThanOrEqual(SEASONS.length);
    expect(THEMES[0]?.id).toBe(DEFAULT_THEME_ID);
    expect(THEMES.at(-1)?.id).toBe(GRAND_SLAM_THEME_ID);
    for (const theme of THEMES) {
      expect(theme.name.length).toBeGreaterThan(0);
      expect(theme.tokens.accent.startsWith("#") || theme.tokens.accent.startsWith("hsl")).toBe(true);
      expect(theme.tokens.glow.length).toBeGreaterThan(0);
    }
    expect(themeById("inconnu")).toBeUndefined();
    expect(themeById(undefined)).toBeUndefined();
  });

  it("teinte les familles de façon distincte et stable", () => {
    const hues = FAMILIES.map((family) => seasonHue(family.id));
    expect(new Set(hues).size).toBe(hues.length);

    // Deux familles voisines doivent rester visuellement séparables.
    const sorted = [...hues].sort((a, b) => a - b);
    for (let index = 1; index < sorted.length; index += 1) {
      const gap = sorted[index] - sorted[index - 1];
      const wrapped = 360 - sorted[sorted.length - 1] + sorted[0];
      expect(Math.min(gap, wrapped)).toBeGreaterThanOrEqual(15);
    }

    // Un morceau découpé garde la teinte de sa famille (c'est voulu : mêmes
    // gènes, un seul emblème).
    for (const season of SEASONS) {
      expect(seasonHue(season.id)).toBe(seasonHue(season.familyId));
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
    expect(locked?.unlockHint).toMatch(/Complète la famille/);
  });

  it("débloque la teinte d'une famille quand tous ses morceaux sont refermés", () => {
    const family = FAMILIES[0];
    const themeId = `theme-${family.id}`;
    const pieces = family.seasonIds.map((id) => SEASONS.find((season) => season.id === id)!);

    // Tous les morceaux remplis, mais paliers non réclamés : rien de débloqué.
    let state = makeState({
      cards: pieces.flatMap((piece) => cardsOfSeason(SEASONS.indexOf(piece))),
    });
    expect(themeViews(state).find((theme) => theme.id === themeId)?.unlocked).toBe(false);
    expect(() => equipTheme(state, themeId, T0)).toThrowError(/verrouillé/i);

    // On réclame les morceaux un par un : la famille ne s'ouvre qu'au dernier.
    for (const [index, piece] of pieces.entries()) {
      state = claimSeason(state, piece.id, T0);
      const view = seasonViews(state).find((entry) => entry.id === piece.id);
      const last = index === pieces.length - 1;
      expect(view?.claimed).toBe(true);
      expect(view?.familyComplete).toBe(last);
      expect(themeViews(state).find((theme) => theme.id === themeId)?.unlocked).toBe(last);
    }

    const equipped = equipTheme(state, themeId, T0);
    expect(equipped.themeId).toBe(themeId);
    expect(activeTheme(equipped).id).toBe(themeId);
    expect(themeViews(equipped).find((theme) => theme.id === themeId)?.equipped).toBe(true);

    expect(() => equipTheme(state, "inconnu", T0)).toThrowError(/inconnu/i);
  });

  it("retombe sur le thème d'origine si le thème équipé est verrouillé", () => {
    // Sauvegarde trafiquée : le thème est connu mais pas débloqué.
    const themeId = `theme-${FAMILIES[0].id}`;
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

/**
 * Palette : un thème doit repeindre toute l'application, pas seulement trois
 * boutons. Ces tests garantissent qu'aucun jeton ne manque, que le CSS les
 * déclare tous, et que les textes restent lisibles dans chaque thème — y compris
 * dans les teintes les plus claires (vert, rose) où un contraste trop faible se
 * voit tout de suite.
 */
describe("palette des thèmes", () => {
  const TOKENS = Object.keys(THEME_VAR_NAMES) as (keyof ThemeTokens)[];

  function parseColor(value: string): [number, number, number] {
    const hex = /^#([0-9a-f]{6})$/i.exec(value.trim());
    if (hex) {
      const int = Number.parseInt(hex[1] as string, 16);
      return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
    }
    const hsl = /^hsla?\(\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%/.exec(value);
    if (hsl) {
      const [hue, saturation, lightness] = [Number(hsl[1]), Number(hsl[2]), Number(hsl[3])];
      const a = (saturation / 100) * Math.min(lightness / 100, 1 - lightness / 100);
      const channel = (offset: number) => {
        const k = (offset + hue / 30) % 12;
        return Math.round(255 * (lightness / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
      };
      return [channel(0), channel(8), channel(4)];
    }
    throw new Error(`couleur illisible : ${value}`);
  }

  function contrast(a: string, b: string): number {
    const luminance = (color: [number, number, number]) =>
      color
        .map((channel) => channel / 255)
        .map((channel) => (channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4))
        .reduce((acc, channel, index) => acc + channel * [0.2126, 0.7152, 0.0722][index], 0);
    const [first, second] = [luminance(parseColor(a)), luminance(parseColor(b))];
    return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
  }

  it("décrit chaque thème avec la palette complète", () => {
    expect(TOKENS.length).toBeGreaterThanOrEqual(20);
    expect(new Set(THEME_VARS).size).toBe(TOKENS.length);
    for (const theme of THEMES) {
      for (const token of TOKENS) {
        expect(theme.tokens[token], `${theme.id} · ${token}`).toBeTruthy();
      }
      // Les trois canaux RGB servent aux fonds translucides : ils doivent être
      // exploitables tels quels dans `rgb(var(--accent-rgb) / .12)`.
      for (const token of ["accentRgb", "accentLightRgb", "accentDarkRgb", "bgRgb"] as const) {
        expect(theme.tokens[token]).toMatch(/^\d{1,3} \d{1,3} \d{1,3}$/);
      }
    }
  });

  it("déclare tous les jetons dans globals.css", () => {
    // Sans déclaration `:root`, une variable non écrite par le thème équipé
    // laisserait la propriété vide (fond transparent, texte invisible).
    const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
    const root = css.slice(css.indexOf(":root {"), css.indexOf("\n}", css.indexOf(":root {")));
    for (const name of THEME_VARS) {
      expect(root, `${name} absent de :root`).toContain(`${name}:`);
    }
  });

  it("garde les textes lisibles dans tous les thèmes", () => {
    for (const theme of THEMES) {
      const { bg, panel, text, muted, muted2, accent } = theme.tokens;
      expect(contrast(text, bg), `${theme.id} · texte/fond`).toBeGreaterThanOrEqual(12);
      expect(contrast(text, panel), `${theme.id} · texte/panneau`).toBeGreaterThanOrEqual(12);
      expect(contrast(muted, bg), `${theme.id} · texte secondaire`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(muted2, bg), `${theme.id} · texte discret`).toBeGreaterThanOrEqual(3);
      expect(contrast(accent, bg), `${theme.id} · accent`).toBeGreaterThanOrEqual(3);
    }
  });

  it("donne à chaque thème son accent, sur un fond commun", () => {
    // Les thèmes ne repeignent plus l'application : ils teintent le classeur.
    // L'accent doit donc être distinct d'un thème à l'autre (sinon en équiper un
    // ne changerait rien à l'écran) et les surfaces rester **neutres**, pour que
    // le chrome — noir studio, papier, rouge live — ne bouge jamais.
    expect(new Set(THEMES.map((theme) => theme.tokens.accent)).size).toBe(THEMES.length);
    for (const theme of THEMES) {
      expect(theme.tokens.bg).toBe(THEMES[0]?.tokens.bg);
      expect(theme.tokens.panel).toBe(THEMES[0]?.tokens.panel);
      expect(theme.tokens.text).toBe(THEMES[0]?.tokens.text);
    }
  });

  it("fait correspondre les canaux RGB des teintes dérivées à leur accent", () => {
    // Un triplet désaccordé décalerait tous les fonds translucides.
    for (const theme of THEMES) {
      const accent = /^hsl\((\d+) 88% 62%\)$/.exec(theme.tokens.accent);
      if (!accent) continue; // thème surchargé (origine, grand chelem)
      const expected = parseColor(theme.tokens.accent);
      const triplet = theme.tokens.accentRgb.split(" ").map(Number);
      for (const [index, channel] of triplet.entries()) {
        expect(Math.abs(channel - expected[index]), `${theme.id} · canal ${index}`).toBeLessThan(2);
      }
    }
  });
});
