"use client";

/**
 * Cinématique d'ouverture de booster, dans l'esprit Pokémon TCG Pocket :
 *
 *   1. `sealed`    — le pack fermé lévite au centre ;
 *   2. `tearing`   — on glisse le doigt vers le HAUT : le rabat se soulève, la
 *                     dentelure se creuse et le pack tremble ;
 *   3. `burst`     — la déchirure aboutit, le tirage est effectué à cet instant
 *                     précis (jamais avant) et les cartes jaillissent ;
 *   4. `pile`      — les cartes retombent en pile, faces cachées ;
 *   5. `revealing` — on balaie la carte du dessus, elle sort de la pile et se
 *                     retourne ;
 *   6. `rare-flip` — la dernière carte (rare ou mieux, voir `revealOrder`) a un
 *                     retournement LENT, un reflet holo et des particules ;
 *   7. `summary`   — récapitulatif des cartes obtenues.
 *
 * Tout ce qui est durée, seuil ou intensité vient de `src/lib/pack-animation.ts`
 * (module pur, testé) : ce composante ne fait que projeter ces valeurs sur le
 * DOM. Le tirage lui-même reste dans `game-store` / `game-engine`.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  ChevronRight,
  FastForward,
  Hand,
  LoaderCircle,
  Sparkles,
  X,
} from "lucide-react";
import { Card3D } from "@/components/card3d";
import { CreatorCard } from "@/components/creator-card";
import { PackArtwork } from "@/components/pack-artwork";
import { ParticleBurst } from "@/components/particle-burst";
import {
  UnityPackOpening,
  useUnityBuildAvailable,
} from "@/components/unity-pack-opening";
import { usePointerGesture } from "@/hooks/use-pointer-gesture";
import { usePrefersReducedMotion } from "@/hooks/use-reduced-motion";
import {
  CREATOR_BY_SLUG,
  PACKS,
  RARITY_META,
  type PackType,
} from "@/lib/catalog";
import type { DrawnCard } from "@/lib/game-engine";
import {
  effectIntensity,
  easeOutCubic,
  flipDurationMs,
  isRareOrBetter,
  pileSlot,
  revealOrder,
  summaryDelayMs,
  swipeProgress,
  swipeReveals,
  swipeRotation,
  tearBaseClipPath,
  tearClipPath,
  tearCompletes,
  tearProgress,
  timingsFor,
  TEAR_SHAKE_PX,
  type PackPhase,
  type PackTimings,
} from "@/lib/pack-animation";

/** `revealed` = sous-état local : la carte a fini de se retourner. */
type Stage = PackPhase | "revealed";

export type PackOpeningProps = {
  packType: PackType;
  /** Effectue le tirage. Appelé une seule fois, au moment où la déchirure aboutit. */
  onDraw: () => DrawnCard[];
  onClose: () => void;
  onError: (message: string) => void;
};

/** Petits délais chaînés, tous annulés au démontage. */
function useScheduler() {
  const ids = useRef<number[]>([]);
  const frames = useRef<number[]>([]);
  const schedule = useCallback((callback: () => void, ms: number) => {
    const id = window.setTimeout(callback, Math.max(0, ms));
    ids.current.push(id);
    return id;
  }, []);
  const frame = useCallback((callback: FrameRequestCallback) => {
    const id = requestAnimationFrame(callback);
    frames.current.push(id);
    return id;
  }, []);
  useEffect(
    () => () => {
      ids.current.forEach((id) => clearTimeout(id));
      frames.current.forEach((id) => cancelAnimationFrame(id));
      ids.current = [];
      frames.current = [];
    },
    [],
  );
  return { schedule, frame };
}

export function PackOpening({ packType, onDraw, onClose, onError }: PackOpeningProps) {
  // Appelé avant tout `return` conditionnel : les hooks doivent s'exécuter dans
  // le même ordre à chaque rendu, que Unity soit là ou non.
  const unityDetected = useUnityBuildAvailable();
  const reducedMotion = usePrefersReducedMotion();
  const timings = useMemo<PackTimings>(() => timingsFor(reducedMotion), [reducedMotion]);
  const { schedule, frame } = useScheduler();

  const [stage, setStageState] = useState<Stage>("sealed");
  const [cards, setCards] = useState<DrawnCard[]>([]);
  const [index, setIndexState] = useState(0);
  const [revealedCount, setRevealedCount] = useState(0);
  const [particles, setParticles] = useState(false);
  // Dès qu'un build Unity échoue à démarrer, on bascule définitivement en web :
  // pas de nouvelle tentative de contexte WebGL à chaque rendu.
  const [unityFailed, setUnityFailed] = useState(false);
  const unityStatus = unityFailed ? "absent" : unityDetected;

  // Refs synchrones : les gestes peuvent se déclencher deux fois dans le même
  // tick (tilt + balayage), il faut donc verrouiller sans attendre le render.
  const stageRef = useRef<Stage>("sealed");
  const indexRef = useRef(0);
  const tearRef = useRef(0);
  const timingsRef = useRef(timings);
  // Les handlers de geste lisent les durées au moment du geste, pas au render.
  useEffect(() => {
    timingsRef.current = timings;
  });

  const rootRef = useRef<HTMLDivElement | null>(null);
  const packRef = useRef<HTMLDivElement | null>(null);
  const pileRef = useRef<HTMLDivElement | null>(null);

  const setStage = useCallback((next: Stage) => {
    stageRef.current = next;
    setStageState(next);
  }, []);
  const setIndex = useCallback((next: number) => {
    indexRef.current = next;
    setIndexState(next);
  }, []);

  const pack = PACKS[packType];
  const current = cards[index];
  const currentCreator = current ? CREATOR_BY_SLUG.get(current.creatorSlug) : undefined;
  const isLastCard = cards.length > 0 && index === cards.length - 1;

  /* ------------------------------------------------------------------ *
   * Focus clavier à l'ouverture.
   * ------------------------------------------------------------------ */
  useEffect(() => {
    rootRef.current?.focus();
  }, []);

  /* ------------------------------------------------------------------ *
   * Déchirure du pack.
   * ------------------------------------------------------------------ */
  const paintTear = useCallback((value: number) => {
    const node = packRef.current;
    if (!node) return;
    node.style.setProperty("--tear", value.toFixed(4));
    node.style.setProperty("--shake-amp", (TEAR_SHAKE_PX * value).toFixed(2));
    node.style.setProperty("--tear-clip", tearClipPath(value));
    node.style.setProperty("--tear-base-clip", tearBaseClipPath(value));
  }, []);

  const completeTear = useCallback(() => {
    if (stageRef.current !== "sealed" && stageRef.current !== "tearing") return;
    let drawn: DrawnCard[];
    try {
      drawn = onDraw();
    } catch (caught) {
      onError(caught instanceof Error ? caught.message : "Ouverture impossible.");
      onClose();
      return;
    }
    // La meilleure carte est révélée en dernier : c'est elle qui a droit au
    // retournement lent.
    setCards(revealOrder(drawn));
    setRevealedCount(0);
    setIndex(0);
    setStage("burst");
    const node = packRef.current;
    if (node) {
      node.style.setProperty("--tear", "1");
      node.style.setProperty("--tear-clip", tearClipPath(1));
      node.style.setProperty("--tear-base-clip", tearBaseClipPath(1));
    }
    schedule(() => setStage("pile"), timingsRef.current.burst + timingsRef.current.pileSettle);
  }, [onDraw, onClose, onError, schedule, setIndex, setStage]);

  /** Ramène le rabat à plat quand le geste est relâché trop tôt. */
  const snapBack = useCallback(() => {
    const from = tearRef.current;
    if (from <= 0) return;
    const startedAt = performance.now();
    const duration = Math.max(1, timingsRef.current.tearSnapBack);
    const tick = (now: number) => {
      const t = Math.min(1, (now - startedAt) / duration);
      const value = from * (1 - easeOutCubic(t));
      tearRef.current = value;
      paintTear(value);
      if (t < 1) frame(tick);
    };
    frame(tick);
  }, [frame, paintTear]);

  const packGesture = usePointerGesture({
    axis: "y",
    disabled: stage !== "sealed" && stage !== "tearing",
    onStart: () => setStage("tearing"),
    onMove: (snapshot) => {
      // Le doigt monte : `dy` est négatif.
      const progress = tearProgress(-snapshot.dy, snapshot.height);
      tearRef.current = progress;
      paintTear(progress);
    },
    onEnd: (end) => {
      if (end.isTap || tearCompletes(tearRef.current, end.velocity)) {
        completeTear();
      } else {
        setStage("sealed");
        snapBack();
      }
    },
  });

  /* ------------------------------------------------------------------ *
   * Balayage de la carte du dessus.
   * ------------------------------------------------------------------ */
  const paintSwipe = useCallback((deltaPx: number, widthPx: number) => {
    const node = pileRef.current;
    if (!node) return;
    const progress = swipeProgress(deltaPx, widthPx);
    node.style.setProperty("--drag-x", `${Math.round(deltaPx)}px`);
    node.style.setProperty("--drag-rot", `${swipeRotation(progress).toFixed(2)}deg`);
    node.style.setProperty("--drag-lift", `${(Math.abs(progress) * 12).toFixed(1)}px`);
  }, []);

  const resetSwipe = useCallback(() => {
    const node = pileRef.current;
    if (!node) return;
    node.style.setProperty("--drag-x", "0px");
    node.style.setProperty("--drag-rot", "0deg");
    node.style.setProperty("--drag-lift", "0px");
  }, []);

  const revealTop = useCallback(() => {
    if (stageRef.current !== "pile") return;
    const card = cards[indexRef.current];
    if (!card) return;
    const slow = isRareOrBetter(card.rarity);
    const slowState: Stage = slow ? "rare-flip" : "revealing";
    const otherState: Stage = slow ? "revealing" : "rare-flip";
    setStage(slowState);
    if (slow) setParticles(true);
    resetSwipe();
    const active = timingsRef.current;
    const flipMs = flipDurationMs(card, active);
    // La carte sort d'abord de la pile, puis se retourne en vol.
    // Chaque transition est re-vérifiée au moment où elle expire : si le joueur
    // a passé la carte entre-temps, elle ne doit plus rien changer.
    schedule(() => {
      if (stageRef.current !== slowState && stageRef.current !== otherState) return;
      setRevealedCount((current) => Math.max(current, indexRef.current + 1));
    }, active.cardLift);
    schedule(() => {
      if (stageRef.current !== slowState && stageRef.current !== otherState) return;
      setStage("revealed");
    }, active.cardLift + flipMs);
  }, [cards, resetSwipe, schedule, setStage]);

  const pileGesture = usePointerGesture({
    axis: "x",
    // La carte du dessus capture déjà le pointeur pour son inclinaison : si le
    // conteneur capturait aussi, les `pointermove` n'atteindraient plus la carte.
    capture: false,
    disabled: stage !== "pile" || cards.length === 0,
    onMove: (snapshot) => paintSwipe(snapshot.dx, snapshot.width),
    onEnd: (end) => {
      if (end.cancelled) {
        resetSwipe();
        return;
      }
      const progress = swipeProgress(end.dx, end.width);
      if (end.isTap || swipeReveals(progress, end.velocity)) {
        revealTop();
      } else {
        resetSwipe();
      }
    },
  });

  /* ------------------------------------------------------------------ *
   * Navigation entre les cartes.
   * ------------------------------------------------------------------ */
  const goToNextCard = useCallback(() => {
    if (stageRef.current !== "revealed") return;
    if (indexRef.current >= cards.length - 1) {
      setParticles(false);
      setStage("summary");
      return;
    }
    setParticles(false);
    setIndex(indexRef.current + 1);
    setStage("pile");
  }, [cards.length, setIndex, setStage]);

  const skipToSummary = useCallback(() => {
    if (!cards.length) {
      // Rien n'a encore été tiré : on force la déchirure plutôt que de perdre
      // le booster déjà affiché à l'écran.
      completeTear();
      return;
    }
    setParticles(false);
    setRevealedCount(cards.length);
    setIndex(cards.length - 1);
    setStage("summary");
  }, [cards.length, completeTear, setIndex, setStage]);

  const handleClose = useCallback(() => {
    setParticles(false);
    onClose();
  }, [onClose]);

  /* ------------------------------------------------------------------ *
   * Repli : si un build Unity est présent, il pilote la cinématique.
   * Sans build (cas normal), on passe directement sur l'implémentation web.
   * ------------------------------------------------------------------ */
  if (unityStatus === "checking") {
    return (
      <div className="pack-cinema stage-sealed" role="dialog" aria-modal="true" aria-label="Ouverture du booster">
        <div className="pack-cinema-ambient" aria-hidden="true" />
        <p className="pack-cinema-hint" style={{ margin: "auto" }}>
          Préparation de l&apos;ouverture…
        </p>
      </div>
    );
  }
  if (unityStatus === "available") {
    return (
      <UnityPackOpening
        packType={packType}
        onDraw={onDraw}
        onClose={onClose}
        onError={onError}
        onUnavailable={() => setUnityFailed(true)}
      />
    );
  }

  const stageHint = (() => {
    switch (stage) {
      case "sealed":
      case "tearing":
        return "Glisse le doigt vers le haut pour déchirer le pack";
      case "burst":
        return "";
      case "pile":
        return "Balaie la carte du dessus pour la révéler";
      case "revealing":
      case "rare-flip":
        return "";
      case "revealed":
        return currentCreator ? `#${currentCreator.rank} · ${currentCreator.category}` : "";
      case "summary":
        return `${pack.size} cartes ajoutées au classeur`;
      default:
        return "";
    }
  })();

  const showPack = stage === "sealed" || stage === "tearing" || stage === "burst";
  const showPile = cards.length > 0 && stage !== "summary";
  // Le nom n'apparaît qu'une fois le retournement terminé : l'afficher pendant
  // le flip gâcherait la surprise de la carte rare.
  const showName = stage === "revealed" && Boolean(currentCreator);

  return (
    <div
      ref={rootRef}
      className={`pack-cinema stage-${stage} rarity-${current?.rarity ?? "common"}`}
      role="dialog"
      aria-modal="true"
      aria-label={`Ouverture du booster ${pack.label}`}
      tabIndex={-1}
    >
      <div className={`pack-cinema-ambient pack-${packType}`} aria-hidden="true" />

      <header className="pack-cinema-header">
        <span>
          {cards.length ? `${Math.min(index + 1, cards.length)} / ${cards.length}` : pack.label}
        </span>
        <div className="pack-cinema-dots" aria-hidden="true">
          {cards.map((card, dotIndex) => (
            <i key={card.id} className={dotIndex < revealedCount ? "done" : ""} />
          ))}
        </div>
        <button type="button" onClick={handleClose} aria-label="Fermer l'ouverture">
          <X size={20} />
        </button>
      </header>

      {stage === "summary" ? (
        <section className="pack-summary" aria-label="Récapitulatif du booster">
          <h2>{pack.label}</h2>
          <p className="pack-summary-gain">
            +{pack.points} points · +{pack.xp} XP
          </p>
          <ul className="pack-summary-grid">
            {cards.map((card, cardIndex) => {
              const creator = CREATOR_BY_SLUG.get(card.creatorSlug);
              if (!creator) return null;
              return (
                <li
                  key={card.id}
                  className={`pack-summary-item rarity-${card.rarity}`}
                  style={{ animationDelay: `${summaryDelayMs(cardIndex, timings)}ms` }}
                >
                  <CreatorCard creator={creator} variant={card.variant} compact />
                  {card.isNew ? (
                    <span className="pack-summary-new">
                      <Sparkles size={9} /> NEW
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ) : (
        <div className="pack-cinema-stage">
          {showPack ? (
            <div
              ref={packRef}
              className="pack-tear-wrap"
              style={
                {
                  "--tear": "0",
                  "--shake-amp": "0",
                  "--tear-clip": tearClipPath(0),
                  "--tear-base-clip": tearBaseClipPath(0),
                  "--burst-ms": `${timings.burst}ms`,
                  "--settle-ms": `${timings.pileSettle}ms`,
                } as React.CSSProperties
              }
              {...packGesture.handlers}
            >
              <div className="pack-tear-inside" aria-hidden="true" />
              <div className="pack-tear-base">
                <PackArtwork packType={packType} />
              </div>
              <div className="pack-tear-flap" aria-hidden="true">
                <PackArtwork packType={packType} />
              </div>
              <div className="pack-tear-seam" aria-hidden="true" />
              <p className="pack-tear-hint">
                <Hand size={15} />
                Glisse vers le haut
              </p>
            </div>
          ) : null}

          {showPile ? (
            <div ref={pileRef} className="card-pile" {...pileGesture.handlers}>
              {cards.map((card, cardIndex) => {
                const creator = CREATOR_BY_SLUG.get(card.creatorSlug);
                if (!creator) return null;
                const slot = pileSlot(cardIndex, index);
                const isActive = cardIndex === index;
                const collected = cardIndex < index;
                const faceUp = cardIndex < revealedCount;
                const slow = isActive && isRareOrBetter(card.rarity);
                return (
                  <div
                    key={card.id}
                    className={[
                      "card-pile-slot",
                      isActive ? "is-active" : "",
                      collected ? "is-collected" : "",
                      slot.hidden ? "is-hidden" : "",
                      slow ? "is-rare" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    style={
                      {
                        "--slot-x": `${slot.x}px`,
                        "--slot-y": `${slot.y}px`,
                        "--slot-z": `${slot.z}px`,
                        "--slot-rot": `${slot.rotate}deg`,
                        "--slot-scale": slot.scale.toFixed(3),
                        "--flip-ms": `${flipDurationMs(card, timings)}ms`,
                        "--lift-ms": `${timings.cardLift}ms`,
                        "--stagger": `${cardIndex * 55}`,
                        zIndex: 100 - cardIndex,
                      } as React.CSSProperties
                    }
                  >
                    <div className="card-pile-drag">
                      <Card3D
                        rarity={card.rarity}
                        variant={card.variant}
                        faceUp={faceUp}
                        mode="free"
                        tilt={!collected}
                        onFlip={isActive && stage === "pile" ? revealTop : undefined}
                        flipDurationMs={flipDurationMs(card, timings)}
                        flipLabel={`Révéler ${creator.displayName}`}
                        className="pile-card"
                        face={<CreatorCard creator={creator} variant={card.variant} />}
                      />
                      {isActive && particles ? (
                        <ParticleBurst
                          intensity={effectIntensity(card.rarity, card.variant)}
                          color={RARITY_META[card.rarity].color}
                          durationMs={timings.rareParticles}
                          running={particles}
                        />
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}

          {showName && current ? (
            <div className="reveal-name">
              <p>
                #{currentCreator?.rank} · {RARITY_META[current.rarity].label}
                {current.variant !== "standard" ? ` · ${current.variant}` : ""}
              </p>
              <h2>{currentCreator?.displayName}</h2>
              {current.isNew ? (
                <span className="new-badge">
                  <Sparkles size={12} /> NOUVELLE CARTE
                </span>
              ) : (
                <span>Déjà dans ton classeur</span>
              )}
            </div>
          ) : null}
        </div>
      )}

      <footer className="pack-cinema-footer">
        <p className="pack-cinema-hint" aria-live="polite">
          {stageHint}
        </p>
        {/*
          Chaque phase a toujours une action primaire atteignable au clavier :
          le geste au doigt est la façon amusante de faire, pas la seule.
        */}
        {stage === "sealed" || stage === "tearing" ? (
          <button type="button" className="primary-action pack-cinema-next" onClick={completeTear}>
            <span>Ouvrir d&apos;un coup</span>
            <FastForward size={18} />
          </button>
        ) : null}
        {stage === "pile" ? (
          <button type="button" className="primary-action pack-cinema-next" onClick={revealTop}>
            <span>Révéler la carte</span>
            <ChevronRight size={18} />
          </button>
        ) : null}
        {stage === "revealing" || stage === "rare-flip" ? (
          <button type="button" className="primary-action pack-cinema-next" disabled>
            <span>{stage === "rare-flip" ? "Retournement rare…" : "Retournement…"}</span>
            <LoaderCircle className="spin" size={16} />
          </button>
        ) : null}
        {stage === "revealed" ? (
          <button type="button" className="primary-action pack-cinema-next" onClick={goToNextCard}>
            <span>{isLastCard ? "Voir le récapitulatif" : "Carte suivante"}</span>
            <ChevronRight size={18} />
          </button>
        ) : null}
        {stage === "summary" ? (
          <button type="button" className="primary-action pack-cinema-next" onClick={handleClose}>
            <span>Ranger dans le classeur</span>
            <BookOpen size={18} />
          </button>
        ) : null}
        {stage === "pile" || stage === "revealing" || stage === "rare-flip" ? (
          <button type="button" className="secondary-action" onClick={skipToSummary}>
            <FastForward size={15} />
            <span>Passer au récapitulatif</span>
          </button>
        ) : null}
      </footer>
    </div>
  );
}

