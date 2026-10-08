"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Check,
  Download,
  Info,
  LogOut,
  Mail,
  KeyRound,
  Radio,
  RefreshCw,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";
import { useCloud } from "@/hooks/use-cloud";
import { useLive } from "@/hooks/use-live";
import { liveStore } from "@/lib/live-store";
import { useGame } from "@/hooks/use-game";
import { cloudStore } from "@/lib/cloud/cloud-store";
import { PASSWORD_MIN, PASSWORD_WARNING, emailProblem, passwordProblem } from "@/lib/cloud/credentials";
import { CLOUD_DISABLED_HINT } from "@/lib/cloud/config";
import { describeSync } from "@/lib/cloud/sync";
import { SavePanel } from "@/components/account/save-panel";
import { LeaderboardSection } from "@/components/account/leaderboard-section";
import { ShowcasePanel } from "@/components/account/showcase-panel";
import { SignInPanel } from "@/components/account/sign-in-panel";
import { TradesPanel } from "@/components/account/trades-panel";


/**
 * Ce que l'app sait du direct, en une phrase. Trois cas, et le troisième est
 * celui qui explique un badge absent alors que tout a l'air branché : la liste
 * est là, mais elle a plus de dix minutes — donc on ne montre rien.
 */
function describeLive(live: {
  count: number;
  refreshedAt: number | null;
  stale: boolean;
  loading: boolean;
}): string {
  if (live.loading) return "Lecture de la liste…";
  if (!live.refreshedAt) {
    return "Aucune donnée pour l'instant. La liste se remplit au premier rafraîchissement : si rien n'arrive, la fonction serveur n'est pas déployée ou ses secrets manquent.";
  }
  const minutes = Math.max(0, Math.round((Date.now() - live.refreshedAt) / 60_000));
  const age = minutes < 1 ? "à l'instant" : minutes < 60 ? `il y a ${minutes} min` : `il y a ${Math.round(minutes / 60)} h`;
  if (live.stale) {
    return `Liste vieille de plus de dix minutes (${age}) : elle n'est plus affichée sur les cartes. Dernier relevé : ${live.count} en direct.`;
  }
  return live.count
    ? `${live.count} créateur${live.count > 1 ? "s" : ""} en direct, relevé ${age}.`
    : `Personne du catalogue n'est en direct, relevé ${age}.`;
}

/**
 * Écran « Compte & cloud » : identification, synchronisation de la partie et
 * classement mondial.
 *
 * Deux façons d'avoir un compte, dans cet ordre :
 *  1. **compte invité** — un identifiant créé en un appui, sans e-mail, sans
 *     SMTP, donc utilisable tout de suite. En contrepartie il vit avec la
 *     session de l'appareil ;
 *  2. **adresse e-mail + code** — pour retrouver sa collection ailleurs, mais
 *     il faut un SMTP configuré côté Supabase (le service d'e-mail intégré est
 *     réservé aux tests).
 *
 * Rien n'est envoyé tant que le joueur n'a pas fait ce choix, et charger le
 * cloud demande deux appuis (le bouton se transforme en confirmation) : c'est
 * la seule action qui peut remplacer une partie locale.
 */
export function AccountSheet({
  onClose,
  focus,
}: {
  onClose: () => void;
  /** Section à amener sous les yeux à l'ouverture (« Classement » du profil). */
  focus?: "leaderboard" | null;
}) {
  const cloud = useCloud();
  const live = useLive();
  const state = useGame();
  const [confirmPull, setConfirmPull] = useState(false);
  // Brouillon du nom : `null` tant que le joueur n'a rien tapé, pour suivre la
  // valeur du serveur sans synchroniser un état par un effet.
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  // Compte : adresse à attacher (compte invité) et mot de passe.
  const [keepEmail, setKeepEmail] = useState("");
  const [keepPassword, setKeepPassword] = useState("");
  const [keepCode, setKeepCode] = useState("");

  // Le classement et le nom ne sont chargés qu'à l'ouverture, et seulement si
  // on est connecté : aucun appel réseau pour un joueur hors ligne.
  useEffect(() => {
    if (cloud.configured && cloud.userId) {
      void cloudStore.loadLeaderboard();
      void cloudStore.loadProfile();
      void cloudStore.loadTrades();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const message = cloud.configured ? cloud.message : null;
  const pendingName = (nameDraft ?? cloud.displayName ?? "").trim();

  return (
    <div className="odds-overlay" role="dialog" aria-modal="true" aria-label="Compte et cloud">
      <div className="odds-panel">
        <header className="odds-head">
          <div>
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
              <>
              <section className="account-card">
                <div className="account-who">
                  <span className="settings-icon accent">
                    <Mail size={16} />
                  </span>
                  <div>
                    <strong>{cloud.email ?? "Compte invité (sans e-mail)"}</strong>
                    <span>
                      Projet {cloud.project} ·{" "}
                      {describeSync({ action: cloud.decision ?? "noop", reason: "" }, cloud.remoteUpdatedAt)}
                    </span>
                  </div>
                  {cloud.pending ? (
                    <span className="account-badge">à envoyer</span>
                  ) : (
                    <Check size={17} className="success-icon" />
                  )}
                </div>

                <label className="account-field">
                  <span>Nom au classement</span>
                  <input
                    type="text"
                    maxLength={24}
                    placeholder="Ton pseudo"
                    value={nameDraft ?? cloud.displayName ?? ""}
                    onChange={(event) => setNameDraft(event.target.value)}
                  />
                </label>
                <div className="account-actions">
                  <button
                    type="button"
                    className="account-button"
                    disabled={cloud.busy || pendingName.length < 2 || pendingName === (cloud.displayName ?? "")}
                    onClick={() => {
                      void cloudStore.rename(pendingName).then((ok) => {
                        if (ok) setNameDraft(null);
                      });
                    }}
                  >
                    <Check size={14} /> Enregistrer le nom
                  </button>
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
                  <button
                    type="button"
                    className="account-button ghost"
                    disabled={cloud.busy}
                    onClick={() => {
                      // Le brouillon de la vitrine n'est pas à toucher ici : la
                      // déconnexion enlève `cloud.userId`, donc le panneau se
                      // démonte et son brouillon part avec lui.
                      setNameDraft(null);
                      void cloudStore.signOut();
                    }}
                  >
                    <LogOut size={14} /> Déconnexion
                  </button>
                </div>
                <p className="account-hint">
                  L&apos;envoi est automatique ~20 s après ta dernière action. « Charger le cloud » remplace la partie de
                  cet appareil : à ne faire que si tu veux reprendre celle d&apos;un autre téléphone.
                  {cloud.email
                    ? ""
                    : " Ce compte est invité : il est lié à la session de cet appareil tant qu'aucune adresse e-mail n'y est attachée."}
                </p>
              </section>

              {cloud.email === null ? (
                <section className="account-card">
                  <div className="account-head">
                    <ShieldCheck size={15} />
                    <strong>Garder ce compte</strong>
                  </div>
                  <p className="account-intro">
                    Ce compte est <b>invité</b> : il vit avec la session de cet appareil. Si tu la perds
                    (réinstallation, données effacées), la collection est perdue. Attache une adresse pour la
                    retrouver ailleurs. <b>Deux chemins</b> : avec un mot de passe, tout est immédiat et aucun
                    e-mail n&apos;est envoyé ; sans mot de passe, Supabase envoie un code à 6 chiffres (SMTP
                    nécessaire), à saisir juste après.
                  </p>
                  <label className="account-field">
                    <span>Adresse e-mail</span>
                    <input
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      placeholder="toi@exemple.fr"
                      value={keepEmail}
                      onChange={(event) => setKeepEmail(event.target.value)}
                    />
                  </label>
                  <label className="account-field">
                    <span>Mot de passe ({PASSWORD_MIN} caractères minimum, facultatif)</span>
                    <input
                      type="password"
                      autoComplete="new-password"
                      placeholder="Conseillé : sans envoi d'e-mail"
                      value={keepPassword}
                      onChange={(event) => setKeepPassword(event.target.value)}
                    />
                  </label>
                  {emailProblem(keepEmail) && keepEmail ? (
                    <p className="account-hint">{emailProblem(keepEmail)}</p>
                  ) : null}
                  {passwordProblem(keepPassword) && keepPassword ? (
                    <p className="account-hint">{passwordProblem(keepPassword)}</p>
                  ) : null}
                  <div className="account-actions">
                    <button
                      type="button"
                      className="account-button"
                      disabled={
                        cloud.busy ||
                        !keepEmail.trim() ||
                        Boolean(emailProblem(keepEmail)) ||
                        Boolean(keepPassword && passwordProblem(keepPassword))
                      }
                      onClick={() =>
                        void cloudStore
                          .keepAccount({ email: keepEmail, password: keepPassword || undefined })
                          .then((outcome) => {
                            if (outcome.status === "done") {
                              setKeepPassword("");
                              setKeepEmail("");
                            }
                          })
                      }
                    >
                      <ShieldCheck size={14} /> Attacher l&apos;adresse
                    </button>
                  </div>
                  {keepPassword ? (
                    <p className="account-hint">
                      {PASSWORD_WARNING} Le mot de passe n&apos;est envoyé nulle part : il reste dans Supabase, haché.
                    </p>
                  ) : (
                    <p className="account-hint">
                      Sans mot de passe, l&apos;adresse devra être confirmée par un code reçu par e-mail — donc un
                      SMTP configuré côté Supabase.
                    </p>
                  )}
                  {cloud.pendingEmail ? (
                    <div className="account-pending">
                      <label className="account-field">
                        <span>Code reçu à {cloud.pendingEmail}</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          maxLength={6}
                          placeholder="123456"
                          value={keepCode}
                          onChange={(event) => setKeepCode(event.target.value)}
                        />
                      </label>
                      <div className="account-actions">
                        <button
                          type="button"
                          className="account-button"
                          disabled={cloud.busy || !/^\d{6}$/.test(keepCode.replace(/\D/g, ""))}
                          onClick={() =>
                            void cloudStore.confirmEmailCode(keepCode).then((outcome) => {
                              if (outcome.status === "done") setKeepCode("");
                            })
                          }
                        >
                          <Check size={14} /> Confirmer l&apos;adresse
                        </button>
                        <button
                          type="button"
                          className="account-button ghost"
                          disabled={cloud.busy}
                          onClick={() => void cloudStore.resendEmailCode()}
                        >
                          <RefreshCw size={13} /> Renvoyer le code
                        </button>
                      </div>
                      <p className="account-hint">
                        Le code n&apos;arrive pas ? Le projet n&apos;a probablement pas de SMTP : ajoute un mot de
                        passe (il ne demande aucun envoi), ou désactive « Confirm email » pour que l&apos;adresse soit
                        enregistrée tout de suite.
                      </p>
                    </div>
                  ) : null}
                </section>
              ) : (
                <section className="account-card">
                  <details className="account-details">
                    <summary>
                      <KeyRound size={12} /> Définir ou changer mon mot de passe
                    </summary>
                    <p className="account-hint">
                      Utile pour te connecter ailleurs sans attendre un code par e-mail (qui, lui, exige un SMTP).
                    </p>
                    <label className="account-field">
                      <span>Nouveau mot de passe ({PASSWORD_MIN} caractères minimum)</span>
                      <input
                        type="password"
                        autoComplete="new-password"
                        placeholder="Mot de passe"
                        value={keepPassword}
                        onChange={(event) => setKeepPassword(event.target.value)}
                      />
                    </label>
                    {passwordProblem(keepPassword) && keepPassword ? (
                      <p className="account-hint">{passwordProblem(keepPassword)}</p>
                    ) : null}
                    <div className="account-actions">
                      <button
                        type="button"
                        className="account-button"
                        disabled={cloud.busy || Boolean(passwordProblem(keepPassword))}
                        onClick={() =>
                          void cloudStore.keepAccount({ password: keepPassword }).then((outcome) => {
                            if (outcome.status === "done") setKeepPassword("");
                          })
                        }
                      >
                        <KeyRound size={14} /> Enregistrer le mot de passe
                      </button>
                    </div>
                    <p className="account-hint">{PASSWORD_WARNING}</p>
                  </details>
                </section>
              )}
              </>
            ) : (
              <SignInPanel />
            )}

            {/* La sauvegarde locale vit dans Compte : c'est là qu'on vient
                chercher « où est ma partie », et les deux gestes qui la
                déplacent (copier, coller). */}
            <SavePanel />

            {/* Diagnostic : sur un téléphone, « Réseau injoignable » ne dit pas
                si le réseau, l'adresse ou le WebView est en cause. Ce bouton
                teste le projet en lecture seule et affiche l'hôte joint. */}
            <div className="account-actions">
              <button
                type="button"
                className="account-button ghost"
                disabled={cloud.busy}
                onClick={() => void cloudStore.ping()}
              >
                <RefreshCw size={14} /> Tester la connexion au cloud
              </button>
            </div>

            {/*
              * L'état du direct, sur la même ligne que le diagnostic : c'est la
              * seule question qu'on se pose quand le badge n'apparaît pas —
              * « est-ce que l'app sait qui streame, ou est-ce que personne ne
              * streame ? ». La réponse est dans le nombre et dans son âge.
              */}
            {cloud.configured ? (
              <section className="account-card">
                <div className="account-head">
                  <Radio size={15} />
                  <strong>Direct</strong>
                </div>
                <p className="account-hint">{describeLive(live)}</p>
                {live.error ? <p className="account-hint">{live.error}</p> : null}
                <div className="account-actions">
                  <button
                    type="button"
                    className="account-button ghost"
                    disabled={live.loading}
                    onClick={() => void liveStore.refresh({ force: true })}
                  >
                    <RefreshCw size={14} /> {live.loading ? "Lecture…" : "Rafraîchir la liste"}
                  </button>
                </div>
              </section>
            ) : null}

            {message ? (
              <div className={`account-note ${cloud.isError ? "error" : "ok"}`}>
                {cloud.isError ? <AlertTriangle size={15} /> : <Info size={15} />}
                <span>{message}</span>
              </div>
            ) : null}

            {cloud.userId ? <ShowcasePanel /> : null}

            {cloud.userId ? (
              <section className="account-card">
                <TradesPanel />
              </section>
            ) : null}

            {cloud.userId ? <LeaderboardSection focus={focus} /> : null}
          </>
        )}
      </div>
    </div>
  );
}
