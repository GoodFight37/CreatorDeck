/**
 * Edge Function `notify-live` — réveiller le téléphone quand un type passe en direct.
 *
 * Le partage des rôles :
 *
 *   * la **base** décide qui prévenir (`push_targets()`, `0023_notifications.sql`) :
 *     épinglé ou carte possédée, direct de moins de 30 minutes, une notification
 *     par heure et par joueur, six heures minimum avant de relancer le même
 *     créateur. Cette fonction ne rejoue aucune de ces règles : elle demande la
 *     liste et l'envoie ;
 *   * **cette fonction** parle à Firebase (FCM HTTP v1) et nettoie les jetons
 *     que Google déclare morts (appareil désinstallé, jeton révoqué).
 *
 * Pourquoi une Edge Function et pas le SQL : FCM HTTP v1 exige un jeton OAuth2
 * signé par un **compte de service** (clé privée). Un secret n'a rien à faire
 * dans la base ni dans le dépôt. `pg_cron` + `pg_net` feraient le travail, mais
 * il faudrait recopier la clé dans le Vault et signer du RS256 en PL/pgSQL :
 * ici, `crypto.subtle` le fait en dix lignes, sans dépendance.
 *
 * Appels (toujours avec la clé de **service** — la fonction la compare
 * elle-même à son en-tête) :
 *
 *   * `POST` (défaut) : demande la liste et envoie. C'est ce que déclenche
 *     `refresh-live` après avoir publié le direct ;
 *   * `GET ?check=1` : diagnostic, **sans rien envoyer ni rien marquer** —
 *     secrets présents, appareils inscrits, dernières notifications ;
 *   * `GET ?test=1` : envoie une notification de test à **tous** les appareils
 *     inscrits. C'est la porte qui permet de vérifier que Firebase répond sans
 *     attendre qu'un créateur passe en direct.
 *
 * Secrets de la fonction :
 *   * `FCM_SERVICE_ACCOUNT` : le JSON du compte de service Firebase (Console →
 *     Paramètres du projet → Comptes de service → « Générer une nouvelle clé
 *     privée »). Collé tel quel, retours à la ligne compris ;
 *   * `FCM_PROJECT_ID` (facultatif) : si l'identifiant du projet n'est pas
 *     celui du JSON — rare, mais une ligne de diagnostic en moins ;
 *   * **laisser « Verify JWT » désactivé** : la fonction vérifie elle-même
 *     l'en-tête `Authorization` (comme `refresh-live`), et l'activer au portail
 *     peut refuser la clé `sb_secret_…` qui n'est pas un JWT.
 *
 * Déploiement et mise en route : `docs/cloud-supabase.md`, § Notifications.
 */

const SUPABASE_URL = (Deno.env.get("SUPABASE_URL") ?? "").replace(/\/+$/, "");

/**
 * Les clés de service du projet, telles que Supabase les donne à la fonction.
 *
 * Deux nomenclatures coexistent, et **on accepte les deux** : l'ancienne
 * variable `SUPABASE_SERVICE_ROLE_KEY` (un JWT `eyJ…`, `role: service_role`) et
 * la nouvelle `SUPABASE_SECRET_KEYS` (un objet JSON de clés `sb_secret_…`). Un
 * projet récent peut n'avoir que la seconde — c'est le cas ici, et une fonction
 * qui n'en acceptait qu'une refusait la mauvaise clé avec un message qui
 * n'expliquait rien (vécu le 7 octobre : la clé legacy `service_role` était
 * refusée alors que la fonction marchait très bien).
 */
type ServerKey = { value: string; source: string };

function serverKeys(): ServerKey[] {
  const keys: ServerKey[] = [];
  const legacy = (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "").trim();
  if (legacy) keys.push({ value: legacy, source: "SUPABASE_SERVICE_ROLE_KEY (legacy)" });

  for (const name of ["SUPABASE_SECRET_KEYS", "SUPABASE_SECRET_KEY"]) {
    const raw = (Deno.env.get(name) ?? "").trim();
    if (!raw) continue;
    if (name === "SUPABASE_SECRET_KEY") {
      keys.push({ value: raw, source: name });
      continue;
    }
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown> | string;
      const values =
        typeof parsed === "string"
          ? [parsed]
          : Object.values(parsed ?? {}).filter((value): value is string => typeof value === "string" && Boolean(value));
      for (const value of values) keys.push({ value, source: name });
    } catch {
      // Variable d'un autre format : on l'ignore plutôt que de tout casser.
    }
  }
  return keys;
}

const SERVER_KEYS = serverKeys();
/** La clé qui sort (appels PostgREST) : la première que Supabase donne. */
const SERVICE_ROLE = SERVER_KEYS[0]?.value ?? "";
/** Un premier aperçu, jamais la clé : sert au diagnostic. */
function keyPrefix(value: string): string {
  return value.startsWith("sb_secret_") ? "sb_secret_…" : value.startsWith("eyJ") ? "eyJ… (JWT legacy)" : "clé inconnue";
}

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
  // Une suppression renvoie 204 : il n'y a rien à lire.
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

// ------------------------------------------------------------- le compte de service

type ServiceAccount = {
  project_id?: string;
  client_email?: string;
  private_key?: string;
};

function serviceAccount(): ServiceAccount | null {
  const projectOverride = (Deno.env.get("FCM_PROJECT_ID") ?? "").trim();
  const raw = Deno.env.get("FCM_SERVICE_ACCOUNT") ?? "";
  if (!raw.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as ServiceAccount;
    if (!parsed.private_key || !parsed.client_email) return null;
    // Le JSON collé dans un champ de secret peut arriver avec des `\n`
    // échappés : on les rend à la vraie vie, sinon la clé est illisible.
    parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
    if (projectOverride) parsed.project_id = projectOverride;
    return parsed;
  } catch {
    return null;
  }
}

/** `base64url` sans dépendance (le seul endroit où on en a besoin). */
function base64url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlText(text: string): string {
  return base64url(new TextEncoder().encode(text));
}

/** Le DER de la clé privée, extrait du PEM (`-----BEGIN PRIVATE KEY-----`…). */
function pemToBytes(pem: string): Uint8Array {
  const body = pem
    .replace(/-----BEGIN [^-]+-----/g, "")
    .replace(/-----END [^-]+-----/g, "")
    .replace(/\s+/g, "");
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

// Le jeton OAuth2 de Google vit une heure : on le garde tant que l'instance est
// chaude, ce qui évite une signature à chaque appel.
let googleToken: { token: string; expiresAt: number } | null = null;

async function oauthToken(account: ServiceAccount): Promise<string> {
  if (googleToken && Date.now() < googleToken.expiresAt - 60_000) return googleToken.token;

  const issued = Math.floor(Date.now() / 1000);
  const signingInput = `${base64urlText(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${base64urlText(
    JSON.stringify({
      iss: account.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: issued,
      exp: issued + 3600,
    }),
  )}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToBytes(account.private_key ?? ""),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(signingInput),
  );
  const assertion = `${signingInput}.${base64url(new Uint8Array(signature))}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!response.ok) {
    throw new Error(`Google (jeton) → ${response.status} ${(await response.text()).slice(0, 200)}`);
  }
  const data = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) throw new Error("Google (jeton) : réponse sans access_token");
  googleToken = { token: data.access_token, expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 };
  return googleToken.token;
}

// ------------------------------------------------------------------- le message

type Target = {
  user_id: string;
  token: string;
  login: string;
  display_name: string;
  viewers: number;
  reason: string;
};

/**
 * Le texte de la notification. Court, factuel, et il dit **pourquoi** : c'est
 * ce qui fait ouvrir l'app (le brief le répète). L'épinglé est nommé comme tel
 * parce que le joueur l'a choisi ; la carte possédée est une occasion, pas une
 * obligation.
 */
export function messageFor(target: Target): { title: string; body: string } {
  const name = target.display_name || target.login;
  const viewers = target.viewers > 0 ? `${new Intl.NumberFormat("fr-FR").format(target.viewers)} spectateurs` : "en direct";
  if (target.reason === "epingle") {
    return { title: "Ton épinglé est en direct", body: `@${target.login} · ${viewers}` };
  }
  return { title: `${name} vient de lancer son live`, body: `${viewers} — tu as des cartes de ce créateur` };
}

type SendResult = { sent: boolean; dead: boolean; error?: string };

/** Envoie une notification. `dead` : le jeton est à jeter (Google l'a révoqué). */
async function send(
  account: ServiceAccount,
  token: string,
  target: Target,
  message: { title: string; body: string },
): Promise<SendResult> {
  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${await oauthToken(account)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          token,
          notification: message,
          // `data` : de quoi ouvrir le bon écran si un jour l'app route les
          // appuis. Aujourd'hui elle ouvre simplement le jeu.
          data: {
            login: target.login,
            viewers: String(target.viewers),
            reason: target.reason,
          },
          android: {
            priority: "high",
            notification: { channel_id: "creatordeck-live", sound: "default" },
          },
        },
      }),
    },
  );

  if (response.ok) return { sent: true, dead: false };

  const raw = (await response.text()).slice(0, 400);
  // 404 / UNREGISTERED : l'appareil n'existe plus. 400 avec SENDER_ID_MISMATCH :
  // le jeton appartient à un autre projet Firebase — même conclusion, on jette.
  const dead = response.status === 404 || /UNREGISTERED|SENDER_ID_MISMATCH/.test(raw);
  return { sent: false, dead, error: `FCM ${response.status} ${raw}` };
}

// ---------------------------------------------------------------------- le service

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST" && req.method !== "GET") {
    return json({ error: "Méthode attendue : GET ou POST." }, 405);
  }

  const params = new URL(req.url).searchParams;
  const bearer = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();

  // Une notification part au nom du jeu : personne d'autre ne déclenche cette
  // porte. C'est plus strict que `refresh-live` (qui accepte la clé anon) et
  // volontairement : ici, il n'y a rien à lire pour un joueur.
  //
  // On accepte **toutes** les clés de service que Supabase donne à la fonction
  // (legacy ou `sb_secret_…`) : le refus ne doit pas dépendre d'une
  // nomenclature, et le message dit laquelle utiliser quand aucune ne colle.
  const accepted = SERVER_KEYS.some((key) => key.value === bearer);
  if (!accepted) {
    const hint = SERVER_KEYS.length
      ? `Clés acceptées ici : ${SERVER_KEYS.map((key) => keyPrefix(key.value)).join(", ")}.`
      : "Aucune clé de service dans l'environnement de la fonction : prends celle du projet (Paramètres → API Keys) — l'onglet « Legacy API keys » (`service_role`) ou la clé secrète `sb_secret_…`.";
    return json({ error: `Réservé au rôle de service. ${hint}` }, 401);
  }

  const account = serviceAccount();

  // --- Diagnostic : ne parle ni à Firebase, ni à `push_targets()` ----------
  // Sans marquage : un diagnostic ne doit pas consommer le tour de notification
  // d'un joueur (le journal, lui, le ferait).
  if (params.get("check") === "1") {
    const [tokens, journal, directs] = await Promise.all([
      rest("push_tokens?select=token,live,updated_at"),
      rest("push_log?select=login,sent_at&order=sent_at.desc&limit=5"),
      rest("live_streams?select=login,viewers,started_at&order=started_at.desc&limit=5"),
    ]);
    const rows = (tokens ?? []) as { live: boolean }[];
    return json({
      ok: true,
      check: true,
      jeton_serveur: {
        // Jamais la clé : de quoi savoir **quoi copier** dans PowerShell.
        acceptees: SERVER_KEYS.map((key) => `${key.source} · ${keyPrefix(key.value)}`),
        sortante: SERVICE_ROLE ? keyPrefix(SERVICE_ROLE) : null,
      },
      compte_de_service: account
        ? { projet: account.project_id ?? null, courriel: account.client_email ?? null }
        : "absent — colle FCM_SERVICE_ACCOUNT (voir docs/cloud-supabase.md § Notifications)",
      appareils: rows.length,
      appareils_actifs: rows.filter((row) => row.live).length,
      dernieres_notifications: journal,
      directs_recents: directs,
    });
  }

  if (!account?.project_id || !account.client_email || !account.private_key) {
    return json(
      {
        error:
          "FCM_SERVICE_ACCOUNT est absent (ou incomplet) : le JSON du compte de service Firebase est nécessaire pour envoyer. Voir docs/cloud-supabase.md § Notifications.",
      },
      503,
    );
  }

  try {
    // --- Test : une notification vers tous les appareils inscrits ----------
    if (params.get("test") === "1") {
      const rows = (await rest("push_tokens?select=token")) as { token: string }[];
      const results = await Promise.all(
        rows.map((row) =>
          send(account, row.token, { user_id: "", token: row.token, login: "creatordeck", display_name: "CreatorDeck", viewers: 0, reason: "test" }, {
            title: "CreatorDeck",
            body: "Les notifications marchent : tu recevras les directs de ta collection ici.",
          }),
        ),
      );
      const sent = results.filter((result) => result.sent).length;
      const dead = rows.filter((_, index) => results[index].dead);
      for (const row of dead) await rest(`push_tokens?token=eq.${encodeURIComponent(row.token)}`, { method: "DELETE" });
      return json({
        ok: true,
        test: true,
        appareils: rows.length,
        envoyees: sent,
        jetons_retires: dead.length,
        erreurs: results.filter((result) => result.error).map((result) => result.error),
      });
    }

    // --- Le vrai passage : la base choisit, Firebase envoie ---------------
    const targets = (await rest("rpc/push_targets", { method: "POST", body: "{}" })) as Target[];

    let sent = 0;
    const dead: string[] = [];
    const errors: string[] = [];
    for (const target of targets) {
      const message = messageFor(target);
      const result = await send(account, target.token, target, message);
      if (result.sent) sent += 1;
      if (result.dead) dead.push(target.token);
      if (result.error) errors.push(result.error);
    }

    // Un jeton mort est retiré : sans ça, chaque passage retenterait un envoi
    // perdu et le compteur d'appareils mentirait dans le diagnostic.
    for (const token of dead) await rest(`push_tokens?token=eq.${encodeURIComponent(token)}`, { method: "DELETE" });

    if (targets.length > 0) {
      console.log(`notify-live : ${sent}/${targets.length} notifications envoyées, ${dead.length} jeton(s) retiré(s)`);
    }
    return json({ ok: true, choisis: targets.length, envoyees: sent, jetons_retires: dead.length, erreurs: errors });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`notify-live : ${message}`);
    return json({ error: message }, 500);
  }
});
