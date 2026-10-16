"use client";

import Image from "next/image";
import { useRef, type CSSProperties, type PointerEvent } from "react";
import { MEME_RARITY, type MemeCard as MemeCardData } from "@/lib/memes";
import { cardEffectsAllowed } from "@/lib/tilt";

export function MemeCard({ card, compact = false, copies = 0, interactiveFoil = false }: {
  card: MemeCardData;
  compact?: boolean;
  copies?: number;
  interactiveFoil?: boolean;
}) {
  const rarity = MEME_RARITY[card.rarity];
  const foilRef = useRef<HTMLDivElement>(null);
  const reflective = card.rarity === "epic" || card.rarity === "legendary" || card.rarity === "mythic" || card.fullArt;

  function trackPointer(event: PointerEvent<HTMLElement>) {
    if (!interactiveFoil || !reflective || !cardEffectsAllowed() || !foilRef.current) return;
    const box = event.currentTarget.getBoundingClientRect();
    foilRef.current.style.setProperty("--px", `${(((event.clientX - box.left) / box.width) * 100).toFixed(1)}%`);
    foilRef.current.style.setProperty("--py", `${(((event.clientY - box.top) / box.height) * 100).toFixed(1)}%`);
  }

  return (
    <article className={`creator-card meme-card rarity-${card.rarity}${compact ? " is-compact" : ""}${card.fullArt ? " is-full-art" : ""}${interactiveFoil && reflective ? " is-reactive" : ""}`}
      style={{ "--rarity": rarity.color } as CSSProperties}
      onPointerMove={trackPointer}
      onPointerLeave={() => {
        foilRef.current?.style.removeProperty("--px");
        foilRef.current?.style.removeProperty("--py");
      }}
      aria-label={`${card.name}, ${rarity.label}${card.fullArt ? ", Full Art" : ""}${copies ? `, ${copies} exemplaire${copies > 1 ? "s" : ""}` : ", non obtenue"}`}>
      <div className="card-photo-wrap">
        {card.image ? (
          <Image className="card-photo" src={card.image} alt="" fill sizes={compact ? "(max-width: 600px) 27vw, 160px" : "(max-width: 600px) 65vw, 300px"} />
        ) : <div className="card-photo-placeholder" aria-hidden="true"><span>?</span></div>}
        <div className="card-photo-shade" />
      </div>
      <div className="meme-card-material" aria-hidden="true" />
      <div className="meme-card-foil" ref={foilRef} aria-hidden="true" />
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
