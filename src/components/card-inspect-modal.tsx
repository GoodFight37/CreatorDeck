"use client";

import { useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { usePresentationFocus } from "@/hooks/use-presentation-focus";
import { X, Sparkles, Hammer, LoaderCircle, ExternalLink } from "lucide-react";
import { CardBackEmblem } from "@/components/card-back-emblem";
import { CreatorCard } from "@/components/creator-card";
import { RARITY_META, VARIANT_META, type CardVariant, type Creator } from "@/lib/catalog";
import { regionLabel } from "@/lib/regions";
import { viewersLabel, type LiveStream } from "@/lib/live";
import { isRetired } from "@/lib/retired";

type CardInspectModalProps = {
  presentation?: "sheet" | "binder";
  themeStyle?: CSSProperties;
  copies?: { variant: CardVariant; count: number }[];
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
  presentation = "sheet",
  themeStyle,
  copies = [],
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
  const binder = presentation === "binder";
  const [selection, setSelection] = useState(variant);
  const selected = copies.find((copy) => copy.variant === selection);
  const shownVariant = binder && selected ? selected.variant : variant;
  const shownCount = binder && selected ? selected.count : ownedCount;
  const dialogRef = usePresentationFocus(binder);

  const content = (
    <div ref={dialogRef} tabIndex={binder ? -1 : undefined}
      style={{ ...themeStyle, "--inspect-rarity": rarity.color } as CSSProperties}
      onKeyDown={(event) => { if (binder && event.key === "Escape") { event.stopPropagation(); onClose(); } }}
      className={`odds-overlay${binder ? ` card-vault vault-${creator.rarity}` : ""}`} role="dialog" aria-modal="true" aria-label={`Carte de ${creator.displayName}`}>
      <div className="odds-panel inspect-panel">
        <header className="odds-head">
          <div>
            <h2>{creator.displayName}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer">
            <X size={18} />
          </button>
        </header>

        <div className="inspect-layout">
          <div className="inspect-card-stage">
            <CreatorCard
              creator={creator}
              variant={shownVariant}
              interactiveFoil={binder}
              className={binder ? "binder-feature-card" : ""}
              locked={!isOwned}
              liveStream={liveStream}
            />
            {binder && !isOwned ? <span className="inspect-back-seal" aria-hidden="true"><CardBackEmblem /></span> : null}
          </div>

          <div className="inspect-details">
            {binder && copies.length > 0 ? (
              <div className="inspect-variants" role="group" aria-label="Variantes possédées">
                {copies.map((copy) => (
                  <button type="button" key={copy.variant} aria-pressed={shownVariant === copy.variant}
                    onClick={() => setSelection(copy.variant)}>
                    {VARIANT_META[copy.variant].label} <span>×{copy.count}</span>
                  </button>
                ))}
              </div>
            ) : null}
            <div className="inspect-facts">
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
              {binder && isOwned
                ? `${ownedCount} exemplaire${ownedCount > 1 ? "s" : ""} au total · ${VARIANT_META[shownVariant].label} : ${shownCount}.`
                : isOwned
                ? variant === "live"
                  ? `${creator.displayName} a été obtenu pendant un direct. Tu as ${ownedCount} exemplaire${ownedCount > 1 ? "s" : ""} de cette variante souvenir.`
                  : `${creator.displayName} est déjà dans ton classeur. Tu as ${ownedCount} copie${ownedCount > 1 ? "s" : ""} dans cette variante.`
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
                    {isRetired(creator.slug)
                      ? "Ce Sortant ne tombe plus en booster et ne peut plus être rejoint à l'Atelier."
                      : creator.rarity === "legendary"
                      ? "Une Légendaire ne se crée pas à l’Atelier : elle se tire en booster — et le plancher de malchance en garantit une au plus tard au 12ᵉ."
                      : "Elle se tire en booster, ou se rejoint à l'Atelier si sa rareté le permet."}
                  </span>
                </div>
              )
            ) : null}

            {liveStream ? (
              <>
                <div className="odds-stat">
                  <span>En direct maintenant</span>
                  <strong>
                    <Sparkles size={14} style={{ verticalAlign: "middle", marginRight: 6 }} />
                    {liveStream.title ? `${liveStream.title} · ` : ""}
                    {viewersLabel(liveStream.viewers)}
                  </strong>
                </div>
              </>
            ) : null}
            <a className="inspect-twitch-link" href={`https://www.twitch.tv/${encodeURIComponent(creator.login)}`}
              target="_blank" rel="noopener noreferrer"
              aria-label={`Ouvrir la chaîne Twitch de ${creator.displayName} dans un nouvel onglet`}>
              <ExternalLink size={15} aria-hidden="true" /> Voir la chaîne sur Twitch
            </a>
          </div>

          <div className="inspect-footer">
            <button type="button" className="primary-button" onClick={onClose}>
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
  return binder ? createPortal(content, document.body) : content;
}
