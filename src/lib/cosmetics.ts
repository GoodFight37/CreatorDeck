/**
 * Cosmétiques de collection : des thèmes qui teintent **le classeur**.
 *
 * Unité de référence : la **famille**, pas la saison. Une grande famille est
 * découpée en plusieurs saisons pour rester un objectif jouable, mais elle reste
 * une identité : une teinte, un emblème, un thème — sinon un « Accueil & IRL »
 * coupé en deux produirait deux badges identiques et deux thèmes clonés.
 *
 * Rien à importer — un thème n'est qu'un jeu de variables CSS et une condition
 * de déblocage. **Tous** les morceaux d'une famille réclamés débloquent la
 * teinte de cette famille, et compléter toutes les familles débloque le thème
 * « Grand chelem ».
 *
 * Les thèmes sont dérivés du catalogue comme le reste : si une famille
 * apparaît, disparaît ou se découpe à la régénération, les thèmes suivent sans
 * qu'aucune liste ne soit à maintenir à la main.
 */
import { SEASONS } from "@/lib/seasons";

/**
 * Palette complète d'un thème.
 *
 * Un thème ne re-teinte pas seulement l'accent : il repeint la surface de
 * l'application (fond, panneaux, bordures, textes) et les dégradés. Tous ces
 * jetons sont dérivés de la même teinte — c'est ce qui fait qu'un thème change
 * vraiment l'allure générale au lieu de déplacer trois boutons.
 *
 * Les couleurs porteuses de sens (or des légendaires, vert de réussite, rouge
 * d'erreur, couleurs de rareté) ne sont **pas** thématisées : elles doivent
 * rester reconnaissables quel que soit le thème équipé.
 */
export type ThemeTokens = {
  /** Accent principal : boutons, jauges, navigation. */
  accent: string;
  /** Accent clair : survols, bordures actives. */
  accentLight: string;
  /** Accent adouci : libellés secondaires. */
  accentSoft: string;
  /** Accent très clair : pastilles et badges. */
  accentTint: string;
  /** Accent en triplet `r g b`, pour les fonds translucides (`rgb(var(--accent-rgb) / .12)`). */
  accentRgb: string;
  /** Accent clair en triplet `r g b`. */
  accentLightRgb: string;
  /** Accent sombre en triplet `r g b` (halos, ombres colorées). */
  accentDarkRgb: string;
  /** Fond en triplet `r g b` (voiles, dégradés de fondu). */
  bgRgb: string;
  /** Accent profond : dégradés soutenus. */
  accentDeep: string;
  /** Accent sombre : fonds de dégradé, ombres colorées. */
  accentDark: string;
  /** Accent le plus sombre : arrêts de dégradé profonds. */
  accentNight: string;
  /** Halo de la révélation de carte. */
  accentGlow: string;
  /** Or : récompenses, légendaires, saisons. */
  gold: string;
  /** Halo d'ambiance derrière l'application. */
  glow: string;
  /** Fond le plus profond (html/body). */
  bgDeep: string;
  /** Fond de l'application. */
  bg: string;
  /** Fond alterné (barres, pieds de panneau). */
  bgSoft: string;
  /** Panneau standard (cartes, feuilles). */
  panel: string;
  /** Panneau surélevé. */
  panel2: string;
  /** Panneau le plus clair (champs, pastilles). */
  panel3: string;
  /** Texte principal. */
  text: string;
  /** Texte secondaire. */
  muted: string;
  /** Texte discret. */
  muted2: string;
};

/** Nom CSS `--kebab-case` de chaque jeton, dans l'ordre du type. */
export const THEME_VAR_NAMES: Record<keyof ThemeTokens, string> = {
  accent: "--accent",
  accentLight: "--accent-light",
  accentSoft: "--accent-soft",
  accentTint: "--accent-tint",
  accentRgb: "--accent-rgb",
  accentLightRgb: "--accent-light-rgb",
  accentDarkRgb: "--accent-dark-rgb",
  bgRgb: "--bg-rgb",
  accentDeep: "--accent-deep",
  accentDark: "--accent-dark",
  accentNight: "--accent-night",
  accentGlow: "--accent-glow",
  gold: "--gold",
  glow: "--glow",
  bgDeep: "--bg-deep",
  bg: "--bg",
  bgSoft: "--bg-soft",
  panel: "--panel",
  panel2: "--panel-2",
  panel3: "--panel-3",
  text: "--text",
  muted: "--muted",
  muted2: "--muted-2",
};

/** Liste des variables CSS écrites par un thème équipé. */
export const THEME_VARS = Object.values(THEME_VAR_NAMES);

/** Condition d'obtention d'un thème. */
export type ThemeUnlock =
  | { kind: "starter" }
  | { kind: "family"; familyId: string }
  | { kind: "all-families" };

export type CollectionTheme = {
  id: string;
  name: string;
  description: string;
  unlock: ThemeUnlock;
  tokens: ThemeTokens;
};

export const DEFAULT_THEME_ID = "studio";
export const GRAND_SLAM_THEME_ID = "grand-chelem";

/**
 * Teintes disponibles pour les familles, espacées pour rester distinguables
 * côte à côte (l'œil sépare mal sept vues d'un même violet).
 */
const FAMILY_HUES = [268, 232, 205, 176, 318, 342, 14, 34, 96, 148];

/** Ordre des familles dans la configuration, indexé sans les suffixes de découpage. */
const FAMILY_INDEX = new Map<string, number>();
for (const season of SEASONS) {
  if (!FAMILY_INDEX.has(season.familyId)) FAMILY_INDEX.set(season.familyId, FAMILY_INDEX.size);
}

/**
 * Familles du catalogue : une famille = une ou plusieurs saisons (morceaux).
 * L'ordre suit celui de la configuration, donc il est stable d'une
 * régénération à l'autre tant que la config ne bouge pas.
 */
export type Family = { id: string; name: string; seasonIds: string[] };

export const FAMILIES: Family[] = (() => {
  const byId = new Map<string, Family>();
  for (const season of SEASONS) {
    const existing = byId.get(season.familyId);
    if (existing) {
      existing.seasonIds.push(season.id);
      continue;
    }
    byId.set(season.familyId, {
      id: season.familyId,
      // « Accueil & IRL · 1/2 » → « Accueil & IRL ».
      name: season.name.split(" · ")[0] ?? season.name,
      seasonIds: [season.id],
    });
  }
  return [...byId.values()];
})();

export const FAMILY_BY_ID = new Map(FAMILIES.map((family) => [family.id, family]));

/**
 * Teinte stable d'une famille, partagée par les emblèmes et les thèmes.
 *
 * L'index vient de l'**ordre des familles** dans la configuration, pas d'un
 * hachage de l'identifiant : deux familles ne peuvent donc jamais se
 * retrouver avec la même couleur (« S01 » et « S02 » ne diffèrent que d'un
 * caractère), et les morceaux d'une famille découpée partagent la teinte de
 * leur famille. Une famille inconnue (identifiant d'une autre version) retombe
 * sur un hachage, pour ne jamais planter ni renvoyer une couleur vide.
 */
export function seasonHue(seasonId: string): number {
  const base = seasonId.replace(/-\d+$/, "");
  const index = FAMILY_INDEX.get(base);
  if (index !== undefined) return FAMILY_HUES[index % FAMILY_HUES.length];

  let hash = 0x811c9dc5;
  for (let position = 0; position < base.length; position += 1) {
    hash ^= base.charCodeAt(position);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return FAMILY_HUES[hash % FAMILY_HUES.length];
}

/**
 * Palette dérivée d'une teinte : la surface prend la couleur de la famille,
 * l'accent est franc, l'or reste chaud (une « légendaire » doit briller pareil
 * dans tous les thèmes). Les surcharges servent au thème d'origine, calé sur le
 * design historique du classeur.
 */
/**
 * HSL → triplet `r g b`. Sert aux fonds translucides : `rgb(var(--accent-rgb) / .12)`
 * suit le thème, là où un `rgba(143, 100, 255, .12)` figé resterait violet.
 */
function hslToRgb(hue: number, saturation: number, lightness: number): string {
  const a = (saturation / 100) * Math.min(lightness / 100, 1 - lightness / 100);
  const channel = (offset: number) => {
    const k = (offset + hue / 30) % 12;
    const value = lightness / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(255 * value);
  };
  return [channel(0), channel(8), channel(4)].join(" ");
}

/**
 * Jetons d'un thème, dérivés d'une teinte.
 *
 * Le fond, les panneaux et les textes restent **neutres** : un thème ne repeint
 * plus l'application, il teinte l'accent du classeur et le papier de ses
 * pochettes. C'est ce qui permet au chrome (noir studio, blanc chaud, rouge
 * live) de ne plus jamais bouger, quel que soit le thème équipé.
 */
function tokensFor(hue: number, overrides: Partial<ThemeTokens> = {}): ThemeTokens {
  const base: ThemeTokens = {
    accent: `hsl(${hue} 88% 62%)`,
    accentLight: `hsl(${hue} 92% 76%)`,
    accentSoft: `hsl(${hue} 88% 70%)`,
    accentTint: `hsl(${hue} 90% 86%)`,
    accentRgb: hslToRgb(hue, 88, 62),
    accentLightRgb: hslToRgb(hue, 92, 76),
    accentDarkRgb: hslToRgb(hue, 60, 26),
    bgRgb: "10 10 12",
    accentDeep: `hsl(${hue} 72% 44%)`,
    accentDark: `hsl(${hue} 60% 26%)`,
    accentNight: `hsl(${hue} 34% 15%)`,
    accentGlow: `hsla(${hue} 88% 60% / .32)`,
    gold: "hsl(38 100% 66%)",
    glow: `hsla(${hue} 88% 56% / .14)`,
    bgDeep: "hsl(240 6% 3%)",
    bg: "hsl(240 6% 5%)",
    bgSoft: "hsl(240 5% 8%)",
    panel: "hsl(240 5% 10%)",
    panel2: "hsl(240 5% 13%)",
    panel3: "hsl(240 5% 17%)",
    text: "#f2eee6",
    muted: "#9a958c",
    muted2: "#6d6963",
  };
  return { ...base, ...overrides };
}

const STARTER: CollectionTheme = {
  id: DEFAULT_THEME_ID,
  name: "Studio",
  description: "Le thème d'origine : noir de régie et rouge du direct.",
  unlock: { kind: "starter" },
  tokens: tokensFor(6, {
    accent: "#e8382c",
    accentLight: "#ff7a6b",
    accentSoft: "#ff9d90",
    accentTint: "#ffd0c9",
    accentRgb: "232 56 44",
    accentLightRgb: "255 122 107",
    accentDarkRgb: "109 23 16",
    accentDeep: "#a81f16",
    accentDark: "#6d1710",
    accentNight: "#3d120e",
    accentGlow: "rgba(232, 56, 44, .3)",
  }),
};

/** Un thème par famille, dans l'ordre du catalogue. */
const FAMILY_THEMES: CollectionTheme[] = FAMILIES.map((family) => ({
  id: `theme-${family.id}`,
  name: family.name,
  description:
    family.seasonIds.length > 1
      ? `Débloqué en complétant les ${family.seasonIds.length} saisons de la famille.`
      : `Débloqué par l'emblème de la famille ${family.id}.`,
  unlock: { kind: "family", familyId: family.id },
  tokens: tokensFor(seasonHue(family.id)),
}));

/** Récompense d'achèvement total : toutes les familles complétées. */
const GRAND_SLAM: CollectionTheme = {
  id: GRAND_SLAM_THEME_ID,
  name: "Grand chelem",
  description: "Toutes les familles complétées : le classeur passe à l'arc-en-ciel.",
  unlock: { kind: "all-families" },
  tokens: tokensFor(285, {
    accent: "hsl(285 88% 66%)",
    accentLight: "hsl(315 92% 80%)",
    accentSoft: "hsl(300 88% 74%)",
    accentTint: "hsl(315 92% 88%)",
    accentRgb: "200 84 240",
    accentLightRgb: "240 150 220",
    accentDarkRgb: "110 34 140",
    accentGlow: "hsla(300 85% 62% / .36)",
    gold: "hsl(45 95% 66%)",
    glow: "hsla(300 85% 62% / .18)",
  }),
};

export const THEMES: CollectionTheme[] = [STARTER, ...FAMILY_THEMES, GRAND_SLAM];

export const THEME_BY_ID = new Map(THEMES.map((theme) => [theme.id, theme]));

export const DEFAULT_THEME = STARTER;

export function themeById(id: string | undefined): CollectionTheme | undefined {
  return id ? THEME_BY_ID.get(id) : undefined;
}

/** Description lisible de ce qui reste à faire pour obtenir le thème. */
export function unlockHint(theme: CollectionTheme): string {
  if (theme.unlock.kind === "starter") return "Disponible d'emblée";
  if (theme.unlock.kind === "all-families") return "Complète toutes les familles";
  const family = FAMILY_BY_ID.get(theme.unlock.familyId);
  return family && family.seasonIds.length > 1
    ? `Complète la famille ${theme.unlock.familyId} (${family.seasonIds.length} saisons)`
    : `Complète la famille ${theme.unlock.familyId}`;
}
