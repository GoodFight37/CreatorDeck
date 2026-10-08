/**
 * Le wallet : le solde du joueur, côté serveur (`0027_wallet.sql`), et les
 * jetons (`0035_jetons.sql`).
 *
 * Trois portes, et aucune ne laisse le client décider d'un montant :
 *
 *   * `walletGet()` lit le solde — c'est **lui qui fait foi**, la sauvegarde
 *     n'en garde qu'un miroir que le serveur recale ;
 *   * `walletCredit()` demande un gain. Le prix vient du serveur, et il vérifie
 *     l'événement quand il le peut (le tirage, la vente, le palier). Un gain
 *     déjà versé rapporte zéro : le serveur le dit, le client ne peut pas
 *     annoncer un gain qui n'a pas eu lieu ;
 *   * `walletSpend()` paie un artisanat. Le coût est recalculé depuis le
 *     catalogue : on envoie un créateur, jamais un prix.
 *
 * Les **jetons** suivent exactement le même dessin depuis `0035` : ils vivent
 * au serveur, `tokensGet()` relit le solde (et recale le miroir local), et
 * `tokensSpend()` paie le créateur visé — 400 jetons, prix relu ici, jamais une
 * Légendaire. Les gains, eux, n'ont pas de porte : le tirage et la série les
 * versent côté serveur, au moment du fait.
 */
import type { CloudCore } from "./core";
import { CloudError, asRecord } from "./core";

/** Le solde du joueur, tel que le serveur le connaît. */
export async function walletGet(core: CloudCore): Promise<number> {
  const record = asRecord(await core.rpc("wallet_get", {}));
  if (!record || record.ok !== true) {
    throw new CloudError("Réponse de solde illisible.", "invalid_response", 0);
  }
  return Number(record.points ?? 0);
}

export type WalletMovement = {
  /** Ce qui a **réellement** bougé (0 si l'événement était déjà payé). */
  delta: number;
  /** Le solde du serveur après le mouvement. */
  points: number;
};

export async function walletCredit(core: CloudCore, kind: string, ref: string): Promise<WalletMovement> {
  const record = asRecord(await core.rpc("wallet_credit", { p_kind: kind, p_ref: ref }));
  if (!record || record.ok !== true) {
    throw new CloudError("Réponse de crédit illisible.", "invalid_response", 0);
  }
  return { delta: Number(record.gained ?? 0), points: Number(record.points ?? 0) };
}

export async function walletSpend(core: CloudCore, kind: string, ref: string): Promise<WalletMovement> {
  const record = asRecord(await core.rpc("wallet_spend", { p_kind: kind, p_ref: ref }));
  if (!record || record.ok !== true) {
    throw new CloudError("Réponse de dépense illisible.", "invalid_response", 0);
  }
  return { delta: -Number(record.spent ?? 0), points: Number(record.points ?? 0) };
}

// ------------------------------------------------------------------- jetons
/** Le solde de jetons du joueur, tel que le serveur le connaît (`0035`). */
export async function tokensGet(core: CloudCore): Promise<number> {
  const record = asRecord(await core.rpc("tokens_get", {}));
  if (!record || record.ok !== true) {
    throw new CloudError("Réponse de jetons illisible.", "invalid_response", 0);
  }
  return Number(record.tokens ?? 0);
}

export type TokenSpend = {
  /** Ce qui a **réellement** été débité (400, ou 0 si c'était déjà payé). */
  spent: number;
  /** Le solde de jetons du serveur après la dépense. */
  tokens: number;
};

/**
 * Rejoint un créateur contre des jetons.
 *
 * Le prix n'est pas envoyé : le serveur relit le sien (`token_prices()`), et
 * refuse une Légendaire, un créateur retiré du classement ou déjà possédé.
 */
export async function tokensSpend(core: CloudCore, slug: string): Promise<TokenSpend> {
  const record = asRecord(await core.rpc("tokens_spend", { p_slug: slug }));
  if (!record || record.ok !== true) {
    throw new CloudError("Réponse de dépense illisible.", "invalid_response", 0);
  }
  return { spent: Number(record.spent ?? 0), tokens: Number(record.tokens ?? 0) };
}
