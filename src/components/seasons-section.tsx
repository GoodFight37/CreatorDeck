"use client";

import { useState } from "react";
import { Award, Check, Coins, Hourglass, Lock, Unlock } from "lucide-react";
import type { SeasonView } from "@/lib/game-engine";
import { FAMILY_BY_ID, seasonHue } from "@/lib/cosmetics";

/**
 * Emblème d'une saison : un monogramme coloré, gagné en complétant la famille.
 *
 * Le visuel est entièrement dérivé de la saison (aucune image à importer) : la
 * teinte vient de l'identifiant, le monogramme des initiales du nom. Deux
 * saisons différentes ne peuvent donc pas avoir le même emblème, et une
 * régénération du catalogue ne les casse pas.
 */
export function seasonEmblem(familyId: string) {
  const family = FAMILY_BY_ID.get(familyId);
  // Même source de vérité que les thèmes de collection : un emblème et son
  // thème partagent la teinte de la famille. L'emblème est unique par famille :
  // une famille découpée en morceaux n'en produit pas plusieurs.
  const hue = seasonHue(familyId);
  const name = family?.name ?? familyId;
  const monogram = name
    .replace(/[^\p{L}\p{N} ]/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
  return { hue, monogram: monogram || familyId.slice(0, 2).toUpperCase(), name };
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
export function SeasonsSection({ seasons, onClaim, busy = false, busyKey = null }: {
  seasons: SeasonView[];
  onClaim: (seasonId: string) => void;
  busy?: boolean;
  busyKey?: string | null;
}) {
  const [filter, setFilter] = useState<"all" | "ready" | "progress" | "claimed">("all");
  const [page, setPage] = useState(0);
  const ordered = [...seasons].sort((a, b) => {
    const rank = (season: SeasonView) => season.claimable > 0 ? 0 : season.claimed ? 2 : 1;
    return rank(a) - rank(b) || b.owned / Math.max(1, b.total) - a.owned / Math.max(1, a.total) || a.total - b.total;
  });
  const visible = ordered.filter((season) => filter === "all" || (filter === "ready" ? season.claimable > 0 : filter === "claimed" ? season.claimed : !season.claimed && season.claimable === 0));
  const pages = Math.max(1, Math.ceil(visible.length / 8));
  const safePage = Math.min(page, pages - 1);
  const claimed = seasons.filter((season) => season.claimed).length;
  const emblemFamilies = [...new Set(ordered.filter((season) => season.familyComplete).map((season) => season.familyId))];
  const familyCount = new Set(seasons.map((season) => season.familyId)).size;
  const pending = ordered.reduce((sum, season) => sum + season.claimablePoints, 0);
  return (
    <section className="section-block objectives-seasons" id="objectives-seasons" aria-labelledby="objectives-seasons-title">
      <div className="section-heading compact-heading"><div><h2 id="objectives-seasons-title">Saisons de collection</h2><p>Rassemble les créateurs d’une famille, débloque ses paliers et son emblème.</p></div></div>
      <div className="season-summary">{pending > 0 ? <span className="season-pending">{pending} pts à réclamer</span> : null}<span>{claimed}/{seasons.length} saisons terminées</span></div>
      {emblemFamilies.length > 0 ? <div className="emblem-strip"><span className="emblem-strip-label"><Award size={12} /> Emblèmes {emblemFamilies.length}/{familyCount}</span>{emblemFamilies.map((familyId) => <Emblem key={familyId} seasonId={familyId} />)}</div> : null}
      <div className="objectives-season-filters" role="group" aria-label="Filtrer les saisons">
        {([["all", "Toutes"], ["ready", "À réclamer"], ["progress", "En cours"], ["claimed", "Terminées"]] as const).map(([id, label]) => <button type="button" key={id} aria-pressed={filter === id} onClick={() => { setFilter(id); setPage(0); }}>{label}</button>)}
      </div>
      <div className="season-list">
        {visible.slice(safePage * 8, (safePage + 1) * 8).map((season) => {
          const missing = Math.max(0, season.total - season.owned);
          const next = season.tiers.find((tier) => !tier.unlocked);
          return <article key={season.id} className={`season-row ${season.complete ? "complete" : ""} ${season.claimed ? "claimed" : ""}`} data-season-id={season.id}>
            <div className="season-head"><div className="season-title">{season.familyComplete ? <Emblem seasonId={season.familyId} size={30} /> : <span className="season-family-mark" aria-hidden="true">{seasonEmblem(season.familyId).monogram}</span>}<div><strong>{season.name}</strong><span>{season.pieces > 1 ? `Partie ${season.piece}/${season.pieces} · ` : ""}{season.tagline}</span></div></div><b>{season.owned}/{season.total}</b></div>
            <progress className="objective-progress" aria-label={`Collection : ${season.name}`} value={Math.min(season.owned, season.total)} max={Math.max(1, season.total)} />
            {next ? <p className="season-next">Prochain palier : {next.label} · encore {Math.max(0, next.required - season.owned)} carte{next.required - season.owned > 1 ? "s" : ""}</p> : null}
            <details className="season-tier-details"><summary>Voir les paliers</summary><ul className="season-tiers">{season.tiers.map((tier) => <li key={tier.label} className={`season-tier ${tier.claimed ? "claimed" : tier.unlocked ? "reached" : ""}`}>
              {tier.claimed ? <Check size={12} /> : tier.unlocked ? <Unlock size={12} /> : <Lock size={12} />}<strong>{tier.label}</strong><span>{tier.required} cartes · {tier.claimed ? "Reçu" : tier.unlocked ? "À réclamer" : "À atteindre"}</span><span>{[tier.reward.points > 0 ? `+${tier.reward.points} points` : "", tier.reward.hourglasses > 0 ? `+${tier.reward.hourglasses} sabliers` : "", tier.emblem ? "fin de saison" : ""].filter(Boolean).join(" · ")}</span>
            </li>)}</ul></details>
            <div className="season-foot"><div className="season-reward">{season.claimablePoints > 0 ? <span><Coins size={12} /> +{season.claimablePoints} pts</span> : null}{season.claimableHourglasses > 0 ? <span><Hourglass size={12} /> +{season.claimableHourglasses} sabliers</span> : null}</div>
              {season.claimable > 0 ? <button type="button" className="season-claim" disabled={busy} aria-label={`Réclamer la saison ${season.name}`} onClick={() => onClaim(season.id)}><Unlock size={14} /> {busyKey === `season-${season.id}` ? "Réclamation…" : `Réclamer${season.claimable > 1 ? ` ${season.claimable} paliers` : ""}`}</button>
                : season.familyComplete ? <span className="season-state done"><Award size={13} /> Emblème obtenu</span> : season.claimed ? <span className="season-state done"><Check size={13} /> {season.pieces > 1 ? "Partie terminée" : "Terminée"}</span> : <span className="season-state"><Lock size={13} /> {missing} manquant{missing > 1 ? "s" : ""}</span>}
            </div>
          </article>;
        })}
      </div>
      {!visible.length ? <div className="objectives-season-empty"><p>{seasons.length ? "Aucune saison dans ce filtre pour le moment." : "Aucune saison disponible pour cette édition."}</p>{filter !== "all" ? <button type="button" onClick={() => { setFilter("all"); setPage(0); }}>Voir toutes les saisons</button> : null}</div> : null}
      {pages > 1 ? <nav className="objectives-season-pages" aria-label="Pages des saisons"><button type="button" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>Précédentes</button><span>{safePage + 1} / {pages}</span><button type="button" disabled={safePage + 1 === pages} onClick={() => setPage(safePage + 1)}>Suivantes</button></nav> : null}
    </section>
  );
}
