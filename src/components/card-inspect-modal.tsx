"use client";

import { X, Sparkles, Hammer, LoaderCircle } from "lucide-react";
import { CreatorCard } from "@/components/creator-card";
import { RARITY_META, type CardVariant, type Creator } from "@/lib/catalog";
import { regionLabel } from "@/lib/regions";
import { viewersLabel, type LiveStream } from "@/lib/live";

type CardInspectModalProps = {
  creator: Creator;
  ownedCount: number;
  variant: CardVariant;
  liveStream: LiveStream | null;
  /** Le verdict de l'atelier sur ce créateur : artisanable, et à quel prix. */
  quote?: { cost: number | null; craftable: boolean } | null;
  /** Les points du joueur, pour dire s'il peut payer **maintenant**. */
  balance?: number;
  /** En cours de paiement : le bouton se verrouille, une seule fois. */
  crafting?: boolean;
  onCraft?: (slug: string) => void;
  onClose: () => void;
};

export function CardInspectModal({
  creator,
  ownedCount,
  variant,
  liveStream,
  quote = null,
  balance = 0,
  crafting = false,
  onCraft,
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
                : `${creator.displayName} n'est pas encore dans ton classeur.`}
            </div>

            {/* Comment l'obtenir, avec les vrais chiffres du jeu : une carte
                manquante qui dit seulement « à obtenir » n'apprend rien. Le
                prix et la règle viennent de `craftQuote` (moteur), pas d'une
                copie d'écran qui pourrait mentir. */}
            {!isOwned ? (
              quote?.craftable && quote.cost !== null ? (
                <div className="inspect-earn">
                  <span>
                    Artisanable à l&apos;Atelier (« Rejoindre ») pour{" "}
                    <strong>{quote.cost} points</strong>
                    {balance >= quote.cost
                      ? " — tu as de quoi."
                      : ` — il te manque ${quote.cost - balance} points.`}
                  </span>
                  {onCraft ? (
                    <button
                      type="button"
                      className="primary-button inspect-craft"
                      onClick={() => onCraft(creator.slug)}
                      disabled={crafting || balance < quote.cost}
                    >
                      {crafting ? (
                        <LoaderCircle className="spin" size={16} />
                      ) : (
                        <Hammer size={16} />
                      )}
                      <span>{crafting ? "Paiement…" : `Rejoindre pour ${quote.cost} points`}</span>
                    </button>
                  ) : null}
                </div>
              ) : (
                <div className="inspect-earn">
                  <span>
                    {creator.rarity === "legendary"
                      ? "Une Légendaire ne s'artisine pas : elle se tire en booster — et le plancher de malchance en garantit une au plus tard au 12ᵉ."
                      : "Elle se tire en booster, ou se rejoint à l'Atelier si sa rareté le permet."}
                  </span>
                </div>
              )
            ) : null}

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
