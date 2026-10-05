import catalogConfig from "@/data/catalog.config.json";
import creatorData from "@/data/creators.json";

export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";
export type CardVariant = "standard" | "live" | "holo" | "gold";
export type PackType = "live" | "archive";

export type Creator = {
  slug: string;
  displayName: string;
  login: string;
  /**
   * Dernière catégorie Twitch observée : le jeu joué **au moment de la
   * génération**, ou « Variété & Live » pour une chaîne hors direct (Twitch ne
   * publie alors que le dernier jeu programmé, qui n'est pas une information
   * fiable — voir `scripts/lib/curated-category.mjs`).
   *
   * Ce n'est plus un axe de collection : la famille d'un créateur est sa langue
   * (`region`). La catégorie reste utile à la recherche.
   */
  category: string;
  /**
   * Famille de collection : identifiant d'une famille de
   * `src/data/seasons.config.json` (langue de diffusion). Absent d'un catalogue
   * généré avant l'arrivée des régions — l'application le range alors dans
   * « Sans frontière ».
   */
  region?: string;
  rarity: Rarity;
  rank: number;
  followers?: number;
  viewers?: number;
};

export const CREATORS = creatorData as Creator[];

/**
 * Taille et périmètre du catalogue, dérivés des données.
 *
 * Rien dans l'application ne code en dur ni la taille (« 500 ») ni le périmètre
 * (« FR ») : tout vient de `src/data/catalog.config.json`, écrit par
 * `scripts/build-twitch-catalog.mjs`. Passer au monde entier, à 1000 ou à 2000
 * créateurs est donc un changement de données, pas de code — les constantes
 * ci-dessous sont la seule source des textes concernés.
 */
type CatalogConfig = {
  scope?: string;
  scopeLabel?: string;
  audience?: string;
  label?: string;
  eyebrow?: string;
  edition?: string;
};

const CONFIG = catalogConfig as CatalogConfig;

export const CATALOG_SIZE = CREATORS.length;
/** « FR » ou « world » : périmètre du catalogue. */
export const CATALOG_SCOPE = CONFIG.scope ?? "world";
/** « FR » / « mondial » : le même périmètre, écrit dans une phrase. */
export const CATALOG_SCOPE_LABEL =
  CONFIG.scopeLabel ?? (CATALOG_SCOPE === "world" ? "mondial" : CATALOG_SCOPE);
/** « créateurs francophones » / « créateurs du monde entier ». */
export const CATALOG_AUDIENCE = CONFIG.audience ?? "créateurs";

const SCOPE_SUFFIX = CATALOG_SCOPE === "world" ? "" : ` ${CATALOG_SCOPE}`;

/** « Top 500 Twitch FR » — libellé complet, utilisable en milieu de phrase. */
export const CATALOG_LABEL = CONFIG.label ?? `Top ${CATALOG_SIZE} Twitch${SCOPE_SUFFIX}`;
/** « TOP 500 TWITCH FR » — accroche (majuscules). */
export const CATALOG_EYEBROW = CONFIG.eyebrow ?? CATALOG_LABEL.toUpperCase();
/** « ÉDITION TOP 500 FR » — accroche de la page d'accueil. */
export const CATALOG_EDITION = CONFIG.edition ?? `ÉDITION ${CATALOG_EYEBROW}`;

export const CREATOR_BY_SLUG = new Map(
  CREATORS.map((creator) => [creator.slug, creator]),
);

/**
 * Métadonnées d'affichage **et économie** de chaque rareté.
 *
 * `craftCost` / `recycleValue` / `craftable` reprennent le modèle de
 * `rarities.json` de pokemon-tcg-pocket-database (licence MIT) : chaque rareté
 * a un coût d'artisanat en points et une valeur de recyclage. Un doublon vaut
 * toujours moins que son coût d'artisanat (pas d'arbitrage infini) et la
 * rareté Légendaire n'est pas artisanable — comme les raretés hautes qui ne
 * s'échangent pas dans TCG Pocket : elle se mérite en booster.
 */
export const RARITY_META: Record<
  Rarity,
  {
    label: string;
    short: string;
    color: string;
    glow: string;
    order: number;
    /** Coût en points pour rejoindre ce créateur depuis l'Atelier. */
    craftCost: number | null;
    /** Points crédités en recyclant un doublon de cette rareté. */
    recycleValue: number;
    craftable: boolean;
  }
> = {
  common: {
    label: "Commune",
    short: "C",
    color: "#8d95a7",
    glow: "rgba(141,149,167,.34)",
    order: 1,
    craftCost: 45,
    recycleValue: 12,
    craftable: true,
  },
  uncommon: {
    label: "Peu commune",
    short: "PC",
    color: "#43d69c",
    glow: "rgba(67,214,156,.38)",
    order: 2,
    craftCost: 90,
    recycleValue: 22,
    craftable: true,
  },
  rare: {
    label: "Rare",
    short: "R",
    color: "#40a9ff",
    glow: "rgba(64,169,255,.45)",
    order: 3,
    craftCost: 220,
    recycleValue: 55,
    craftable: true,
  },
  epic: {
    label: "Épique",
    short: "E",
    color: "#a46cff",
    glow: "rgba(164,108,255,.5)",
    order: 4,
    craftCost: 600,
    recycleValue: 150,
    craftable: true,
  },
  legendary: {
    label: "Légendaire",
    short: "L",
    color: "#ffbd45",
    glow: "rgba(255,189,69,.58)",
    order: 5,
    craftCost: null,
    recycleValue: 250,
    craftable: false,
  },
};

export const VARIANT_META: Record<
  CardVariant,
  { label: string; className: string }
> = {
  standard: { label: "Standard", className: "variant-standard" },
  live: { label: "Live", className: "variant-live" },
  holo: { label: "Holographique", className: "variant-holo" },
  gold: { label: "Gold", className: "variant-gold" },
};

export const PACKS = {
  live: {
    label: "Live Drop",
    eyebrow: CATALOG_EYEBROW,
    description: "5 cartes · une variante Live garantie",
    size: 5,
    points: 12,
    xp: 18,
    max: 4,
    regenMs: 60 * 60 * 1000,
  },
  archive: {
    label: "Archives",
    eyebrow: `COLLECTION TOP ${CATALOG_SIZE}`,
    description: "3 cartes · une Rare ou mieux garantie",
    size: 3,
    points: 25,
    xp: 26,
    max: 3,
    regenMs: 4 * 60 * 60 * 1000,
  },
} as const;

export function creatorImage(creator: Pick<Creator, "slug">) {
  return `/creators/${creator.slug}.jpg`;
}

export function formatFollowersCount(followers?: number) {
  if (!followers || followers <= 0) return `Twitch ${CATALOG_SCOPE_LABEL}`;
  if (followers >= 1_000_000) {
    return `${(followers / 1_000_000).toFixed(1).replace(".", ",")} M suiv.`;
  }
  if (followers >= 1_000) {
    return `${Math.round(followers / 1_000)} k suiv.`;
  }
  return `${followers} suiv.`;
}
