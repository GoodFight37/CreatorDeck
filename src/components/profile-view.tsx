"use client";

/**
 * Le profil (ouvert depuis le badge de niveau de l'en-tête) : vitrine,
 * progression, collection, wishlist. Les réglages vivent derrière l'engrenage
 * (`settings-sheet.tsx`), les activités dans les Objectifs.
 */
import "./profile-collection.css";
import { CardInspectModal } from "@/components/card-inspect-modal";
import { CardBackEmblem } from "@/components/card-back-emblem";
import { useBackHandler } from "@/hooks/use-back-handler";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { BookOpen, ChevronRight, Layers3, Target, Zap } from "lucide-react";

import { CreatorCard } from "@/components/creator-card";
import { useBinderGoal } from "@/hooks/use-binder-goal";
import { binderCollectionProgress, recommendBinderCollection } from "@/lib/binder-collections";
import { useCloud } from "@/hooks/use-cloud";
import { CATALOG_EDITION, CREATORS, CREATOR_BY_SLUG, RARITY_META, VARIANT_META, type Rarity } from "@/lib/catalog";
import { regionLabel } from "@/lib/regions";
import { MAX_SHOWCASE } from "@/lib/cloud/showcase";
import { type GameView } from "@/lib/game-engine";
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
  onShowStudio,
  onShowAccount,
  onShowOwnProfile,
  onShowWishlist,
  onGoBinder,
  onGoDrop,
}: {
  game: GameView;
  onShowStudio: () => void;
  onShowAccount: () => void;
  onShowOwnProfile: () => void;
  onShowWishlist: () => void;
  onGoBinder?: () => void;
  onGoDrop?: () => void;
}) {
  const cloud = useCloud();

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
    // Trois emplacements au minimum ; toutes les cartes épinglées s'affichent, jusqu'à la limite du sélecteur.
    return [...pinned, ...automatic].slice(0, Math.min(MAX_SHOWCASE, Math.max(3, pinned.length)));
  }, [ownedCards, cloud.showcase]);
  const showcaseSlots = Math.min(MAX_SHOWCASE, Math.max(3, showcase.length));

  const [inspectSlug, setInspectSlug] = useState<string | null>(null);
  const inspectCreator = inspectSlug ? CREATOR_BY_SLUG.get(inspectSlug) : undefined;
  const inspectCopies = useMemo(() => {
    const counts = new Map<(typeof ownedCards)[number]["variant"], number>();
    for (const card of ownedCards) if (card.creatorSlug === inspectSlug) counts.set(card.variant, (counts.get(card.variant) ?? 0) + 1);
    return [...counts].map(([variant, count]) => ({ variant, count }));
  }, [ownedCards, inspectSlug]);
  useBackHandler(inspectSlug !== null, () => setInspectSlug(null));
  const xp = Math.max(0, Math.min(game.player.xp, game.player.xpNext));

  const [binderGoal] = useBinderGoal();
  const collections = useMemo(() => binderCollectionProgress(new Set(ownedCards.map((card) => card.creatorSlug))), [ownedCards]);
  const collectionGoal = collections.find((collection) => collection.id === binderGoal) ?? recommendBinderCollection(collections);
  const completedPages = collections.filter((collection) => collection.missing.length === 0).length;
  const legendaryNames = new Set(ownedCards.filter((card) => card.rarity === "legendary").map((card) => card.creatorSlug)).size;

  const studioAvailable = process.env.NODE_ENV !== "production";
  const [tools, setTools] = useState(0);
  const [lastTap, setLastTap] = useState(0);

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
          <div className="profile-showcase-cards" style={{ "--showcase-cols": showcaseSlots } as CSSProperties}>
            {showcase.map((card) => {
              const creator = CREATOR_BY_SLUG.get(card.creatorSlug);
              return creator ? (
                <figure className="profile-showcase-slot" key={card.id}>
                  <CreatorCard creator={creator} variant={card.variant} compact onClick={() => setInspectSlug(card.creatorSlug)} />
                  <figcaption><strong>{creator.displayName}</strong><span>{RARITY_META[creator.rarity].label} · {VARIANT_META[card.variant].label}</span></figcaption>
                </figure>
              ) : null;
            })}
            {Array.from({ length: showcaseSlots - showcase.length }, (_, index) => <div className="profile-showcase-placeholder" key={`empty-${index}`} aria-hidden="true"><CardBackEmblem /><span>Prochaine trouvaille</span></div>)}
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

      {cloud.configured && cloud.userId ? (
        <button type="button" className="profile-identity-action" onClick={onShowOwnProfile}>
          Ma fiche publique <ChevronRight size={16} />
        </button>
      ) : null}
    </div>
  );
}
