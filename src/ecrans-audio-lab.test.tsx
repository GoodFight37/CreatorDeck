import { act } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AudioLab } from "@/app/audio-lab/audio-lab";
import { creerBanc, type Banc } from "@/ecrans-banc";
import { getMusicVolume, getSfxVolume, setMusicVolume, setSfxVolume } from "@/lib/sfx";

/**
 * Le laboratoire audio est un outil de développement : il doit présenter les
 * quatre options musicales (dont le silence), les variantes de bruitages,
 * et écrire les préférences du moteur — jamais un réglage propre au labo.
 */
describe("laboratoire audio (développement)", () => {
  let banc: Banc;
  beforeEach(() => {
    banc = creerBanc();
    banc.preparer();
    setMusicVolume(1);
    setSfxVolume(1);
  });
  afterEach(() => banc.nettoyer());

  it("présente les trois directions, la piste actuelle et le silence", async () => {
    await banc.monter(<AudioLab />);
    const html = banc.ecran("audio-lab");
    expect(html).toContain("Laboratoire audio");
    expect(html).toContain("Douce et mélodique");
    expect(html).toContain("Chaleureuse et accueillante");
    expect(html).toContain("Minimaliste, très discrète");
    expect(html).toContain("Sans musique");
    expect(html).toContain("Late Night (actuelle)");
    // Sans fichiers générés, les candidats sont annoncés, pas jouables.
    expect(html).toContain("à générer");
  });

  it("écrit les volumes dans les préférences du moteur, séparément", async () => {
    await banc.monter(<AudioLab />);
    const curseurs = [...document.querySelectorAll<HTMLInputElement>('input[type="range"]')];
    expect(curseurs).toHaveLength(2);
    const [musique, effets] = curseurs;
    const setterNatif = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    for (const [curseur, valeur] of [[musique, "0.5"], [effets, "1.5"]] as const) {
      await act(async () => {
        setterNatif.call(curseur, valeur);
        curseur.dispatchEvent(new Event("input", { bubbles: true }));
      });
    }
    expect(getMusicVolume()).toBe(0.5);
    expect(getSfxVolume()).toBe(1.5);
  });

  it("conserve la direction choisie pour les prochaines visites", async () => {
    await banc.monter(<AudioLab />);
    const radios = [...document.querySelectorAll<HTMLInputElement>('input[name="direction"]')];
    // Ordre : actuelle, douce, chaude, minimale, silence.
    expect(radios).toHaveLength(5);
    await act(async () => radios[4].click());
    const sauvegarde = JSON.parse(window.localStorage.getItem("creatordeck.audio-lab.v1") ?? "{}") as { direction?: string };
    expect(sauvegarde.direction).toBe("silence");
  });

  it("expose les vraies animations sonores du jeu", async () => {
    await banc.monter(<AudioLab />);
    const html = banc.ecran("audio-lab-jeu");
    for (const libelle of ["Déchirure", "Ouverture du pack", "Légendaire", "Grâce", "Marteau", "Scène pack (plus basse)"]) {
      expect(html).toContain(libelle);
    }
  });
});
