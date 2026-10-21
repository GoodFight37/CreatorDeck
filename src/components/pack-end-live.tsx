"use client";

/**
 * La fin d'un booster, sans rien à décider.
 *
 *   * la dernière chaîne du paquet streame → son visage en grand et un bouton
 *     pour aller la regarder (`PackEndLive`) ;
 *   * sinon les cartes sont rangées, et une ligne dit quand le prochain sachet
 *     arrive (`NextPackLine`).
 */
import { useMemo } from "react";
import Image from "next/image";
import { ExternalLink } from "lucide-react";

import { useGame } from "@/hooks/use-game";
import { creatorImage, type Creator } from "@/lib/catalog";
import { twitchUrl } from "@/lib/circle-live";
import { getGameView } from "@/lib/game-engine";
import { viewersLabel, type LiveStream } from "@/lib/live";

export function PackEndLive({ creator, stream, onWatch }: { creator: Creator; stream: LiveStream; onWatch: () => void }) {
  const details = [stream.gameName, viewersLabel(stream.viewers)].filter(Boolean).join(" · ");
  return (
    <section className="reveal-summary pack-end-live" aria-label={`${creator.displayName} est en direct`}>
      <span className="pack-end-face">
        <Image src={creatorImage(creator)} alt="" width={320} height={320} draggable={false} />
      </span>
      <p className="pack-end-kicker"><i aria-hidden="true" />En direct maintenant</p>
      <h2>{creator.displayName}</h2>
      {details ? <p className="pack-end-details">{details}</p> : null}
      <a
        className="pack-end-watch"
        href={twitchUrl(creator.login)}
        target="_blank"
        rel="noopener noreferrer"
        // Le lien part d'abord ; la scène se range au tour suivant.
        onClick={() => window.setTimeout(onWatch, 0)}
      >
        Regarder {creator.displayName} sur Twitch <ExternalLink size={16} aria-hidden="true" />
      </a>
    </section>
  );
}

/** Même horloge que l'accueil : « 14 h 30 ». */
function clock(date: number) {
  return new Date(date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }).replace(":", " h ");
}

/** « Prochain sachet à 14 h 30 », ou « Un sachet t'attend » quand il en reste un. */
export function NextPackLine({ now, className }: { now: number; className?: string }) {
  const state = useGame();
  const player = useMemo(() => (state ? getGameView(state, now).player : null), [state, now]);
  if (!player) return null;
  const text = player.packs > 0 || player.nextPackAt === null
    ? "Un sachet t’attend"
    : `Prochain sachet à ${clock(player.nextPackAt)}`;
  return <p className={className}>{text}</p>;
}
