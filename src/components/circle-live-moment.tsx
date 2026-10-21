"use client";

/**
 * Le moment « en direct dans ton cercle » (étape 2) : quand une chaîne que le
 * joueur a nommée streame, l'accueil le dit tout de suite, sous le bouton.
 *
 * Trois choses, et rien d'autre :
 *   1. qui est en direct (au plus trois lignes, dans l'ordre du cercle) ;
 *   2. un lien Twitch clair par chaîne ;
 *   3. le bénéfice de jeu **déjà publié** (bonus Direct) et ce que le joueur
 *      peut faire maintenant : ouvrir, ou avancer sa recharge d'un sablier.
 *
 * Aucune règle, aucun tirage, aucun stockage ici. Le composant ne s'affiche
 * que pour un état « live » frais ; les autres états vivent dans la rangée.
 */
import Image from "next/image";
import { ExternalLink, Hourglass } from "lucide-react";

import { ChannelInitials } from "@/components/circle-strip";
import { creatorImage } from "@/lib/catalog";
import {
  circleLiveHeadline,
  directBenefitLine,
  liveSinceLabel,
  twitchUrl,
  type CircleLiveEntry,
} from "@/lib/circle-live";
import { viewersLabel } from "@/lib/live";

/** Au-delà, la rangée « Ton cercle » montre le reste : la carte reste courte. */
const MAX_ROWS = 3;

export function CircleLiveMoment({
  entries,
  now,
  canOpen,
  nextPackLabel,
  hourglass,
}: {
  entries: readonly CircleLiveEntry[];
  now: number;
  /** Un booster peut être ouvert tout de suite (réserve ou booster de test). */
  canOpen: boolean;
  /** « +1 dans 12:30 » quand la réserve est vide, sinon `null`. */
  nextPackLabel: string | null;
  /** Raccourci vers le sablier existant, seulement quand il est utilisable. */
  hourglass: { count: number; busy: boolean; onUse: () => void } | null;
}) {
  if (entries.length === 0) return null;
  const shown = entries.slice(0, MAX_ROWS);
  const hidden = entries.length - shown.length;
  // Le bonus Direct ne vaut que pour une carte : une chaîne hors catalogue n'en a pas (0060).
  const carded = entries.filter((entry) => entry.creator).length;

  return (
    <section className="circle-live-moment" aria-labelledby="circle-live-title">
      <p className="circle-live-kicker"><i className="circle-live-dot" aria-hidden="true" />En direct dans ton cercle</p>
      <h2 id="circle-live-title">{circleLiveHeadline(entries)}</h2>
      <ul className="circle-live-list">
        {shown.map(({ slug, login, displayName, creator, stream, owned }) => {
          const since = liveSinceLabel(stream.startedAt, now);
          const details = [stream.gameName, viewersLabel(stream.viewers), since].filter(Boolean).join(" · ");
          return (
            <li key={slug}>
              <span className="circle-live-face">
                {creator
                  ? <Image src={creatorImage(creator)} alt="" width={44} height={44} draggable={false} />
                  : <ChannelInitials name={displayName} size={40} />}
              </span>
              <span className="circle-live-copy">
                <strong>{displayName}</strong>
                <span>{details}</span>
                {creator
                  ? <small data-owned={owned}>{owned ? "Dans ta collection" : "À trouver"}</small>
                  : <small>sans carte</small>}
              </span>
              <a
                className="circle-live-watch"
                href={twitchUrl(login)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Regarder ${displayName} sur Twitch`}
              >
                Twitch <ExternalLink size={14} aria-hidden="true" />
              </a>
            </li>
          );
        })}
      </ul>
      {hidden > 0 ? <p className="circle-live-more">+ {hidden} autre{hidden > 1 ? "s" : ""} dans la rangée « Ton cercle »</p> : null}
      {carded ? <p className="circle-live-benefit">{directBenefitLine(carded)}</p> : null}
      {!carded ? null : canOpen ? (
        <p className="circle-live-next">C’est le moment d’ouvrir un booster.</p>
      ) : nextPackLabel ? (
        <p className="circle-live-next">Prochain booster {nextPackLabel}. Le bonus compte si le direct dure encore.</p>
      ) : null}
      {carded && !canOpen && hourglass ? (
        <button type="button" className="circle-live-hourglass" onClick={hourglass.onUse} disabled={hourglass.busy}
          aria-label={hourglass.busy ? "Utilisation du sablier" : `Utiliser 1 sablier pour avancer la recharge de 15 minutes, ${hourglass.count} disponibles`}>
          <Hourglass size={16} aria-hidden="true" />
          <span>{hourglass.busy ? "Utilisation…" : "Avancer de 15 min avec 1 sablier"}</span>
          <strong>{hourglass.count}</strong>
        </button>
      ) : null}
    </section>
  );
}
