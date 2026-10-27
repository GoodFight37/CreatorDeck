import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import NIVEAUX_SFX from "@/data/sfx-niveaux.json";
import {
  SAMPLES,
  MUSIC_SCENE_GAIN,
  MUSIC_TRACKS,
  SFX_USUELS,
  clampVolume,
  tearPlan,
  getMusicTrackId,
  getMusicVolume,
  getSfxVolume,
  legendaryStingerPlan,
  perfectStingerPlan,
  tribunalEndStingerPlan,
  isMusicMuted,
  isMuted,
  packOpeningPlan,
  playSample,
  revealPlan,
  rewardPlan,
  sampleGain,
  sampleUrl,
  setMusicTrack,
  setMusicVolume,
  setMuted,
  setMusicMuted,
  setSfxVolume,
  setAudioBackground,
  type SampleName,
} from "@/lib/sfx";

/**
 * Sons synthétisés : le plan de notes est la seule partie testable (le reste
 * parle à Web Audio). Ces tests garantissent qu'aucun son ne peut être
 * inaudible, vide ou douloureux — et que la rareté s'entend.
 */
describe("plans de sons", () => {
  const all = [packOpeningPlan(), rewardPlan(), tearPlan(), legendaryStingerPlan(), perfectStingerPlan(), tribunalEndStingerPlan(), ...(["common", "uncommon", "rare", "epic", "legendary"] as const).map((r) => revealPlan(r))];

  it("garde les trois stingers courts et dans le niveau des autres sons", () => {
    for (const stinger of [legendaryStingerPlan(), perfectStingerPlan(), tribunalEndStingerPlan()]) {
      expect(stinger.length).toBeGreaterThan(0);
      expect(Math.max(...stinger.map((note) => note.at + note.duration))).toBeLessThanOrEqual(0.5);
      expect(stinger.every((note) => note.gain !== undefined && note.gain <= 0.04)).toBe(true);
    }
  });

  it("fait entendre une déchirure longue avec une descente de matière", () => {
    const tear = tearPlan();
    expect(Math.max(...tear.map((note) => note.at + note.duration))).toBeGreaterThanOrEqual(.45);
    expect(tear.every((note) => (note.endFreq ?? note.freq) < note.freq)).toBe(true);
  });

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

describe("mix de la musique", () => {
  it("garde la musique basse au démarrage, plus basse pendant un pack et absente au Tribunal", () => {
    expect(MUSIC_SCENE_GAIN.hub).toBe(0.08);
    expect(MUSIC_SCENE_GAIN.pack).toBe(0.04);
    expect(MUSIC_SCENE_GAIN.pack / MUSIC_SCENE_GAIN.hub).toBeCloseTo(0.5);
    expect(MUSIC_SCENE_GAIN.tribunal).toBe(0);
  });

  it("remonte uniquement les deux sons de manipulation des cartes", () => {
    expect(NIVEAUX_SFX.niveaux["card-draw"].cibleDb).toBe(-25);
    expect(NIVEAUX_SFX.niveaux["card-turn"].cibleDb).toBe(-28.6);
    expect(NIVEAUX_SFX.niveaux.click.cibleDb).toBe(-32);
  });

  it("démarre une boucle, applique les scènes et sépare les deux interrupteurs", async () => {
    const targetHistory: number[] = [];
    const rampHistory: Array<{ value: number; endTime: number }> = [];
    const decoded: AudioBuffer[] = [];
    const gainNodes: Array<{ gain: { value: number; setValueAtTime: (value: number) => void; linearRampToValueAtTime: (value: number, endTime: number) => void; cancelScheduledValues: () => void }; connect: () => void; disconnect: ReturnType<typeof vi.fn> }> = [];
    const sources: Array<{ loop: boolean; loopStart: number; loopEnd: number; buffer: AudioBuffer | null; start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn>; connect: () => void }> = [];
    const audioBuffer = {
      duration: 8,
      sampleRate: 10,
      length: 80,
      numberOfChannels: 1,
      getChannelData: () => Float32Array.from({ length: 80 }, (_, i) => i < 12 ? 0 : i > 68 ? 0.5 : 0.25),
    } as unknown as AudioBuffer;
    const fakeWindow = {
      localStorage: { getItem: () => null, setItem: () => {} },
      AudioContext: class {
        currentTime = 0;
        state = "running";
        destination = {};
        sampleRate = 24_000;
        resume = vi.fn(async () => {});
        decodeAudioData = vi.fn(async () => { decoded.push(audioBuffer); return audioBuffer; });
        createBuffer(_channels: number, length: number, sampleRate: number) {
          const channels = [new Float32Array(length)];
          return {
            duration: length / sampleRate,
            sampleRate,
            length,
            numberOfChannels: channels.length,
            getChannelData: (channel: number) => channels[channel],
          } as unknown as AudioBuffer;
        }
        createGain() {
          const gain = {
            value: 0,
            cancelScheduledValues: vi.fn(),
            setValueAtTime: (value: number) => { gain.value = value; },
            linearRampToValueAtTime: (value: number, endTime: number) => {
              gain.value = value;
              targetHistory.push(value);
              rampHistory.push({ value, endTime });
            },
          };
          const node = { gain, connect: () => {}, disconnect: vi.fn() };
          gainNodes.push(node);
          return node;
        }
        createBufferSource() {
          const source = { loop: false, loopStart: 0, loopEnd: 0, buffer: null as AudioBuffer | null, start: vi.fn(), stop: vi.fn(), disconnect: vi.fn(), connect: () => {} };
          sources.push(source);
          return source;
        }
        createOscillator() { throw new Error("not needed by BGM test"); }
      },
    };
    vi.stubGlobal("window", fakeWindow);
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) })));
    vi.resetModules();
    try {
      const audio = await import("@/lib/sfx");
      audio.preloadGameMusic();
      await vi.waitFor(() => expect(decoded).toHaveLength(1));
      expect(sources).toHaveLength(0);
      audio.startGameAudio("hub");
      await vi.waitFor(() => expect(sources).toHaveLength(1));

      expect(sources[0].loop).toBe(true);
      expect(sources[0].loopStart).toBeCloseTo(1.2);
      expect(sources[0].buffer).not.toBe(audioBuffer);
      expect(sources[0].start).toHaveBeenCalledOnce();
      expect(gainNodes[0].gain.value).toBeCloseTo(MUSIC_SCENE_GAIN.hub);
      expect(rampHistory[0]).toEqual({ value: MUSIC_SCENE_GAIN.hub, endTime: 1.4 });

      audio.setMusicScene("pack");
      expect(targetHistory.at(-1)).toBeCloseTo(MUSIC_SCENE_GAIN.pack);
      audio.setMusicScene("tribunal");
      expect(targetHistory.at(-1)).toBe(0);
      audio.setMusicScene("hub");
      expect(targetHistory.at(-1)).toBeCloseTo(MUSIC_SCENE_GAIN.hub);
      audio.setAudioBackground(true);
      expect(targetHistory.at(-1)).toBe(0);
      audio.setAudioBackground(false);
      expect(targetHistory.at(-1)).toBeCloseTo(MUSIC_SCENE_GAIN.hub);
      expect(sources).toHaveLength(1);
      audio.setMuted(true);
      expect(gainNodes[0].gain.value).toBeCloseTo(MUSIC_SCENE_GAIN.hub);
      audio.setMuted(false);
      audio.setMusicMuted(true);
      expect(sources[0].stop).not.toHaveBeenCalled();
      expect(gainNodes[0].gain.value).toBe(0);
      audio.setMusicMuted(false);
      expect(sources).toHaveLength(1);
      expect(sources[0].start).toHaveBeenCalledOnce();
      expect(gainNodes[0].gain.value).toBeCloseTo(MUSIC_SCENE_GAIN.hub);
      expect(rampHistory.at(-1)?.endTime).toBe(1.4);
      audio.setMusicScene("pack");
      audio.stopHubMusic();
      expect(sources[0].stop).toHaveBeenCalledOnce();
      audio.startGameAudio("pack");
      await vi.waitFor(() => expect(sources).toHaveLength(2));
      expect(sources[1].start).toHaveBeenCalledOnce();
      expect(sources[1].loop).toBe(true);
      expect(targetHistory.at(-1)).toBeCloseTo(MUSIC_SCENE_GAIN.pack);
      audio.stopHubMusic();
      audio.startGameAudio("hub");
      await vi.waitFor(() => expect(sources).toHaveLength(3));
      expect(sources.slice(1).every((source) => source.start.mock.calls.length === 1)).toBe(true);
      expect(targetHistory.at(-1)).toBeCloseTo(MUSIC_SCENE_GAIN.hub);
    } finally {
      vi.unstubAllGlobals();
      vi.resetModules();
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
    // Dix : les six qu'on entend (`card-draw`, `pop`, `chime`, `chip-place`,
    // `close`, `coins`) et les quatre gardés en réserve (`click`, `menu-open`,
    // `select`, `card-turn`). Les cinq de la simulation de streameur sont
    // partis le 9 octobre 2026. Le plancher existe pour qu'un dossier vidé ne
    // passe pas inaperçu — pas pour figer un nombre.
    expect(noms.length).toBeGreaterThanOrEqual(10);
    for (const nom of noms) {
      expect(() => entete(nom), `bruitage manquant : ${nom}`).not.toThrow();
      expect(sampleUrl(nom)).toBe(`/sfx/${SAMPLES[nom].file}`);
    }
  });

  it("embarque une boucle BGM compressée et lisible par le navigateur", () => {
    const fichier = path.join(process.cwd(), "public", "music", "hub-late-night.mp3");
    const audio = readFileSync(fichier);
    expect(audio.length).toBeGreaterThan(32_000);
    expect(audio.length).toBeLessThan(1_000_000);
    expect(audio.includes(Buffer.from([0xff, 0xfb])) || audio.includes(Buffer.from([0xff, 0xf3]))).toBe(true);
  });

  it("est un WAV lisible, court, et pas douloureux", () => {
    let total = 0;
    for (const nom of noms) {
      const t = entete(nom);
      expect(t.riff, `${nom} : pas un RIFF`).toBe("RIFF");
      expect(t.wave, `${nom} : pas un WAVE`).toBe("WAVE");
      // Mono ou stéréo : les packs ne sont pas homogènes (le « coins » du
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
    // Rien n'est préchargé pour un son que personne n'entend. La réserve, ce
    // sont les quatre sons de déplacement que le joueur a fait taire le
    // 8 octobre 2026 : la navigation et les réglages (`click`, `menu-open`),
    // puis le filtre du Binder (`select`). Le son de page est de nouveau joué
    // par le feuilletage. Les cinq
    // de la simulation de streameur (`card-fan`, `gather`, `equip`,
    // `power-up`, `fanfare`) ne sont plus là du tout : partis le 9 octobre 2026
    // avec leurs fichiers, le mode n'existe plus.
    for (const reserve of ["click", "menu-open", "select"] as const) {
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
    expect(() => playSample("select")).not.toThrow();
  });

  it("reste actif au premier lancement, tant qu'aucun choix n'est enregistré", async () => {
    const valeurs = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => valeurs.get(key) ?? null,
        setItem: (key: string, value: string) => void valeurs.set(key, value),
      },
    });
    vi.resetModules();
    const audioNeuf = await import("@/lib/sfx");
    expect(audioNeuf.isMuted()).toBe(false);
    expect(audioNeuf.isMusicMuted()).toBe(false);
    audioNeuf.setMuted(true);
    expect(audioNeuf.isMuted()).toBe(true);
    audioNeuf.setMuted(false);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    setMuted(false);
    setAudioBackground(false);
  });
});

describe("préférences audio indépendantes", () => {
  it("garde les bruitages et la musique dans deux préférences séparées", () => {
    setMuted(true);
    setMusicMuted(false);
    expect(isMuted()).toBe(true);
    expect(isMusicMuted()).toBe(false);
    setMuted(false);
    setMusicMuted(true);
    expect(isMuted()).toBe(false);
    expect(isMusicMuted()).toBe(true);
    setMusicMuted(false);
  });

  it("relit les deux choix au démarrage suivant", async () => {
    const memoire = new Map<string, string>([
      ["creatordeck.muted", "1"],
      ["creatordeck.music-muted", "1"],
    ]);
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (cle: string) => memoire.get(cle) ?? null,
        setItem: (cle: string, valeur: string) => void memoire.set(cle, valeur),
      },
    });
    vi.resetModules();
    try {
      const frais = await import("@/lib/sfx");
      expect(frais.isMuted()).toBe(true);
      expect(frais.isMusicMuted()).toBe(true);
      frais.setMuted(false);
      expect(memoire.get("creatordeck.muted")).toBe("0");
      expect(memoire.get("creatordeck.music-muted")).toBe("1");
    } finally {
      vi.unstubAllGlobals();
      vi.resetModules();
    }
  });

  it("préserve un ancien mute global pour ne pas rallumer le téléphone après mise à jour", async () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (cle: string) => cle === "creatordeck.muted" ? "1" : null,
        setItem: () => {},
      },
    });
    vi.resetModules();
    try {
      const frais = await import("@/lib/sfx");
      expect(frais.isMuted()).toBe(true);
      expect(frais.isMusicMuted()).toBe(true);
    } finally {
      vi.unstubAllGlobals();
      vi.resetModules();
    }
  });
});

describe("volumes séparés et pistes (laboratoire audio)", () => {
  it("borne les volumes entre 0 et 2, avec 1 par défaut", () => {
    expect(clampVolume(2.5)).toBe(2);
    expect(clampVolume(-1)).toBe(0);
    expect(clampVolume(Number.NaN)).toBe(1);
    expect(clampVolume(0.5)).toBe(0.5);
  });

  it("applique et relit les deux volumes indépendamment", () => {
    try {
      setMusicVolume(0.4);
      setSfxVolume(1.6);
      expect(getMusicVolume()).toBe(0.4);
      expect(getSfxVolume()).toBe(1.6);
      setMusicVolume(99);
      expect(getMusicVolume()).toBe(2);
    } finally {
      setMusicVolume(1);
      setSfxVolume(1);
    }
  });

  it("ne connaît qu'une piste tant qu'aucune autre n'est validée", () => {
    expect(MUSIC_TRACKS).toHaveLength(1);
    expect(MUSIC_TRACKS[0]).toMatchObject({ id: "hub-late-night", src: "/music/hub-late-night.mp3" });
    expect(getMusicTrackId()).toBe("hub-late-night");
    setMusicTrack("piste-inconnue");
    expect(getMusicTrackId()).toBe("hub-late-night");
  });
});
