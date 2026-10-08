/**
 * Le live de vingt secondes de « Ta chaîne » : la **mécanique pure**, sans écran.
 *
 * Le principe : on passe en direct, le chat défile, et des **bulles d'alerte**
 * apparaissent — un follower, un abonné, un raid, un message. On les attrape en
 * appuyant dessus avant qu'elles ne s'effacent ; celles qu'on laisse passer
 * s'effacent toutes seules.
 *
 * Pourquoi un module à part, comme `pull.ts`, `tilt.ts` et `swipe.ts` : une
 * scène qui bouge ne se vérifie pas à l'œil. Ce qui se décide ici — **quand** un
 * message arrive, **combien** de bulles tombent, **combien de temps** chacune
 * reste, et ce que le bilan raconte — est du calcul pur, testable sans
 * navigateur ni horloge.
 *
 * Trois règles qui viennent du jeu, pas du goût :
 *
 *   * **le même live pour la même journée de jeu** : le plan est tiré d'une
 *     graine `(journée, palier)`, donc rouvrir l'écran ne rebat pas les cartes —
 *     un joueur ne relance pas la scène pour tomber sur un tirage plus clément ;
 *   * **la cadence suit la notoriété** : un petit canal a un chat clairsemé, un
 *     gros canal ne peut plus le lire. Le nombre de bulles suit la même pente ;
 *   * **aucune monnaie** : rien ici ne paie de jeton ni de point. Le tirage de
 *     la vidéo du jour reste au serveur (`streamer_publish`), et cette scène ne
 *     fait que le précéder.
 */
import LIVE from "@/data/live-game.json";
import { TIERS, type StreamerTier } from "@/lib/streamer";

export type LiveAlertKind = {
  id: string;
  label: string;
  hint: string;
  /** Combien de temps la bulle reste attrapable, en millisecondes. */
  lifeMs: number;
};

export type LiveChatLine = {
  /** Le moment où la ligne apparaît, en millisecondes depuis le début. */
  at: number;
  text: string;
};

export type LiveAlert = {
  id: string;
  /** Le moment où la bulle apparaît, en millisecondes depuis le début. */
  at: number;
  kindId: string;
  label: string;
  hint: string;
  /** La durée de vie **réellement utilisée** : jamais au-delà de la fin du live. */
  lifeMs: number;
  /** Où la bulle se pose dans le cadre, en pour cent (déterministe). */
  leftPercent: number;
  topPercent: number;
};

export type LivePlan = {
  day: string;
  tierIndex: number;
  durationMs: number;
  chat: LiveChatLine[];
  alerts: LiveAlert[];
};

export type LiveRecap = {
  caught: number;
  missed: number;
  total: number;
  /** Les bulles attrapées, pour mille (1000 = sans faute). */
  ratioPermille: number;
  /** La phrase du bilan, écrites ici une fois pour toutes. */
  headline: string;
  /** Ce que le chat a fait pendant ce temps. */
  chatLine: string;
};

/** Le réglage, tel qu'il est écrit dans le fichier (une seule copie). */
export const LIVE_GAME = LIVE;

export const LIVE_DURATION_MS = LIVE.durationMs;
export const LIVE_CHAT_HOLD_MS = LIVE.chat.holdMs;
export const LIVE_ALERT_KINDS: readonly LiveAlertKind[] = LIVE.alerts.kinds;

/** Le palier de notoriété, en **indice** (0 = petit canal). */
export function tierIndexFor(subscribers: number): number {
  let index = 0;
  for (let i = 0; i < TIERS.length; i += 1) {
    if (subscribers >= TIERS[i].at) index = i;
  }
  return index;
}

/** Le palier, à partir de son indice (borné : un indice hors liste retombe au dernier). */
export function tierAt(index: number): StreamerTier {
  return TIERS[Math.min(Math.max(0, Math.trunc(index)), TIERS.length - 1)];
}

/**
 * Un petit générateur déterministe (mulberry32) amorcé par `(journée, palier)`.
 *
 * Il sert à **répartir** les messages et les bulles sans `Math.random` : deux
 * ouvertures du même live doivent donner exactement la même scène, sinon un
 * joueur pourrait relancer la scène jusqu'à tomber sur un tirage facile.
 */
function seeded(day: string, tierIndex: number): () => number {
  const graine = `${day}#${tierIndex}`;
  // FNV-1a : court, déterministe, et suffisant pour étaler une chaîne.
  let hash = 0x811c9dc5;
  for (let i = 0; i < graine.length; i += 1) {
    hash ^= graine.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  let etat = hash >>> 0;
  return () => {
    etat = (etat + 0x6d2b79f5) | 0;
    let t = etat;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** La cadence du chat, en messages par minute, pour un palier. */
export function chatPerMinute(tierIndex: number): number {
  const cadences = LIVE.chat.perMinute;
  return cadences[Math.min(Math.max(0, Math.trunc(tierIndex)), cadences.length - 1)];
}

/** Le nombre de bulles d'un live, pour un palier. */
export function alertsPerLive(tierIndex: number): number {
  const nombre = LIVE.alerts.count;
  return nombre[Math.min(Math.max(0, Math.trunc(tierIndex)), nombre.length - 1)];
}

/**
 * Le plan du live : quand le chat parle, quand les bulles tombent.
 *
 * Le plan ne dépend que de `(journée, palier)` — jamais de l'horloge réelle, ni
 * du hasard du matériel.
 */
export function livePlan(day: string, tierIndex: number): LivePlan {
  const rng = seeded(day, tierIndex);
  const durationMs = LIVE_DURATION_MS;
  const palier = Math.min(Math.max(0, Math.trunc(tierIndex)), TIERS.length - 1);

  // --- Le chat : des positions régulières, secouées juste ce qu'il faut -----
  const lignes = LIVE.chat.lines;
  const combien = Math.max(1, Math.round((chatPerMinute(palier) * durationMs) / 60_000));
  const creneau = durationMs / combien;
  const chat: LiveChatLine[] = [];
  let offset = Math.floor(rng() * lignes.length);
  for (let i = 0; i < combien; i += 1) {
    const jitter = (rng() - 0.5) * creneau * 0.6;
    const at = Math.max(0, Math.min(durationMs - 200, Math.round(creneau * (i + 0.5) + jitter)));
    // Deux messages d'affilée ne disent jamais la même chose : un chat qui se
    // répète mot pour mot se voit tout de suite.
    offset = (offset + 1 + Math.floor(rng() * (lignes.length - 1))) % lignes.length;
    chat.push({ at, text: lignes[offset] });
  }
  chat.sort((a, b) => a.at - b.at);

  // --- Les bulles : jamais deux au même moment, jamais hors du cadre --------
  const premier = LIVE.alerts.firstAtMs;
  const dernier = Math.min(LIVE.alerts.lastAtMs, durationMs - 1200);
  const creneaux = Math.max(1, Math.floor((dernier - premier) / LIVE.alerts.minGapMs) + 1);
  const voulues = Math.min(alertsPerLive(palier), creneaux);
  const choisis = new Set<number>();
  while (choisis.size < voulues) choisis.add(Math.floor(rng() * creneaux));

  const kinds = LIVE_ALERT_KINDS as readonly LiveAlertKind[];
  const alerts: LiveAlert[] = [];
  let kindIndex = Math.floor(rng() * kinds.length);
  for (const creneau of [...choisis].sort((a, b) => a - b)) {
    const at = premier + creneau * LIVE.alerts.minGapMs;
    kindIndex = (kindIndex + 1 + Math.floor(rng() * (kinds.length - 1))) % kinds.length;
    const kind = kinds[kindIndex];
    alerts.push({
      id: `${day}-${palier}-${creneau}-${kind.id}`,
      at,
      kindId: kind.id,
      label: kind.label,
      hint: kind.hint,
      // Une bulle n'attend jamais plus loin que la fin du direct : ce qui reste
      // à l'écran à la seconde 20 ne compte plus.
      lifeMs: Math.min(kind.lifeMs, durationMs - at),
      leftPercent: 8 + Math.round(rng() * 62),
      topPercent: 10 + Math.round(rng() * 58),
    });
  }

  return { day, tierIndex: palier, durationMs, chat, alerts };
}

/** Les lignes de chat visibles à un instant donné. */
export function visibleChat(plan: LivePlan, atMs: number): LiveChatLine[] {
  return plan.chat.filter((ligne) => atMs >= ligne.at && atMs - ligne.at < LIVE_CHAT_HOLD_MS);
}

/** Les bulles encore attrapables à un instant donné. */
export function visibleAlerts(plan: LivePlan, atMs: number): LiveAlert[] {
  return plan.alerts.filter((bulle) => atMs >= bulle.at && atMs < bulle.at + bulle.lifeMs);
}

/** Le bilan du live, à partir des bulles attrapées. */
export function resolveLive(plan: LivePlan, caughtIds: readonly string[]): LiveRecap {
  const prises = new Set(caughtIds);
  const total = plan.alerts.length;
  const caught = plan.alerts.filter((bulle) => prises.has(bulle.id)).length;
  const missed = total - caught;
  const ratioPermille = total === 0 ? 1000 : Math.round((caught * 1000) / total);

  const headline =
    total === 0
      ? "Ton live : personne n'est passé — le chat a tenu compagnie."
      : caught === total
        ? `Ton live : ${total} sur ${total} — tu n'as rien laissé passer.`
        : caught === 0
          ? `Ton live : 0 sur ${total} — elles sont toutes passées inaperçues.`
          : `Ton live : ${caught} sur ${total}.`;

  // La phrase du chat parle du **chat**, pas des bulles : dire « le chat s'est
  // endormi » parce qu'on a raté une bulle serait un mensonge, et ce jeu n'en
  // raconte pas. Elle se lit sur ce qui a réellement été écrit.
  const messages = plan.chat.length;
  const chatLine =
    messages === 0
      ? "Personne n'a écrit une seule ligne."
      : messages < 5
        ? "Le chat était calme."
        : messages < 12
          ? "Ça discutait tranquillement."
          : "Le chat n'a pas arrêté.";

  return { caught, missed, total, ratioPermille, headline, chatLine };
}

/** Les paliers de notoriété, réexportés pour l'écran (une seule source). */
export const LIVE_TIERS = TIERS;
