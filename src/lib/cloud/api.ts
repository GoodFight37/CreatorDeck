/**
 * Client Supabase minimal, écrit à la main : authentification par code à 6
 * chiffres, envoi/lecture de la sauvegarde, classement.
 *
 * Pourquoi pas `@supabase/supabase-js` ? L'application n'a pas de serveur et
 * doit rester légère dans l'APK : on n'utilise ici qu'une poignée de routes
 * (OTP, rafraîchissement de jeton, quatre fonctions Postgres) et une centaine
 * de lignes suffisent, sans dépendance supplémentaire à maintenir et à
 * auditer. Le jour où l'on voudra du temps réel (échanges), le SDK reprendra
 * la main — le format de session ci-dessous est le sien.
 *
 * Rien n'est envoyé tant que le joueur n'a pas saisi son adresse e-mail et son
 * code : l'appel réseau est toujours déclenché par un geste explicite.
 */
import type { KeyValueStorage } from "@/lib/save-store";
import type { CloudConfig } from "@/lib/cloud/config";

/** Clé de stockage local de la session (jetons d'accès et de rafraîchissement). */
export const CLOUD_SESSION_KEY = "creatordeck.cloud.session";

/** Marge avant expiration : on rafraîchit le jeton une minute avant la fin. */
const REFRESH_MARGIN_MS = 60_000;

export type CloudSession = {
  accessToken: string;
  refreshToken: string;
  /** Expiration du jeton d'accès, en millisecondes (epoch). */
  expiresAt: number;
  userId: string;
  email: string | null;
};

export class CloudError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "CloudError";
  }
}

export type RemoteSaveRow = {
  state: unknown;
  saveVersion: number;
  deviceUpdatedAt: number;
  stateChecksum: string;
  updatedAt: string;
  verified: boolean;
};

export type PushSaveResult =
  | { status: "pushed"; save: RemoteSaveRow }
  | { status: "unchanged"; save: RemoteSaveRow }
  | { status: "conflict"; save: RemoteSaveRow }
  | { status: "rejected"; problems: string[] };

export type LeaderboardRow = {
  rank: number;
  userId: string;
  displayName: string;
  uniqueCreators: number;
  totalCards: number;
  legendaryCards: number;
  level: number;
  points: number;
  showcaseSlugs: string[];
};

/** Traduit les erreurs de l'API en phrases utilisables dans l'interface. */
function messageFor(status: number, code: string, raw: string): string {
  // Les codes précis d'abord : un code à usage unique refusé arrive en 401,
  // comme une session expirée, et les deux messages n'ont rien à voir.
  if (code === "invalid_credentials" || code === "otp_expired") return "Code incorrect ou expiré.";
  if (code === "email_address_invalid" || code === "validation_failed") return "Adresse e-mail refusée.";
  if (code === "signup_disabled") return "Les inscriptions sont désactivées sur ce projet.";
  if (code === "anonymous_provider_disabled" || code === "anonymous_sign_ins_disabled") {
    return "Les comptes invités sont désactivés sur ce projet : active-les dans Authentication → Sign In / Providers → Anonymous.";
  }
  if (code === "email_provider_disabled") {
    return "L'envoi d'e-mails est désactivé sur ce projet : active Email, ou utilise un compte invité.";
  }
  if (code === "email_address_not_authorized") {
    return "Le service d'e-mail par défaut de Supabase n'écrit qu'aux adresses de l'équipe du projet : configure un SMTP (Authentication → Emails) ou utilise un compte invité.";
  }
  if (code === "over_email_send_rate_limit" || code === "over_request_rate_limit") {
    return "Trop de tentatives : patiente une minute avant de redemander un code.";
  }
  // Erreurs des fonctions de tirage serveur : on renvoie le message serveur
  // tel quel (en français, déjà lisible), sauf pour les erreurs génériques.
  if (code === "P0001" && raw.includes("aucun booster")) {
    return "Aucun booster disponible pour le moment : rouvre quand le compte à rebours est fini.";
  }
  if (code === "P0001" && raw.includes("connecte-toi")) {
    return "Connecte-toi pour ouvrir un booster.";
  }
  // Fonctions ou tables de tirage absentes : le projet Supabase n'a pas encore
  // reçu les migrations 0003/0004. Message actionnable plutôt que le jargon
  // PostgREST (« Could not find the function public.open_pack »).
  if (code === "PGRST202" || /could not find the function|function .* does not exist/i.test(raw)) {
    return "Le tirage serveur n'est pas installé sur ce projet : colle supabase/migrations/0003_catalogue.sql puis 0004_tirage.sql dans le SQL Editor (docs/cloud-supabase.md, § 3), puis réessaie.";
  }
  if (code === "42P01" || /relation .* does not exist/i.test(raw)) {
    return "Table manquante côté serveur : toutes les migrations de supabase/migrations/ n'ont pas été exécutées (docs/cloud-supabase.md, § 3).";
  }
  if (status === 429) return "Trop de tentatives : patiente une minute avant de redemander un code.";
  if (status === 401 || status === 403) return "Session expirée : reconnecte-toi avec un nouveau code.";
  if (status === 0) return "Réseau injoignable : vérifie ta connexion, ta partie locale est intacte.";
  return raw || `Erreur inattendue du cloud (${status}).`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function parseSession(raw: unknown): CloudSession | null {
  const record = asRecord(raw);
  const accessToken = record?.access_token;
  const refreshToken = record?.refresh_token;
  const expiresIn = record?.expires_in;
  const user = asRecord(record?.user);
  if (typeof accessToken !== "string" || typeof refreshToken !== "string") return null;
  if (typeof expiresIn !== "number") return null;
  const userId = typeof user?.id === "string" ? user.id : null;
  if (!userId) return null;
  return {
    accessToken,
    refreshToken,
    expiresAt: Date.now() + expiresIn * 1000,
    userId,
    email: typeof user?.email === "string" ? user.email : null,
  };
}

function parseSaveRow(raw: unknown): RemoteSaveRow | null {
  const record = asRecord(raw);
  if (!record) return null;
  const deviceUpdatedAt = Number(record.device_updated_at);
  if (!Number.isFinite(deviceUpdatedAt)) return null;
  return {
    state: record.state,
    saveVersion: Number(record.save_version ?? 0),
    deviceUpdatedAt,
    stateChecksum: typeof record.state_checksum === "string" ? record.state_checksum : "",
    updatedAt: typeof record.updated_at === "string" ? record.updated_at : "",
    verified: record.verified !== false,
  };
}

export class CloudApi {
  constructor(
    private readonly config: CloudConfig,
    private readonly storage: KeyValueStorage | null,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  // ---------------------------------------------------------------- session

  /** Session enregistrée sur l'appareil, si elle est encore lisible. */
  session(): CloudSession | null {
    const raw = this.storage?.getItem(CLOUD_SESSION_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as Partial<CloudSession>;
      if (
        typeof parsed.accessToken !== "string" ||
        typeof parsed.refreshToken !== "string" ||
        typeof parsed.userId !== "string" ||
        typeof parsed.expiresAt !== "number"
      ) {
        return null;
      }
      return {
        accessToken: parsed.accessToken,
        refreshToken: parsed.refreshToken,
        expiresAt: parsed.expiresAt,
        userId: parsed.userId,
        email: typeof parsed.email === "string" ? parsed.email : null,
      };
    } catch {
      return null;
    }
  }

  private setSession(session: CloudSession | null) {
    if (!this.storage) return;
    if (session) this.storage.setItem(CLOUD_SESSION_KEY, JSON.stringify(session));
    else this.storage.removeItem(CLOUD_SESSION_KEY);
  }

  /** Connecté et jeton utilisable (rafraîchit si nécessaire). */
  async accessToken(): Promise<string | null> {
    const session = this.session();
    if (!session) return null;
    if (session.expiresAt - Date.now() > REFRESH_MARGIN_MS) return session.accessToken;
    const refreshed = await this.refresh(session.refreshToken);
    return refreshed?.accessToken ?? null;
  }

  private async refresh(refreshToken: string): Promise<CloudSession | null> {
    try {
      const response = await this.fetchImpl(`${this.config.url}/auth/v1/token?grant_type=refresh_token`, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (!response.ok) {
        this.setSession(null);
        return null;
      }
      const session = parseSession(await response.json());
      this.setSession(session);
      return session;
    } catch {
      // Réseau coupé : on garde la session, elle resservira plus tard.
      return null;
    }
  }

  // ------------------------------------------------------------------- auth

  /** Envoie un code à 6 chiffres (création de compte incluse). */
  async requestOtp(email: string): Promise<void> {
    await this.send(`${this.config.url}/auth/v1/otp`, {
      method: "POST",
      body: JSON.stringify({ email, create_user: true }),
    });
  }

  /** Vérifie le code et mémorise la session. */
  async verifyOtp(email: string, token: string): Promise<CloudSession> {
    // Un code recopié depuis un client mail arrive souvent avec des espaces.
    const response = await this.send(`${this.config.url}/auth/v1/verify`, {
      method: "POST",
      body: JSON.stringify({ email: email.trim(), token: token.trim(), type: "email" }),
      // Un code erroné est une réponse attendue : on lit nous-mêmes le corps.
      raw: true,
    });
    const session = parseSession(response.body);
    if (!session) {
      throw new CloudError("Réponse d'authentification illisible.", "invalid_response", 0);
    }
    this.setSession(session);
    return session;
  }

  async signOut(): Promise<void> {
    const session = this.session();
    this.setSession(null);
    if (!session) return;
    try {
      await this.fetchImpl(`${this.config.url}/auth/v1/logout`, {
        method: "POST",
        headers: { ...this.headers(), Authorization: `Bearer ${session.accessToken}` },
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
  async signInAnonymously(): Promise<CloudSession> {
    const response = await this.send(`${this.config.url}/auth/v1/signup`, {
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
    this.setSession(session);
    return session;
  }

  /** Profil public du joueur (nom affiché, vitrine), ou `null` s'il n'existe pas. */
  async profile(userId: string): Promise<{ displayName: string; showcaseSlugs: string[] } | null> {
    const token = (await this.accessToken()) ?? undefined;
    const { body } = await this.send(
      `${this.config.url}/rest/v1/profiles?user_id=eq.${encodeURIComponent(userId)}&select=display_name,showcase_slugs`,
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
  async setShowcase(slugs: string[]): Promise<string[]> {
    const result = await this.rpc("set_showcase", { p_slugs: slugs });
    return Array.isArray(result) ? result.map(String) : [];
  }

  /** Change le nom affiché au classement (ligne `profiles` du joueur). */
  async updateDisplayName(userId: string, displayName: string): Promise<void> {
    const name = displayName.trim();
    await this.send(`${this.config.url}/rest/v1/profiles?user_id=eq.${encodeURIComponent(userId)}`, {
      method: "PATCH",
      body: JSON.stringify({ display_name: name, updated_at: new Date().toISOString() }),
      token: (await this.accessToken()) ?? undefined,
      raw: true,
    });
  }

  // ---------------------------------------------------------------- boosters

  /**
   * Résultat d'un tirage serveur : cartes tirées + compteurs mis à jour.
   *
   * Les cartes sont infalsifiables : le serveur les a tirées avec le même
   * algorithme que le moteur local, et le client ne peut pas les modifier.
   */
  async openPack(): Promise<{
    packs: number;
    lastRegenAt: string;
    openings: number;
    cards: Array<{
      creatorSlug: string;
      rarity: string;
      variant: string;
      rareDrop: boolean;
    }>;
  }> {
    const result = await this.rpc("open_pack", {});
    const record = asRecord(result);
    if (!record) {
      throw new CloudError("Réponse de tirage illisible.", "invalid_response", 0);
    }
    const cards = Array.isArray(record.cards)
      ? record.cards.map((card) => {
          const c = asRecord(card);
          if (!c) {
            throw new CloudError("Carte de tirage illisible.", "invalid_response", 0);
          }
          return {
            creatorSlug: String(c.creatorSlug ?? ""),
            rarity: String(c.rarity ?? ""),
            variant: String(c.variant ?? ""),
            rareDrop: Boolean(c.rareDrop),
          };
        })
      : [];
    return {
      packs: Number(record.packs ?? 0),
      lastRegenAt: String(record.last_regen_at ?? ""),
      openings: Number(record.openings ?? 0),
      cards,
    };
  }

  /**
   * Statut de la réserve de boosters (sans rien consommer).
   *
   * Le client appelle cette fonction à la connexion pour afficher le bon
   * compteur de boosters et la date du prochain, même avant d'ouvrir.
   */
  async packStatus(): Promise<{
    packs: number;
    lastRegenAt: string;
    openings: number;
    nextPackAt: string | null;
  }> {
    const result = await this.rpc("pack_status", {});
    const record = asRecord(result);
    if (!record) {
      throw new CloudError("Réponse de statut illisible.", "invalid_response", 0);
    }
    return {
      packs: Number(record.packs ?? 0),
      lastRegenAt: String(record.last_regen_at ?? ""),
      openings: Number(record.openings ?? 0),
      nextPackAt: record.next_pack_at ? String(record.next_pack_at) : null,
    };
  }

  // ------------------------------------------------------------------ saves

  async pushSave(state: unknown, deviceUpdatedAt: number, saveVersion: number, force = false): Promise<PushSaveResult> {
    const result = await this.rpc("push_save", {
      p_state: state,
      p_save_version: saveVersion,
      p_device_updated_at: deviceUpdatedAt,
      p_force: force,
    });
    const record = asRecord(result);
    const status = record?.status;
    if (status === "rejected") {
      const problems = Array.isArray(record?.problems) ? record.problems.map(String) : ["sauvegarde refusée"];
      return { status: "rejected", problems };
    }
    const save = parseSaveRow(record?.save);
    if (!save) throw new CloudError("Réponse d'envoi illisible.", "invalid_response", 0);
    if (status === "conflict") return { status: "conflict", save };
    if (status === "unchanged") return { status: "unchanged", save };
    return { status: "pushed", save };
  }

  async pullSave(): Promise<RemoteSaveRow | null> {
    const result = await this.rpc("pull_save", {});
    return parseSaveRow(result);
  }

  async leaderboard(limit = 20, metric: "unique_creators" | "total_cards" | "legendary_cards" = "unique_creators"): Promise<LeaderboardRow[]> {
    const result = await this.rpc("leaderboard", { p_limit: limit, p_metric: metric });
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
          level: Number(record.level ?? 1),
          points: Number(record.points ?? 0),
          showcaseSlugs: Array.isArray(record.showcase_slugs) ? record.showcase_slugs.map(String) : [],
        },
      ];
    });
  }

  // ------------------------------------------------------------------ HTTP

  private headers(token?: string): Record<string, string> {
    const headers: Record<string, string> = {
      apikey: this.config.anonKey,
      "Content-Type": "application/json",
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }

  /** Enveloppe un appel : messages français, jamais de fuite de JSON brut. */
  private async send(
    url: string,
    init: { method: string; body?: string; raw?: boolean; token?: string },
  ): Promise<{ body: unknown; status: number }> {
    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        method: init.method,
        headers: this.headers(init.token),
        body: init.body,
      });
    } catch {
      // Message auto-diagnostic : sans le nom d'hôte ni le chemin, un échec
      // réseau est indiscernable d'une adresse de projet mal recopiée.
      let where = "";
      try {
        const parsed = new URL(url);
        where = `${parsed.host}${parsed.pathname}`;
      } catch {
        where = "";
      }
      throw new CloudError(
        where
          ? `Réseau injoignable : impossible de joindre ${where}. Vérifie ta connexion — ta partie locale est intacte.`
          : messageFor(0, "", ""),
        "network_error",
        0,
      );
    }

    const text = await response.text().catch(() => "");
    let body: unknown = null;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = text;
      }
    }

    if (!response.ok) {
      const record = asRecord(body);
      const code = typeof record?.error_code === "string" ? record.error_code : typeof record?.code === "string" ? record.code : "";
      const raw = typeof record?.msg === "string" ? record.msg : typeof record?.message === "string" ? record.message : text.slice(0, 200);
      throw new CloudError(messageFor(response.status, code, raw), code || `http_${response.status}`, response.status);
    }
    if (init.raw) return { body, status: response.status };
    return { body, status: response.status };
  }

  /** Appelle une fonction Postgres (`/rest/v1/rpc/...`), avec un rafraîchissement de jeton sur 401. */
  private async rpc(name: string, payload: unknown): Promise<unknown> {
    const call = async (token: string | null) =>
      this.send(`${this.config.url}/rest/v1/rpc/${name}`, {
        method: "POST",
        body: JSON.stringify(payload),
        token: token ?? undefined,
        raw: true,
      });

    let token = await this.accessToken();
    if (!token) throw new CloudError("Connecte-toi pour utiliser le cloud.", "no_session", 401);
    try {
      const { body } = await call(token);
      return body;
    } catch (error) {
      const isAuthError = error instanceof CloudError && (error.status === 401 || error.status === 403);
      if (!isAuthError) throw error;
      // Jeton refusé (révoqué, projet migré) : une seule seconde chance.
      const session = await this.refresh(this.session()?.refreshToken ?? "");
      token = session?.accessToken ?? null;
      if (!token) throw new CloudError("Session expirée : reconnecte-toi.", "no_session", 401);
      const { body } = await call(token);
      return body;
    }
  }
}
