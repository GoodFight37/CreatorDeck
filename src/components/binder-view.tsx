"use client";

/**
 * L'écran **Binder** : un album qu'on feuillette, ses propres visages d'abord.
 */
import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";

import { CardBackEmblem } from "@/components/card-back-emblem";
import { CircleStrip } from "@/components/circle-strip";
import { AtelierView } from "@/components/atelier-view";
import { useCircle } from "@/lib/circle-store";
import { circleLabel } from "@/lib/circle";
import { CreatorCard } from "@/components/creator-card";
import { CardInspectModal } from "@/components/card-inspect-modal";
import { albumOrder } from "@/lib/binder-sort";
import { useNow } from "@/hooks/use-game";
import { useBackHandler } from "@/hooks/use-back-handler";
import { useLive } from "@/hooks/use-live";
import { CREATORS, RETIRED_CREATORS, RARITY_META, type CardVariant, type Creator } from "@/lib/catalog";
import { liveFor } from "@/lib/live";
import { craftQuote, type GameView } from "@/lib/game-engine";
import { cardEffectsAllowed } from "@/lib/tilt";
import { playPageTurn } from "@/lib/sfx";

export function CollectionView({
  game,
  themeStyle,
  onCraft,
  onGoDrop,
  onEditCircle,
  mode = "collection",
  onModeChange,
  onNotice,
  onError,
}: {
  game: GameView;
  themeStyle?: CSSProperties;
  onCraft: (slug: string) => Promise<boolean>;
  onGoDrop?: () => void;
  /** Ouvrir « Mes chaînes » pour définir ou modifier le cercle. */
  onEditCircle?: () => void;
  /** L'Atelier est un mode du classeur (21 octobre 2026), plus un onglet. */
  mode?: "collection" | "atelier";
  onModeChange?: (mode: "collection" | "atelier") => void;
  onNotice?: (message: string) => void;
  onError?: (message: string) => void;
}) {
  const circle = useCircle();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [turnDirection, setTurnDirection] = useState(0);
  const [turning, setTurning] = useState(false);
  const turnLock = useRef(false);
  const turnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const swipe = useRef<{ id: number; x: number; y: number; horizontal: boolean } | null>(null);
  const suppressClick = useRef(false);

  useEffect(() => () => {
    if (turnTimer.current !== null) clearTimeout(turnTimer.current);
  }, []);

  const [crafting, setCrafting] = useState<string | null>(null);
  const [inspect, setInspect] = useState<{
    creator: Creator;
    count: number;
    variant: CardVariant;
    liveStream: ReturnType<typeof liveFor>;
  } | null>(null);

  useBackHandler(inspect !== null, () => setInspect(null));
  const live = useLive();
  const now = useNow(60_000);
  const perPage = 12;

  const owned = useMemo(() => {
    const map = new Map<
      string,
      {
        count: number;
        bestVariant: CardVariant;
        variants: Set<CardVariant>;
        variantCounts: Map<CardVariant, number>;
        latestAt: number;
      }
    >();
    const variantScore: Record<CardVariant, number> = {
      standard: 1,
      live: 2,
      holo: 3,
      gold: 4,
    };
    for (const card of game.cards) {
      const value = map.get(card.creatorSlug) ?? {
        count: 0,
        bestVariant: "standard" as CardVariant,
        variants: new Set<CardVariant>(),
        variantCounts: new Map<CardVariant, number>(),
        latestAt: 0,
      };
      value.count += 1;
      value.latestAt = Math.max(value.latestAt, card.obtainedAt);
      value.variants.add(card.variant);
      value.variantCounts.set(card.variant, (value.variantCounts.get(card.variant) ?? 0) + 1);
      if (variantScore[card.variant] > variantScore[value.bestVariant]) {
        value.bestVariant = card.variant;
      }
      map.set(card.creatorSlug, value);
    }
    return map;
  }, [game.cards]);

  const filtered = useMemo(() => {
    const q = query.toLocaleLowerCase("fr").trim();
    const retiredOwned = RETIRED_CREATORS.filter((creator) => owned.has(creator.slug));
    const matching = [...CREATORS, ...retiredOwned].filter((creator) => !q ||
      `${creator.displayName} ${creator.login} ${creator.category} #${creator.rank}`.toLocaleLowerCase("fr").includes(q));
    return albumOrder(matching, circle, (slug) => owned.get(slug)?.latestAt);
  }, [circle, owned, query]);

  function finishTurn() {
    if (turnTimer.current !== null) clearTimeout(turnTimer.current);
    turnTimer.current = null;
    turnLock.current = false;
    setTurning(false);
    setTurnDirection(0);
  }

  function resetDrag() {
    swipe.current = null;
    surfaceRef.current?.classList.remove("is-dragging");
    surfaceRef.current?.style.removeProperty("--binder-drag");
  }

  function resetPage() {
    finishTurn();
    resetDrag();
    setPage(0);
  }
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const showPager = filtered.length > perPage;
  const safePage = Math.min(page, totalPages - 1);
  function turnPage(next: number) {
    const target = Math.max(0, Math.min(totalPages - 1, next));
    if (target === safePage || turnLock.current) return;
    playPageTurn();
    const effects = cardEffectsAllowed();
    setTurnDirection(effects ? Math.sign(target - safePage) : 0);
    turnLock.current = effects;
    setTurning(effects);
    setPage(target);
    // Secours si animationend est interrompu ou indisponible.
    if (effects) turnTimer.current = setTimeout(finishTurn, 420);
  }
  function startPageSwipe(event: PointerEvent<HTMLDivElement>) {
    suppressClick.current = false;
    const interactive = (event.target as Element).closest("a, button, input, select");
    if (!showPager || turnLock.current || event.button !== 0 || event.isPrimary === false ||
      (interactive && !interactive.classList.contains("creator-card-inspect"))) return;
    swipe.current = { id: event.pointerId, x: event.clientX, y: event.clientY, horizontal: false };
  }

  function movePageSwipe(event: PointerEvent<HTMLDivElement>) {
    const gesture = swipe.current;
    // La lumière du classeur est fixe : la faire suivre le doigt repeignait les
    // douze reflets (masqués, fusionnés) à chaque mouvement.
    if (!gesture) return;
    if (gesture.id !== event.pointerId) return;
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    if (!gesture.horizontal) {
      if (Math.abs(dy) > 10 && Math.abs(dy) >= Math.abs(dx)) { resetDrag(); return; }
      if (Math.abs(dx) < 12 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      gesture.horizontal = true;
      suppressClick.current = true;
      try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* capture facultative */ }
    }
    event.preventDefault();
    if (!cardEffectsAllowed()) return;
    const blocked = dx > 0 ? safePage === 0 : safePage === totalPages - 1;
    const resisted = (blocked ? 12 : 42) * Math.tanh(dx / 160);
    event.currentTarget.style.setProperty("--binder-drag", `${resisted}px`);
    event.currentTarget.classList.add("is-dragging");
  }

  function endPageSwipe(event: PointerEvent<HTMLDivElement>) {
    const gesture = swipe.current;
    if (!gesture || gesture.id !== event.pointerId) return;
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    const threshold = Math.max(48, event.currentTarget.clientWidth * .18);
    resetDrag();
    if (gesture.horizontal && Math.abs(dx) >= threshold && Math.abs(dx) > Math.abs(dy) * 1.5) {
      turnPage(safePage + (dx < 0 ? 1 : -1));
    }
  }

  const visibleCreators = filtered.slice(
    safePage * perPage,
    (safePage + 1) * perPage,
  );
  const ownedSlugs = useMemo(() => new Set(owned.keys()), [owned]);

  const modeSwitch = onModeChange ? (
    <div className="binder-modes" role="group" aria-label="Classeur">
      <button type="button" aria-pressed={mode === "collection"} onClick={() => onModeChange("collection")}>Ma collection</button>
      <button type="button" aria-pressed={mode === "atelier"} onClick={() => onModeChange("atelier")}>Atelier</button>
    </div>
  ) : null;

  if (mode === "atelier" && onNotice && onError) {
    return (
      <>
        <div className="binder-modes-bar">{modeSwitch}</div>
        <AtelierView game={game} onNotice={onNotice} onError={onError} onGoDrop={onGoDrop} onGoBinder={() => onModeChange?.("collection")} />
      </>
    );
  }

  return (
    <div className="view collection-view" style={themeStyle}>
      {modeSwitch}
      {/* L'album se feuillette : ses visages d'abord, sans tableau de bord. */}
      <section className="page-title-row" style={{ marginBottom: "0.2rem" }}>
        <h1 style={{ fontSize: "1.35rem", margin: 0 }}>Mon classeur</h1>
      </section>

      {circle.length > 0 ? (
        <CircleStrip
          circle={circle}
          owned={ownedSlugs}
          live={live}
          now={now}
          onOpenCollection={() => { setQuery(""); resetPage(); }}
          onEdit={onEditCircle}
        />
      ) : null}

      {!owned.size ? (
        <div className="binder-empty-state">
          <strong>Ta collection commence avec le prochain booster.</strong>
          {onGoDrop ? (
            <button type="button" className="binder-first-drop" onClick={onGoDrop}>
              Retour au Drop <ChevronRight size={16} />
            </button>
          ) : null}
        </div>
      ) : null}

      {/* Une seule recherche discrète : retrouver un visage par son nom. */}
      <div className="binder-tools">
        <label className="search-field">
          <Search size={16} />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              resetPage();
            }}
            placeholder="Nom, rang ou jeu…"
            aria-label="Rechercher un créateur"
          />
          {query ? (
            <button
              onClick={() => {
                setQuery("");
                resetPage();
              }}
              aria-label="Effacer la recherche"
            >
              <X size={14} />
            </button>
          ) : null}
        </label>
      </div>

      {showPager ? (
        <div className="binder-pager">
          <button onClick={() => turnPage(safePage - 1)} disabled={turning || safePage <= 0}>
            <ChevronLeft size={15} />
            <span>Précédent</span>
          </button>
          <span role="status" aria-live="polite" aria-atomic="true">Page <strong>{safePage + 1}</strong> / {totalPages}</span>
          <button onClick={() => turnPage(safePage + 1)} disabled={turning || safePage >= totalPages - 1}>
            <span>Suivant</span>
            <ChevronRight size={15} />
          </button>
        </div>
      ) : null}

      <div
        className="binder-surface"
        ref={surfaceRef}
        role="group"
        aria-label="Pages du classeur"
        tabIndex={showPager ? 0 : undefined}
        onPointerDown={startPageSwipe}
        onPointerMove={movePageSwipe}
        onPointerUp={endPageSwipe}
        onPointerCancel={resetDrag}
        onLostPointerCapture={resetDrag}
        onClickCapture={(event) => {
          if (suppressClick.current) { event.preventDefault(); event.stopPropagation(); }
        }}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget || !showPager) return;
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            turnPage(safePage + (event.key === "ArrowRight" ? 1 : -1));
          }
        }}
      >
        <div className="binder-page" key={safePage} data-page={safePage + 1}
          data-turn={turnDirection > 0 ? "next" : turnDirection < 0 ? "previous" : "none"}
          style={{ "--binder-direction": turnDirection } as CSSProperties}
          onAnimationEnd={(event) => { if (event.target === event.currentTarget) finishTurn(); }}
        >
          <div className="collection-grid">
            {visibleCreators.map((creator) => {
              const item = owned.get(creator.slug);
              const currentLive = liveFor(live, creator.login, now);
              return (
                <div className="binder-pocket" key={creator.slug} style={{ "--pocket-rarity": RARITY_META[creator.rarity].color } as CSSProperties}>
                  <div className="binder-card-slot">
                    <CreatorCard
                      creator={creator}
                      variant={item?.bestVariant ?? "standard"}
                      locked={!item}
                      compact
                      liveStream={currentLive}
                      onClick={() => setInspect({
                        creator,
                        count: item?.count ?? 0,
                        variant: item?.bestVariant ?? "standard",
                        liveStream: currentLive,
                      })}
                    />
                    {!item ? <span className="binder-back-seal" aria-hidden="true"><CardBackEmblem /></span> : null}
                  </div>
                  {circleLabel(circle, creator.slug) ? <small>{circleLabel(circle, creator.slug)}</small> : null}
                </div>
              );
            })}
          </div>

          {!filtered.length ? (
            <div className="binder-empty-state">
              <span>Aucune carte ne correspond à cette recherche.</span>
            </div>
          ) : null}
        </div>
      </div>

      {inspect ? (
        <CardInspectModal
          presentation="binder"
          themeStyle={themeStyle}
          copies={(["standard", "live", "holo", "gold"] as const)
            .filter((variant) => owned.get(inspect.creator.slug)?.variants.has(variant))
            .map((variant) => ({ variant, count: owned.get(inspect.creator.slug)?.variantCounts.get(variant) ?? 0 }))}
          creator={inspect.creator}
          ownedCount={inspect.count}
          variant={inspect.variant}
          liveStream={inspect.liveStream}
          quote={craftQuote({ cards: game.cards }, inspect.creator.slug)}
          balance={game.player.points}
          crafting={crafting === inspect.creator.slug}
          onCraft={async (slug) => {
            setCrafting(slug);
            try {
              if (await onCraft(slug)) setInspect(null);
            } finally {
              setCrafting(null);
            }
          }}
          onClose={() => setInspect(null)}
        />
      ) : null}
    </div>
  );
}
