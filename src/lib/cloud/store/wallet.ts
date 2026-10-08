import type { CloudStoreContext } from "./context";
import type { CloudActionOutcome, TribunalOutcome } from "./types";
import { CLOUD_DISABLED_HINT } from "@/lib/cloud/config";
import {
  applyTokens,
  applyWallet,
  claimMilestone as engineClaimMilestone,
  claimSeason as engineClaimSeason,
  claimTribunal as engineClaimTribunal,
  markTribunalClaimed as engineMarkTribunalClaimed,
  craftCreator as engineCraftCreator,
  getGameView,
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
 * Ce que le serveur vérifie, il le lit **chez lui** : la carte recyclée dans la
 * sauvegarde du joueur et le catalogue, le palier atteint dans la collection
 * projetée et son propre compteur de boosters, la famille dans la grille générée
 * depuis le jeu. L'appareil propose donc un **repère** (« cette carte », « ce
 * palier », « ce palier de famille »), jamais un montant — et la collection part
 * au cloud **avant** la demande, pour que le serveur regarde la bonne version.
 *
 * Les **jetons** sont la deuxième caisse (`0035_jetons.sql`) : même dessin,
 * autre monnaie — `syncTokens()` recale le miroir local, `craftWithTokens()`
 * paie le créateur visé, et les gains (le tirage, la série) sont versés par le
 * serveur au moment du fait.
 *
 * Trois gains ne passent pas par ici, et c'est volontaire : **un tirage, une
 * vente et un jour de série** sont versés par le serveur lui-même, au moment
 * où il enregistre le fait — il n'y a donc rien à demander, et rien à prouver.
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
    options: { pushFirst?: boolean } = {},
  ): Promise<CloudActionOutcome> {
    const ready = gate(kind === "craft" ? "rejoindre un créateur" : "encaisser tes points");
    if ("refusal" in ready) return ready.refusal;
    ctx.publish({ busy: true, message: null, isError: false });
    try {
      if (options.pushFirst) {
        // Le serveur relit la carte dans la sauvegarde du cloud : elle doit y
        // être avant qu'on la lui demande. Un envoi qui échoue ne bloque pas :
        // le refus du serveur, lui, sera clair.
        await ctx.pushAfterServer().catch(() => undefined);
      }
      const movement =
        kind === "craft"
          ? await ready.api.walletSpend(kind, ref)
          : await ready.api.walletCredit(kind, ref);
      const local = ctx.deps.readState();
      if (local) {
        ctx.deps.applyState(applyWallet(claim(local, ctx.deps.now()), movement.points, ctx.deps.now()));
      }
      // La collection a bougé (une carte en moins, un créateur en plus, un
      // palier coché) : le cloud doit le savoir tout de suite, sinon la
      // prochaine vérification du serveur regarderait une version périmée.
      await ctx.pushAfterServer().catch(() => undefined);
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

    /**
     * Recycle un doublon.
     *
     * On envoie **l'identifiant de la carte**, pas sa rareté : le serveur relit
     * la carte dans la sauvegarde et prend la rareté au catalogue. Un client ne
     * peut donc ni recycler une carte qu'il n'a pas, ni annoncer une rareté qui
     * n'est pas la sienne — et deux doublons de la même rareté paient bien deux
     * fois (c'est la carte qui est unique, pas la rareté).
     */
    async recycleDoublon(cardId: string): Promise<CloudActionOutcome> {
      return move("recycle", cardId, (state, now) => engineRecycleCard(state, cardId, now), (delta) =>
        delta > 0 ? `Doublon recyclé : +${delta} points.` : "Ce doublon était déjà recyclé.",
        { pushFirst: true },
      );
    },

    /**
     * Lit le solde de **jetons** du serveur et recale le miroir local.
     *
     * Silencieux en cas d'échec, comme `syncWallet` : l'écran garde alors ce
     * qu'il affiche déjà. Un projet qui n'a pas encore collé `0035` répond
     * « fonction inconnue » — le solde local reste donc tel quel.
     */
    async syncTokens(): Promise<number | null> {
      const api = ctx.resolve();
      if (!api?.session()) return null;
      try {
        const tokens = await api.tokensGet();
        const local = ctx.deps.readState();
        if (local) {
          const next = applyTokens(local, tokens, ctx.deps.now());
          if (next !== local) ctx.deps.applyState(next);
        }
        return tokens;
      } catch {
        return null;
      }
    },

    /**
     * Rejoint un créateur contre **400 jetons** (`0035`).
     *
     * Le serveur relit le prix et refuse une Légendaire, un créateur retiré du
     * classement ou déjà possédé : l'appareil propose un slug, jamais un prix.
     * La collection monte ensuite localement, puis part au cloud — le serveur a
     * déjà débité, et c'est sa version qui fait foi.
     */
    async craftWithTokens(slug: string): Promise<CloudActionOutcome> {
      const ready = gate("rejoindre un créateur");
      if ("refusal" in ready) return ready.refusal;
      ctx.publish({ busy: true, message: null, isError: false });
      try {
        const movement = await ready.api.tokensSpend(slug);
        const local = ctx.deps.readState();
        if (local) {
          const joined = engineCraftCreator(local, slug, ctx.deps.now());
          const next = applyTokens(joined, movement.tokens, ctx.deps.now());
          if (next !== local) ctx.deps.applyState(next);
        }
        await ctx.pushAfterServer().catch(() => undefined);
        const message =
          movement.spent > 0
            ? `Créateur rejoint : ${movement.spent} jetons dépensés.`
            : "Ce créateur était déjà payé.";
        ctx.publish({ busy: false, message, isError: false });
        return { status: "done", message, delta: -movement.spent };
      } catch (error) {
        const refusal = ctx.cloudRefusal(error, "Rejoindre ce créateur est impossible.");
        ctx.publish({ busy: false, message: refusal.message, isError: true });
        return refusal;
      }
    },

    /**
     * Encaisse une séance du Tribunal des Bannis (`0042_tribunal.sql`).
     *
     * Le client n'envoie ni les points ni le karma : la journée, les verdicts
     * rendus, et le login du créateur qui préside. Le serveur recalcule la note
     * depuis sa propre vérité et paie — une fois par journée de jeu, grâce à
     * l'index unique du journal des mouvements.
     *
     * L'appareil ne fait que **suivre** : il marque la séance comme passée et
     * adopte le solde du serveur. Si le serveur ne paie pas (karma trop bas,
     * séance vide), rien n'est écrit et l'écran garde la main.
     */
    async tribunalRecompense(
      day: string,
      verdicts: Record<string, string>,
      login: string | null,
    ): Promise<TribunalOutcome> {
      const ready = gate("faire payer ta séance");
      if ("refusal" in ready) return ready.refusal;
      ctx.publish({ busy: true, message: null, isError: false });
      try {
        const result = await ready.api.tribunalRecompense(day, verdicts, login);
        const local = ctx.deps.readState();
        if (local) {
          const now = ctx.deps.now();
          // Ce que le serveur a **réellement** versé : 0 quand la journée
          // était déjà payée — dans ce cas on ne fait que sceller la séance,
          // sans ajouter les points une seconde fois.
          const mirroir =
            result.gained > 0
              ? engineClaimTribunal(local, result.gained, now)
              : engineMarkTribunalClaimed(local, now);
          ctx.deps.applyState(applyWallet(mirroir, result.points, now));
        }
        await ctx.pushAfterServer().catch(() => undefined);
        const message = !result.paye
          ? `Karma ${result.karma} % : en dessous de ${result.seuil} %, la séance ne paie pas.`
          : result.gained > 0
            ? `Séance payée : +${result.gained} points${result.multiplicateur > 1 ? " (créateur en direct)" : ""}.`
            : "Cette séance était déjà payée aujourd'hui.";
        ctx.publish({ busy: false, message, isError: false });
        return {
          status: "done",
          message,
          delta: result.gained,
          karma: result.karma,
          multiplicateur: result.multiplicateur,
          paye: result.paye,
        };
      } catch (error) {
        const refusal = ctx.cloudRefusal(error, "La récompense du Tribunal est indisponible.");
        ctx.publish({ busy: false, message: refusal.message, isError: true });
        return refusal as Extract<TribunalOutcome, { status: "unavailable" }>;
      }
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

    /**
     * Réclame les paliers d'une famille.
     *
     * Un palier à la fois (`S04-2#3`) : le serveur relit le seuil et le montant
     * dans la grille générée depuis le jeu, compte lui-même les créateurs
     * possédés de la vague, et le journal des mouvements garantit qu'un palier
     * ne se paie qu'une fois. Les paliers sont ceux que **l'écran affiche** :
     * la famille se réclame donc exactement comme le joueur la voit.
     */
    async claimSeason(id: string): Promise<CloudActionOutcome> {
      const ready = gate("encaisser tes points");
      if ("refusal" in ready) return ready.refusal;
      const local = ctx.deps.readState();
      if (!local) {
        const refusal = ctx.cloudRefusal(new Error("partie locale absente"), "Récompense indisponible.");
        ctx.publish({ busy: false, message: refusal.message, isError: true });
        return refusal;
      }
      const now = ctx.deps.now();
      const season = getGameView(local, now).seasons.find((entry) => entry.id === id);
      const pending = (season?.tiers ?? [])
        .map((tier, index) => ({ tier, index }))
        .filter(({ tier }) => tier.unlocked && !tier.claimed);
      if (!pending.length) {
        const message = season ? `${season.name} : rien à réclamer pour l'instant.` : "Famille inconnue.";
        ctx.publish({ busy: false, message, isError: true });
        return { status: "unavailable", reason: "error", message };
      }

      ctx.publish({ busy: true, message: null, isError: false });
      try {
        // Les créateurs possédés se comptent chez le serveur, dans la
        // collection projetée : elle part avant la demande.
        await ctx.pushAfterServer().catch(() => undefined);
        let delta = 0;
        let points = local.points;
        for (const { index } of pending) {
          const movement = await ready.api.walletCredit("season", `${id}#${index + 1}`);
          delta += movement.delta;
          points = movement.points;
        }
        const next = ctx.deps.readState() ?? local;
        ctx.deps.applyState(applyWallet(engineClaimSeason(next, id, ctx.deps.now()), points, ctx.deps.now()));
        await ctx.pushAfterServer().catch(() => undefined);
        const message = delta > 0 ? `Saison ${id} : +${delta} points.` : "Cette famille était déjà payée.";
        ctx.publish({ busy: false, message, isError: false });
        return { status: "done", message, delta };
      } catch (error) {
        const refusal = ctx.cloudRefusal(error, "Récompense indisponible.");
        ctx.publish({ busy: false, message: refusal.message, isError: true });
        return refusal;
      }
    },
  };
}
