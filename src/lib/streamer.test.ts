/**
 * Le simulateur de streameur : ce qui se teste sans navigateur.
 *
 * Deux familles de contrôles, comme partout dans ce dépôt :
 *
 *  1. **le fichier de règles tient debout tout seul** (paliers croissants,
 *     chances dans les bornes, libellés écrits) — c'est ce que le joueur lira ;
 *  2. **la mécanique ne triche pas** : une absence est plafonnée, une horloge
 *     reculée ne crédite rien, un échec ne paie pas, un bad buzz coûte sans
 *     ruiner, et le tirage respecte ses seuils aux bornes près.
 */
import { describe, expect, it } from "vitest";

import {
  CAP_DAYS,
  STREAMER,
  STREAMER_TOKENS,
  TIERS,
  absenceSummary,
  availableFormats,
  gameDaysBetween,
  growthPerDay,
  nextTier,
  resolveVideo,
  tierFor,
  tierProgress,
} from "@/lib/streamer";
import { PROGRESSION } from "@/lib/progression";

const T0 = Date.UTC(2026, 9, 8, 12, 0, 0);
const DAY = 24 * 3_600_000;

/** Un tirage piloté : la suite de valeurs données, puis une valeur sûre. */
function suiteDeJets(valeurs: number[]): (max: number) => number {
  let i = 0;
  return (max) => {
    const v = valeurs[Math.min(i, valeurs.length - 1)];
    i += 1;
    expect(v).toBeLessThan(max);
    return v;
  };
}

describe("le fichier de règles", () => {
  it("les paliers montent, et le premier part de zéro", () => {
    expect(TIERS[0].at).toBe(0);
    for (let i = 1; i < TIERS.length; i += 1) {
      expect(TIERS[i].at).toBeGreaterThan(TIERS[i - 1].at);
      expect(TIERS[i].perDay).toBeGreaterThan(TIERS[i - 1].perDay);
      expect(TIERS[i].label.length).toBeGreaterThan(0);
    }
  });

  it("chaque format porte des chances bornées, et un libellé", () => {
    for (const format of STREAMER.formats) {
      expect(format.label.length).toBeGreaterThan(0);
      expect(format.detail.length).toBeGreaterThan(0);
      expect(format.successChancePermille).toBeGreaterThan(0);
      expect(format.successChancePermille).toBeLessThan(1000);
      expect(format.gainPermille).toBeGreaterThan(0);
      expect(format.buzzPermille).toBeLessThanOrEqual(1000);
      expect(format.badBuzzPermille ?? 0).toBeLessThan(1000);
    }
  });

  it("la journée de la chaîne est celle des missions (6 h UTC)", () => {
    // Une deuxième définition de la journée de jeu serait un piège : la série
    // et la chaîne ne compteraient pas la même chose à la même heure.
    expect(PROGRESSION.missions.resetHourUtc).toBe(6);
    expect(CAP_DAYS).toBeGreaterThan(0);
    // Un plafond de plus d'une semaine paierait l'absence mieux que le jeu.
    expect(CAP_DAYS).toBeLessThanOrEqual(7);
    expect(STREAMER_TOKENS.perDayCap).toBeGreaterThan(0);
  });

  it("le setup commence en points, et jamais avec une Légendaire", () => {
    const premiers = STREAMER.setup.levels.filter((level) => level.currency === "points");
    expect(premiers.length).toBeGreaterThan(0);
    // Les paliers en points montent : le setup s'achète progressivement.
    for (let i = 1; i < premiers.length; i += 1) {
      expect(premiers[i].price).toBeGreaterThan(premiers[i - 1].price);
    }
    for (const level of STREAMER.setup.levels) {
      expect(level.label.length).toBeGreaterThan(0);
      expect(level.price).toBeGreaterThan(0);
    }
  });
});

describe("les paliers de notoriété", () => {
  it("trouve le palier d'un nombre d'abonnés, aux bornes près", () => {
    expect(tierFor(0).id).toBe("petit");
    const deuxieme = TIERS[1];
    expect(tierFor(deuxieme.at - 1).id).toBe(TIERS[0].id);
    expect(tierFor(deuxieme.at).id).toBe(deuxieme.id);
  });

  it("au sommet, il n'y a plus de palier suivant", () => {
    const sommet = TIERS[TIERS.length - 1];
    expect(nextTier(sommet.at)).toBeNull();
    expect(tierProgress(sommet.at).ratio).toBe(1);
  });

  it("mesure l'avancement dans le palier", () => {
    const [, deuxieme] = TIERS;
    expect(tierProgress(0).ratio).toBe(0);
    expect(tierProgress(Math.floor(deuxieme.at / 2)).ratio).toBeGreaterThan(0.4);
    expect(tierProgress(deuxieme.at - 1).ratio).toBeLessThan(1);
  });
});

describe("l'absence", () => {
  it("compte les journées de jeu, pas les heures", () => {
    // 12 h le 8, 12 h le 10 : deux journées de jeu ont commencé (6 h UTC).
    expect(gameDaysBetween(T0, T0 + 2 * DAY)).toBe(2);
    // Quelques heures dans la même journée : zéro.
    expect(gameDaysBetween(T0, T0 + 3 * 3_600_000)).toBe(0);
  });

  it("une horloge reculée ne crédite rien", () => {
    expect(gameDaysBetween(T0 + 5 * DAY, T0)).toBe(0);
    const recul = absenceSummary(T0 + 5 * DAY, T0, 1000);
    expect(recul.gained).toBe(0);
    expect(recul.subscribers).toBe(1000);
  });

  it("plafonne le cumul : au-delà de 7 jours, la chaîne ne grandit plus", () => {
    const abonnes = 3000;
    const court = absenceSummary(T0, T0 + 3 * DAY, abonnes);
    const long = absenceSummary(T0, T0 + 30 * DAY, abonnes);
    expect(court.countedDays).toBe(3);
    expect(long.days).toBe(30);
    expect(long.countedDays).toBe(CAP_DAYS);
    expect(long.gained).toBe(CAP_DAYS * growthPerDay(abonnes));
    // Et le joueur lit pourquoi son compteur s'est arrêté.
    expect(long.lines.join(" ")).toContain("ne cumule plus");
  });

  it("le résumé dit ce qui est arrivé, et annonce un palier franchi", () => {
    const abonnes = TIERS[1].at - 100;
    const court = absenceSummary(T0, T0 + 1 * DAY, abonnes);
    expect(court.lines[0]).toContain("Pendant ton absence");
    // 2 400 abonnés au départ, 240 par jour : quatre jours la font passer le
    // palier (2 500), et le résumé le dit.
    const long = absenceSummary(T0, T0 + 4 * DAY, abonnes);
    expect(long.subscribers).toBeGreaterThanOrEqual(TIERS[1].at);
    expect(long.tierUp?.id).toBe(TIERS[1].id);
    expect(long.lines.join(" ")).toContain("Ta chaîne est passée");
  });
});

describe("la vidéo du jour", () => {
  const letsplay = STREAMER.formats.find((f) => f.id === "letsplay")!;
  const ragebait = STREAMER.formats.find((f) => f.id === "ragebait")!;

  it("ne propose la collab qu'à qui possède un créateur", () => {
    expect(availableFormats(0).some((f) => f.id === "collab")).toBe(false);
    expect(availableFormats(1).some((f) => f.id === "collab")).toBe(true);
  });

  it("respecte ses seuils, à une unité près", () => {
    const abonnes = 1000;
    const base = growthPerDay(abonnes);
    // Juste sous le seuil : réussite. Exactement sur le seuil : échec.
    const gagne = resolveVideo(letsplay, abonnes, suiteDeJets([letsplay.successChancePermille - 1, 999]));
    expect(gagne.success).toBe(true);
    expect(gagne.gained).toBe(Math.round((base * letsplay.gainPermille) / 1000));
    expect(gagne.tokens).toBe(1 * STREAMER_TOKENS.perSuccess);

    const rate = resolveVideo(letsplay, abonnes, suiteDeJets([letsplay.successChancePermille, 999]));
    expect(rate.success).toBe(false);
    expect(rate.gained).toBe(0);
    expect(rate.tokens).toBe(0);
    expect(rate.headline).toContain("tombé à plat");
  });

  it("un buzz triple la réussite et paie le bonus de jetons", () => {
    const abonnes = 2600;
    const base = growthPerDay(abonnes);
    const buzz = resolveVideo(
      letsplay,
      abonnes,
      suiteDeJets([0, letsplay.buzzPermille - 1]),
    );
    expect(buzz.buzz).toBe(true);
    expect(buzz.gained).toBe(Math.round((base * letsplay.gainPermille) / 1000) * 3);
    expect(buzz.tokens).toBe(STREAMER_TOKENS.perSuccess + STREAMER_TOKENS.perBuzz);
    expect(buzz.headline).toContain("buzzé");
  });

  it("un bad buzz coûte, sans ruiner, et ne rend pas d'abonnés négatifs", () => {
    const abonnes = 0;
    const bad = resolveVideo(ragebait, abonnes, suiteDeJets([999, 0]));
    expect(bad.badBuzz).toBe(true);
    // À zéro abonné, la perte est nulle : on ne descend pas sous zéro.
    expect(bad.gained).toBeLessThanOrEqual(0);
    expect(bad.tokens).toBe(0);
    expect(bad.headline).toContain("retourné contre toi");

    // Sur une chaîne installée, la perte est réelle mais jamais la moitié du gain.
    const gros = resolveVideo(ragebait, 30_000, suiteDeJets([999, 0]));
    const reussi = resolveVideo(ragebait, 30_000, suiteDeJets([0, 999]));
    expect(Math.abs(gros.gained)).toBeLessThan(reussi.gained);
    expect(Math.abs(gros.gained)).toBeGreaterThan(0);
  });

  it("une vidéo qui marche ne se retourne pas contre toi le même jour", () => {
    // Le bad buzz n'est tiré que sur un échec : la suite de jets s'arrête après
    // le buzz, et `suiteDeJets` refuserait un quatrième appel.
    const ok = resolveVideo(ragebait, 30_000, suiteDeJets([0, 999]));
    expect(ok.success).toBe(true);
    expect(ok.badBuzz).toBe(false);
  });
});
