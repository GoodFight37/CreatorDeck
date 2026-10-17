/**
 * « Qui est en direct dans mon cercle » : le second verbe du jeu (étape 2).
 *
 * Logique pure, sans React ni horloge : on lui donne le cercle, l'état du
 * direct et l'heure, il répond par **un seul état** que l'accueil sait montrer.
 *
 * Aucune règle nouvelle ici. Le bénéfice de jeu annoncé est le bonus Direct
 * déjà publié (`DIRECT_BONUS`, appliqué par le moteur et par le serveur) : un
 * créateur qui streame pèse plus lourd dans sa rareté et sa carte peut sortir
 * en variante Live. Les textes lisent ces valeurs, ils ne les recopient pas.
 *
 * La règle de prudence est celle de `live.ts` : un « en direct » faux est pire
 * que rien. Donnée absente, périmée ou illisible → on le dit, sans badge.
 */
import { CREATOR_BY_SLUG, type Creator } from "@/lib/catalog";
import { isLiveFresh, type LiveSnapshot, type LiveStream } from "@/lib/live";
import { DIRECT_BONUS } from "@/lib/pull-rates";

export type CircleLiveEntry = {
  creator: Creator;
  stream: LiveStream;
  /** La carte est déjà dans la collection du joueur. */
  owned: boolean;
};

export type CircleLiveState =
  /** Aucune chaîne du cercle n'est reconnue dans le catalogue. */
  | { kind: "empty" }
  /** Cette version de l'app ne lit pas le direct (build sans compte en ligne). */
  | { kind: "unavailable" }
  /** Première lecture en cours : on ne sait pas encore. */
  | { kind: "checking" }
  /** La lecture a échoué et rien de frais n'est disponible. */
  | { kind: "offline" }
  /** La dernière lecture est trop vieille pour être crue. */
  | { kind: "stale"; ageMs: number }
  /** Lecture fraîche : personne du cercle ne streame. */
  | { kind: "quiet"; checkedAt: number }
  /** Lecture fraîche : au moins une chaîne du cercle streame. */
  | { kind: "live"; entries: CircleLiveEntry[]; checkedAt: number };

/**
 * L'état du direct pour le cercle. Les chaînes en direct gardent l'ordre du
 * cercle (la préférée d'abord) : c'est le classement du joueur, pas celui de
 * Twitch.
 */
export function circleLiveState(
  circle: readonly string[],
  live: LiveSnapshot,
  owned: ReadonlySet<string>,
  now: number,
): CircleLiveState {
  const creators = circle
    .map((slug) => CREATOR_BY_SLUG.get(slug))
    .filter((creator): creator is Creator => creator !== undefined);
  if (creators.length === 0) return { kind: "empty" };
  if (!live.configured) return { kind: "unavailable" };

  const fresh = !live.stale && isLiveFresh(live.refreshedAt, now);
  if (!fresh) {
    if (live.refreshedAt === null) {
      // Jamais rien lu : soit on attend la première réponse, soit elle a échoué.
      return live.error ? { kind: "offline" } : { kind: "checking" };
    }
    if (live.error) return { kind: "offline" };
    // Une relecture est peut-être en route, mais l'écran ne doit pas mentir en attendant.
    return { kind: "stale", ageMs: Math.max(0, now - live.refreshedAt) };
  }

  const checkedAt = live.refreshedAt as number;
  const entries: CircleLiveEntry[] = [];
  for (const creator of creators) {
    const stream = live.byLogin.get(creator.login.toLowerCase());
    if (stream) entries.push({ creator, stream, owned: owned.has(creator.slug) });
  }
  return entries.length ? { kind: "live", entries, checkedAt } : { kind: "quiet", checkedAt };
}

/** « ibai est en direct » ou « 3 de tes chaînes sont en direct ». */
export function circleLiveHeadline(entries: readonly CircleLiveEntry[]): string {
  if (entries.length === 1) return `${entries[0].creator.displayName} est en direct`;
  return `${entries.length} de tes chaînes sont en direct`;
}

/** « × 1,5 » : le multiplicateur publié, écrit à la française. */
export function directBiasLabel(): string {
  const bias = DIRECT_BONUS.creatorBias > 0 ? DIRECT_BONUS.creatorBias : 1;
  return `×${String(bias).replace(".", ",")}`;
}

/** « 20 % » : la chance de variante Live publiée. */
export function directLiveChanceLabel(): string {
  const percent = Math.round(DIRECT_BONUS.livePermille / 10);
  return `${percent} %`;
}

/**
 * Le bénéfice de jeu, dit une fois et tel qu'il est publié. Valable pour tout
 * créateur en direct, donc pour ceux du cercle : rien n'est promis de plus.
 */
export function directBenefitLine(count: number): string {
  const who = count > 1 ? "leurs cartes tombent" : "sa carte tombe";
  return `Pendant le direct, ${who} plus souvent dans le Live Drop (${directBiasLabel()}) et peu${count > 1 ? "vent" : "t"} sortir en version Live (${directLiveChanceLabel()}).`;
}

/** « depuis 1 h 12 », « depuis 8 min », ou rien si Twitch n'a pas donné l'heure. */
export function liveSinceLabel(startedAt: string | null, now: number): string | null {
  if (!startedAt) return null;
  const start = Date.parse(startedAt);
  if (!Number.isFinite(start) || start > now) return null;
  const minutes = Math.floor((now - start) / 60_000);
  if (minutes < 1) return "à l’instant";
  if (minutes < 60) return `depuis ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const leftover = minutes % 60;
  return `depuis ${hours} h${leftover ? ` ${String(leftover).padStart(2, "0")}` : ""}`;
}

/** « vérifié à 18:04 » : l'heure locale de la dernière lecture fraîche. */
export function checkedAtLabel(checkedAt: number): string {
  const date = new Date(checkedAt);
  return `vérifié à ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

/**
 * La phrase d'état de la rangée « Ton cercle » quand personne n'est montré en
 * direct. `null` pour l'état « live » (la carte du moment parle à sa place).
 */
export function circleLiveStatusLine(state: CircleLiveState): string | null {
  switch (state.kind) {
    case "live":
    case "empty":
      return null;
    case "quiet":
      return `Personne de ton cercle en direct · ${checkedAtLabel(state.checkedAt)}`;
    case "checking":
      return "On regarde qui est en direct…";
    case "offline":
      return "Direct indisponible : pas de connexion";
    case "stale": {
      const minutes = Math.max(1, Math.round(state.ageMs / 60_000));
      const age = minutes >= 120 ? `${Math.floor(minutes / 60)} h` : `${minutes} min`;
      return `Direct non vérifié depuis ${age}`;
    }
    case "unavailable":
      return "Le direct n’est pas suivi dans cette version";
  }
}

/** Les états où un nouvel essai a un sens (le joueur peut relancer la lecture). */
export function canRetryLive(state: CircleLiveState): boolean {
  return state.kind === "offline" || state.kind === "stale";
}

/** Lien de la chaîne sur Twitch. */
export function twitchUrl(login: string): string {
  return `https://www.twitch.tv/${encodeURIComponent(login)}`;
}
