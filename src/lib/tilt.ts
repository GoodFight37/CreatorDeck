"use client";

/**
 * Les cartes s'inclinent avec le téléphone — le geste d'une vraie carte holo.
 *
 * Une carte Holo ne tient pas son effet d'un dessin : elle brille **parce
 * qu'on la bouge**. Sur un écran, le doigt fait déjà glisser le reflet
 * (`--px`/`--py`, posés par `creator-card.tsx`), mais un téléphone posé dans la
 * main ne reçoit aucun doigt sur la carte : sans gyroscope, la Holo reste un
 * dégradé immobile. Ici, l'orientation de l'appareil prend le relais.
 *
 * Trois règles :
 *
 *   * **la carte reste dans un cadre** : l'inclinaison se traduit par le reflet
 *     qui glisse *à l'intérieur* de la carte, jamais par une rotation de la
 *     carte entière — qui aurait l'air d'un bug d'affichage ;
 *   * **un seul écouteur pour tout le jeu** : mille cartes ne posent pas mille
 *     abonnements (le classeur en affiche des centaines) ; le module partage le
 *     capteur et prévient qui écoute ;
 *   * **rien n'est obligatoire** : sans capteur (bureau, aperçu, appareil qui ne
 *     répond pas), `available()` est faux et l'application ne change rien.
 *
 * La mise en forme du calcul vit dans `tiltToFoil`, pure et testée
 * (`src/lib/tilt.test.ts`) : c'est elle qui décide qu'un téléphone à plat ou
 * brandi vers le ciel ne produit pas de reflet fou.
 */

/** Une lecture du capteur : inclinaison avant/arrière et gauche/droite. */
export type TiltReading = {
  /** `beta` : −180 à 180, l'inclinaison avant/arrière (0 = posé à plat). */
  beta: number;
  /** `gamma` : −90 à 90, le roulis gauche/droite (0 = bien droit). */
  gamma: number;
};

/** Ce qu'on écrit dans le foil : une position en pourcentage, comme le doigt. */
export type FoilPosition = { px: number; py: number };

const STORAGE_KEY = "creatordeck.tilt";

/**
 * Le même choix, écrit sur `<html>` (`data-card-fx="off"`).
 *
 * Le CSS s'en sert pour **éteindre le reflet** des cartes : le réglage
 * « Reflets des cartes » coupe tout, pas seulement le gyroscope. C'est ce que
 * demande un joueur chez qui l'effet fatigue l'œil — et le défaut est doux
 * depuis le 7 octobre 2026 (plus de bandes animées, une simple lueur).
 */
const ATTRIBUT = "cardFx";

function poserAttribut(value: boolean): void {
  if (typeof document === "undefined") return;
  document.documentElement.dataset[ATTRIBUT] = value ? "on" : "off";
}

/** Applique le choix mémorisé au document (au démarrage de l'application). */
export function applyTiltChoice(): void {
  poserAttribut(tiltEnabled());
}

/**
 * Traduit une inclinaison en position de reflet.
 *
 * La zone « utile » est volontairement étroite (un quart de tour de chaque
 * côté) : au-delà, le reflet ne bouge plus. Un téléphone à plat produit un
 * reflet **neutre** (milieu haut du foil), pas un point au hasard — et un
 * appareil qui répond n'importe quoi (`null`, `NaN`, 360°) est ignoré.
 */
export function tiltToFoil(reading: TiltReading | null): FoilPosition | null {
  if (!reading) return null;
  const { beta, gamma } = reading;
  if (!Number.isFinite(beta) || !Number.isFinite(gamma)) return null;
  // Certains appareils (et certains navigateurs de bureau) annoncent un angle
  // absurde : on préfère ne rien faire plutôt que de faire sauter le reflet.
  if (Math.abs(beta) > 180 || Math.abs(gamma) > 90) return null;

  const borne = (valeur: number, mini: number, maxi: number) =>
    Math.min(maxi, Math.max(mini, valeur));
  // γ = 0 (bien droit) → milieu ; γ = ±36° → les bords. Le sens suit la main :
  // on penche à droite, le reflet part à gauche — comme une carte qu'on incline
  // face à une lampe.
  const px = borne(50 - borne(Math.abs(gamma) / 36, 0, 1) * 46 * Math.sign(gamma), 4, 96);
  // β = 0 (téléphone posé à plat) → reflet au milieu ; β = 40° (redressé vers
  // soi, la position habituelle) → haut de la carte, à l'endroit où le foil
  // brille au repos ; plus on redresse, plus le reflet monte.
  const py = borne(50 - beta * 0.7, 12, 88);
  return { px: Math.round(px * 10) / 10, py: Math.round(py * 10) / 10 };
}

/**
 * Le joueur veut-il l'effet ? Actif par défaut ; le réglage le coupe.
 *
 * Un appareil réglé sur « animations réduites » le coupe aussi au départ : un
 * reflet qui glisse quand on bouge le téléphone est exactement ce que ce réglage
 * demande d'éviter. Le joueur peut toujours le rallumer dans les réglages — le
 * choix explicite gagne sur la préférence du système.
 */
export function tiltEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const choix = window.localStorage.getItem(STORAGE_KEY);
    if (choix === "off") return false;
    if (choix === "on") return true;
    return !prefersReducedMotion();
  } catch {
    return true;
  }
}

/** Le téléphone demande-t-il moins d'animations ? (`matchMedia` peut manquer.) */
function prefersReducedMotion(): boolean {
  try {
    const media = (window as Window & { matchMedia?: (q: string) => MediaQueryList }).matchMedia;
    return typeof media === "function" && media("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/** Mémorise le choix du joueur (`localStorage`), sans jamais lever. */
export function setTiltEnabled(value: boolean): void {
  if (typeof window === "undefined") return;
  poserAttribut(value);
  try {
    window.localStorage.setItem(STORAGE_KEY, value ? "on" : "off");
  } catch {
    // Stockage refusé (navigation privée stricte) : l'effet marchera pour la
    // session, c'est tout.
  }
}

/** L'appareil a-t-il un capteur d'orientation utilisable ? */
export function tiltAvailable(): boolean {
  if (typeof window === "undefined") return false;
  return "DeviceOrientationEvent" in window;
}

type Ecouteur = (position: FoilPosition | null) => void;

/** L'état partagé du module : un seul écouteur posé sur la fenêtre. */
const state: {
  ecouteurs: Set<Ecouteur>;
  detach: (() => void) | null;
  dernier: FoilPosition | null;
  /** Un appareil qui n'envoie rien (bureau) ne doit pas laisser croire qu'il
   *  bouge : au bout de deux secondes sans lecture, on le déclare silencieux. */
  silencieux: boolean;
  dernierEvenement: number;
} = { ecouteurs: new Set(), detach: null, dernier: null, silencieux: false, dernierEvenement: 0 };

/**
 * S'abonne au capteur. Rend une fonction pour se retirer.
 *
 * Le premier abonné pose l'écouteur, le dernier le retire : c'est ce qui permet
 * à cent cartes de partager un seul capteur. Sans capteur, on appelle tout de
 * suite avec `null` — l'appelant sait qu'il n'y a rien à espérer.
 */
export function subscribeTilt(ecouteur: Ecouteur): () => void {
  if (typeof window === "undefined" || !tiltAvailable()) {
    ecouteur(null);
    return () => {};
  }

  state.ecouteurs.add(ecouteur);
  if (state.dernier) ecouteur(state.dernier);
  if (!state.detach) state.detach = poserEcouteur();

  return () => {
    state.ecouteurs.delete(ecouteur);
    if (!state.ecouteurs.size && state.detach) {
      state.detach();
      state.detach = null;
      state.dernier = null;
    }
  };
}

function poserEcouteur(): () => void {
  let dernierEnvoi = 0;
  const onOrientation = (event: DeviceOrientationEvent) => {
    const now = Date.now();
    // Le capteur parle ~60 fois par seconde : dix fois suffisent pour un
    // reflet, et on économise la batterie au passage.
    if (now - dernierEnvoi < 40) return;
    dernierEnvoi = now;
    const position = tiltToFoil({ beta: event.beta ?? 0, gamma: event.gamma ?? 0 });
    if (!position) return;
    state.silencieux = false;
    state.dernierEvenement = now;
    state.dernier = position;
    for (const ecouteur of state.ecouteurs) ecouteur(position);
  };

  const cible = window as Window & {
    addEventListener: (type: string, listener: (event: DeviceOrientationEvent) => void) => void;
    removeEventListener: (type: string, listener: (event: DeviceOrientationEvent) => void) => void;
  };
  cible.addEventListener("deviceorientation", onOrientation);

  // Aucun événement après deux secondes : l'appareil n'a pas de capteur qui
  // répond (bureau, permission refusée). On le dit une fois, et on se tait.
  const minuterie = window.setTimeout(() => {
    if (state.dernierEvenement) return;
    state.silencieux = true;
    for (const ecouteur of state.ecouteurs) ecouteur(null);
  }, 2_000);

  return () => {
    cible.removeEventListener("deviceorientation", onOrientation);
    window.clearTimeout(minuterie);
  };
}

/** Diagnostic (et tests) : le capteur est-il vraiment muet ? */
export function tiltSilent(): boolean {
  return state.silencieux;
}
