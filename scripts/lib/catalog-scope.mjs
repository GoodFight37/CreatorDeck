/**
 * Périmètre d'un catalogue Twitch et libellés qui en découlent.
 *
 * L'application ne code en dur ni la taille (« 500 ») ni le périmètre (« FR ») :
 * ce module produit `src/data/catalog.config.json`, que `src/lib/catalog.ts`
 * relit pour construire CATALOG_LABEL, CATALOG_EYEBROW, CATALOG_AUDIENCE…
 *
 * Pur et sans dépendance : testable sans réseau (voir src/lib/catalog-scope.test.ts).
 */

/**
 * @param {object} input
 * @param {number} input.size        nombre d'entrées du catalogue
 * @param {string[]} [input.languages] langues retenues (vide = monde entier)
 * @returns {{expectedSize:number, scope:string, scopeLabel:string, audience:string,
 *            label:string, eyebrow:string, edition:string, note:string}}
 */
export function scopeConfig({ size, languages = [] }) {
  if (!Number.isInteger(size) || size < 1) {
    throw new RangeError(`scopeConfig: taille invalide (${size}).`);
  }
  const codes = languages.map((code) => String(code).trim().toUpperCase()).filter(Boolean);
  const frenchOnly = codes.length === 1 && codes[0] === "FR";
  const scoped = codes.length > 0;

  const suffix = frenchOnly ? " FR" : "";
  const scope = frenchOnly ? "FR" : "world";
  const scopeLabel = frenchOnly ? "FR" : scoped ? codes.join("/") : "mondial";
  const audience = frenchOnly
    ? "créateurs francophones"
    : scoped
      ? `créateurs ${codes.join("/")}`
      : "créateurs du monde entier";
  const eyebrow = `TOP ${size} TWITCH${suffix}`;

  return {
    expectedSize: size,
    scope,
    scopeLabel,
    audience,
    label: `Top ${size} Twitch${suffix}`,
    eyebrow,
    edition: `ÉDITION ${eyebrow}`,
    note:
      "Périmètre et libellés du catalogue, écrits par scripts/build-twitch-catalog.mjs. " +
      "L'application lit ces valeurs : changer de périmètre (FR -> monde) ne touche aucun composant. " +
      "expectedSize est vérifié par npm run catalog:check.",
  };
}

/**
 * Langues principales de diffusion sur Twitch, utilisées uniquement en
 * **repli** pour la requête de direct globale (voir `fetchLiveStreams`).
 *
 * Constat mesuré : une requête de direct mondiale sans filtre de langue
 * (`streams(first: N)`) revient vide côté API anonyme, alors que la même
 * requête avec `broadcasterLanguages` renvoie des chaînes. Le classement final
 * ne dépend pas de ce repli (la pagination par jeux, elle, n'est pas filtrée et
 * fournit l'essentiel des candidats) : c'est un bonus pour rattraper les
 * grosses chaînes en direct.
 */
export const WORLD_LIVE_LANGUAGES = [
  "EN", "ES", "PT", "RU", "KO", "FR", "DE", "JA", "IT", "PL", "TR", "TH",
];

/**
 * Libellé de périmètre pour les journaux du générateur (« monde », « FR »,
 * « FR/EN »). Séparé de `scopeConfig` : ici on parle d'une requête, pas d'un
 * catalogue — un repli sur les langues principales ne doit pas faire croire que
 * le catalogue est filtré.
 *
 * @param {string[]} languages langues demandées (vide = monde entier)
 */
export function scopeLogLabel(languages = []) {
  const codes = languages.map((code) => String(code).trim().toUpperCase()).filter(Boolean);
  if (!codes.length) return "monde";
  return codes.length <= 3 ? codes.join("/") : `${codes.length} langues`;
}
