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
import { cloudRequest, type CloudFetch } from "@/lib/cloud/transport";
import { twitchAuthorizeUrl } from "@/lib/cloud/twitch";
import type {
  Friendship,
  IncomingRequest,
  OutgoingRequest,
  SendFriendRequestOutcome,
} from "@/lib/social/friends";

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

export type TradeStatus = "open" | "accepted" | "declined" | "cancelled";

/** Carte déplacée par un échange : jamais de variante inventée, le serveur relit le catalogue. */
export type TradeCard = {
  creatorSlug: string;
  rarity: string;
  variant: string;
};

export type Trade = {
  id: number;
  status: TradeStatus;
  proposerId: string;
  recipientId: string;
  proposerCards: TradeCard[];
  recipientCards: TradeCard[];
  createdAt: string;
  resolvedAt: string | null;
};

/** Une carte au comptoir de l'hôtel des ventes. */
export type MarketListing = {
  id: number;
  creatorSlug: string;
  rarity: string;
  variant: string;
  /** Ce que le vendeur a touché au dépôt. */
  payout: number;
  /** Ce que l'acheteur paie. */
  price: number;
  createdAt: string;
  /** Pseudo du vendeur, « Collectionneur » s'il n'a pas de profil public. */
  sellerName: string;
};

/**
 * Une carte exposée dans un Last Pack — la place qu'elle occupe (1 à 5), ce
 * qu'elle est, et si quelqu'un l'a déjà prise.
 */
export type LastPackCard = {
  index: number;
  creatorSlug: string;
  rarity: string;
  variant: string;
  taken: boolean;
};

/**
 * Un paquet exposé : les cinq cartes d'un booster ouvert il y a moins de dix
 * minutes. `mine` distingue mon paquet de celui d'un ami, `stealable` dit si
 * **je** peux y prendre une carte maintenant (ami, fenêtre ouverte, et pas
 * encore de vol aujourd'hui).
 */
export type LastPack = {
  id: number;
  ownerId: string;
  ownerName: string;
  mine: boolean;
  drawnAt: string;
  expiresAt: string;
  stealable: boolean;
  cards: LastPackCard[];
};

/** Ce que le serveur expose à l'instant, et ce qu'il me reste comme vol. */
export type LastPackShelf = {
  /** Heure du serveur — la seule qui compte pour la fenêtre de dix minutes. */
  now: string;
  windowMinutes: number;
  stealPerDay: number;
  stoleToday: boolean;
  packs: LastPack[];
};

/** Carte volée : exactement ce que l'appareil doit ajouter à sa collection. */
export type LastPackSteal = {
  packId: number;
  index: number;
  ownerId: string;
  ownerName: string;
  card: {
    id: string;
    creatorSlug: string;
    rarity: string;
    variant: string;
    obtainedAt: number;
    rareDrop: boolean;
    fromLastPack: number;
  };
};

/** Un vol subi : ce que le carnet annonce au propriétaire. */
export type LastPackLoss = {
  id: number;
  thiefName: string;
  packId: number | null;
  card: { creatorSlug: string; rarity: string; variant: string };
  stolenAt: string;
};

/** Une vente conclue : ta carte est partie de l'hôtel, les points sont arrivés. */
export type MarketSale = {
  id: number;
  creatorSlug: string;
  price: number;
  soldAt: string;
  buyerName: string;
};

/** Carte achetée : ce que l'appareil doit ajouter à la collection locale. */
export type MarketPurchase = {
  id: string;
  creatorSlug: string;
  rarity: string;
  variant: string;
  obtainedAt: number;
  rareDrop: boolean;
  fromMarket: number;
};

/** Une offre vue depuis l'appareil : `given`/`received` sont du point de vue du joueur. */
export type TradeListItem = {
  id: number;
  direction: "in" | "out";
  status: TradeStatus;
  partnerId: string;
  partnerName: string;
  given: TradeCard[];
  received: TradeCard[];
  createdAt: string;
  resolvedAt: string | null;
};

/** Joueur trouvé par son pseudo, pour proposer un échange. */
export type PlayerSearchResult = {
  userId: string;
  displayName: string;
  level: number;
  uniqueCreators: number;
};

export type LeaderboardRow = {
  rank: number;
  userId: string;
  displayName: string;
  uniqueCreators: number;
  totalCards: number;
  legendaryCards: number;
  epicCards: number;
  goldCards: number;
  holoCards: number;
  level: number;
  points: number;
  /** Part du catalogue possédée, entre 0 et 1 (calculée par le serveur). */
  completion: number;
  showcaseSlugs: string[];
  /**
   * Créateurs possédés **dans la famille demandée**, et sa taille au catalogue.
   * Renseignés par le serveur même quand le classement n'est pas trié par
   * famille (c'est alors la famille fourre-tout) : l'écran s'en sert pour
   * écrire « 23 / 402 » sans aucun calcul de son côté.
   */
  familyOwned: number;
  familyTotal: number;
};

/** Ce qu'un joueur possède d'une rareté, sur ce que le catalogue contient. */
export type ProfileRarity = {
  rarity: string;
  owned: number;
  total: number;
};

/**
 * Complétion d'une **famille** de collection (« France & francophonie »,
 * « Anglophonie »…). Même forme que `ProfileRarity`, avec l'identifiant de
 * famille (`S01`…) à la place de la rareté : les libellés vivent dans
 * `src/lib/regions.ts`, la teinte dans `src/lib/cosmetics.ts`.
 */
export type ProfileFamily = {
  regionId: string;
  owned: number;
  total: number;
};

/**
 * Le profil public d'un joueur (`player_profile`). Le serveur envoie des
 * compteurs et les quatre cartes que le joueur a épinglées — jamais sa
 * collection.
 */
export type PlayerProfile = {
  userId: string;
  displayName: string;
  level: number;
  points: number;
  /** Faux si le serveur a jugé la sauvegarde invraisemblable : pas de rang. */
  verified: boolean;
  uniqueCreators: number;
  totalCards: number;
  legendaryCards: number;
  epicCards: number;
  goldCards: number;
  holoCards: number;
  catalogSize: number;
  completion: number;
  rankCompletion: number | null;
  rankCards: number | null;
  showcaseSlugs: string[];
  byRarity: ProfileRarity[];
  /**
   * Complétion par famille de collection. Le serveur la calcule à partir du
   * catalogue (`creators.region`) : c'est la seule façon de savoir combien un
   * **autre** joueur possède dans chaque famille, son catalogue à lui n'existant
   * pas dans cette app.
   */
  byRegion: ProfileFamily[];
};

/** Tri du classement, tel que l'accepte `leaderboard()` côté serveur. */
export type LeaderboardMetric =
  | "unique_creators"
  | "total_cards"
  | "legendary_cards"
  | "gold_cards"
  /** Tri par famille de collection : « qui complète le mieux l'Anglophonie ? ». */
  | "family";

/** Traduit les erreurs de l'API en phrases utilisables dans l'interface. */
function messageFor(status: number, code: string, raw: string): string {
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

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/**
 * Lit un tableau de lignes JSON : ce que le serveur n'a pas pu produire est
 * ignoré, ligne par ligne. Un `null` dans la réponse ne doit pas faire tomber
 * toute la liste.
 */
function readRows<T>(payload: unknown, read: (raw: unknown) => T | null): T[] {
  if (!Array.isArray(payload)) return [];
  const rows: T[] = [];
  for (const raw of payload) {
    const row = read(raw);
    if (row) rows.push(row);
  }
  return rows;
}

/** Une ligne de `list_friends()`. */
function readFriendship(raw: unknown): Friendship | null {
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
function readIncomingRequest(raw: unknown): IncomingRequest | null {
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
function readOutgoingRequest(raw: unknown): OutgoingRequest | null {
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

/** Lit le profil public renvoyé par `player_profile()` (null si inconnu). */
function parseProfile(raw: unknown): PlayerProfile | null {
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
    byRarity: parseRarityBreakdown(record.by_rarity),
    byRegion: parseFamilyBreakdown(record.by_region),
  };
}

/** `{ legendary: { owned, total }, … }` → liste triée du plus rare au plus commun. */
function parseRarityBreakdown(raw: unknown): ProfileRarity[] {
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
function parseFamilyBreakdown(raw: unknown): ProfileFamily[] {
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
export function familyRatio(family: Pick<ProfileFamily, "owned" | "total">): number {
  return family.total > 0 ? family.owned / family.total : 0;
}

function parseTradeCard(raw: unknown): TradeCard | null {
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

function parseTradeCards(raw: unknown): TradeCard[] {
  return Array.isArray(raw) ? raw.flatMap((card) => parseTradeCard(card) ?? []) : [];
}

function parseSale(raw: unknown): MarketSale | null {
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

function parseLastPackCard(raw: unknown): LastPackCard | null {
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

function parseLastPack(raw: unknown): LastPack | null {
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
function parseLoss(raw: unknown): LastPackLoss | null {
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

function parseListing(raw: unknown): MarketListing | null {
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
function parsePurchase(raw: unknown): MarketPurchase | null {
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

function parseTrade(raw: unknown): Trade | null {
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

export class CloudApi {
  constructor(
    private readonly config: CloudConfig,
    private readonly storage: KeyValueStorage | null,
    // Transport par défaut : client HTTP natif dans l'APK, `fetch` ailleurs
    // (voir src/lib/cloud/transport.ts). Les tests injectent un faux transport.
    private readonly request: CloudFetch = cloudRequest,
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

  /** Met à jour l'e-mail retenu par la session enregistrée (après un ajout). */
  private setSessionEmail(email: string | null) {
    const session = this.session();
    if (!session) return;
    this.setSession({ ...session, email });
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
      const response = await this.request(`${this.config.url}/auth/v1/token?grant_type=refresh_token`, {
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

  /**
   * Valide le changement d'adresse par le code à 6 chiffres reçu par e-mail.
   *
   * C'est la seule façon de terminer un changement d'adresse depuis l'app : un
   * lien de confirmation renverrait vers une page web, et il n'y a pas de
   * serveur pour la recevoir. Le modèle « Change email address » doit contenir
   * `{{ .Token }}` (docs/cloud-supabase.md, § 2).
   */
  async verifyEmailChange(email: string, token: string): Promise<CloudSession> {
    const address = email.trim();
    const response = await this.send(`${this.config.url}/auth/v1/verify`, {
      method: "POST",
      body: JSON.stringify({ email: address, token: token.trim(), type: "email_change" }),
      raw: true,
    });
    const session = parseSession(response.body) ?? this.session();
    if (!session) throw new CloudError("Réponse d'authentification illisible.", "invalid_response", 0);
    // GoTrue renvoie la session de l'utilisateur, avec la nouvelle adresse.
    this.setSession({ ...session, email: session.email ?? address });
    return this.session() ?? session;
  }

  /** Redemande un code de changement d'adresse (le précédent a expiré). */
  async resendEmailChange(email: string): Promise<void> {
    const token = await this.accessToken();
    await this.send(`${this.config.url}/auth/v1/resend`, {
      method: "POST",
      body: JSON.stringify({ type: "email_change", email: email.trim() }),
      token: token ?? undefined,
      raw: true,
    });
  }

  async signOut(): Promise<void> {
    const session = this.session();
    this.setSession(null);
    if (!session) return;
    try {
      await this.request(`${this.config.url}/auth/v1/logout`, {
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
  async updateAccount(update: { email?: string; password?: string }): Promise<{
    /** La demande a pris effet tout de suite. */
    applied: boolean;
    /** Adresse en attente de confirmation, le cas échéant. */
    pendingEmail: string | null;
    /** Adresse retenue par le compte après l'appel. */
    email: string | null;
  }> {
    const token = await this.accessToken();
    if (!token) throw new CloudError("Connecte-toi pour utiliser le cloud.", "no_session", 401);

    const wanted = update.email?.trim();
    const payload: Record<string, string> = {};
    if (wanted) payload.email = wanted;
    if (update.password) payload.password = update.password;
    if (!Object.keys(payload).length) {
      throw new CloudError("Rien à enregistrer.", "invalid_response", 0);
    }

    const { body } = await this.send(`${this.config.url}/auth/v1/user`, {
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
    if (wanted) this.setSessionEmail(email);
    return { applied: true, pendingEmail: null, email: email ?? this.session()?.email ?? null };
  }

  /**
   * Connexion par adresse e-mail et mot de passe.
   *
   * Ne demande aucun envoi d'e-mail : c'est le chemin de récupération d'un
   * compte invité auquel on a attaché un mot de passe, sur un autre appareil.
   */
  async signInWithPassword(email: string, password: string): Promise<CloudSession> {
    const response = await this.send(`${this.config.url}/auth/v1/token?grant_type=password`, {
      method: "POST",
      body: JSON.stringify({ email: email.trim(), password }),
      // Un mot de passe erroné est une réponse attendue : on lit le corps.
      raw: true,
    });
    const session = parseSession(response.body);
    if (!session) {
      throw new CloudError("Réponse d'authentification illisible.", "invalid_response", 0);
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
  async openPack(
    /**
     * Récompense de série : `perfect` (défaut) force le tirage si le 7ᵉ jour
     * est atteint, `hourglasses` prévient le serveur que le joueur préfère les
     * trois sabliers — le serveur ne les crédite pas, ils vivent sur
     * l'appareil, il se contente de ne pas forcer le tirage.
     */
    jackpot: "perfect" | "hourglasses" = "perfect",
  ): Promise<{
    packs: number;
    lastRegenAt: string;
    openings: number;
    cards: Array<{
      creatorSlug: string;
      rarity: string;
      variant: string;
      rareDrop: boolean;
    }>;
    /** Boosters ouverts depuis le dernier Légendaire, après ce tirage. */
    pity: number;
    /** Jours de jeu d'affilée, ce tirage compris. */
    streak: number;
    /** Ce booster a payé la garantie des 80 boosters. */
    pityHit: boolean;
    /** Ce booster a payé le Perfect du 7ᵉ jour. */
    jackpot: boolean;
  }> {
    const result = await this.rpc("open_pack", { p_jackpot: jackpot });
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
      // Un serveur plus ancien (migration 0013 pas encore collée) ne renvoie
      // pas ces champs : on retombe sur les compteurs locaux plutôt que de
      // refuser un tirage déjà effectué.
      pity: Number(record.pity ?? 0),
      streak: Number(record.streak ?? 0),
      pityHit: record.pity_hit === true,
      jackpot: record.jackpot === true,
    };
  }

  /**
   * Les choix du **Paquet Scène** : cinq listes de cartes éligibles, décidées
   * par le serveur (rareté et variante comprises), plus le tirage rare du jour.
   *
   * Le même joueur, le même jour et la même famille rendent exactement la même
   * réponse : c'est ce qui permet à `openScenePack()` de la vérifier ensuite.
   */
  async scenePackChoices(family: string): Promise<{
    day: string;
    family: string;
    rareDrop: boolean;
    choices: Array<Array<{ slug: string; rarity: string; variant: string }>>;
  }> {
    const result = await this.rpc("scene_pack_choices", { p_family: family });
    const record = asRecord(result);
    if (!record) {
      throw new CloudError("Choix du Paquet Scène illisibles.", "invalid_response", 0);
    }
    const choices = Array.isArray(record.choices)
      ? record.choices.map((slot) =>
          Array.isArray(slot)
            ? slot.map((entry) => {
                const item = asRecord(entry);
                return {
                  slug: String(item?.slug ?? ""),
                  rarity: String(item?.rarity ?? ""),
                  variant: String(item?.variant ?? "standard"),
                };
              })
            : [],
        )
      : [];
    return {
      day: String(record.day ?? ""),
      family: String(record.family ?? family),
      rareDrop: record.rare_drop === true,
      choices,
    };
  }

  /**
   * Valide un Paquet Scène : le serveur recalcule ses choix et refuse toute
   * carte qui n'y figure pas. Renvoie les cartes normalisées — c'est cette
   * réponse qu'on range, jamais ce qu'on a envoyé.
   */
  async openScenePack(
    family: string,
    cards: Array<{ creatorSlug: string; rarity: string; variant: string }>,
  ): Promise<{
    family: string;
    sceneDay: string;
    rareDrop: boolean;
    cards: Array<{ creatorSlug: string; rarity: string; variant: string; rareDrop: boolean }>;
  }> {
    const result = await this.rpc("open_scene_pack", { p_family: family, p_cards: cards });
    const record = asRecord(result);
    if (!record) {
      throw new CloudError("Réponse du Paquet Scène illisible.", "invalid_response", 0);
    }
    const returned = Array.isArray(record.cards)
      ? record.cards.map((card) => {
          const c = asRecord(card);
          return {
            creatorSlug: String(c?.creatorSlug ?? ""),
            rarity: String(c?.rarity ?? ""),
            variant: String(c?.variant ?? "standard"),
            rareDrop: c?.rareDrop === true,
          };
        })
      : [];
    return {
      family: String(record.family ?? family),
      sceneDay: String(record.scene_day ?? ""),
      rareDrop: record.rare_drop === true,
      cards: returned,
    };
  }

  /**
   * Teste la joignabilité du projet : `GET /auth/v1/health`, lecture pure,
   * aucune donnée modifiée. Sert au bouton « Tester la connexion » de l'écran
   * Compte — et à distinguer une panne réseau d'une configuration erronée.
   */
  async ping(): Promise<{ host: string }> {
    await this.send(`${this.config.url}/auth/v1/health`, { method: "GET", raw: true });
    return { host: new URL(this.config.url).host };
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
    /** Boosters ouverts depuis le dernier Légendaire (compteur du serveur). */
    pity: number;
    /** Jours de jeu d'affilée. */
    streak: number;
    /** Le Perfect du 7ᵉ jour attend d'être dépensé. */
    jackpotReady: boolean;
    /** Journée de jeu du dernier Paquet Scène ouvert (`null` si aucun). */
    sceneDay: string | null;
    /** Le Paquet Scène du jour est-il encore là ? */
    sceneReady: boolean;
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
      pity: Number(record.pity ?? 0),
      streak: Number(record.streak ?? 0),
      jackpotReady: record.jackpot_ready === true,
      sceneDay: record.scene_day ? String(record.scene_day) : null,
      // Un projet qui n'a pas encore collé `0014` ne renvoie pas le champ :
      // sans information, on laisse le paquet disponible (le serveur refusera
      // le second, avec sa propre phrase).
      sceneReady: record.scene_day === undefined ? true : record.scene_ready === true,
    };
  }

  // ---------------------------------------------------------------- échanges

  /**
   * Cherche un joueur par son pseudo (2 caractères minimum, hors soi-même).
   *
   * Réservé au serveur : la fonction ne renvoie que pseudo, niveau et nombre de
   * créateurs uniques — jamais les collections, qui restent privées.
   */
  async searchPlayers(query: string): Promise<PlayerSearchResult[]> {
    const result = await this.rpc("search_players", { p_query: query });
    if (!Array.isArray(result)) return [];
    return result.flatMap((raw) => {
      const record = asRecord(raw);
      const userId = record?.userId;
      if (typeof userId !== "string" || !userId) return [];
      return [
        {
          userId,
          displayName: typeof record?.displayName === "string" ? record.displayName : "Collectionneur",
          level: Number(record?.level ?? 1),
          uniqueCreators: Number(record?.uniqueCreators ?? 0),
        },
      ];
    });
  }

  /**
   * Variantes qu'un joueur possède pour un créateur donné.
   *
   * La collection des autres reste privée : la réponse ne concerne qu'un seul
   * créateur, et ne dit que les variantes (jamais les comptes). Sert à formuler
   * une offre qui a une chance d'aboutir.
   */
  async playerVariants(userId: string, slug: string): Promise<string[]> {
    const result = await this.rpc("player_variants", { p_user: userId, p_slug: slug });
    return Array.isArray(result) ? result.map(String) : [];
  }

  /**
   * Le profil public d'un joueur (`player_profile`) : identité, chiffres,
   * complétion, rangs et vitrine. Sans identifiant, celui du compte connecté.
   * `null` si ce joueur n'a jamais envoyé sa partie au cloud.
   */
  async playerProfile(userId?: string): Promise<PlayerProfile | null> {
    const result = await this.rpc("player_profile", { p_user_id: userId ?? null });
    return parseProfile(result);
  }

  /**
   * Propose un échange : `given` (ce que j'offre) contre `wanted` (ce que je
   * demande). Le serveur recopie la rareté depuis le catalogue et vérifie que je
   * possède bien ce que j'offre, sur ma **sauvegarde cloud**.
   *
   * `recipientMissing` renseigne une carte que le destinataire ne possède pas
   * (d'après sa dernière sauvegarde) : l'offre part quand même, l'appareil
   * prévient le joueur qu'elle restera sans doute sans réponse.
   */
  async createTrade(
    recipientId: string,
    given: Array<{ creatorSlug: string; variant: string }>,
    wanted: Array<{ creatorSlug: string; variant: string }>,
  ): Promise<{ trade: Trade; recipientMissing: TradeCard | null }> {
    const result = await this.rpc("create_trade", {
      p_recipient: recipientId,
      p_given: given,
      p_wanted: wanted,
    });
    const record = asRecord(result);
    const trade = parseTrade(record?.trade);
    if (!trade) throw new CloudError("Réponse d'échange illisible.", "invalid_response", 0);
    return { trade, recipientMissing: parseTradeCard(record?.recipientMissing) };
  }

  /**
   * Répond à une offre reçue. Accepter déplace les cartes des **deux** côtés
   * dans la même transaction : le serveur ne croit ni l'un ni l'autre sur
   * parole, il relit les deux collections avant de bouger quoi que ce soit.
   *
   * `given` / `received` sont renvoyés du point de vue de l'appelant, pour que
   * l'appareil applique exactement le même changement à sa partie locale.
   */
  async respondTrade(
    tradeId: number,
    accept: boolean,
  ): Promise<{ status: TradeStatus; trade: Trade; given: TradeCard[]; received: TradeCard[] }> {
    const result = await this.rpc("respond_trade", { p_trade: tradeId, p_accept: accept });
    const record = asRecord(result);
    const trade = parseTrade(record?.trade);
    if (!trade) throw new CloudError("Réponse d'échange illisible.", "invalid_response", 0);
    return {
      status: trade.status,
      trade,
      given: parseTradeCards(record?.given),
      received: parseTradeCards(record?.received),
    };
  }

  /** Retire une offre encore en attente (seul le proposeur peut l'annuler). */
  async cancelTrade(tradeId: number): Promise<Trade> {
    const result = await this.rpc("cancel_trade", { p_trade: tradeId });
    const trade = parseTrade(result);
    if (!trade) throw new CloudError("Réponse d'échange illisible.", "invalid_response", 0);
    return trade;
  }

  /**
   * Offres du joueur : reçues et envoyées, en attente d'abord.
   *
   * L'appareil s'en sert aussi pour appliquer une offre acceptée pendant qu'il
   * était ailleurs : les cartes sont déjà écrites côté serveur, la partie locale
   * se réaligne dessus (`applyTradeResult`).
   */
  async listTrades(): Promise<TradeListItem[]> {
    const result = await this.rpc("list_trades", {});
    if (!Array.isArray(result)) return [];
    return result.flatMap((raw) => {
      const record = asRecord(raw);
      const id = Number(record?.id);
      const partnerId = record?.partnerId;
      if (!Number.isFinite(id) || typeof partnerId !== "string") return [];
      const status = record?.status;
      return [
        {
          id,
          direction: record?.direction === "out" ? "out" : "in",
          status: (status === "accepted" || status === "declined" || status === "cancelled"
            ? status
            : "open") as TradeStatus,
          partnerId,
          partnerName: typeof record?.partnerName === "string" ? record.partnerName : "Collectionneur",
          given: parseTradeCards(record?.given),
          received: parseTradeCards(record?.received),
          createdAt: String(record?.createdAt ?? ""),
          resolvedAt: record?.resolvedAt ? String(record.resolvedAt) : null,
        },
      ];
    });
  }

  // --------------------------------------------------------------- Twitch

  /**
   * L'adresse à ouvrir pour se connecter avec Twitch. Supabase (et non
   * l'appareil) détient le secret du client Twitch ; l'appareil ne fait
   * qu'ouvrir la porte et attendre le retour.
   */
  twitchAuthorizeUrl(redirectTo: string): string {
    return twitchAuthorizeUrl(this.config, redirectTo);
  }

  /**
   * Installe une session obtenue par OAuth (Twitch).
   *
   * Le fragment d'une redirection Supabase ne contient que les jetons, pas
   * l'utilisateur : on demande donc `/auth/v1/user` avec le jeton frais, puis on
   * enregistre la session comme les autres. C'est ce qui rend la connexion
   * Twitch indiscernable du reste de l'app une fois installée.
   */
  async adoptSession(tokens: { accessToken: string; refreshToken: string; expiresIn: number }): Promise<CloudSession> {
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
      ({ body, status } = await this.send(`${this.config.url}/auth/v1/user`, {
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
    this.setSession(session);
    return session;
  }

  // ------------------------------------------------------------------ hôtel

  /**
   * Le comptoir : les cartes des autres joueurs, les plus récentes d'abord.
   * Les siennes sont exclues, comme les annonces de plus de trente jours.
   */
  async marketShelf(limit = 30): Promise<MarketListing[]> {
    const result = await this.rpc("market_shelf", { p_limit: limit });
    if (!Array.isArray(result)) return [];
    return result.flatMap((raw) => {
      const listing = parseListing(raw);
      return listing ? [listing] : [];
    });
  }

  /**
   * Dépose un doublon à l'hôtel. Le serveur vérifie que la carte est bien dans
   * la collection envoyée, que ce n'est pas la dernière copie, et **paie tout
   * de suite** : `points` est le nouveau solde, à appliquer côté appareil.
   */
  async marketSell(cardId: string): Promise<{ listing: MarketListing; payout: number; points: number }> {
    const result = await this.rpc("market_sell", { p_card_id: cardId });
    const record = asRecord(result);
    const listing = parseListing(record?.listing);
    const payout = Number(record?.payout);
    if (!listing || !Number.isFinite(payout)) {
      throw new CloudError("Réponse de l'hôtel illisible.", "invalid_response", 0);
    }
    const points = Number(record?.points);
    return { listing, payout, points: Number.isFinite(points) ? points : 0 };
  }

  /**
   * Les annonces ouvertes d'un joueur (« qu'a-t-il déposé à l'hôtel ? »).
   * Sans identifiant, les siennes. Sert à la vitrine de la fiche publique.
   */
  async marketListingsOf(userId?: string): Promise<MarketListing[]> {
    const result = await this.rpc("market_listings_of", { p_user: userId ?? null });
    if (!Array.isArray(result)) return [];
    return result.flatMap((raw) => {
      const listing = parseListing(raw);
      return listing ? [listing] : [];
    });
  }

  /**
   * Tes ventes récentes à l'hôtel (`market_sales()`), de quoi remplir le carnet
   * de notifications — le comptoir, lui, ne montre que ce qui est encore à
   * vendre.
   *
   * Vide si la fonction n'est pas encore collée sur le projet : le carnet vit
   * sans les ventes, et l'appelant n'a rien à faire de spécial.
   */
  async marketSales(limit = 20): Promise<MarketSale[]> {
    const result = await this.rpc("market_sales", { p_limit: limit });
    if (!Array.isArray(result)) return [];
    return result.flatMap((raw) => {
      const sale = parseSale(raw);
      return sale ? [sale] : [];
    });
  }

  /**
   * L'étagère des Last Packs : mes paquets et ceux de mes amis, tant qu'ils
   * sont frais (dix minutes), avec les cartes déjà prises.
   *
   * Renvoie `null` quand `0012_last_pack.sql` n'est pas encore collée : la
   * feuille dit alors qu'il n'y a rien d'exposé plutôt que d'afficher une
   * erreur réseau. Rien n'est deviné côté client : c'est le serveur qui sait
   * qui est exposé, et pour combien de temps.
   */
  async lastPackShelf(): Promise<LastPackShelf | null> {
    const result = await this.rpc("last_pack_shelf", {});
    const record = asRecord(result);
    if (!record) return null;
    const packs = Array.isArray(record.packs)
      ? record.packs.flatMap((raw) => {
          const parsed = parseLastPack(raw);
          return parsed ? [parsed] : [];
        })
      : [];
    const windowMinutes = Number(record.windowMinutes);
    const stealPerDay = Number(record.stealPerDay);
    return {
      now: String(record.now ?? ""),
      windowMinutes: Number.isFinite(windowMinutes) ? windowMinutes : 10,
      stealPerDay: Number.isFinite(stealPerDay) ? stealPerDay : 1,
      stoleToday: record.stoleToday === true,
      packs,
    };
  }

  /**
   * Vole une carte dans le paquet d'un ami. Le serveur vérifie tout (amitié,
   * fenêtre, une carte par jour, carte encore là) et réécrit **les deux**
   * collections ; `card` est ce que l'appareil doit ajouter à la sienne.
   */
  async lastPackSteal(packId: number, index: number): Promise<LastPackSteal> {
    const result = await this.rpc("last_pack_steal", { p_pack: packId, p_index: index });
    const record = asRecord(result);
    const card = asRecord(record?.card);
    const marker = Number(card?.fromLastPack);
    const id = card?.id;
    if (!record || typeof id !== "string" || !id || !Number.isFinite(marker)) {
      throw new CloudError("Réponse de vol illisible.", "invalid_response", 0);
    }
    return {
      packId: Number(record.packId),
      index: Number(record.index),
      ownerId: String(record.ownerId ?? ""),
      ownerName: typeof record.ownerName === "string" ? record.ownerName : "Un collectionneur",
      card: {
        id,
        creatorSlug: String(card?.creatorSlug ?? ""),
        rarity: String(card?.rarity ?? ""),
        variant: String(card?.variant ?? "standard"),
        obtainedAt: Number(card?.obtainedAt ?? 0),
        rareDrop: card?.rareDrop === true,
        fromLastPack: marker,
      },
    };
  }

  /**
   * Ce qu'on t'a pris (`last_pack_losses()`) : de quoi remplir le carnet de
   * notifications. Vide si la migration n'est pas collée.
   */
  async lastPackLosses(limit = 20): Promise<LastPackLoss[]> {
    const result = await this.rpc("last_pack_losses", { p_limit: limit });
    if (!Array.isArray(result)) return [];
    return result.flatMap((raw) => {
      const loss = parseLoss(raw);
      return loss ? [loss] : [];
    });
  }

  /**
   * Achète une carte au comptoir. Le serveur débite les points, écrit la carte
   * dans la sauvegarde et referme l'annonce ; `card` est exactement ce que
   * l'appareil doit ajouter à sa collection.
   */
  async marketBuy(listingId: number): Promise<{ card: MarketPurchase; price: number; points: number }> {
    const result = await this.rpc("market_buy", { p_listing: listingId });
    const record = asRecord(result);
    const card = parsePurchase(record?.card);
    const price = Number(record?.price);
    if (!card || !Number.isFinite(price)) {
      throw new CloudError("Réponse de l'hôtel illisible.", "invalid_response", 0);
    }
    const points = Number(record?.points);
    return { card, price, points: Number.isFinite(points) ? points : 0 };
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

  async leaderboard(
    limit = 20,
    metric: LeaderboardMetric = "unique_creators",
    region: string | null = null,
  ): Promise<LeaderboardRow[]> {
    const result = await this.rpc("leaderboard", { p_limit: limit, p_metric: metric, p_region: region });
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

  // -------------------------------------------------------------- Amis
  //
  // Le serveur décide tout (voir `0008_friends.sql`) : ces méthodes ne font que
  // lire ses réponses et les mettre en forme. Chacune est **tolérante** — une
  // ligne illisible est ignorée plutôt que de faire échouer toute la liste —
  // parce qu'un écran d'amis qui ne s'ouvre pas est pire qu'un ami manquant.

  async listFriends(): Promise<Friendship[]> {
    return readRows(await this.rpc("list_friends", {}), readFriendship);
  }

  async listIncomingFriendRequests(): Promise<IncomingRequest[]> {
    return readRows(await this.rpc("list_incoming_friend_requests", {}), readIncomingRequest);
  }

  async listOutgoingFriendRequests(): Promise<OutgoingRequest[]> {
    return readRows(await this.rpc("list_outgoing_friend_requests", {}), readOutgoingRequest);
  }

  /**
   * Envoie une demande d'ami. `recipientId` est l'identifiant du **joueur**
   * (`profiles.user_id`) — on le trouve par `searchPlayers()`, jamais en le
   * devinant : un identifiant inventé ne peut pas aboutir côté serveur.
   */
  async sendFriendRequest(recipientId: string): Promise<SendFriendRequestOutcome> {
    const record = asRecord(await this.rpc("send_friend_request", { p_recipient: recipientId }));
    return {
      alreadyFriends: record?.alreadyFriends === true,
      existing: asRecord(record?.existingRequest) !== null,
      sent: asRecord(record?.request) !== null,
    };
  }

  /**
   * Accepte une demande reçue. Vrai si le serveur a bien basculé la demande.
   *
   * On lit `request.status` et non `friendship` : si la relation existait déjà,
   * le serveur ne renvoie pas de ligne `friends` (insertion sans conflit) alors
   * que la demande, elle, a bien été acceptée.
   */
  async acceptFriendRequest(requestId: number): Promise<boolean> {
    const record = asRecord(await this.rpc("accept_friend_request", { p_request_id: requestId }));
    return asRecord(record?.request)?.status === "accepted";
  }

  async rejectFriendRequest(requestId: number): Promise<void> {
    await this.rpc("reject_friend_request", { p_request_id: requestId });
  }

  async cancelFriendRequest(requestId: number): Promise<void> {
    await this.rpc("cancel_friend_request", { p_request_id: requestId });
  }

  async removeFriend(friendId: string): Promise<void> {
    await this.rpc("remove_friend", { p_friend: friendId });
  }

  /** Deux joueurs sont-ils amis ? Sert au profil public (« Ajouter en ami »). */
  async hasFriendship(userId: string): Promise<boolean> {
    return (await this.rpc("has_friendship", { p_user: userId })) === true;
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
    let response: { status: number; ok: boolean; text(): Promise<string> };
    try {
      response = await this.request(url, {
        method: init.method,
        headers: this.headers(init.token),
        body: init.body,
      });
    } catch (error) {
      // Message auto-diagnostic : sans le nom d'hôte, le chemin ni la cause
      // technique, un échec réseau est indiscernable d'une adresse de projet
      // mal recopiée ou d'un refus du WebView.
      let where = "";
      try {
        const parsed = new URL(url);
        where = `${parsed.host}${parsed.pathname}`;
      } catch {
        where = "";
      }
      const cause = error instanceof Error ? `${error.name}: ${error.message}`.slice(0, 120) : "";
      const detail = [where, cause].filter(Boolean).join(" — ");
      throw new CloudError(
        detail
          ? `Réseau injoignable : impossible de joindre ${detail}. Vérifie ta connexion — ta partie locale est intacte.`
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
