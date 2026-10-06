"use client";

/**
 * Feuille « Notifications » : ce qui est arrivé pendant que le joueur n'était
 * pas là.
 *
 * Elle ne décide de rien et ne calcule rien : le carnet est construit par
 * `src/lib/social/inbox.ts` à partir des faits que le serveur garde déjà (offres
 * d'échange, réponses, amis, ventes, cartes prises d'un Last Pack), et le store
 * le publie. Ici, on l'affiche
 * et on marque la visite — c'est tout.
 *
 * Ouvrir la feuille **marque le carnet comme lu** : la pastille disparaît, les
 * lignes restent. Un carnet qu'il faudrait vider à la main serait une corvée.
 */
import { useEffect } from "react";
import { ArrowLeftRight, Check, Info, ShieldAlert, Store, UserCheck, UserPlus, X } from "lucide-react";
import { useCloud } from "@/hooks/use-cloud";
import { useNow } from "@/hooks/use-game";
import { cloudStore } from "@/lib/cloud/cloud-store";
import type { InboxKind } from "@/lib/social/inbox";
import { relativeDay } from "@/lib/social/friends";

/** L'icône de chaque famille de nouvelles. */
const ICONS: Record<InboxKind, React.ReactNode> = {
  trade_in: <ArrowLeftRight size={15} />,
  trade_concluded: <Check size={15} />,
  trade_declined: <X size={15} />,
  friend_request: <UserPlus size={15} />,
  friend_new: <UserCheck size={15} />,
  sale: <Store size={15} />,
  last_pack: <ShieldAlert size={15} />,
};

export function NotificationsSheet({ onClose }: { onClose: () => void }) {
  const cloud = useCloud();
  const now = useNow(30_000);

  useEffect(() => {
    if (!cloud.configured || !cloud.userId) return;
    // Recharger d'abord, marquer comme lu ensuite : la dernière visite porte
    // ainsi sur ce qui vient d'être lu à l'écran.
    void cloudStore.loadInbox().then(() => cloudStore.markInboxSeen());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const items = cloud.inbox;

  return (
    <div className="odds-overlay" role="dialog" aria-modal="true" aria-label="Notifications">
      <div className="odds-panel">
        <header className="odds-head">
          <h2>Notifications</h2>
          <button type="button" onClick={onClose} aria-label="Fermer">
            <X size={18} />
          </button>
        </header>

        {!cloud.configured ? (
          <div className="account-note neutral">
            <Info size={15} />
            <div>
              <strong>Le carnet demande le cloud</strong>
              <span>Cette version est hors ligne : il n&apos;y a personne pour t&apos;écrire.</span>
            </div>
          </div>
        ) : !cloud.userId ? (
          <div className="account-note neutral">
            <Info size={15} />
            <div>
              <strong>Connecte-toi pour suivre tes échanges</strong>
              <span>
                Les offres reçues, les réponses, les demandes d&apos;ami et tes ventes apparaissent ici.
              </span>
            </div>
          </div>
        ) : items.length ? (
          <ul className="inbox-list">
            {items.map((item) => (
              <li key={item.id}>
                <span className="inbox-icon" aria-hidden="true">
                  {ICONS[item.kind]}
                </span>
                <div className="inbox-text">
                  <b>{item.title}</b>
                  {item.body ? <span>{item.body}</span> : null}
                </div>
                <time dateTime={item.at}>{relativeDay(item.at, now)}</time>
              </li>
            ))}
          </ul>
        ) : cloud.inboxBusy || cloud.inboxAt === null ? (
          <p className="account-hint">Chargement du carnet…</p>
        ) : (
          <div className="account-note neutral">
            <Info size={15} />
            <div>
              <strong>Rien de neuf</strong>
              <span>
                Les offres d&apos;échange, les réponses à tes offres, tes amis, tes ventes à
                l&apos;hôtel et les cartes prises dans ton Last Pack apparaîtront ici.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
