"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import Image from "next/image";
import {
  AlertTriangle,
  Check,
  CloudOff,
  Crown,
  Download,
  Info,
  LogOut,
  Mail,
  Plus,
  RefreshCw,
  Search,
  Star,
  Trophy,
  Upload,
  UserPlus,
  X,
} from "lucide-react";
import { useCloud } from "@/hooks/use-cloud";
import { useGame } from "@/hooks/use-game";
import { cloudStore, type LeaderboardMetric } from "@/lib/cloud/cloud-store";
import { CLOUD_DISABLED_HINT } from "@/lib/cloud/config";
import { MAX_SHOWCASE, knownShowcase, ownedCreatorSlugs, toggleShowcase } from "@/lib/cloud/showcase";
import { describeSync } from "@/lib/cloud/sync";
import { CREATOR_BY_SLUG, creatorImage, RARITY_META } from "@/lib/catalog";

const METRICS: { id: LeaderboardMetric; label: string }[] = [
  { id: "unique_creators", label: "Cartes uniques" },
  { id: "total_cards", label: "Cartes" },
  { id: "legendary_cards", label: "Légendaires" },
];

const PICKER_LIMIT = 60;

function ShowcaseCard({ slug, small = false }: { slug: string; small?: boolean }) {
  const creator = CREATOR_BY_SLUG.get(slug);
  if (!creator) return null;

  const rarity = RARITY_META[creator.rarity];
  const style = {
    "--rarity": rarity.color,
    "--rarity-glow": rarity.glow,
  } as CSSProperties;

  return (
    <figure className={`showcase-card${small ? " is-small" : ""}`} style={style}>
      <span className="showcase-photo">
        <Image src={creatorImage(creator)} width={96} height={96} alt={creator.displayName} unoptimized />
      </span>
      <figcaption>
        <b>{creator.displayName}</b>
        <span>{rarity.label}</span>
      </figcaption>
    </figure>
  );
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
export function AccountSheet({ onClose }: { onClose: () => void }) {
  const cloud = useCloud();
  const state = useGame();
  const [email, setEmail] = useState(cloud.email ?? "");
  const [code, setCode] = useState("");
  const [confirmPull, setConfirmPull] = useState(false);
  // Brouillon du nom : `null` tant que le joueur n'a rien tapé, pour suivre la
  // valeur du serveur sans synchroniser un état par un effet.
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [showcaseDraft, setShowcaseDraft] = useState<string[] | null>(null);
  const [query, setQuery] = useState("");
  const [openProfile, setOpenProfile] = useState<string | null>(null);
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
                  appareil — l&apos;attacher à une adresse e-mail viendra ensuite, quand un envoi d&apos;e-mails sera
                  configuré.
                </p>

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
                    {cloud.leaderboard.map((row) => {
                      const expanded = openProfile === row.userId;
                      const profileShowcase = knownShowcase(row.showcaseSlugs);
                      const profileId = `leaderboard-profile-${row.userId}`;
                      return (
                        <li key={`${row.rank}-${row.userId}`} className={row.userId === cloud.userId ? "me" : ""}>
                          <button
                            type="button"
                            className="leaderboard-row"
                            aria-expanded={expanded}
                            aria-controls={profileId}
                            onClick={() => setOpenProfile(expanded ? null : row.userId)}
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
                                  : `${row.uniqueCreators} uniques`}
                            </span>
                            {row.rank === 1 ? <Crown size={13} className="leaderboard-crown" /> : null}
                          </button>
                          {expanded ? (
                            <div id={profileId} className="leaderboard-profile">
                              {profileShowcase.length ? (
                                <div className="showcase-grid">
                                  {profileShowcase.map((slug) => <ShowcaseCard key={slug} slug={slug} />)}
                                </div>
                              ) : (
                                <p className="account-hint">Pas de vitrine pour l&apos;instant.</p>
                              )}
                              <ul className="leaderboard-stats">
                                <li><b>{row.uniqueCreators.toLocaleString("fr-FR")}</b><span>Créateurs uniques</span></li>
                                <li><b>{row.totalCards.toLocaleString("fr-FR")}</b><span>Cartes</span></li>
                                <li><b>{row.legendaryCards.toLocaleString("fr-FR")}</b><span>Légendaires</span></li>
                                <li><b>{row.level.toLocaleString("fr-FR")}</b><span>Niveau</span></li>
                                <li><b>{row.points.toLocaleString("fr-FR")}</b><span>Points</span></li>
                              </ul>
                            </div>
                          ) : null}
                        </li>
                      );
                    })}
                  </ol>
                ) : (
                  <p className="account-hint">
                    {cloud.busy ? "Chargement…" : "Personne au classement pour l'instant : envoie ta collection pour ouvrir la voie."}
                  </p>
                )}
                <p className="account-hint">
                  Touche une ligne du classement pour voir la vitrine et les chiffres publics du joueur. Le serveur
                  recalcule les statistiques depuis chaque sauvegarde et écarte ce qu&apos;aucune partie ne peut produire.
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
  if (!cloud.configured || !cloud.userId) return <CloudOff size={15} className="muted-icon" />;
  return cloud.pending ? <Upload size={15} className="pending-icon" /> : <Check size={15} className="success-icon" />;
}
