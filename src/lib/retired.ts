/**
 * Les Sortants : les créateurs qui ont quitté le classement.
 *
 * Le catalogue n'est pas figé — il est régénéré depuis le classement Twitch, et
 * une régénération fait entrer du monde et en fait sortir. Ceux qui sortent
 * posent un problème que le jeu ne peut pas ignorer : leurs cartes existent déjà
 * dans des classeurs, des échanges et des ventes. On ne peut donc pas les
 * supprimer, et on ne peut pas non plus les laisser dans le tirage — sinon le
 * catalogue grossit à chaque saison et 100 % reste hors de portée pour toujours.
 *
 * D'où la règle, en trois points :
 *
 *   1. **plus tirables.** Un Sortant n'est dans aucune roue : ni Live Drop, ni
 *      Paquet Scène. Sa collection ne s'agrandit plus par la chance.
 *   2. **toujours valables.** Sa carte vit sa vie : classeur, vitrine, échange,
 *      hôtel des ventes, Last Pack. Le serveur garde sa ligne au catalogue.
 *   3. **artisanables une édition.** Pendant l'édition qui les a vus partir, on
 *      peut encore les rejoindre à l'Atelier — puis la porte se ferme. La carte
 *      garde ainsi sa valeur : celui qui l'a eue à temps l'a eue.
 *
 * Un mot sur les Légendaires : la règle du jeu dit qu'une Légendaire ne
 * s'artisane pas, elle se mérite en booster (`RARITY_META.legendary.craftable`).
 * Elle vaut aussi pour les Sortants. C'est assumé : une Légendaire qui quitte le
 * classement devient un trophée — le seul moyen d'en avoir une restera de
 * l'avoir eue. Sans cette exception, chaque rotation du catalogue offrirait les
 * Légendaires au rabais, et le plancher de malchance ne voudrait plus rien dire.
 *
 * Ce module ne fait que lire : les règles, et rien d'autre. Il est pur, donc
 * testé (`src/lib/retired.test.ts`).
 */
import {
  CATALOG_EDITION_NUMBER,
  RETIRED_BY_SLUG,
  RETIRED_CREATORS,
  RARITY_META,
  type RetiredCreator,
} from "@/lib/catalog";

export type { RetiredCreator };

/** Vrai si ce créateur a quitté le classement. */
export function isRetired(slug: string): boolean {
  return RETIRED_BY_SLUG.has(slug);
}

/** Le Sortant qui porte ce slug, ou `null`. */
export function retiredBySlug(slug: string): RetiredCreator | null {
  return RETIRED_BY_SLUG.get(slug) ?? null;
}

/**
 * L'édition pendant laquelle un Sortant reste artisanable : celle de son départ.
 * Passé la suivante, la porte est fermée.
 */
export function craftWindowOpen(
  creator: RetiredCreator,
  edition = CATALOG_EDITION_NUMBER,
): boolean {
  return creator.retiredEdition === edition;
}

/**
 * Peut-on encore rejoindre ce Sortant à l'Atelier ?
 *
 * Deux conditions : la fenêtre est ouverte, et sa rareté est artisanale — ce qui
 * exclut les Légendaires, comme pour le reste du jeu.
 */
export function canCraftRetired(
  creator: RetiredCreator,
  edition = CATALOG_EDITION_NUMBER,
): boolean {
  return craftWindowOpen(creator, edition) && (RARITY_META[creator.rarity]?.craftable ?? false);
}

/** Ce que l'écran écrit sur un Sortant : « Sortant », et où en est sa fenêtre. */
export function retiredLabel(
  creator: RetiredCreator,
  edition = CATALOG_EDITION_NUMBER,
): string {
  if (canCraftRetired(creator, edition)) return "Sortant · artisanable cette édition";
  if (RARITY_META[creator.rarity]?.craftable === false) return "Sortant · légendaire, plus artisanable";
  return "Sortant · plus artisanable";
}

/** Les Sortants encore artisanables, du plus récent au plus ancien. */
export function craftableRetired(edition = CATALOG_EDITION_NUMBER): RetiredCreator[] {
  return RETIRED_CREATORS.filter((creator) => canCraftRetired(creator, edition));
}

/** Combien de cartes du joueur ne sont plus tirables (ses trophées, en somme). */
export function retiredOwnedCount(slugs: Iterable<string>): number {
  let count = 0;
  for (const slug of slugs) if (RETIRED_BY_SLUG.has(slug)) count += 1;
  return count;
}
