import type { CloudCore } from "./core";
import type { LastPackLoss, LastPackShelf, LastPackSteal, MarketListing, MarketPurchase, MarketSale } from "./types";
import { CloudError, asRecord, parseLastPack, parseListing, parseLoss, parsePurchase, parseSale } from "./core";

/**
 * Le comptoir : les cartes des autres joueurs, les plus récentes d'abord.
 * Les siennes sont exclues, comme les annonces de plus de trente jours.
 */
export async function marketShelf(core: CloudCore, limit = 30): Promise<MarketListing[]> {
  const result = await core.rpc("market_shelf", { p_limit: limit });
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
export async function marketSell(core: CloudCore, cardId: string): Promise<{ listing: MarketListing; payout: number; points: number }> {
  const result = await core.rpc("market_sell", { p_card_id: cardId });
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
export async function marketListingsOf(core: CloudCore, userId?: string): Promise<MarketListing[]> {
  const result = await core.rpc("market_listings_of", { p_user: userId ?? null });
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
export async function marketSales(core: CloudCore, limit = 20): Promise<MarketSale[]> {
  const result = await core.rpc("market_sales", { p_limit: limit });
  if (!Array.isArray(result)) return [];
  return result.flatMap((raw) => {
    const sale = parseSale(raw);
    return sale ? [sale] : [];
  });
}

/**
 * Achète une carte au comptoir. Le serveur débite les points, écrit la carte
 * dans la sauvegarde et referme l'annonce ; `card` est exactement ce que
 * l'appareil doit ajouter à sa collection.
 */
export async function marketBuy(core: CloudCore, listingId: number): Promise<{ card: MarketPurchase; price: number; points: number }> {
  const result = await core.rpc("market_buy", { p_listing: listingId });
  const record = asRecord(result);
  const card = parsePurchase(record?.card);
  const price = Number(record?.price);
  if (!card || !Number.isFinite(price)) {
    throw new CloudError("Réponse de l'hôtel illisible.", "invalid_response", 0);
  }
  const points = Number(record?.points);
  return { card, price, points: Number.isFinite(points) ? points : 0 };
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
export async function lastPackShelf(core: CloudCore): Promise<LastPackShelf | null> {
  const result = await core.rpc("last_pack_shelf", {});
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
export async function lastPackSteal(core: CloudCore, packId: number, index: number): Promise<LastPackSteal> {
  const result = await core.rpc("last_pack_steal", { p_pack: packId, p_index: index });
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
export async function lastPackLosses(core: CloudCore, limit = 20): Promise<LastPackLoss[]> {
  const result = await core.rpc("last_pack_losses", { p_limit: limit });
  if (!Array.isArray(result)) return [];
  return result.flatMap((raw) => {
    const loss = parseLoss(raw);
    return loss ? [loss] : [];
  });
}
