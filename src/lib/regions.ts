/**
 * Familles de collection : les créateurs sont regroupés par **langue de
 * diffusion** (voir `src/data/seasons.config.json`), pas par jeu joué — un
 * streameur change de jeu toutes les semaines, pas de langue. C'est aussi le
 * signal que le générateur peut établir pour tout le monde : `Stream.language`
 * pour les chaînes vues en direct, liste curée pour les têtes d'affiche hors
 * direct.
 *
 * Les saisons elles-mêmes sont calculées dans `src/lib/seasons.ts` ; ce module
 * ne fait que décrire la configuration et traduire un identifiant de famille en
 * libellé lisible (cartes, atelier, écrans de saison).
 */
import seasonConfig from "@/data/seasons.config.json";

export type RegionFamily = {
  id: string;
  name: string;
  tagline: string;
  /** Codes de langue Twitch couverts par la famille. */
  languages: string[];
};

type RegionConfig = {
  waveSize?: number;
  families?: RegionFamily[];
  catchAll?: { id: string; name: string; tagline: string; maxSize?: number };
};

const CONFIG = seasonConfig as RegionConfig;

/** Familles déclarées, dans l'ordre de la configuration (ordre des teintes). */
export const REGION_FAMILIES: RegionFamily[] = (CONFIG.families ?? []).map((family) => ({
  ...family,
  languages: family.languages ?? [],
}));

/** Famille fourre-tout : langues rares, streams multilingues, langue inconnue. */
export const CATCH_ALL_REGION = CONFIG.catchAll ?? {
  id: "S99",
  name: "Sans frontière",
  tagline: "Tout ce qui ne rentre pas ailleurs.",
  maxSize: 150,
};

/** Taille maximale d'une vague avant découpage. */
export const REGION_WAVE_SIZE = CONFIG.waveSize ?? 150;

const ALL_FAMILIES: RegionFamily[] = [
  ...REGION_FAMILIES,
  {
    id: CATCH_ALL_REGION.id,
    name: CATCH_ALL_REGION.name,
    tagline: CATCH_ALL_REGION.tagline,
    languages: [],
  },
];

export const REGION_BY_ID = new Map(ALL_FAMILIES.map((family) => [family.id, family]));

/**
 * Libellé d'une famille. Un créateur sans région (catalogue pas encore
 * régénéré) ou avec une région inconnue tombe dans « Sans frontière » : jamais
 * de libellé vide, jamais de plantage.
 */
export function regionLabel(regionId?: string | null): string {
  if (!regionId) return CATCH_ALL_REGION.name;
  return REGION_BY_ID.get(regionId)?.name ?? CATCH_ALL_REGION.name;
}

/** Famille d'un créateur, ou la fourre-tout si sa région est inconnue. */
export function regionFamily(regionId?: string | null): RegionFamily {
  if (!regionId) return REGION_BY_ID.get(CATCH_ALL_REGION.id) as RegionFamily;
  return REGION_BY_ID.get(regionId) ?? (REGION_BY_ID.get(CATCH_ALL_REGION.id) as RegionFamily);
}

/** Vrai si l'identifiant correspond à une famille déclarée. */
export function isKnownRegion(regionId?: string | null): boolean {
  return Boolean(regionId && REGION_BY_ID.has(regionId));
}
