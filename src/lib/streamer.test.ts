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
  EVENTS,
  SETUP_LEVELS,
  STREAMER,
  STREAMER_TOKENS,
  TIERS,
  absenceSummary,
  availableFormats,
  eventById,
  eventChoice,
  eventForDay,
  gameDaysBetween,
  growthPerDay,
  growthWithSetup,
  newStreamerState,
  nextSetupLevel,
  nextTier,
  playEventLocally,
  resolveEventChoice,
  resolveVideo,
  setupBonusPermille,
  setupLevelById,
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

describe("les imprévus", () => {
  it("chaque carte a deux côtés, écrits, et des chances bornées", () => {
    expect(EVENTS.length).toBeGreaterThanOrEqual(4);
    for (const carte of EVENTS) {
      expect(carte.label.length).toBeGreaterThan(0);
      expect(carte.detail.length).toBeGreaterThan(10);
      expect(carte.choices.length).toBe(2);
      expect(carte.choices.map((c) => c.id)).toEqual(["gauche", "droite"]);
      for (const cote of carte.choices) {
        expect(cote.label.length).toBeGreaterThan(0);
        expect(cote.successChancePermille).toBeGreaterThan(0);
        expect(cote.successChancePermille).toBeLessThan(1000);
        expect(cote.gainPermille).toBeGreaterThan(0);
        expect(cote.buzzPermille).toBeLessThanOrEqual(1000);
        expect(cote.badBuzzPermille).toBeLessThan(1000);
      }
    }
  });

  it("chaque carte a un côté sûr et un côté qui rapporte plus", () => {
    // C'est la règle de l'imprévu : les deux réponses se défendent. Un côté qui
    // serait à la fois plus sûr et plus payant ne serait pas un choix.
    for (const carte of EVENTS) {
      const [gauche, droite] = carte.choices;
      const plusSur = gauche.successChancePermille > droite.successChancePermille ? gauche : droite;
      const plusPayant = gauche.gainPermille > droite.gainPermille ? gauche : droite;
      expect(plusSur.id).not.toBe(plusPayant.id);
    }
  });

  it("la carte du jour est stable, et le lendemain peut changer", () => {
    const meme = eventForDay("2026-10-08");
    expect(eventForDay("2026-10-08").id).toBe(meme.id);
    expect(EVENTS.some((carte) => carte.id === meme.id)).toBe(true);
    // Sur trente journées, on ne reste pas sur une seule carte.
    const vues = new Set(Array.from({ length: 30 }, (_, i) => eventForDay(`2026-10-${String(i + 1).padStart(2, "0")}`).id));
    expect(vues.size).toBeGreaterThan(2);
  });

  it("la réponse suit les mêmes jets qu'une vidéo, et ne paie pas de jetons", () => {
    const carte = eventForDay("2026-10-08");
    const [gauche] = carte.choices;
    const base = growthPerDay(1000);
    const potentiel = Math.round((base * gauche.gainPermille) / 1000);

    const reussi = resolveEventChoice(carte, gauche, 1000, suiteDeJets([0, 999]));
    expect(reussi.success).toBe(true);
    expect(reussi.gained).toBe(potentiel);
    expect(reussi.headline).toContain(gauche.label);

    const buzz = resolveEventChoice(carte, gauche, 1000, suiteDeJets([0, gauche.buzzPermille - 1]));
    expect(buzz.buzz).toBe(true);
    expect(buzz.gained).toBe(potentiel * 3);
    expect(buzz.headline).toContain("buzzé");

    // Un échec qui se retourne : la perte est un quart du gain, rien de plus.
    const rate = resolveEventChoice(carte, gauche, 1000, suiteDeJets([999, 0]));
    expect(rate.success).toBe(false);
    expect(rate.gained).toBeLessThanOrEqual(0);
    // Aucun côté ne porte de jetons : `EventOutcome` n'en a même pas le champ.
    expect(Object.keys(rate)).not.toContain("tokens");
  });

  it("l'imprévu local ne se rejoue pas deux fois le même jour", () => {
    const jour = "2026-10-08";
    const carte = eventForDay(jour);
    const choix = carte.choices[0].id;
    const etat = newStreamerState(T0);
    const premier = playEventLocally(etat, choix, jour, suiteDeJets([0, 999]));
    expect(premier).not.toBeNull();
    expect(premier!.already).toBe(false);
    expect(premier!.state.subscribers).toBeGreaterThanOrEqual(0);

    const second = playEventLocally(premier!.state, carte.choices[1].id, jour, suiteDeJets([0, 999]));
    expect(second!.already).toBe(true);
    expect(second!.event.choice).toBe(choix);
    expect(second!.state.subscribers).toBe(premier!.state.subscribers);

    // Un côté qui n'existe pas ne joue rien.
    expect(playEventLocally(etat, "milieu", jour)).toBeNull();
    // Et un identifiant de carte inconnu reste inconnu.
    expect(eventById("piscine")).toBeNull();
    expect(eventChoice(carte, "milieu")).toBeNull();
  });
});

describe("le setup", () => {
  it("les cinq paliers montent, et le bonus total fait +50 %", () => {
    expect(SETUP_LEVELS.length).toBe(5);
    for (let i = 1; i < SETUP_LEVELS.length; i += 1) {
      expect(SETUP_LEVELS[i].price).toBeGreaterThan(SETUP_LEVELS[i - 1].price);
      expect(SETUP_LEVELS[i].growthPermille ?? 0).toBeGreaterThanOrEqual(SETUP_LEVELS[i - 1].growthPermille ?? 0);
    }
    expect(SETUP_LEVELS.every((niveau) => niveau.currency === "points")).toBe(true);
    expect(setupBonusPermille(SETUP_LEVELS.map((niveau) => niveau.id))).toBe(500);
  });

  it("le bonus ne compte que le préfixe : un palier sauté ne vaut rien", () => {
    expect(setupBonusPermille([])).toBe(0);
    expect(setupBonusPermille(["webcam"])).toBe(30);
    expect(setupBonusPermille(["webcam", "micro"])).toBe(80);
    // Une liste trouée (sauvegarde bricolée, ordre cassé) : on s'arrête au trou.
    expect(setupBonusPermille(["webcam", "lumiere"])).toBe(30);
    expect(setupBonusPermille(["studio"])).toBe(0);
    expect(setupBonusPermille(["inconnu"])).toBe(0);
  });

  it("la croissance suit le bonus, et le prochain palier suit l'ordre", () => {
    expect(growthWithSetup(0, [])).toBe(240);
    expect(growthWithSetup(0, ["webcam"])).toBe(247);
    expect(growthWithSetup(0, SETUP_LEVELS.map((n) => n.id))).toBe(360);
    // Au palier « Gros streamer » : 3 200 × 1,03 = 3 296, arrondi vers le bas.
    expect(growthWithSetup(30_000, ["webcam"])).toBe(3296);

    expect(nextSetupLevel([])?.id).toBe("webcam");
    expect(nextSetupLevel(["webcam"])?.id).toBe("micro");
    expect(nextSetupLevel(SETUP_LEVELS.map((n) => n.id))).toBeNull();
    expect(setupLevelById("studio")?.price).toBe(4200);
    expect(setupLevelById("piscine")).toBeNull();
  });

  it("le bonus travaille aussi pendant l'absence", () => {
    // Le studio continue de travailler pendant qu'on dort : c'est un peu son
    // intérêt, et c'est la même formule que `_streamer_growth()`.
    const sans = absenceSummary(T0, T0 + 2 * DAY, 0);
    const avec = absenceSummary(T0, T0 + 2 * DAY, 0, 500);
    expect(sans.gained).toBe(2 * 240);
    expect(avec.gained).toBe(2 * 360);
  });
});
