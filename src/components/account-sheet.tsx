"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Check,
  Download,
  Info,
  KeyRound,
  LogOut,
  Radio,
  RefreshCw,
  ShieldCheck,
  Upload,
  UserRound,
  X,
} from "lucide-react";
import { useCloud } from "@/hooks/use-cloud";
import { useLive } from "@/hooks/use-live";
import { liveStore } from "@/lib/live-store";
import { useGame } from "@/hooks/use-game";
import { cloudStore } from "@/lib/cloud/cloud-store";
import { PASSWORD_MIN, PASSWORD_WARNING, emailProblem, passwordProblem } from "@/lib/cloud/credentials";
import { CLOUD_DISABLED_HINT } from "@/lib/cloud/config";
import { masquerEmail, type AccountFocus } from "@/lib/account-display";
import { SyncBadge } from "@/components/account/sync-badge";
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
    return "Aucune donnée pour l'instant. La liste se remplit au premier rafraîchissement ; si rien ne change, personne n'est encore joignable.";
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
 * Écran « Mon compte » : trois blocs, dans cet ordre de lecture.
 *
 *  1. **ton compte** — qui tu es, le nom au classement, et la pastille verte de
 *     sauvegarde. La synchronisation ne se pilote plus à la main : elle a lieu
 *     en tâche de fond, et il n'y a rien à décider ;
 *  2. **ton profil public** — pseudo, vitrine, échanges : ce que les autres
 *     voient ;
 *  3. **ton compte, pour de vrai** — garder l'accès (adresse, mot de passe) et
 *     se déconnecter.
 *
 * Le mélange des deux derniers blocs était le vrai défaut de cet écran : on y
 * réglait sa vitrine au milieu des boutons d'infrastructure. Ils sont
 * maintenant séparés, et l'infrastructure a disparu.
 *
 * Deux façons d'avoir un compte : un **compte invité** (un appui, sans adresse,
 * utilisable tout de suite) ou une **adresse e-mail** avec mot de passe, ou,
 * à défaut, un code de confirmation.
 */
export function AccountSheet({
  onClose,
  focus,
}: {
  onClose: () => void;
  /** Section à amener sous les yeux à l'ouverture (« Classement » du profil). */
  focus?: AccountFocus;
}) {
  const cloud = useCloud();
  const live = useLive();
  const state = useGame();
  // Le seul geste qui remplace une partie : il demande deux appuis (le bouton
  // se transforme en confirmation). Le jeu ne décide pas à la place du joueur
  // laquelle des deux parties est la bonne.
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
    <div className="odds-overlay" role="dialog" aria-modal="true" aria-label="Mon compte">
      <div className="odds-panel">
        <header className="odds-head">
          <div>
            <h2>Mon compte</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer">
            <X size={18} />
          </button>
        </header>

        {!cloud.configured ? (
          <div className="account-note neutral">
            <Info size={15} />
            <div>
              <strong>Joue pour toi, sur cet appareil</strong>
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
                    <UserRound size={16} />
                  </span>
                  <div>
                    <strong>{cloud.displayName?.trim() || (cloud.email ? "Compte lié" : "Compte invité")}</strong>
                    <span>
                      {cloud.email ? masquerEmail(cloud.email) : "Sans adresse : ce compte vit sur cet appareil"}
                    </span>
                  </div>
                  <span className="account-badge">compte lié</span>
                </div>
                <SyncBadge detail />

                <p className="account-hint">
                  {cloud.email
                    ? "Ta partie suit ce compte : tu la retrouves sur n'importe quel téléphone."
                    : "Ce compte est invité : l'enregistrement en ligne suit cet appareil. Attache une adresse pour le retrouver ailleurs."}
                </p>
              </section>

              </>
            ) : (
              <SignInPanel />
            )}

            {/* Rien de la mécanique ici : ni bouton d'envoi, ni d'adresse à
                copier. L'enregistrement se fait en tâche de fond, et la seule
                chose qui se lit est la pastille de la carte du haut. */}

            {/*
              * Le seul moment où le joueur a une décision à prendre sur sa
              * partie. Le serveur n'applique jamais une partie distante tout
              * seul (ce serait effacer sans le dire) — et l'écran, lui, ne
              * demande pas au joueur d'écrire « push » ou « pull » : il lui
              * montre deux parties et deux phrases.
              *
              * C'est ce bloc qui remplace « Charger le cloud » et « Envoyer ma
              * collection » : les mêmes gestes, mais seulement quand ils
              * servent, et dits comme des choix.
              */}
            {cloud.userId && (cloud.decision === "pull" || cloud.decision === "conflict") ? (
              <section className="account-card account-choice">
                <div className="account-head">
                  <AlertTriangle size={15} />
                  <strong>Deux parties t&apos;attendent</strong>
                </div>
                <p className="account-hint">
                  Celle de cet appareil et celle gardée en ligne ne racontent pas la même progression.
                  Choisis celle que tu gardes : c&apos;est la seule fois où le jeu te le demande.
                </p>
                <div className="account-actions">
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
                    {confirmPull ? "Confirmer : remplacer ma partie" : "Reprendre la partie en ligne"}
                  </button>
                  <button
                    type="button"
                    className="account-button ghost"
                    disabled={cloud.busy}
                    onClick={() => void cloudStore.sync("push")}
                  >
                    <Upload size={14} /> Garder celle de cet appareil
                  </button>
                </div>
              </section>
            ) : null}

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

            {/* Ce que les autres voient de toi : pseudo, vitrine, échanges.
                C'est le profil public, pas un réglage de compte — d'où son
                titre, et son ordre : il vient après « qui je suis ». */}
            {cloud.userId ? (
              <>
              <section className="menu-group" aria-label="Profil public">
                <h2>Profil public</h2>
              </section>
              {/*
               * Le pseudo est une affaire **publique** : c'est le nom que les
               * autres lisent au classement et sur la fiche. Il vivait dans la
               * carte d'identité, au-dessus de la vitrine et des échanges —
               * c'est-à-dire à l'endroit qui n'était pas le sien.
               */}
              <section className="account-card">
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
              </section>
              </>
            ) : null}
            {cloud.userId ? <LeaderboardSection focus={focus} /> : null}
            {cloud.userId ? <ShowcasePanel /> : null}
            {cloud.userId ? (
              <section className="account-card">
                {/* Le carnet peut viser cette section : la feuille le dit au
                    panneau, qui s'ouvre et se met sous les yeux. */}
                <TradesPanel focus={focus} />
              </section>
            ) : null}

            {/* Les réglages du compte : ce qui touche à l'accès, pas au jeu.
                Ils sont rangés en bas, une fois le reste lu — et la déconnexion
                ferme la marche, comme elle ferme la session. */}
            {cloud.userId ? (
              <section className="menu-group" aria-label="Réglages du compte">
                <h2>Réglages du compte</h2>
              </section>
            ) : null}
            {/*
              * Garder l'accès, et le perdre : les deux gestes du compte. Le
              * bloc « Garder ce compte » (adresse à attacher) et le changement
              * de mot de passe vivaient au milieu de l'écran, entre la vitrine
              * et les échanges — au-dessus de ce qu'ils n'ont rien à voir.
              */}
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
                    e-mail n&apos;est envoyé ; sans mot de passe, un code à 6 chiffres arrive par e-mail, à
                    saisir juste après.
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
                      {PASSWORD_WARNING} Le mot de passe n&apos;est envoyé nulle part : il reste dans ton compte en ligne, illisible.
                    </p>
                  ) : (
                    <p className="account-hint">
                      Sans mot de passe, l&apos;adresse devra être confirmée par un code reçu par e-mail.
                    </p>
                  )}
                  {cloud.pendingEmail ? (
                    <div className="account-pending">
                      <label className="account-field">
                        {/* L'adresse reste reconnaissable, jamais lisible : c'est la même
                            règle que sur la carte d'identité. */}
                        <span>Code reçu à {masquerEmail(cloud.pendingEmail)}</span>
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
                        Le code n&apos;arrive pas ? Choisis plutôt un mot de passe (il ne demande aucun envoi) : ton
                        adresse sera reconnue tout de suite.
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
                      Utile pour te connecter ailleurs sans attendre un code par e-mail.
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
            {cloud.userId ? (
              <div className="account-actions">
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
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
