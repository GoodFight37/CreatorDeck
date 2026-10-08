/**
 * Le gyroscope des cartes : ce qui est vérifiable sans téléphone.
 *
 * Le capteur lui-même ne se simule pas — ce qu'on contrôle, c'est **ce qu'on en
 * fait** : un calcul qui reste dans un cadre, un appareil silencieux qui
 * n'invente rien, un seul écouteur pour tout le jeu, et un reflet qui ne se bat
 * pas avec le doigt.
 *
 * Comme `game-store.test.ts`, la fenêtre est **factice** : l'environnement de
 * test du dépôt est Node, pas un navigateur, et `tilt.ts` est un module à état
 * partagé — chaque test le ré-importe donc à neuf (`vi.resetModules`) au-dessus
 * d'un faux appareil qui compte les abonnements au capteur.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Lecture = { beta: number; gamma: number };
type Ecouteur = (position: { px: number; py: number } | null) => void;

function fakeDevice() {
  const donnees = new Map<string, string>();
  const capteurs: ((event: Lecture) => void)[] = [];
  const minuteries: (() => void)[] = [];
  let ajouts = 0;
  let retraits = 0;

  const win = {
    localStorage: {
      getItem: (cle: string) => donnees.get(cle) ?? null,
      setItem: (cle: string, valeur: string) => void donnees.set(cle, valeur),
      removeItem: (cle: string) => void donnees.delete(cle),
    },
    DeviceOrientationEvent: function DeviceOrientationEvent() {},
    addEventListener: (type: string, listener: (event: Lecture) => void) => {
      if (type !== "deviceorientation") return;
      ajouts += 1;
      capteurs.push(listener);
    },
    removeEventListener: (type: string) => {
      if (type === "deviceorientation") retraits += 1;
    },
    // Les minuteries sont capturées, jamais exécutées : c'est le test qui décide
    // quand le capteur est déclaré muet (sinon le résultat dépendrait du temps).
    setTimeout: (fn: () => void) => {
      minuteries.push(fn);
      return minuteries.length;
    },
    clearTimeout: () => {},
  };

  return {
    win,
    donnees,
    capteurs,
    minuteries,
    get ajouts() {
      return ajouts;
    },
    get retraits() {
      return retraits;
    },
    /** Fait parler le capteur (le dernier abonné posé sur la fenêtre). */
    bouger(lecture: Lecture) {
      capteurs[capteurs.length - 1](lecture);
    },
    /** L'appareil n'a rien dit du tout : la minuterie de silence se déclenche. */
    silence() {
      for (const fn of minuteries) fn();
    },
  };
}

async function freshTilt() {
  vi.resetModules();
  return import("@/lib/tilt");
}

describe("tiltToFoil (le calcul du reflet)", () => {
  it("ne produit rien sans lecture utilisable", async () => {
    const { tiltToFoil } = await freshTilt();
    // Un appareil muet, un `NaN` (capteur qui répond n'importe quoi), un angle
    // hors bornes : mieux vaut ne rien poser qu'un reflet qui saute partout.
    expect(tiltToFoil(null)).toBeNull();
    expect(tiltToFoil({ beta: Number.NaN, gamma: 0 })).toBeNull();
    expect(tiltToFoil({ beta: 0, gamma: Number.POSITIVE_INFINITY })).toBeNull();
    expect(tiltToFoil({ beta: 400, gamma: 0 })).toBeNull();
    expect(tiltToFoil({ beta: 0, gamma: 120 })).toBeNull();
  });

  it("garde le reflet à l'intérieur de la carte", async () => {
    const { tiltToFoil } = await freshTilt();
    // Le défaut à éviter : un point qui sort de la planche et laisse la carte
    // éteinte (le dégradé n'a plus rien à éclairer).
    for (const lecture of [
      { beta: 180, gamma: 0 },
      { beta: -180, gamma: 0 },
      { beta: 0, gamma: 90 },
      { beta: 0, gamma: -90 },
    ]) {
      const position = tiltToFoil(lecture);
      expect(position).not.toBeNull();
      expect(position!.px).toBeGreaterThanOrEqual(4);
      expect(position!.px).toBeLessThanOrEqual(96);
      expect(position!.py).toBeGreaterThanOrEqual(12);
      expect(position!.py).toBeLessThanOrEqual(88);
    }
  });

  it("suit la main : on penche à droite, le reflet part de l'autre côté", async () => {
    const { tiltToFoil } = await freshTilt();
    // Comme une vraie carte inclinée face à une lampe : le reflet glisse à
    // l'opposé du mouvement.
    const droite = tiltToFoil({ beta: 40, gamma: 30 })!;
    const gauche = tiltToFoil({ beta: 40, gamma: -30 })!;
    expect(droite.px).toBeLessThan(50);
    expect(gauche.px).toBeGreaterThan(50);
    // Et symétrique : deux inclinaisons opposées éclairent les deux bords.
    expect(Math.abs(droite.px - 50 + (gauche.px - 50))).toBeLessThan(0.2);
  });

  it("un téléphone bien droit : reflet en haut, à plat il redescend", async () => {
    const { tiltToFoil } = await freshTilt();
    const droit = tiltToFoil({ beta: 40, gamma: 0 })!;
    expect(droit.px).toBe(50);
    // Neuf dixièmes du temps, on tient son téléphone entre 20° et 60° : le
    // reflet doit y vivre (dans le haut de la carte, là où le foil brille au
    // repos), pas se coller au bord.
    expect(droit.py).toBeGreaterThan(18);
    expect(droit.py).toBeLessThan(35);
    const plat = tiltToFoil({ beta: 0, gamma: 0 })!;
    const penche = tiltToFoil({ beta: 80, gamma: 0 })!;
    expect(plat.py).toBeGreaterThan(droit.py);
    expect(penche.py).toBeLessThan(droit.py);
  });

  it("au-delà d'un quart de tour, le reflet ne bouge plus (pas de saut)", async () => {
    const { tiltToFoil } = await freshTilt();
    // Deux inclinaisons très différentes mais toutes deux « au bout » doivent
    // donner le même point : sinon le reflet tremblerait sur les extrêmes.
    const a = tiltToFoil({ beta: 40, gamma: 40 })!;
    const b = tiltToFoil({ beta: 40, gamma: 88 })!;
    expect(a.px).toBe(b.px);
  });
});

describe("le réglage du joueur", () => {
  let device: ReturnType<typeof fakeDevice>;

  beforeEach(() => {
    device = fakeDevice();
    vi.stubGlobal("window", device.win);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("est actif par défaut, et se coupe puis se rallume", async () => {
    const { tiltEnabled, setTiltEnabled } = await freshTilt();
    expect(tiltEnabled()).toBe(true);
    setTiltEnabled(false);
    expect(tiltEnabled()).toBe(false);
    setTiltEnabled(true);
    expect(tiltEnabled()).toBe(true);
  });

  it("se coupe au départ sur un appareil réglé « animations réduites »", async () => {
    // Un reflet qui glisse quand on bouge le téléphone est exactement ce que ce
    // réglage demande d'éviter — mais un choix explicite du joueur gagne.
    (device.win as { matchMedia?: unknown }).matchMedia = (requete: string) => ({
      matches: requete.includes("reduced-motion"),
    });
    const { tiltEnabled, setTiltEnabled } = await freshTilt();
    expect(tiltEnabled()).toBe(false);
    setTiltEnabled(true);
    expect(tiltEnabled()).toBe(true);
  });

  it("survit à un stockage refusé, sans lever", async () => {
    // Navigation privée stricte : le jeu ne doit pas casser pour un réglage.
    const { tiltEnabled, setTiltEnabled } = await freshTilt();
    Object.defineProperty(device.win, "localStorage", {
      configurable: true,
      get() {
        throw new Error("stockage refusé");
      },
    });
    expect(() => setTiltEnabled(false)).not.toThrow();
    expect(() => tiltEnabled()).not.toThrow();
  });
});

describe("le capteur partagé", () => {
  let device: ReturnType<typeof fakeDevice>;

  beforeEach(() => {
    device = fakeDevice();
    vi.stubGlobal("window", device.win);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("un seul écouteur pour plusieurs cartes, retiré quand la dernière part", async () => {
    const { subscribeTilt, tiltAvailable } = await freshTilt();
    expect(tiltAvailable()).toBe(true);

    const vues: (number | null)[] = [];
    const offA = subscribeTilt((p: { px: number } | null) => vues.push(p ? p.px : null));
    const offB = subscribeTilt((p: { px: number } | null) => vues.push(p ? p.px : null));
    expect(device.ajouts).toBe(1);

    device.bouger({ beta: 40, gamma: 30 });
    // Les deux cartes ont reçu la même position : elles partagent le capteur.
    expect(vues.filter((v) => v !== null).length).toBe(2);

    offA();
    expect(device.retraits).toBe(0); // B écoute encore.
    offB();
    expect(device.retraits).toBe(1); // Plus personne : le capteur est relâché.
  });

  it("ne garde pas plus de dix envois par seconde pendant un mouvement", async () => {
    const { subscribeTilt } = await freshTilt();
    const positions: (number | null)[] = [];
    const off = subscribeTilt((p: { px: number } | null) => positions.push(p ? p.px : null));

    const debut = Date.now();
    // Soixante événements d'un coup : le capteur parle ~60 Hz, on doit se
    // limiter à dix par seconde (un reflet n'a pas besoin de plus).
    for (let i = 0; i < 60; i += 1) device.bouger({ beta: 40, gamma: (i % 30) + 1 });
    expect(Date.now() - debut).toBeLessThan(200);
    expect(positions.length).toBeLessThanOrEqual(2); // le premier passe, les autres sont espacés

    off();
  });

  it("déclare l'appareil muet quand rien n'arrive, et efface le reflet", async () => {
    const { subscribeTilt, tiltSilent } = await freshTilt();
    const recus: (number | null)[] = [];
    const off = subscribeTilt((p: { px: number } | null) => recus.push(p ? p.px : null));

    expect(tiltSilent()).toBe(false);
    device.silence();
    // L'appareil n'a rien envoyé : le reflet revient au repos (position `null`),
    // et l'appelant sait qu'il ne doit plus attendre le capteur.
    expect(recus).toEqual([null]);
    expect(tiltSilent()).toBe(true);
    off();
  });

  it("ne se déclare pas muet quand le capteur a parlé", async () => {
    const { subscribeTilt, tiltSilent } = await freshTilt();
    const recus: (number | null)[] = [];
    const off = subscribeTilt((p: { px: number } | null) => recus.push(p ? p.px : null));

    device.bouger({ beta: 40, gamma: 10 });
    device.silence();
    expect(recus).toEqual([expect.any(Number)]);
    expect(tiltSilent()).toBe(false);
    off();
  });

  it("sans capteur, prévient tout de suite qu'il n'y a rien à attendre", async () => {
    // Une WebView sans `DeviceOrientationEvent` : l'abonné est appelé avec
    // `null` — l'appelant ne reste pas suspendu à un espoir.
    delete (device.win as { DeviceOrientationEvent?: unknown }).DeviceOrientationEvent;
    const { subscribeTilt, tiltAvailable, tiltSilent } = await freshTilt();
    expect(tiltAvailable()).toBe(false);

    const recus: unknown[] = [];
    const off = subscribeTilt((p: unknown) => recus.push(p));
    expect(recus).toEqual([null]);
    expect(tiltSilent()).toBe(false); // rien à signaler : il n'y a pas de capteur, c'est tout
    expect(device.ajouts).toBe(0);
    off();
  });
});
