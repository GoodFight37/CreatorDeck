"use client";

/**
 * « Ton cercle » : les chaînes que le joueur a nommées, comme une rangée de
 * stories. Une chaîne en direct s'allume et mène à Twitch ; une carte obtenue
 * prend la couleur de sa rareté du catalogue ; une carte manquante reste
 * dans l'ombre. Une chaîne hors catalogue (0060) n'a pas de carte : un visage
 * en initiales, « sans carte », et un lien vers Twitch.
 * Aucune règle de jeu ici : tout vient de ce que le joueur a déjà.
 */
import Image from "next/image";
import { useLayoutEffect, useRef } from "react";

import { RARITY_META, creatorImage } from "@/lib/catalog";
import { channelInitials, circleLabel } from "@/lib/circle";
import { canRetryLive, circleChannel, circleLiveState, circleLiveStatusLine, twitchUrl } from "@/lib/circle-live";
import { liveFor, type LiveSnapshot } from "@/lib/live";
import { liveStore } from "@/lib/live-store";

/** Le visage d'une chaîne sans portrait : ses initiales dans un rond. */
export function ChannelInitials({ name, size }: { name: string; size: number }) {
  return (
    <span aria-hidden="true" style={{
      display: "grid", width: size, height: size, flex: "none", placeItems: "center", borderRadius: "50%",
      background: "rgb(255 255 255 / .12)", color: "#f4e9f1", fontWeight: 700, fontSize: Math.max(12, Math.round(size * 0.36)),
    }}>{channelInitials(name)}</span>
  );
}

export function CircleStrip({
  circle,
  owned,
  live,
  now,
  onOpenCollection,
  onRetryLive = () => void liveStore.refresh({ force: true }),
  onEdit,
}: {
  circle: readonly string[];
  owned: ReadonlySet<string>;
  live: LiveSnapshot;
  now: number;
  onOpenCollection: () => void;
  /** Relancer la lecture du direct (hors ligne, donnée périmée). */
  onRetryLive?: () => void;
  /** Ouvrir « Mes chaînes » pour modifier la liste. */
  onEdit?: () => void;
}) {
  const entries = circle
    .map(circleChannel)
    .filter((channel) => channel !== null)
    .map((channel) => ({ ...channel, stream: liveFor(live, channel.login, now), has: channel.creator !== null && owned.has(channel.slug) }))
    // Les chaînes en direct d'abord : c'est la raison de regarder cette rangée.
    .sort((a, b) => Number(Boolean(b.stream)) - Number(Boolean(a.stream)));
  const liveCount = entries.filter((entry) => entry.stream).length;
  const ownedCount = entries.filter((entry) => entry.has).length;
  const cardCount = entries.filter((entry) => entry.creator).length;
  const state = circleLiveState(circle, live, owned, now);
  const status = circleLiveStatusLine(state);

  // Les chaînes en direct passent en tête : la rangée doit alors revenir au
  // début, sinon elle garde son défilement et les cache hors de l'écran.
  const rowRef = useRef<HTMLUListElement>(null);
  const liveKey = entries.filter((entry) => entry.stream).map((entry) => entry.slug).join(",");
  useLayoutEffect(() => {
    if (liveKey && rowRef.current) rowRef.current.scrollLeft = 0;
  }, [liveKey]);

  // Un cercle dont aucune entrée n'est lisible n'a rien à montrer.
  if (entries.length === 0) return null;

  return (
    <section className="circle-strip" aria-label="Ton cercle">
      <header className="circle-strip-head">
        <h2>Ton cercle</h2>
        {onEdit ? (
          <button type="button" className="circle-strip-edit" onClick={onEdit} aria-label="Modifier mes chaînes">Modifier</button>
        ) : null}
        <p aria-live="polite">
          {liveCount > 0
            ? <><i className="circle-live-dot" aria-hidden="true" />{liveCount} en direct</>
            : cardCount ? `${ownedCount} sur ${cardCount} dans ta collection` : null}
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
        {entries.map(({ slug, login, displayName, creator, stream, has }) => {
          const name = stream && !creator ? stream.displayName || displayName : displayName;
          const face = (
            <>
              {creator ? (
                <span className="circle-avatar" style={{ "--ring": RARITY_META[creator.rarity].color } as React.CSSProperties}>
                  <Image src={creatorImage(creator)} alt="" width={56} height={56} draggable={false} />
                </span>
              ) : (
                <span className="circle-avatar"><ChannelInitials name={name} size={56} /></span>
              )}
              <span className="circle-name">{name}</span>
              <small>{circleLabel(circle, slug)}</small>
              {stream ? <b className="circle-live-tag">En direct</b>
                : <small>{!creator ? "sans carte" : has ? RARITY_META[creator.rarity].label : "À trouver"}</small>}
            </>
          );
          return (
            <li key={slug} data-live={Boolean(stream)} data-owned={creator ? has : undefined} data-custom={!creator || undefined}>
              {stream || !creator ? (
                <a
                  className="circle-item"
                  href={twitchUrl(login)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={stream ? `${name} est en direct. Ouvrir sur Twitch` : `${name}, sans carte. Ouvrir sur Twitch`}
                >
                  {face}
                </a>
              ) : (
                <button
                  type="button"
                  className="circle-item"
                  onClick={onOpenCollection}
                  aria-label={`${name}, ${has ? `dans ta collection, ${RARITY_META[creator.rarity].label}` : "pas encore dans ta collection"}. Ouvrir le Binder`}
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
