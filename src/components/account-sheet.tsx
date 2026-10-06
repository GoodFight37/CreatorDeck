"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import Image from "next/image";
import {
  AlertTriangle,
  ArrowLeftRight,
  Check,
  ClipboardCopy,
  ClipboardPaste,
  CloudOff,
  Crown,
  Download,
  Info,
  LogOut,
  Mail,
  Plus,
  KeyRound,
  Radio,
  RefreshCw,
  Search,
  ShieldCheck,
  Star,
  Trophy,
  Upload,
  UserPlus,
  UserSearch,
  X,
} from "lucide-react";
import { useCloud } from "@/hooks/use-cloud";
import { useLive } from "@/hooks/use-live";
import { liveStore } from "@/lib/live-store";
import { useGame } from "@/hooks/use-game";
import { cloudStore, type LeaderboardMetric } from "@/lib/cloud/cloud-store";
import type { PlayerSearchResult, TradeCard, TradeStatus } from "@/lib/cloud/api";
import { describeCards } from "@/lib/cloud/trades";
import { PASSWORD_MIN, PASSWORD_WARNING, emailProblem, passwordProblem } from "@/lib/cloud/credentials";
import { CLOUD_DISABLED_HINT } from "@/lib/cloud/config";
import { MAX_SHOWCASE, knownShowcase, ownedCreatorSlugs, toggleShowcase } from "@/lib/cloud/showcase";
import { describeSync } from "@/lib/cloud/sync";
import { CREATORS, CREATOR_BY_SLUG, VARIANT_META, creatorImage, RARITY_META, type CardVariant } from "@/lib/catalog";
import { ShowcaseCard } from "@/components/showcase-card";
import { gameStore } from "@/lib/game-store";

const METRICS: { id: LeaderboardMetric; label: string }[] = [
  { id: "unique_creators", label: "Cartes uniques" },
  { id: "total_cards", label: "Cartes" },
  { id: "legendary_cards", label: "Légendaires" },
  { id: "gold_cards", label: "Gold" },
];

const PICKER_LIMIT = 60;

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
  const [email, setEmail] = useState(cloud.email ?? "");
  const [code, setCode] = useState("");
  const [confirmPull, setConfirmPull] = useState(false);
  // Brouillon du nom : `null` tant que le joueur n'a rien tapé, pour suivre la
  // valeur du serveur sans synchroniser un état par un effet.
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [showcaseDraft, setShowcaseDraft] = useState<string[] | null>(null);
  const [query, setQuery] = useState("");
  // Compte : adresse à attacher (compte invité) et mot de passe.
  const [keepEmail, setKeepEmail] = useState("");
  const [keepPassword, setKeepPassword] = useState("");
  const [keepCode, setKeepCode] = useState("");
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  // Sauvegarde locale : copie, import, et le retour à afficher.
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveText, setSaveText] = useState("");
  const [saveNote, setSaveNote] = useState<string | null>(null);
  const [manualCopy, setManualCopy] = useState<string | null>(null);
  const owned = useMemo(() => ownedCreatorSlugs(state?.cards ?? []), [state]);
  const pinned = knownShowcase(cloud.showcase);
  const selection = showcaseDraft ?? pinned;
  const results = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("fr");
    return owned
      .filter((slug) => {
        const creator = CREATOR_BY_SLUG.get(slug);
        if (!creator) return false;
        if (!needle) return true;
        return `${slug} ${creator.displayName} ${creator.login}`.toLocaleLowerCase("fr").includes(needle);
      })
      .slice(0, PICKER_LIMIT);
  }, [owned, query]);
  const showcaseChanged =
    selection.length !== pinned.length || selection.some((slug, index) => slug !== pinned[index]);

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

  // Raccourci « Classement mondial » de l'onglet Profil : la feuille s'ouvre
  // déjà défilée sur le classement, au lieu de laisser le joueur chercher.
  const leaderboardRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (focus === "leaderboard") leaderboardRef.current?.scrollIntoView({ block: "start" });
  }, [focus]);

  async function copySave() {
    const json = gameStore.exportSave();
    try {
      await navigator.clipboard.writeText(json);
      setManualCopy(null);
      setSaveNote("Sauvegarde copiée dans le presse-papiers.");
    } catch {
      // Presse-papiers indisponible (permission, WebView ancienne) : le texte
      // s'affiche pour une copie à la main.
      setManualCopy(json);
      setSaveNote(null);
    }
  }

  function importSave() {
    try {
      gameStore.importSave(saveText);
      setSaveText("");
      setSaveOpen(false);
      setSaveNote("Sauvegarde importée. Bon retour dans ton classeur !");
    } catch (caught) {
      setSaveNote(caught instanceof Error ? caught.message : "Import impossible.");
    }
  }

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
                      setNameDraft(null);
                      setShowcaseDraft(null);
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
              <section className="account-card">
                <p className="account-intro">
                  Un compte sert à sauvegarder ta collection et à figurer au classement. La partie reste jouable sans
                  compte : tout est local, comme aujourd&apos;hui.
                </p>
                <button type="button" className="account-button wide" disabled={cloud.busy} onClick={() => void cloudStore.signInAsGuest()}>
                  <UserPlus size={14} /> Créer un compte invité (sans e-mail)
                </button>
                <p className="account-hint">
                  Le plus rapide : aucun e-mail, aucun SMTP, aucun domaine. Le compte vit avec la session de cet
                  appareil — une fois créé, attache-lui une adresse et un mot de passe (« Garder ce compte ») pour
                  pouvoir le retrouver ailleurs, sans SMTP.
                </p>

                <details className="account-details">
                  <summary>
                    <KeyRound size={12} /> Se connecter avec un e-mail et un mot de passe
                  </summary>
                  <p className="account-hint">
                    Le chemin pour retrouver une collection sur un autre appareil : <b>aucun e-mail n&apos;est
                    envoyé</b>, donc aucun SMTP n&apos;est nécessaire. Il faut que le mot de passe ait été attaché au
                    compte depuis l&apos;appareil d&apos;origine (Compte → « Garder ce compte »).
                  </p>
                  <label className="account-field">
                    <span>Adresse e-mail</span>
                    <input
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      placeholder="toi@exemple.fr"
                      value={signInEmail}
                      onChange={(event) => setSignInEmail(event.target.value)}
                    />
                  </label>
                  <label className="account-field">
                    <span>Mot de passe</span>
                    <input
                      type="password"
                      autoComplete="current-password"
                      placeholder="Ton mot de passe"
                      value={signInPassword}
                      onChange={(event) => setSignInPassword(event.target.value)}
                    />
                  </label>
                  <div className="account-actions">
                    <button
                      type="button"
                      className="account-button wide"
                      disabled={cloud.busy || Boolean(emailProblem(signInEmail)) || !signInPassword}
                      onClick={() =>
                        void cloudStore.signInWithPassword(signInEmail, signInPassword).then((ok) => {
                          if (ok) {
                            setSignInPassword("");
                            setSignInEmail("");
                          }
                        })
                      }
                    >
                      <KeyRound size={14} /> Se connecter
                    </button>
                  </div>
                </details>

                <details className="account-details">
                  <summary>Ou se connecter par e-mail (nécessite un SMTP)</summary>
                  <p className="account-hint">
                    Supabase n&apos;envoie des e-mails qu&apos;à l&apos;équipe du projet par défaut : configure
                    Authentication → Emails (Brevo, Resend… sont gratuits) pour utiliser cette voie.
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
                </details>
              </section>
            )}

            {/*
              * La sauvegarde locale vit dans Compte : c'est là qu'on vient
              * chercher « où est ma partie », et les deux gestes qui la
              * déplacent (copier, coller).
              */}
            <section className="account-card">
              <div className="account-head">
                <ClipboardCopy size={15} />
                <strong>Sauvegarde de cet appareil</strong>
              </div>
              <p className="account-intro">
                La partie vit sur ce téléphone. Copie-la pour la garder au chaud ou la passer sur un autre
                appareil — un compte la transporte tout seul, une copie te laisse la main.
              </p>
              <div className="account-actions">
                <button type="button" className="account-button" onClick={() => void copySave()}>
                  <ClipboardCopy size={14} /> Copier ma sauvegarde
                </button>
                <button
                  type="button"
                  className="account-button ghost"
                  aria-expanded={saveOpen}
                  onClick={() => setSaveOpen((open) => !open)}
                >
                  <ClipboardPaste size={14} /> Importer une sauvegarde
                </button>
              </div>
              {saveOpen ? (
                <div className="save-editor">
                  <textarea
                    value={saveText}
                    onChange={(event) => setSaveText(event.target.value)}
                    placeholder='{ "version": 1, "playerId": "…" }'
                    aria-label="Sauvegarde à importer"
                    rows={5}
                    spellCheck={false}
                  />
                  <button
                    type="button"
                    className="account-button wide"
                    onClick={importSave}
                    disabled={!saveText.trim()}
                  >
                    <ClipboardPaste size={14} /> Remplacer ma progression par cette sauvegarde
                  </button>
                </div>
              ) : null}
              {manualCopy ? (
                <div className="save-editor">
                  <p className="account-hint">Copie manuelle : sélectionne tout le texte ci-dessous.</p>
                  <textarea
                    value={manualCopy}
                    readOnly
                    rows={5}
                    aria-label="Sauvegarde exportée"
                    onFocus={(event) => event.currentTarget.select()}
                  />
                </div>
              ) : null}
              {saveNote ? <p className="account-hint">{saveNote}</p> : null}
            </section>

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

            {cloud.userId ? (
              <section className="account-card">
                <div className="account-head">
                  <Star size={15} />
                  <strong>Ma vitrine</strong>
                  <span className="account-count">{pinned.length}/{MAX_SHOWCASE}</span>
                </div>
                {pinned.length ? (
                  <div className="showcase-grid">
                    {pinned.map((slug) => <ShowcaseCard key={slug} slug={slug} />)}
                  </div>
                ) : (
                  <p className="account-hint">Aucune carte épinglée. Choisis-en jusqu&apos;à {MAX_SHOWCASE} parmi les créateurs que tu possèdes.</p>
                )}

                <details className="account-details">
                  <summary>{pinned.length ? "Changer ma vitrine" : "Choisir mes cartes"}</summary>
                  <p className="account-hint">
                    Tu possèdes {owned.length} créateur{owned.length === 1 ? "" : "s"} distinct{owned.length === 1 ? "" : "s"}. Épingle jusqu&apos;à {MAX_SHOWCASE} cartes sur ton profil public.
                  </p>
                  <div className="showcase-picked" role="group" aria-label="Emplacements de la vitrine">
                    {Array.from({ length: MAX_SHOWCASE }, (_, index) => {
                      const slug = selection[index];
                      if (slug) {
                        const creator = CREATOR_BY_SLUG.get(slug);
                        return (
                          <div className="showcase-slot filled" key={`filled-${slug}`}>
                            <ShowcaseCard slug={slug} small />
                            <button
                              type="button"
                              className="showcase-remove"
                              aria-label={`Retirer ${creator?.displayName ?? slug} de la vitrine`}
                              title="Retirer cette carte"
                              disabled={cloud.busy}
                              onClick={() => setShowcaseDraft(selection.filter((_, selectedIndex) => selectedIndex !== index))}
                            >
                              <X size={10} />
                            </button>
                          </div>
                        );
                      }
                      return (
                        <span className="showcase-slot vide" key={`empty-${index}`} aria-label={`Emplacement libre ${index + 1}`}>
                          <Plus size={14} />
                        </span>
                      );
                    })}
                  </div>

                  <label className="account-field">
                    <span><Search size={10} /> Rechercher un créateur possédé</span>
                    <input
                      type="search"
                      placeholder="Nom, identifiant…"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                    />
                  </label>
                  <div className="showcase-picker" role="group" aria-label="Créateurs possédés">
                    {results.map((slug) => {
                      const creator = CREATOR_BY_SLUG.get(slug);
                      if (!creator) return null;
                      const selectedIndex = selection.indexOf(slug);
                      const selected = selectedIndex >= 0;
                      return (
                        <button
                          type="button"
                          key={slug}
                          className={`showcase-choice${selected ? " on" : ""}`}
                          aria-pressed={selected}
                          disabled={cloud.busy || (!selected && selection.length >= MAX_SHOWCASE)}
                          onClick={() => setShowcaseDraft(toggleShowcase(selection, slug))}
                        >
                          <Image src={creatorImage(creator)} width={36} height={36} alt="" unoptimized />
                          <span>{creator.displayName}</span>
                          {selected ? <b aria-label={`Position ${selectedIndex + 1}`}>{selectedIndex + 1}</b> : null}
                        </button>
                      );
                    })}
                    {!results.length ? (
                      <p className="account-hint">
                        {owned.length ? "Aucun créateur ne correspond à cette recherche." : "Tu ne possèdes encore aucun créateur à épingler."}
                      </p>
                    ) : null}
                    {results.length === PICKER_LIMIT && owned.length > PICKER_LIMIT ? (
                      <p className="account-hint">Affichage limité aux {PICKER_LIMIT} premiers résultats. Affine ta recherche pour trouver une autre carte.</p>
                    ) : null}
                  </div>
                  <div className="account-actions">
                    <button
                      type="button"
                      className="account-button"
                      disabled={cloud.busy || !showcaseChanged}
                      onClick={() => {
                        void cloudStore.setShowcase(selection).then((ok) => {
                          if (ok) {
                            setShowcaseDraft(null);
                            setQuery("");
                          }
                        });
                      }}
                    >
                      <Check size={14} /> Enregistrer la vitrine
                    </button>
                    <button
                      type="button"
                      className="account-button ghost"
                      disabled={cloud.busy}
                      onClick={() => {
                        setShowcaseDraft(null);
                        setQuery("");
                      }}
                    >
                      Annuler
                    </button>
                  </div>
                </details>
              </section>
            ) : null}

            {cloud.userId ? (
              <section className="account-card">
                <TradesPanel />
              </section>
            ) : null}

            {cloud.userId ? (
              <section className="account-card" id="classement" ref={leaderboardRef}>
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
                        <button
                          type="button"
                          className="leaderboard-row"
                          onClick={() => void cloudStore.openProfile(row.userId)}
                        >
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
                                : cloud.leaderboardMetric === "gold_cards"
                                  ? `${row.goldCards} Gold`
                                  : `${Math.round(row.completion * 1000) / 10} % du catalogue`}
                          </span>
                          {row.rank === 1 ? <Crown size={13} className="leaderboard-crown" /> : null}
                        </button>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="account-hint">
                    {cloud.busy ? "Chargement…" : "Personne au classement pour l'instant : envoie ta collection pour ouvrir la voie."}
                  </p>
                )}
                <p className="account-hint">
                  Touche une ligne pour ouvrir la fiche publique du joueur : vitrine, complétion du catalogue,
                  répartition par rareté, rang — et une affiche à partager. Le serveur recalcule les statistiques
                  depuis chaque sauvegarde et écarte ce qu&apos;aucune partie ne peut produire.
                </p>
              </section>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}


const TRADE_QUERY_MIN = 2;
const TRADE_PICK_LIMIT = 5;
const TRADE_RESULT_LIMIT = 8;

const TRADE_STATUS_LABEL: Record<TradeStatus, string> = {
  open: "en attente",
  accepted: "accepté",
  declined: "refusé",
  cancelled: "annulé",
};

/** Une carte d'échange, écrite comme dans le classeur : nom puis variante. */
function TradeCardTag({ card }: { card: TradeCard }) {
  const creator = CREATOR_BY_SLUG.get(card.creatorSlug);
  const rarity = creator ? RARITY_META[creator.rarity] : null;
  const style = rarity
    ? ({ "--rarity": rarity.color, "--rarity-glow": rarity.glow } as CSSProperties)
    : undefined;
  return (
    <span className="trade-card" style={style}>
      <b>{creator?.displayName ?? card.creatorSlug}</b>
      <em>{VARIANT_META[card.variant as CardVariant]?.label ?? card.variant}</em>
    </span>
  );
}

/**
 * Échanges entre joueurs.
 *
 * Le serveur arbitre tout : il relit les deux collections avant de déplacer
 * une carte, dans une seule transaction. Ici on ne fait que composer l'offre
 * (une carte contre une carte, jusqu'à cinq de chaque côté) et afficher les
 * réponses.
 *
 * Deux cartes ne s'échangent pas à l'aveugle : demander la variante Gold d'un
 * créateur que le partenaire n'a qu'en Standard ne peut pas aboutir. Le serveur
 * répond donc, créateur par créateur, quelles variantes le partenaire possède
 * — jamais sa collection entière.
 */
function TradesPanel() {
  const cloud = useCloud();
  const state = useGame();
  const [playerQuery, setPlayerQuery] = useState("");
  const [players, setPlayers] = useState<PlayerSearchResult[]>([]);
  const [searchMessage, setSearchMessage] = useState<string | null>(null);
  const [partner, setPartner] = useState<PlayerSearchResult | null>(null);
  const [given, setGiven] = useState<string[]>([]);
  const [wanted, setWanted] = useState<string[]>([]);
  const [givenQuery, setGivenQuery] = useState("");
  const [wantedQuery, setWantedQuery] = useState("");
  const [variants, setVariants] = useState<Record<string, string[]>>({});
  const [loadingSlug, setLoadingSlug] = useState<string | null>(null);

  // Mes cartes, une entrée par couple créateur + variante : la même carte en
  // double ne se propose pas deux fois dans une offre (le serveur la refuse).
  const myCards = useMemo(() => {
    const seen = new Set<string>();
    const list: { key: string; creatorSlug: string; variant: CardVariant }[] = [];
    for (const card of state?.cards ?? []) {
      const key = `${card.creatorSlug}|${card.variant}`;
      if (seen.has(key)) continue;
      seen.add(key);
      list.push({ key, creatorSlug: card.creatorSlug, variant: card.variant });
    }
    return list;
  }, [state]);

  const givenResults = useMemo(() => {
    const needle = givenQuery.trim().toLocaleLowerCase("fr");
    return myCards
      .filter((card) => {
        if (!needle) return true;
        const creator = CREATOR_BY_SLUG.get(card.creatorSlug);
        return `${card.creatorSlug} ${creator?.displayName ?? ""} ${creator?.login ?? ""}`
          .toLocaleLowerCase("fr")
          .includes(needle);
      })
      .slice(0, 24);
  }, [myCards, givenQuery]);

  // Catalogue entier : on peut demander un créateur qu'on ne possède pas encore.
  const wantedResults = useMemo(() => {
    const needle = wantedQuery.trim().toLocaleLowerCase("fr");
    if (needle.length < TRADE_QUERY_MIN) return [];
    return CREATORS.filter((creator) =>
      `${creator.slug} ${creator.displayName} ${creator.login}`.toLocaleLowerCase("fr").includes(needle),
    ).slice(0, TRADE_RESULT_LIMIT);
  }, [wantedQuery]);

  function toggle(list: string[], key: string, setList: (next: string[]) => void) {
    if (list.includes(key)) setList(list.filter((item) => item !== key));
    else if (list.length < TRADE_PICK_LIMIT) setList([...list, key]);
  }

  /** Charge (une fois) les variantes possédées par le partenaire pour un créateur. */
  function loadVariants(slug: string) {
    if (!partner || variants[slug] || loadingSlug) return;
    setLoadingSlug(slug);
    void cloudStore
      .playerVariants(partner.userId, slug)
      .then((result) => {
        setVariants((current) => ({ ...current, [slug]: result.variants }));
        if (result.message) setSearchMessage(result.message);
      })
      .finally(() => setLoadingSlug(null));
  }

  const ready = Boolean(partner) && given.length > 0 && wanted.length > 0;

  function propose() {
    if (!partner) return;
    void cloudStore
      .proposeTrade(
        partner.userId,
        given.map((key) => {
          const [creatorSlug, variant] = key.split("|");
          return { creatorSlug, variant };
        }),
        wanted.map((key) => {
          const [creatorSlug, variant] = key.split("|");
          return { creatorSlug, variant };
        }),
      )
      .then((outcome) => {
        if (outcome.status === "done") {
          setGiven([]);
          setWanted([]);
        }
      });
  }

  const open = cloud.trades.filter((trade) => trade.status === "open");
  const resolved = cloud.trades.filter((trade) => trade.status !== "open").slice(0, 5);
  const names = useMemo(() => new Map([...CREATOR_BY_SLUG].map(([slug, creator]) => [slug, creator.displayName])), []);

  return (
    <details className="account-details trade-details">
      <summary>
        <ArrowLeftRight size={12} /> Échanges
        {open.length ? <span className="account-count">{open.length}</span> : null}
      </summary>
      <p className="account-hint">
        Le serveur relit les deux collections puis déplace les cartes des deux côtés dans la même transaction : une
        offre acceptée ne peut ni voler ni dupliquer une carte. Les points, l&apos;XP et les boosters ne bougent pas —
        seules les cartes changent de main.
      </p>

      <div className="account-actions">
        <button type="button" className="account-button ghost" disabled={cloud.busy} onClick={() => void cloudStore.loadTrades()}>
          <RefreshCw size={13} /> Actualiser mes offres
        </button>
      </div>

      <div className="trade-offers">
        {open.length ? (
          open.map((trade) => (
            <div className="trade-offer" key={trade.id}>
              <div className="trade-offer-head">
                <b>
                  {trade.direction === "in" ? `${trade.partnerName} te propose` : `Tu proposes à ${trade.partnerName}`}
                </b>
              </div>
              <div className="trade-pair">
                <span className="trade-side">
                  <em>Tu donnes</em>
                  {trade.given.map((card, index) => (
                    <TradeCardTag card={card} key={`${trade.id}-given-${index}`} />
                  ))}
                </span>
                <ArrowLeftRight size={14} />
                <span className="trade-side">
                  <em>Tu reçois</em>
                  {trade.received.map((card, index) => (
                    <TradeCardTag card={card} key={`${trade.id}-received-${index}`} />
                  ))}
                </span>
              </div>
              <div className="account-actions">
                {trade.direction === "in" ? (
                  <>
                    <button
                      type="button"
                      className="account-button"
                      disabled={cloud.busy}
                      onClick={() => void cloudStore.respondTrade(trade.id, true)}
                    >
                      <Check size={13} /> Accepter
                    </button>
                    <button
                      type="button"
                      className="account-button ghost"
                      disabled={cloud.busy}
                      onClick={() => void cloudStore.respondTrade(trade.id, false)}
                    >
                      <X size={13} /> Refuser
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="account-button ghost"
                    disabled={cloud.busy}
                    onClick={() => void cloudStore.cancelTrade(trade.id)}
                  >
                    <X size={13} /> Annuler l&apos;offre
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <p className="account-hint">Aucune offre en attente.</p>
        )}

        {resolved.length ? (
          <ul className="trade-history">
            {resolved.map((trade) => (
              <li key={trade.id}>
                <b>{trade.direction === "in" ? trade.partnerName : `Toi → ${trade.partnerName}`}</b>
                <span>
                  {describeCards(trade.given, names)} contre {describeCards(trade.received, names)}
                </span>
                <em className={`trade-status ${trade.status}`}>{TRADE_STATUS_LABEL[trade.status]}</em>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="trade-builder">
        <label className="account-field">
          <span>
            <UserSearch size={10} /> Chercher un joueur (pseudo, 2 lettres minimum)
          </span>
          <div className="trade-search">
            <input
              type="search"
              placeholder="Pseudo au classement"
              value={playerQuery}
              onChange={(event) => setPlayerQuery(event.target.value)}
            />
            <button
              type="button"
              className="account-button"
              disabled={cloud.busy || playerQuery.trim().length < TRADE_QUERY_MIN}
              onClick={() =>
                void cloudStore.searchPlayers(playerQuery.trim()).then((result) => {
                  setPlayers(result.players);
                  setSearchMessage(result.message);
                })
              }
            >
              <Search size={13} /> Chercher
            </button>
          </div>
        </label>
        {players.length ? (
          <div className="trade-players">
            {players.map((player) => (
              <button
                type="button"
                key={player.userId}
                className={`trade-player${partner?.userId === player.userId ? " on" : ""}`}
                aria-pressed={partner?.userId === player.userId}
                onClick={() => {
                  setPartner(player);
                  setVariants({});
                  setWanted([]);
                }}
              >
                <b>{player.displayName}</b>
                <span>
                  niveau {player.level} · {player.uniqueCreators} créateurs
                </span>
              </button>
            ))}
          </div>
        ) : null}
        {searchMessage ? <p className="account-hint">{searchMessage}</p> : null}

        {partner ? (
          <>
            <div className="trade-partner">
              <ArrowLeftRight size={13} />
              <b>{partner.displayName}</b>
              <button
                type="button"
                className="account-refresh"
                aria-label="Changer de partenaire"
                onClick={() => {
                  setPartner(null);
                  setVariants({});
                  setWanted([]);
                  setGiven([]);
                }}
              >
                <X size={13} />
              </button>
            </div>

            <label className="account-field">
              <span>
                <Search size={10} /> Tu donnes ({given.length}/{TRADE_PICK_LIMIT})
              </span>
              <input
                type="search"
                placeholder="Une de tes cartes"
                value={givenQuery}
                onChange={(event) => setGivenQuery(event.target.value)}
              />
            </label>
            <div className="trade-pick" role="group" aria-label="Cartes que tu donnes">
              {givenResults.map((card) => {
                const creator = CREATOR_BY_SLUG.get(card.creatorSlug);
                const selected = given.includes(card.key);
                return (
                  <button
                    type="button"
                    key={card.key}
                    className={`trade-choice${selected ? " on" : ""}`}
                    aria-pressed={selected}
                    disabled={!selected && given.length >= TRADE_PICK_LIMIT}
                    onClick={() => toggle(given, card.key, setGiven)}
                  >
                    <b>{creator?.displayName ?? card.creatorSlug}</b>
                    <em>{VARIANT_META[card.variant]?.label ?? card.variant}</em>
                  </button>
                );
              })}
              {!givenResults.length ? (
                <p className="account-hint">
                  {myCards.length ? "Aucune carte ne correspond à cette recherche." : "Ta collection est vide : ouvre un booster d'abord."}
                </p>
              ) : null}
            </div>

            <label className="account-field">
              <span>
                <Search size={10} /> Tu demandes ({wanted.length}/{TRADE_PICK_LIMIT})
              </span>
              <input
                type="search"
                placeholder="N'importe quel créateur du catalogue"
                value={wantedQuery}
                onChange={(event) => setWantedQuery(event.target.value)}
              />
            </label>
            <div className="trade-pick" role="group" aria-label="Créateurs demandés">
              {wantedResults.map((creator) => {
                const owned = variants[creator.slug];
                return (
                  <div className="trade-wanted" key={creator.slug}>
                    <button
                      type="button"
                      className="trade-choice"
                      disabled={loadingSlug === creator.slug}
                      onClick={() => loadVariants(creator.slug)}
                    >
                      <b>{creator.displayName}</b>
                      <em>{RARITY_META[creator.rarity].label}</em>
                    </button>
                    {loadingSlug === creator.slug ? <span className="account-hint">Vérification…</span> : null}
                    {owned ? (
                      owned.length ? (
                        <div className="trade-variants" role="group" aria-label={`Variantes possédées de ${creator.displayName}`}>
                          {owned.map((variant) => {
                            const key = `${creator.slug}|${variant}`;
                            const selected = wanted.includes(key);
                            return (
                              <button
                                type="button"
                                key={key}
                                className={`studio-chip${selected ? " active" : ""}`}
                                aria-pressed={selected}
                                disabled={!selected && wanted.length >= TRADE_PICK_LIMIT}
                                onClick={() => toggle(wanted, key, setWanted)}
                              >
                                {VARIANT_META[variant as CardVariant]?.label ?? variant}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="account-hint">Ne possède pas ce créateur (d&apos;après sa dernière sauvegarde).</span>
                      )
                    ) : null}
                  </div>
                );
              })}
              {wantedQuery.trim().length >= TRADE_QUERY_MIN && !wantedResults.length ? (
                <p className="account-hint">Aucun créateur ne correspond à cette recherche.</p>
              ) : null}
              {wantedQuery.trim().length < TRADE_QUERY_MIN ? (
                <p className="account-hint">
                  Deux lettres suffisent pour chercher un créateur. Touche-le pour voir les variantes que ton
                  partenaire possède.
                </p>
              ) : null}
            </div>

            <div className="account-actions">
              <button type="button" className="account-button" disabled={cloud.busy || !ready} onClick={propose}>
                <ArrowLeftRight size={13} /> Proposer l&apos;échange
              </button>
            </div>
            <p className="account-hint">
              Une carte contre une carte (jusqu&apos;à cinq de chaque côté). Ta collection est envoyée au cloud juste
              avant : c&apos;est elle que le serveur vérifie. Une offre reste valable jusqu&apos;à ce que le joueur
              réponde ou que tu l&apos;annules.
            </p>
          </>
        ) : (
          <p className="account-hint">Cherche un joueur au classement pour lui proposer un échange.</p>
        )}
      </div>
    </details>
  );
}

/** Pastille d'état affichée dans le profil, sans ouvrir la feuille. */
export function CloudBadge() {
  const cloud = useCloud();
  if (!cloud.configured || !cloud.userId) return <CloudOff size={15} className="muted-icon" />;
  return cloud.pending ? <Upload size={15} className="pending-icon" /> : <Check size={15} className="success-icon" />;
}
