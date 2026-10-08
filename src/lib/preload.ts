/**
 * Préchargement des portraits.
 *
 * Quand les cinq cartes d'un booster arrivent, la révélation les montre l'une
 * après l'autre — mais le navigateur ne **commence** à télécharger un portrait
 * qu'au moment où il l'affiche. Sur un téléphone, ça se voit : la carte s'ouvre
 * sur un rectangle vide, puis le visage apparaît. Précharger les cinq dès que
 * le tirage est connu (le serveur a déjà répondu, on a le temps d'un aller-retour
 * pendant l'animation) supprime ce blanc.
 *
 * Le module est minuscule et **sans effet hors navigateur** : les tests le
 * chargent en Node, où `Image` n'existe pas — le préchargement doit alors ne
 * rien faire du tout, jamais jeter.
 */

/** Le portrait d'un créateur, tel que `creatorImage()` le construit. */
function portraitUrl(slug: string): string {
  return `/creators/${slug}.webp`;
}

/**
 * Demande au navigateur de charger ces portraits, sans les afficher.
 *
 * Les images sont jetées : c'est le cache HTTP qui fait le travail, et il
 * resservira le même fichier à l'écran de révélation (même adresse, donc même
 * entrée de cache).
 */
export function preloadPortraits(slugs: Iterable<string>): void {
  if (typeof Image === "undefined") return;
  const seen = new Set<string>();
  for (const slug of slugs) {
    if (typeof slug !== "string" || slug.length === 0 || seen.has(slug)) continue;
    seen.add(slug);
    const image = new Image();
    // `decoding = "async"` : même si le portrait est déjà en cache, le décodage
    // ne bloque pas la révélation en cours.
    image.decoding = "async";
    image.src = portraitUrl(slug);
  }
}
