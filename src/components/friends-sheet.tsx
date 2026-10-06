"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import Image from "next/image";
import {
  AlertTriangle,
  ArrowLeftRight,
  Check,
  ChevronRight,
  Info,
  LogOut,
  Mail,
  Plus,
  Radio,
  RefreshCw,
  Search,
  ShieldCheck,
  UserPlus,
  UserSearch,
  X,
} from "lucide-react";
import { useCloud } from "@/hooks/use-cloud";
import { cloudStore } from "@/lib/cloud/cloud-store";
import type { FriendRequest, Friendship } from "@/lib/social/friends";

const AVATAR_SIZE = 36;

/**
 * Feuille « Amis » : gérer ses demandes d'ami et sa liste d'amis.
 *
 * Trois onglets :
 *   - Amis : liste des amis acceptés
 *   - Reçues : demandes d'ami reçues (à accepter ou rejeter)
 *   - Envoyées : demandes d'ami envoyées (à annuler)
 */
export function FriendsSheet({
  onClose,
}: {
  onClose: () => void;
}) {
  const cloud = useCloud();
  const [activeTab, setActiveTab] = useState<"friends" | "received" | "sent">(
    "friends"
  );
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [incoming, setIncoming] = useState<FriendRequest[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [inviteCode, setInviteCode] = useState<string>("");

  // Charger les données au démarrage et quand l'onglet change
  useEffect(() => {
    if (!cloud.configured || !cloud.userId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Charger en parallèle les trois listes
    Promise.all([
      cloudStore.listFriends(),
      cloudStore.listIncomingFriendRequests(),
      cloudStore.listOutgoingFriendRequests(),
    ])
      .then(([friendsResult, incomingResult, outgoingResult]) => {
        setFriends(friendsResult);
        setIncoming(incomingResult);
        setOutgoing(outgoingResult);
      })
      .catch((err) => {
        console.error("Failed to load friends data:", err);
        setError(
          "Impossible de charger les données d'amis. Vérifiez votre connexion."
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, [cloud.configured, cloud.userId, activeTab]);

  // Fonction pour envoyer une demande d'ami
  const handleSendRequest = async () => {
    if (!inviteCode.trim()) {
      setError("Veuillez entrer un code d'ami");
      return;
    }

    setError(null);
    try {
      const result = await cloudStore.sendFriendRequest(inviteCode);
      if (result.alreadyFriends) {
        setError("Vous êtes déjà amis avec cet utilisateur");
      } else if (result.existingRequest) {
        setError(
          "Une demande d'ami existe déjà dans l'autre sens. Allez dans l'onglet « Reçues » pour y répondre."
        );
      } else {
        // Rafraîchir les listes
        setOutgoing((prev) => [...prev, result.request].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
        setInviteCode("");
        setError("Demande d'ami envoyée !");
      }
    } catch (err: any) {
      setError(err.message ?? "Erreur lors de l'envoi de la demande");
    }
  };

  // Fonction pour accepter une demande d'ami
  const handleAcceptRequest = async (requestId: string) => {
    try {
      const result = await cloudStore.acceptFriendRequest(Number(requestId));
      // Mettre à jour les listes
      setIncoming((prev) => prev.filter((req) => req.id !== requestId));
      if (result.friendship !== null) {
        const friendship = result.friendship;
        setFriends((prev) => [...prev, friendship]);
      }
    } catch (err: any) {
      setError(err.message ?? "Erreur lors de l'acceptation de la demande");
    }
  };

  // Fonction pour rejeter une demande d'ami
  const handleRejectRequest = async (requestId: string) => {
    try {
      await cloudStore.rejectFriendRequest(Number(requestId));
      setIncoming((prev) => prev.filter((req) => req.id !== requestId));
    } catch (err: any) {
      setError(err.message ?? "Erreur lors du rejet de la demande");
    }
  };

  // Fonction pour annuler une demande d'ami envoyée
  const handleCancelRequest = async (requestId: string) => {
    try {
      await cloudStore.cancelFriendRequest(Number(requestId));
      setOutgoing((prev) => prev.filter((req) => req.id !== requestId));
    } catch (err: any) {
      setError(err.message ?? "Erreur lors de l'annulation de la demande");
    }
  };

  // Fonction pour supprimer un ami
  const handleRemoveFriend = async (friendId: string) => {
    try {
      await cloudStore.removeFriend(friendId);
      setFriends((prev) => prev.filter((friend) => friend.friendId !== friendId));
    } catch (err: any) {
      setError(err.message ?? "Erreur lors de la suppression de l'ami");
    }
  };

  if (!cloud.configured) {
    return (
      <div className="odds-overlay" role="dialog" aria-modal="true" aria-label="Amis">
        <div className="odds-panel">
          <header className="odds-head">
            <h2>Amis</h2>
            <button type="button" onClick={onClose} aria-label="Fermer">
              <X size={18} />
            </button>
          </header>
          <div className="account-note neutral">
            <Info size={15} />
            <div>
              <strong>Fonction d&apos;amis non disponible</strong>
              <span>Le système d&apos;amis nécessite une connexion au cloud.</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!cloud.userId) {
    return (
      <div className="odds-overlay" role="dialog" aria-modal="true" aria-label="Amis">
        <div className="odds-panel">
          <header className="odds-head">
            <h2>Amis</h2>
            <button type="button" onClick={onClose} aria-label="Fermer">
              <X size={18} />
            </button>
          </header>
          <div className="account-card">
            <p className="account-intro">
              Pour utiliser le système d&apos;amis, vous devez d&apos;après créer un compte.
              Un compte vous permet de sauvegarder votre collection et de
              figurer au classement.
            </p>
            <button type="button" className="account-button wide" onClick={() => void cloudStore.signInAsGuest()}>
              <UserPlus size={14} /> Créer un compte invité (sans e-mail)
            </button>
          </div>
        </div>
      </div>
    );
  }

  const filteredFriends = friends.filter(
    (friend) =>
      friend.friendName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      friend.friendId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="odds-overlay" role="dialog" aria-modal="true" aria-label="Amis">
      <div className="odds-panel">
        <header className="odds-head">
          <h2>Amis</h2>
          <div className="tabs">
            <button
              type="button"
              className={activeTab === "friends" ? "tab-active" : "tab-inactive"}
              onClick={() => setActiveTab("friends")}
            >
              Amis ({friends.length})
            </button>
            <button
              type="button"
              className={activeTab === "received" ? "tab-active" : "tab-inactive"}
              onClick={() => setActiveTab("received")}
            >
              Reçues ({incoming.length})
            </button>
            <button
              type="button"
              className={activeTab === "sent" ? "tab-active" : "tab-inactive"}
              onClick={() => setActiveTab("sent")}
            >
              Envoyées ({outgoing.length})
            </button>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer">
            <X size={18} />
          </button>
        </header>

        {error && (
          <div className="account-note error">
            <AlertTriangle size={15} />
            <div>{error}</div>
          </div>
        )}

        {loading ? (
          <div className="account-hint">Chargement…</div>
        ) : activeTab === "friends" ? (
          <>
            {filteredFriends.length === 0 ? (
              <p className="account-hint">
                Vous n&apos;avez encore aucun ami. Allez dans l&apos;onglet « Envoyées »
                pour envoyer des demandes d&apos;ami, ou dans « Reçues » pour répondre
                aux demandes reçues.
              </p>
            ) : (
              <div className="friends-list">
                {filteredFriends.map((friend) => (
                  <div key={friend.id} className="friend-item">
                    <div className="friend-info">
                      <Image
                        src={`https://static-cdn.jtvnw.net/jtv_user_pictures/${friend.friendId}-profile_image-300x300.png`}
                        alt={friend.friendName}
                        width={AVATAR_SIZE}
                        height={AVATAR_SIZE}
                        priority
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "/default-avatar.png";
                        }}
                      />
                      <div>
                        <strong>{friend.friendName}</strong>
                        <span className="friend-id">{friend.friendId}</span>
                      </div>
                    </div>
                    <div className="friend-actions">
                      <button
                        type="button"
                        className="account-button ghost"
                        onClick={() => handleRemoveFriend(friend.friendId)}
                      >
                        <AlertTriangle size={14} /> Retirer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : activeTab === "received" ? (
          <>
            {incoming.length === 0 ? (
              <p className="account-hint">
                Aucune demande d&apos;ami reçue. Lorsque quelqu&apos;un vous envoie une
                demande d&apos;ami, elle apparaîtra ici.
              </p>
            ) : (
              <div className="requests-list">
                {incoming.map((request) => (
                  <div key={request.id} className="request-item">
                    <div className="request-info">
                      <Image
                        src={`https://static-cdn.jtvnw.net/jtv_user_pictures/${request.senderId}-profile_image-300x300.png`}
                        alt={request.senderName}
                        width={AVATAR_SIZE}
                        height={AVATAR_SIZE}
                        priority
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "/default-avatar.png";
                        }}
                      />
                      <div>
                        <strong>{request.senderName}</strong>
                        <span className="request-id">{request.senderId}</span>
                      </div>
                    </div>
                    <div className="request-actions">
                      <button
                        type="button"
                        className="account-button"
                        onClick={() => handleAcceptRequest(request.id)}
                      >
                        <Check size={14} /> Accepter
                      </button>
                      <button
                        type="button"
                        className="account-button ghost"
                        onClick={() => handleRejectRequest(request.id)}
                      >
                        <X size={14} /> Rejeter
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {outgoing.length === 0 ? (
              <p className="account-hint">
                Aucune demande d&apos;ami envoyée. Utilisez le champ ci-dessous pour
                envoyer une demande d&apos;ami à un autre utilisateur.
              </p>
            ) : (
              <div className="requests-list">
                {outgoing.map((request) => (
                  <div key={request.id} className="request-item">
                    <div className="request-info">
                      <Image
                        src={`https://static-cdn.jtvnw.net/jtv_user_pictures/${request.recipientId}-profile_image-300x300.png`}
                        alt={request.recipientName}
                        width={AVATAR_SIZE}
                        height={AVATAR_SIZE}
                        priority
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "/default-avatar.png";
                        }}
                      />
                      <div>
                        <strong>{request.recipientName}</strong>
                        <span className="request-id">{request.recipientId}</span>
                      </div>
                    </div>
                    <div className="request-actions">
                      <button
                        type="button"
                        className="account-button ghost"
                        onClick={() => handleCancelRequest(request.id)}
                      >
                        <AlertTriangle size={14} /> Annuler
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="invite-section">
              <label className="account-field">
                <span>
                  <UserSearch size={10} /> Entrez un code d&apos;ami
                </span>
                <input
                  type="text"
                  placeholder="Code d'ami de l'utilisateur"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                />
              </label>
              <button
                type="button"
                className={inviteCode.trim() ? "account-button" : "account-button disabled"}
                onClick={handleSendRequest}
                disabled={loading}
              >
                <ArrowLeftRight size={14} /> Envoyer la demande
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}