import type { CloudStoreContext } from "./context";
import type { TradeOutcome, PlayerSearchOutcome, TradeOfferCard } from "./types";
import { applyAcceptedTrades } from "@/lib/cloud/trades";
import { applyPackStatus } from "@/lib/game-engine";
import type { PlayerState } from "@/lib/game-engine";
import type { SendFriendRequestOutcome } from "@/lib/social/friends";
import { EMPTY_FRIEND_LISTS } from "@/lib/social/friends";
import { applyTradeResult } from "@/lib/game-engine";
import { describeCards } from "@/lib/cloud/trades";

/**
 * Les actions « social » du magasin cloud : mêmes corps qu'avant la
 * découpe, mais reçus par le contexte (`ctx`) au lieu d'être des méthodes
 * d'objet. Aucun comportement n'a changé.
 */
export function socialActions(ctx: CloudStoreContext) {
  return {
    /**
     * Statut de la réserve de boosters, calculé par le serveur.
     *
     * Le client l'appelle à la connexion pour afficher le bon compteur sans
     * dépendre de l'horloge locale. La réserve renvoyée est adoptée par la
     * partie locale (`applyPackStatus`) : la recharge passive repart de la
     * même ancre que le serveur.
     */
    /**
     * Cherche un partenaire par son pseudo (2 caractères minimum).
     *
     * Ne renvoie que pseudo, niveau et nombre de créateurs uniques : les
     * collections des autres joueurs restent privées. Le message est déjà prêt
     * à afficher, y compris quand il n'y a aucun résultat.
     */
    async searchPlayers(query: string): Promise<PlayerSearchOutcome> {
      const ready = ctx.tradeApi();
      if ("refusal" in ready) {
        return { players: [], message: ready.refusal.message, isError: true, asked: false };
      }
      try {
        const players = await ready.api.searchPlayers(query);
        return {
          players,
          message: players.length ? null : "Aucun joueur ne correspond à ce pseudo.",
          isError: false,
          asked: true,
        };
      } catch (error) {
        const refusal = ctx.cloudRefusal(error, "Recherche impossible.");
        ctx.publish({ busy: false, message: refusal.message, isError: true });
        return { players: [], message: refusal.message, isError: true, asked: true };
      }
    },

    /**
     * Variantes que le partenaire possède pour un créateur.
     *
     * Appel ciblé, silencieux à l'échelle du store : l'interface s'en sert pour
     * n'afficher que des cartes réellement disponibles.
     */
    async playerVariants(userId: string, slug: string): Promise<{ variants: string[]; message: string | null }> {
      const ready = ctx.tradeApi();
      if ("refusal" in ready) return { variants: [], message: ready.refusal.message };
      try {
        return { variants: await ready.api.playerVariants(userId, slug), message: null };
      } catch (error) {
        return { variants: [], message: ctx.cloudRefusal(error, "Lecture des variantes impossible.").message };
      }
    },

    // ------------------------------------------------------------- échanges

    /**
     * Relit les offres d'échange.
     *
     * C'est aussi le moment où les échanges acceptés pendant que cet appareil
     * était ailleurs entrent dans la partie locale : le serveur les a déjà
     * écrits, l'appareil s'aligne (voir `applyAcceptedTrades`).
     */
    async loadTrades(): Promise<void> {
      const ready = ctx.tradeApi();
      if ("refusal" in ready) return;
      ctx.publish({ busy: true });
      try {
        const { applied, blocked } = await ctx.refreshTrades(ready.api);
        const open = ctx.state().trades.filter((trade) => trade.status === "open");
        // Un échange appliqué (ou bloqué) a déjà son message : on ne l'écrase
        // pas avec le simple compte des offres en attente.
        if (applied === 0 && blocked === 0) {
          ctx.publish({
            message: open.length
              ? `${open.length} offre${open.length > 1 ? "s" : ""} en attente dans l'onglet Échanges.`
              : "Aucune offre en attente.",
            isError: false,
          });
        }
      } catch (error) {
        ctx.fail(error, "Chargement des échanges impossible.");
      }
    },

    /**
     * Propose un échange : `given` contre `wanted`.
     *
     * Deux précautions avant d'envoyer l'offre :
     *   1. la partie locale est poussée d'abord — le serveur vérifie les cartes
     *      offertes sur la **sauvegarde cloud**, jamais sur une liste envoyée
     *      par le client ;
     *   2. si le cloud est plus récent (autre appareil, échange accepté), on
     *      n'écrase rien : le joueur synchronise et recommence.
     */
    async proposeTrade(
      recipientId: string,
      given: readonly TradeOfferCard[],
      wanted: readonly TradeOfferCard[],
    ): Promise<TradeOutcome> {
      const ready = ctx.tradeApi();
      if ("refusal" in ready) return ready.refusal;
      const local = ctx.deps.readState();
      if (!local) {
        const message = "Partie locale illisible : rien n'a été proposé.";
        ctx.publish({ busy: false, message, isError: true });
        return { status: "unavailable", reason: "error", message };
      }
      ctx.publish({ busy: true });
      try {
        await ctx.push(local.version, local.updatedAt, false);
        if (ctx.state().pending) {
          const message =
            "Ta progression doit d'abord être enregistrée en ligne : sans elle, personne ne peut vérifier tes cartes. Ça se fait tout seul — réessaie dans un instant.";
          ctx.publish({ busy: false, message, isError: true });
          return { status: "unavailable", reason: "error", message };
        }
        const result = await ready.api.createTrade(recipientId, [...given], [...wanted]);
        const names = ctx.creatorNames();
        await ctx.refreshTrades(ready.api);
        const warning = result.recipientMissing
          ? ` Attention : ce joueur ne possède plus ${describeCards([result.recipientMissing], names)} — l'offre restera probablement sans réponse.`
          : "";
        const message = `Offre envoyée : ${describeCards(result.trade.proposerCards, names)} contre ${describeCards(result.trade.recipientCards, names)}.${warning}`;
        ctx.publish({ busy: false, message, isError: false });
        return { status: "done", message };
      } catch (error) {
        const refusal = ctx.cloudRefusal(error, "Proposition impossible.");
        ctx.publish({ busy: false, message: refusal.message, isError: true });
        return refusal;
      }
    },

    /**
     * Répond à une offre reçue.
     *
     * Accepter fait déplacer les cartes des **deux** côtés par le serveur, puis
     * l'appareil applique le même mouvement à sa partie locale et la pousse :
     * le classeur et le cloud restent d'accord.
     */
    async respondTrade(tradeId: number, accept: boolean): Promise<TradeOutcome> {
      const ready = ctx.tradeApi();
      if ("refusal" in ready) return ready.refusal;
      const local = ctx.deps.readState();
      ctx.publish({ busy: true });
      try {
        if (accept && local) {
          // Le serveur retire les cartes de la collection **du cloud** : on
          // envoie d'abord la partie locale, sinon il retirerait une carte que
          // cet appareil n'a pas (ou l'inverse) et le troc ne pourrait pas
          // s'appliquer ici. Refus explicite plutôt qu'application bancale.
          await ctx.push(local.version, local.updatedAt, false);
          if (ctx.state().pending) {
            const message =
              "Ta progression n'est pas encore enregistrée en ligne : patiente un instant et réessaie — l'échange lit la collection en ligne.";
            ctx.publish({ busy: false, message, isError: true });
            return { status: "unavailable", reason: "error", message };
          }
        }
        const result = await ready.api.respondTrade(tradeId, accept);
        const names = ctx.creatorNames();
        if (!accept) {
          await ctx.refreshTrades(ready.api);
          const message = "Offre refusée : aucune carte n'a bougé.";
          ctx.publish({ busy: false, message, isError: false });
          return { status: "done", message };
        }

        if (local) {
          let next: PlayerState;
          try {
            next = applyTradeResult(
              local,
              {
                tradeId,
                given: ctx.asEngineCards(result.given),
                received: ctx.asEngineCards(result.received),
              },
              ctx.deps.now(),
            );
          } catch {
            await ctx.refreshTrades(ready.api).catch(() => undefined);
            const message =
              "Échange accepté, mais cette carte a quitté cette partie : ta progression se recalera toute seule dans un instant.";
            ctx.publish({ busy: false, message, isError: true });
            return { status: "unavailable", reason: "error", message };
          }
          if (next !== local) {
            ctx.deps.applyState(next);
            await ctx.pushAfterServer();
          }
        }
        await ctx.refreshTrades(ready.api);
        const message = `Échange accepté : ${describeCards(result.received, names)} reçu${result.received.length > 1 ? "s" : ""}, ${describeCards(result.given, names)} donné${result.given.length > 1 ? "s" : ""}.`;
        ctx.publish({ busy: false, message, isError: false });
        return { status: "done", message };
      } catch (error) {
        const refusal = ctx.cloudRefusal(error, "Réponse impossible.");
        ctx.publish({ busy: false, message: refusal.message, isError: true });
        return refusal;
      }
    },

    /** Retire une offre encore en attente (seul le proposeur peut l'annuler). */
    async cancelTrade(tradeId: number): Promise<TradeOutcome> {
      const ready = ctx.tradeApi();
      if ("refusal" in ready) return ready.refusal;
      ctx.publish({ busy: true });
      try {
        await ready.api.cancelTrade(tradeId);
        await ctx.refreshTrades(ready.api);
        const message = "Offre annulée : tes cartes restent dans ta collection.";
        ctx.publish({ busy: false, message, isError: false });
        return { status: "done", message };
      } catch (error) {
        const refusal = ctx.cloudRefusal(error, "Annulation impossible.");
        ctx.publish({ busy: false, message: refusal.message, isError: true });
        return refusal;
      }
    },

    // ---------------------------------------------------------------- Amis
    //
    // Même refus que les échanges : pas de cloud configuré ou pas de compte →
    // on le dit, on ne tente pas un appel voué à échouer. Les méthodes qui
    // renvoient une liste rendent une liste vide dans ce cas, pour que l'écran
    // s'affiche avec son message au lieu d'une erreur réseau.

    /**
     * Charge les trois listes d'un coup et les publie dans l'état cloud.
     *
     * Un seul aller-retour pour l'écran : les trois RPC partent ensemble, et
     * une erreur réseau laisse l'état précédent en place plutôt que de vider la
     * liste sous les yeux du joueur.
     */
    async loadFriends(): Promise<void> {
      const ready = ctx.tradeApi();
      if ("refusal" in ready) return;
      ctx.publish({ friendsBusy: true });
      try {
        const [friends, incoming, outgoing] = await Promise.all([
          ready.api.listFriends(),
          ready.api.listIncomingFriendRequests(),
          ready.api.listOutgoingFriendRequests(),
        ]);
        ctx.publish({ friends: { friends, incoming, outgoing }, friendsAt: ctx.deps.now(), friendsBusy: false });
      } catch (error) {
        ctx.publish({ friendsBusy: false });
        ctx.fail(error, "Liste d'amis indisponible.");
      }
    },

    /** L'écran des amis, réinitialisé : utilisé à la déconnexion. */
    clearFriends(): void {
      ctx.publish({ friends: EMPTY_FRIEND_LISTS, friendsAt: null, friendsBusy: false });
    },

    async sendFriendRequest(recipientId: string): Promise<{
      outcome: SendFriendRequestOutcome | null;
      message: string | null;
      isError: boolean;
    }> {
      const ready = ctx.tradeApi();
      if ("refusal" in ready) return { outcome: null, message: ready.refusal.message, isError: true };
      try {
        const outcome = await ready.api.sendFriendRequest(recipientId);
        const message = outcome.alreadyFriends
          ? "Vous êtes déjà amis."
          : outcome.existing
            ? "Cette personne t'a déjà envoyé une demande : réponds-y dans « Reçues »."
            : outcome.sent
              ? "Demande envoyée."
              : "Demande impossible.";
        return { outcome, message, isError: false };
      } catch (error) {
        const refusal = ctx.cloudRefusal(error, "Demande d'ami impossible.");
        ctx.publish({ busy: false, message: refusal.message, isError: true });
        return { outcome: null, message: refusal.message, isError: true };
      }
    },

    async acceptFriendRequest(requestId: number): Promise<{ message: string | null; isError: boolean }> {
      const ready = ctx.tradeApi();
      if ("refusal" in ready) return { message: ready.refusal.message, isError: true };
      try {
        const accepted = await ready.api.acceptFriendRequest(requestId);
        return {
          message: accepted ? "Demande acceptée." : "Demande introuvable.",
          isError: !accepted,
        };
      } catch (error) {
        const refusal = ctx.cloudRefusal(error, "Acceptation impossible.");
        ctx.publish({ busy: false, message: refusal.message, isError: true });
        return { message: refusal.message, isError: true };
      }
    },

    async rejectFriendRequest(requestId: number): Promise<{ message: string | null; isError: boolean }> {
      const ready = ctx.tradeApi();
      if ("refusal" in ready) return { message: ready.refusal.message, isError: true };
      try {
        await ready.api.rejectFriendRequest(requestId);
        return { message: "Demande refusée.", isError: false };
      } catch (error) {
        const refusal = ctx.cloudRefusal(error, "Refus impossible.");
        ctx.publish({ busy: false, message: refusal.message, isError: true });
        return { message: refusal.message, isError: true };
      }
    },

    async cancelFriendRequest(requestId: number): Promise<{ message: string | null; isError: boolean }> {
      const ready = ctx.tradeApi();
      if ("refusal" in ready) return { message: ready.refusal.message, isError: true };
      try {
        await ready.api.cancelFriendRequest(requestId);
        return { message: "Demande annulée.", isError: false };
      } catch (error) {
        const refusal = ctx.cloudRefusal(error, "Annulation impossible.");
        ctx.publish({ busy: false, message: refusal.message, isError: true });
        return { message: refusal.message, isError: true };
      }
    },

    async removeFriend(friendId: string): Promise<{ message: string | null; isError: boolean }> {
      const ready = ctx.tradeApi();
      if ("refusal" in ready) return { message: ready.refusal.message, isError: true };
      try {
        await ready.api.removeFriend(friendId);
        return { message: "Ami retiré.", isError: false };
      } catch (error) {
        const refusal = ctx.cloudRefusal(error, "Retrait impossible.");
        ctx.publish({ busy: false, message: refusal.message, isError: true });
        return { message: refusal.message, isError: true };
      }
    },

  };
}
