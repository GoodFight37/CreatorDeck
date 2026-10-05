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
