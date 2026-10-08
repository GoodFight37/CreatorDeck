/**
 * Le simulateur de streameur : la croissance de la chaîne, les paliers de
 * notoriété et le calendrier de contenu.
 *
 * Pourquoi un module pur, comme `progression.ts` : ces règles décident de ce
 * que le joueur **gagne**, elles dépendent du temps, et le serveur applique les
 * mêmes. On donne un instant et une état, on obtient une réponse — testable
 * sans navigateur, et la même des deux côtés.
 *
 * Deux principes, hérités du reste du jeu :
 *
 *  * **la croissance est ancrée à un relevé**, jamais à l'horloge du téléphone.
 *    Le module ne connaît que des instants qu'on lui donne ; c'est l'appelant,
 *    et en dernier ressort le serveur (`last_seen_at`), qui décide lequel est
 *    le bon. Reculer l'horloge ne peut donc que retarder le compteur ;
 *  * **l'absence est plafonnée** (`growth.capDays`) : au-delà, la chaîne ne
 *    cumule plus. Sans plafond, trois semaines d'absence paieraient plus que
 *    trois semaines de jeu, et le jeu récompenserait le fait de ne pas y être.
 *
 * Tout est réglé dans `src/data/streamer.json` : les paliers, ce que chacun
 * rapporte par jour, les formats de vidéo et leurs chances.
 */
import streamer from "@/data/streamer.json";
import { PROGRESSION } from "@/lib/progression";
import { randomInt } from "@/lib/random";

export type StreamerTier = {
  id: string;
  /** Ce que le joueur lit. */
  label: string;
  /** Abonnés à partir desquels ce palier est atteint. */
  at: number;
  /** Abonnés gagnés par journée de jeu, avant la vidéo du jour. */
  perDay: number;
  note?: string;
};

export type StreamerFormat = {
  id: string;
  label: string;
  detail: string;
  /** Chance de réussite, pour mille (le reste tombe à plat). */
  successChancePermille: number;
  /** Ce que la réussite rapporte, pour mille de la croissance journalière. */
  gainPermille: number;
  /** Chance que la vidéo « buzz » (un clip part) : la réussite triple. */
  buzzPermille: number;
  /** Chance qu'elle se retourne contre toi (rage bait). */
  badBuzzPermille?: number;
  /** Réservé aux joueurs qui possèdent au moins un créateur (la collab). */
  requiresCreator?: boolean;
};

export type StreamerSetupLevel = {
  id: string;
  label: string;
  /** Prix, dans la monnaie indiquée. */
  price: number;
  currency: "points" | "cards";
  note?: string;
};

type StreamerData = {
  version: number;
  note: string;
  growth: { capDays: number; note: string };
  tiers: StreamerTier[];
  formats: StreamerFormat[];
  tokens: { perDayCap: number; perSuccess: number; perBuzz: number; note: string };
  setup: { note: string; levels: StreamerSetupLevel[] };
};

export const STREAMER = streamer as StreamerData;

/** Les paliers, du plus petit au plus grand (le fichier les tient dans l'ordre). */
export const TIERS: readonly StreamerTier[] = STREAMER.tiers;

/** Le plafond de cumul d'une absence. */
export const CAP_DAYS = STREAMER.growth.capDays;

/**
 * Ce que la chaîne rapporte en jetons : un montant **brut**, avant le plafond
 * quotidien. Le plafond est appliqué par le serveur (`0036_streamer.sql`) :
 * c'est lui qui paie, donc c'est lui qui compte.
 */
export const STREAMER_TOKENS = STREAMER.tokens;

const DAY_MS = 24 * 3_600_000;
/** Le décalage d'une journée de jeu (6 h UTC), partagé avec les missions. */
const DAY_SHIFT_MS = PROGRESSION.missions.resetHourUtc * 3_600_000;

const count = new Intl.NumberFormat("fr-FR");

/** Le palier du nombre d'abonnés donné. */
export function tierFor(subscribers: number): StreamerTier {
  let current = TIERS[0];
  for (const tier of TIERS) {
    if (subscribers >= tier.at) current = tier;
  }
  return current;
}

/** Le palier suivant, ou `null` au sommet. */
export function nextTier(subscribers: number): StreamerTier | null {
  return TIERS.find((tier) => tier.at > subscribers) ?? null;
}

/**
 * L'avancement dans le palier courant : ce qu'on a, ce qu'il faut pour le
 * suivant, et la part parcourue (0 → 1). Au sommet, `ratio` vaut 1.
 */
export function tierProgress(subscribers: number): {
  tier: StreamerTier;
  next: StreamerTier | null;
  ratio: number;
} {
  const tier = tierFor(subscribers);
  const next = nextTier(subscribers);
  if (!next) return { tier, next: null, ratio: 1 };
  const span = next.at - tier.at;
  const done = subscribers - tier.at;
  return { tier, next, ratio: span > 0 ? Math.min(1, Math.max(0, done / span)) : 1 };
}

/** Ce que la chaîne gagne par journée de jeu, à ce palier. */
export function growthPerDay(subscribers: number): number {
  return tierFor(subscribers).perDay;
}

/**
 * Le nombre de journées de jeu **commencées** entre deux instants (6 h UTC).
 *
 * Arithmétique et non une boucle : une horloge d'appareil peut annoncer des
 * années d'écart, et on ne veut pas d'une boucle qui compte les jours un par un
 * — surtout pour jeter le résultat au plafond juste après. Un écart négatif
 * (horloge reculée) vaut **zéro** : reculer l'horloge ne crédite rien.
 */
export function gameDaysBetween(fromMs: number, toMs: number): number {
  const a = Math.floor((fromMs - DAY_SHIFT_MS) / DAY_MS);
  const b = Math.floor((toMs - DAY_SHIFT_MS) / DAY_MS);
  return Math.max(0, b - a);
}

export type AbsenceSummary = {
  /** Journées de jeu écoulées, telles quelles. */
  days: number;
  /** Journées réellement comptées (plafonnées). */
  countedDays: number;
  /** Abonnés gagnés pendant l'absence. */
  gained: number;
  /** Le total après l'absence. */
  subscribers: number;
  /** Le palier atteint au retour a-t-il changé ? */
  tierUp: StreamerTier | null;
  /** Les phrases du résumé, prêtes à afficher. */
  lines: string[];
};

/**
 * Ce qui s'est passé pendant l'absence.
 *
 * Le calcul est fait **par journées de jeu**, à la croissance du palier de
 * départ — on ne recalcule pas le palier à chaque jour : la chaîne grandit au
 * rythme qu'elle avait en partant, et c'est la vidéo du jour, jouée à la main,
 * qui fait changer de palier. Un gain plus malin ici (paliers en cascade)
 * paierait une absence mieux qu'une session, exactement ce qu'on ne veut pas.
 */
export function absenceSummary(
  fromMs: number,
  toMs: number,
  subscribers: number,
): AbsenceSummary {
  const days = gameDaysBetween(fromMs, toMs);
  const countedDays = Math.min(days, CAP_DAYS);
  const gained = countedDays * growthPerDay(subscribers);
  const after = subscribers + gained;
  const before = tierFor(subscribers);
  const now = tierFor(after);
  const lines: string[] = [];

  if (gained > 0) {
    lines.push(`Pendant ton absence : +${count.format(gained)} abonnés.`);
  } else {
    lines.push("Ta chaîne n'a pas bougé — elle grandit pendant que tu joues.");
  }
  if (now !== before) {
    lines.push(`Ta chaîne est passée « ${now.label} ».`);
  }
  if (days > countedDays) {
    lines.push(
      `(${countedDays} journées comptées sur ${count.format(days)} : au-delà de ${CAP_DAYS}, la chaîne ne cumule plus.)`,
    );
  }
  return {
    days,
    countedDays,
    gained,
    subscribers: after,
    tierUp: now !== before ? now : null,
    lines,
  };
}

/** Les formats ouverts à un joueur qui possède `ownedCreators` créateurs. */
export function availableFormats(ownedCreators: number): StreamerFormat[] {
  return STREAMER.formats.filter((format) => !format.requiresCreator || ownedCreators > 0);
}

export type VideoOutcome = {
  format: StreamerFormat;
  /** La vidéo a réussi. */
  success: boolean;
  /** Un clip est parti : la réussite triple. */
  buzz: boolean;
  /** Elle s'est retournée contre toi (rage bait). */
  badBuzz: boolean;
  /** Abonnés gagnés (négatif sur un bad buzz). */
  gained: number;
  /** Jetons gagnés, **avant** le plafond quotidien du serveur. */
  tokens: number;
  /** La phrase du résumé, prête à afficher. */
  headline: string;
};

/**
 * La vidéo du jour : un tirage pondéré, exactement comme un booster.
 *
 * Trois jets indépendants, dans cet ordre : la réussite, le buzz (seulement
 * sur une réussite), le bad buzz (seulement sur un échec — une vidéo qui
 * marche ne se retourne pas contre toi le même jour).
 *
 * Le gain vaut `gainPermille` pour mille de la croissance journalière du
 * palier : une réussite de Let's Play fait donc une journée de croissance, une
 * réussite de Rage bait en fait deux, et un buzz triple. Un bad buzz coûte un
 * quart de ce que la vidéo aurait rapporté — assez pour faire réfléchir, jamais
 * assez pour ruiner une chaîne en un clic.
 */
export function resolveVideo(
  format: StreamerFormat,
  subscribers: number,
  roll: (maxExclusive: number) => number = randomInt,
): VideoOutcome {
  const base = growthPerDay(subscribers);
  const potential = Math.round((base * format.gainPermille) / 1000);
  const success = roll(1000) < format.successChancePermille;
  const buzz = success && roll(1000) < format.buzzPermille;
  const badBuzz = !success && roll(1000) < (format.badBuzzPermille ?? 0);

  let gained = 0;
  let tokens = 0;
  if (success) {
    gained = buzz ? potential * 3 : potential;
    tokens = STREAMER_TOKENS.perSuccess + (buzz ? STREAMER_TOKENS.perBuzz : 0);
  } else if (badBuzz) {
    gained = -Math.round(potential / 4);
    tokens = 0;
  }

  return {
    format,
    success,
    buzz,
    badBuzz,
    gained,
    tokens,
    headline: headlineFor({ format, success, buzz, badBuzz, gained, tokens }),
  };
}

/** La phrase du résumé, écrite une seule fois (écran, carnet, notification). */
function headlineFor(outcome: {
  format: StreamerFormat;
  success: boolean;
  buzz: boolean;
  badBuzz: boolean;
  gained: number;
  tokens: number;
}): string {
  const name = `« ${outcome.format.label} »`;
  const gain = `${outcome.gained > 0 ? "+" : "−"}${count.format(Math.abs(outcome.gained))} abonnés`;
  if (outcome.buzz) return `${name} a buzzé : ${gain} d'un coup.`;
  if (outcome.success) return `${name} a marché : ${gain}.`;
  if (outcome.badBuzz) return `${name} s'est retourné contre toi : ${gain}.`;
  return `${name} est tombé à plat : personne n'a cliqué.`;
}
