import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { APP_THEMES, DEFAULT_APP_THEME, isAppTheme } from "@/lib/app-theme";

const CSS = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

/** Déclarations `--jeton: valeur;` d'un bloc dont le sélecteur est donné. */
function bloc(selecteur: string): Map<string, string> {
  const debut = CSS.indexOf(`${selecteur} {`);
  expect(debut, `${selecteur} absent de globals.css`).toBeGreaterThanOrEqual(0);
  const fin = CSS.indexOf("\n}", debut);
  const jetons = new Map<string, string>();
  for (const [, nom, valeur] of CSS.slice(debut, fin).matchAll(/^\s*(--[\w-]+):\s*([^;]+);/gm)) jetons.set(nom, valeur.trim());
  expect(jetons.size, selecteur + ' : aucun jeton lu').toBeGreaterThan(0);
  return jetons;
}

function luminance(hex: string): number {
  const canaux = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = canaux.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contraste(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

const racine = bloc(":root");
const themes = APP_THEMES.map((id) => {
  const surcharges = id === DEFAULT_APP_THEME ? new Map<string, string>() : bloc(`:root[data-theme="${id}"]`);
  return { id, surcharges, jetons: new Map([...racine, ...surcharges]) };
});

describe("thèmes d'application", () => {
  it("reconnaît les identifiants valides", () => {
    expect(isAppTheme("memes")).toBe(true);
    expect(isAppTheme("bordeaux")).toBe(false);
    expect(isAppTheme(undefined)).toBe(false);
  });

  it("ne réécrit que des jetons que :root déclare", () => {
    for (const { id, surcharges } of themes) {
      for (const nom of surcharges.keys()) expect(racine.has(nom), `${id} : ${nom} absent de :root`).toBe(true);
    }
  });

  it("garde chaque thème lisible", () => {
    for (const { id, jetons } of themes) {
      const lire = (nom: string) => jetons.get(nom) as string;
      expect(contraste(lire("--text"), lire("--bg")), `${id} · texte/fond`).toBeGreaterThanOrEqual(12);
      expect(contraste(lire("--text"), lire("--panel")), `${id} · texte/panneau`).toBeGreaterThanOrEqual(10);
      expect(contraste(lire("--muted"), lire("--panel")), `${id} · secondaire/panneau`).toBeGreaterThanOrEqual(4.5);
      expect(contraste(lire("--muted-2"), lire("--panel")), `${id} · discret/panneau`).toBeGreaterThanOrEqual(3);
      expect(contraste(lire("--action-ink"), lire("--action")), `${id} · bouton plein`).toBeGreaterThanOrEqual(7);
      expect(contraste(lire("--accent-light"), lire("--panel")), `${id} · accent/panneau`).toBeGreaterThanOrEqual(4.5);
      expect(contraste("#ffffff", lire("--live")), `${id} · texte blanc sur le rouge du direct`).toBeGreaterThanOrEqual(4.5);
      expect(contraste(lire("--ink"), lire("--accent")), `${id} · encre sur l’accent`).toBeGreaterThanOrEqual(4.5);
    }
  });
});
