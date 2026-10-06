/**
 * refresh-live — le seul endroit qui connaît le secret Twitch.
 *
 * Ce que fait la fonction, dans l'ordre :
 *   1. elle regarde depuis quand le cache n'a pas été rafraîchi (`live_state`) ;
 *      si c'est plus récent que 90 secondes, elle s'arrête là — c'est ce qui
 *      protège le quota Twitch, puisque n'importe qui peut l'appeler ;
 *   2. elle lit les `login` du catalogue (`creators`, via le catalogue SQL) ;
 *   3. elle demande un jeton d'application à Twitch
 *      (`client_credentials` : la clé secrète ne sort jamais d'ici) ;
 *   4. elle interroge Helix `GET /helix/streams` par lots de 100 créateurs —
 *      soit 10 requêtes pour 1 000 créateurs ;
 *   5. elle publie la liste en une fois (`live_publish`), ce qui efface au
 *      passage les diffusions terminées.
 *
 * Pourquoi ici et pas dans l'app : un APK se dézippe. Une clé secrète embarquée
 * serait publique, et n'importe qui pourrait se faire passer pour le jeu.
 *
 * Déploiement (voir `docs/cloud-supabase.md` § Direct) :
 *   * secrets de la fonction : `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET` ;
 *   * « Verify JWT » peut rester **désactivé** : la fonction ne publie que des
 *     données publiques et se limite elle-même à un rafraîchissement par
 *     90 secondes. La protéger par un jeton n'apporterait rien.
 */

const CLIENT_ID = Deno.env.get("TWITCH_CLIENT_ID") ?? "";
const CLIENT_SECRET = Deno.env.get("TWITCH_CLIENT_SECRET") ?? "";
const SUPABASE_URL = (Deno.env.get("SUPABASE_URL") ?? "").replace(/\/+$/, "");
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

/** Une requête Helix toutes les 90 secondes au plus, pour tout le monde. */
const MIN_INTERVAL_MS = 90_000;
/** Helix accepte 100 `user_login` par appel. */
const BATCH = 100;
/** Taille des pages lues dans `creators` (PostgREST plafonne à 1000 par défaut). */
const PAGE = 1000;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

/** Appel PostgREST avec le rôle de service (contourne RLS : on est le serveur). */
async function rest(path: string, init: RequestInit = {}): Promise<unknown> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_ROLE,
      Authorization: `Bearer ${SERVICE_ROLE}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!response.ok) {
    throw new Error(`PostgREST ${path} → ${response.status} ${(await response.text()).slice(0, 200)}`);
  }
  return response.json();
}

// Le jeton d'application vit une soixantaine de jours : on le garde en mémoire
// tant que l'instance est chaude, ce qui évite un aller-retour à chaque appel.
let tokenCache: { token: string; expiresAt: number } | null = null;

async function appToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt - 60_000) return tokenCache.token;
  const response = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: "client_credentials",
    }),
  });
  if (!response.ok) {
    throw new Error(`Twitch (jeton) → ${response.status} ${(await response.text()).slice(0, 200)}`);
  }
  const data = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) throw new Error("Twitch (jeton) : réponse sans access_token");
  tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
  return tokenCache.token;
}

type StreamRow = {
  login: string;
  twitch_id: string;
  display_name: string;
  game_name: string;
  title: string;
  viewers: number;
  started_at: string;
  thumbnail: string;
};

/** Les `login` du catalogue, page par page (PostgREST plafonne la réponse). */
async function catalogueLogins(): Promise<string[]> {
  const logins: string[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const page = (await rest(
      `creators?select=login&login=not.is.null&order=rank.asc&limit=${PAGE}&offset=${offset}`,
    )) as { login: string | null }[];
    for (const row of page) {
      if (row.login) logins.push(row.login);
    }
    if (page.length < PAGE) return logins;
  }
}

async function helixStreams(logins: string[], token: string): Promise<StreamRow[]> {
  const streams: StreamRow[] = [];
  for (let index = 0; index < logins.length; index += BATCH) {
    const query = logins
      .slice(index, index + BATCH)
      .map((login) => `user_login=${encodeURIComponent(login)}`)
      .join("&");
    const response = await fetch(`https://api.twitch.tv/helix/streams?first=${BATCH}&${query}`, {
      headers: { "Client-ID": CLIENT_ID, Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      throw new Error(`Twitch (streams) → ${response.status} ${(await response.text()).slice(0, 200)}`);
    }
    const page = (await response.json()) as { data?: Record<string, unknown>[] };
    for (const stream of page.data ?? []) {
      const login = String(stream.user_login ?? "").toLowerCase();
      if (!login) continue;
      streams.push({
        login,
        twitch_id: String(stream.user_id ?? ""),
        display_name: String(stream.user_name ?? ""),
        game_name: String(stream.game_name ?? ""),
        title: String(stream.title ?? ""),
        viewers: Number(stream.viewer_count ?? 0) || 0,
        started_at: String(stream.started_at ?? ""),
        thumbnail: String(stream.thumbnail_url ?? "")
          .replace("{width}", "320")
          .replace("{height}", "180"),
      });
    }
  }
  return streams;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json({ error: "Méthode attendue : POST." }, 405);
  if (!CLIENT_ID || !CLIENT_SECRET) {
    return json(
      {
        error:
          "TWITCH_CLIENT_ID et TWITCH_CLIENT_SECRET sont absents des secrets de cette fonction.",
      },
      500,
    );
  }
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return json({ error: "SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY absent de l'environnement." }, 500);
  }

  const force = new URL(req.url).searchParams.get("force") === "1";

  try {
    const state = (await rest("live_state?id=eq.true&select=refreshed_at,streams")) as {
      refreshed_at: string;
      streams: number;
    }[];
    const refreshedAt = state[0]?.refreshed_at ? Date.parse(state[0].refreshed_at) : 0;
    const age = Date.now() - refreshedAt;
    if (!force && Number.isFinite(age) && age < MIN_INTERVAL_MS) {
      return json({ skipped: true, age_ms: age, streams: state[0]?.streams ?? 0 });
    }

    const logins = await catalogueLogins();
    if (!logins.length) {
      return json({ error: "Le catalogue est vide : les logins manquent dans public.creators." }, 500);
    }

    const token = await appToken();
    const streams = await helixStreams(logins, token);
    const published = (await rest("rpc/live_publish", {
      method: "POST",
      body: JSON.stringify({
        p_streams: streams,
        p_note: `helix · ${logins.length} logins vérifiés`,
      }),
    })) as Record<string, unknown>;

    // Le compte ne s'affiche nulle part : c'est un journal pour l'onglet Logs.
    console.log(`refresh-live : ${streams.length} en direct sur ${logins.length} vérifiés`);
    return json({ ok: true, checked: logins.length, live: streams.length, published });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`refresh-live : ${message}`);
    return json({ error: message }, 500);
  }
});
