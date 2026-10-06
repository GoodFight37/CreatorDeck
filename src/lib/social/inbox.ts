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
import type { MarketSale, TradeListItem } from "@/lib/cloud/api";
import type { FriendLists } from "@/lib/social/friends";

/** D'où vient une ligne. Sert à choisir l'icône et à compter par famille. */
export type InboxKind =
  | "trade_in"
  | "trade_concluded"
  | "trade_declined"
  | "friend_request"
  | "friend_new"
  | "sale";

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

/** Les listes déjà chargées, telles que le store les tient. */
export type InboxSources = {
  trades: TradeListItem[];
  friends: FriendLists;
  /**
   * Ventes récentes de tes cartes (`market_sales()`). Vide tant que
   * `0010_ventes.sql` n'est pas collé — le carnet vit très bien sans.
   */
  sales?: MarketSale[];
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
 *   * une vente : « Ta carte de X est partie à l'hôtel ».
 *
 * Ce qui est **volontairement ignoré** : tes propres actions là où tu les as
 * déjà vues (une offre que tu viens de proposer, un ami que tu viens
 * d'accepter, une annonce que tu viens de déposer). Un carnet qui raconte au
 * joueur ce qu'il vient de faire ne sert à rien.
 */
export function buildInbox(sources: InboxSources): InboxItem[] {
  const { trades, friends, sales = [] } = sources;
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

  return items
    .filter((item) => Number.isFinite(Date.parse(item.at)))
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

/** Où l'on garde la dernière visite du carnet, pour un joueur donné. */
export function seenKey(userId: string): string {
  return `creatordeck.inbox.seen.${userId}`;
}
