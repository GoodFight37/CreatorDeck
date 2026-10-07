import catalogConfig from "@/data/catalog.config.json";
import creatorData from "@/data/creators.json";
import retiredData from "@/data/retired.json";

export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";
export type CardVariant = "standard" | "live" | "holo" | "gold";
/**
 * Identifiant de booster. Dérivé de `PACKS` : ajouter un paquet à `PACKS` (et sa
 * table dans `pull-rates.json`) suffit, le type suit.
 */
export type PackType = keyof typeof PACKS;

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
 * Un créateur qui a quitté le classement (voir `src/lib/retired.ts`).
 *
 * `retiredEdition` est l'édition du catalogue pendant laquelle il est parti :
 * il reste artisanable pendant celle-là, et plus après. `retiredAt` garde la
 * date du constat, pour l'historique des données.
 */
export type RetiredCreator = Creator & {
  retiredEdition: number;
  retiredAt: string;
};

/**
 * Les Sortants, lus depuis `src/data/retired.json`.
 *
 * Un slug déjà présent dans le catalogue courant est ignoré : si un créateur
 * revient au classement, c'est le catalogue qui gagne, et sa carte redevient
 * tirable. Le fichier peut donc garder une ligne « morte » sans casser le jeu.
 */
export const RETIRED_CREATORS: RetiredCreator[] = (
  (retiredData as { creators?: RetiredCreator[] }).creators ?? []
).filter(
  (creator): creator is RetiredCreator =>
    Boolean(creator && creator.slug && !(creatorData as Creator[]).some((c) => c.slug === creator.slug)),
);

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

type CatalogConfigFull = CatalogConfig & { editionNumber?: number };

const CONFIG = catalogConfig as CatalogConfigFull;

/**
 * Numéro de l'édition en cours : il s'incrémente à chaque régénération du
 * catalogue (voir `scripts/build-twitch-catalog.mjs`). C'est lui qui date les
 * Sortants et décide si leur fenêtre d'artisanat est encore ouverte.
 */
export const CATALOG_EDITION_NUMBER = CONFIG.editionNumber ?? 1;

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

/** Les Sortants, par slug — pour savoir d'où vient une carte déjà possédée. */
export const RETIRED_BY_SLUG = new Map(
  RETIRED_CREATORS.map((creator) => [creator.slug, creator]),
);

/**
 * Tous les créateurs connus : le catalogue courant **et** les Sortants.
 *
 * C'est la carte d'identité du jeu, pas la liste des tirages : une carte gardée
 * d'une ancienne édition doit continuer à s'afficher (classeur, vitrine, hôte,
 * Last Pack). Le tirage, lui, ne lit que `CREATORS`.
 */
export const CREATOR_BY_SLUG = new Map(
  [...CREATORS, ...RETIRED_CREATORS].map((creator) => [creator.slug, creator]),
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

/**
 * Le booster du jeu — un seul, volontairement.
 *
 * Le modèle est celui qui marche le mieux sur ce genre de jeu : un paquet
 * gratuit qui se recharge tout seul, qu'on ouvre dès qu'il est prêt. Deux
 * paquets (un gratuit, un payant en points) obligeaient à choisir avant même
 * de savoir ce qu'on voulait, pour un gain de jeu nul.
 *
 * Rythme : un booster toutes les **30 minutes** (WikiMasters, la référence du
 * genre, en donne un toutes les 10 minutes), cumulables jusqu'à 4 — soit deux
 * heures d'absence avant de saturer. `max` et `regenMs` sont les seuls leviers.
 *
 * Le booster contient 5 cartes dont la dernière est garantie Rare ou mieux, en
 * variante Live : la promesse du « live » de Twitch, à chaque ouverture.
 */
/**
 * Les deux paquets du jeu — il n'y en a pas d'autres.
 *
 * `live` est le paquet à réserve : quatre boosters, un toutes les demi-heures.
 * `scene` n'est pas une réserve : c'est un rendez-vous, **un par jour de jeu**,
 * qui tire cinq cartes de la famille que le joueur complète et ne contient
 * aucune Légendaire (`pull-rates.json`). Il n'a donc ni `max` ni `regenMs` —
 * la disponibilité se lit dans la journée (`sceneDay`, côté appareil ;
 * `pack_draws`, côté serveur).
 */
export const PACKS = {
  live: {
    label: "Live Drop",
    eyebrow: CATALOG_EYEBROW,
    description: "5 cartes · une variante Live garantie",
    size: 5,
    points: 12,
    xp: 18,
    max: 4,
    regenMs: 30 * 60 * 1000,
  },
  scene: {
    label: "Paquet Scène",
    eyebrow: "Ta famille",
    description: "5 cartes de ta famille · jamais de Légendaire",
    size: 5,
    points: 10,
    xp: 14,
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
