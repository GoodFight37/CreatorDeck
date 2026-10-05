/**
 * Cosmétiques de collection : des thèmes qui re-tintent le classeur.
 *
 * Rien à importer — un thème n'est qu'un jeu de variables CSS et une condition
 * de déblocage. Compléter une famille de jeux (son emblème, donc son dernier
 * palier) débloque la teinte de cette famille, et compléter **toutes** les
 * familles débloque le thème « Grand chelem ».
 *
 * Les thèmes sont dérivés du catalogue comme le reste : si une famille
 * apparaît, disparaît ou se découpe à la régénération, les thèmes suivent sans
 * qu'aucune liste ne soit à maintenir à la main.
 */
import { SEASONS } from "@/lib/seasons";

/** Variables CSS appliquées quand le thème est équipé. */
export type ThemeTokens = {
  purple: string;
  purpleLight: string;
  gold: string;
  /** Halo d'ambiance derrière l'application. */
  glow: string;
};

/** Condition d'obtention d'un thème. */
export type ThemeUnlock =
  | { kind: "starter" }
  | { kind: "season"; seasonId: string }
  | { kind: "all-seasons" };

export type CollectionTheme = {
  id: string;
  name: string;
  description: string;
  unlock: ThemeUnlock;
  tokens: ThemeTokens;
};

export const DEFAULT_THEME_ID = "amethyste";
export const GRAND_SLAM_THEME_ID = "grand-chelem";

/**
 * Teintes disponibles pour les familles, espacées pour rester distinguables
 * côte à côte (l'œil sépare mal sept vues d'un même violet).
 */
const FAMILY_HUES = [268, 232, 205, 176, 318, 342, 14, 34, 96, 148];

/** Ordre des familles dans la configuration, indexé sans les suffixes de découpage. */
const FAMILY_INDEX = new Map<string, number>();
for (const season of SEASONS) {
  const base = season.id.replace(/-\d+$/, "");
  if (!FAMILY_INDEX.has(base)) FAMILY_INDEX.set(base, FAMILY_INDEX.size);
}

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

function tokensFor(hue: number): ThemeTokens {
  return {
    purple: `hsl(${hue} 82% 66%)`,
    purpleLight: `hsl(${hue} 92% 84%)`,
    gold: `hsl(${(hue + 38) % 360} 88% 64%)`,
    glow: `hsla(${hue} 82% 58% / .2)`,
  };
}

const STARTER: CollectionTheme = {
  id: DEFAULT_THEME_ID,
  name: "Améthyste",
  description: "Le thème d'origine du classeur : violet et or.",
  unlock: { kind: "starter" },
  tokens: {
    purple: "#8f64ff",
    purpleLight: "#c1a8ff",
    gold: "#ffbe55",
    glow: "rgba(111, 65, 221, .18)",
  },
};

/** Un thème par famille, dans l'ordre du catalogue. */
const SEASON_THEMES: CollectionTheme[] = SEASONS.map((season) => ({
  id: `theme-${season.id}`,
  name: season.name,
  description: `Débloqué par l'emblème de la saison ${season.id}.`,
  unlock: { kind: "season", seasonId: season.id },
  tokens: tokensFor(seasonHue(season.id)),
}));

/** Récompense d'achèvement total : toutes les familles complétées. */
const GRAND_SLAM: CollectionTheme = {
  id: GRAND_SLAM_THEME_ID,
  name: "Grand chelem",
  description: "Toutes les familles complétées : le classeur passe à l'arc-en-ciel.",
  unlock: { kind: "all-seasons" },
  tokens: {
    purple: "hsl(280 90% 68%)",
    purpleLight: "hsl(315 95% 86%)",
    gold: "hsl(45 95% 66%)",
    glow: "hsla(300 85% 62% / .22)",
  },
};

export const THEMES: CollectionTheme[] = [STARTER, ...SEASON_THEMES, GRAND_SLAM];

export const THEME_BY_ID = new Map(THEMES.map((theme) => [theme.id, theme]));

export const DEFAULT_THEME = STARTER;

export function themeById(id: string | undefined): CollectionTheme | undefined {
  return id ? THEME_BY_ID.get(id) : undefined;
}

/** Description lisible de ce qui reste à faire pour obtenir le thème. */
export function unlockHint(theme: CollectionTheme): string {
  if (theme.unlock.kind === "starter") return "Disponible d'emblée";
  if (theme.unlock.kind === "all-seasons") return "Complète toutes les familles";
  return `Complète la saison ${theme.unlock.seasonId}`;
}
