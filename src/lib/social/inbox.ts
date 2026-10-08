/**
 * Le carnet de notifications — la liste de « ce qui est arrivé pendant que tu
 * n'étais pas là ».
 *
 * Rien n'est inventé ici : chaque ligne vient d'une chose que le serveur a déjà
 * enregistrée — une offre d'échange, une réponse à une offre, une demande
 * d'ami, une amitié acceptée, une carte vendue à l'hôtel. Le serveur ne tient
 * pas de table « notifications » : il n'en a pas besoin, puisqu'il garde déjà
 * ces faits-là. Le carnet les **relit** et les met en français.
 *
 * Ce module est pur : on lui donne les listes déjà chargées, il rend les lignes
 * triées. C'est ce qui permet de le tester sans navigateur ni réseau.
 *
 * Ce qu'il n'est pas : un système d'envoi. Faire vibrer le téléphone quand
 * l'app est fermée demande un service de push (voir `docs/cloud-supabase.md`
 * §9) — ici, on s'occupe de ce qui attend le joueur quand il revient.
 */
import { CREATOR_BY_SLUG, RARITY_META, type Rarity } from "@/lib/catalog";
import type { LastPackLoss, LastPackShelf, MarketSale, TradeListItem } from "@/lib/cloud/api";
import { describeCard } from "@/lib/market";
import type { FriendLists } from "@/lib/social/friends";

/** D'où vient une ligne. Sert à choisir l'icône et à compter par famille. */
export type InboxKind =
  | "trade_in"
  | "trade_concluded"
  | "trade_declined"
  | "friend_request"
  | "friend_new"
  | "sale"
  | "last_pack"
  /** Un ami vient d'ouvrir un booster : ses cartes sont encore prenables. */
  | "friend_pack"
  /** Le créateur que tu as épinglé est en direct. */
  | "wishlist_live";

export type InboxItem = {
  /** Identifiant stable : deux chargements ne créent pas deux fois la ligne. */
  id: string;
  kind: InboxKind;
  /** La phrase courte, celle qu'on lit d'abord. */
  title: string;
  /** Le détail, ou `null` quand le titre suffit. */
  body: string | null;
  /** Date ISO de l'événement (pas celle du chargement). */
  at: string;
  /** Le joueur concerné, quand il y en a un. */
  who: string | null;
};

/**
 * Où mène un tap.
 *
 * Le carnet ne porte pas d'adresse toute faite (pas d'identifiant de créateur,
 * pas de numéro d'échange) : ce qu'il porte, c'est une **famille**. La famille
 * suffit, parce que chaque famille a un seul bon endroit dans le jeu. Cette
 * table est donc la règle de navigation, écrite une fois et testée
 * (`src/lib/social/inbox.test.ts`) — un tap qui ne mène nulle part était
 * exactement le défaut du carnet.
 */
export type InboxTarget = "classeur" | "compte" | "amis" | "last-pack" | "hotel";

/** La destination de chaque famille de nouvelles. */
export const KIND_TARGETS: Record<InboxKind, InboxTarget> = {
  // Un échange vit dans l'écran Compte, section Échanges (proposer, accepter).
  trade_in: "compte",
  trade_concluded: "compte",
  trade_declined: "compte",
  // Les amis ont leur feuille, avec son onglet « demandes ».
  friend_request: "amis",
  friend_new: "amis",
  // Une vente se constate dans le classeur : la carte n'y est plus.
  sale: "classeur",
  // Un Last Pack se regarde là où il est exposé.
  last_pack: "last-pack",
  friend_pack: "last-pack",
  // Le direct du créateur épinglé se voit sur sa carte, dans le classeur.
  wishlist_live: "classeur",
};

/**
 * L'onglet interne à ouvrir, quand la destination en a un. Sans entrée ici, on
 * arrive simplement sur la première section de la destination.
 */
export const KIND_SECTIONS: Partial<Record<InboxKind, string>> = {
  // Une demande d'ami attend une réponse : on ouvre directement la liste des
  // demandes plutôt que celle des amis déjà acceptés.
  friend_request: "incoming",
  // Un échange **attendu** : la feuille de compte s'ouvre sur la section des
  // échanges, et le panneau s'y ouvre au lieu de rester replié. Sans ça, le
  // carnet annonçait une offre et déposait le joueur en haut d'un écran où il
  // fallait la retrouver à la main — c'est-à-dire nulle part.
  trade_in: "trades",
  // Une offre acceptée ou refusée se constate au même endroit : le panneau des
  // échanges, qui porte l'historique.
  trade_concluded: "trades",
  trade_declined: "trades",
};

/** La destination d'une ligne : l'écran, et la section quand elle en a une. */
export function cibleDe(item: Pick<InboxItem, "kind">): { target: InboxTarget; section?: string } {
  const target = KIND_TARGETS[item.kind];
  const section = KIND_SECTIONS[item.kind];
  return section ? { target, section } : { target };
}

/** Les listes déjà chargées, telles que le store les tient. */
export type InboxSources = {
  trades: TradeListItem[];
  friends: FriendLists;
  /**
   * Ventes récentes de tes cartes (`market_sales()`). Vide tant que
   * `0010_ventes.sql` n'est pas collé — le carnet vit très bien sans.
   */
  sales?: MarketSale[];
  /**
   * Cartes qu'on t'a prises à l'ouverture d'un booster (`last_pack_losses()`).
   * Vide tant que `0012_last_pack.sql` n'est pas collée.
   */
  lastPackLosses?: LastPackLoss[];
  /**
   * L'étagère du Last Pack (`last_pack_shelf()`) : les boosters de tes amis
   * encore ouverts. Le serveur les filtre déjà (`expires_at > now`) — ce que le
   * carnet en fait, c'est la phrase « X a ouvert Kameto, Last Pack encore
   * 8 min », c'est-à-dire l'invitation à aller voir.
   */
  lastPackShelf?: LastPackShelf | null;
  /**
   * Le créateur épinglé (`wishlist`), et son direct s'il est en ligne.
   *
   * Le module ne va **pas** chercher le direct lui-même : c'est l'écran qui
   * sait l'heure et lit le direct publié, et qui décide si le créateur épinglé
   * streame à cet instant. Ici, on ne fait que mettre la nouvelle en français.
   * `liveAt` est la date de début du direct (celle que Twitch donne) : c'est
   * elle qui sert d'horodatage, donc un nouveau direct crée une nouvelle ligne
   * au lieu de rafraîchir l'ancienne.
   */
  wishlist?: WishlistLive | null;
  /** L'heure (ms), pour dire « encore 8 min ». Défaut : l'horloge locale. */
  now?: number;
};

/** Ce qu'il faut savoir du créateur épinglé pour écrire une ligne. */
export type WishlistLive = {
  slug: string;
  /** Date de début du direct, ou `null` si le créateur n'est pas en ligne. */
  liveAt: string | null;
  /** Le titre du direct, quand il y en a un. */
  title?: string | null;
};

/**
 * Au-delà, le carnet devient illisible : on garde les plus récentes et on
 * s'arrête. Les listes sources sont déjà bornées côté serveur ; c'est une
 * seconde ceinture.
 */
export const INBOX_LIMIT = 40;

/** « 2 cartes contre 1 », « 1 carte contre 1 ». */
export function describeTrade(given: number, received: number): string {
  const side = (count: number) => `${count} carte${count > 1 ? "s" : ""}`;
  return `${side(given)} contre ${side(received)}`;
}

/**
 * La carte d'un paquet qui mérite d'être nommée : la plus rare (l'ordre vient
 * de `RARITY_META`), et à rareté égale la première. C'est elle qui donne son
 * titre à la ligne « X a ouvert … » — « Kameto » fait plus envie que « un
 * commun ».
 */
export function bestCardOf(cards: readonly LastPackCardLike[]): LastPackCardLike | null {
  let best: LastPackCardLike | null = null;
  let rank = -1;
  for (const card of cards) {
    const order = RARITY_META[card.rarity as Rarity]?.order ?? 0;
    if (order > rank) {
      rank = order;
      best = card;
    }
  }
  return best;
}

/** Le peu qu'un paquet expose et dont `bestCardOf` a besoin. */
export type LastPackCardLike = { creatorSlug: string; rarity: string; variant?: string };

/**
 * Construit le carnet, du plus récent au plus ancien.
 *
 * Les règles, ligne par ligne :
 *
 *   * une offre **reçue** encore ouverte : « X te propose un échange » ;
 *   * l'offre que **tu** avais proposée, acceptée : « X a accepté ton offre » —
 *     c'est la nouvelle qu'on attend le plus, elle doit être en tête ;
 *   * la même, refusée : « X a refusé ton offre » ;
 *   * un échange **reçu** et conclu : « Échange conclu avec X » (tu l'as accepté,
 *     peut-être depuis un autre appareil) ;
 *   * une demande d'ami reçue : « X veut être ton ami » ;
 *   * une amitié acceptée : « X est maintenant ton ami » ;
 *   * une vente : « Ta carte de X est partie à l'hôtel » ;
 *   * un vol de Last Pack : « X t'a piqué ton légendaire » — la ligne la plus
 *     dure du carnet, et celle qui doit se voir.
 *
 * Ce qui est **volontairement ignoré** : tes propres actions là où tu les as
 * déjà vues (une offre que tu viens de proposer, un ami que tu viens
 * d'accepter, une annonce que tu viens de déposer). Un carnet qui raconte au
 * joueur ce qu'il vient de faire ne sert à rien.
 */
export function buildInbox(sources: InboxSources): InboxItem[] {
  const { trades, friends, sales = [], lastPackLosses = [], lastPackShelf = null, wishlist = null } = sources;
  const items: InboxItem[] = [];

  for (const trade of trades) {
    const who = trade.partnerName || "Un collectionneur";
    if (trade.status === "open") {
      // Seules les offres **reçues** attendent une réponse.
      if (trade.direction !== "in") continue;
      items.push({
        id: `trade:${trade.id}`,
        kind: "trade_in",
        title: `${who} te propose un échange`,
        body: describeTrade(trade.received.length, trade.given.length),
        at: trade.createdAt,
        who,
      });
      continue;
    }
    if (trade.status === "accepted") {
      const mine = trade.direction === "out";
      items.push({
        id: `trade:${trade.id}`,
        kind: "trade_concluded",
        title: mine ? `${who} a accepté ton offre` : `Échange conclu avec ${who}`,
        body: describeTrade(
          mine ? trade.given.length : trade.received.length,
          mine ? trade.received.length : trade.given.length,
        ),
        at: trade.resolvedAt ?? trade.createdAt,
        who,
      });
      continue;
    }
    // Refusée : seule une offre que tu avais proposée mérite une ligne (si tu
    // as refusé la sienne, tu le sais déjà).
    if (trade.status === "declined" && trade.direction === "out") {
      items.push({
        id: `trade:${trade.id}`,
        kind: "trade_declined",
        title: `${who} a refusé ton offre`,
        body: null,
        at: trade.resolvedAt ?? trade.createdAt,
        who,
      });
    }
  }

  for (const request of friends.incoming) {
    items.push({
      id: `friend-request:${request.id}`,
      kind: "friend_request",
      title: `${request.senderName || "Un joueur"} veut être ton ami`,
      body: null,
      at: request.createdAt,
      who: request.senderName || null,
    });
  }

  for (const friendship of friends.friends) {
    items.push({
      id: `friend:${friendship.id}`,
      kind: "friend_new",
      title: `${friendship.friendName || "Un joueur"} est maintenant ton ami`,
      body: null,
      at: friendship.createdAt,
      who: friendship.friendName || null,
    });
  }

  for (const sale of sales) {
    items.push({
      id: `sale:${sale.id}`,
      kind: "sale",
      title: `Ta carte est partie à l'hôtel`,
      body: `${sale.buyerName || "Un joueur"} l'a achetée pour ${sale.price} points.`,
      at: sale.soldAt,
      who: sale.buyerName || null,
    });
  }

  for (const loss of lastPackLosses) {
    const who = loss.thiefName || "Un collectionneur";
    const creator = CREATOR_BY_SLUG.get(loss.card.creatorSlug)?.displayName ?? "une carte";
    // La phrase dit la rareté quand elle est rare : « ton légendaire » n'est
    // pas la même nouvelle que « une carte ».
    const title =
      loss.card.rarity === "legendary"
        ? `${who} t'a piqué ton légendaire`
        : loss.card.rarity === "epic"
          ? `${who} t'a piqué ton épique`
          : `${who} t'a piqué une carte`;
    items.push({
      id: `last-pack:${loss.id}`,
      kind: "last_pack",
      title,
      body: `${creator} · ${describeCard(loss.card.rarity, loss.card.variant)}`,
      at: loss.stolenAt,
      who,
    });
  }

  // Les boosters des amis encore ouverts : « X a ouvert Kameto, Last Pack
  // encore 8 min ». Le tien est ignoré — tu viens de le faire, un carnet qui
  // raconte au joueur ce qu'il vient de faire ne sert à rien (même règle que
  // pour les offres que tu as proposées).
  const now = sources.now ?? Date.now();
  for (const pack of lastPackShelf?.packs ?? []) {
    if (pack.mine) continue;
    const best = bestCardOf(pack.cards);
    const creator = best ? CREATOR_BY_SLUG.get(best.creatorSlug) : undefined;
    if (!creator) continue;
    const left = minutesLeft(pack.expiresAt, now, lastPackShelf?.windowMinutes ?? 10);
    items.push({
      id: `friend-pack:${pack.id}`,
      kind: "friend_pack",
      title: `${pack.ownerName || "Un ami"} a ouvert ${creator.displayName}`,
      // La fenêtre est la seule chose périssable de cette ligne : elle se dit.
      body: left > 0 ? `Last Pack encore ${left} min` : "Last Pack terminé",
      at: pack.drawnAt,
      who: pack.ownerName || null,
    });
  }

  // Le créateur épinglé qui passe en direct. La date de début vient de Twitch :
  // si le direct a commencé il y a vingt minutes, la ligne est déjà ancienne —
  // et donc déjà lue. C'est voulu : le carnet sert à rater le moins de choses
  // possible, pas à faire vibrer pour un direct qui dure depuis une heure.
  if (wishlist?.liveAt) {
    const creator = CREATOR_BY_SLUG.get(wishlist.slug);
    if (creator) {
      const title = (wishlist.title ?? "").trim();
      items.push({
        id: `wishlist-live:${wishlist.slug}:${wishlist.liveAt}`,
        kind: "wishlist_live",
        title: `${creator.displayName} est en direct`,
        body: title || null,
        at: wishlist.liveAt,
        who: null,
      });
    }
  }

  return items
    .filter((item) => Number.isFinite(Date.parse(item.at)))
    .sort((left, right) => right.at.localeCompare(left.at))
    .slice(0, INBOX_LIMIT);
}

/** Minutes restantes avant la fermeture d'un Last Pack, plafonnées à la fenêtre. */
function minutesLeft(expiresAt: string, now: number, windowMinutes: number): number {
  const left = Date.parse(expiresAt) - now;
  if (!Number.isFinite(left) || left <= 0) return 0;
  return Math.min(windowMinutes, Math.ceil(left / 60_000));
}

/**
 * Le carnet, plus la ligne du direct du créateur épinglé.
 *
 * La ligne du direct ne vient pas du serveur : elle naît d'un fait qu'il publie
 * déjà (le direct en cours) croisé avec un choix du joueur (son épinglé). La
 * fusion vit ici, pure, pour que la pastille de la navigation et la feuille du
 * carnet comptent **exactement** la même chose.
 */
export function mergeInbox(base: readonly InboxItem[], wishlist?: WishlistLive | null): InboxItem[] {
  const extra = wishlist ? buildInbox({ trades: [], friends: { friends: [], incoming: [], outgoing: [] }, wishlist }) : [];
  if (!extra.length) return [...base];
  return [...base, ...extra]
    .sort((left, right) => right.at.localeCompare(left.at))
    .slice(0, INBOX_LIMIT);
}

/**
 * Combien de lignes sont arrivées **depuis la dernière visite** du carnet.
 *
 * `seenAt` est une date ISO gardée sur l'appareil, par joueur : passer d'un
 * compte à l'autre ne doit pas effacer (ni ressusciter) les nouveautés de
 * l'autre.
 */
export function unreadCount(items: InboxItem[], seenAt: string | null): number {
  if (!seenAt) return items.length;
  const since = Date.parse(seenAt);
  if (!Number.isFinite(since)) return items.length;
  return items.filter((item) => Date.parse(item.at) > since).length;
}

/**
 * « N amis ont ouvert un booster il y a moins d'une heure » — l'aiguille de
 * preuve sociale de l'accueil.
 *
 * Elle se lit dans le carnet, sans rien demander de plus au serveur : les lignes
 * `friend_pack` portent déjà **qui** a ouvert, **quand**, et la source
 * (`last_pack_shelf`) ne contient que des ouvertures encore fraîches. Un ami
 * compté deux fois (deux boosters ouverts) ne compte qu'une fois : la phrase
 * parle de **personnes**, pas de paquets.
 *
 * Le tri par date et la fenêtre vivent ici, purs, pour que l'accueil et les
 * tests regardent la même règle.
 */
export function friendsOpenedRecently(
  items: readonly InboxItem[],
  now: number,
  windowMs = 3_600_000,
): { count: number; latestAt: string | null } {
  const noms = new Set<string>();
  let latestAt: string | null = null;
  for (const item of items) {
    if (item.kind !== "friend_pack") continue;
    const at = Date.parse(item.at);
    if (!Number.isFinite(at) || now - at > windowMs) continue;
    noms.add(item.who ?? item.id);
    if (!latestAt || item.at > latestAt) latestAt = item.at;
  }
  return { count: noms.size, latestAt };
}

/** Où l'on garde la dernière visite du carnet, pour un joueur donné. */
export function seenKey(userId: string): string {
  return `creatordeck.inbox.seen.${userId}`;
}
