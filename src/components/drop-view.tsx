"use client";

/**
 * Le Drop : **un** sachet, et rien qui s'empile dessus.
 *
 * Trois choses seulement sous le sachet — la rangée du cercle, la réserve et le
 * minuteur du prochain booster (avec le sablier, qui agit sur ce minuteur).
 * Tout le reste (missions du jour, série, Tribunal, Paquet Scène et les jalons
 * de collection) vit derrière **un seul** accès, vers l'écran Objectifs.
 *
 * Les univers Mèmes et Imgflip ne sont plus dans un carrousel ici : ils gardent
 * leur classeur (`/memes`), atteint depuis Objectifs.
 */
import { useMemo, useRef, type CSSProperties } from "react";
import { ChevronRight, Clock3, Hourglass, Target, Users } from "lucide-react";

import "./drop-craft.css";
import { BoosterCarousel } from "@/components/booster-carousel";
export { PackArtwork } from "@/components/booster-carousel";

import { useCloud } from "@/hooks/use-cloud";
import { useLive } from "@/hooks/use-live";
import { useNow } from "@/hooks/use-game";
import { CREATOR_BY_SLUG, PACKS, creatorImage } from "@/lib/catalog";
import { type GameView } from "@/lib/game-engine";
import { buzz } from "@/lib/haptics";
import { useCircle } from "@/lib/circle-store";
import { CircleStrip } from "@/components/circle-strip";
import { CircleLiveMoment } from "@/components/circle-live-moment";
import { circleLiveState } from "@/lib/circle-live";
import { missingCircle } from "@/lib/circle-draw";

/** L'heure du prochain sachet, comme une horloge : « 14 h 30 ». */
export function formatClock(date: number) {
  return new Date(date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }).replace(":", " h ");
}

/**
 * Le minuteur du prochain sachet. Il bat à la seconde, et **lui seul** : le
 * reste de l'accueil n'a pas à se redessiner soixante fois par minute.
 */
function PackTimer({ nextAt }: { nextAt: number | null }) {
  const now = useNow(1_000);
  if (nextAt === null) {
    return <p className="drop-timer" data-state="full">Réserve pleine</p>;
  }
  const left = Math.max(0, nextAt - now);
  const minutes = Math.floor(left / 60_000);
  const seconds = Math.floor((left % 60_000) / 1_000);
  return <p className="drop-timer" data-state="waiting">
    <Clock3 size={14} aria-hidden="true" />
    <span>Prochain sachet dans</span>{" "}
    <strong aria-label={`${minutes} minutes ${seconds} secondes`}>
      {minutes}:{String(seconds).padStart(2, "0")}
    </strong>
  </p>;
}

export function HomeView({
  game,
  themeStyle,
  onShowCollection,
  onOpen,
  onUseHourglass,
  opening,
  usingHourglass,
  now,
  serverReserve,
  needsAccount,
  tutorialAvailable = false,
  onEditCircle,
  onShowObjectives,
}: {
  game: GameView;
  themeStyle?: CSSProperties;
  onShowCollection: () => void;
  onOpen: () => void;
  onUseHourglass: () => void;
  opening: boolean;
  usingHourglass: boolean;
  now: number;
  serverReserve: boolean;
  needsAccount: boolean;
  tutorialAvailable?: boolean;
  /** Ouvrir « Mes chaînes » (définir ou modifier le cercle). */
  onEditCircle?: () => void;
  /** L'accès unique : missions, série, Tribunal, Paquet Scène, progression. */
  onShowObjectives: () => void;
}) {
  const cloud = useCloud();
  const pack = PACKS.live;
  const stock = game.player.packs;
  const promoPacks = cloud.configured && cloud.userId ? cloud.promoPacks : 0;
  const nextAt = game.player.nextPackAt;
  const needsLogin = needsAccount && !tutorialAvailable;
  const cannotOpen = opening || (!needsAccount && stock <= 0 && promoPacks <= 0);

  function prepareBooster() {
    if (opening || cannotOpen) return;
    buzz([8]);
    onOpen();
  }

  const circle = useCircle();
  const ownedSlugs = useMemo(() => new Set(game.cards.map((card) => card.creatorSlug)), [game.cards]);
  const live = useLive();
  // La lumière du plateau : le visage de la chaîne préférée, sinon celui du
  // direct le plus suivi. Rien d'inventé quand on ne connaît ni l'un ni l'autre.
  const topLive = useMemo(() => {
    if (live.stale || !live.count) return null;
    let top: { login: string; viewers: number } | null = null;
    for (const stream of live.byLogin.values()) {
      if (!top || stream.viewers > top.viewers) top = { login: stream.login, viewers: stream.viewers };
    }
    return top;
  }, [live]);
  const haloCreator = circle.length ? CREATOR_BY_SLUG.get(circle[0])
    : topLive ? [...CREATOR_BY_SLUG.values()].find((creator) => creator.login === topLive.login) : undefined;
  const haloImage = haloCreator ? creatorImage(haloCreator) : null;
  const circleLive = circleLiveState(circle, live, ownedSlugs, now);
  const circleLiveEntries = circleLive.kind === "live" ? circleLive.entries : [];
  const circleRow = useRef<HTMLDivElement>(null);
  const liveLabel = needsLogin ? "Se connecter pour ouvrir" : needsAccount ? "Essayer" : stock > 0 ? "Ouvrir le booster"
    : promoPacks > 0 ? "Ouvrir un booster de test" : nextAt !== null ? `Prochain sachet à ${formatClock(nextAt)}` : "Prochain sachet bientôt";
  const packs = stock + promoPacks;
  const reserveLine = needsLogin ? "Connecte-toi pour ouvrir"
    : packs > 0 ? `${packs} sachet${packs > 1 ? "s" : ""} en réserve` : "Aucun sachet en réserve";
  const hourglassDisabled = (serverReserve && needsAccount)
    || stock >= pack.maxWithHourglass || game.player.hourglasses <= 0 || usingHourglass;

  return (
    <div className="view home-view is-lean" style={themeStyle}>
      {haloImage ? (
        // Une lumière de plateau : le visage, flou et fort, couvre le haut de l'écran.
        <div className="stage-halo" aria-hidden="true" style={{ backgroundImage: `url(${haloImage})` }} />
      ) : null}
      <h1 className="sr-only">Drop</h1>

      {/* Un seul sachet, celui des créateurs : rien à faire glisser. */}
      <BoosterCarousel onPrepare={prepareBooster} disabled={opening} canPrepare={!cannotOpen} label={liveLabel} />

      {/* Sous le sachet, dans cet ordre : le cercle, la réserve, le minuteur. */}
      <div ref={circleRow} tabIndex={-1} className="drop-circle-faces">
        {circle.length ? (
          <CircleStrip circle={circle} owned={ownedSlugs} live={live} now={now}
            onOpenCollection={onShowCollection} onEdit={onEditCircle} />
        ) : onEditCircle ? (
          <button type="button" className="drop-circle-invite" onClick={onEditCircle}>
            <Users size={16} aria-hidden="true" />
            <span>Choisir mes chaînes</span>
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        ) : null}
      </div>
      {circleLiveEntries.length ? (
        <CircleLiveMoment
          entries={circleLiveEntries}
          now={now}
          canOpen={!needsAccount && (stock > 0 || promoPacks > 0)}
          nextPackLabel={!needsAccount && stock <= 0 && promoPacks <= 0 && nextAt !== null ? `à ${formatClock(nextAt)}` : null}
          hourglass={null}
        />
      ) : null}
      {circle.length > 0 && missingCircle(circle, ownedSlugs).length === 0 ? (
        <p role="status" className="drop-circle-complete">Ton cercle est complet. Les boosters s’ouvrent au classement.</p>
      ) : null}

      <section className="open-panel booster-panel" data-tutorial={needsAccount ? "true" : "false"}>
        <p className="stock-row" data-empty={packs > 0 ? "false" : "true"}>{reserveLine}</p>
        <div className="drop-reserve-row">
          <PackTimer nextAt={nextAt} />
          <button
            type="button"
            className="hourglass-action"
            onClick={onUseHourglass}
            disabled={hourglassDisabled}
            aria-label={usingHourglass ? "Utilisation du sablier" : `Utiliser 1 sablier, ${game.player.hourglasses} disponibles`}
          >
            <Hourglass size={15} aria-hidden="true" />
            <span>{usingHourglass ? "…" : "+15 min"}</span>
            <strong>{game.player.hourglasses}</strong>
          </button>
        </div>
      </section>

      {/* L'accès unique : tout le reste est derrière cette ligne. */}
      <button type="button" className="drop-hub-link" onClick={onShowObjectives}>
        <span className="drop-hub-icon" aria-hidden="true"><Target size={18} /></span>
        <span className="drop-hub-text">
          <strong>Objectifs et activités</strong>
          <small>Missions · série · autres activités</small>
        </span>
        <ChevronRight size={18} aria-hidden="true" />
      </button>

    </div>
  );
}
