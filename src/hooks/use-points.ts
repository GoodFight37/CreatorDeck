"use client";

/**
 * Les gestes qui font bouger des points, décidés à **un seul endroit**.
 *
 * Depuis `0027_wallet.sql`, le solde vit au serveur : recycler un doublon,
 * rejoindre un créateur, réclamer un palier ou une famille ne sont plus des
 * décisions de l'appareil. La règle est la même que pour l'ouverture d'un
 * paquet, et elle est écrite ici une fois :
 *
 *   1. **Build sans cloud** (développement, jeu hors ligne) : le moteur local
 *      fait tout, comme avant ;
 *   2. **Cloud configuré, compte connecté** : c'est le serveur qui paie —
 *      il vérifie l'événement ou recalcule le prix, puis le solde du serveur
 *      remplace celui de l'appareil ;
 *   3. **Cloud configuré, pas de compte** : on refuse, et le message dit quoi
 *      faire. Jamais de repli silencieux vers le calcul local : des points
 *      fabriqués sur l'appareil seraient repris à la première synchronisation,
 *      et le joueur aurait vu un gain qui n'existe pas.
 *
 * Les écrans ne décident plus rien : ils appellent, puis ils affichent.
 */
import { useCallback, useMemo } from "react";
import { useCloud } from "@/hooks/use-cloud";
import { cloudStore } from "@/lib/cloud/cloud-store";
import { gameStore } from "@/lib/game-store";


export type PointsOutcome =
  | { status: "done"; message?: string; delta?: number }
  | { status: "refused"; message: string };

/** Ce que « Tout recycler » a réellement obtenu : des points, et combien de cartes. */
export type BulkPointsOutcome = {
  status: "done" | "refused";
  message?: string;
  /** Points réellement versés (le serveur peut en avoir déjà payé certains). */
  delta: number;
  /** Cartes réellement parties pendant ce geste. */
  count: number;
};

const DONE: PointsOutcome = { status: "done" };

export function usePoints(): {
  /** Le solde du joueur est-il tenu par le serveur ? (affichage seulement) */
  serverSide: boolean;
  recycle: (cardId: string) => Promise<PointsOutcome>;
  /** « Tout recycler » : une liste de doublons, traités un par un. */
  recycleAll: (cardIds: string[]) => Promise<BulkPointsOutcome>;
  craft: (slug: string, withTokens: boolean) => Promise<PointsOutcome>;
  claimMilestone: (id: string) => Promise<PointsOutcome>;
  claimSeason: (id: string) => Promise<PointsOutcome>;
} {
  const cloud = useCloud();
  // Un compte connecté sur un build avec cloud : c'est le serveur qui tient la
  // caisse. Hors ligne (pas de cloud), la partie locale est complète.
  const serverSide = cloud.configured && Boolean(cloud.userId);
  const signedOut = cloud.configured && !cloud.userId;

  /** Le refus commun aux trois actions, quand il n'y a pas de compte. */
  const noAccount = useCallback(
    (what: string): PointsOutcome => ({
      status: "refused",
      message: `Connecte-toi pour ${what} : tes points vivent sur ton compte.`,
    }),
    [],
  );

  const recycle = useCallback(
    async (cardId: string): Promise<PointsOutcome> => {
      if (signedOut) return noAccount("recycler un doublon");
      if (!serverSide) {
        gameStore.recycleCard(cardId);
        return DONE;
      }
      // Pas de rareté dans l'appel : le serveur relit la carte (et le
      // catalogue) lui-même. L'écran, lui, garde la sienne pour l'affichage.
      const outcome = await cloudStore.recycleDoublon(cardId);
      return outcome.status === "done"
        ? { status: "done", message: outcome.message, delta: outcome.delta }
        : { status: "refused", message: outcome.message };
    },
    [noAccount, serverSide, signedOut],
  );

  /**
   * « Tout recycler » : la liste des doublons part **carte par carte**, en
   * série, même quand il y en a vingt.
   *
   * Le serveur a le dernier mot sur chaque carte (il relit la sauvegarde et le
   * catalogue), et deux demandes en même temps se mélangeraient : une seule
   * sauvegarde voyage à la fois. Ce qui est payé reste payé — si une carte est
   * refusée en route, on s'arrête et on dit ce qui est déjà passé.
   */
  const recycleAll = useCallback(
    async (cardIds: string[]): Promise<BulkPointsOutcome> => {
      if (!cardIds.length) return { status: "done", delta: 0, count: 0 };
      if (signedOut) {
        return { status: "refused", message: noAccount("recycler tes doublons").message, delta: 0, count: 0 };
      }
      if (!serverSide) {
        const before = gameStore.getSnapshot();
        gameStore.bulkRecycleCards();
        const after = gameStore.getSnapshot();
        return {
          status: "done",
          delta: before && after ? after.points - before.points : 0,
          count: before && after ? before.cards.length - after.cards.length : 0,
        };
      }

      let delta = 0;
      let count = 0;
      for (const cardId of cardIds) {
        const outcome = await recycle(cardId);
        if (outcome.status === "refused") {
          return {
            status: count > 0 ? "done" : "refused",
            message: outcome.message,
            delta,
            count,
          };
        }
        if ((outcome.delta ?? 0) > 0) {
          delta += outcome.delta ?? 0;
          count += 1;
        }
      }
      return { status: "done", delta, count };
    },
    [noAccount, recycle, serverSide, signedOut],
  );

  const craft = useCallback(
    async (slug: string, withTokens: boolean): Promise<PointsOutcome> => {
      // Les jetons ne sont pas des points : ils vivent sur l'appareil, et un
      // achat aux jetons ne change rien au wallet du serveur.
      if (withTokens) {
        gameStore.buyWithTokens(slug);
        return DONE;
      }
      if (signedOut) return noAccount("rejoindre un créateur");
      if (!serverSide) {
        gameStore.craftCreator(slug);
        return DONE;
      }
      const outcome = await cloudStore.craftWithPoints(slug);
      return outcome.status === "done"
        ? { status: "done", message: outcome.message, delta: outcome.delta }
        : { status: "refused", message: outcome.message };
    },
    [noAccount, serverSide, signedOut],
  );

  const claimMilestone = useCallback(
    async (id: string): Promise<PointsOutcome> => {
      if (signedOut) return noAccount("réclamer ce palier");
      if (!serverSide) {
        gameStore.claimMilestone(id);
        return DONE;
      }
      const outcome = await cloudStore.claimMilestone(id);
      return outcome.status === "done"
        ? { status: "done", message: outcome.message, delta: outcome.delta }
        : { status: "refused", message: outcome.message };
    },
    [noAccount, serverSide, signedOut],
  );

  const claimSeason = useCallback(
    async (id: string): Promise<PointsOutcome> => {
      if (signedOut) return noAccount("réclamer cette famille");
      if (!serverSide) {
        gameStore.claimSeason(id);
        return DONE;
      }
      const outcome = await cloudStore.claimSeason(id);
      return outcome.status === "done"
        ? { status: "done", message: outcome.message, delta: outcome.delta }
        : { status: "refused", message: outcome.message };
    },
    [noAccount, serverSide, signedOut],
  );

  return useMemo(
    () => ({ serverSide, recycle, recycleAll, craft, claimMilestone, claimSeason }),
    [serverSide, recycle, recycleAll, craft, claimMilestone, claimSeason],
  );
}
