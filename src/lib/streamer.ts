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
import { CREATOR_BY_SLUG, type CardVariant, type Rarity } from "@/lib/catalog";
import { liveFor, type LiveSnapshot } from "@/lib/live";
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
  /**
   * La monnaie du palier. Les cinq premiers se paient en **points** (le wallet
   * du serveur), les trois derniers en **doublons** (des cartes qui quittent le
   * classeur — voir `setup.sacrifice`). Le mot « doublons » et pas « cartes » :
   * c'est celui que le joueur lit à l'écran, et une seule copie ne part jamais.
   */
  currency: "points" | "doublons";
  /** Ce que ce palier ajoute à la croissance, pour mille (cumulatif). */
  growthPermille?: number;
  note?: string;
};

/** Un des deux côtés de la carte d'imprévu : on le choisit en glissant. */
export type StreamerEventChoice = {
  id: "gauche" | "droite";
  label: string;
  detail: string;
  /** Chance de réussite, pour mille (le reste tombe à plat). */
  successChancePermille: number;
  /** Ce que la réussite rapporte, pour mille de la croissance journalière. */
  gainPermille: number;
  /** Chance que ça « buzz » : la réussite triple. */
  buzzPermille: number;
  /** Chance que ça se retourne contre toi. */
  badBuzzPermille: number;
};

/**
 * Un **imprévu** : une situation, deux réponses, et les mêmes tirages qu'une
 * vidéo. Le texte est ici (l'application le porte), le tirage est au serveur.
 */
export type StreamerEvent = {
  id: string;
  /** Le titre de la carte, court — c'est ce que le joueur lit d'abord. */
  label: string;
  /** La situation, en deux ou trois lignes. */
  detail: string;
  /** Les deux côtés : la gauche et la droite de la carte. */
  choices: StreamerEventChoice[];
};

/** Un **invité sur le bureau** : une carte de la collection, à une place. */
export type StreamerGuest = {
  /** La place (1 ou 2) : deux invités au plus tiennent le plateau. */
  slot: number;
  /** L'identifiant de la carte possédée (une carte précise, pas un créateur). */
  cardId: string;
  /** Le créateur de la carte — c'est **lui** qui doit être en direct. */
  slug: string;
  rarity: Rarity;
  variant: CardVariant;
};

/**
 * Le **raid** payé une journée donnée : qui est passé, et ce que ça a rapporté.
 *
 * Le raid se paie **une seule fois par journée de jeu**, au premier relevé où
 * l'un des invités est en direct — sans lui, un joueur qui ouvre sa chaîne trois
 * fois dans la journée serait payé trois fois.
 */
export type StreamerRaid = {
  day: string;
  gained: number;
  /** Les créateurs qui ont payé, dans l'ordre du bureau. */
  slugs: string[];
};

type StreamerData = {
  version: number;
  note: string;
  growth: { capDays: number; note: string };
  tiers: StreamerTier[];
  formats: StreamerFormat[];
  eventsNote: string;
  events: StreamerEvent[];
  tokens: { perDayCap: number; perSuccess: number; perBuzz: number; note: string };
  setup: {
    note: string;
    levels: StreamerSetupLevel[];
    /** Ce que vaut un doublon qui part au studio, par rareté. */
    sacrifice: { note: string; values: Record<string, number> };
  };
  guests: {
    note: string;
    slots: number;
    liveWindowMinutes: number;
    raidPermille: Record<string, number>;
  };
};

export const STREAMER = streamer as StreamerData;

/** Les paliers, du plus petit au plus grand (le fichier les tient dans l'ordre). */
export const TIERS: readonly StreamerTier[] = STREAMER.tiers;

/** Le plafond de cumul d'une absence. */
export const CAP_DAYS = STREAMER.growth.capDays;

/** Les imprévus, dans l'ordre du fichier. */
export const EVENTS: readonly StreamerEvent[] = STREAMER.events;

/** Les paliers de setup, dans l'ordre du fichier (on les achète dans cet ordre). */
export const SETUP_LEVELS: readonly StreamerSetupLevel[] = STREAMER.setup.levels;

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

/** Ce que la chaîne gagne par journée de jeu, à ce palier (avant le setup). */
export function growthPerDay(subscribers: number): number {
  return tierFor(subscribers).perDay;
}

/** Le palier de setup portant cet identifiant, ou `null`. */
export function setupLevelById(id: string): StreamerSetupLevel | null {
  return SETUP_LEVELS.find((level) => level.id === id) ?? null;
}

/**
 * Le bonus de croissance des paliers de setup **achetés**, pour mille.
 *
 * Les paliers ne comptent que s'ils sont dans l'ordre (`owned` vient de l'état,
 * qui ne sait les écrire que dans l'ordre) ; un identifiant inconnu — une
 * sauvegarde d'une autre version, par exemple — ne compte pas plutôt que de
 * fausser le calcul.
 */
export function setupBonusPermille(owned: readonly string[]): number {
  let bonus = 0;
  for (const level of SETUP_LEVELS) {
    if (!owned.includes(level.id)) break;
    bonus += level.growthPermille ?? 0;
  }
  return bonus;
}

/**
 * Ce que la chaîne gagne par journée de jeu, **setup compris**.
 *
 * Le bonus est un pour-mille appliqué au palier, arrondi vers le bas — la même
 * opération que `_streamer_growth()` côté serveur, sinon l'écran et le serveur
 * annonceraient deux chiffres différents pour la même journée.
 */
export function growthWithSetup(subscribers: number, owned: readonly string[]): number {
  const base = growthPerDay(subscribers);
  const bonus = setupBonusPermille(owned);
  return bonus === 0 ? base : Math.floor((base * (1000 + bonus)) / 1000);
}

/** Le prochain palier de setup à acheter, ou `null` si tout est acheté. */
export function nextSetupLevel(owned: readonly string[]): StreamerSetupLevel | null {
  return SETUP_LEVELS.find((level) => !owned.includes(level.id)) ?? null;
}

/** Ce que vaut un doublon qui part au studio, par rareté (fichier de règles). */
export const SETUP_SACRIFICE_VALUES: Readonly<Record<string, number>> =
  STREAMER.setup.sacrifice.values;

/**
 * Ce que vaut un doublon qui part au studio, selon sa rareté.
 *
 * **Zéro** veut dire « cette carte ne part pas » : les Communes et les Peu
 * communes ne paient rien, et une **Légendaire** ne quitte jamais le classeur.
 * C'est aussi la valeur que le serveur applique (`_streamer_sacrifice_values`),
 * et le test miroir attrape un barème changé d'un seul côté.
 */
export function sacrificeValue(rarity: string): number {
  return SETUP_SACRIFICE_VALUES[rarity] ?? 0;
}

/** Le prix d'un palier en doublons (0 quand le palier se paie en points). */
export function sacrificePrice(level: StreamerSetupLevel): number {
  return level.currency === "doublons" ? level.price : 0;
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
  /** Le bonus de croissance du setup acheté, pour mille (0 = aucun). */
  bonusPermille = 0,
): AbsenceSummary {
  const days = gameDaysBetween(fromMs, toMs);
  const countedDays = Math.min(days, CAP_DAYS);
  const base = growthPerDay(subscribers);
  const perDay = bonusPermille === 0 ? base : Math.floor((base * (1000 + bonusPermille)) / 1000);
  const gained = countedDays * perDay;
  const after = subscribers + gained;
  return {
    days,
    countedDays,
    gained,
    subscribers: after,
    tierUp: tierFor(after) !== tierFor(subscribers) ? tierFor(after) : null,
    lines: absenceLines({ days, countedDays, gained, before: subscribers, after }),
  };
}

/**
 * Les phrases du retour, écrites **une seule fois**.
 *
 * Le même résumé vient de deux chemins : le moteur local (build sans cloud) et
 * le serveur (`streamer_visit()`). Deux rédactions pour le même fait se
 * contrediraient à l'écran.
 */
export function absenceLines(compte: {
  days: number;
  countedDays: number;
  gained: number;
  before: number;
  after: number;
}): string[] {
  const lines: string[] = [];
  if (compte.gained > 0) {
    lines.push(`Pendant ton absence : +${count.format(compte.gained)} abonnés.`);
  } else {
    lines.push("Ta chaîne n'a pas bougé — elle grandit pendant que tu joues.");
  }
  if (tierFor(compte.after) !== tierFor(compte.before)) {
    lines.push(`Ta chaîne est passée « ${tierFor(compte.after).label} ».`);
  }
  if (compte.days > compte.countedDays) {
    lines.push(
      `(${compte.countedDays} journées comptées sur ${count.format(compte.days)} : au-delà de ${CAP_DAYS}, la chaîne ne cumule plus.)`,
    );
  }
  return lines;
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
  /** Le bonus de croissance du setup acheté, pour mille (0 = aucun). */
  bonusPermille = 0,
): VideoOutcome {
  const base = growthPerDay(subscribers);
  const avecSetup = bonusPermille === 0 ? base : Math.floor((base * (1000 + bonusPermille)) / 1000);
  const potential = Math.round((avecSetup * format.gainPermille) / 1000);
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

/** L'imprévu portant cet identifiant, ou `null` s'il n'existe pas. */
export function eventById(id: string): StreamerEvent | null {
  return EVENTS.find((event) => event.id === id) ?? null;
}

/** Un des deux côtés de la carte, ou `null`. */
export function eventChoice(event: StreamerEvent, id: string): StreamerEventChoice | null {
  return event.choices.find((choice) => choice.id === id) ?? null;
}

/**
 * L'imprévu **de cette journée-là**, et toujours le même : la carte ne change
 * pas entre deux ouvertures du même jour. Le choix est un petit hachage de la
 * journée de jeu — stable, sans aléa, donc le même pour tous ceux qui jouent
 * sur cet appareil. Le serveur, lui, choisit aussi une carte par joueur et par
 * journée (`md5`), et cette carte-là peut être **différente** : ce qui doit être
 * identique des deux côtés, ce sont les règles (les chances écrites au fichier),
 * pas la carte du jour — un build sans cloud n'a personne à qui demander.
 */
export function eventForDay(day: string): StreamerEvent {
  let hash = 0;
  for (let i = 0; i < day.length; i += 1) {
    hash = (hash * 31 + day.charCodeAt(i)) >>> 0;
  }
  return EVENTS[hash % EVENTS.length];
}

export type EventOutcome = {
  event: StreamerEvent;
  choice: StreamerEventChoice;
  success: boolean;
  buzz: boolean;
  badBuzz: boolean;
  /** Abonnés gagnés (négatif quand ça se retourne contre toi). */
  gained: number;
  headline: string;
};

/**
 * La réponse à un imprévu : les **mêmes trois jets** qu'une vidéo, dans le même
 * ordre — la réussite, le buzz (seulement sur une réussite), le bad buzz
 * (seulement sur un échec). Le gain et la perte se calculent aussi pareil, sur
 * la croissance journalière du palier.
 *
 * Aucun jeton : les jetons de la chaîne viennent de la vidéo du jour, une seule
 * porte pour la monnaie. Un imprévu fait grandir ou reculer la chaîne, rien
 * d'autre.
 */
export function resolveEventChoice(
  event: StreamerEvent,
  choice: StreamerEventChoice,
  subscribers: number,
  roll: (maxExclusive: number) => number = randomInt,
  bonusPermille = 0,
): EventOutcome {
  const base = growthPerDay(subscribers);
  const avecSetup = bonusPermille === 0 ? base : Math.floor((base * (1000 + bonusPermille)) / 1000);
  const potential = Math.round((avecSetup * choice.gainPermille) / 1000);
  const success = roll(1000) < choice.successChancePermille;
  const buzz = success && roll(1000) < choice.buzzPermille;
  const badBuzz = !success && roll(1000) < choice.badBuzzPermille;

  let gained = 0;
  if (success) gained = buzz ? potential * 3 : potential;
  else if (badBuzz) gained = -Math.round(potential / 4);

  return {
    event,
    choice,
    success,
    buzz,
    badBuzz,
    gained,
    headline: eventHeadline({ choice, success, buzz, badBuzz, gained }),
  };
}

/** La phrase d'un imprévu, écrite une seule fois (écran et résumé du jour). */
export function eventHeadline(outcome: {
  choice: StreamerEventChoice;
  success: boolean;
  buzz: boolean;
  badBuzz: boolean;
  gained: number;
}): string {
  const nom = `« ${outcome.choice.label} »`;
  const gain = `${outcome.gained > 0 ? "+" : "−"}${count.format(Math.abs(outcome.gained))} abonnés`;
  if (outcome.buzz) return `${nom} : ça a buzzé — ${gain} d'un coup.`;
  if (outcome.success) return `${nom} : ${gain}.`;
  if (outcome.badBuzz) return `${nom} : ça s'est retourné contre toi — ${gain}.`;
  return `${nom} : personne n'a réagi.`;
}

/** La phrase du résumé, écrite une seule fois (écran, carnet, notification). */
// --------------------------------------------------------------- l'état local
/**
 * Le **miroir local** de la chaîne : ce que le serveur garde dans
 * `streamer_channels` et `streamer_videos` (`0036`), en plus petit.
 *
 * Il vit dans la sauvegarde pour deux raisons : l'écran doit pouvoir afficher la
 * chaîne sans réseau, et un build sans cloud doit pouvoir y jouer. Mais il n'est
 * jamais l'autorité : quand le serveur parle, `applyStreamerMirror()` réécrit ces
 * valeurs-là — le même dessin qu'`applyWallet()` et `applyTokens()`.
 */
export type StreamerState = {
  subscribers: number;
  /** Epoch ms du dernier relevé — c'est lui qui borne l'absence payée. */
  lastSeenAt: number;
  /** La journée de jeu à laquelle `tokensToday` se rapporte (6 h UTC). */
  tokensDay: string;
  /** Jetons versés par la chaîne sur cette journée-là, plafonnés comme au serveur. */
  tokensToday: number;
  /** La dernière vidéo publiée : une seule par journée de jeu, jamais rejouée. */
  video: StreamerVideoState | null;
  /** La réponse au dernier imprévu : une seule par journée de jeu, jamais rejoué. */
  event: StreamerEventState | null;
  /** Les paliers de setup achetés, **dans l'ordre** (le bonus se lit ainsi). */
  setup: string[];
  /** Les invités sur le bureau : deux cartes au plus, jamais deux fois le même créateur. */
  guests: StreamerGuest[];
  /** Le dernier raid payé : une seule fois par journée de jeu. */
  raid: StreamerRaid | null;
};

export type StreamerEventState = {
  day: string;
  event: string;
  choice: string;
  success: boolean;
  buzz: boolean;
  badBuzz: boolean;
  gained: number;
};

export type StreamerVideoState = {
  day: string;
  format: string;
  success: boolean;
  buzz: boolean;
  badBuzz: boolean;
  gained: number;
  /** Jetons réellement versés (0 quand le plafond du jour est atteint). */
  tokens: number;
};

export function newStreamerState(now: number): StreamerState {
  return {
    subscribers: 0,
    lastSeenAt: now,
    tokensDay: "",
    tokensToday: 0,
    video: null,
    event: null,
    setup: [],
    guests: [],
    raid: null,
  };
}

// ------------------------------------------------------- les invités du bureau

/** Le nombre d'invités qu'un bureau peut tenir (deux). */
export const GUEST_SLOTS = STREAMER.guests.slots;

/**
 * La fraîcheur exigée du direct, en minutes : la **même** que celle du badge de
 * l'accueil (`LIVE_TTL_MS`). Un invité dont le direct date d'hier ne paie pas —
 * le serveur lit `live_state.refreshed_at`, et cette fenêtre-là est dans le
 * fichier pour que les deux côtés ne puissent pas diverger en silence.
 */
export const GUEST_LIVE_WINDOW_MINUTES = STREAMER.guests.liveWindowMinutes;

/** Ce qu'un invité de cette rareté paie quand il est en direct, pour mille. */
export function guestRaidPermille(rarity: string): number {
  return STREAMER.guests.raidPermille[rarity] ?? 0;
}

export type RaidShare = {
  guest: StreamerGuest;
  /** Ce que cette carte vaut, pour mille de la croissance journalière. */
  permille: number;
  /** Les abonnés que ce créateur a amenés. */
  gained: number;
};

export type RaidResult = {
  /** Le total amassé par le raid (0 : personne n'était en direct). */
  gained: number;
  /** Les invités qui étaient bel et bien en direct, dans l'ordre du bureau. */
  shares: RaidShare[];
};

/**
 * Le raid d'un bureau : chaque invité **réellement en direct** paie sa part.
 *
 * La part est `floor(croissance du jour × pour-mille / 1000)` — la même
 * opération que le setup et la vidéo, donc le même arrondi que le serveur. La
 * croissance est celle du jour, **setup compris** : un studio qui fait grandir
 * la chaîne fait aussi grandir les raids.
 *
 * `liveSlugs` est la seule chose que le module ne peut pas deviner : c'est la
 * liste des créateurs en direct **au moment du relevé**, telle que le serveur la
 * publie. Vide = personne n'est en direct, et le raid ne paie rien.
 */
export function raidForGuests(
  perDay: number,
  guests: readonly StreamerGuest[],
  liveSlugs: readonly string[] | ReadonlySet<string>,
): RaidResult {
  const enDirect =
    liveSlugs instanceof Set ? liveSlugs : new Set(Array.from(liveSlugs).map((s) => s.toLowerCase()));
  const vus = new Set<string>();
  const shares: RaidShare[] = [];
  for (const guest of [...guests].sort((a, b) => a.slot - b.slot)) {
    if (!guest.slug || vus.has(guest.slug)) continue;
    vus.add(guest.slug);
    if (!enDirect.has(guest.slug.toLowerCase())) continue;
    const permille = guestRaidPermille(guest.rarity);
    if (permille <= 0) continue;
    shares.push({
      guest,
      permille,
      gained: Math.floor((perDay * permille) / 1000),
    });
  }
  return { gained: shares.reduce((total, share) => total + share.gained, 0), shares };
}

/**
 * Les invités dont le créateur est **en direct maintenant**, par slug.
 *
 * Miroir exact de ce que le serveur fait en SQL (`0039`) : il joint
 * `creators.login` à `live_streams`, et la fraîcheur qu'il exige est celle de
 * `live_state.refreshed_at` — la même que `liveFor()` applique ici (`LIVE_TTL_MS`
 * et `GUEST_LIVE_WINDOW_MINUTES` valent dix minutes des deux côtés).
 *
 * Hors ligne, la réponse est **toujours vide** : sans table du direct, on ne
 * sait pas qui streame, et un raid inventé serait pire que pas de raid.
 */
export function liveGuestSlugs(
  guests: readonly StreamerGuest[],
  snapshot: LiveSnapshot,
  now: number,
): Set<string> {
  const enDirect = new Set<string>();
  for (const guest of guests) {
    const creator = CREATOR_BY_SLUG.get(guest.slug);
    if (!creator) continue;
    if (liveFor(snapshot, creator.login, now)) enDirect.add(guest.slug);
  }
  return enDirect;
}

/** La phrase du raid, écrite **une seule fois** (écran, résumé du retour). */
export function raidLine(raid: { gained: number; slugs: readonly string[] }): string {
  const qui =
    raid.slugs.length > 1
      ? `${raid.slugs.length} invités sont passés en direct`
      : `un invité est passé en direct`;
  return `Raid : ${qui} — +${count.format(raid.gained)} abonnés.`;
}

/** Le format portant cet identifiant, ou `null` s'il n'existe pas. */
export function formatById(id: string): StreamerFormat | null {
  return STREAMER.formats.find((format) => format.id === id) ?? null;
}

/** Les jetons déjà versés par la chaîne pour une journée de jeu donnée. */
export function tokensOnDay(state: StreamerState, day: string): number {
  return state.tokensDay === day ? state.tokensToday : 0;
}

/** Le plafond de jetons de la chaîne, par journée de jeu. */
export const STREAMER_TOKEN_CAP = STREAMER.tokens.perDayCap;

/**
 * La vidéo du jour, jouée **localement** — le chemin du build sans cloud.
 *
 * Le dessin est celui du serveur : une seule vidéo par journée de jeu, les trois
 * jets du fichier, et le versement plafonné à ce qui reste de la journée.
 * `null` signifie « ce format n'existe pas » ; un format valide déjà publié
 * aujourd'hui ressort avec `already: true` et la vidéo enregistrée, exactement
 * comme `streamer_publish()`.
 */
export function playVideoLocally(
  prev: StreamerState,
  formatId: string,
  day: string,
  roll: (maxExclusive: number) => number = randomInt,
): { state: StreamerState; video: StreamerVideoState; already: boolean } | null {
  const format = formatById(formatId);
  if (!format) return null;
  if (prev.video?.day === day) return { state: prev, video: prev.video, already: true };

  const outcome = resolveVideo(format, prev.subscribers, roll, setupBonusPermille(prev.setup));
  const deja = tokensOnDay(prev, day);
  const tokens = Math.max(0, Math.min(outcome.tokens, STREAMER_TOKEN_CAP - deja));
  const video: StreamerVideoState = {
    day,
    format: format.id,
    success: outcome.success,
    buzz: outcome.buzz,
    badBuzz: outcome.badBuzz,
    gained: outcome.gained,
    tokens,
  };
  return {
    state: {
      subscribers: Math.max(0, prev.subscribers + outcome.gained),
      lastSeenAt: prev.lastSeenAt,
      tokensDay: day,
      tokensToday: deja + tokens,
      video,
      event: prev.event,
      setup: prev.setup,
      guests: prev.guests,
      raid: prev.raid,
    },
    video,
    already: false,
  };
}

/**
 * L'imprévu du jour, joué **localement** — le chemin du build sans cloud.
 *
 * Le dessin est celui du serveur : une carte par journée de jeu (la même toute
 * la journée, `eventForDay()`), un seul choix, jamais rejoué. `null` signifie
 * « cette carte-ci ou ce côté-ci n'existe pas » ; un imprévu déjà joué
 * aujourd'hui ressort avec `already: true` et la réponse enregistrée.
 */
export function playEventLocally(
  prev: StreamerState,
  choiceId: string,
  day: string,
  roll: (maxExclusive: number) => number = randomInt,
): { state: StreamerState; event: StreamerEventState; outcome: EventOutcome; already: boolean } | null {
  const carte = eventForDay(day);
  const choice = eventChoice(carte, choiceId);
  if (!choice) return null;
  if (prev.event?.day === day) {
    const rejoue = eventById(prev.event.event);
    const cote = rejoue ? eventChoice(rejoue, prev.event.choice) : null;
    return {
      state: prev,
      event: prev.event,
      outcome: {
        event: rejoue ?? carte,
        choice: cote ?? choice,
        success: prev.event.success,
        buzz: prev.event.buzz,
        badBuzz: prev.event.badBuzz,
        gained: prev.event.gained,
        headline: eventHeadline({
          choice: cote ?? choice,
          success: prev.event.success,
          buzz: prev.event.buzz,
          badBuzz: prev.event.badBuzz,
          gained: prev.event.gained,
        }),
      },
      already: true,
    };
  }

  const outcome = resolveEventChoice(carte, choice, prev.subscribers, roll, setupBonusPermille(prev.setup));
  const event: StreamerEventState = {
    day,
    event: carte.id,
    choice: choice.id,
    success: outcome.success,
    buzz: outcome.buzz,
    badBuzz: outcome.badBuzz,
    gained: outcome.gained,
  };
  return {
    state: {
      ...prev,
      subscribers: Math.max(0, prev.subscribers + outcome.gained),
      event,
    },
    event,
    outcome,
    already: false,
  };
}

/** La phrase qui résume une vidéo, à partir de ce que le serveur a répondu. */
export function videoHeadline(video: {
  format: StreamerFormat;
  success: boolean;
  buzz: boolean;
  badBuzz: boolean;
  gained: number;
  tokens: number;
}): string {
  return headlineFor(video);
}

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
