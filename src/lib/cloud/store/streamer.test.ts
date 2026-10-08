/**
 * Le relevé de la chaîne, relu en cours de session : ce qui appartient au
 * **premier** relevé, et ce qui appartient au dernier.
 *
 * Le défaut que ce test empêche : ouvrir le Studio (« bon retour, 4 journées »),
 * puis acheter un palier. Le second relevé ne paie plus rien — le moteur a déjà
 * versé le retour — et si on prenait sa réponse telle quelle, l'écran afficherait
 * « 0 journée » juste après avoir annoncé la paie, et le joueur croirait l'avoir
 * perdue.
 */
import { describe, expect, it } from "vitest";

import { releveApres, type StreamerOpening } from "@/lib/cloud/store/streamer";

function ouverture(surcharge: Partial<Extract<StreamerOpening, { status: "done" }>> = {}) {
  return {
    status: "done" as const,
    source: "local" as const,
    days: 4,
    countedDays: 3,
    gained: 960,
    subscribers: 960,
    lines: ["Tu reviens après 3 journées."],
    day: "2026-10-08",
    publishedToday: false,
    tokensToday: 0,
    tokensCap: 40,
    event: null,
    setup: [] as string[],
    setupBonus: 0,
    guests: [],
    raidToday: 0,
    collabPermille: 0,
    collabLive: false,
    ...surcharge,
  };
}

/** Le relevé fusionné, quand c'est bien un « done » : la fusion n'en fabrique pas. */
function fusionDone(premier: StreamerOpening | null, second: StreamerOpening) {
  const fusion = releveApres(premier, second);
  if (fusion.status !== "done") throw new Error("la fusion a rendu un refus");
  return fusion;
}

describe("releveApres", () => {
  it("rend le relevé tel quel quand il n'y a rien avant", () => {
    const nouveau = ouverture({ setup: ["webcam"] });
    expect(releveApres(null, nouveau)).toBe(nouveau);
  });

  it("garde le récit du retour, et prend le reste du relevé frais", () => {
    const premier = ouverture();
    const second = ouverture({
      days: 0,
      countedDays: 0,
      gained: 0,
      lines: [],
      subscribers: 1_207,
      setup: ["webcam"],
      setupBonus: 30,
      tokensToday: 6,
    });

    const fusion = fusionDone(premier, second);
    // Ce que le second relevé apporte : la pièce, les chiffres du jour.
    expect(fusion).toMatchObject({
      subscribers: 1_207,
      setup: ["webcam"],
      setupBonus: 30,
      tokensToday: 6,
      source: "local",
    });
    // Ce que le premier garde : le retour du joueur, payé une seule fois.
    expect(fusion).toMatchObject({ days: 4, countedDays: 3, gained: 960 });
    expect(fusion.lines).toEqual(["Tu reviens après 3 journées."]);
  });

  it("ajoute à la suite les lignes que le second apporte en plus", () => {
    // Un raid relevé entre-temps écrit sa ligne : elle vient après le récit du
    // retour, jamais à la place.
    const premier = ouverture({ lines: ["Tu reviens après 3 journées."] });
    const second = ouverture({
      lines: ["Tu reviens après 3 journées.", "Ibai est passé : +240 abonnés."],
    });
    expect(fusionDone(premier, second).lines).toEqual([
      "Tu reviens après 3 journées.",
      "Ibai est passé : +240 abonnés.",
    ]);
  });

  it("ne garde rien d'un relevé refusé", () => {
    // Hors ligne ou sans compte : le refus est la réponse, et l'écran doit la
    // lire telle quelle.
    const premier = ouverture();
    expect(releveApres(premier, { status: "refused", message: "Rien à lire." })).toEqual({
      status: "refused",
      message: "Rien à lire.",
    });
  });
});
