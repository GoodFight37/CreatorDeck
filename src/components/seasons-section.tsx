"use client";

import { Check, Coins, Hourglass, Lock, Unlock } from "lucide-react";
import type { SeasonView } from "@/lib/game-engine";

/**
 * Saisons de collection : les créateurs du catalogue sont répartis en familles de jeux
 * (comme les séries d'un TCG). Compléter une famille débloque une récompense
 * à réclamer ici.
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
      season.complete && !season.claimed ? 0 : season.claimed ? 2 : 1;
    return rank(a) - rank(b) || a.total - b.total;
  });

  return (
    <section className="section-block">
      <div className="section-heading compact-heading">
        <div>
          <p className="eyebrow">SAISONS</p>
          <h2>Complète une famille de jeux</h2>
        </div>
        <span className="completion-pill">
          {claimed}/{seasons.length}
        </span>
      </div>

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
                <div>
                  <strong>
                    {season.id} · {season.name}
                  </strong>
                  <span>{season.tagline}</span>
                </div>
                <b>
                  {season.owned}/{season.total}
                </b>
              </div>

              <div className="progress-track">
                <i style={{ width: `${progress}%` }} />
              </div>

              <div className="season-foot">
                <div className="season-reward">
                  <span>
                    <Coins size={12} /> {season.reward.points}
                  </span>
                  <span>
                    <Hourglass size={12} /> {season.reward.hourglasses}
                  </span>
                </div>

                {season.claimed ? (
                  <span className="season-state done">
                    <Check size={14} /> Réclamée
                  </span>
                ) : season.complete ? (
                  <button
                    type="button"
                    className="season-claim"
                    onClick={() => onClaim(season.id)}
                  >
                    <Unlock size={14} /> Réclamer
                  </button>
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
