"use client";

/**
 * L'ouverture d'un paquet, décidée à **un seul endroit**.
 *
 * Le jeu et l'overlay 16:9 faisaient chacun leur choix — « cloud configuré ?
 * compte connecté ? sinon moteur local » — dans deux fichiers, avec deux
 * messages et deux effets. Deux copies d'une même règle, c'est deux occasions
 * de diverger : l'écran Overlay a déjà refusé une ouverture avec un texte que
 * le jeu n'affichait pas. Ici, la règle est écrite une fois :
 *
 *   1. **Build sans cloud** (développement, tests, jeu 100 % hors ligne) : le
 *      moteur local tire, après un court suspense ;
 *   2. **Cloud configuré, pas de compte** : on refuse, et le message dit quoi
 *      faire. Jamais de repli silencieux vers le tirage local — les cartes
 *      d'un compte ne valent que si c'est le serveur qui les tire ;
 *   3. **Cloud configuré, compte connecté** : c'est le serveur qui tire.
 *
 * Les écrans ne décident plus rien : ils appellent, puis ils affichent (le son,
 * la révélation, les erreurs restent à eux — ce sont des choix d'écran).
 */
import { useCallback } from "react";
import { useCloud } from "@/hooks/use-cloud";
import { cloudStore } from "@/lib/cloud/cloud-store";
import type { DrawnCard, GameView } from "@/lib/game-engine";
import { gameStore } from "@/lib/game-store";
import { liveLogins } from "@/lib/live";
import { liveStore } from "@/lib/live-store";

/**
 * Le suspense du tirage **local** : le serveur a déjà sa latence réseau, mais
 * le moteur de l'appareil répond en une milliseconde — sans ce délai, les cinq
 * cartes tomberaient avant que le doigt ait quitté le bouton.
 */
export const OPENING_DELAY_MS = 650;

export type PackOpeningKind = "live" | "scene";

export type PackOpeningResult =
  | { status: "drawn"; kind: PackOpeningKind; cards: DrawnCard[] }
  /**
   * Rien n'a été tiré et rien n'est cassé : `needAccount` dit si le refus se
   * règle par une connexion (l'écran peut alors pointer vers Compte).
   */
  | { status: "refused"; kind: PackOpeningKind; message: string; needAccount: boolean };

function suspense(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, OPENING_DELAY_MS);
  });
}

/**
 * Qui tire **maintenant** — pour l'affichage seulement (l'overlay écrit
 * « Tirage décidé par le serveur » sous ses boutons). Jamais une décision :
 * `openLivePack()` et `openScenePack()` restent seuls juges.
 */
export type DrawSource = "server" | "local" | "account";

export function usePackOpening(game: GameView | null): {
  openLivePack: () => Promise<PackOpeningResult>;
  openScenePack: () => Promise<PackOpeningResult>;
  drawSource: DrawSource;
} {
  const cloud = useCloud();

  /**
   * Ouvre le **Live Drop**.
   *
   * La récompense de série a déjà été tranchée par le joueur s'il est passé par
   * l'écran Objectifs (les sabliers éteignent `streakJackpot`) ; sinon le défaut
   * est le plus favorable, le Perfect garanti.
   */
  const openLivePack = useCallback(async (): Promise<PackOpeningResult> => {
    const jackpot: "perfect" | "hourglasses" = game?.streak.jackpot ? "perfect" : "hourglasses";
    if (!cloud.configured) {
      await suspense();
      // Le bonus Direct se lit au moment du geste (et non au rendu) : « qui
      // streame » est celui d'il y a dix secondes.
      const cards = gameStore.openPack(Date.now(), {
        liveLogins: liveLogins(liveStore.getSnapshot()),
      });
      return { status: "drawn", kind: "live", cards };
    }
    if (!cloud.userId) {
      return {
        status: "refused",
        kind: "live",
        message: "Connecte-toi pour ouvrir un booster.",
        needAccount: true,
      };
    }
    const outcome = await cloudStore.openPack(jackpot);
    if (outcome.status === "drawn") {
      // Le paquet vient d'être exposé dix minutes : l'étagère des Last Packs
      // doit le savoir tout de suite, sinon « ton paquet est exposé » arriverait
      // en retard. C'est une conséquence du tirage, pas de l'écran.
      void cloudStore.loadLastPacks();
      return { status: "drawn", kind: "live", cards: outcome.cards };
    }
    return {
      status: "refused",
      kind: "live",
      message: outcome.message,
      needAccount: outcome.reason === "offline" || outcome.reason === "no-session",
    };
  }, [cloud.configured, cloud.userId, game?.streak.jackpot]);

  /**
   * Ouvre le **Paquet Scène** du jour.
   *
   * Avec un compte, le serveur donne les choix et vérifie le tirage
   * (`0014_scene_pack.sql`) ; sans cloud, le moteur local applique exactement
   * les mêmes règles.
   */
  const openScenePack = useCallback(async (): Promise<PackOpeningResult> => {
    const familyId = game?.scene.family?.familyId ?? null;
    if (!cloud.configured) {
      await suspense();
      return { status: "drawn", kind: "scene", cards: gameStore.openScenePack(Date.now()) };
    }
    if (!cloud.userId) {
      return {
        status: "refused",
        kind: "scene",
        message: "Connecte-toi pour ouvrir ton Paquet Scène.",
        needAccount: true,
      };
    }
    if (!familyId) {
      return {
        status: "refused",
        kind: "scene",
        message: "Aucune famille à compléter pour l'instant.",
        needAccount: false,
      };
    }
    const outcome = await cloudStore.openScenePack(familyId);
    if (outcome.status === "drawn") {
      void cloudStore.loadLastPacks();
      return { status: "drawn", kind: "scene", cards: outcome.cards };
    }
    return {
      status: "refused",
      kind: "scene",
      message: outcome.message,
      needAccount: outcome.reason === "offline" || outcome.reason === "no-session",
    };
  }, [cloud.configured, cloud.userId, game?.scene.family?.familyId]);

  const drawSource: DrawSource = !cloud.configured
    ? "local"
    : cloud.userId
      ? "server"
      : "account";

  return { openLivePack, openScenePack, drawSource };
}
