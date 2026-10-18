"use client";

/** Le Last Pack se consulte et se partage. Aucune carte ne peut être prise. */
import { useEffect } from "react";
import { X } from "lucide-react";
import { useCloud } from "@/hooks/use-cloud";
import { useOtherPlayers } from "@/hooks/use-other-players";
import { cloudStore } from "@/lib/cloud/cloud-store";
import { CREATOR_BY_SLUG } from "@/lib/catalog";
import { describeCard } from "@/lib/market";
import { CircleShareEmpty } from "@/components/circle-share-empty";

export function LastPackSheet({ onClose }: { onClose: () => void }) {
  const cloud = useCloud();
  const others = useOtherPlayers();
  useEffect(() => {
    if (cloud.configured && cloud.userId) void cloudStore.loadLastPacks();
  }, [cloud.configured, cloud.userId]);
  const friends = cloud.lastPacks?.packs.filter((pack) => !pack.mine) ?? [];
  return <div className="odds-overlay" role="dialog" aria-modal="true" aria-label="Last Pack">
    <div className="odds-panel">
      <header className="odds-head"><h2>Last Pack</h2>
        <button type="button" onClick={onClose} aria-label="Fermer"><X size={18} /></button>
      </header>
      {others === false || friends.length === 0 && !cloud.lastPacksBusy ? <CircleShareEmpty /> : <>
        <p>Les dernières cartes de tes amis restent à leur propriétaire.</p>
        {friends.map((pack) => <section key={pack.id} className="last-pack-block">
          <h3>{pack.ownerName}</h3>
          <ul>{pack.cards.map((card) => <li key={card.index}>
            {CREATOR_BY_SLUG.get(card.creatorSlug)?.displayName ?? card.creatorSlug} · {describeCard(card.rarity, card.variant)}
          </li>)}</ul>
        </section>)}
      </>}
    </div>
  </div>;
}
