"use client";

/**
 * « Ton cercle » : les chaînes que le joueur a nommées, comme une rangée de
 * stories. Une chaîne en direct s'allume et mène à Twitch ; une carte obtenue
 * prend la couleur de sa rareté dans le cercle ; une carte manquante reste
 * dans l'ombre. Aucune règle de jeu ici : tout vient de ce que le joueur a déjà.
 */
import Image from "next/image";
import { useLayoutEffect, useRef } from "react";

import { CREATOR_BY_SLUG, RARITY_META, creatorImage } from "@/lib/catalog";
import { circleTiers } from "@/lib/circle";
import { canRetryLive, circleLiveState, circleLiveStatusLine, twitchUrl } from "@/lib/circle-live";
import { liveFor, type LiveSnapshot } from "@/lib/live";
import { liveStore } from "@/lib/live-store";

export function CircleStrip({
  circle,
  owned,
  live,
  now,
  onOpenCollection,
  onRetryLive = () => void liveStore.refresh({ force: true }),
}: {
  circle: readonly string[];
  owned: ReadonlySet<string>;
  live: LiveSnapshot;
  now: number;
  onOpenCollection: () => void;
  /** Relancer la lecture du direct (hors ligne, donnée périmée). */
  onRetryLive?: () => void;
}) {
  const tiers = circleTiers(circle);
  const entries = circle
    .map((slug) => {
      const creator = CREATOR_BY_SLUG.get(slug);
      return creator ? { creator, stream: liveFor(live, creator.login, now), has: owned.has(slug), tier: tiers[slug] } : null;
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    // Les chaînes en direct d'abord : c'est la raison de regarder cette rangée.
    .sort((a, b) => Number(Boolean(b.stream)) - Number(Boolean(a.stream)));
  const liveCount = entries.filter((entry) => entry.stream).length;
  const ownedCount = entries.filter((entry) => entry.has).length;
  const state = circleLiveState(circle, live, owned, now);
  const status = circleLiveStatusLine(state);

  // Les chaînes en direct passent en tête : la rangée doit alors revenir au
  // début, sinon elle garde son défilement et les cache hors de l'écran.
  const rowRef = useRef<HTMLUListElement>(null);
  const liveKey = entries.filter((entry) => entry.stream).map((entry) => entry.creator.slug).join(",");
  useLayoutEffect(() => {
    if (liveKey && rowRef.current) rowRef.current.scrollLeft = 0;
  }, [liveKey]);

  // Un cercle dont aucune chaîne n'est reconnue n'a rien à montrer.
  if (entries.length === 0) return null;

  return (
    <section className="circle-strip" aria-label="Ton cercle">
      <header className="circle-strip-head">
        <h2>Ton cercle</h2>
        <p aria-live="polite">
          {liveCount > 0
            ? <><i className="circle-live-dot" aria-hidden="true" />{liveCount} en direct</>
            : `${ownedCount} sur ${entries.length} dans ta collection`}
        </p>
      </header>
      {status ? (
        <p className="circle-strip-status" data-state={state.kind} role="status">
          <span>{status}</span>
          {canRetryLive(state) ? (
            <button type="button" onClick={onRetryLive} disabled={live.loading}>
              {live.loading ? "Lecture…" : "Réessayer"}
            </button>
          ) : null}
        </p>
      ) : null}
      <ul className="circle-strip-row" ref={rowRef}>
        {entries.map(({ creator, stream, has, tier }) => {
          const tone = RARITY_META[tier].color;
          const face = (
            <>
              <span className="circle-avatar" style={{ "--ring": tone } as React.CSSProperties}>
                <Image src={creatorImage(creator)} alt="" width={56} height={56} draggable={false} />
              </span>
              <span className="circle-name">{creator.displayName}</span>
              {stream ? <b className="circle-live-tag">En direct</b> : <small>{has ? RARITY_META[tier].label : "À trouver"}</small>}
            </>
          );
          return (
            <li key={creator.slug} data-live={Boolean(stream)} data-owned={has}>
              {stream ? (
                <a
                  className="circle-item"
                  href={twitchUrl(creator.login)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${creator.displayName} est en direct. Ouvrir sur Twitch`}
                >
                  {face}
                </a>
              ) : (
                <button
                  type="button"
                  className="circle-item"
                  onClick={onOpenCollection}
                  aria-label={`${creator.displayName}, ${has ? `dans ta collection, ${RARITY_META[tier].label}` : "pas encore dans ta collection"}. Ouvrir le Binder`}
                >
                  {face}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
