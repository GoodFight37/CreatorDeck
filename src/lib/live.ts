/**
 * Le direct : qui streame maintenant.
 *
 * Les données viennent d'une table que le serveur remplit (voir
 * `supabase/migrations/0007_direct.sql` et `supabase/functions/refresh-live`) :
 * la clé secrète Twitch ne doit jamais entrer dans l'app, et 1 000 créateurs
 * interrogés une fois pour tous les joueurs coûtent dix requêtes Helix au lieu
 * d'un appel par joueur.
 *
 * Trois règles tenues ici, parce qu'un badge « en direct » faux est pire que
 * pas de badge du tout :
 *
 *   1. **Rien au-delà de dix minutes.** Passé ce délai, l'app considère qu'elle
 *      ne sait pas qui est en direct, et se tait (`isLiveFresh`).
 *   2. **Le cache local sert d'affichage immédiat**, pas de vérité : il est daté
 *      comme le reste, et la première lecture réseau le remplace.
 *   3. **Un échec ne casse rien** : pas de cloud, pas de table, pas de réseau →
 *      l'écran est simplement comme avant.
 *
 * Le module ne fait aucun effet de bord à l'import : la lecture du cache et les
 * appels réseau vivent dans `live-store.ts`.
 */

/** Une diffusion en cours, telle que le serveur l'a publiée. */
export type LiveStream = {
  /** `login` Twitch en minuscules : la clé qui relie la diffusion à une carte. */
  login: string;
  displayName: string;
  gameName: string;
  title: string;
  viewers: number;
  /** Date de début du direct (chaîne ISO), `null` si Twitch ne l'a pas donnée. */
  startedAt: string | null;
};

/** L'état complet, tel que les composants le lisent. */
export type LiveSnapshot = {
  /** Le direct par `login` (minuscules) : `byLogin.get(creator.login)`. */
  byLogin: ReadonlyMap<string, LiveStream>;
  /** Combien de créateurs du catalogue sont en direct. */
  count: number;
  /** Date (ms) de la dernière publication serveur, `null` si on ne sait pas. */
  refreshedAt: number | null;
  /**
   * Les données sont trop vieilles pour être montrées (plus de dix minutes).
   * Calculé à chaque publication plutôt que lu à l'horloge par chaque écran :
   * un composant n'a pas besoin de savoir l'heure pour se taire.
   */
  stale: boolean;
  loading: boolean;
  /** Build avec cloud (sans cloud, il n'y a pas de table à lire). */
  configured: boolean;
  error: string | null;
};

/** Au-delà, on n'affiche plus rien : le direct est trop vieux pour être vrai. */
export const LIVE_TTL_MS = 10 * 60 * 1000;
/** Fréquence de rafraîchissement tant que l'app est ouverte. */
export const LIVE_REFRESH_MS = 3 * 60 * 1000;
/** Délai laissé à la fonction serveur pour interroger Twitch, avant relecture. */
export const LIVE_SETTLE_MS = 6_000;

export const LIVE_CACHE_KEY = "creatordeck.live.v1";

/** État neutre : sert aussi de snapshot serveur (pré-rendu statique). */
export const EMPTY_LIVE: LiveSnapshot = Object.freeze({
  byLogin: new Map<string, LiveStream>(),
  count: 0,
  refreshedAt: null,
  stale: true,
  loading: false,
  configured: false,
  error: null,
});

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asText(value: unknown): string {
  return typeof value === "string" ? value : typeof value === "number" ? String(value) : "";
}

function asCount(value: unknown): number {
  const number = typeof value === "number" ? value : Number.parseInt(asText(value), 10);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
}

/**
 * Lit la réponse de `live_streams` (PostgREST, donc en `snake_case`).
 *
 * Tolérant par construction : une ligne sans `login` est ignorée, un compteur
 * en texte devient un nombre, une date Absente devient `null`. Un cache abîmé
 * ne doit pas casser l'écran — au pire, il n'affiche rien.
 */
export function parseLiveStreams(payload: unknown): LiveStream[] {
  if (!Array.isArray(payload)) return [];
  const streams: LiveStream[] = [];
  for (const row of payload) {
    const record = asRecord(row);
    if (!record) continue;
    const login = asText(record.login).trim().toLowerCase();
    if (!login) continue;
    const startedAt = asText(record.started_at).trim();
    streams.push({
      login,
      displayName: asText(record.display_name).trim() || login,
      gameName: asText(record.game_name).trim(),
      title: asText(record.title).trim(),
      viewers: asCount(record.viewers),
      startedAt: startedAt || null,
    });
  }
  return streams;
}

/**
 * Lit l'horodatage de `live_state` (une seule ligne). Une table vide — ou une
 * date illisible — donne `null` : « on ne sait pas », pas « c'est vieux ».
 */
export function parseLiveRefreshedAt(payload: unknown): number | null {
  const row = Array.isArray(payload) ? asRecord(payload[0]) : asRecord(payload);
  const raw = row ? asText(row.refreshed_at) : "";
  if (!raw) return null;
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Indexe les diffusions par `login`, pour interroger une carte en O(1). */
export function indexLive(streams: LiveStream[]): Map<string, LiveStream> {
  const index = new Map<string, LiveStream>();
  for (const stream of streams) index.set(stream.login, stream);
  return index;
}

/**
 * Le direct est-il assez récent pour être montré ? Sans date connue, la réponse
 * est non : mieux vaut ne rien dire que dire une vieillerie.
 */
export function isLiveFresh(
  refreshedAt: number | null,
  now: number,
  ttl: number = LIVE_TTL_MS,
): boolean {
  if (refreshedAt === null) return false;
  const age = now - refreshedAt;
  return age >= 0 && age < ttl;
}

/**
 * Le direct d'un créateur, ou `null`. `null` couvre les trois cas qui ne
 * doivent **jamais** afficher de badge : pas de donnée, donnée périmée, et
 * créateur pas en direct.
 */
export function liveFor(
  snapshot: LiveSnapshot,
  login: string | undefined,
  now: number,
): LiveStream | null {
  if (!login || snapshot.stale || !isLiveFresh(snapshot.refreshedAt, now)) return null;
  return snapshot.byLogin.get(login.toLowerCase()) ?? null;
}

/** Espace fine insécable : « 4 120 », comme un compteur français. */
const THIN = "\u202f";

/** Un nombre de spectateurs lisible : `4120` → « 4 120 ». */
export function formatViewers(viewers: number): string {
  const value = Math.max(0, Math.floor(viewers));
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, THIN);
}

/** « 4 120 spectateurs », « 1 spectateur », « En direct » si le compte manque. */
export function viewersLabel(viewers: number): string {
  const value = Math.max(0, Math.floor(viewers));
  if (value <= 0) return "En direct";
  return `${formatViewers(value)} spectateur${value > 1 ? "s" : ""}`;
}

type StoredCache = { streams: LiveStream[]; refreshedAt: number | null };

type LiveCacheStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

/**
 * Le cache local : ce qui permet d'afficher un direct tout de suite à
 * l'ouverture, sans attendre le réseau. Il porte sa date, donc il ne peut pas
 * se faire passer pour du frais.
 */
export function readLiveCache(storage: LiveCacheStorage | null): StoredCache | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(LIVE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    const record = asRecord(parsed);
    if (!record) return null;
    const streams = parseLiveStreams(record.streams);
    const refreshedAt = typeof record.refreshedAt === "number" ? record.refreshedAt : null;
    return { streams, refreshedAt };
  } catch {
    return null;
  }
}

export function writeLiveCache(
  storage: LiveCacheStorage | null,
  streams: LiveStream[],
  refreshedAt: number | null,
): void {
  if (!storage) return;
  try {
    storage.setItem(LIVE_CACHE_KEY, JSON.stringify({ streams, refreshedAt }));
  } catch {
    // Quota ou stockage refusé : le cache est un confort, jamais une nécessité.
  }
}
