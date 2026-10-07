/**
 * Le socle du client cloud : erreurs traduites en français, lecture des
 * réponses du serveur (aucune ne fait confiance au format brut), et le contrat
 * `CloudCore` que les domaines reçoivent — session, transport, RPC.
 *
 * Rien ici ne parle au réseau : les parsers sont purs.
 */
import type { CloudSession, LastPack, LastPackCard, LastPackLoss, MarketListing, MarketPurchase, MarketSale, PlayerProfile, ProfileFamily, ProfileRarity, RemoteSaveRow, Trade, TradeCard, TradeStatus } from "./types";
import type { Friendship, IncomingRequest, OutgoingRequest } from "@/lib/social/friends";
import type { CloudConfig } from "@/lib/cloud/config";
import type { CloudFetch } from "@/lib/cloud/transport";

/** Clé de stockage local de la session (jetons d'accès et de rafraîchissement). */
export const CLOUD_SESSION_KEY = "creatordeck.cloud.session";

/** Marge avant expiration : on rafraîchit le jeton une minute avant la fin. */
export const REFRESH_MARGIN_MS = 60_000;

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

/**
 * Ce qu'un domaine du client peut demander au socle : la session, la version
 * du jeton, et les deux portes réseau (`send` pour le REST, `rpc` pour
 * PostgREST). Un domaine ne connaît ni le stockage ni le transport.
 */
export type CloudCore = {
  readonly config: CloudConfig;
  session(): CloudSession | null;
  setSession(session: CloudSession | null): void;
  setSessionEmail(email: string | null): void;
  accessToken(): Promise<string | null>;
  refresh(refreshToken: string): Promise<CloudSession | null>;
  /** Le transport brut (déconnexion côté serveur : une route hors REST). */
  readonly request: CloudFetch;
  /** Les en-têtes d'appel : apikey du projet, jeton du joueur si fourni. */
  headers(token?: string): Record<string, string>;
  send(
    url: string,
    init: { method: string; body?: string; raw?: boolean; token?: string },
  ): Promise<{ body: unknown; status: number }>;
  rpc(name: string, payload: unknown): Promise<unknown>;
};

export function familyRatio(family: Pick<ProfileFamily, "owned" | "total">): number {
  return family.total > 0 ? family.owned / family.total : 0;
}

/** Traduit les erreurs de l'API en phrases utilisables dans l'interface. */
export function messageFor(status: number, code: string, raw: string): string {
  // Les codes précis d'abord : un code à usage unique refusé arrive en 401,
  // comme une session expirée, et les deux messages n'ont rien à voir.
  if (code === "invalid_credentials" || code === "otp_expired") return "Code incorrect ou expiré.";
  // Attacher une adresse à un compte invité est cassé côté Supabase quand
  // « Confirm email » est actif : GoTrue valide une adresse vide (bug connu,
  // supabase/auth#2847). On explique la manœuvre au lieu de traduire l'erreur.
  if (code === "email_address_invalid" && /Email address "" is invalid/i.test(raw)) {
    return "Supabase refuse d'attacher une adresse à un compte invité tant que « Confirm email » est activé : désactive-le (Authentication → Sign In / Providers → Email) puis réessaie.";
  }
  // Un compte invité ne peut pas recevoir un mot de passe **sans** adresse :
  // c'est une règle de GoTrue, autant la dire en français (l'app empêche le cas
  // côté écran, mais la règle serveur reste la vérité).
  if (code === "validation_failed" && /anonymous user without an email/i.test(raw)) {
    return "Supabase demande une adresse e-mail avec le mot de passe pour un compte invité.";
  }
  // Le projet n'a pas de SMTP : GoTrue ne peut pas envoyer le code (l'envoi fait
  // partie de la transaction, donc rien n'est enregistré). Deux issues possibles.
  if (/error sending|could not send|smtp|dial tcp|connection refused/i.test(raw) && /mail|email/i.test(raw)) {
    return "Supabase n'a pas pu envoyer l'e-mail : ce projet n'a pas de SMTP configuré (Authentication → Emails → SMTP Settings). Sans SMTP, attache plutôt un mot de passe — ça ne demande aucun envoi — ou désactive « Confirm email » pour que l'adresse soit enregistrée tout de suite.";
  }
  if (code === "email_address_invalid" || code === "validation_failed") return "Adresse e-mail refusée.";
  if (code === "signup_disabled") return "Les inscriptions sont désactivées sur ce projet.";
  if (code === "anonymous_provider_disabled" || code === "anonymous_sign_ins_disabled") {
    return "Les comptes invités sont désactivés sur ce projet : active-les dans Authentication → Sign In / Providers → Anonymous.";
  }
  // Mot de passe : connexion refusée, adresse non confirmée, mot de passe
  // refusé, ou changement de mot de passe qui exige une reconnexion.
  if (code === "invalid_grant" || /invalid login credentials/i.test(raw)) {
    return "E-mail ou mot de passe incorrect.";
  }
  if (code === "email_not_confirmed") {
    return "Cette adresse n'est pas confirmée. Désactive « Confirm email » dans Supabase (Authentication → Sign In / Providers → Email) ou confirme-la, puis réessaie.";
  }
  if (code === "weak_password") return "Mot de passe refusé par Supabase : choisis-en un plus long.";
  if (code === "reauthentication_needed") {
    return "Supabase demande une reconnexion avant de changer le mot de passe : déconnecte-toi, reconnecte-toi, puis recommence.";
  }
  if (code === "email_exists" || /already been registered|already registered/i.test(raw)) {
    return "Cette adresse est déjà utilisée par un autre compte : connecte-toi avec elle, ou choisis-en une autre.";
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
    // Le message du serveur dit quoi faire (« ouvre un booster », « propose un
    // échange ») : on le garde, il est déjà en français.
    return raw;
  }
  // Échanges : la migration 0005 doit être collée dans le projet Supabase.
  if (
    (code === "PGRST202" || /could not find the function|function .* does not exist/i.test(raw)) &&
    /trade|echange/i.test(raw)
  ) {
    return "Les échanges ne sont pas installés sur ce projet : colle supabase/migrations/0005_echanges.sql dans le SQL Editor (docs/cloud-supabase.md, § 3), puis réessaie.";
  }
  // Amis : la migration 0008 doit être collée dans le projet Supabase.
  //
  // Le motif nomme les fonctions (`send_friend_request`, `list_friends`…) au
  // lieu de chercher « ami » : ce mot se retrouve dans « fa**mi**ly », donc
  // dans le nom d'argument du Paquet Scène — et l'erreur du Paquet Scène était
  // annoncée comme une erreur d'amis.
  if (
    (code === "PGRST202" || /could not find the function|function .* does not exist/i.test(raw)) &&
    /friend_request|list_friends|list_outgoing_friend_requests|has_friendship|search_players|player_profile|remove_friend/i.test(
      raw,
    )
  ) {
    return "Les amis ne sont pas installés sur ce projet : colle supabase/migrations/0008_friends.sql dans le SQL Editor (docs/cloud-supabase.md, § 3), puis réessaie.";
  }
  // La wishlist : la migration 0015 doit être collée dans le projet.
  if (code === "PGRST202" && /wishlist_slug|set_wishlist|clear_wishlist|_wishlist/.test(raw)) {
    return "La wishlist n'est pas installée sur ce projet : colle supabase/migrations/0015_wishlist.sql dans le SQL Editor (docs/cloud-supabase.md, § 3), puis réessaie.";
  }
  // Le Paquet Scène : la migration 0014 doit être collée dans le projet.
  if (
    code === "PGRST202" &&
    /scene_pack_choices|open_scene_pack/.test(raw)
  ) {
    return "Le Paquet Scène n'est pas installé sur ce projet : colle supabase/migrations/0014_scene_pack.sql dans le SQL Editor (docs/cloud-supabase.md, § 3), puis réessaie.";
  }
  // `open_pack` existe mais pas dans sa version à argument : c'est le signe que
  // la migration 0013 (plancher de malchance) n'est pas encore collée. Le
  // message générique parlerait de 0003/0004, qui sont déjà là.
  if (
    (code === "PGRST202" || /could not find the function|function .* does not exist/i.test(raw)) &&
    /open_pack\s*\(/.test(raw) &&
    !/open_pack\s*\(\s*\)/.test(raw)
  ) {
    return "Le tirage a changé côté serveur : colle supabase/migrations/0013_progression.sql dans le SQL Editor (docs/cloud-supabase.md, § 3), puis réessaie.";
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

export function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/**
 * Lit un tableau de lignes JSON : ce que le serveur n'a pas pu produire est
 * ignoré, ligne par ligne. Un `null` dans la réponse ne doit pas faire tomber
 * toute la liste.
 */
export function readRows<T>(payload: unknown, read: (raw: unknown) => T | null): T[] {
  if (!Array.isArray(payload)) return [];
  const rows: T[] = [];
  for (const raw of payload) {
    const row = read(raw);
    if (row) rows.push(row);
  }
  return rows;
}

/** Une ligne de `list_friends()`. */
export function readFriendship(raw: unknown): Friendship | null {
  const record = asRecord(raw);
  const friendId = typeof record?.friendId === "string" ? record.friendId : "";
  if (!friendId) return null;
  return {
    id: Number(record?.id ?? 0),
    friendId,
    friendName: typeof record?.friendName === "string" && record.friendName ? record.friendName : "Collectionneur",
    createdAt: typeof record?.createdAt === "string" ? record.createdAt : "",
  };
}

/** Une ligne de `list_incoming_friend_requests()`. */
export function readIncomingRequest(raw: unknown): IncomingRequest | null {
  const record = asRecord(raw);
  const senderId = typeof record?.senderId === "string" ? record.senderId : "";
  if (!senderId) return null;
  return {
    id: Number(record?.id ?? 0),
    senderId,
    senderName: typeof record?.senderName === "string" && record.senderName ? record.senderName : "Collectionneur",
    createdAt: typeof record?.createdAt === "string" ? record.createdAt : "",
  };
}

/** Une ligne de `list_outgoing_friend_requests()`. */
export function readOutgoingRequest(raw: unknown): OutgoingRequest | null {
  const record = asRecord(raw);
  const recipientId = typeof record?.recipientId === "string" ? record.recipientId : "";
  if (!recipientId) return null;
  return {
    id: Number(record?.id ?? 0),
    recipientId,
    recipientName:
      typeof record?.recipientName === "string" && record.recipientName ? record.recipientName : "Collectionneur",
    createdAt: typeof record?.createdAt === "string" ? record.createdAt : "",
  };
}

export function parseSession(raw: unknown): CloudSession | null {
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

export function parseSaveRow(raw: unknown): RemoteSaveRow | null {
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

/** Lit le profil public renvoyé par `player_profile()` (null si inconnu). */
export function parseProfile(raw: unknown): PlayerProfile | null {
  const record = asRecord(raw);
  if (!record) return null;
  const userId = String(record.user_id ?? "");
  if (!userId) return null;
  const rank = (value: unknown): number | null =>
    value === null || value === undefined ? null : Number(value);
  return {
    userId,
    displayName: String(record.display_name ?? "Collectionneur"),
    level: Number(record.level ?? 1),
    points: Number(record.points ?? 0),
    verified: record.verified !== false,
    uniqueCreators: Number(record.unique_creators ?? 0),
    totalCards: Number(record.total_cards ?? 0),
    legendaryCards: Number(record.legendary_cards ?? 0),
    epicCards: Number(record.epic_cards ?? 0),
    goldCards: Number(record.gold_cards ?? 0),
    holoCards: Number(record.holo_cards ?? 0),
    catalogSize: Number(record.catalog_size ?? 0),
    completion: Number(record.completion ?? 0),
    rankCompletion: rank(record.rank_completion),
    rankCards: rank(record.rank_cards),
    showcaseSlugs: Array.isArray(record.showcase_slugs) ? record.showcase_slugs.map(String) : [],
    wishlistSlug: typeof record.wishlist_slug === "string" && record.wishlist_slug
      ? record.wishlist_slug
      : null,
    byRarity: parseRarityBreakdown(record.by_rarity),
    byRegion: parseFamilyBreakdown(record.by_region),
  };
}

/** `{ legendary: { owned, total }, … }` → liste triée du plus rare au plus commun. */
export function parseRarityBreakdown(raw: unknown): ProfileRarity[] {
  const record = asRecord(raw);
  if (!record) return [];
  const order = ["legendary", "epic", "rare", "uncommon", "common"];
  return Object.entries(record)
    .flatMap(([rarity, value]) => {
      const row = asRecord(value);
      if (!row) return [];
      return [{ rarity, owned: Number(row.owned ?? 0), total: Number(row.total ?? 0) }];
    })
    .sort((left, right) => order.indexOf(left.rarity) - order.indexOf(right.rarity));
}

/**
 * `{ S01: { owned, total }, … }` → liste triée du plus complet au plus vide,
 * puis par identifiant : deux joueurs voient donc leurs familles dans le même
 * ordre, et l'ordre ne bouge pas d'un chargement à l'autre.
 */
export function parseFamilyBreakdown(raw: unknown): ProfileFamily[] {
  const record = asRecord(raw);
  if (!record) return [];
  return Object.entries(record)
    .flatMap(([regionId, value]) => {
      const row = asRecord(value);
      if (!row) return [];
      return [{ regionId, owned: Number(row.owned ?? 0), total: Number(row.total ?? 0) }];
    })
    .sort((left, right) => familyRatio(right) - familyRatio(left) || left.regionId.localeCompare(right.regionId));
}

/** Part d'une famille complétée. Un total nul ne compte pas comme complet. */
export function parseTradeCard(raw: unknown): TradeCard | null {
  const record = asRecord(raw);
  const slug = record?.creatorSlug;
  const variant = record?.variant;
  if (typeof slug !== "string" || !slug) return null;
  if (typeof variant !== "string" || !variant) return null;
  return {
    creatorSlug: slug,
    rarity: typeof record?.rarity === "string" ? record.rarity : "",
    variant,
  };
}

export function parseTradeCards(raw: unknown): TradeCard[] {
  return Array.isArray(raw) ? raw.flatMap((card) => parseTradeCard(card) ?? []) : [];
}

export function parseSale(raw: unknown): MarketSale | null {
  const record = asRecord(raw);
  const id = Number(record?.id);
  const slug = record?.creatorSlug;
  if (!Number.isFinite(id) || typeof slug !== "string" || !slug) return null;
  return {
    id,
    creatorSlug: slug,
    price: Number.isFinite(Number(record?.price)) ? Number(record?.price) : 0,
    soldAt: String(record?.soldAt ?? ""),
    buyerName: typeof record?.buyerName === "string" ? record.buyerName : "Un joueur",
  };
}

export function parseLastPackCard(raw: unknown): LastPackCard | null {
  const record = asRecord(raw);
  const index = Number(record?.index);
  const slug = record?.creatorSlug;
  if (!Number.isFinite(index) || index < 1 || typeof slug !== "string" || !slug) return null;
  return {
    index,
    creatorSlug: slug,
    rarity: typeof record?.rarity === "string" ? record.rarity : "",
    variant: typeof record?.variant === "string" ? record.variant : "standard",
    taken: record?.taken === true,
  };
}

export function parseLastPack(raw: unknown): LastPack | null {
  const record = asRecord(raw);
  const id = Number(record?.id);
  const ownerId = record?.ownerId;
  if (!Number.isFinite(id) || typeof ownerId !== "string" || !ownerId) return null;
  const cards = Array.isArray(record?.cards)
    ? record.cards.flatMap((card) => {
        const parsed = parseLastPackCard(card);
        return parsed ? [parsed] : [];
      })
    : [];
  return {
    id,
    ownerId,
    ownerName: typeof record?.ownerName === "string" ? record.ownerName : "Un collectionneur",
    mine: record?.mine === true,
    drawnAt: String(record?.drawnAt ?? ""),
    expiresAt: String(record?.expiresAt ?? ""),
    stealable: record?.stealable === true,
    cards,
  };
}

/** Vol subi : sans identifiant ni créateur, la ligne ne veut rien dire. */
export function parseLoss(raw: unknown): LastPackLoss | null {
  const record = asRecord(raw);
  const id = Number(record?.id);
  const card = asRecord(record?.card);
  const slug = card?.creatorSlug;
  if (!Number.isFinite(id) || typeof slug !== "string" || !slug) return null;
  const packId = Number(record?.packId);
  return {
    id,
    thiefName: typeof record?.thiefName === "string" ? record.thiefName : "Un collectionneur",
    packId: Number.isFinite(packId) ? packId : null,
    card: {
      creatorSlug: slug,
      rarity: typeof card?.rarity === "string" ? card.rarity : "",
      variant: typeof card?.variant === "string" ? card.variant : "standard",
    },
    stolenAt: String(record?.stolenAt ?? ""),
  };
}

export function parseListing(raw: unknown): MarketListing | null {
  const record = asRecord(raw);
  const id = Number(record?.id);
  const slug = record?.creatorSlug;
  if (!Number.isFinite(id) || typeof slug !== "string" || !slug) return null;
  const price = Number(record?.price);
  return {
    id,
    creatorSlug: slug,
    rarity: typeof record?.rarity === "string" ? record.rarity : "",
    variant: typeof record?.variant === "string" ? record.variant : "standard",
    payout: Number.isFinite(Number(record?.payout)) ? Number(record?.payout) : 0,
    price: Number.isFinite(price) ? price : 0,
    createdAt: String(record?.createdAt ?? ""),
    sellerName: typeof record?.sellerName === "string" ? record.sellerName : "Collectionneur",
  };
}

/**
 * Carte achetée, telle que le serveur l'a écrite dans la sauvegarde.
 *
 * `fromMarket` est obligatoire : sans lui, l'appareil ne saurait pas reconnaître
 * cette carte s'il rejouait l'achat, et pourrait la compter deux fois.
 */
export function parsePurchase(raw: unknown): MarketPurchase | null {
  const record = asRecord(raw);
  const id = record?.id;
  const slug = record?.creatorSlug;
  const fromMarket = Number(record?.fromMarket);
  if (typeof id !== "string" || !id) return null;
  if (typeof slug !== "string" || !slug) return null;
  if (!Number.isFinite(fromMarket) || fromMarket <= 0) return null;
  return {
    id,
    creatorSlug: slug,
    rarity: typeof record?.rarity === "string" ? record.rarity : "",
    variant: typeof record?.variant === "string" ? record.variant : "standard",
    obtainedAt: Number.isFinite(Number(record?.obtainedAt)) ? Number(record?.obtainedAt) : 0,
    rareDrop: record?.rareDrop === true,
    fromMarket,
  };
}

export function parseTrade(raw: unknown): Trade | null {
  const record = asRecord(raw);
  if (!record) return null;
  const id = Number(record.id);
  if (!Number.isFinite(id)) return null;
  const status = record.status;
  return {
    id,
    status: (status === "accepted" || status === "declined" || status === "cancelled"
      ? status
      : "open") as TradeStatus,
    proposerId: String(record.proposerId ?? ""),
    recipientId: String(record.recipientId ?? ""),
    proposerCards: parseTradeCards(record.proposerCards),
    recipientCards: parseTradeCards(record.recipientCards),
    createdAt: String(record.createdAt ?? ""),
    resolvedAt: record.resolvedAt ? String(record.resolvedAt) : null,
  };
}
