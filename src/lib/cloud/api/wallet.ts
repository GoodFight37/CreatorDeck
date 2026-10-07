/**
 * Le wallet : le solde du joueur, côté serveur (`0027_wallet.sql`).
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
