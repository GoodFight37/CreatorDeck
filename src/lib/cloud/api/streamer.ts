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

/** L'état de la chaîne, tel que le serveur le connaît. */
export type StreamerStatus = {
  /** Les abonnés, côté serveur — c'est **lui** qui fait foi. */
  subscribers: number;
  /** Ce que la chaîne gagne par journée de jeu, à son palier actuel. */
  perDay: number;
  /** La journée de jeu en cours (`AAAA-MM-JJ`), qui bascule à 6 h UTC. */
  day: string;
  /** La vidéo du jour est déjà publiée. */
  publishedToday: boolean;
  /** Les jetons versés par la chaîne aujourd'hui. */
  tokensToday: number;
  /** Le plafond de jetons de la chaîne, par journée de jeu. */
  tokensCap: number;
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
};

/** Le résultat de la vidéo du jour, tel que le serveur l'a tiré. */
export type StreamerVideo = {
  /** `true` si la vidéo du jour avait déjà été publiée : rien n'a été rejoué. */
  already: boolean;
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
    tokensToday: Number(record.tokens_today ?? 0),
    tokensCap: Number(record.tokens_cap ?? 0),
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
