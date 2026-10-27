"use client";

import { useEffect } from "react";
import { useBackHandler } from "@/hooks/use-back-handler";
import type { MemeBooster } from "@/hooks/use-meme-booster";
import { MEME_BY_ID, type MemeCard } from "@/lib/memes";
import { buzz } from "@/lib/haptics";
import { PACK_TEAR_HAPTIC } from "@/lib/reveal";
import { setMusicScene, playPackOpening } from "@/lib/sfx";
import { PackTear } from "@/components/pack-tear";
import { MemeReveal, type CardRenderer, type RevealLabels } from "@/components/meme-reveal";
import "./meme-reveal.css";

type OpeningControls = Pick<MemeBooster, "copies" | "presenting" | "prepared" | "extracted" | "returnFocusTo" | "cancel" | "complete" | "close" | "leavePending"> & {
  opening: { cards: string[] } | null;
  commit: () => void | Promise<void>;
};

export function MemeBoosterOpening({
  booster,
  artwork = "/packs/memes-opening.svg",
  catalog = MEME_BY_ID,
  labels,
  renderCard,
}: {
  booster: OpeningControls;
  artwork?: string;
  catalog?: ReadonlyMap<string, MemeCard>;
  labels?: RevealLabels;
  renderCard?: CardRenderer;
}) {
  const { opening, copies, presenting, prepared, extracted } = booster;
  const cards = opening?.cards.map((id) => catalog.get(id)).filter((card): card is MemeCard => Boolean(card)) ?? [];
  const revealing = Boolean(opening && extracted && cards.length === 5);
  useEffect(() => {
    if (!presenting) return;
    setMusicScene("pack");
    return () => setMusicScene("hub");
  }, [presenting]);
  useEffect(() => {
    // Les cinq images décodées avant la révélation : pas de carte qui arrive en retard.
    for (const id of opening?.cards ?? []) {
      const image = catalog.get(id)?.image;
      if (!image) continue;
      const img = new Image();
      img.src = image;
      void img.decode?.().catch(() => {});
    }
  }, [catalog, opening]);
  useBackHandler(presenting && !prepared, () => revealing ? booster.close() : booster.leavePending());
  if (!presenting) return null;
  return <PackTear artwork={artwork} returnFocusTo={booster.returnFocusTo}
    onCancel={prepared ? booster.cancel : undefined}
    onTear={() => { playPackOpening(); buzz(PACK_TEAR_HAPTIC); void booster.commit(); }}
    onComplete={booster.complete} onLeavePending={booster.leavePending}>
    {revealing ? <MemeReveal cards={cards} copies={copies} labels={labels} renderCard={renderCard} onClose={booster.close} /> : null}
  </PackTear>;
}
