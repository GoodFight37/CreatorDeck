import creatorData from "@/data/creators.json";

export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";
export type CardVariant = "standard" | "live" | "holo" | "gold";
export type PackType = "live" | "archive";

export type Creator = {
  slug: string;
  displayName: string;
  login: string;
  category: string;
  rarity: Rarity;
  rank: number;
  followers?: number;
  viewers?: number;
};

export const CREATORS = creatorData as Creator[];
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
    eyebrow: "TOP 500 TWITCH FR",
    description: "5 cartes · une variante Live garantie",
    size: 5,
    points: 12,
    xp: 18,
    max: 4,
    regenMs: 60 * 60 * 1000,
  },
  archive: {
    label: "Archives",
    eyebrow: "COLLECTION TOP 500",
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
  if (!followers || followers <= 0) return "Twitch FR";
  if (followers >= 1_000_000) {
    return `${(followers / 1_000_000).toFixed(1).replace(".", ",")} M suiv.`;
  }
  if (followers >= 1_000) {
    return `${Math.round(followers / 1_000)} k suiv.`;
  }
  return `${followers} suiv.`;
}
