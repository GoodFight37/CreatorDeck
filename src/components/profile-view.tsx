"use client";

/**
 * L'écran **Toi** : vitrine, progression et réglages essentiels.
 */
import "./profile-collection.css";
import { ReleaseNotesSheet } from "@/components/release-notes-sheet";
import { useReleaseNotes } from "@/hooks/use-release-notes";
import { CardInspectModal } from "@/components/card-inspect-modal";
import { CardBackEmblem } from "@/components/card-back-emblem";
import { useBackHandler } from "@/hooks/use-back-handler";
import { useEffect, useMemo, useState } from "react";
import { BookOpen, ChevronRight, Layers3, Target, Zap } from "lucide-react";

import { CreditsBlock } from "@/components/credits";
import { ImageCredits } from "@/components/image-credits";
import { PromoCodeSheet } from "@/components/promo-code-sheet";
import { CreatorCard } from "@/components/creator-card";
import { Capacitor } from "@capacitor/core";
import { useBinderGoal } from "@/hooks/use-binder-goal";
import { binderCollectionProgress, recommendBinderCollection } from "@/lib/binder-collections";
import { useCloud } from "@/hooks/use-cloud";
import { useInbox } from "@/hooks/use-inbox";
import { useNow } from "@/hooks/use-game";
import { CATALOG_EDITION, CREATORS, CREATOR_BY_SLUG, RARITY_META, VARIANT_META, type Rarity } from "@/lib/catalog";
import { readySteals } from "@/lib/last-pack";
import { sellableCards } from "@/lib/market";
import { regionLabel } from "@/lib/regions";
import { applyTiltChoice, setTiltEnabled, tiltEnabled } from "@/lib/tilt";
import {
  isMusicMuted,
  isMuted,
  setMusicMuted,
  setMuted,
} from "@/lib/sfx";
import { type GameView } from "@/lib/game-engine";
import { BUILD_COMMIT, BUILD_VERSION } from "@/lib/build-version";
import { gameStore } from "@/lib/game-store";
import { cloudStore } from "@/lib/cloud/cloud-store";

const RARITY_SCORE: Record<Rarity, number> = {
  common: 0,
  uncommon: 1,
  rare: 2,
  epic: 3,
  legendary: 4,
};
const VARIANT_SCORE = { standard: 0, live: 1, holo: 2, gold: 3 } as const;

export function ProfileView({
  game,
  onNotice,
  onProgressReset,
  onError,
  onShowOdds,
  onShowMissions,
  onShowThemes,
  onShowStudio,
  onShowAccount,
  onShowLeaderboard,
  onShowFriends,
  onShowMarket,
  onShowLastPack,
  onShowArena,
  onShowNotifications,
  onShowOwnProfile,
  onShowWishlist,
  onShowTribunal,
  onGoBinder,
  onGoDrop,
}: {
  game: GameView;
  onProgressReset?: () => void;
  onNotice: (message: string) => void;
  onError: (message: string) => void;
  onShowOdds: () => void;
  onShowMissions: () => void;
  onShowThemes?: () => void;
  onShowStudio: () => void;
  onShowAccount: () => void;
  onShowLeaderboard: () => void;
  onShowFriends: () => void;
  onShowMarket: () => void;
  onShowLastPack: () => void;
  onShowArena: () => void;
  onShowNotifications: () => void;
  onShowOwnProfile: () => void;
  onShowWishlist: () => void;
  onShowTribunal?: () => void;
  onGoBinder?: () => void;
  onGoDrop?: () => void;
}) {
  const cloud = useCloud();
  const { unread: inboxUnread } = useInbox();
  const lastPackNow = useNow(15_000);
  const lastPackReady = readySteals(cloud.lastPacks, cloud.lastPacksAt ?? lastPackNow, lastPackNow);
  const arenaRewards = cloud.arenaMine?.pending.length ?? 0;
  const arenaCards = new Set(game.cards.map((card) => card.creatorSlug)).size;
  const marketDuplicates = sellableCards(game.cards).length;

  useEffect(() => {
    if (!cloud.configured || !cloud.userId) return;
    void cloudStore.loadWishlist();
    void cloudStore.loadProfile();
  }, [cloud.configured, cloud.userId]);

  const wishlistCreator = cloud.wishlistSlug ? CREATOR_BY_SLUG.get(cloud.wishlistSlug) ?? null : null;
  const ownedCards = game.cards;

  const showcase = useMemo(() => {
    const bestByCreator = new Map<string, (typeof ownedCards)[number]>();
    const score = (card: (typeof ownedCards)[number]) =>
      RARITY_SCORE[card.rarity] * 10 + VARIANT_SCORE[card.variant];
    for (const card of ownedCards) {
      const previous = bestByCreator.get(card.creatorSlug);
      if (!previous || score(card) > score(previous) || (score(card) === score(previous) && card.obtainedAt > previous.obtainedAt)) {
        bestByCreator.set(card.creatorSlug, card);
      }
    }
    const pinned = [...new Set(cloud.showcase)].map((slug) => bestByCreator.get(slug)).filter((card) => card !== undefined);
    const pinnedSlugs = new Set(pinned.map((card) => card.creatorSlug));
    const automatic = [...bestByCreator.values()].filter((card) => !pinnedSlugs.has(card.creatorSlug))
      .sort((a, b) => score(b) - score(a) || b.obtainedAt - a.obtainedAt);
    return [...pinned, ...automatic].slice(0, 3);
  }, [ownedCards, cloud.showcase]);

  const [inspectSlug, setInspectSlug] = useState<string | null>(null);
  const inspectCreator = inspectSlug ? CREATOR_BY_SLUG.get(inspectSlug) : undefined;
  const inspectCopies = useMemo(() => {
    const counts = new Map<(typeof ownedCards)[number]["variant"], number>();
    for (const card of ownedCards) if (card.creatorSlug === inspectSlug) counts.set(card.variant, (counts.get(card.variant) ?? 0) + 1);
    return [...counts].map(([variant, count]) => ({ variant, count }));
  }, [ownedCards, inspectSlug]);
  useBackHandler(inspectSlug !== null, () => setInspectSlug(null));
  const readyMissions = game.missions.filter((mission) => mission.done && !mission.claimed).length;
  const nextMission = game.missions.find((mission) => !mission.done);
  const completedMissions = game.missions.filter((mission) => mission.done).length;
  const xp = Math.max(0, Math.min(game.player.xp, game.player.xpNext));

  const [binderGoal] = useBinderGoal();
  const collections = useMemo(() => binderCollectionProgress(new Set(ownedCards.map((card) => card.creatorSlug))), [ownedCards]);
  const collectionGoal = collections.find((collection) => collection.id === binderGoal) ?? recommendBinderCollection(collections);
  const completedPages = collections.filter((collection) => collection.missing.length === 0).length;
  const legendaryNames = new Set(ownedCards.filter((card) => card.rarity === "legendary").map((card) => card.creatorSlug)).size;

  const [soundOn, setSoundOn] = useState(() => !isMuted());
  const [musicOn, setMusicOn] = useState(() => !isMusicMuted());

  useEffect(() => {
    applyTiltChoice();
  }, []);

  const [tiltOn, setTiltOn] = useState(() => tiltEnabled());
  const canTilt = true;
  const studioAvailable = process.env.NODE_ENV !== "production";
  const [tools, setTools] = useState(0);
  const [lastTap, setLastTap] = useState(0);
  const [showPromoCode, setShowPromoCode] = useState(false);
  const [showReleaseNotes, setShowReleaseNotes] = useState(false);
  const { unreadCount: unreadNotes } = useReleaseNotes();

  function tapLevel() {
    if (!studioAvailable) return;
    const now = Date.now();
    const count = now - lastTap > 3_000 ? 1 : tools + 1;
    setLastTap(now);
    if (count >= 5) {
      setTools(0);
      onShowStudio();
    } else {
      setTools(count);
    }
  }

  function toggleTilt() {
    const next = !tiltOn;
    setTiltOn(next);
    setTiltEnabled(next);
  }

  function toggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    setMuted(!next);
  }

  function toggleMusic() {
    const next = !musicOn;
    setMusicOn(next);
    setMusicMuted(!next);
  }

  async function handleReset() {
    if (!window.confirm("Réinitialiser la progression ? Toutes tes cartes seront perdues.\n\nSi tu joues connecté, ce qui est enregistré en ligne est effacé aussi.")) {
      return;
    }
    gameStore.reset();
    if (!cloud.configured || !cloud.userId) {
      onProgressReset?.();
      onNotice("Nouvelle partie lancée.");
      return;
    }
    onNotice("Nouvelle partie lancée.");
    const outcome = await cloudStore.resetProgress();
    if (outcome.status === "done") {
      onProgressReset?.();
      onNotice(outcome.message);
    } else if (outcome.status === "unavailable") {
      onError(`Partie locale remise à zéro. En ligne : ${outcome.message}`);
    }
  }

  return (
    <div className="view profile-view">
      {inspectCreator && inspectCopies.length ? <CardInspectModal presentation="binder" creator={inspectCreator}
        ownedCount={inspectCopies.reduce((sum, copy) => sum + copy.count, 0)}
        variant={showcase.find((card) => card.creatorSlug === inspectSlug)?.variant ?? inspectCopies[0].variant}
        copies={inspectCopies} liveStream={null} onClose={() => setInspectSlug(null)} /> : null}
      <p className="profile-overline">TOI · COLLECTIONNEUR</p>
      <section className="profile-card">
        {studioAvailable ? (
          <button type="button" className="profile-avatar" onClick={tapLevel} aria-label={`Niveau ${game.player.level}`}>
            <span>{game.player.level}</span>
          </button>
        ) : (
          <span className="profile-avatar" aria-label={`Niveau ${game.player.level}`}><span>{game.player.level}</span></span>
        )}
        <div>
          <h1>{cloud.userId && cloud.displayName ? cloud.displayName : "Mon profil de collectionneur"}</h1>
          <span>{CATALOG_EDITION}</span>
        </div>
      </section>

      <button type="button" className="profile-account-status" onClick={onShowAccount}>
        <span>{!cloud.configured ? "Profil de développement" : !cloud.userId ? "Lie ton compte pour retrouver ta collection" : cloud.syncNeedsChoice ? "Synchronisation à vérifier" : cloud.saveSyncing ? "Sauvegarde en cours…" : cloud.pending ? "Sauvegarde en attente" : cloud.isError ? "Compte · une action demande ton attention" : "Compte connecté"}</span>
        <ChevronRight size={16} />
      </button>

      {cloud.isError && cloud.message ? <p className="profile-account-feedback" role="alert">{cloud.message}</p> : null}

      {/* Vitrine centrale */}
      <section className="profile-showcase" aria-label="Vitrine de cartes">
        <div className="profile-showcase-heading">
          <div><span>À EXPOSER</span><h2>Ta vitrine</h2></div>
          <div className="profile-streak">
            <Zap size={14} />
            <span>
              {game.streak.jackpot
                ? "Récompense de série prête"
                : game.streak.todayDone
                  ? `J${Math.max(1, game.streak.days)} validé aujourd’hui`
                  : game.streak.days
                    ? `${game.streak.days} jour${game.streak.days > 1 ? "s" : ""} d’affilée`
                    : "Ta série commence aujourd’hui"}
            </span>
          </div>
        </div>
        {showcase.length ? (
          <div className="profile-showcase-cards">
            {showcase.map((card) => {
              const creator = CREATOR_BY_SLUG.get(card.creatorSlug);
              return creator ? (
                <figure className="profile-showcase-slot" key={card.id}>
                  <CreatorCard creator={creator} variant={card.variant} compact onClick={() => setInspectSlug(card.creatorSlug)} />
                  <figcaption><strong>{creator.displayName}</strong><span>{RARITY_META[creator.rarity].label} · {VARIANT_META[card.variant].label}</span></figcaption>
                </figure>
              ) : null;
            })}
            {Array.from({ length: 3 - showcase.length }, (_, index) => <div className="profile-showcase-placeholder" key={`empty-${index}`} aria-hidden="true"><CardBackEmblem /><span>Prochaine trouvaille</span></div>)}
          </div>
        ) : (
          <div className="profile-showcase-empty">
            <p>Ta première carte t’attend. Ouvre un booster pour commencer ta vitrine.</p>
            {onGoDrop ? <button type="button" className="profile-identity-action" onClick={onGoDrop}>Trouver ma première carte <ChevronRight size={16} /></button> : null}
          </div>
        )}
        {cloud.configured ? (
          <button type="button" className="profile-identity-action" onClick={onShowAccount}>
            {cloud.userId ? "Personnaliser mon pseudo et ma vitrine" : "Lier un compte pour personnaliser mon profil"}
            <ChevronRight size={16} />
          </button>
        ) : null}
      </section>

      <section className="profile-journey" aria-label="Ton parcours">
        <div className="profile-journey-head"><h2>Ton parcours</h2><span>Niveau {game.player.level}</span></div>
        <div className="profile-xp-label"><span>Prochain niveau</span><strong>{xp} / {game.player.xpNext} XP</strong></div>
        <progress className="profile-xp" aria-label="Expérience vers le prochain niveau" value={xp} max={game.player.xpNext} />
        <div className="profile-collection-total"><strong>{game.stats.uniqueCreators}<small> / {CREATORS.length}</small></strong><span>créateurs réunis</span></div>
        <progress className="profile-collection-meter" aria-label="Collection de créateurs" value={game.stats.uniqueCreators} max={CREATORS.length} />
        <button type="button" className="profile-objective" onClick={onShowMissions}>
          <Target size={20} /><span><strong>Objectifs et saisons</strong><small>{readyMissions > 0 ? `${readyMissions} objectif${readyMissions > 1 ? "s" : ""} à réclamer` : nextMission ? `${nextMission.label} · ${nextMission.progress}/${nextMission.target}` : `${completedMissions}/${game.missions.length} objectifs du jour terminés`}</small></span><ChevronRight size={18} />
        </button>
        {onShowTribunal ? <button type="button" className="profile-journey-link" onClick={onShowTribunal}>Tribunal des Bannis <ChevronRight size={16} /></button> : null}
      </section>

      {game.stats.totalCards > 0 ? (
        <details className="profile-stats-fold">
          <summary>Progression de collection</summary>
          <div className="stats-grid">
            <article>
              <Layers3 size={18} />
              <strong>{game.stats.totalCards}</strong>
              <span>cartes</span>
            </article>
            <article>
              <BookOpen size={18} />
              <strong>{game.stats.uniqueCreators}/{CREATORS.length}</strong>
              <span>streameurs</span>
            </article>
            <article>
              <Zap size={18} />
              <strong>{game.stats.openings}</strong>
              <span>boosters</span>
            </article>
          </div>
        </details>
      ) : null}

      {game.stats.totalCards > 0 ? (
        <section className="profile-milestones" aria-label="Mes collections réunies">
          <span><strong>{completedPages}</strong> page{completedPages > 1 ? "s" : ""} réunie{completedPages > 1 ? "s" : ""}</span>
          <span><strong>{legendaryNames}</strong> Légendaire{legendaryNames > 1 ? "s" : ""} différente{legendaryNames > 1 ? "s" : ""}</span>
        </section>
      ) : null}

      {collectionGoal && onGoBinder ? (
        <button type="button" className="profile-collection-goal" onClick={onGoBinder}>
          <span>
            <small>{collectionGoal.missing.length ? "MA COLLECTION EN COURS" : "MA COLLECTION COMPLÉTÉE"}</small>
            <strong>{collectionGoal.name}</strong>
            <span>{collectionGoal.owned}/{collectionGoal.total} cartes · {collectionGoal.missing.length ? `${collectionGoal.missing.length} à trouver` : "Complétée"}</span>
          </span>
          <ChevronRight size={18} />
        </button>
      ) : null}

      <button type="button" className="profile-news" onClick={() => setShowReleaseNotes(true)} aria-label={`Nouveautés${unreadNotes ? ` · ${unreadNotes} notes non lues` : " · Tout est lu"}`}>
        <BookOpen size={22} /><span><strong>Nouveautés</strong><small>Les mises à jour de CreatorDeck</small></span>
        {unreadNotes > 0 ? <b aria-hidden="true">{unreadNotes}</b> : <ChevronRight size={18} />}
      </button>
      {showReleaseNotes ? <ReleaseNotesSheet onClose={() => setShowReleaseNotes(false)} /> : null}

      <details className="profile-online-fold">
        <summary>Fonctionnalités en ligne</summary>
        <button type="button" className="account-button ghost" onClick={() => setShowPromoCode(true)}>
          J&apos;ai un code booster
        </button>
        {/* Wishlist */}
      {cloud.configured ? (
        <section className="wishlist-block" aria-label="Wishlist">
          <div className="wishlist-title">
            <Target size={16} />
            <h2>Wishlist</h2>
          </div>
          {!cloud.userId ? (
            <div className="wishlist-body">
              <p>Connecte-toi pour épingler le créateur que tu cherches : les autres le verront sur ta fiche.</p>
            </div>
          ) : wishlistCreator ? (
            <div className="wishlist-body">
              <div className="wishlist-name">
                <b>{wishlistCreator.displayName}</b>
                <span>{RARITY_META[wishlistCreator.rarity].label} · {regionLabel(wishlistCreator.region)}</span>
              </div>
              <div className="wishlist-actions">
                <button type="button" className="account-button ghost" disabled={cloud.wishlistBusy} onClick={onShowWishlist}>Changer</button>
                <button type="button" className="account-button ghost" disabled={cloud.wishlistBusy} onClick={() => void cloudStore.clearWishlist()}>{cloud.wishlistBusy ? "Retrait…" : "Retirer"}</button>
              </div>
            </div>
          ) : (
            <div className="wishlist-body">
              <p>Le créateur qui te manque le plus. Un seul, et il s&apos;affiche chez toi.</p>
              <button type="button" className="account-button ghost" onClick={onShowWishlist}>Épingler un créateur</button>
            </div>
          )}
        </section>
      ) : null}

      {/* Compte & En ligne */}
      <section className="menu-group" aria-label="Compte">
        <h2>Compte</h2>
        <button type="button" className="menu-row" onClick={onShowAccount}>
          <span>Mon compte</span>
          <ChevronRight size={16} />
        </button>

        {cloud.configured && cloud.userId ? (
          <>
            <button type="button" className="menu-row" onClick={onShowLeaderboard}>
              <span>Classement mondial</span>
              <ChevronRight size={16} />
            </button>
            <button type="button" className="menu-row" onClick={onShowOwnProfile}>
              <span>Ma fiche publique</span>
              <ChevronRight size={16} />
            </button>
            <button type="button" className="menu-row" onClick={onShowFriends}>
              <span>Amis</span>
              <ChevronRight size={16} />
            </button>
            <button type="button" className="menu-row" onClick={onShowMarket}>
              <span className="menu-label">
                Hôtel des ventes
                <small className="menu-state">
                  {marketDuplicates} doublon{marketDuplicates === 1 ? "" : "s"} à vendre · {game.player.points.toLocaleString("fr-FR")} pts
                </small>
              </span>
              <ChevronRight size={16} />
            </button>
            <button type="button" className="menu-row" onClick={onShowArena}>
              <span className="menu-label">
                Arène
                <small className="menu-state">
                  {arenaCards < 5 ? `${arenaCards}/5 cartes distinctes` : `${arenaCards} cartes · minimum 5`} · 1 créateur en direct au dépôt
                </small>
              </span>
              {arenaRewards > 0 ? <b className="menu-count">{arenaRewards}</b> : null}
              <ChevronRight size={16} />
            </button>
            <button type="button" className="menu-row" onClick={onShowLastPack}>
              <span>Last Pack</span>
              {lastPackReady > 0 ? <b className="menu-count">{lastPackReady}</b> : null}
              <ChevronRight size={16} />
            </button>
            <button type="button" className="menu-row" onClick={onShowNotifications}>
              <span>Notifications</span>
              {inboxUnread > 0 ? <b className="menu-count">{inboxUnread}</b> : null}
              <ChevronRight size={16} />
            </button>
          </>
        ) : cloud.configured ? (
          <button type="button" className="menu-row" onClick={onShowAccount}>
            <span className="menu-label">
              Fonctionnalités en ligne
              <small className="menu-state">Arène, Ventes, Amis · Connexion requise</small>
            </span>
            <ChevronRight size={16} />
          </button>
        ) : null}
      </section>
      </details>

      {/* Réglages */}
      <details className="profile-settings-fold">
      <summary>Réglages et informations</summary>
      <section className="menu-group" aria-label="Réglages">
        <h2>Réglages</h2>
        {onShowThemes ? (
          <button type="button" className="menu-row" onClick={onShowThemes}>
            <span>Thème du classeur</span>
            <ChevronRight size={16} />
          </button>
        ) : null}
        <button
          type="button"
          className="menu-row"
          role="switch"
          aria-checked={soundOn}
          onClick={toggleSound}
        >
          <span>Son de l’application</span>
          <span className="switch" data-on={soundOn ? "on" : "off"} aria-hidden="true">
            <i />
          </span>
        </button>
        <button
          type="button"
          className="menu-row"
          role="switch"
          aria-checked={musicOn}
          onClick={toggleMusic}
        >
          <span>Musique</span>
          <span className="switch" data-on={musicOn ? "on" : "off"} aria-hidden="true">
            <i />
          </span>
        </button>

        {canTilt ? (
          <button
            type="button"
            className="menu-row"
            role="switch"
            aria-checked={tiltOn}
            onClick={toggleTilt}
          >
            <span>Reflets des cartes</span>
            <span className="switch" data-on={tiltOn ? "on" : "off"} aria-hidden="true">
              <i />
            </span>
          </button>
        ) : null}

        <button type="button" className="menu-row" onClick={onShowOdds}><span>Taux officiels</span><ChevronRight size={16} /></button>
        <ImageCredits />
        <small
          className="profile-build-version"
          title={BUILD_COMMIT ? `Commit complet : ${BUILD_COMMIT}` : "Build local sans commit Git"}
          aria-label={`Version ${Capacitor.isNativePlatform() ? "Android" : "Web"} ${BUILD_VERSION}`}
        >
          Version {Capacitor.isNativePlatform() ? "Android" : "Web"} · {BUILD_VERSION}
        </small>
      </section>

      <CreditsBlock />

      <details className="profile-danger-fold"><summary>Gestion de la progression</summary>
        <p>La réinitialisation efface les cartes et la progression. Une confirmation sera demandée.</p>
        <button type="button" className="menu-reset" onClick={() => void handleReset()}>Réinitialiser la progression</button>
      </details>
      </details>
      {showPromoCode ? <PromoCodeSheet onClose={() => setShowPromoCode(false)} /> : null}
    </div>
  );
}
