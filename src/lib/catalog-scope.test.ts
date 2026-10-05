import { describe, expect, it } from "vitest";
import { scopeConfig } from "../../scripts/lib/catalog-scope.mjs";

/**
 * Le périmètre (FR / monde) et la taille du catalogue pilotent tous les
 * libellés de l'application. Ces tests garantissent qu'aucun « FR » ne
 * s'échappe dans un catalogue mondial — et inversement.
 */
describe("catalog-scope", () => {
  it("décrit un catalogue français", () => {
    const config = scopeConfig({ size: 500, languages: ["FR"] });
    expect(config).toMatchObject({
      expectedSize: 500,
      scope: "FR",
      scopeLabel: "FR",
      audience: "créateurs francophones",
      label: "Top 500 Twitch FR",
      eyebrow: "TOP 500 TWITCH FR",
      edition: "ÉDITION TOP 500 TWITCH FR",
    });
  });

  it("décrit un catalogue mondial sans aucune mention FR", () => {
    const config = scopeConfig({ size: 2000 });
    expect(config).toMatchObject({
      expectedSize: 2000,
      scope: "world",
      scopeLabel: "mondial",
      audience: "créateurs du monde entier",
      label: "Top 2000 Twitch",
      eyebrow: "TOP 2000 TWITCH",
    });
    // Seuls les champs affichés sont contrôlés : la note de documentation peut
    // citer « FR » pour expliquer le changement de périmètre.
    const display = [config.label, config.eyebrow, config.edition, config.audience, config.scopeLabel].join(" ");
    expect(display).not.toMatch(/\bFR\b/);
  });

  it("décrit un catalogue multi-langues", () => {
    const config = scopeConfig({ size: 1000, languages: ["fr", "en"] });
    expect(config).toMatchObject({
      scope: "world",
      scopeLabel: "FR/EN",
      audience: "créateurs FR/EN",
      label: "Top 1000 Twitch",
    });
  });

  it("ignore les langues vides et normalise la casse", () => {
    expect(scopeConfig({ size: 500, languages: ["", " fr "] }).label).toBe("Top 500 Twitch FR");
    expect(scopeConfig({ size: 500, languages: [] }).scopeLabel).toBe("mondial");
  });

  it("refuse une taille invalide", () => {
    expect(() => scopeConfig({ size: 0 })).toThrowError(RangeError);
    expect(() => scopeConfig({ size: 12.5 })).toThrowError(RangeError);
  });
});
