import type { CloudActionOutcome } from "./types";
import type { CloudStoreContext } from "./context";
import { arenaRankLabel, arenaWeekLabel, applyArenaReward } from "@/lib/arena";

/**
 * Les actions « arena » du magasin cloud : mêmes corps qu'avant la
 * découpe, mais reçus par le contexte (`ctx`) au lieu d'être des méthodes
 * d'objet. Aucun comportement n'a changé.
 */
export function arenaActions(ctx: CloudStoreContext) {
  return {
    /**
     * Charge mon arène et le classement en un seul aller-retour.
     *
     * Les deux appels partent ensemble ; si le classement échoue, mon arène
     * s'affiche quand même (et l'inverse est vrai aussi). L'écran n'a donc
     * qu'un état à lire, et une seule fois.
     */
    async loadArena(): Promise<void> {
      const ready = ctx.tradeApi();
      if ("refusal" in ready) return;
      ctx.publish({ arenaBusy: true });
      try {
        const [mine, board] = await Promise.all([
          ready.api.arenaMe(),
          ready.api.arenaLeaderboard().catch(() => null),
        ]);
        ctx.publish({
          arenaMine: mine,
          arena: board ?? ctx.state().arena,
          arenaAt: ctx.deps.now(),
          arenaBusy: false,
        });
      } catch (error) {
        const refusal = ctx.cloudRefusal(error, "Arène indisponible.");
        ctx.publish({ arenaBusy: false, message: refusal.message, isError: true });
      }
    },

    /**
     * Dépose une arène : cinq slugs, choisis dans le classeur.
     *
     * Les refus du serveur arrivent en français et sont affichés tels quels
     * (« Une seule Légendaire par arène… ») : le client peut aussi les calculer
     * à l'avance pour griser le bouton, mais c'est le serveur qui tranche.
     */
    async submitArena(lineup: string[]): Promise<CloudActionOutcome> {
      const ready = ctx.tradeApi();
      if ("refusal" in ready) return ready.refusal;
      ctx.publish({ arenaBusy: true, message: null, isError: false });
      try {
        const result = await ready.api.arenaSubmit(lineup);
        await ctx.actions.loadArena();
        const message = result.kept
          ? `Arène déposée (${result.score} viewers) — mais tu avais déjà fait mieux cette semaine : c'est ton meilleur score qui compte.`
          : `Arène déposée : ${result.score} viewers.`;
        ctx.publish({ arenaBusy: false, message, isError: false });
        return { status: "done", message };
      } catch (error) {
        const refusal = ctx.cloudRefusal(error, "Dépôt impossible.");
        ctx.publish({ arenaBusy: false, message: refusal.message, isError: true });
        return refusal;
      }
    },

    /** Enregistre les cinq choix du draft du week-end. */
    async pickDraft(lineup: string[]): Promise<CloudActionOutcome> {
      const ready = ctx.tradeApi();
      if ("refusal" in ready) return ready.refusal;
      ctx.publish({ arenaBusy: true, message: null, isError: false });
      try {
        const result = await ready.api.arenaDraftPick(lineup);
        await ctx.actions.loadArena();
        const message = `Draft enregistré : ${result.score} viewers. C'est ton arène de la semaine.`;
        ctx.publish({ arenaBusy: false, message, isError: false });
        return { status: "done", message };
      } catch (error) {
        const refusal = ctx.cloudRefusal(error, "Draft impossible.");
        ctx.publish({ arenaBusy: false, message: refusal.message, isError: true });
        return refusal;
      }
    },

    /**
     * Encaisse la récompense d'une semaine terminée.
     *
     * Le serveur répond `hourglasses` **une seule fois** : le deuxième appel
     * rend zéro. Les sabliers sont crédités ici, sur la partie locale (comme
     * les points et l'XP), mais le fait d'avoir encaissé est enregistré côté
     * serveur — deux appareils ne touchent pas deux fois la même semaine.
     */
    async claimArena(week: string): Promise<CloudActionOutcome> {
      const ready = ctx.tradeApi();
      if ("refusal" in ready) return ready.refusal;
      ctx.publish({ arenaBusy: true, message: null, isError: false });
      try {
        const result = await ready.api.arenaClaim(week);
        if (result.hourglasses > 0) {
          const local = ctx.deps.readState();
          if (local) {
            const next = applyArenaReward(local, result.hourglasses, ctx.deps.now());
            if (next !== local) {
              ctx.deps.applyState(next);
              await ctx.pushAfterServer();
            }
          }
        }
        await ctx.actions.loadArena();
        const parts = [arenaWeekLabel(week)];
        if (result.rank) parts.push(arenaRankLabel(result.rank));
        if (result.hourglasses > 0) parts.push(`+${result.hourglasses} sablier${result.hourglasses > 1 ? "s" : ""}`);
        if (result.emblem) parts.push("emblème d'arène");
        const message =
          result.hourglasses > 0
            ? `${parts.join(" · ")} — encaissé.`
            : result.alreadyClaimed
              ? "Cette semaine-là a déjà été encaissée."
              : `${parts.join(" · ")} — rien à encaisser cette fois.`;
        ctx.publish({ arenaBusy: false, message, isError: false });
        return { status: "done", message };
      } catch (error) {
        const refusal = ctx.cloudRefusal(error, "Encaissement impossible.");
        ctx.publish({ arenaBusy: false, message: refusal.message, isError: true });
        return refusal;
      }
    },

    /**
     * Charge les propositions du draft du week-end.
     *
     * Hors du week-end le serveur refuse (« le draft, c'est le week-end ») :
     * ce refus n'est pas une erreur à afficher, c'est la règle — la feuille
     * laisse simplement les propositions vides et montre quand ça ouvre.
     */
    async loadDraftSlots(): Promise<void> {
      const ready = ctx.tradeApi();
      if ("refusal" in ready) return;
      ctx.publish({ arenaDraftBusy: true });
      try {
        const result = await ready.api.arenaDraftChoices();
        ctx.publish({ arenaDraftSlots: result.slots, arenaDraftBusy: false });
      } catch {
        ctx.publish({ arenaDraftSlots: null, arenaDraftBusy: false });
      }
    },

    /** L'arène, remise à zéro (déconnexion ou changement de compte). */
    clearArena(): void {
      ctx.publish({
        arena: null,
        arenaMine: null,
        arenaDraftSlots: null,
        arenaDraftBusy: false,
        arenaAt: null,
        arenaBusy: false,
      });
    },

  };
}
