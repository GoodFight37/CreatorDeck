/**
 * La connexion avec Twitch, vue depuis l'appareil.
 *
 * Deux morceaux, tous les deux **purs** (aucun accès au réseau ni à `window`) :
 *
 *   * `twitchAuthorizeUrl()` : l'adresse à ouvrir pour que Supabase lance le
 *     dialogue avec Twitch. C'est Supabase qui garde le secret du client Twitch
 *     et qui connaît les URL déclarées : l'appareil ne manipule jamais ni le
 *     secret ni le jeton Twitch ;
 *   * `parseOAuthReturn()` : ce que le retour contient. Supabase renvoie les
 *     jetons **dans le fragment** de l'adresse (`#access_token=…`), jamais dans
 *     la requête — un fragment ne part pas au serveur, il ne finit donc pas dans
 *     ses journaux.
 *
 * Le reste (installer la session, recharger le profil) vit dans `cloud-store`.
 */
import type { CloudConfig } from "@/lib/cloud/config";

/**
 * Identifiant du fournisseur côté Supabase : `twitch`, le fournisseur
 * **intégré** (Authentication → Sign In / Providers → Twitch). Supabase
 * s'occupe des détails qui fâchent — il ajoute l'en-tête `Client-ID` que
 * l'API Twitch exige, demande la portée `user:read:email` et marque l'adresse
 * comme vérifiée.
 *
 * Ne pas passer par un fournisseur personnalisé (`custom:…`) : ça obligerait à
 * redonner à la main des adresses que Supabase connaît déjà, et le secret du
 * client Twitch devrait transiter par un formulaire de plus.
 *
 * Configuration : `docs/cloud-supabase.md` §3.
 */
export const TWITCH_PROVIDER = "twitch";

/**
 * Ce qu'on demande à Twitch : `openid` (l'identité) et `user:read:email`
 * (l'adresse e-mail vérifiée, qui sert d'identifiant de compte). Rien de plus :
 * ni les abonnements, ni le chat, ni les chaînes suivies.
 */
export const TWITCH_SCOPES = ["openid", "user:read:email"] as const;

/**
 * L'adresse de retour dans l'application Android. Déclarée des deux côtés :
 * dans `AndroidManifest.xml` (l'app se réveille sur ce schéma) et dans les
 * « Redirect URLs » du tableau de bord Supabase (sinon Supabase refuse de
 * renvoyer le joueur vers l'app).
 */
export const NATIVE_REDIRECT_URL = "com.creatordeck.app://auth";

/** Ce que le retour d'un dialogue OAuth contient. */
export type OAuthReturn =
  | { status: "session"; accessToken: string; refreshToken: string; expiresIn: number }
  | { status: "error"; message: string }
  /** Le fragment ne parle pas d'authentification : il n'y a rien à faire. */
  | { status: "none" };

/**
 * Adresse à ouvrir pour se connecter avec Twitch.
 *
 * `redirectTo` est calculée par l'appelant : sur le site, c'est l'adresse de la
 * page (`https://…/?…`) ; dans l'app Android, c'est `NATIVE_REDIRECT_URL`.
 */
export function twitchAuthorizeUrl(config: CloudConfig, redirectTo: string, scopes: readonly string[] = TWITCH_SCOPES): string {
  const query = new URLSearchParams({
    provider: TWITCH_PROVIDER,
    redirect_to: redirectTo,
    scopes: scopes.join(" "),
  });
  return `${config.url}/auth/v1/authorize?${query.toString()}`;
}

/**
 * Lit le retour d'un dialogue OAuth.
 *
 * Accepte aussi bien une adresse web (`https://…/#access_token=…`) qu'un lien
 * d'application (`com.creatordeck.app://auth#access_token=…`) : les deux sont
 * des URL complètes, seul le fragment nous intéresse.
 */
export function parseOAuthReturn(url: string): OAuthReturn {
  let hash: string;
  try {
    hash = new URL(url).hash;
  } catch {
    return { status: "none" };
  }
  if (!hash || hash.length < 2) return { status: "none" };

  const params = new URLSearchParams(hash.slice(1));
  const error = params.get("error");
  if (error) {
    const code = params.get("error_code");
    const description = params.get("error_description");
    return {
      status: "error",
      message: description || (code ? `${error} (${code})` : error),
    };
  }

  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  const expiresIn = Number(params.get("expires_in"));
  if (!accessToken || !refreshToken) return { status: "none" };
  if (!Number.isFinite(expiresIn) || expiresIn <= 0) return { status: "none" };
  return { status: "session", accessToken, refreshToken, expiresIn: Math.floor(expiresIn) };
}

/**
 * L'adresse de retour à utiliser, selon l'endroit où tourne le jeu.
 *
 * Sur le site, on revient sur la page courante (au fragment près) : ça marche
 * aussi bien sur `localhost` que sur le domaine déployé, sans variable à
 * configurer. Dans l'application Android, la page locale (`https://localhost`)
 * ne peut pas recevoir de redirection : on passe par le schéma de l'app.
 */
export function oauthRedirectUrl(location: { origin: string; pathname: string }, native: boolean): string {
  if (native) return NATIVE_REDIRECT_URL;
  return `${location.origin}${location.pathname}`;
}

/**
 * Adresse sans son fragment : à appeler après avoir lu un retour OAuth, pour
 * que les jetons ne restent pas traînants dans la barre d'adresse ni dans
 * l'historique du navigateur.
 */
export function stripFragment(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    return `${parsed.origin}${parsed.pathname}${parsed.search}`;
  } catch {
    return url;
  }
}
