import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  SAMPLES,
  isMuted,
  packOpeningPlan,
  playSample,
  revealPlan,
  rewardPlan,
  sampleUrl,
  setMuted,
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

  it("règle chaque bruitage dans la même échelle de volume", () => {
    for (const nom of noms) {
      const gain = SAMPLES[nom].gain;
      expect(gain, `${nom} : inaudible`).toBeGreaterThan(0.1);
      expect(gain, `${nom} : couvre tout`).toBeLessThanOrEqual(0.6);
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
