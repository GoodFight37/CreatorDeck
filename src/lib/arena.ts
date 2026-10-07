/**
 * L'Arena : cinq cartes alignées contre la réalité.
 *
 * Le jeu a un tirage, un Atelier, des échanges. Il n'avait pas d'épreuve — un
 * endroit où la collection ne suffit pas, où il faut **parier sur le présent**.
 * L'Arena est ce pari : on aligne cinq cartes de son classeur, il en faut au
 * moins une dont le créateur streame **maintenant**, et le score est la somme
 * des viewers réels à cet instant. Une Légendaire en plus des quatre autres est
 * refusée : sans plafond, la meilleure arène serait toujours les cinq raretés
 * les plus hautes, et il n'y aurait rien à décider.
 *
 * Ce module est **pur** : il ne lit ni le réseau, ni la partie, ni l'horloge
 * autrement que par un `now` passé en paramètre. C'est ce qui permet de
 * vérifier les règles (`src/lib/arena.test.ts`) et de les rejouer côté serveur
 * (`0018_arena.sql`) en sachant qu'elles disent la même chose.
 *
 * Trois idées, dans l'ordre :
 *
 *   1. **la semaine** commence le lundi à 6 h UTC — le même « jour de jeu » que
 *      les missions et la série, décalé de six heures. Sa clé est la date de ce
 *      lundi, publiée telle quelle (« 2026-10-05 »).
 *   2. **le week-end**, la même arène se joue en draft : cinq emplacements,
 *      trois propositions chacun, on en garde une. Ouvert du samedi 6 h UTC au
 *      lundi 6 h UTC : quarante-huit heures.
 *   3. **le score** est la somme des viewers des créateurs alignés qui streament.
 *      Un créateur hors direct vaut zéro : l'arène paie le direct, pas la
 *      collection.
 */
import arenaData from "@/data/arena.json";
import type { PlayerState } from "@/lib/game-engine";
import { CREATOR_BY_SLUG, type Rarity } from "@/lib/catalog";

type ArenaConfig = {
  lineup: { size: number; maxLegendary: number; requiresLive: boolean };
  week: { startHourUtc: number; startWeekday: number };
  rewards: { hourglassesByRank: Record<string, number>; emblemTop: number };
  draft: { startWeekday: number; startHourUtc: number; choicesPerSlot: number; slotCount: number };
};

const CONFIG = arenaData as unknown as ArenaConfig;

/** Cinq cartes par équipe — la taille est dans les données, pas dans le code. */
export const ARENA_LINEUP_SIZE = CONFIG.lineup.size;
/** Au plus une Légendaire alignée. */
export const ARENA_MAX_LEGENDARY = CONFIG.lineup.maxLegendary;
/** Au moins un créateur qui streame maintenant. */
export const ARENA_REQUIRES_LIVE = CONFIG.lineup.requiresLive;
/** Le décalage du « jour de jeu » : la journée commence à 6 h UTC. */
export const ARENA_DAY_SHIFT_MS = CONFIG.week.startHourUtc * 60 * 60 * 1000;

/** Rareté alignée → ce qu'elle coûte au plafond de Légendaires. */
function isLegendary(rarity: Rarity): boolean {
  return rarity === "legendary";
}

/** Date UTC (ms) décalée du « jour de jeu » : 6 h UTC devient minuit. */
function gameDayMs(now: number): number {
  return now - ARENA_DAY_SHIFT_MS;
}

/** Lundi 00:00 UTC (décalé) de la semaine qui contient `now`. */
function weekStartMs(now: number): number {
  const shifted = new Date(gameDayMs(now));
  // getUTCDay : 0 = dimanche … 6 = samedi. Le lundi recule de `back` jours.
  const back = (shifted.getUTCDay() + 6) % 7;
  const monday = Date.UTC(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate() - back,
  );
  return monday + ARENA_DAY_SHIFT_MS;
}

/** « 2026-10-05 » : la clé publiée de la semaine d'arène qui contient `now`. */
export function arenaWeekKey(now = Date.now()): string {
  return new Date(weekStartMs(now)).toISOString().slice(0, 10);
}

/** Instant (ms) où la semaine d'arène se referme et où les rangs se figent. */
export function arenaWeekEndsAt(now = Date.now()): number {
  return weekStartMs(now) + 7 * 24 * 60 * 60 * 1000;
}

/** Instant (ms) où la semaine d'arène a commencé. */
export function arenaWeekStartAt(now = Date.now()): number {
  return weekStartMs(now);
}

/**
 * Le brouillon du week-end : ouvert du samedi 6 h UTC au lundi 6 h UTC.
 *
 * La fenêtre est **déduite de la même horloge** que la semaine : samedi et
 * dimanche du jour de jeu. `closesAt` tombe donc exactement sur le début de la
 * semaine suivante — le draft rend son verdict quand le classement se fige.
 */
export function arenaDraftWindow(
  now = Date.now(),
): { open: boolean; closesAt: number; opensAt: number } {
  const shifted = new Date(gameDayMs(now));
  const day = shifted.getUTCDay();
  // `getUTCDay()` rend 0 pour dimanche : le lendemain du samedi est (6 + 1) % 7,
  // pas 7. Écrire `startWeekday + 1` fermait le draft tout le dimanche.
  const open = day === CONFIG.draft.startWeekday || day === (CONFIG.draft.startWeekday + 1) % 7;
  // Le samedi de cette semaine (décalée), puis le lundi qui suit.
  const back = (day - CONFIG.draft.startWeekday + 7) % 7;
  const saturday = Date.UTC(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate() - back,
  );
  const opensAt = saturday + ARENA_DAY_SHIFT_MS;
  return { open, opensAt, closesAt: opensAt + 2 * 24 * 60 * 60 * 1000 };
}

/**
 * Les cinq cartes alignées sont-elles recevables ?
 *
 * Renvoie la liste des raisons de refuser, en français — vide si tout va bien.
 * L'écran affiche ces phrases telles quelles, et le serveur les recalcule : le
 * client ne peut pas envoyer une équipe que le serveur n'aurait pas validée.
 */
export function arenaLineupProblems(
  slugs: readonly string[],
  options: {
    /** Ce que le joueur possède vraiment (`ownedSlugs`). */
    owned: ReadonlySet<string>;
    /** Les `login` des créateurs qui streament, à cet instant. */
    liveLogins: ReadonlySet<string>;
  },
): string[] {
  const problems: string[] = [];

  if (slugs.length !== ARENA_LINEUP_SIZE) {
    problems.push(`Une arène, c'est ${ARENA_LINEUP_SIZE} cartes — pas ${slugs.length}.`);
  }
  if (new Set(slugs).size !== slugs.length) {
    problems.push("Deux fois la même carte dans l'arène : non.");
  }
  for (const slug of slugs) {
    const creator = CREATOR_BY_SLUG.get(slug);
    if (!creator) {
      problems.push("Une carte de l'arène n'existe pas au catalogue.");
      break;
    }
    if (!options.owned.has(slug)) {
      problems.push(`Tu n'as pas la carte de ${creator.displayName} : elle ne peut pas entrer dans l'arène.`);
      break;
    }
  }

  const creators = slugs
    .map((slug) => CREATOR_BY_SLUG.get(slug))
    .filter((creator): creator is NonNullable<typeof creator> => Boolean(creator));
  const legendaries = creators.filter((creator) => isLegendary(creator.rarity)).length;
  if (legendaries > ARENA_MAX_LEGENDARY) {
    problems.push(
      `Une seule Légendaire par arène (il y en a ${legendaries}) : c'est le choix qui fait l'arène.`,
    );
  }
  if (ARENA_REQUIRES_LIVE && !creators.some((creator) => options.liveLogins.has(creator.login))) {
    problems.push("Il faut au moins un créateur en direct dans l'arène.");
  }

  return problems;
}

/** Le détail du score : une ligne par carte alignée. */
export type ArenaLine = {
  slug: string;
  displayName: string;
  /** Le créateur streame-t-il à cet instant ? */
  live: boolean;
  /** Ses viewers réels, 0 s'il ne streame pas. */
  viewers: number;
};

export type ArenaScore = {
  total: number;
  /** Combien de cartes alignées étaient en direct. */
  liveCount: number;
  lines: ArenaLine[];
};

/**
 * Le score d'une arène : la somme des viewers réels, tout simplement.
 *
 * `viewersByLogin` vient du cache du direct (le serveur, en production). Une
 * carte dont le créateur n'y figure pas vaut zéro — elle n'est pas pénalisée,
 * elle est simplement absente du direct.
 */
export function arenaScore(
  slugs: readonly string[],
  viewersByLogin: ReadonlyMap<string, number>,
): ArenaScore {
  const lines: ArenaLine[] = [];
  for (const slug of new Set(slugs)) {
    const creator = CREATOR_BY_SLUG.get(slug);
    if (!creator) continue;
    const viewers = viewersByLogin.get(creator.login) ?? 0;
    lines.push({
      slug,
      displayName: creator.displayName,
      live: viewers > 0,
      viewers: Math.max(0, Math.round(viewers)),
    });
  }
  return {
    total: lines.reduce((sum, line) => sum + line.viewers, 0),
    liveCount: lines.filter((line) => line.live).length,
    lines: lines.sort((a, b) => b.viewers - a.viewers),
  };
}

/**
 * La récompense hebdomadaire d'un rang figé.
 *
 * Les paliers viennent des données (`hourglassesByRank`) : le 1er, le 2e, le 3e,
 * puis les dix premiers. Hors du top 10, la semaine ne rapporte rien — mais elle
 * ne coûte rien non plus, et l'emblème se gagne en y entrant une fois.
 */
export function arenaHourglasses(rank: number | null | undefined): number {
  if (!rank || rank < 1) return 0;
  let best = 0;
  for (const [threshold, reward] of Object.entries(CONFIG.rewards.hourglassesByRank)) {
    if (rank <= Number(threshold)) best = Math.max(best, reward);
  }
  return best;
}

/** L'emblème d'arène : une semaine terminée dans le top 10. */
export function arenaEmblemEarned(rank: number | null | undefined): boolean {
  return Boolean(rank && rank >= 1 && rank <= CONFIG.rewards.emblemTop);
}

/** Le seuil publié du top qui ouvre l'emblème (« dix premiers »). */
export const ARENA_EMBLEM_TOP = CONFIG.rewards.emblemTop;
/** Combien de propositions par emplacement, en draft. */
export const ARENA_DRAFT_CHOICES = CONFIG.draft.choicesPerSlot;

/**
 * Crédite une récompense d'arène sur la partie locale.
 *
 * Les points, l'XP et les sabliers vivent sur l'appareil (c'est le choix du
 * jeu : le cloud garde la collection, pas la monnaie). Ce que le serveur
 * enregistre, c'est **le fait d'avoir encaissé** — une semaine ne se paie
 * qu'une fois, même en changeant de téléphone.
 *
 * La fonction est pure : elle ne touche pas `state`, elle en rend un nouveau.
 * Un rang hors du top 10 ne rapporte rien, et zéro sablier rend la partie telle
 * quelle (le composant qui appelle n'a pas à tester le cas).
 */
export function applyArenaReward(
  state: PlayerState,
  hourglasses: number,
  now = Date.now(),
): PlayerState {
  const gained = Math.max(0, Math.floor(hourglasses));
  if (gained === 0) return state;
  return {
    ...state,
    updatedAt: now,
    hourglasses: state.hourglasses + gained,
  };
}

/** « 2026-09-28 » → « la semaine du 28 septembre ». Pour les phrases de l'écran. */
export function arenaWeekLabel(week: string): string {
  const date = new Date(`${week}T06:00:00Z`);
  if (Number.isNaN(date.getTime())) return week;
  const label = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "UTC" }).format(date);
  return `la semaine du ${label}`;
}

/** « 1er », « 2e » : le rang écrit pour être lu, jamais « 1ᵉ ». */
export function arenaRankLabel(rank: number): string {
  return rank === 1 ? "1er" : `${rank}e`;
}
