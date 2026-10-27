"use client";

import type { AnimeBooster } from "@/hooks/use-anime-booster";
import { ANIME_BY_ID } from "@/lib/anime";
import { AnimeCard } from "@/components/anime-card";
import { MemeBoosterOpening } from "@/components/meme-booster-opening";
import "./anime-opening.css";

const LABELS = {
  ariaLabel: "Résultat du booster Anime",
  summaryKicker: "CINQ ILLUSTRATIONS RÉVÉLÉES",
  summaryTitle: "Collection Anime",
  close: "Revenir au Drop",
};

export function AnimeBoosterOpening({ booster }: { booster: AnimeBooster }) {
  return <MemeBoosterOpening
    booster={booster}
    artwork="/packs/anime-opening.webp"
    catalog={ANIME_BY_ID}
    labels={LABELS}
    renderCard={(card, compact) => <AnimeCard card={card} compact={compact} />}
  />;
}
