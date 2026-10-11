/** Un aperçu fixe, sans écriture de collection, de réserve ou de récompense. */
import { CREATORS, type Rarity } from "@/lib/catalog";
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
