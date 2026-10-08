/**
 * Les types publics du client cloud : ce que voit le reste de l'application
 * (session, sauvegarde distante, échanges, hôtel, Last Pack, arène, profils).
 *
 * Ils vivent hors de `api/index.ts` pour que le client reste lisible : ici, il
 * n'y a que des formes de données, aucun appel.
 */
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

/** Ce que le serveur répond après un dépôt d'arène (le score vient de lui). */
export type ArenaDeposit = {
  week: string;
  score: number;
  liveCount: number;
  /** Mon meilleur score de la semaine — celui qui compte au classement. */
  best: number;
  /** `true` si le dépôt n'a pas amélioré la semaine : l'ancienne arène reste. */
  kept: boolean;
};

export type ArenaEntry = {
  lineup: string[];
  score: number;
  liveCount: number;
  submittedAt: string;
};

export type ArenaMine = {
  week: string;
  draftOpen: boolean;
  rank: number | null;
  entry: ArenaEntry | null;
  draft: { picks: string[] } | null;
  /** Les semaines déjà encaissées (le journal, pour l'écran des emblèmes). */
  claims: Array<{ week: string; rank: number | null; hourglasses: number; emblem: boolean }>;
  /**
   * Les semaines terminées où le joueur a joué **et** n'a pas encore encaissé
   * sa récompense. La liste est calculée par le serveur : l'écran n'a plus
   * qu'à proposer le bouton.
   */
  pending: Array<{ week: string; rank: number }>;
};

export type ArenaBoard = {
  week: string;
  endsAt: string;
  draftOpen: boolean;
  rows: Array<{
    userId: string;
    displayName: string;
    score: number;
    liveCount: number;
    lineup: string[];
    rank: number;
  }>;
};

export type ArenaClaim = {
  week: string;
  alreadyClaimed: boolean;
  /** `null` : aucune arène déposée cette semaine-là. */
  rank: number | null;
  hourglasses: number;
  emblem: boolean;
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
 *
 * `stealable` dit si **cette** carte se prend : depuis `0034`, une Légendaire
 * et une carte Live restent exposées mais ne se volent pas. Le serveur le dit,
 * l'écran grise — et le refus tient même si l'écran se trompait.
 */
export type LastPackCard = {
  index: number;
  creatorSlug: string;
  rarity: string;
  variant: string;
  taken: boolean;
  stealable: boolean;
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
  /**
   * Le créateur que ce joueur cherche — sa wishlist. Un seul slug, ou `null`.
   * Lisible par tous : c'est une demande, pas un secret.
   */
  wishlistSlug: string | null;
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
