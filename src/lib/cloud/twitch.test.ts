import { describe, expect, it } from "vitest";

import { NATIVE_REDIRECT_URL, oauthRedirectUrl, parseOAuthReturn, stripFragment, twitchAuthorizeUrl } from "@/lib/cloud/twitch";

const CONFIG = { url: "https://projet.supabase.co", anonKey: "cle-publique-assez-longue-pour-le-test" };

describe("adresse de connexion Twitch", () => {
  it("passe par Supabase, pas par Twitch directement", () => {
    // L'appareil ne connaît ni le secret du client Twitch ni son identifiant :
    // il demande à Supabase de lancer le dialogue.
    const url = new URL(twitchAuthorizeUrl(CONFIG, "https://creatordeck.example/"));
    expect(url.origin).toBe("https://projet.supabase.co");
    expect(url.pathname).toBe("/auth/v1/authorize");
    expect(url.searchParams.get("provider")).toBe("twitch");
    expect(url.searchParams.get("redirect_to")).toBe("https://creatordeck.example/");
    expect(url.searchParams.get("scopes")).toBe("openid user:read:email");
  });

  it("encode l'adresse de retour au lieu de la coller telle quelle", () => {
    const url = twitchAuthorizeUrl(CONFIG, "https://creatordeck.example/?profil=abc");
    expect(url).toContain("redirect_to=https%3A%2F%2Fcreatordeck.example%2F%3Fprofil%3Dabc");
  });

  it("demande exactement les deux portées utiles", () => {
    const url = new URL(twitchAuthorizeUrl(CONFIG, "https://a.example/"));
    expect(url.searchParams.get("scopes")?.split(" ")).toEqual(["openid", "user:read:email"]);
  });
});

describe("retour du dialogue", () => {
  it("lit les jetons du fragment", () => {
    const result = parseOAuthReturn("https://creatordeck.example/#access_token=aaa&expires_in=3600&refresh_token=rrr&token_type=bearer&type=bearer");
    expect(result).toEqual({ status: "session", accessToken: "aaa", refreshToken: "rrr", expiresIn: 3600 });
  });

  it("lit aussi un lien d'application", () => {
    const result = parseOAuthReturn(`${NATIVE_REDIRECT_URL}#access_token=aaa&expires_in=600&refresh_token=rrr`);
    expect(result.status).toBe("session");
  });

  it("transmet le refus de Twitch, en clair", () => {
    const result = parseOAuthReturn("https://creatordeck.example/#error=access_denied&error_description=The%20user%20denied%20you%20access");
    expect(result).toEqual({ status: "error", message: "The user denied you access" });
  });

  it("retombe sur le code quand la description manque", () => {
    expect(parseOAuthReturn("https://a.example/#error=server_error&error_code=unexpected_failure")).toEqual({
      status: "error",
      message: "server_error (unexpected_failure)",
    });
  });

  it("ne fait rien d'un fragment qui ne parle pas d'authentification", () => {
    // Le lien de partage d'une fiche passe par la requête (`?profil=…`) : il ne
    // doit surtout pas être pris pour un retour de connexion.
    expect(parseOAuthReturn("https://creatordeck.example/?profil=abc")).toEqual({ status: "none" });
    expect(parseOAuthReturn("https://creatordeck.example/")).toEqual({ status: "none" });
    expect(parseOAuthReturn("https://creatordeck.example/#autre=1")).toEqual({ status: "none" });
    expect(parseOAuthReturn("pas une url")).toEqual({ status: "none" });
  });

  it("refuse un fragment incomplet plutôt que d'installer une session bancale", () => {
    expect(parseOAuthReturn("https://a.example/#access_token=aaa")).toEqual({ status: "none" });
    expect(parseOAuthReturn("https://a.example/#access_token=aaa&refresh_token=rrr&expires_in=0")).toEqual({ status: "none" });
    expect(parseOAuthReturn("https://a.example/#access_token=aaa&refresh_token=rrr&expires_in=abc")).toEqual({ status: "none" });
  });
});

describe("adresse de retour", () => {
  it("revient sur la page du site", () => {
    expect(oauthRedirectUrl({ origin: "https://creatordeck.example", pathname: "/" }, false)).toBe("https://creatordeck.example/");
  });

  it("passe par le schéma de l'app dans l'application Android", () => {
    // La page servie dans l'APK est `https://localhost` : aucune redirection ne
    // peut y arriver depuis un navigateur.
    expect(oauthRedirectUrl({ origin: "https://localhost", pathname: "/" }, true)).toBe("com.creatordeck.app://auth");
  });

  it("retire le fragment après lecture, pour ne pas laisser les jetons traîner", () => {
    expect(stripFragment("https://creatordeck.example/#access_token=aaa&refresh_token=rrr")).toBe("https://creatordeck.example/");
    expect(stripFragment("https://creatordeck.example/?profil=abc#access_token=aaa")).toBe("https://creatordeck.example/?profil=abc");
  });
});
