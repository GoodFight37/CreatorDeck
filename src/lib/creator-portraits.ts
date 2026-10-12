import overrides from "@/data/portrait-overrides.json";
import manualOverrides from "@/data/manual-portrait-overrides.json";
import upscaledOverrides from "@/data/upscaled-portrait-overrides.json";
import providedOverrides from "@/data/provided-portrait-overrides.json";

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
export const UPSCALED_PORTRAIT_OVERRIDES: Readonly<Record<string, string>> = upscaledOverrides;
export const PROVIDED_PORTRAIT_OVERRIDES: Readonly<Record<string, string>> = providedOverrides;

/** Même adresse pour les cartes, les affiches et le préchargement. */
export function creatorPortraitUrl(slug: string): string {
  const manualReplacement = Object.hasOwn(MANUAL_PORTRAIT_OVERRIDES, slug) ? MANUAL_PORTRAIT_OVERRIDES[slug] : undefined;
  if (manualReplacement) return manualReplacement;
  const replacement = Object.hasOwn(PORTRAIT_OVERRIDES, slug) ? PORTRAIT_OVERRIDES[slug] : undefined;
  if (replacement) return replacement.image;
  const providedReplacement = Object.hasOwn(PROVIDED_PORTRAIT_OVERRIDES, slug) ? PROVIDED_PORTRAIT_OVERRIDES[slug] : undefined;
  if (providedReplacement) return providedReplacement;
  // Visuel de secours si aucun portrait fourni n'est encore disponible.
  if (slug === "diverron") return "/creators/diverron-fallback.svg";
  const upscaledReplacement = Object.hasOwn(UPSCALED_PORTRAIT_OVERRIDES, slug) ? UPSCALED_PORTRAIT_OVERRIDES[slug] : undefined;
  if (upscaledReplacement) return upscaledReplacement;
  return `/creators/${slug}.webp`;
}
