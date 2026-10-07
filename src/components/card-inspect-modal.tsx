"use client";

import { X, Sparkles } from "lucide-react";
import { CreatorCard } from "@/components/creator-card";
import { RARITY_META, type CardVariant, type Creator } from "@/lib/catalog";
import { regionLabel } from "@/lib/regions";
import { viewersLabel, type LiveStream } from "@/lib/live";

type CardInspectModalProps = {
  creator: Creator;
  ownedCount: number;
  variant: CardVariant;
  liveStream: LiveStream | null;
  onClose: () => void;
};

export function CardInspectModal({
  creator,
  ownedCount,
  variant,
  liveStream,
  onClose,
}: CardInspectModalProps) {
  const rarity = RARITY_META[creator.rarity];
  const isOwned = ownedCount > 0;

  return (
    <div className="odds-overlay" role="dialog" aria-modal="true" aria-label={`Carte de ${creator.displayName}`}>
      <div className="odds-panel" style={{ maxWidth: 680 }}>
        <header className="odds-head">
          <div>
            <p className="eyebrow">Fiche créateur</p>
            <h2>{creator.displayName}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer">
            <X size={18} />
          </button>
        </header>

        <div style={{ display: "grid", gap: 18 }}>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <CreatorCard
              creator={creator}
              variant={variant}
              count={ownedCount || 1}
              locked={!isOwned}
              liveStream={liveStream}
            />
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
              <div className="odds-stat">
                <span>Rareté</span>
                <strong style={{ color: rarity.color }}>{rarity.label}</strong>
              </div>
              <div className="odds-stat">
                <span>Région</span>
                <strong>{regionLabel(creator.region)}</strong>
              </div>
              <div className="odds-stat">
                <span>Audience</span>
                <strong>{(creator.followers ?? 0).toLocaleString("fr-FR")}</strong>
              </div>
              <div className="odds-stat">
                <span>Statut</span>
                <strong>{isOwned ? `Possédée ×${ownedCount}` : "Manquante"}</strong>
              </div>
            </div>

            <div className="odds-intro" style={{ margin: 0 }}>
              {isOwned
                ? `${creator.displayName} est déjà dans ton classeur. Tu as ${ownedCount} copie${ownedCount > 1 ? "s" : ""} dans cette variante.`
                : `${creator.displayName} n'est pas encore dans ton classeur. Il reste à l'obtenir via un booster ou l'atelier.`}
            </div>

            {liveStream ? (
              <div className="odds-stat">
                <span>Direct</span>
                <strong>
                  <Sparkles size={14} style={{ verticalAlign: "middle", marginRight: 6 }} />
                  {liveStream.title ? `${liveStream.title} · ` : ""}
                  {viewersLabel(liveStream.viewers)}
                </strong>
              </div>
            ) : null}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button type="button" className="primary-button" onClick={onClose}>
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
