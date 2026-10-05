/**
 * Langue de diffusion → famille de collection.
 *
 * Le classement Twitch ne dit pas d'où vient un streameur, mais il dit dans
 * quelle **langue il diffuse** (`Stream.language`), et c'est le signal le plus
 * stable qui existe : un streameur change de jeu toutes les semaines, pas de
 * langue. Les familles de saisons (`src/data/seasons.config.json`) listent donc
 * les langues qu'elles couvrent, et ce module fait la traduction.
 *
 * Une langue non listée, vide ou exotique ne casse rien : elle tombe dans la
 * famille fourre-tout (« Sans frontière »), jamais dans une famille au hasard.
 *
 * Pur et sans dépendance : utilisé par le générateur
 * (`scripts/build-twitch-catalog.mjs`) et testé dans
 * `src/lib/regions.test.ts`.
 */

/** Langue inconnue : utilisée quand Twitch ne déclare rien. */
export const UNKNOWN_LANGUAGE = "";

/** Uniformise un code de langue Twitch (« PT-BR » → « pt-br »). */
export function normalizeLanguage(value) {
  return String(value ?? "").trim().toLowerCase();
}

/**
 * Identifiant de la famille qui couvre `language`, ou `fallbackId`.
 *
 * Deux passes : le code complet d'abord (« zh-tw » reste distinct de « zh »),
 * puis le code de base (« pt-br » → « pt ») — Twitch renvoie parfois une
 * variante régionale que la configuration n'a pas besoin de lister.
 */
export function regionIdForLanguage(language, families, fallbackId) {
  const lang = normalizeLanguage(language);
  if (!lang) return fallbackId;

  const matches = (candidate) =>
    families.some((family) => (family.languages ?? []).includes(candidate));

  if (matches(lang)) {
    return families.find((family) => (family.languages ?? []).includes(lang)).id;
  }

  const base = lang.split("-")[0];
  if (base && base !== lang && matches(base)) {
    return families.find((family) => (family.languages ?? []).includes(base)).id;
  }

  return fallbackId;
}

/** Toutes les langues couvertes par la configuration (diagnostic). */
export function coveredLanguages(families) {
  return [...new Set(families.flatMap((family) => family.languages ?? []))].sort();
}
