/** Un aperçu fixe, sans écriture de collection, de réserve ou de récompense. */
import { CREATOR_BY_SLUG, CREATORS, type Rarity } from "@/lib/catalog";
import { CIRCLE_PACK_SIZE, drawCirclePack, isValidCircle } from "@/lib/circle";
import type { DrawnCard } from "@/lib/game-engine";
export const TUTORIAL_PACK_KEY = "creatordeck.tutorial-pack.seen";
export function tutorialPack(): DrawnCard[] {
  const rarities: Rarity[] = ["common", "common", "common", "uncommon", "rare"];
  const used = new Set<string>();
  return rarities.map((rarity, i) => {
    const creator = CREATORS.find((c) => c.rarity === rarity && !used.has(c.slug))!;
    used.add(creator.slug);
    return { id: `tutorial-${i}`, creatorSlug: creator.slug, rarity,
      variant: "standard", isNew: false, rareDrop: false };
  });
}

/**
 * Aperçu d'un joueur sans compte, sans rien écrire. Cinq noms ou plus : cinq
 * cartes tirées dans « Mes chaînes ». De un à quatre : ces chaînes-là, la
 * préférée en dernière carte, complétées par le paquet tutoriel. Aucun nom :
 * le paquet tutoriel. La rareté reste celle du catalogue.
 */
export function circlePreviewPack(circle: readonly string[]): DrawnCard[] {
  const named = circle.filter((slug) => CREATOR_BY_SLUG.has(slug));
  if (!isValidCircle(circle) || !named.length) return tutorialPack();
  const cards = named.length >= CIRCLE_PACK_SIZE
    ? drawCirclePack(named).map((card) => card.creatorSlug)
    : [...tutorialPack().map((card) => card.creatorSlug).filter((slug) => !named.includes(slug))
      .slice(0, CIRCLE_PACK_SIZE - named.length), ...named.slice(1), named[0]];
  return cards.map((creatorSlug, i) => ({
    id: `circle-${i}-${creatorSlug}`,
    creatorSlug,
    rarity: CREATOR_BY_SLUG.get(creatorSlug)!.rarity,
    variant: "standard" as const,
    isNew: false,
    rareDrop: false,
  }));
}

const listeners = new Set<() => void>();
let consumedInSession = false;
export function hasSeenTutorialPack(): boolean {
  if (consumedInSession) return true;
  try { return window.localStorage.getItem(TUTORIAL_PACK_KEY) === "1"; }
  catch { return false; }
}
export function subscribeTutorialPack(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => { listeners.delete(listener); window.removeEventListener("storage", listener); };
}
export function consumeTutorialPack(): void {
  consumedInSession = true;
  try { window.localStorage.setItem(TUTORIAL_PACK_KEY, "1"); } catch { /* Session seule. */ }
  for (const listener of listeners) listener();
}
