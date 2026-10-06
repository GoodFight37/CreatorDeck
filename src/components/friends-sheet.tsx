"use client";

/**
 * Feuille « Amis » : ses amis, les demandes reçues, les demandes envoyées.
 *
 * Elle ne décide de rien : le serveur tient les relations (`0008_friends.sql`),
 * et cette feuille se contente de les montrer et de demander les gestes. Deux
 * choses en découlent, visibles dans le code :
 *
 *   * **on n'ajoute pas un ami par un code**, mais en cherchant un joueur par son
 *     pseudo (`search_players()`, le même RPC que les échanges) : le serveur
 *     attend un identifiant de joueur, pas un code inventé ;
 *   * **rien n'est optimiste** : après un geste, on recharge les listes au lieu
 *     de les bricoler localement. Un écran d'amis qui affiche une amitié que le
 *     serveur n'a pas enregistrée serait pire qu'un écran lent.
 */
import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Check,
  Info,
  RefreshCw,
  Search,
  UserMinus,
  UserPlus,
  X,
} from "lucide-react";
import { useCloud } from "@/hooks/use-cloud";
import { useNow } from "@/hooks/use-game";
import { cloudStore } from "@/lib/cloud/cloud-store";
import type { PlayerSearchResult } from "@/lib/cloud/api";
import {
  byNewestFirst,
  friendCountLabel,
  relativeDay,
  type FriendLists,
} from "@/lib/social/friends";

/** En dessous, la recherche de joueur ne renvoie rien d'utile. */
const QUERY_MIN = 3;

type Tab = "friends" | "incoming" | "outgoing";

export function FriendsSheet({ onClose }: { onClose: () => void }) {
  const cloud = useCloud();
  const now = useNow(60_000);
  const [tab, setTab] = useState<Tab>("friends");
  const [notice, setNotice] = useState<{ message: string; isError: boolean } | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlayerSearchResult[]>([]);
  const [busy, setBusy] = useState(false);

  // Chargé à l'ouverture, et seulement connecté : aucun appel pour un joueur
  // hors ligne. Le résultat vit dans l'état cloud, d'où `lists` ci-dessous.
  useEffect(() => {
    if (cloud.configured && cloud.userId) void cloudStore.loadFriends();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lists: FriendLists = cloud.friends;
  const ready = cloud.friendsAt !== null;
  const load = useCallback(async () => {
    await cloudStore.loadFriends();
  }, []);

  /** Enveloppe un geste : on bloque l'écran, on l'exécute, on recharge. */
  async function act(run: () => Promise<{ message: string | null; isError: boolean }>): Promise<void> {
    setBusy(true);
    const result = await run();
    if (result.message) setNotice({ message: result.message, isError: result.isError });
    await load();
    setBusy(false);
  }

  async function search(): Promise<void> {
    const needle = query.trim();
    if (needle.length < QUERY_MIN) return;
    setBusy(true);
    const found = await cloudStore.searchPlayers(needle);
    setResults(found.players);
    setNotice(found.message ? { message: found.message, isError: found.isError } : null);
    setBusy(false);
  }

  const friends = byNewestFirst(lists.friends);
  const incoming = byNewestFirst(lists.incoming);
  const outgoing = byNewestFirst(lists.outgoing);

  return (
    <div className="odds-overlay" role="dialog" aria-modal="true" aria-label="Amis">
      <div className="odds-panel">
        <header className="odds-head">
          <h2>Amis</h2>
          <button type="button" onClick={onClose} aria-label="Fermer">
            <X size={18} />
          </button>
        </header>

        {!cloud.configured ? (
          <div className="account-note neutral">
            <Info size={15} />
            <div>
              <strong>Les amis demandent le cloud</strong>
              <span>Cette version est hors ligne : il n&apos;y a personne à ajouter.</span>
            </div>
          </div>
        ) : !cloud.userId ? (
          <section className="account-card">
            <p className="account-intro">
              Un compte suffit pour avoir des amis — pas besoin d&apos;e-mail. C&apos;est aussi ce qui
              sauvegarde ta collection et te fait figurer au classement.
            </p>
            <button
              type="button"
              className="account-button wide"
              disabled={cloud.busy}
              onClick={() => void cloudStore.signInAsGuest()}
            >
              <UserPlus size={14} /> Créer un compte invité
            </button>
          </section>
        ) : (
          <>
            <div className="filter-chips" aria-label="Sections">
              <button type="button" className={tab === "friends" ? "active" : ""} onClick={() => setTab("friends")}>
                {friendCountLabel(friends.length)}
              </button>
              <button type="button" className={tab === "incoming" ? "active" : ""} onClick={() => setTab("incoming")}>
                Reçues ({incoming.length})
              </button>
              <button type="button" className={tab === "outgoing" ? "active" : ""} onClick={() => setTab("outgoing")}>
                Envoyées ({outgoing.length})
              </button>
            </div>

            {tab === "friends" ? (
              <section className="account-card">
                <div className="account-head">
                  <Search size={15} />
                  <strong>Ajouter un ami</strong>
                </div>
                <p className="account-intro">
                  Cherche un joueur par son pseudo de classement, puis envoie-lui une demande. Elle
                  n&apos;existe qu&apos;une fois qu&apos;il l&apos;a acceptée.
                </p>
                <label className="account-field">
                  <span>Pseudo du joueur</span>
                  <input
                    type="text"
                    maxLength={24}
                    placeholder={`Au moins ${QUERY_MIN} caractères`}
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </label>
                <div className="account-actions">
                  <button
                    type="button"
                    className="account-button"
                    disabled={busy || query.trim().length < QUERY_MIN}
                    onClick={() => void search()}
                  >
                    <Search size={14} /> Chercher
                  </button>
                </div>
                {results.length ? (
                  <div className="trade-players">
                    {results.map((player) => (
                      <button
                        type="button"
                        key={player.userId}
                        className="trade-player"
                        disabled={busy}
                        onClick={() =>
                          void act(() => cloudStore.sendFriendRequest(player.userId))
                        }
                      >
                        <b>{player.displayName}</b>
                        <span>niveau {player.level} · {player.uniqueCreators} créateurs</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </section>
            ) : null}

            {notice ? (
              <div className={`account-note ${notice.isError ? "error" : "ok"}`} role="status">
                {notice.isError ? <AlertTriangle size={15} /> : <Check size={15} />}
                <span>{notice.message}</span>
              </div>
            ) : null}

            {!ready ? <p className="account-hint">Chargement…</p> : null}

            {ready && tab === "friends" ? (
              <section className="account-card">
                <div className="account-head">
                  <Check size={15} />
                  <strong>{friendCountLabel(friends.length)}</strong>
                </div>
                {friends.length ? (
                  <div className="friend-rows">
                    {friends.map((friend) => (
                      <div className="friend-row" key={friend.id}>
                        <b>{friend.friendName}</b>
                        <span>amis depuis {relativeDay(friend.createdAt, now) || "peu"}</span>
                        <button
                          type="button"
                          className="account-refresh"
                          aria-label={`Retirer ${friend.friendName}`}
                          disabled={busy}
                          onClick={() => void act(() => cloudStore.removeFriend(friend.friendId))}
                        >
                          <UserMinus size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="account-hint">
                    Aucun ami pour l&apos;instant. Cherche un pseudo ci-dessus : la demande part
                    tout de suite.
                  </p>
                )}
              </section>
            ) : null}

            {ready && tab === "incoming" ? (
              <section className="account-card">
                <div className="account-head">
                  <UserPlus size={15} />
                  <strong>Demandes reçues</strong>
                </div>
                {incoming.length ? (
                  <div className="friend-rows">
                    {incoming.map((request) => (
                      <div className="friend-row" key={request.id}>
                        <b>{request.senderName}</b>
                        <span>{relativeDay(request.createdAt, now)}</span>
                        <button
                          type="button"
                          className="account-button"
                          disabled={busy}
                          onClick={() => void act(() => cloudStore.acceptFriendRequest(request.id))}
                        >
                          <Check size={14} /> Accepter
                        </button>
                        <button
                          type="button"
                          className="account-refresh"
                          aria-label={`Refuser la demande de ${request.senderName}`}
                          disabled={busy}
                          onClick={() => void act(() => cloudStore.rejectFriendRequest(request.id))}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="account-hint">Aucune demande en attente.</p>
                )}
              </section>
            ) : null}

            {ready && tab === "outgoing" ? (
              <section className="account-card">
                <div className="account-head">
                  <RefreshCw size={15} />
                  <strong>Demandes envoyées</strong>
                </div>
                {outgoing.length ? (
                  <div className="friend-rows">
                    {outgoing.map((request) => (
                      <div className="friend-row" key={request.id}>
                        <b>{request.recipientName}</b>
                        <span>envoyée {relativeDay(request.createdAt, now)}</span>
                        <button
                          type="button"
                          className="account-refresh"
                          aria-label={`Annuler la demande pour ${request.recipientName}`}
                          disabled={busy}
                          onClick={() => void act(() => cloudStore.cancelFriendRequest(request.id))}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="account-hint">Aucune demande en attente de réponse.</p>
                )}
              </section>
            ) : null}

            <div className="account-actions">
              <button type="button" className="account-button ghost" disabled={busy} onClick={() => void load()}>
                <RefreshCw size={14} /> Actualiser
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
