/**
 * La chaîne : le simulateur de streameur, côté serveur (`0036_streamer.sql`).
 *
 * Trois portes, et le dessin est celui du wallet : le client **demande**, le
 * serveur **décide**.
 *
 *   * `streamerVisit()` — le retour du joueur. Le serveur compte les journées
 *     de jeu écoulées depuis le dernier passage (plafonnées à sept) et paie la
 *     croissance de la chaîne. L'horloge du téléphone n'est jamais lue : une
 *     horloge reculée donne zéro journée, pas un mois de revenus ;
 *   * `streamerStatus()` — l'état de la chaîne, y compris « la vidéo du jour est
 *     déjà publiée » et les jetons déjà versés aujourd'hui ;
 *   * `streamerPublish()` — publie la vidéo du jour. Le client n'envoie qu'un
 *     **nom de format** : le tirage (réussite, buzz, bad buzz), le gain et le
 *     versement de jetons sont tirés côté serveur, une seule fois par journée
 *     de jeu. Un second appel relit la première vidéo au lieu de la rejouer.
 *
 * Les mêmes règles vivent dans `src/data/streamer.json` pour le moteur local
 * (partie hors ligne) : `src/lib/streamer.ts` les lit, et
 * `src/lib/supabase-streamer.test.ts` tient les deux copies ensemble.
 */
import type { CloudCore } from "./core";
import { CloudError, asRecord } from "./core";

/** Un **invité sur le bureau**, tel que le serveur le garde (`0039`). */
export type StreamerGuestRow = {
  /** La place : 1 ou 2. */
  slot: number;
  /** L'identifiant de la carte possédée. */
  cardId: string;
  /** Le créateur de la carte — c'est lui qui doit être en direct. */
  slug: string;
  rarity: string;
  variant: string;
};

/** Un invité d'un raid payé : ce qu'il a rapporté, et pourquoi. */
export type StreamerRaidShare = {
  slot: number;
  slug: string;
  rarity: string;
  /** Ce qu'il vaut, pour mille de la croissance du jour. */
  permille: number;
  gained: number;
};

/** Le raid d'une journée de jeu (`0039`). */
export type StreamerRaidToday = {
  /** Les abonnés amenés par le raid (0 : personne n'était en direct). */
  gained: number;
  /** Qui est passé, avec sa part. */
  shares: StreamerRaidShare[];
  /** Le raid avait-il déjà été payé avant cet appel ? */
  already: boolean;
};

/** L'état de la chaîne, tel que le serveur le connaît. */
export type StreamerStatus = {
  /** Les abonnés, côté serveur — c'est **lui** qui fait foi. */
  subscribers: number;
  /** Ce que la chaîne gagne par journée de jeu, **setup compris** (`0038`). */
  perDay: number;
  /** La journée de jeu en cours (`AAAA-MM-JJ`), qui bascule à 6 h UTC. */
  day: string;
  /** La vidéo du jour est déjà publiée. */
  publishedToday: boolean;
  /** L'imprévu du jour a déjà reçu sa réponse (`0038`). */
  chosenToday: boolean;
  /** Les jetons versés par la chaîne aujourd'hui. */
  tokensToday: number;
  /** Le plafond de jetons de la chaîne, par journée de jeu. */
  tokensCap: number;
  /** Les paliers de setup installés, dans l'ordre (`0038`). */
  setup: string[];
  /** Le bonus de croissance du setup, pour mille (`0038`). */
  setupBonus: number;
  /** Les invités sur le bureau (`0039`). */
  guests: StreamerGuestRow[];
  /** Le raid du jour : ce qu'il a payé, et qui est passé (`0039`). */
  raidToday: number;
  /** La journée du dernier raid payé (`''` s'il n'y en a pas). */
  raidDay: string;
  /** Ce que le **plateau** vaut maintenant, pour mille — rareté **et** direct (`0041`). */
  collabPermille: number;
  /** Le bonus de buzz du direct, pour mille (`0` si personne ne streame). */
  collabBuzzPermille: number;
  /** Un invité streame à cet instant. */
  collabLive: boolean;
};

/** La carte d'imprévu du jour, telle que le serveur la connaît (`0038`). */
export type StreamerEventToday = {
  /** La journée de jeu (`AAAA-MM-JJ`). */
  day: string;
  /** L'identifiant de la carte du jour (`modo`, `raid`, …) — le texte vit dans l'app. */
  event: string;
  /** Le joueur a déjà répondu aujourd'hui. */
  chosen: boolean;
  /** Le côté choisi (`gauche` / `droite`), si la carte a été jouée. */
  choice: string;
  success: boolean;
  buzz: boolean;
  badBuzz: boolean;
  /** Les abonnés gagnés (négatifs quand ça s'est retourné contre toi). */
  gained: number;
};

/** Le résultat d'une réponse à l'imprévu du jour (`0038`). */
export type StreamerEventResult = {
  /** `true` si la carte avait déjà été jouée : rien n'a été rejoué. */
  already: boolean;
  event: string;
  choice: string;
  success: boolean;
  buzz: boolean;
  badBuzz: boolean;
  gained: number;
  subscribers: number;
  perDay: number;
};

/** Le résultat d'un achat de setup (`0038`). */
export type StreamerSetupPurchase = {
  /** `true` si le palier était déjà installé : rien n'a été débité. */
  already: boolean;
  level: string;
  /** Le prix payé (0 quand le palier était déjà là). */
  price: number;
  /** Les paliers installés après l'achat, dans l'ordre. */
  setup: string[];
  setupBonus: number;
  /** Le solde de points du serveur après l'achat. */
  points: number;
};

/** Le résumé du retour : ce que la chaîne a gagné pendant l'absence. */
export type StreamerReturn = {
  /** Les journées de jeu écoulées depuis le dernier passage. */
  days: number;
  /** Celles qui ont été payées (sept au plus). */
  countedDays: number;
  /** La croissance versée. */
  gained: number;
  /** Les abonnés avant le versement. */
  before: number;
  /** Les abonnés après. */
  subscribers: number;
  perDay: number;
  /** Le raid du jour, payé pendant ce relevé (ou relu) — `0039`. */
  raid: StreamerRaidToday;
};

/** Le résultat d'un changement d'invité (`0039`). */
export type StreamerGuestsResult = {
  /** `true` si le bureau a changé (pose ou retrait). */
  changed: boolean;
  /** Le bureau après le changement, dans l'ordre des places. */
  guests: StreamerGuestRow[];
};

/** Le résultat de la vidéo du jour, tel que le serveur l'a tiré. */
export type StreamerVideo = {
  /** `true` si la vidéo du jour avait déjà été publiée : rien n'a été rejoué. */
  already: boolean;
  /** Le bonus du **plateau** appliqué à cette vidéo, pour mille (`0041`). */
  collab: number;
  /** `true` si un invité streamait **au moment de publier** — le moment « RAID ! ». */
  raid: boolean;
  /** Le format publié, choisi par le client. */
  format: string;
  success: boolean;
  buzz: boolean;
  badBuzz: boolean;
  /** La croissance gagnée (négative sur un bad buzz, jamais sous zéro au total). */
  gained: number;
  /** Les jetons réellement versés — zéro si le plafond du jour est atteint. */
  tokens: number;
  subscribers: number;
  tokensToday: number;
  tokensCap: number;
};

export async function streamerStatus(core: CloudCore): Promise<StreamerStatus> {
  const record = asRecord(await core.rpc("streamer_status", {}));
  if (!record || record.ok !== true) {
    throw new CloudError("Réponse de chaîne illisible.", "invalid_response", 0);
  }
  return {
    subscribers: Number(record.subscribers ?? 0),
    perDay: Number(record.per_day ?? 0),
    day: String(record.day ?? ""),
    publishedToday: record.published_today === true,
    chosenToday: record.chosen_today === true,
    tokensToday: Number(record.tokens_today ?? 0),
    tokensCap: Number(record.tokens_cap ?? 0),
    setup: Array.isArray(record.setup) ? record.setup.map((level) => String(level)) : [],
    setupBonus: Number(record.setup_bonus ?? 0),
    guests: parseGuests(record.guests),
    raidToday: Number(record.raid_today ?? 0),
    raidDay: typeof record.raid_day === "string" ? record.raid_day : "",
    collabPermille: Number(record.collab_permille ?? 0),
    collabBuzzPermille: Number(record.collab_buzz_permille ?? 0),
    collabLive: record.collab_live === true,
  };
}

/**
 * Le bureau, tel que le serveur le renvoie (`snake_case`).
 *
 * Tolérant : une ligne incomplète est ignorée plutôt que de casser l'écran, et
 * une base qui n'a pas encore `0039` répond `undefined` — le bureau est alors
 * simplement vide, comme le carnet avec des migrations anciennes.
 */
export function parseGuests(payload: unknown): StreamerGuestRow[] {
  if (!Array.isArray(payload)) return [];
  const rows: StreamerGuestRow[] = [];
  for (const item of payload) {
    const row = asRecord(item);
    if (!row) continue;
    const slug = typeof row.creator_slug === "string" ? row.creator_slug : "";
    const cardId = typeof row.card_id === "string" ? row.card_id : "";
    if (!slug || !cardId) continue;
    rows.push({
      slot: Number(row.slot ?? 0),
      cardId,
      slug,
      rarity: String(row.rarity ?? ""),
      variant: String(row.variant ?? "standard"),
    });
  }
  return rows.sort((a, b) => a.slot - b.slot);
}

/** Le raid d'un relevé, tel que le serveur le renvoie. */
export function parseRaid(payload: unknown): StreamerRaidToday {
  const record = asRecord(payload);
  const shares: StreamerRaidShare[] = [];
  if (record && Array.isArray(record.guests)) {
    for (const item of record.guests) {
      const row = asRecord(item);
      if (!row) continue;
      const slug = typeof row.slug === "string" ? row.slug : "";
      if (!slug) continue;
      shares.push({
        slot: Number(row.slot ?? 0),
        slug,
        rarity: String(row.rarity ?? ""),
        permille: Number(row.permille ?? 0),
        gained: Number(row.gained ?? 0),
      });
    }
  }
  return {
    gained: Number(record?.gained ?? 0),
    shares,
    already: record?.already === true,
  };
}

/**
 * Pose un invité sur le bureau, ou libère une place (`0039`).
 *
 * Le client envoie la carte **telle qu'elle est dans sa collection** : le
 * serveur vérifie qu'elle est bien à lui (`card_claim_covers`, la règle des
 * échanges et de l'hôtel), refuse deux fois le même créateur, et renvoie le
 * bureau complet — l'écran recopie au lieu de deviner.
 */
export async function streamerGuestSet(
  core: CloudCore,
  slot: number,
  card: { id: string; creatorSlug: string; rarity: string; variant: string } | null,
): Promise<StreamerGuestsResult> {
  const payload = card
    ? {
        id: card.id,
        creatorSlug: card.creatorSlug,
        rarity: card.rarity,
        variant: card.variant,
      }
    : null;
  const record = asRecord(await core.rpc("streamer_guest_set", { p_slot: slot, p_card: payload }));
  if (!record || record.ok !== true) {
    throw new CloudError("Réponse de bureau illisible.", "invalid_response", 0);
  }
  return { changed: record.changed === true, guests: parseGuests(record.guests) };
}

/**
 * La carte d'imprévu du jour (`0038`).
 *
 * Le serveur ne renvoie qu'un **identifiant** : le texte de la carte vit dans
 * `src/data/streamer.json`. Un client qui ne connaît pas cette carte-là ne peut
 * pas la jouer — et il le dit, plutôt que d'inventer une histoire.
 */
export async function streamerEventToday(core: CloudCore): Promise<StreamerEventToday> {
  const record = asRecord(await core.rpc("streamer_event_today", {}));
  if (!record || record.ok !== true) {
    throw new CloudError("Réponse d'imprévu illisible.", "invalid_response", 0);
  }
  return {
    day: String(record.day ?? ""),
    event: String(record.event ?? ""),
    chosen: record.chosen === true,
    choice: typeof record.choice === "string" ? record.choice : "",
    success: record.success === true,
    buzz: record.buzz === true,
    badBuzz: record.bad_buzz === true,
    gained: Number(record.gained ?? 0),
  };
}

/**
 * Répond à l'imprévu du jour (`0038`).
 *
 * Le client envoie la carte **et** le côté ; le serveur refuse une carte qui
 * n'est pas celle du jour, un côté qui n'existe pas, et relit la première
 * réponse si le joueur appelle deux fois.
 */
export async function streamerChoose(
  core: CloudCore,
  event: string,
  choice: string,
): Promise<StreamerEventResult> {
  const record = asRecord(await core.rpc("streamer_choose", { p_event: event, p_choice: choice }));
  if (!record || record.ok !== true) {
    throw new CloudError("Réponse d'imprévu illisible.", "invalid_response", 0);
  }
  return {
    already: record.already === true,
    event: String(record.event ?? event),
    choice: String(record.choice ?? choice),
    success: record.success === true,
    buzz: record.buzz === true,
    badBuzz: record.bad_buzz === true,
    gained: Number(record.gained ?? 0),
    subscribers: Number(record.subscribers ?? 0),
    perDay: Number(record.per_day ?? 0),
  };
}

/**
 * Achète un palier de **setup** (`0038`).
 *
 * Le client n'envoie que le nom du palier : le prix vit au serveur, le débit
 * passe par le wallet (donc une seule fois pour toujours), et le solde renvoyé
 * est celui du serveur — l'appareil le recopie au lieu de le calculer.
 */
export async function streamerSetupBuy(
  core: CloudCore,
  level: string,
): Promise<StreamerSetupPurchase> {
  const record = asRecord(await core.rpc("streamer_setup_buy", { p_level: level }));
  if (!record || record.ok !== true) {
    throw new CloudError("Réponse de setup illisible.", "invalid_response", 0);
  }
  return {
    already: record.already === true,
    level: String(record.level ?? level),
    price: Number(record.price ?? 0),
    setup: Array.isArray(record.setup) ? record.setup.map((item) => String(item)) : [],
    setupBonus: Number(record.setup_bonus ?? 0),
    points: Number(record.points ?? 0),
  };
}

/**
 * Le résultat d'un **sacrifice de doublons** (`0040_setup_doublons.sql`).
 *
 * Il porte les cartes que le serveur a **réellement consommées** : c'est ce
 * verdict-là que le client applique à sa collection, jamais la sélection du
 * joueur — un refus ne doit rien retirer.
 */
export type StreamerSetupSacrifice = StreamerSetupPurchase & {
  /** Les identifiants des cartes qui ont quitté le classeur. */
  cards: string[];
  /** Ce que la sélection valait, en points de sacrifice. */
  value: number;
};

/**
 * Sacrifie des **doublons** pour installer le prochain palier du studio (`0040`).
 *
 * Le client n'envoie que des **identifiants de cartes** : le prix vient du
 * serveur, la rareté du catalogue, la valeur du barème. Le serveur relit la
 * sauvegarde, consomme les droits, écrit le journal des départs, et renvoie les
 * cartes consommées.
 */
export async function streamerSetupSacrifice(
  core: CloudCore,
  cardIds: string[],
): Promise<StreamerSetupSacrifice> {
  const record = asRecord(
    await core.rpc("streamer_setup_sacrifice", { p_cards: cardIds }),
  );
  if (!record || record.ok !== true) {
    throw new CloudError("Réponse de sacrifice illisible.", "invalid_response", 0);
  }
  return {
    already: record.already === true,
    level: String(record.level ?? ""),
    price: Number(record.price ?? 0),
    value: Number(record.value ?? 0),
    cards: Array.isArray(record.cards) ? record.cards.map((item) => String(item)) : [],
    setup: Array.isArray(record.setup) ? record.setup.map((item) => String(item)) : [],
    setupBonus: Number(record.setup_bonus ?? 0),
    points: Number(record.points ?? 0),
  };
}

export async function streamerVisit(core: CloudCore): Promise<StreamerReturn> {
  const record = asRecord(await core.rpc("streamer_visit", {}));
  if (!record || record.ok !== true) {
    throw new CloudError("Réponse de chaîne illisible.", "invalid_response", 0);
  }
  return {
    days: Number(record.days ?? 0),
    countedDays: Number(record.counted_days ?? 0),
    gained: Number(record.gained ?? 0),
    before: Number(record.subscribers_before ?? 0),
    subscribers: Number(record.subscribers ?? 0),
    perDay: Number(record.per_day ?? 0),
    raid: parseRaid(record.raid),
  };
}

/**
 * Publie la vidéo de la journée de jeu.
 *
 * Un seul paramètre : le **nom du format**. Le client ne propose ni ne transmet
 * de résultat — c'est le serveur qui tire, et c'est pour ça qu'un joueur ne peut
 * pas s'offrir une réussite à volonté.
 */
export async function streamerPublish(core: CloudCore, format: string): Promise<StreamerVideo> {
  const record = asRecord(await core.rpc("streamer_publish", { p_format: format }));
  if (!record || record.ok !== true) {
    throw new CloudError("Réponse de vidéo illisible.", "invalid_response", 0);
  }
  return {
    already: record.already === true,
    // Une base sans `0041` ne rend pas ces champs : la vidéo vaut alors un
    // plateau nul, ce qui est exactement ce qu'elle était.
    collab: Number(record.collab ?? 0),
    raid: record.raid === true,
    format: String(record.format ?? format),
    success: record.success === true,
    buzz: record.buzz === true,
    badBuzz: record.bad_buzz === true,
    gained: Number(record.gained ?? 0),
    tokens: Number(record.tokens ?? 0),
    subscribers: Number(record.subscribers ?? 0),
    tokensToday: Number(record.tokens_today ?? 0),
    tokensCap: Number(record.tokens_cap ?? 0),
  };
}
