"use client";

import { Award, Check, Coins, Hourglass, Lock, Unlock } from "lucide-react";
import type { SeasonView } from "@/lib/game-engine";
import { SEASON_BY_ID } from "@/lib/seasons";

/**
 * Emblème d'une saison : un monogramme coloré, gagné en complétant la famille.
 *
 * Le visuel est entièrement dérivé de la saison (aucune image à importer) : la
 * teinte vient de l'identifiant, le monogramme des initiales du nom. Deux
 * saisons différentes ne peuvent donc pas avoir le même emblème, et une
 * régénération du catalogue ne les casse pas.
 */
export function seasonEmblem(seasonId: string) {
  const season = SEASON_BY_ID.get(seasonId);
  const base = seasonId.replace(/-\d+$/, "");
  const hue = [...base].reduce((sum, char) => sum + char.charCodeAt(0) * 7, 0) % 360;
  const name = season?.name ?? seasonId;
  const monogram = name
    .replace(/[^\p{L}\p{N} ]/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
  return { hue, monogram: monogram || base.slice(0, 2).toUpperCase(), name };
}

function Emblem({ seasonId, size = 26 }: { seasonId: string; size?: number }) {
  const { hue, monogram, name } = seasonEmblem(seasonId);
  return (
    <span
      className="emblem"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.38),
        background: `linear-gradient(145deg, hsl(${hue} 85% 62%), hsl(${(hue + 48) % 360} 70% 38%))`,
      }}
      title={`Emblème ${name}`}
      aria-label={`Emblème ${name}`}
    >
      {monogram}
    </span>
  );
}

/**
 * Saisons de collection : les créateurs du catalogue sont répartis en familles de jeux
 * (comme les séries d'un TCG). Chaque famille est jalonnée de paliers
 * (Bronze → Arc-en-ciel) : les points tombent en cours de route, le dernier
 * palier donne les sabliers et l'emblème.
 */
export function SeasonsSection({
  seasons,
  onClaim,
}: {
  seasons: SeasonView[];
  onClaim: (seasonId: string) => void;
}) {
  const claimed = seasons.filter((season) => season.claimed).length;
  // À réclamer d'abord, puis les saisons en cours, puis les terminées.
  const ordered = [...seasons].sort((a, b) => {
    const rank = (season: SeasonView) =>
      season.claimable > 0 ? 0 : season.claimed ? 2 : 1;
    return rank(a) - rank(b) || a.total - b.total;
  });
  const emblems = ordered.filter((season) => season.emblem);
  const pending = ordered.reduce((sum, season) => sum + season.claimablePoints, 0);

  return (
    <section className="section-block">
      <div className="section-heading compact-heading">
        <div>
          <p className="eyebrow">SAISONS</p>
          <h2>Complète une famille de jeux</h2>
        </div>
        <div className="season-summary">
          {pending > 0 ? <span className="season-pending">{pending} pts à réclamer</span> : null}
          <span className="completion-pill">
            {claimed}/{seasons.length}
          </span>
        </div>
      </div>

      {emblems.length > 0 ? (
        <div className="emblem-strip">
          <span className="emblem-strip-label">
            <Award size={12} /> Emblèmes {emblems.length}/{seasons.length}
          </span>
          {emblems.map((season) => (
            <Emblem key={season.id} seasonId={season.id} />
          ))}
        </div>
      ) : null}

      <div className="season-list">
        {ordered.map((season) => {
          const missing = Math.max(0, season.total - season.owned);
          const progress = Math.round((season.owned / season.total) * 100);
          return (
            <article
              key={season.id}
              className={`season-row ${season.complete ? "complete" : ""} ${season.claimed ? "claimed" : ""}`}
            >
              <div className="season-head">
                <div className="season-title">
                  {season.emblem ? <Emblem seasonId={season.id} size={22} /> : null}
                  <div>
                    <strong>
                      {season.id} · {season.name}
                    </strong>
                    <span>{season.tagline}</span>
                  </div>
                </div>
                <b>
                  {season.owned}/{season.total}
                </b>
              </div>

              <div className="progress-track">
                <i style={{ width: `${progress}%` }} />
              </div>

              <ul className="season-tiers">
                {season.tiers.map((tier) => (
                  <li
                    key={tier.label}
                    className={`season-tier ${tier.claimed ? "claimed" : tier.unlocked ? "reached" : ""}`}
                  >
                    {tier.claimed ? <Check size={10} /> : tier.unlocked ? <Unlock size={10} /> : <Lock size={9} />}
                    {tier.label}
                    <span>{tier.required}</span>
                  </li>
                ))}
              </ul>

              <div className="season-foot">
                <div className="season-reward">
                  <span>
                    <Coins size={12} /> +{season.claimablePoints} pts
                  </span>
                  {season.claimableHourglasses > 0 ? (
                    <span>
                      <Hourglass size={12} /> +{season.claimableHourglasses}
                    </span>
                  ) : null}
                </div>

                {season.claimable > 0 ? (
                  <button
                    type="button"
                    className="season-claim"
                    onClick={() => onClaim(season.id)}
                  >
                    <Unlock size={14} /> Réclamer
                    {season.claimable > 1 ? ` ${season.claimable} paliers` : ""}
                  </button>
                ) : season.claimed ? (
                  <span className="season-state done">
                    <Award size={13} /> Emblème obtenu
                  </span>
                ) : (
                  <span className="season-state">
                    <Lock size={13} /> {missing} manquant{missing > 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
