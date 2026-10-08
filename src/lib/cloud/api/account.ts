import type { CloudCore } from "./core";
import type { CloudSession, LeaderboardMetric, LeaderboardRow, PlayerProfile } from "./types";
import { CloudError, asRecord, parseProfile, parseSession } from "./core";
import { twitchAuthorizeUrl as buildTwitchAuthorizeUrl } from "@/lib/cloud/twitch";

/** Envoie un code à 6 chiffres (création de compte incluse). */
export async function requestOtp(core: CloudCore, email: string): Promise<void> {
  await core.send(`${core.config.url}/auth/v1/otp`, {
    method: "POST",
    body: JSON.stringify({ email, create_user: true }),
  });
}

/** Vérifie le code et mémorise la session. */
export async function verifyOtp(core: CloudCore, email: string, token: string): Promise<CloudSession> {
  // Un code recopié depuis un client mail arrive souvent avec des espaces.
  const response = await core.send(`${core.config.url}/auth/v1/verify`, {
    method: "POST",
    body: JSON.stringify({ email: email.trim(), token: token.trim(), type: "email" }),
    // Un code erroné est une réponse attendue : on lit nous-mêmes le corps.
    raw: true,
  });
  const session = parseSession(response.body);
  if (!session) {
    throw new CloudError("Réponse d'authentification illisible.", "invalid_response", 0);
  }
  core.setSession(session);
  return session;
}

/**
 * Valide le changement d'adresse par le code à 6 chiffres reçu par e-mail.
 *
 * C'est la seule façon de terminer un changement d'adresse depuis l'app : un
 * lien de confirmation renverrait vers une page web, et il n'y a pas de
 * serveur pour la recevoir. Le modèle « Change email address » doit contenir
 * `{{ .Token }}` (docs/cloud-supabase.md, § 2).
 */
export async function verifyEmailChange(core: CloudCore, email: string, token: string): Promise<CloudSession> {
  const address = email.trim();
  const response = await core.send(`${core.config.url}/auth/v1/verify`, {
    method: "POST",
    body: JSON.stringify({ email: address, token: token.trim(), type: "email_change" }),
    raw: true,
  });
  const session = parseSession(response.body) ?? core.session();
  if (!session) throw new CloudError("Réponse d'authentification illisible.", "invalid_response", 0);
  // GoTrue renvoie la session de l'utilisateur, avec la nouvelle adresse.
  core.setSession({ ...session, email: session.email ?? address });
  return core.session() ?? session;
}

/** Redemande un code de changement d'adresse (le précédent a expiré). */
export async function resendEmailChange(core: CloudCore, email: string): Promise<void> {
  const token = await core.accessToken();
  await core.send(`${core.config.url}/auth/v1/resend`, {
    method: "POST",
    body: JSON.stringify({ type: "email_change", email: email.trim() }),
    token: token ?? undefined,
    raw: true,
  });
}

export async function signOut(core: CloudCore): Promise<void> {
  const session = core.session();
  core.setSession(null);
  if (!session) return;
  try {
    await core.request(`${core.config.url}/auth/v1/logout`, {
      method: "POST",
      headers: { ...core.headers(), Authorization: `Bearer ${session.accessToken}` },
    });
  } catch {
    // Déconnexion locale déjà faite : l'appel serveur est un bonus.
  }
}

/**
 * Compte invité : Supabase crée un utilisateur sans adresse e-mail.
 *
 * C'est la voie la plus rapide pour avoir un identifiant cloud — aucun SMTP,
 * aucun domaine, aucun envoi d'e-mail. En contrepartie, le compte vit avec la
 * session enregistrée sur l'appareil : perdre la session (réinstallation,
 * données effacées) perd l'accès au compte. On pourra y attacher une adresse
 * e-mail plus tard, quand un SMTP existera.
 */
export async function signInAnonymously(core: CloudCore): Promise<CloudSession> {
  const response = await core.send(`${core.config.url}/auth/v1/signup`, {
    method: "POST",
    body: JSON.stringify({ data: {}, gotrue_meta_security: {} }),
    raw: true,
  });
  const session = parseSession(response.body);
  if (!session) {
    throw new CloudError(
      "Compte invité refusé (les comptes invités sont-ils activés ?).",
      "anonymous_disabled",
      0,
    );
  }
  core.setSession(session);
  return session;
}

/**
 * Attache une adresse e-mail et/ou un mot de passe au compte connecté.
 *
 * C'est la voie de secours d'un **compte invité** : le mot de passe ne
 * déclenche aucun envoi d'e-mail, donc il fonctionne sans SMTP (contrairement
 * au code à 6 chiffres). Deux réponses possibles :
 *
 *   * appliqué — l'adresse est enregistrée tout de suite (projet réglé avec
 *     « Confirm email » désactivé, le seul réglage qui marche pour un invité) ;
 *   * en attente — Supabase a envoyé un lien de confirmation à la nouvelle
 *     adresse : il faut le cliquer, donc un SMTP configuré.
 *
 * Le jeton d'accès reste valable : on met simplement à jour l'adresse de la
 * session enregistrée pour que l'écran Compte affiche la bonne.
 */
export async function updateAccount(core: CloudCore, update: { email?: string; password?: string }): Promise<{
  /** La demande a pris effet tout de suite. */
  applied: boolean;
  /** Adresse en attente de confirmation, le cas échéant. */
  pendingEmail: string | null;
  /** Adresse retenue par le compte après l'appel. */
  email: string | null;
}> {
  const token = await core.accessToken();
  if (!token) throw new CloudError("Connecte-toi pour jouer en ligne.", "no_session", 401);

  const wanted = update.email?.trim();
  const payload: Record<string, string> = {};
  if (wanted) payload.email = wanted;
  if (update.password) payload.password = update.password;
  if (!Object.keys(payload).length) {
    throw new CloudError("Rien à enregistrer.", "invalid_response", 0);
  }

  const { body } = await core.send(`${core.config.url}/auth/v1/user`, {
    method: "PUT",
    body: JSON.stringify(payload),
    token,
    raw: true,
  });

  const record = asRecord(body);
  const email = typeof record?.email === "string" && record.email ? record.email : null;
  const pendingEmail =
    typeof record?.new_email === "string" && record.new_email && record.new_email !== email
      ? record.new_email
      : null;

  if (wanted && !pendingEmail && !email) {
    throw new CloudError("Réponse d'authentification illisible.", "invalid_response", 0);
  }
  if (pendingEmail) return { applied: false, pendingEmail, email };
  // Adresse appliquée : la session enregistrée doit la connaître.
  if (wanted) core.setSessionEmail(email);
  return { applied: true, pendingEmail: null, email: email ?? core.session()?.email ?? null };
}

/**
 * Connexion par adresse e-mail et mot de passe.
 *
 * Ne demande aucun envoi d'e-mail : c'est le chemin de récupération d'un
 * compte invité auquel on a attaché un mot de passe, sur un autre appareil.
 */
export async function signInWithPassword(core: CloudCore, email: string, password: string): Promise<CloudSession> {
  const response = await core.send(`${core.config.url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    body: JSON.stringify({ email: email.trim(), password }),
    // Un mot de passe erroné est une réponse attendue : on lit le corps.
    raw: true,
  });
  const session = parseSession(response.body);
  if (!session) {
    throw new CloudError("Réponse d'authentification illisible.", "invalid_response", 0);
  }
  core.setSession(session);
  return session;
}

/** Profil public du joueur (nom affiché, vitrine), ou `null` s'il n'existe pas. */
export async function profile(core: CloudCore, userId: string): Promise<{ displayName: string; showcaseSlugs: string[] } | null> {
  const token = (await core.accessToken()) ?? undefined;
  const { body } = await core.send(
    `${core.config.url}/rest/v1/profiles?user_id=eq.${encodeURIComponent(userId)}&select=display_name,showcase_slugs`,
    { method: "GET", token, raw: true },
  );
  const rows = Array.isArray(body) ? body : [];
  const record = asRecord(rows[0]);
  if (!record) return null;
  return {
    displayName: typeof record.display_name === "string" ? record.display_name : "Collectionneur",
    showcaseSlugs: Array.isArray(record.showcase_slugs) ? record.showcase_slugs.map(String) : [],
  };
}

/**
 * Épingle jusqu'à 4 cartes de sa collection sur son profil public.
 *
 * Le contrôle est côté serveur : une carte que le joueur ne possède pas fait
 * échouer l'appel (message en français remonté tel quel). Le serveur renvoie
 * la vitrine enregistrée, dans l'ordre où il l'a rangée.
 */
export async function setShowcase(core: CloudCore, slugs: string[]): Promise<string[]> {
  const result = await core.rpc("set_showcase", { p_slugs: slugs });
  return Array.isArray(result) ? result.map(String) : [];
}

/**
 * Le créateur épinglé (wishlist) — le sien par défaut, ou celui d'un autre
 * joueur. `null` quand il n'y en a pas.
 */
export async function wishlistSlug(core: CloudCore, userId?: string): Promise<string | null> {
  const result = await core.rpc("wishlist_slug", { p_user_id: userId ?? null });
  return typeof result === "string" && result ? result : null;
}

/**
 * Épingle un créateur. Aucune possession n'est exigée : c'est justement le
 * but — réclamer celui qu'on n'a pas. Le serveur vérifie seulement qu'il
 * existe au catalogue, et renvoie le slug retenu.
 */
export async function setWishlist(core: CloudCore, slug: string): Promise<string> {
  const result = await core.rpc("set_wishlist", { p_slug: slug });
  return typeof result === "string" ? result : slug;
}

/** Retire l'épinglé. Sans épinglé, l'appel ne fait rien (et ne casse rien). */
export async function clearWishlist(core: CloudCore): Promise<void> {
  await core.rpc("clear_wishlist", {});
}

/** Change le nom affiché au classement (ligne `profiles` du joueur). */
export async function updateDisplayName(core: CloudCore, userId: string, displayName: string): Promise<void> {
  const name = displayName.trim();
  await core.send(`${core.config.url}/rest/v1/profiles?user_id=eq.${encodeURIComponent(userId)}`, {
    method: "PATCH",
    body: JSON.stringify({ display_name: name, updated_at: new Date().toISOString() }),
    token: (await core.accessToken()) ?? undefined,
    raw: true,
  });
}

/**
 * Teste la joignabilité du projet : `GET /auth/v1/health`, lecture pure,
 * aucune donnée modifiée. Sert au bouton « Tester la connexion » de l'écran
 * Compte — et à distinguer une panne réseau d'une configuration erronée.
 */
export async function ping(core: CloudCore): Promise<{ host: string }> {
  await core.send(`${core.config.url}/auth/v1/health`, { method: "GET", raw: true });
  return { host: new URL(core.config.url).host };
}

/**
 * L'adresse à ouvrir pour se connecter avec Twitch. Supabase (et non
 * l'appareil) détient le secret du client Twitch ; l'appareil ne fait
 * qu'ouvrir la porte et attendre le retour.
 */
export function twitchAuthorizeUrl(core: CloudCore, redirectTo: string): string {
  return buildTwitchAuthorizeUrl(core.config, redirectTo);
}

/**
 * Installe une session obtenue par OAuth (Twitch).
 *
 * Le fragment d'une redirection Supabase ne contient que les jetons, pas
 * l'utilisateur : on demande donc `/auth/v1/user` avec le jeton frais, puis on
 * enregistre la session comme les autres. C'est ce qui rend la connexion
 * Twitch indiscernable du reste de l'app une fois installée.
 */
export async function adoptSession(core: CloudCore, tokens: { accessToken: string; refreshToken: string; expiresIn: number }): Promise<CloudSession> {
  // `send` traduit un 401 en « session expirée », message qui parle des codes
  // par e-mail : ici on veut dire ce qui s'est vraiment passé.
  const failure = new CloudError(
    "Connexion Twitch acceptée, mais le compte n'a pas pu être ouvert. Réessaie depuis l'écran Compte.",
    "oauth_user_failed",
    0,
  );
  let body: unknown;
  let status = 0;
  try {
    ({ body, status } = await core.send(`${core.config.url}/auth/v1/user`, {
      method: "GET",
      token: tokens.accessToken,
      raw: true,
    }));
  } catch {
    throw failure;
  }
  const record = asRecord(body);
  const userId = record?.id;
  if (status >= 400 || typeof userId !== "string" || !userId) throw failure;
  const session: CloudSession = {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: Date.now() + tokens.expiresIn * 1000,
    userId,
    email: typeof record?.email === "string" ? record.email : null,
  };
  core.setSession(session);
  return session;
}

export async function leaderboard(
  core: CloudCore,
  limit = 20,
  metric: LeaderboardMetric = "unique_creators",
  region: string | null = null,
): Promise<LeaderboardRow[]> {
  const result = await core.rpc("leaderboard", { p_limit: limit, p_metric: metric, p_region: region });
  if (!Array.isArray(result)) return [];
  return result.flatMap((row) => {
    const record = asRecord(row);
    if (!record) return [];
    return [
      {
        rank: Number(record.rank ?? 0),
        userId: String(record.user_id ?? ""),
        displayName: String(record.display_name ?? "Collectionneur"),
        uniqueCreators: Number(record.unique_creators ?? 0),
        totalCards: Number(record.total_cards ?? 0),
        legendaryCards: Number(record.legendary_cards ?? 0),
        epicCards: Number(record.epic_cards ?? 0),
        goldCards: Number(record.gold_cards ?? 0),
        holoCards: Number(record.holo_cards ?? 0),
        level: Number(record.level ?? 1),
        points: Number(record.points ?? 0),
        completion: Number(record.completion ?? 0),
        showcaseSlugs: Array.isArray(record.showcase_slugs) ? record.showcase_slugs.map(String) : [],
        familyOwned: Number(record.family_owned ?? 0),
        familyTotal: Number(record.family_total ?? 0),
      },
    ];
  });
}

/**
 * Le profil public d'un joueur (`player_profile`) : identité, chiffres,
 * complétion, rangs et vitrine. Sans identifiant, celui du compte connecté.
 * `null` si ce joueur n'a jamais envoyé sa partie au cloud.
 */
export async function playerProfile(core: CloudCore, userId?: string): Promise<PlayerProfile | null> {
  const result = await core.rpc("player_profile", { p_user_id: userId ?? null });
  return parseProfile(result);
}

/**
 * Inscrit le jeton de notification de cet appareil pour le compte connecté
 * (`0023_notifications.sql`). Le serveur décide du rattachement : l'identité
 * vient de la session, pas d'un paramètre.
 */
export async function registerPushToken(
  core: CloudCore,
  token: string,
  platform = "android",
): Promise<void> {
  await core.rpc("register_push_token", { p_token: token, p_platform: platform });
}

/**
 * L'état des notifications du compte : l'interrupteur est-il allumé, et sur
 * combien d'appareils (`0024_push_state.sql`). Une **lecture**, rien d'autre —
 * c'est ce qui manquait pour que l'écran ne mente plus au lancement (le 7
 * octobre, l'interrupteur revenait éteint à chaque ouverture alors que le
 * serveur, lui, notifiait toujours).
 */
export async function pushState(core: CloudCore): Promise<{ live: boolean; devices: number }> {
  const result = await core.rpc("push_state", {});
  const record = asRecord(result);
  return {
    live: record?.live === true,
    devices: Number(record?.devices ?? 0),
  };
}

/** Retire le jeton de cet appareil (déconnexion explicite). */
export async function forgetPushToken(core: CloudCore, token: string): Promise<void> {
  await core.rpc("forget_push_token", { p_token: token });
}

/**
 * Allume ou coupe « préviens-moi quand un créateur que je collectionne passe en
 * direct », sur tous les appareils du compte. Rend leur nombre.
 */
export async function setPushLive(core: CloudCore, enabled: boolean): Promise<number> {
  const result = await core.rpc("set_push_live", { p_enabled: enabled });
  const record = asRecord(result);
  return Number(record?.devices ?? 0);
}
