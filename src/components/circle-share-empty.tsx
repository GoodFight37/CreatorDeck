"use client";

import { useState } from "react";
import { useCircle } from "@/lib/circle-store";
import { useGame } from "@/hooks/use-game";
import { CREATOR_BY_SLUG, RARITY_META } from "@/lib/catalog";
import { CreatorCard } from "@/components/creator-card";

/** Partager une carte ne transfère aucune carte ni aucun droit de propriété. */
export function CircleShareEmpty() {
  const circle = useCircle();
  const state = useGame();
  const card = circle.flatMap((slug) => state?.cards.filter((item) => item.creatorSlug === slug) ?? [])[0];
  const creator = CREATOR_BY_SLUG.get(card?.creatorSlug ?? circle[0]);
  const [notice, setNotice] = useState<string | null>(null);
  async function share() {
    if (!creator) return;
    const text = `${creator.displayName} · ${RARITY_META[creator.rarity].label} — une carte de mes chaînes dans CreatorDeck.`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Ma carte CreatorDeck", text });
        setNotice("Carte partagée.");
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setNotice("Carte copiée : colle-la dans la conversation de ton choix.");
      } else {
        setNotice(text);
      }
    } catch (error) {
      if (!(error instanceof Error && error.name === "AbortError")) setNotice("Partage indisponible. Réessaie.");
    }
  }
  return <section className="account-card" aria-label="Partager une carte du cercle">
    <p>Invite quelqu’un avec une carte de tes chaînes.</p>
    {creator ? <>
      <CreatorCard creator={creator} variant={card?.variant ?? "standard"} compact />
      <button type="button" className="account-button" onClick={() => void share()}>Partager une carte de mes chaînes</button>
    </> : <>
      <p>Définis tes chaînes pour choisir une carte à partager.</p>
      <button type="button" className="account-button" onClick={() => {
        window.dispatchEvent(new Event("creatordeck:define-circle"));
      }}>Définir mes chaînes</button>
    </>}
    {notice ? <p role="status">{notice}</p> : null}
  </section>;
}
