import type { CloudStoreContext } from "./context";
import type { CloudActionOutcome } from "./types";
import { CLOUD_DISABLED_HINT } from "@/lib/cloud/config";
import {
  applyWallet,
  claimMilestone as engineClaimMilestone,
  claimSeason as engineClaimSeason,
  craftCreator as engineCraftCreator,
  recycleCard as engineRecycleCard,
  type PlayerState,
} from "@/lib/game-engine";

/**
 * Les actions « wallet » du magasin cloud : ce qui rapporte et ce qui coûte des
 * points.
 *
 * Depuis `0027_wallet.sql`, le solde vit au serveur. Le client ne décide plus
 * d'un montant : il **demande** un gain (le serveur le tarife et vérifie
 * l'événement) ou une dépense (le serveur recalcule le coût depuis le
 * catalogue).
 *
 * Deux gains ne passent pas par ici, et c'est volontaire : **un tirage et une
 * vente** sont versés par le serveur lui-même, au moment où il enregistre le
 * fait — il n'y a donc rien à demander, et rien à prouver.
 *
 * Chaque action suit le même ordre : le serveur d'abord, le moteur local
 * ensuite, puis le solde du serveur est réadopté. Le solde affiché est ainsi
 * celui du serveur, et pas la somme de deux additions.
 */
export function walletActions(ctx: CloudStoreContext) {
  /**
   * Le joueur peut-il passer par le serveur **maintenant** ?
   *
   * Un refus (« pas de compte ») laisse l'appelant décider : l'écran, lui,
   * garde son chemin local quand le cloud n'est pas configuré — c'est le cas
   * d'un build hors ligne, où le wallet n'existe pas.
   */
  function gate(
    action: string,
  ): { api: NonNullable<ReturnType<CloudStoreContext["resolve"]>> } | { refusal: Extract<CloudActionOutcome, { status: "unavailable" }> } {
    const api = ctx.resolve();
    if (!api) {
      return { refusal: { status: "unavailable", reason: "not-configured", message: CLOUD_DISABLED_HINT } };
    }
    if (!api.session()) {
      const message = `Connecte-toi pour ${action} : tes points vivent sur ton compte.`;
      ctx.publish({ busy: false, message, isError: true });
      return { refusal: { status: "unavailable", reason: "no-session", message } };
    }
    return { api };
  }

  /** Écrit le solde du serveur dans la partie locale (le miroir). */
  function adopt(points: number): void {
    const local = ctx.deps.readState();
    if (!local) return;
    const next = applyWallet(local, points, ctx.deps.now());
    if (next !== local) ctx.deps.applyState(next);
  }

  /**
   * Le corps commun : demander au serveur, jouer l'action locale, adopter le
   * solde du serveur. `movement` renvoie ce que le serveur a accordé.
   */
  async function move(
    kind: "recycle" | "milestone" | "season" | "craft",
    ref: string,
    claim: (state: PlayerState, now: number) => PlayerState,
    describe: (delta: number) => string,
  ): Promise<CloudActionOutcome> {
    const ready = gate(kind === "craft" ? "rejoindre un créateur" : "encaisser tes points");
    if ("refusal" in ready) return ready.refusal;
    ctx.publish({ busy: true, message: null, isError: false });
    try {
      const movement =
        kind === "craft"
          ? await ready.api.walletSpend(kind, ref)
          : await ready.api.walletCredit(kind, ref);
      const local = ctx.deps.readState();
      if (local) {
        ctx.deps.applyState(applyWallet(claim(local, ctx.deps.now()), movement.points, ctx.deps.now()));
      }
      const message = describe(movement.delta);
      ctx.publish({ busy: false, message, isError: false });
      // `delta` remonte à l'écran : le serveur peut n'avoir rien versé (un
      // mouvement déjà payé), et l'écran ne doit pas annoncer +55 pour rien.
      return { status: "done", message, delta: movement.delta };
    } catch (error) {
      const refusal = ctx.cloudRefusal(error, "Mouvement de points impossible.");
      ctx.publish({ busy: false, message: refusal.message, isError: true });
      return refusal;
    }
  }

  return {
    /**
     * Lit le solde du serveur et **recale le miroir**. Silencieux en cas
     * d'échec : l'écran garde alors ce qu'il affiche déjà.
     */
    async syncWallet(): Promise<number | null> {
      const api = ctx.resolve();
      if (!api?.session()) return null;
      try {
        const points = await api.walletGet();
        adopt(points);
        return points;
      } catch {
        return null;
      }
    },

    /** Recycle un doublon : le serveur paie la valeur de la rareté. */
    async recycleDoublon(cardId: string, rarity: string): Promise<CloudActionOutcome> {
      return move("recycle", rarity, (state, now) => engineRecycleCard(state, cardId, now), (delta) =>
        delta > 0 ? `Doublon recyclé : +${delta} points.` : "Ce doublon était déjà recyclé.",
      );
    },

    /** Rejoint un créateur contre des points : le serveur recalcule le prix. */
    async craftWithPoints(slug: string): Promise<CloudActionOutcome> {
      return move("craft", slug, (state, now) => engineCraftCreator(state, slug, now), (delta) =>
        delta < 0 ? `Créateur rejoint : ${-delta} points dépensés.` : "Ce créateur était déjà payé.",
      );
    },

    /** Réclame un palier de collection : un palier ne se paie qu'une fois. */
    async claimMilestone(id: string): Promise<CloudActionOutcome> {
      return move("milestone", id, (state, now) => engineClaimMilestone(state, id, now), (delta) =>
        delta > 0 ? `Palier atteint : +${delta} points.` : "Ce palier était déjà payé.",
      );
    },

    /** Réclame les paliers d'une famille : le serveur compte les nouveaux. */
    async claimSeason(id: string): Promise<CloudActionOutcome> {
      return move("season", id, (state, now) => engineClaimSeason(state, id, now), (delta) =>
        delta > 0 ? `Saison ${id} : +${delta} points.` : "Cette famille était déjà payée.",
      );
    },
  };
}
