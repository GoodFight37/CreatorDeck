/**
 * Cosmétiques de collection : des thèmes qui re-tintent le classeur.
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
  | { kind: "family"; familyId: string }
  | { kind: "all-families" };

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
  tokens: {
    purple: "hsl(280 90% 68%)",
    purpleLight: "hsl(315 95% 86%)",
    gold: "hsl(45 95% 66%)",
    glow: "hsla(300 85% 62% / .22)",
  },
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
