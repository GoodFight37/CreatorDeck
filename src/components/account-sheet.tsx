"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Check,
  CloudOff,
  Crown,
  Download,
  Info,
  LogOut,
  Mail,
  RefreshCw,
  Trophy,
  Upload,
  X,
} from "lucide-react";
import { useCloud } from "@/hooks/use-cloud";
import { cloudStore, type LeaderboardMetric } from "@/lib/cloud/cloud-store";
import { CLOUD_DISABLED_HINT } from "@/lib/cloud/config";
import { describeSync } from "@/lib/cloud/sync";

const METRICS: { id: LeaderboardMetric; label: string }[] = [
  { id: "unique_creators", label: "Cartes uniques" },
  { id: "total_cards", label: "Cartes" },
  { id: "legendary_cards", label: "Légendaires" },
];

/**
 * Écran « Compte & cloud » : identification par code, synchronisation de la
 * partie et classement mondial.
 *
 * Rien n'est envoyé tant que le joueur n'a pas validé son code, et charger le
 * cloud demande deux appuis (le bouton se transforme en confirmation) : c'est
 * la seule action qui peut remplacer une partie locale.
 */
export function AccountSheet({ onClose }: { onClose: () => void }) {
  const cloud = useCloud();
  const [email, setEmail] = useState(cloud.email ?? "");
  const [code, setCode] = useState("");
  const [confirmPull, setConfirmPull] = useState(false);

  // Le classement n'est chargé qu'à l'ouverture, et seulement si on est
  // connecté : aucun appel réseau pour un joueur hors ligne.
  useEffect(() => {
    if (cloud.configured && cloud.userId) void cloudStore.loadLeaderboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const message = cloud.configured ? cloud.message : null;

  return (
    <div className="odds-overlay" role="dialog" aria-modal="true" aria-label="Compte et cloud">
      <div className="odds-panel">
        <header className="odds-head">
          <div>
            <p className="eyebrow">COMPTE</p>
            <h2>Cloud &amp; classement</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer">
            <X size={18} />
          </button>
        </header>

        {!cloud.configured ? (
          <div className="account-note neutral">
            <Info size={15} />
            <div>
              <strong>Cloud non configuré dans cette version</strong>
              <span>{CLOUD_DISABLED_HINT}</span>
            </div>
          </div>
        ) : (
          <>
            {cloud.userId ? (
              <section className="account-card">
                <div className="account-who">
                  <span className="settings-icon purple">
                    <Mail size={16} />
                  </span>
                  <div>
                    <strong>{cloud.email}</strong>
                    <span>
                      Projet {cloud.project} · {describeSync({ action: cloud.decision ?? "noop", reason: "" }, cloud.remoteUpdatedAt)}
                    </span>
                  </div>
                  {cloud.pending ? <span className="account-badge">à envoyer</span> : <Check size={17} className="success-icon" />}
                </div>

                <div className="account-actions">
                  <button type="button" className="account-button" disabled={cloud.busy} onClick={() => void cloudStore.sync("auto")}>
                    <RefreshCw size={14} /> Synchroniser
                  </button>
                  <button type="button" className="account-button" disabled={cloud.busy} onClick={() => void cloudStore.sync("push")}>
                    <Upload size={14} /> Envoyer ma collection
                  </button>
                  <button
                    type="button"
                    className={`account-button ${confirmPull ? "danger" : ""}`}
                    disabled={cloud.busy}
                    onClick={() => {
                      if (!confirmPull) {
                        setConfirmPull(true);
                        return;
                      }
                      setConfirmPull(false);
                      void cloudStore.sync("pull");
                    }}
                  >
                    <Download size={14} />
                    {confirmPull ? "Confirmer : remplacer ma partie" : "Charger le cloud"}
                  </button>
                  <button type="button" className="account-button ghost" disabled={cloud.busy} onClick={() => void cloudStore.signOut()}>
                    <LogOut size={14} /> Déconnexion
                  </button>
                </div>
                <p className="account-hint">
                  L&apos;envoi est automatique ~20 s après ta dernière action. « Charger le cloud » remplace la partie de
                  cet appareil : à ne faire que si tu veux reprendre celle d&apos;un autre téléphone.
                </p>
              </section>
            ) : (
              <section className="account-card">
                <p className="account-intro">
                  Un compte sert à sauvegarder ta collection et à figurer au classement. La partie reste jouable sans
                  compte : tout est local, comme aujourd&apos;hui.
                </p>
                <label className="account-field">
                  <span>Adresse e-mail</span>
                  <input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="toi@exemple.fr"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </label>
                <button
                  type="button"
                  className="account-button wide"
                  disabled={cloud.busy || !email.includes("@")}
                  onClick={() => void cloudStore.requestCode(email.trim())}
                >
                  <Mail size={14} /> Recevoir un code
                </button>

                <label className="account-field">
                  <span>Code à 6 chiffres</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="123456"
                    maxLength={6}
                    value={code}
                    onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
                  />
                </label>
                <button
                  type="button"
                  className="account-button wide"
                  disabled={cloud.busy || code.length < 6}
                  onClick={() => void cloudStore.verifyCode(email.trim(), code)}
                >
                  <Check size={14} /> Valider le code
                </button>
                <p className="account-hint">
                  Aucun mot de passe : un code à usage unique part par e-mail (modèle Supabase « Magic Link » avec{" "}
                  <code>{"{{ .Token }}"}</code>).
                </p>
              </section>
            )}

            {message ? (
              <div className={`account-note ${cloud.isError ? "error" : "ok"}`}>
                {cloud.isError ? <AlertTriangle size={15} /> : <Info size={15} />}
                <span>{message}</span>
              </div>
            ) : null}

            {cloud.userId ? (
              <section className="account-card">
                <div className="account-head">
                  <Trophy size={15} />
                  <strong>Classement mondial</strong>
                  <button type="button" className="account-refresh" disabled={cloud.busy} onClick={() => void cloudStore.loadLeaderboard()}>
                    <RefreshCw size={13} />
                  </button>
                </div>
                <div className="studio-group" role="group" aria-label="Tri du classement">
                  {METRICS.map((metric) => (
                    <button
                      key={metric.id}
                      type="button"
                      className={`studio-chip ${cloud.leaderboardMetric === metric.id ? "active" : ""}`}
                      onClick={() => void cloudStore.loadLeaderboard(metric.id)}
                    >
                      {metric.label}
                    </button>
                  ))}
                </div>
                {cloud.leaderboard.length ? (
                  <ol className="leaderboard">
                    {cloud.leaderboard.map((row) => (
                      <li key={`${row.rank}-${row.userId}`} className={row.userId === cloud.userId ? "me" : ""}>
                        <b>{row.rank}</b>
                        <span className="leaderboard-name">
                          {row.displayName}
                          {row.userId === cloud.userId ? " (toi)" : ""}
                        </span>
                        <span className="leaderboard-value">
                          {cloud.leaderboardMetric === "total_cards"
                            ? `${row.totalCards} cartes`
                            : cloud.leaderboardMetric === "legendary_cards"
                              ? `${row.legendaryCards} légendaires`
                              : `${row.uniqueCreators} uniques`}
                        </span>
                        {row.rank === 1 ? <Crown size={13} className="leaderboard-crown" /> : null}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="account-hint">
                    {cloud.busy ? "Chargement…" : "Personne au classement pour l'instant : envoie ta collection pour ouvrir la voie."}
                  </p>
                )}
                <p className="account-hint">
                  Seules les collections cohérentes sont classées : le serveur recalcule tes statistiques depuis ta
                  sauvegarde et écarte ce qu&apos;aucune partie ne peut produire.
                </p>
              </section>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

/** Pastille d'état affichée dans le profil, sans ouvrir la feuille. */
export function CloudBadge() {
  const cloud = useCloud();
  if (!cloud.configured) return <CloudOff size={15} className="muted-icon" />;
  if (!cloud.userId) return <CloudOff size={15} className="muted-icon" />;
  return cloud.pending ? <Upload size={15} className="pending-icon" /> : <Check size={15} className="success-icon" />;
}
