"use client";

/**
 * Feuille « Notifications » : ce qui est arrivé pendant que le joueur n'était
 * pas là.
 *
 * Elle ne décide de rien et ne calcule rien : le carnet est construit par
 * `src/lib/social/inbox.ts` à partir des faits que le serveur garde déjà (offres
 * d'échange, réponses, amis, ventes, cartes prises d'un Last Pack), et le store
 * le publie. Ici, on l'affiche, on l'ouvre au doigt et on marque la visite.
 *
 * **Chaque ligne est un bouton.** C'était le défaut : des lignes de texte qu'on
 * pouvait lire mais pas toucher. Un carnet qui annonce une offre reçue sans y
 * mener oblige à retrouver l'écran soi-même — c'est-à-dire à ne pas y aller. La
 * destination de chaque famille vient de `cibleDe()`, jamais d'un test écrit
 * ici : la règle est testée une fois, dans `src/lib/social/inbox.ts`.
 *
 * Ouvrir la feuille **marque le carnet comme lu** : la pastille disparaît, les
 * lignes restent. Un carnet qu'il faudrait vider à la main serait une corvée.
 */
import { useEffect } from "react";
import {
  ArrowLeftRight,
  Check,
  Info,
  Package,
  Bell,
  Radio,
  ShieldAlert,
  Store,
  UserCheck,
  UserPlus,
  X,
} from "lucide-react";
import { useCloud } from "@/hooks/use-cloud";
import { connecteToi } from "@/lib/cloud/store-text";
import { useInbox } from "@/hooks/use-inbox";
import { useNow } from "@/hooks/use-game";
import { cloudStore } from "@/lib/cloud/cloud-store";
import { pushSupported } from "@/lib/push";
import { cibleDe, type InboxItem, type InboxKind, type InboxTarget } from "@/lib/social/inbox";
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
  friend_pack: <Package size={15} />,
  wishlist_live: <Radio size={15} />,
};

export function NotificationsSheet({
  onClose,
  onGo,
}: {
  onClose: () => void;
  /**
   * Où aller quand le joueur touche une ligne. L'écran qui monte la feuille
   * connaît les onglets et les autres feuilles ; le carnet, lui, ne connaît que
   * des familles.
   */
  onGo: (target: InboxTarget, section?: string) => void;
}) {
  const cloud = useCloud();
  const now = useNow(30_000);
  const { items } = useInbox();

  /**
   * Le geste d'une ligne : **la visite d'abord**, la navigation ensuite.
   * Marquer après coup laisserait la pastille se recalculer sur l'ancienne
   * visite — l'action change l'état, donc elle passe en premier.
   */
  function ouvrir(item: InboxItem) {
    cloudStore.markInboxSeen();
    const cible = cibleDe(item);
    onGo(cible.target, cible.section);
  }

  useEffect(() => {
    if (!cloud.configured || !cloud.userId) return;
    // Recharger d'abord, marquer comme lu ensuite : la dernière visite porte
    // ainsi sur ce qui vient d'être lu à l'écran.
    void cloudStore.loadInbox().then(() => cloudStore.markInboxSeen());
    // L'interrupteur des notifications se relit au serveur : l'état ne vit pas
    // dans la sauvegarde, et deviner « éteint » serait mentir : l'interrupteur
    // s'affichait éteint alors que les notifications partaient.
    void cloudStore.syncPushState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
              <strong>{connecteToi("Le carnet")}</strong>
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
                {/*
                 * La ligne entière est le bouton — pas une petite flèche à
                 * viser au pouce. Le libellé se compose tout seul à partir du
                 * titre et du détail : un lecteur d'écran annonce « X te
                 * propose un échange, 2 cartes contre 1 ».
                 */}
                <button
                  type="button"
                  className="inbox-row"
                  onClick={() => ouvrir(item)}
                  aria-label={`${item.title}${item.body ? `. ${item.body}` : ""}`}
                >
                  <span className="inbox-icon" aria-hidden="true">
                    {ICONS[item.kind]}
                  </span>
                  <div className="inbox-text">
                    <b>{item.title}</b>
                    {item.body ? <span>{item.body}</span> : null}
                  </div>
                  <time dateTime={item.at}>{relativeDay(item.at, now)}</time>
                </button>
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
                l&apos;hôtel, les cartes prises dans ton Last Pack, les boosters de tes amis
                encore ouverts et le direct de ton créateur épinglé apparaîtront ici.
              </span>
            </div>
          </div>
        )}

        {/* L'interrupteur des notifications. Il n'apparaît que si l'appareil
            peut vraiment les recevoir (l'APK, pas le navigateur) et si un
            compte est connecté — promettre un réglage qui ne fait rien serait
            pire que pas de réglage. Le texte dit la règle, parce qu'une
            notification surprise se paie par un refus définitif. */}
        {pushSupported() && cloud.userId ? (
          <section className="notify-switch">
            <button
              type="button"
              className="menu-row"
              role="switch"
              aria-checked={cloud.pushLive === true}
              disabled={cloud.pushBusy}
              onClick={() => void cloudStore.setPushLive(cloud.pushLive !== true)}
            >
              <Bell size={15} />
              <span>Directs de ma collection</span>
              <span className="switch" data-on={cloud.pushLive === true ? "on" : "off"} aria-hidden="true">
                <i />
              </span>
            </button>
            <p className="account-hint">
              {cloud.pushBusy
                ? "Un instant…"
                : cloud.pushLive === true
                  ? `Tu reçois une notification quand un créateur que tu épingles ou dont tu as une carte passe en direct. Une par heure au maximum.${
                      cloud.pushDevices && cloud.pushDevices > 1 ? ` Sur ${cloud.pushDevices} appareils.` : ""
                    }`
                  : cloud.pushLive === null
                    ? "Touche l'interrupteur : Android te demandera l'autorisation, et c'est elle qui fait sonner le téléphone."
                    : "Quand un créateur que tu épingles ou dont tu as une carte passe en direct, ton téléphone sonne. Une fois par heure au maximum."}
            </p>
          </section>
        ) : null}
      </div>
    </div>
  );
}
