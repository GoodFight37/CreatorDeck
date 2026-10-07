import type { CloudCore } from "./core";
import type { PlayerSearchResult, Trade, TradeCard, TradeListItem, TradeStatus } from "./types";
import { CloudError, asRecord, parseTrade, parseTradeCard, parseTradeCards, readFriendship, readIncomingRequest, readOutgoingRequest, readRows } from "./core";
import type { Friendship, IncomingRequest, OutgoingRequest, SendFriendRequestOutcome } from "@/lib/social/friends";

/**
 * Cherche un joueur par son pseudo (2 caractères minimum, hors soi-même).
 *
 * Réservé au serveur : la fonction ne renvoie que pseudo, niveau et nombre de
 * créateurs uniques — jamais les collections, qui restent privées.
 */
export async function searchPlayers(core: CloudCore, query: string): Promise<PlayerSearchResult[]> {
  const result = await core.rpc("search_players", { p_query: query });
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
export async function playerVariants(core: CloudCore, userId: string, slug: string): Promise<string[]> {
  const result = await core.rpc("player_variants", { p_user: userId, p_slug: slug });
  return Array.isArray(result) ? result.map(String) : [];
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
export async function createTrade(
core: CloudCore,
  recipientId: string,
  given: Array<{ creatorSlug: string; variant: string }>,
  wanted: Array<{ creatorSlug: string; variant: string }>,
): Promise<{ trade: Trade; recipientMissing: TradeCard | null }> {
  const result = await core.rpc("create_trade", {
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
export async function respondTrade(
core: CloudCore,
  tradeId: number,
  accept: boolean,
): Promise<{ status: TradeStatus; trade: Trade; given: TradeCard[]; received: TradeCard[] }> {
  const result = await core.rpc("respond_trade", { p_trade: tradeId, p_accept: accept });
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
export async function cancelTrade(core: CloudCore, tradeId: number): Promise<Trade> {
  const result = await core.rpc("cancel_trade", { p_trade: tradeId });
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
export async function listTrades(core: CloudCore): Promise<TradeListItem[]> {
  const result = await core.rpc("list_trades", {});
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

export async function listFriends(core: CloudCore): Promise<Friendship[]> {
  return readRows(await core.rpc("list_friends", {}), readFriendship);
}

export async function listIncomingFriendRequests(core: CloudCore): Promise<IncomingRequest[]> {
  return readRows(await core.rpc("list_incoming_friend_requests", {}), readIncomingRequest);
}

export async function listOutgoingFriendRequests(core: CloudCore): Promise<OutgoingRequest[]> {
  return readRows(await core.rpc("list_outgoing_friend_requests", {}), readOutgoingRequest);
}

/**
 * Envoie une demande d'ami. `recipientId` est l'identifiant du **joueur**
 * (`profiles.user_id`) — on le trouve par `searchPlayers()`, jamais en le
 * devinant : un identifiant inventé ne peut pas aboutir côté serveur.
 */
export async function sendFriendRequest(core: CloudCore, recipientId: string): Promise<SendFriendRequestOutcome> {
  const record = asRecord(await core.rpc("send_friend_request", { p_recipient: recipientId }));
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
export async function acceptFriendRequest(core: CloudCore, requestId: number): Promise<boolean> {
  const record = asRecord(await core.rpc("accept_friend_request", { p_request_id: requestId }));
  return asRecord(record?.request)?.status === "accepted";
}

export async function rejectFriendRequest(core: CloudCore, requestId: number): Promise<void> {
  await core.rpc("reject_friend_request", { p_request_id: requestId });
}

export async function cancelFriendRequest(core: CloudCore, requestId: number): Promise<void> {
  await core.rpc("cancel_friend_request", { p_request_id: requestId });
}

export async function removeFriend(core: CloudCore, friendId: string): Promise<void> {
  await core.rpc("remove_friend", { p_friend: friendId });
}

/** Deux joueurs sont-ils amis ? Sert au profil public (« Ajouter en ami »). */
export async function hasFriendship(core: CloudCore, userId: string): Promise<boolean> {
  return (await core.rpc("has_friendship", { p_user: userId })) === true;
}
