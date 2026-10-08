"use client";

/**
 * Le carnet, tel que l'interface le montre : les lignes serveur **plus** la
 * seule ligne qui naît sur l'appareil — ton créateur épinglé qui passe en
 * direct.
 *
 * Pourquoi un hook, et pas un calcul dans chaque écran : la pastille de la
 * navigation et la feuille du carnet doivent compter **exactement** la même
 * chose. Un écran qui compterait deux lignes de plus que l'autre afficherait
 * une pastille qu'aucune liste ne confirmerait.
 *
 * La « dernière visite » est relue ici (clé locale, par joueur) plutôt que
 * reprise du store : le store la connaît au moment de son chargement, alors que
 * la ligne du direct, elle, peut apparaître après — un créateur épinglé qui
 * lance son live pendant que l'app est ouverte. C'est aussi ce qui fait
 * disparaître la pastille dès que la feuille est ouverte : le store republie,
 * ce hook se re-rend, et la clé a changé entre-temps.
 */
import { useMemo } from "react";
import { useCloud } from "@/hooks/use-cloud";
import { useNow } from "@/hooks/use-game";
import { useLive } from "@/hooks/use-live";
import { CREATOR_BY_SLUG } from "@/lib/catalog";
import { liveFor } from "@/lib/live";
import {
  mergeInbox,
  seenKey,
  unreadCount,
  type InboxItem,
  type WishlistLive,
} from "@/lib/social/inbox";

/** Lit la dernière visite du carnet sur l'appareil (jamais d'exception). */
function readSeen(userId: string | null): string | null {
  if (!userId || typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(seenKey(userId));
  } catch {
    return null;
  }
}

export function useInbox(): { items: InboxItem[]; unread: number } {
  const cloud = useCloud();
  const live = useLive();
  const now = useNow(30_000);

  // Le créateur épinglé, croisé avec le direct publié. Toute la décision est
  // ici : `liveFor` porte déjà les deux règles du direct — données fraîches, et
  // rien au-delà de dix minutes.
  const wishlist = useMemo<WishlistLive | null>(() => {
    const slug = cloud.wishlistSlug;
    if (!slug) return null;
    const creator = CREATOR_BY_SLUG.get(slug);
    const stream = creator ? liveFor(live, creator.login, now) : null;
    return { slug, liveAt: stream?.startedAt ?? null, title: stream?.title ?? null };
  }, [cloud.wishlistSlug, live, now]);

  const items = useMemo(() => mergeInbox(cloud.inbox, wishlist), [cloud.inbox, wishlist]);

  // Volontairement pas mémoïsé : la lecture de la clé doit suivre le store, qui
  // la réécrit quand le joueur ouvre le carnet.
  return { items, unread: unreadCount(items, readSeen(cloud.userId)) };
}
