"use client";

/**
 * L'écran de révélation d'un booster (ou d'un Paquet Scène) : une carte à la
 * fois, avec ce que la mise en scène décide (`src/lib/reveal.ts`).
 *
 * Il vit dans son propre fichier pour une raison précise : il sert **deux**
 * écrans — le jeu sur téléphone, et l'overlay 16:9 qu'un streamer met dans OBS.
 * Les deux contextes n'ont qu'une différence, mais elle compte : l'overlay
 * n'offre **aucun raccourci**.
 */
import { useEffect, useMemo, useRef, useState, type AnimationEvent, type CSSProperties, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import { BookOpen, ChevronRight, Sparkles, X, Zap } from "lucide-react";
import { CardBackEmblem } from "@/components/card-back-emblem";
import { CreatorCard } from "@/components/creator-card";
import { CardInspectModal } from "@/components/card-inspect-modal";
import { useBackHandler } from "@/hooks/use-back-handler";
import { gameStore } from "@/lib/game-store";
import { EffectFlash } from "@/components/effect-burst";
import { NextPackLine, PackEndLive } from "@/components/pack-end-live";
import { useNow } from "@/hooks/use-game";
import { useLive } from "@/hooks/use-live";
import { usePresentationFocus } from "@/hooks/use-presentation-focus";
import { flashFor } from "@/lib/fx";
import { buzz } from "@/lib/haptics";
import { CREATOR_BY_SLUG, RARITY_META } from "@/lib/catalog";
import { liveFor, viewersLabel } from "@/lib/live";
import { regionLabel } from "@/lib/regions";
import {
  deservesSpotlight,
  isPerfect,
  PERFECT_HAPTIC,
  PERFECT_LOCK_MS,
  revealHaptic,
  revealTiming,
  silenceBefore,
} from "@/lib/reveal";
import { playBang, playPerfectStinger, playReveal } from "@/lib/sfx";
import type { DrawnCard, StreakRewardGrant } from "@/lib/game-engine";
import { streakRewardLabel } from "@/lib/progression";
import { cardEffectsAllowed } from "@/lib/tilt";
import { useCircle } from "@/lib/circle-store";
import { circleLabel } from "@/lib/circle";

const FIFTH_CARD_REVEAL_BEAT_MS = 360;
const SUMMARY_HOLD_MS = 1_500;

export function RevealOverlay({
  cards: drawnCards,
  index,
  kind = "live",
  overlay = false,
  embedded = false,
  tutorial = false,
  streakReward = null,
  onSkipAll,
  onNext,
  onClose,
  returnFocusTo,
}: {
  cards: DrawnCard[];
  index: number;
  streakReward?: StreakRewardGrant | null;
  kind?: "live" | "scene";
  overlay?: boolean;
  embedded?: boolean;
  tutorial?: boolean;
  onSkipAll?: () => void;
  onNext: () => void;
  onClose: () => void;
  returnFocusTo?: HTMLElement | null;
}) {
  const dialogRef = usePresentationFocus(!overlay && !embedded, returnFocusTo);
  // Les anciens champs d'affichage ne peuvent plus modifier une rareté.
  const cards = useMemo(
    () => drawnCards.map(item => {
      const rarity = CREATOR_BY_SLUG.get(item.creatorSlug)?.rarity ?? item.rarity;
      return rarity === item.rarity ? item : { ...item, rarity };
    }),
    [drawnCards],
  );
  const circle = useCircle();
  const card = cards[index];
  const creatorFor = (slug: string) => CREATOR_BY_SLUG.get(slug);
  const creator = card ? creatorFor(card.creatorSlug) : undefined;
  const live = useLive();
  const now = useNow(60_000);

  const perfect = isPerfect(cards);
  const rarity = card?.rarity ?? "common";
  const [locked, setLocked] = useState(perfect);
  const [showSummary, setShowSummary] = useState(false);
  const [summaryReady, setSummaryReady] = useState(false);
  const summaryLocked = showSummary && !summaryReady;
  const [flippedCardId, setFlippedCardId] = useState<string | null>(null);
  const [inspected, setInspected] = useState<DrawnCard | null>(null);
  useBackHandler(inspected !== null, () => setInspected(null));
  const inspectedCreator = inspected ? creatorFor(inspected.creatorSlug) : undefined;
  const inspectedCopies = inspected ? (gameStore.getSnapshot()?.cards ?? [])
    .filter(item => item.creatorSlug === inspected.creatorSlug) : [];
  const anchorRef = useRef<HTMLDivElement>(null);
  const swipeStart = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const cardId = card?.id;
  const isFifthSequentialReveal = !perfect && cards.length === 5 && index === 4;
  // Un doublon, quelle que soit sa rareté, ne rejoue pas la scène : pas de
  // retournement lent. Il attend pourtant l’appui du joueur, comme toute carte :
  // rien n’avance sans lui (21 octobre 2026).
  const duplicate = Boolean(card) && !tutorial && !perfect && card.isNew === false;
  const alreadyOwned = duplicate;
  const isLast = index === cards.length - 1;
  const duplicatesSoFar = perfect ? [] : cards.slice(0, index + 1).filter((item) => !tutorial && item.isNew === false);
  // Commune et Peu commune : retournement bref, sans flash.
  const quickFlip = rarity === "common" || rarity === "uncommon";
  const timing = revealTiming(rarity, cardEffectsAllowed(), isFifthSequentialReveal, alreadyOwned);

  useEffect(() => {
    if (!showSummary) return;
    // Le récap reste lisible 1,5 s, même après un double appui.
    const timer = window.setTimeout(() => setSummaryReady(true), SUMMARY_HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [showSummary]);

  useEffect(() => {
    if (!cardId || perfect) return;

    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const effectsAllowed = cardEffectsAllowed();
    const immediate = !effectsAllowed || duplicate;
    const fifthRevealBeat = effectsAllowed && isFifthSequentialReveal ? FIFTH_CARD_REVEAL_BEAT_MS : 0;
    const reducedFallback = immediate
      ? window.setTimeout(() => {
          setFlippedCardId(cardId);
        }, 0)
      : null;
    const fallback = immediate
      ? null
      : window.setTimeout(() => {
          setFlippedCardId(cardId);
        }, 1_200 + (alreadyOwned ? 0 : silenceBefore(rarity)) + fifthRevealBeat);
    const onMotionChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        setFlippedCardId(cardId);
      }
    };
    reducedMotion?.addEventListener?.("change", onMotionChange);
    return () => {
      if (reducedFallback !== null) window.clearTimeout(reducedFallback);
      if (fallback !== null) window.clearTimeout(fallback);
      reducedMotion?.removeEventListener?.("change", onMotionChange);
    };
  }, [alreadyOwned, cardId, duplicate, isFifthSequentialReveal, perfect, rarity]);

  useEffect(() => {
    if (!card || perfect) return;
    const silence = alreadyOwned ? 0 : overlay ? silenceBefore(card.rarity) : timing.impactMs;
    const timer = window.setTimeout(() => {
      if (silenceBefore(card.rarity) > 0 || (!overlay && card.rarity === "rare")) playBang(card.rarity, card.variant);
      else playReveal(card.rarity, card.variant);
      buzz(revealHaptic(card.rarity, card.variant));
    }, silence);
    return () => window.clearTimeout(timer);
  }, [card, perfect, overlay, alreadyOwned, timing.impactMs]);

  useEffect(() => {
    if (!perfect) return;
    playPerfectStinger();
    buzz(PERFECT_HAPTIC);
    const timer = window.setTimeout(() => setLocked(false), PERFECT_LOCK_MS);
    return () => window.clearTimeout(timer);
  }, [perfect, cards]);

  if (!card || !creator) return null;
  const termine = perfect || isLast;
  const onAir = liveFor(live, creator.login, now);
  const spotlight = deservesSpotlight(card.rarity, perfect);
  // La dernière chaîne du paquet est en direct : l'écran de fin, c'est elle.
  const endCreator = creatorFor(cards[cards.length - 1].creatorSlug);
  const endStream = !overlay && !tutorial && endCreator ? liveFor(live, endCreator.login, now) : null;
  const endReady = termine && (perfect ? !locked : flippedCardId === cardId);
  const rareGlow = !duplicate && (perfect || card.rarity === "epic" || card.rarity === "legendary");
  const rarityAura = rareGlow || (!duplicate && card.rarity === "rare");
  const flash = !alreadyOwned && flashFor(card.rarity, perfect);
  const glowDelay = perfect ? 0 : overlay ? silenceBefore(card.rarity) : timing.impactMs;
  const glowStyle = {
    "--rare-delay": `${glowDelay}ms`,
    "--flip-delay": `${timing.leadMs}ms`,
    "--flip-ms": `${timing.flipMs}ms`,
  } as CSSProperties;

  function resetRevealDrag(element?: HTMLElement | null) {
    const target = element || anchorRef.current;
    if (target) {
      target.style.removeProperty("--reveal-drag-x");
      target.style.removeProperty("--reveal-drag-y");
      target.style.removeProperty("--reveal-drag-rotate");
      target.classList.remove("is-swiping");
    }
  }

  function startRevealSwipe(event: PointerEvent<HTMLDivElement>) {
    if (locked || perfect || showSummary || flippedCardId !== cardId || event.button !== 0 || event.isPrimary === false) return;
    swipeStart.current = { x: event.clientX, y: event.clientY, moved: false };
    if (Number.isFinite(event.pointerId)) {
      try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* ignore */ }
    }
  }

  function moveRevealSwipe(event: PointerEvent<HTMLDivElement>) {
    const swipe = swipeStart.current;
    if (!swipe || locked || perfect || showSummary || flippedCardId !== cardId) return;
    const dx = event.clientX - swipe.x;
    const dy = event.clientY - swipe.y;
    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) swipe.moved = true;
    if (!swipe.moved) return;

    const anchor = anchorRef.current || event.currentTarget;
    const clampedX = Math.max(-160, Math.min(160, dx));
    const clampedY = Math.max(-140, Math.min(110, dy));
    anchor.style.setProperty("--reveal-drag-x", `${clampedX}px`);
    anchor.style.setProperty("--reveal-drag-y", `${clampedY}px`);
    anchor.style.setProperty("--reveal-drag-rotate", `${clampedX * 0.08}deg`);
    anchor.classList.add("is-swiping");
  }

  function endRevealSwipe(event: PointerEvent<HTMLDivElement>) {
    const start = swipeStart.current;
    swipeStart.current = null;
    resetRevealDrag(anchorRef.current || event.currentTarget);
    if (!start || locked || perfect || showSummary || flippedCardId !== cardId) return;

    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    const dist = Math.hypot(dx, dy);

    // Détection d'un swipe franc (horizontal, vertical haut, ou diagonale)
    if (Math.abs(dx) >= 36 || dy <= -36 || dist >= 42) {
      advance();
    } else if (dist < 8 && !overlay && !tutorial) {
      setInspected(card);
    }
  }

  function cancelRevealSwipe() {
    swipeStart.current = null;
    resetRevealDrag(anchorRef.current);
  }

  function finishFlip(event: AnimationEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;
    setFlippedCardId(card.id);
  }

  function skipRemainingCards() {
    onSkipAll?.();
  }

  function advance() {
    if (locked) return;
    // Ignore les activations pendant le flip : elles ne doivent pas s'empiler
    // et révéler la carte suivante avant que le joueur ait pu la voir.
    if (!perfect && !showSummary && flippedCardId !== card.id) return;
    if (termine) {
      if (endStream) setShowSummary(true);
      else onClose();
    } else onNext();
  }

  const content = (
    <div
      ref={dialogRef}
      tabIndex={-1}
      data-reveal-index={index}
      // Quand la révélation sort de PackTear, elle garde la palette du sachet Live (booster-continuity.css).
      data-universe={!overlay && kind === "live" ? "live" : undefined}
      style={glowStyle}
      className={`reveal-overlay${overlay ? "" : ` reveal-game booster-presentation scene-${kind}`} reveal-rarity-${rarity}${perfect ? " reveal-perfect" : ""}${spotlight ? " reveal-spotlight" : ""}${showSummary ? " reveal-summary-open" : ""}${embedded ? " reveal-embedded" : ""}`}
      role={embedded ? undefined : "dialog"}
      aria-modal={embedded ? undefined : true}
      aria-label={embedded ? undefined : "Résultat du booster"}
    >
      <div className="reveal-ambient" />
      {rareGlow ? (
        <div key={card.id} className={`reveal-cinematic-field field-${perfect ? "perfect" : rarity}`} style={glowStyle} aria-hidden="true">
          <span className="reveal-field-corona" />
          <span className="reveal-field-rays" />
          <span className="reveal-field-orbit" />
          <span className="reveal-field-orbit reveal-field-orbit-second" />
        </div>
      ) : null}
      {flash ? <EffectFlash key={`flash-${card.id}`} /> : null}
      {perfect && !showSummary ? (
        <div className="perfect-banner" role="status">
          <Sparkles size={13} />
          <span>
            {kind === "scene"
              ? "Scène pleine"
              : "Booster parfait"}
          </span>
        </div>
      ) : null}
      {streakReward && endReady && !showSummary ? (
        <div className="streak-gain" role="status">
          <Zap size={13} />
          <span>
            Série <strong>J{streakReward.day}</strong> — {streakRewardLabel(streakReward)}
          </span>
        </div>
      ) : null}
      <div className="reveal-header">
        <span>{perfect ? `${cards.length} / ${cards.length}` : `${index + 1} / ${cards.length}`}</span>
        <div className="reveal-dots">
          {cards.map((item, dotIndex) => {
            const shown = perfect || dotIndex <= index;
            const dotCard = creatorFor(item.creatorSlug);
            if (!dotCard) return null;
            return (
              <i
                key={item.id}
                className={shown ? "active" : ""}
                style={{ "--dot-color": RARITY_META[item.rarity].color } as CSSProperties}
              />
            );
          })}
        </div>
        {!overlay && !perfect && !isLast && onSkipAll ? (
          <button
            type="button"
            className="reveal-skip"
            onClick={skipRemainingCards}
            aria-label="Révéler les cinq cartes d'un coup"
          >
            ×{cards.length - index}
          </button>
        ) : null}
        <button onClick={() => { if (!summaryLocked) onClose(); }} aria-label="Fermer" disabled={locked || summaryLocked}><X size={20} /></button>
      </div>

      {perfect && !showSummary ? (
        <div className="reveal-perfect-grid">
          {rareGlow ? (
            <span key={`rare-glow-${card.id}`} className="reveal-rare-aura reveal-rare-aura-perfect" style={glowStyle} aria-hidden="true" />
          ) : null}
          {cards.map((item) => {
            const dotCard = creatorFor(item.creatorSlug);
            return dotCard ? (
              <div key={item.id} className={`reveal-flip rarity-${item.rarity}${item.isNew ? " perfect-card-new" : ""}`}>
                <div className="reveal-flip-face">
                  <CreatorCard
                    creator={dotCard}
                    variant={item.variant}
                    compact={!overlay}
                    className={`reveal-card rarity-${item.rarity}`}
                    liveStream={liveFor(live, dotCard.login, now)}
                    onClick={!overlay && !locked ? () => setInspected(item) : undefined}
                  />
                  <span className="reveal-dos" aria-hidden="true">
                    <span className="reveal-back-sigil"><CardBackEmblem /></span>
                  </span>
                </div>
                <div className="perfect-card-caption">
                  <span>{RARITY_META[item.rarity].label}{item.isNew ? " · Nouvelle" : ""}</span>
                  {circleLabel(circle, item.creatorSlug) ? <small>{circleLabel(circle, item.creatorSlug)}</small> : null}
                </div>
              </div>
            ) : null;
          })}
        </div>
      ) : null}
      {perfect && !showSummary && endReady && !endStream && !overlay ? (
        <NextPackLine now={now} className="reveal-next-pack" />
      ) : null}
      {showSummary && endStream && endCreator ? (
        <PackEndLive creator={endCreator} stream={endStream} onWatch={onClose} />
      ) : perfect || showSummary ? null : (
        <div className={`reveal-stage${duplicate ? " is-duplicate" : ""}`}>
          {card.isNew && !tutorial && !quickFlip ? (
            // Nouvelle : un flash de la couleur de sa rareté. Pas de second nom :
            // celui de la carte suffit.
            <span key={`new-flash-${card.id}`} className="reveal-new-flash" aria-hidden="true"
              style={{ ...glowStyle, "--flash-color": RARITY_META[card.rarity].color } as CSSProperties} />
          ) : null}
          {duplicatesSoFar.length ? (
            <div className="reveal-dupe-pile" aria-label={`Doublons de ce booster : ${duplicatesSoFar.length}`}>
              {duplicatesSoFar.slice(-3).map((item, pileIndex) => {
                const pileCreator = creatorFor(item.creatorSlug);
                return pileCreator ? (
                  <span key={item.id} className="reveal-dupe-pile-card" style={{ "--pile-i": pileIndex } as CSSProperties} aria-hidden="true">
                    <CreatorCard creator={pileCreator} variant={item.variant} compact />
                  </span>
                ) : null;
              })}
              <span className="reveal-dupe-pile-count">Doublons ×{duplicatesSoFar.length}</span>
            </div>
          ) : null}
          {rarityAura ? (
            <span key={`rare-glow-${card.id}`} className={`reveal-rare-aura reveal-rare-aura-${card.rarity}`} style={glowStyle} aria-hidden="true" />
          ) : null}
          <div
            ref={anchorRef}
            style={glowStyle}
            className="reveal-anchor"
            onPointerDown={startRevealSwipe}
            onPointerMove={moveRevealSwipe}
            onPointerUp={endRevealSwipe}
            onPointerCancel={cancelRevealSwipe}
            onPointerLeave={cancelRevealSwipe}
          >
            <div
              key={card.id}
              style={isFifthSequentialReveal
                ? { "--fifth-reveal-beat": `${FIFTH_CARD_REVEAL_BEAT_MS}ms` } as CSSProperties
                : undefined}
              className={`reveal-flip rarity-${card.rarity}${isFifthSequentialReveal ? " reveal-fifth-card" : ""}`}
            >
              <div className="reveal-flip-face" onAnimationEnd={finishFlip}>
                <CreatorCard
                  creator={creator}
                  variant={card.variant}
                  className={`reveal-card rarity-${card.rarity}`}
                  liveStream={onAir}
                  onClick={!overlay && !tutorial && flippedCardId === cardId ? (event) => {
                    // Le tap est traité au relâché ; ici, seule l'activation clavier.
                    if (event.detail === 0) setInspected(card);
                  } : undefined}
                />
                <span className="reveal-dos" aria-hidden="true">
                  <span className="reveal-back-sigil"><CardBackEmblem /></span>
                </span>
              </div>
            </div>
          </div>
          <div className="reveal-name">
            {circleLabel(circle, card.creatorSlug) ? <span>{circleLabel(circle, card.creatorSlug)}</span> : null}
            {/* Imprimé sur la carte ou dit par la lumière : lu par les lecteurs d'écran, pas répété à l'œil. */}
            <p className="reveal-meta-sr">
              {RARITY_META[card.rarity].label} · {regionLabel(creator.region)}
              {tutorial ? "" : duplicate ? " · Doublon" : card.isNew ? " · Nouvelle" : ""}
            </p>
            {onAir ? (
              spotlight ? (
                <p className="reveal-live-show">
                  <i aria-hidden="true" />
                  <b>{creator.displayName} est en direct</b>
                  <span>
                    {onAir.title ? `${onAir.title} · ` : ""}
                    {viewersLabel(onAir.viewers)}
                  </span>
                </p>
              ) : (
                <p className="reveal-live">
                  <i aria-hidden="true" />
                  {onAir.gameName
                    ? `En direct maintenant · ${onAir.gameName} · ${viewersLabel(onAir.viewers)}`
                    : `En direct maintenant · ${viewersLabel(onAir.viewers)}`}
                </p>
              )
            ) : null}
            {endReady && tutorial ? (
              <p className="reveal-next-pack">Aperçu gratuit · connecte-toi pour commencer ta collection. Aucun point ni jeton dépensé.</p>
            ) : endReady && !endStream && !overlay ? (
              <NextPackLine now={now} className="reveal-next-pack" />
            ) : isLast ? (
              <span className="reveal-guaranteed">Carte garantie du booster</span>
            ) : null}
          </div>
        </div>
      )}

      {!showSummary && !perfect && !locked && !termine && flippedCardId === cardId ? (
        <div className="reveal-swipe-prompt" aria-hidden="true">
          <span className="reveal-swipe-arrow">‹</span>
          <span className="reveal-swipe-label">Glisse la carte</span>
          <span className="reveal-swipe-arrow">›</span>
        </div>
      ) : null}

      <button
        className={`reveal-next${locked ? " locked" : ""}${showSummary || !perfect ? " is-secondary" : ""}`}
        onClick={showSummary ? () => { if (!summaryLocked) onClose(); } : advance}
        disabled={locked || summaryLocked || (!perfect && !showSummary && flippedCardId !== cardId)}
        style={{ "--lock-ms": `${PERFECT_LOCK_MS}ms` } as CSSProperties}
      >
        <span>
          {showSummary
            ? "Ranger"
            : locked
            ? "Perfect…"
            : !perfect && flippedCardId !== card.id
            ? "Révélation…"
            : termine
                ? tutorial ? "Terminer l’essai" : "Ranger dans le classeur"
                : "Carte suivante"}
        </span>
        {showSummary ? (
          <BookOpen size={16} />
        ) : locked ? (
          <Sparkles size={18} />
        ) : termine ? (
          <BookOpen size={16} />
        ) : (
          <ChevronRight size={15} />
        )}
      </button>
      {inspected && inspectedCreator ? <CardInspectModal
        presentation="binder" creator={inspectedCreator} variant={inspected.variant}
        ownedCount={inspectedCopies.length}
        copies={(["standard", "live", "holo", "gold"] as const)
          .map(variant => ({ variant, count: inspectedCopies.filter(copy => copy.variant === variant).length }))
          .filter(copy => copy.count > 0)}
        liveStream={liveFor(live, inspectedCreator.login, now)} onClose={() => setInspected(null)}
      /> : null}
    </div>
  );
  return overlay || embedded ? content : createPortal(content, document.body);
}
