import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import NIVEAUX_SFX from "@/data/sfx-niveaux.json";
import {
  SAMPLES,
  SFX_LEVELS,
  SFX_LEVEL_LABELS,
  SFX_USUELS,
  getSfxLevel,
  isMuted,
  packOpeningPlan,
  playSample,
  revealPlan,
  rewardPlan,
  sampleGain,
  sampleUrl,
  setMuted,
  setSfxLevel,
  type SfxLevel,
  type SampleName,
} from "@/lib/sfx";

/**
 * Sons synthétisés : le plan de notes est la seule partie testable (le reste
 * parle à Web Audio). Ces tests garantissent qu'aucun son ne peut être
 * inaudible, vide ou douloureux — et que la rareté s'entend.
 */
describe("plans de sons", () => {
  const all = [packOpeningPlan(), rewardPlan(), ...(["common", "uncommon", "rare", "epic", "legendary"] as const).map((r) => revealPlan(r))];

  it("reste dans le spectre audible, avec des durées plausibles", () => {
    for (const plan of all) {
      expect(plan.length).toBeGreaterThan(0);
      for (const note of plan) {
        expect(note.freq).toBeGreaterThanOrEqual(20);
        expect(note.freq).toBeLessThanOrEqual(20000);
        expect(note.at).toBeGreaterThanOrEqual(0);
        expect(note.duration).toBeGreaterThan(0);
        expect(note.gain ?? 0).toBeGreaterThan(0);
        expect(note.gain ?? 0).toBeLessThan(0.2);
      }
    }
  });

  it("commence au premier instant du son", () => {
    for (const plan of all) {
      expect(Math.min(...plan.map((note) => note.at))).toBe(0);
    }
  });

  it("fait entendre la rareté : plus la carte est rare, plus le son est riche", () => {
    const counts = (["common", "uncommon", "rare", "epic", "legendary"] as const).map(
      (rarity) => revealPlan(rarity).length,
    );
    expect(counts).toEqual([...counts].sort((a, b) => a - b));
    expect(counts.at(-1)).toBeGreaterThan(counts[0]);
    // Une légendaire sonne plus longtemps qu'une commune : c'est le moment du jeu.
    expect(revealPlan("legendary")[0].duration).toBeGreaterThan(revealPlan("common")[0].duration);
  });

  it("ajoute une note aux variantes spéciales", () => {
    const standard = revealPlan("rare", "standard");
    for (const variant of ["live", "holo", "gold"] as const) {
      const withVariant = revealPlan("rare", variant);
      expect(withVariant.length).toBe(standard.length + 1);
      expect(withVariant.at(-1)?.freq).toBeGreaterThan(standard.at(-1)?.freq ?? 0);
    }
  });
});

/**
 * Les bruitages embarqués : le catalogue du code contre les fichiers du disque,
 * et l'interrupteur du joueur par-dessus. Un son demandé par le code mais
 * absent du dossier, c'est un geste muet que personne ne remarque en jouant —
 * donc c'est un test.
 */
describe("les bruitages embarqués", () => {
  const noms = Object.keys(SAMPLES) as SampleName[];

  /** L'en-tête d'un WAV : RIFF/WAVE, PCM 16 bits stéréo 44,1 kHz. */
  function entete(nom: SampleName) {
    const fichier = path.join(process.cwd(), "public", "sfx", SAMPLES[nom].file);
    const buf = readFileSync(fichier);
    const texte = (a: number, b: number) => buf.toString("latin1", a, b);
    return {
      taille: statSync(fichier).size,
      riff: texte(0, 4),
      wave: texte(8, 12),
      canaux: buf.readUInt16LE(22),
      taux: buf.readUInt32LE(24),
      bits: buf.readUInt16LE(34),
      donnees: buf.readUInt32LE(40),
    };
  }

  it("existe dans le dossier pour chaque nom du catalogue", () => {
    expect(noms.length).toBeGreaterThanOrEqual(12);
    for (const nom of noms) {
      expect(() => entete(nom), `bruitage manquant : ${nom}`).not.toThrow();
      expect(sampleUrl(nom)).toBe(`/sfx/${SAMPLES[nom].file}`);
    }
  });

  it("est un WAV lisible, court, et pas douloureux", () => {
    let total = 0;
    for (const nom of noms) {
      const t = entete(nom);
      expect(t.riff, `${nom} : pas un RIFF`).toBe("RIFF");
      expect(t.wave, `${nom} : pas un WAVE`).toBe("WAVE");
      // Mono ou stéréo : les packs ne sont pas homogènes (le « power-up » du
      // pack Retro est mono), et Web Audio s'en fiche. Ce qui compte, c'est
      // que le fichier soit lisible et borné.
      expect([1, 2], `${nom} : canaux inattendus`).toContain(t.canaux);
      expect(t.taux, `${nom} : pas 44,1 kHz`).toBe(44_100);
      expect(t.bits, `${nom} : pas 16 bits`).toBe(16);
      // Un bruitage de geste dure moins de deux secondes : au-delà, ce n'est
      // plus un bruitage, c'est de la musique qu'on n'a pas demandée.
      const duree = t.donnees / (t.canaux * t.taux * (t.bits / 8));
      expect(duree, `${nom} : trop court pour être entendu`).toBeGreaterThan(0.05);
      expect(duree, `${nom} : trop long pour un geste`).toBeLessThan(2.5);
      total += t.taille;
    }
    // Le budget : ces fichiers partent dans l'APK. On a choisi une **sélection**
    // dans les packs, pas les packs entiers — ce test garde la main dessus.
    expect(total / (1024 * 1024), "la sélection de bruitages grossit").toBeLessThan(3);
  });

  /**
   * La table des niveaux est **la mesure des fichiers** : on la relit ici, sur
   * le disque, et pas dans une copie. C'est ce qui rend le contrat solide —
   * remplacer un .wav par un autre niveau ne casse pas le jeu, ça casse le test,
   * et celui qui l'a remplacé sait quoi relancer (`npm run sfx:niveaux`).
   */
  const table = NIVEAUX_SFX.niveaux as Record<
    string,
    { rmsDb: number; creteDb: number; cibleDb: number }
  >;

  /** Le niveau réel d'un fichier : RMS et crête, en dBFS. */
  function mesurer(nom: SampleName) {
    const buf = readFileSync(path.join(process.cwd(), "public", "sfx", SAMPLES[nom].file));
    const debut = 44; // en-tête RIFF/WAVE canonique
    const octets = buf.readUInt32LE(40);
    const echantillons = Math.floor(Math.min(octets, buf.length - debut) / 2);
    let somme = 0;
    let crete = 0;
    for (let i = 0; i < echantillons; i += 1) {
      const valeur = buf.readInt16LE(debut + i * 2) / 32768;
      somme += valeur * valeur;
      crete = Math.max(crete, Math.abs(valeur));
    }
    const rms = Math.sqrt(somme / Math.max(1, echantillons));
    return {
      rmsDb: 20 * Math.log10(Math.max(rms, 1e-6)),
      creteDb: 20 * Math.log10(Math.max(crete, 1e-6)),
    };
  }

  it("ne garde aucun fichier orphelin dans le dossier", () => {
    // Un .wav posé là mais absent du catalogue ne serait jamais joué — et il
    // partirait quand même dans l'APK.
    const fichiers = readdirSync(path.join(process.cwd(), "public", "sfx"))
      .filter((f) => f.endsWith(".wav"))
      .sort();
    expect(fichiers).toEqual(noms.map((nom) => SAMPLES[nom].file).sort());
  });

  it("mesure les fichiers comme la table le dit", () => {
    for (const nom of noms) {
      const mesure = mesurer(nom);
      expect(table[nom], `absent de la table des niveaux : ${nom}`).toBeTruthy();
      expect(Math.abs(table[nom].rmsDb - mesure.rmsDb), `${nom} : RMS mesuré ≠ table`).toBeLessThan(
        0.5,
      );
      expect(
        Math.abs(table[nom].creteDb - mesure.creteDb),
        `${nom} : crête mesurée ≠ table`,
      ).toBeLessThan(0.5);
    }
  });

  it("amène chaque bruitage à son niveau, sans jamais claquer", () => {
    // Le cœur du réglage : joué, chaque bruitage tombe sur sa cible (à un
    // demi-décibel près), et **aucun** ne dépasse la crête de sécurité. C'est
    // exactement ce qui manquait quand le papier d'une carte sortait neuf
    // décibels au-dessus d'un clic.
    for (const nom of noms) {
      const mesure = mesurer(nom);
      const gain = SAMPLES[nom].gain;
      const sortieRms = mesure.rmsDb + 20 * Math.log10(gain);
      const sortieCrete = mesure.creteDb + 20 * Math.log10(gain);
      expect(sortieRms, `${nom} : plus fort que sa cible`).toBeLessThanOrEqual(
        table[nom].cibleDb + 0.5,
      );
      expect(sortieRms, `${nom} : à peine audible`).toBeGreaterThan(table[nom].cibleDb - 2.5);
      expect(sortieCrete, `${nom} : crête au-delà du plafond`).toBeLessThanOrEqual(
        NIVEAUX_SFX.creteMaxDb + 0.5,
      );
    }
  });

  it("fait du clic le bruitage le plus discret, et des récompenses les plus présentes", () => {
    // La règle de game design, écrite noir sur blanc : ce qu'on entend cent fois
    // est le plus effacé, ce qui se gagne le plus rarement a le droit de
    // s'entendre. Six décibels d'écart — assez pour se distinguer, pas assez
    // pour sursauter.
    const cibles = noms.map((nom) => table[nom].cibleDb);
    expect(table.click.cibleDb).toBe(Math.min(...cibles));
    for (const fete of ["coins", "chime"] as const) {
      expect(table[fete].cibleDb).toBeGreaterThanOrEqual(table.click.cibleDb + 4);
    }
  });

  it("calcule le gain du catalogue, et le laisse dans des bornes saines", () => {
    for (const nom of noms) {
      expect(SAMPLES[nom].gain, `${nom} : gain écrit à la main`).toBeCloseTo(sampleGain(nom), 5);
      expect(SAMPLES[nom].gain, `${nom} : inaudible`).toBeGreaterThan(0.03);
      // On n'amplifie pas un bruitage sans borne : le plafond du catalogue.
      expect(SAMPLES[nom].gain, `${nom} : amplifié sans mesure`).toBeLessThanOrEqual(
        NIVEAUX_SFX.gainMax,
      );
    }
    // Un nom inconnu ne doit pas jeter : le son est un confort, pas une règle.
    expect(sampleGain("inconnu" as SampleName)).toBeGreaterThan(0);
  });

  it("précharge ce qu'on entend tout le temps, et rien de plus", () => {
    for (const nom of SFX_USUELS) expect(noms).toContain(nom);
    // Rien n'est préchargé pour un son que personne n'entend. La liste des
    // « en réserve » a deux origines : les déplacements (`click`, `menu-open` —
    // la navigation et les réglages sont muets depuis le 8 octobre 2026) et la
    // simulation de streameur, retirée le même jour.
    for (const reserve of [
      "click",
      "menu-open",
      "equip",
      "power-up",
      "fanfare",
      "gather",
      "card-fan",
    ] as const) {
      expect(noms, `${reserve} doit rester au catalogue`).toContain(reserve);
      expect(SFX_USUELS, `${reserve} n'a rien à faire au préchargement`).not.toContain(reserve);
    }
  });

  it("se tait quand le joueur coupe le son, et ne jette jamais", () => {
    // jsdom et node n'ont pas de Web Audio : c'est exactement le cas « API
    // absente », et rien ne doit lever — le geste continue sans son.
    setMuted(true);
    expect(isMuted()).toBe(true);
    expect(() => playSample("click")).not.toThrow();
    setMuted(false);
    expect(isMuted()).toBe(false);
    expect(() => playSample("equip")).not.toThrow();
  });

  afterEach(() => setMuted(false));
});

/**
 * Le volume d'ensemble : trois crans, mémorisés, et **un seul nœud de sortie**
 * par lequel passe tout le son de l'application. Ce que ces tests tiennent :
 * l'ordre des crans, et le fait que le choix se retrouve au démarrage suivant.
 */
describe("le volume du jeu", () => {
  it("propose trois crans, du plus discret au plus fort", () => {
    expect(SFX_LEVELS).toEqual(["discret", "normal", "fort"]);
    for (const cran of SFX_LEVELS) {
      expect(SFX_LEVEL_LABELS[cran], `${cran} sans étiquette`).toBeTruthy();
    }
  });

  it("change de cran à la demande", () => {
    const avant = getSfxLevel();
    setSfxLevel("discret");
    expect(getSfxLevel()).toBe("discret");
    setSfxLevel("fort");
    expect(getSfxLevel()).toBe("fort");
    setSfxLevel(avant);
    expect(getSfxLevel()).toBe(avant);
  });

  it("relit le cran gardé au démarrage suivant", async () => {
    // Le module lit ses préférences **une fois** : on repart donc d'un module
    // neuf, avec un `localStorage` qui contient déjà un choix.
    const memoire = new Map<string, string>([["creatordeck.sfx-level", "discret"]]);
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (cle: string) => memoire.get(cle) ?? null,
        setItem: (cle: string, valeur: string) => void memoire.set(cle, valeur),
      },
    });
    vi.resetModules();
    try {
      const frais = (await import("@/lib/sfx")) as typeof import("@/lib/sfx");
      expect(frais.getSfxLevel()).toBe("discret");
      frais.setSfxLevel("fort" as SfxLevel);
      expect(memoire.get("creatordeck.sfx-level")).toBe("fort");
    } finally {
      vi.unstubAllGlobals();
      vi.resetModules();
    }
  });

  it("retombe sur « normal » si la mémoire contient autre chose", async () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => "hurle",
        setItem: () => {},
      },
    });
    vi.resetModules();
    try {
      const frais = (await import("@/lib/sfx")) as typeof import("@/lib/sfx");
      expect(frais.getSfxLevel()).toBe("normal");
    } finally {
      vi.unstubAllGlobals();
      vi.resetModules();
    }
  });
});
