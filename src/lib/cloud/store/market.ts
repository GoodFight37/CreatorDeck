import type { CloudActionOutcome } from "./types";
import type { CloudStoreContext } from "./context";
import { CREATOR_BY_SLUG } from "@/lib/catalog";
import { applyMarketSale, applyMarketPurchase, applyLastPackSteal, type OwnedCard } from "@/lib/game-engine";

/**
 * Les actions « market » du magasin cloud : mêmes corps qu'avant la
 * découpe, mais reçus par le contexte (`ctx`) au lieu d'être des méthodes
 * d'objet. Aucun comportement n'a changé.
 */
export function marketActions(ctx: CloudStoreContext) {
  return {
    // --------------------------------------------------- Hôtel des ventes
    //
    // Même règle que le reste : le serveur décide et écrit, l'appareil rejoue
    // le même changement sur la partie locale puis la pousse. Un dépôt, comme
    // un achat, est donc **déjà fait** quand l'écran affiche « c'est vendu » :
    // si la poussée échoue, la sauvegarde du cloud reste la bonne.

    /** Charge le comptoir et le publie dans l'état cloud. */
    async loadMarket(): Promise<void> {
      const ready = ctx.tradeApi();
      if ("refusal" in ready) return;
      ctx.publish({ marketBusy: true });
      try {
        const market = await ready.api.marketShelf();
        ctx.publish({ market, marketAt: ctx.deps.now(), marketBusy: false });
      } catch (error) {
        ctx.publish({ marketBusy: false });
        ctx.fail(error, "Hôtel des ventes indisponible.");
      }
    },

    /**
     * Dépose un doublon à l'hôtel. Le serveur vérifie, retire la carte de la
     * collection du cloud et paie les points ; l'appareil applique le même
     * changement ici, puis pousse.
     *
     * La partie locale est envoyée **avant**, comme pour un échange accepté :
     * le serveur doit voir la carte dans la collection qu'il retire.
     */
    async sellCard(cardId: string): Promise<CloudActionOutcome> {
      const ready = ctx.tradeApi();
      if ("refusal" in ready) return ready.refusal;
      const local = ctx.deps.readState();
      if (!local) {
        const message = "Aucune partie à vendre pour l'instant : ouvre un booster d'abord.";
        ctx.publish({ message, isError: true });
        return { status: "unavailable", reason: "error", message };
      }
      ctx.publish({ busy: true });
      try {
        await ctx.push(local.version, local.updatedAt, false);
        if (ctx.state().pending) {
          const message =
            "Synchronise d'abord ta collection (Compte → Synchroniser) : l'hôtel a besoin de la collection du cloud à jour.";
          ctx.publish({ busy: false, message, isError: true });
          return { status: "unavailable", reason: "error", message };
        }
        const result = await ready.api.marketSell(cardId);
        const next = applyMarketSale(local, { cardId, payout: result.payout }, ctx.deps.now());
        ctx.deps.applyState(next);
        await ctx.pushAfterServer();
        await ctx.actions.loadMarket();
        const name = CREATOR_BY_SLUG.get(result.listing.creatorSlug)?.displayName ?? "Ta carte";
        const message = `${name} déposé à l'hôtel : +${result.payout} points, il est au comptoir.`;
        ctx.publish({ busy: false, message, isError: false });
        return { status: "done", message };
      } catch (error) {
        const refusal = ctx.cloudRefusal(error, "Dépôt impossible.");
        ctx.publish({ busy: false, message: refusal.message, isError: true });
        return refusal;
      }
    },

    /**
     * Achète une carte au comptoir. Le serveur débite les points, écrit la
     * carte dans la sauvegarde du cloud et referme l'annonce ; l'appareil
     * ajoute la même carte ici (avec sa marque `fromMarket`) puis pousse.
     */
    async buyCard(listingId: number): Promise<CloudActionOutcome> {
      const ready = ctx.tradeApi();
      if ("refusal" in ready) return ready.refusal;
      const local = ctx.deps.readState();
      if (!local) {
        const message = "Aucune partie à créditer pour l'instant.";
        ctx.publish({ message, isError: true });
        return { status: "unavailable", reason: "error", message };
      }
      ctx.publish({ busy: true });
      try {
        await ctx.push(local.version, local.updatedAt, false);
        if (ctx.state().pending) {
          const message =
            "Synchronise d'abord ta collection (Compte → Synchroniser) : l'hôtel a besoin de la collection du cloud à jour.";
          ctx.publish({ busy: false, message, isError: true });
          return { status: "unavailable", reason: "error", message };
        }
        const result = await ready.api.marketBuy(listingId);
        const card: OwnedCard = {
          id: result.card.id,
          creatorSlug: result.card.creatorSlug,
          rarity: result.card.rarity as OwnedCard["rarity"],
          variant: result.card.variant as OwnedCard["variant"],
          obtainedAt: result.card.obtainedAt,
          rareDrop: result.card.rareDrop,
          fromMarket: result.card.fromMarket,
        };
        const next = applyMarketPurchase(local, { card, price: result.price }, ctx.deps.now());
        if (next !== local) {
          ctx.deps.applyState(next);
          await ctx.pushAfterServer();
        }
        await ctx.actions.loadMarket();
        const name = CREATOR_BY_SLUG.get(result.card.creatorSlug)?.displayName ?? "Carte";
        const message = `${name} rejoint ton classeur pour ${result.price} points.`;
        ctx.publish({ busy: false, message, isError: false });
        return { status: "done", message };
      } catch (error) {
        const refusal = ctx.cloudRefusal(error, "Achat impossible.");
        ctx.publish({ busy: false, message: refusal.message, isError: true });
        return refusal;
      }
    },

    /** L'écran de l'hôtel, réinitialisé (déconnexion ou changement de compte). */
    clearMarket(): void {
      ctx.publish({ market: [], marketAt: null, marketBusy: false });
    },

    // ------------------------------------------------------------ Last Pack
    //
    // Le paquet qu'on vient d'ouvrir reste exposé dix minutes : le serveur le
    // publie tout seul (déclencheur sur les tirages), la feuille ne fait que
    // lire. Un vol, lui, se joue en trois temps — pousser sa collection, laisser
    // le serveur trancher, rejouer le résultat ici — comme un achat d'hôtel.

    async loadLastPacks(): Promise<void> {
      const ready = ctx.tradeApi();
      if ("refusal" in ready) return;
      ctx.publish({ lastPacksBusy: true });
      try {
        const lastPacks = await ready.api.lastPackShelf();
        ctx.publish({ lastPacks, lastPacksAt: ctx.deps.now(), lastPacksBusy: false });
      } catch (error) {
        // `0012_last_pack.sql` pas encore collée : l'étagère reste vide, la
        // feuille le dit, et rien d'autre ne casse.
        const refusal = ctx.cloudRefusal(error, "Last Pack indisponible.");
        ctx.publish({ lastPacksBusy: false, message: refusal.message, isError: true });
      }
    },

    /**
     * Vole une carte dans le paquet d'un ami. Le serveur vérifie tout (amitié,
     * dix minutes, une carte par jour, carte encore là) et réécrit **les deux**
     * collections ; l'appareil ajoute la carte ici, puis pousse.
     *
     * La collection locale part **avant** : le serveur doit la voir à jour,
     * puisqu'il retire la carte de la collection du propriétaire et vérifie la
     * sienne.
     */
    async stealLastPack(packId: number, index: number): Promise<CloudActionOutcome> {
      const ready = ctx.tradeApi();
      if ("refusal" in ready) return ready.refusal;
      const local = ctx.deps.readState();
      if (!local) {
        const message = "Aucune partie à compléter pour l'instant : ouvre un booster d'abord.";
        ctx.publish({ message, isError: true });
        return { status: "unavailable", reason: "error", message };
      }
      ctx.publish({ busy: true });
      try {
        await ctx.push(local.version, local.updatedAt, false);
        if (ctx.state().pending) {
          const message =
            "Synchronise d'abord ta collection (Compte → Synchroniser) : le vol a besoin de la collection du cloud à jour.";
          ctx.publish({ busy: false, message, isError: true });
          return { status: "unavailable", reason: "error", message };
        }
        const result = await ready.api.lastPackSteal(packId, index);
        const card: OwnedCard = {
          id: result.card.id,
          creatorSlug: result.card.creatorSlug,
          rarity: result.card.rarity as OwnedCard["rarity"],
          variant: result.card.variant as OwnedCard["variant"],
          obtainedAt: result.card.obtainedAt,
          rareDrop: result.card.rareDrop,
          fromLastPack: result.card.fromLastPack,
        };
        const next = applyLastPackSteal(local, { card }, ctx.deps.now());
        if (next !== local) {
          ctx.deps.applyState(next);
          await ctx.pushAfterServer();
        }
        await ctx.actions.loadLastPacks();
        const name = CREATOR_BY_SLUG.get(result.card.creatorSlug)?.displayName ?? "Une carte";
        const message = `${name} te revient de chez ${result.ownerName} : elle est dans ton classeur. Une carte par jour, c'était la tienne.`;
        ctx.publish({ busy: false, message, isError: false });
        return { status: "done", message };
      } catch (error) {
        const refusal = ctx.cloudRefusal(error, "Vol impossible.");
        ctx.publish({ busy: false, message: refusal.message, isError: true });
        return refusal;
      }
    },

    /** L'étagère, réinitialisée (déconnexion ou changement de compte). */
    clearLastPacks(): void {
      ctx.publish({ lastPacks: null, lastPacksAt: null, lastPacksBusy: false });
    },

  };
}
