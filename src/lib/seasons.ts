/**
 * Saisons de collection : les 500 créateurs sont regroupés en grandes familles
 * de jeux (façon séries/sets d'un TCG), ce qui donne des objectifs de
 * complétion intermédiaires entre « 1 carte » et « les 500 ».
 *
 * Le découpage vit dans `src/data/seasons.config.json` ; tout est calculé ici à
 * partir du catalogue, donc aucune donnée ne peut se désynchroniser. Une
 * saison est complète quand tous ses créateurs sont possédés : le joueur peut
 * alors réclamer sa récompense (points + sabliers) depuis l'écran Objectifs.
 */
import seasonConfig from "@/data/seasons.config.json";
import { CREATORS } from "@/lib/catalog";

export type SeasonReward = { points: number; hourglasses: number };

export type Season = {
  id: string;
  name: string;
  tagline: string;
  /** Catégories Twitch couvertes (vide pour la saison fourre-tout). */
  categories: string[];
  slugs: string[];
  reward: SeasonReward;
};

type SeasonDefinition = { id: string; name: string; tagline: string; categories: string[] };
type SeasonConfig = {
  pointsPerCreator: number;
  hourglassesPerSeason: number;
  seasons: SeasonDefinition[];
  catchAll: { id: string; name: string; tagline: string };
};

const CONFIG = seasonConfig as SeasonConfig;

function rewardFor(size: number): SeasonReward {
  return {
    points: CONFIG.pointsPerCreator * size,
    hourglasses: CONFIG.hourglassesPerSeason,
  };
}

function buildSeasons(): Season[] {
  const explicitCategories = new Set(CONFIG.seasons.flatMap((season) => season.categories));

  const seasons: Season[] = CONFIG.seasons.map((definition) => {
    const slugs = CREATORS.filter((creator) =>
      definition.categories.includes(creator.category),
    ).map((creator) => creator.slug);
    return { ...definition, slugs, reward: rewardFor(slugs.length) };
  });

  // Les catégories non listées (petits jeux, événements ponctuels) atterrissent
  // dans une saison « Découverte » : aucun créateur n'est laissé de côté.
  const leftovers = CREATORS.filter((creator) => !explicitCategories.has(creator.category));
  if (leftovers.length) {
    seasons.push({
      id: CONFIG.catchAll.id,
      name: CONFIG.catchAll.name,
      tagline: CONFIG.catchAll.tagline,
      categories: [...new Set(leftovers.map((creator) => creator.category))].sort(),
      slugs: leftovers.map((creator) => creator.slug),
      reward: rewardFor(leftovers.length),
    });
  }

  return seasons;
}

export const SEASONS: Season[] = buildSeasons();

export const SEASON_BY_ID = new Map(SEASONS.map((season) => [season.id, season]));

const SEASON_BY_SLUG = new Map<string, Season>(
  SEASONS.flatMap((season) => season.slugs.map((slug) => [slug, season] as const)),
);

/** Saison d'un créateur. Tout créateur appartient à exactement une saison. */
export function seasonOf(slug: string): Season | undefined {
  return SEASON_BY_SLUG.get(slug);
}

/** Nombre total de créateurs couverts par les saisons (doit valoir 500). */
export function seasonsCoverage(): number {
  return SEASONS.reduce((sum, season) => sum + season.slugs.length, 0);
}
