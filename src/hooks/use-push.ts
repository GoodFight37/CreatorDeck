"use client";

/**
 * Les notifications de direct, branchées une fois pour toutes.
 *
 * Deux choses, et rien d'autre :
 *
 *   * **au premier lancement connecté**, on crée le canal Android et on inscrit
 *     l'appareil — mais seulement s'il ne l'est pas déjà (le jeton est gardé
 *     sur l'appareil). Redemander la permission à chaque ouverture serait le
 *     meilleur moyen de se la faire refuser ;
 *   * **à l'appui sur une notification**, on rafraîchit le direct : le joueur
 *     arrive justement parce qu'un live a commencé, le bandeau d'accueil doit
 *     être juste. Rien d'autre n'est ouvert : l'accueil montre déjà le direct.
 */
import { useEffect } from "react";
import { useCloud } from "@/hooks/use-cloud";
import { cloudStore } from "@/lib/cloud/cloud-store";
import { liveStore } from "@/lib/live-store";
import { ensureLiveChannel, onPushTap, pushSupported, readPushToken } from "@/lib/push";
import { deviceStorage } from "@/lib/storage";

export function usePush(): void {
  const cloud = useCloud();
  const userId = cloud.userId;

  useEffect(() => {
    if (!pushSupported()) return;
    void ensureLiveChannel();
  }, []);

  useEffect(() => {
    if (!userId) return;
    // Déjà inscrit sur cet appareil : rien à faire. Un jeton neuf (nouvelle
    // installation, nettoyage) repasse par l'inscription au lancement suivant.
    // Silencieux : un échec ici (Firebase pas encore branché) ne mérite pas un
    // message à chaque ouverture — l'interrupteur du carnet, lui, explique.
    if (readPushToken(deviceStorage())) {
      // Déjà inscrit : rien à faire côté appareil, mais l'état de l'interrupteur
      // n'est **pas** dans la sauvegarde — il vit sur le serveur. Sans cette
      // relecture, rouvrir l'application affichait « éteint » alors que les
      // notifications marchaient (`0024_push_state.sql`).
      void cloudStore.syncPushState();
      return;
    }
    void cloudStore.registerPush({ silent: true });
  }, [userId]);

  useEffect(() => {
    let detach: (() => void) | null = null;
    void onPushTap(() => {
      void liveStore.refresh();
    }).then((off) => {
      detach = off;
    });
    return () => detach?.();
  }, []);
}
