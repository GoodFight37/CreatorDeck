"use client";

import Image from "next/image";
import { MEME_RARITY, type MemeCard } from "@/lib/memes";
import styles from "./anime-card.module.css";

export function AnimeCard({ card, compact = false }: { card: MemeCard; compact?: boolean }) {
  return <article className={styles.card} data-rarity={card.rarity} data-compact={compact}>
    <div className={styles.image}>
      {card.image ? <>
        <Image className={styles.portrait} src={card.image} alt={card.name} fill sizes={compact ? "250px" : "(max-width: 600px) 88vw, 390px"} />
      </> : null}
      <span className={styles.foil} aria-hidden="true" />
      <div className={styles.topline}>
        <span>№ {String(card.number).padStart(3, "0")}</span>
        <span>{MEME_RARITY[card.rarity].label}</span>
      </div>
    </div>
    <div className={styles.caption}>
      <div><h3>{card.name}</h3><p>{card.flavor}</p></div>
      <span className={styles.mark} aria-hidden="true">◌</span>
    </div>
  </article>;
}
