import { describe, expect, it } from "vitest";
import {
  normalizeLanguage,
  regionIdForLanguage,
} from "../../scripts/lib/regions.mjs";
import {
  CATCH_ALL_REGION,
  REGION_BY_ID,
  REGION_FAMILIES,
  isKnownRegion,
  regionLabel,
} from "@/lib/regions";

const FAMILIES = [
  { id: "S01", name: "France & francophonie", languages: ["fr"] },
  { id: "S03", name: "Brésil & Portugal", languages: ["pt"] },
  { id: "S08", name: "Asie", languages: ["ko", "ja", "zh", "zh-tw"] },
];

/**
 * Classer un streameur par langue : c'est le seul axe de collection qui ne
 * mente pas (Twitch publie la langue d'un direct, jamais le jeu d'une chaîne
 * hors direct). Ces tests figent les cas tordus : langue absente, variante
 * régionale, langue inconnue.
 */
describe("langue → famille", () => {
  it("range une langue déclarée dans sa famille", () => {
    expect(regionIdForLanguage("fr", FAMILIES, "S99")).toBe("S01");
    expect(regionIdForLanguage("ko", FAMILIES, "S99")).toBe("S08");
  });

  it("garde les variantes régionales distinctes", () => {
    // « zh-tw » est listé : il ne doit pas retomber sur « zh » par erreur.
    expect(regionIdForLanguage("zh-tw", FAMILIES, "S99")).toBe("S08");
  });

  it("accepte une variante non listée en la ramenant à sa langue de base", () => {
    // Twitch renvoie parfois « pt-br » : la famille lusophone le couvre.
    expect(regionIdForLanguage("pt-br", FAMILIES, "S99")).toBe("S03");
    expect(regionIdForLanguage("PT", FAMILIES, "S99")).toBe("S03");
  });

  it("envoie une langue inconnue ou absente dans la fourre-tout", () => {
    for (const value of [undefined, null, "", "  ", "xx", "sr-latn"]) {
      expect(regionIdForLanguage(value, FAMILIES, "S99")).toBe("S99");
    }
  });

  it("normalise la casse et les espaces", () => {
    expect(normalizeLanguage("  KO  ")).toBe("ko");
    expect(normalizeLanguage(undefined)).toBe("");
  });

  it("la configuration réelle ne déclare aucune langue en double", () => {
    const seen = new Map<string, string>();
    for (const family of REGION_FAMILIES) {
      for (const language of family.languages) {
        expect(seen.has(language), `langue ${language}`).toBe(false);
        seen.set(language, family.id);
      }
    }
    expect(seen.size).toBeGreaterThan(10);
  });

  it("traduit une famille en libellé, sans jamais laisser de trou", () => {
    for (const family of REGION_FAMILIES) {
      expect(regionLabel(family.id)).toBe(family.name);
    }
    // Un catalogue pas encore régénéré n'a pas de région : « Sans frontière ».
    expect(regionLabel(undefined)).toBe(CATCH_ALL_REGION.name);
    expect(regionLabel("S01-inconnue")).toBe(CATCH_ALL_REGION.name);
    expect(isKnownRegion("S01")).toBe(true);
    expect(isKnownRegion(undefined)).toBe(false);
    expect(REGION_BY_ID.get(CATCH_ALL_REGION.id)?.name).toBe(CATCH_ALL_REGION.name);
  });
});
