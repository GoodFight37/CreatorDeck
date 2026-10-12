import overrides from "@/data/portrait-overrides.json";
import manualOverrides from "@/data/manual-portrait-overrides.json";

type PortraitOverride = {
  name: string;
  image: string;
  title: string;
  author: string;
  source: string;
  license: string;
  licenseUrl: string;
  changes: string;
};

export const PORTRAIT_OVERRIDES: Readonly<Record<string, PortraitOverride>> = overrides;
export const MANUAL_PORTRAIT_OVERRIDES: Readonly<Record<string, string>> = manualOverrides;

/** Même adresse pour les cartes, les affiches et le préchargement. */
export function creatorPortraitUrl(slug: string): string {
  const manualReplacement = Object.hasOwn(MANUAL_PORTRAIT_OVERRIDES, slug) ? MANUAL_PORTRAIT_OVERRIDES[slug] : undefined;
  if (manualReplacement) return manualReplacement;
  const replacement = Object.hasOwn(PORTRAIT_OVERRIDES, slug) ? PORTRAIT_OVERRIDES[slug] : undefined;
  if (replacement) return replacement.image;
  // Visuel de secours intentionnel, pas un portrait officiel.
  if (slug === "diverron") return "/creators/diverron-fallback.svg";
  return `/creators/${slug}.webp`;
}
