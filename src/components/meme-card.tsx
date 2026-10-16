import Image from "next/image";
import type { CSSProperties } from "react";
import { MEME_RARITY, type MemeCard as MemeCardData } from "@/lib/memes";

export function MemeCard({ card, compact = false, copies = 0 }: {
  card: MemeCardData;
  compact?: boolean;
  copies?: number;
}) {
  const rarity = MEME_RARITY[card.rarity];
  return (
    <article className={`creator-card meme-card rarity-${card.rarity}${compact ? " is-compact" : ""}${card.fullArt ? " is-full-art" : ""}`}
      style={{ "--rarity": rarity.color } as CSSProperties}
      aria-label={`${card.name}, ${rarity.label}${card.fullArt ? ", Full Art" : ""}${copies ? `, ${copies} exemplaire${copies > 1 ? "s" : ""}` : ", non obtenue"}`}>
      <div className="card-photo-wrap">
        {card.image ? (
          <Image className="card-photo" src={card.image} alt="" fill sizes={compact ? "(max-width: 600px) 27vw, 160px" : "(max-width: 600px) 65vw, 300px"} />
        ) : <div className="card-photo-placeholder" aria-hidden="true"><span>?</span></div>}
        <div className="card-photo-shade" />
      </div>
      <div className="card-topline">
        <span className="card-rank">#{String(card.number).padStart(3, "0")}</span>
        {card.fullArt ? <span className="meme-full-art">Full Art</span> : null}
      </div>
      <div className="card-nameplate">
        <div className="card-identity">
          <span className="card-rarity-label">{rarity.label}</span>
          <span className="card-region">Mèmes FR</span>
        </div>
        <h3 title={card.name}>{card.name}</h3>
        {!compact ? <div className="card-footerline"><span>ÉDITION MÈMES</span>{copies > 1 ? <strong>×{copies}</strong> : null}</div> : null}
      </div>
    </article>
  );
}
