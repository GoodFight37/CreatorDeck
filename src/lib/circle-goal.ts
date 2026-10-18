/**
 * « Ton cercle à compléter » : l'objectif du Binder pour un joueur qui a nommé
 * ses chaînes (étape 3).
 *
 * Logique pure, et **aucune règle nouvelle** : la cible d'artisanat proposée
 * suit `craftQuote()` (les mêmes coûts et la même liste de raretés
 * artisanales que l'Atelier et le serveur). Une chaîne du cercle qui ne se
 * fabrique pas — une Légendaire du catalogue — est dite « à tirer en
 * booster », jamais promise à l'artisanat.
 */
import { CREATOR_BY_SLUG, type Creator } from "@/lib/catalog";
import { craftQuote } from "@/lib/game-engine";

export type CircleCraftTarget = {
  creator: Creator;
  cost: number;
  /** Le joueur a déjà les points. */
  affordable: boolean;
  /** Points qui manquent (0 si `affordable`). */
  missingPoints: number;
};

export type CircleGoal = {
  owned: number;
  total: number;
  /** Les chaînes manquantes, dans l'ordre du cercle (la préférée d'abord). */
  missing: Creator[];
  /**
   * La prochaine chaîne à fabriquer : la première manquante du cercle qui se
   * fabrique. `null` si aucune ne se fabrique ou si tout est déjà obtenu.
   */
  craftTarget: CircleCraftTarget | null;
  /** Les manquantes qui ne se tirent qu'en booster. */
  boosterOnly: Creator[];
};

export function circleGoal(
  circle: readonly string[],
  ownedSlugs: ReadonlySet<string>,
  points: number,
): CircleGoal {
  const creators = circle
    .map((slug) => CREATOR_BY_SLUG.get(slug))
    .filter((creator): creator is Creator => creator !== undefined);
  const missing = creators.filter((creator) => !ownedSlugs.has(creator.slug));
  let craftTarget: CircleCraftTarget | null = null;
  const boosterOnly: Creator[] = [];
  for (const creator of missing) {
    // `cards: []` : on sait déjà que la carte manque ; seul le prix compte ici.
    const quote = craftQuote({ cards: [] }, creator.slug);
    if (!quote.craftable || quote.cost === null) {
      boosterOnly.push(creator);
      continue;
    }
    if (!craftTarget) {
      const missingPoints = Math.max(0, quote.cost - points);
      craftTarget = { creator, cost: quote.cost, affordable: missingPoints === 0, missingPoints };
    }
  }
  return {
    owned: creators.length - missing.length,
    total: creators.length,
    missing,
    craftTarget,
    boosterOnly,
  };
}

/** « À trouver : ibai, Ninja et 3 autres. » */
export function missingPreview(missing: readonly Creator[], shown = 3): string {
  if (!missing.length) return "Toutes tes chaînes sont dans ta collection.";
  const names = missing.slice(0, shown).map((creator) => creator.displayName).join(", ");
  const others = missing.length - shown;
  return `À trouver : ${names}${others > 0 ? ` et ${others} autre${others > 1 ? "s" : ""}` : ""}.`;
}

/** Le catalogue et craftQuote décident seuls si une carte se fabrique. */
export function boosterOnlyMessage(creators: readonly Creator[]): string {
  if (!creators.length) return "";
  return creators.length === 1
    ? `${creators[0].displayName} ne se fabrique pas : à tirer en booster, plus souvent pendant son direct.`
    : `${creators.length} de tes chaînes ne se fabriquent pas : à tirer en booster, plus souvent pendant leur direct.`;
}
