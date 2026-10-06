"use client";

import { useRef, type CSSProperties, type PointerEvent } from "react";
import Image from "next/image";
import {
  creatorImage,
  formatFollowersCount,
  RARITY_META,
  type CardVariant,
  type Creator,
} from "@/lib/catalog";
import { regionLabel } from "@/lib/regions";
import { Radio } from "lucide-react";

type CreatorCardProps = {
  creator: Creator;
  variant?: CardVariant;
  count?: number;
  locked?: boolean;
  compact?: boolean;
  className?: string;
};

/**
 * Une carte — une vraie planche, pas une vignette.
 *
 * Ce qui fait une carte de TCG, et qui manquait ici :
 *
 *   * le **portrait plein cadre**, rogné en portrait (les photos Twitch sont
 *     carrées : on les étire sur la hauteur de la planche, pas dans une fenêtre
 *     carrée posée en haut de la carte) ;
 *   * la **rareté comme cadre** — épaisseur, teinte et texture du bord — au lieu
 *     d'une lettre dans une pastille : ça se lit à deux mètres ;
 *   * une **nameplate opaque** en bas, barre pleine, nom en display condensée ;
 *   * le **rang tamponné** (#022), comme un numéro de série ;
 *   * les variantes comme **matière** : le dos de la carte est un vrai dos, la
 *     led rouge pulse sur une Live, le foil suit le doigt sur une Holo ou une
 *     Gold (variables `--px`/`--py`, écrites sans re-rendu) ;
 *   * une carte manquante montre le **dos CreatorDeck**, jamais un portrait
 *     grisé sous un cadenas.
 */
export function CreatorCard({
  creator,
  variant = "standard",
  count = 1,
  locked = false,
  compact = false,
  className = "",
}: CreatorCardProps) {
  const rarity = RARITY_META[creator.rarity];
  // Le foil ne « suit le doigt » que sur une carte assez grande pour qu'on le
  // voie : dans la grille du classeur (2 ou 3 cm de large), c'est du calcul pour
  // rien — et 1 000 cartes n'ont pas besoin de 1 000 écouteurs.
  const shiny = !locked && !compact && variant !== "standard";
  const foilRef = useRef<HTMLDivElement | null>(null);

  function trackPointer(event: PointerEvent<HTMLElement>) {
    const foil = foilRef.current;
    if (!foil || !shiny) return;
    const box = event.currentTarget.getBoundingClientRect();
    foil.style.setProperty("--px", `${(((event.clientX - box.left) / box.width) * 100).toFixed(1)}%`);
    foil.style.setProperty("--py", `${(((event.clientY - box.top) / box.height) * 100).toFixed(1)}%`);
  }

  const style = {
    "--rarity": rarity.color,
    "--rarity-glow": rarity.glow,
  } as CSSProperties;

  if (locked) {
    return (
      <article
        className={`creator-card rarity-${creator.rarity} is-locked ${compact ? "is-compact" : ""} ${className}`}
        style={style}
        aria-label={`${creator.displayName}, rang ${creator.rank}, ${rarity.label}, non obtenue`}
      >
        <div className="card-back" aria-hidden="true">
          <span className="card-back-word">CreatorDeck</span>
          <span className="card-back-rarity">{rarity.label}</span>
        </div>
      </article>
    );
  }

  return (
    <article
      className={`creator-card rarity-${creator.rarity} variant-${variant} ${shiny ? "is-shiny" : ""} ${compact ? "is-compact" : ""} ${className}`}
      style={style}
      aria-label={`${creator.displayName}, rang ${creator.rank}, ${rarity.label}`}
      onPointerMove={trackPointer}
      onPointerLeave={() => {
        const foil = foilRef.current;
        if (!foil) return;
        foil.style.removeProperty("--px");
        foil.style.removeProperty("--py");
      }}
    >
      <div className="card-photo-wrap">
        <Image
          className="card-photo"
          src={creatorImage(creator)}
          alt={`Portrait officiel de ${creator.displayName}`}
          fill
          draggable={false}
        />
        <div className="card-photo-shade" />
      </div>

      <div className="card-foil" ref={foilRef} aria-hidden="true" />

      <span className="card-rank">#{String(creator.rank).padStart(3, "0")}</span>

      {variant === "live" ? (
        <span className="card-live">
          <i aria-hidden="true" />
          On air
        </span>
      ) : null}

      <div className="card-nameplate">
        <span className="card-region">{regionLabel(creator.region)}</span>
        <h3>{creator.displayName}</h3>
        <div className="card-footerline">
          <span>{formatFollowersCount(creator.followers)}</span>
          {count > 1 ? <strong>×{count}</strong> : null}
        </div>
      </div>
    </article>
  );
}
