"use client";

/** Le Last Pack se consulte et se partage. Aucune carte ne peut être prise. */
import { useEffect } from "react";
import { X } from "lucide-react";
import { useCloud } from "@/hooks/use-cloud";
import { cloudStore } from "@/lib/cloud/cloud-store";
import { CREATOR_BY_SLUG } from "@/lib/catalog";
import { describeCard } from "@/lib/market";
import { CircleShareEmpty } from "@/components/circle-share-empty";
import { usePresentationFocus } from "@/hooks/use-presentation-focus";

export function LastPackSheet({ onClose }: { onClose: () => void }) {
  const dialogRef = usePresentationFocus(true, undefined, onClose);
  const cloud = useCloud();
  useEffect(() => {
    if (cloud.configured && cloud.userId) void cloudStore.loadLastPacks();
  }, [cloud.configured, cloud.userId]);
  const friends = cloud.lastPacks?.packs.filter((pack) => !pack.mine) ?? [];
  const connected = cloud.configured && Boolean(cloud.userId);
  const reading = connected && (cloud.lastPacksBusy || (!cloud.lastPacks && !cloud.lastPacksAt && !cloud.isError));
  const failed = connected && !reading && !cloud.lastPacks && !cloud.lastPacksAt && cloud.isError;
  return <div className="odds-overlay" role="dialog" tabIndex={-1} ref={dialogRef} aria-modal="true" aria-label="Last Pack">
    <div className="odds-panel">
      <header className="odds-head"><h2>Last Pack</h2>
        <button type="button" onClick={onClose} aria-label="Fermer"><X size={18} /></button>
      </header>
      {reading ? <p role="status">Lecture des derniers boosters…</p> : null}
      {failed ? <div role="alert">
        <p>Lecture des derniers boosters indisponible.</p>
        <button type="button" className="account-button" onClick={() => void cloudStore.loadLastPacks()}>Réessayer</button>
      </div> : friends.length === 0 ? (!reading ? <CircleShareEmpty /> : null) : <>
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
