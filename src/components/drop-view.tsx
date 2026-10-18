"use client";

/** Le Drop défile librement ; seul un appui prépare la scène de déchirure. */
import { useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { ChevronRight, Clock3, Coins, Hourglass, Layers3, LoaderCircle, Users, Zap } from "lucide-react";

import "./drop-craft.css";
import { BoosterCarousel, type BoosterUniverse } from "@/components/booster-carousel";
export { PackArtwork } from "@/components/booster-carousel";
import { useMemeBooster } from "@/hooks/use-meme-booster";
import { MemeBoosterOpening, MemeCollectionLink, MemePackComposition } from "@/components/meme-booster-opening";

import { CreatorCard } from "@/components/creator-card";
import { CardInspectModal } from "@/components/card-inspect-modal";
import { useBackHandler } from "@/hooks/use-back-handler";
import { usePresentationFocus } from "@/hooks/use-presentation-focus";
import { useCloud } from "@/hooks/use-cloud";
import { useNow } from "@/hooks/use-game";
import { useLive } from "@/hooks/use-live";
import { CATALOG_EDITION_NUMBER, CATALOG_SIZE, CREATOR_BY_SLUG, PACKS, creatorImage } from "@/lib/catalog";
import { formatViewers, liveFor } from "@/lib/live";
import { gameDay } from "@/lib/progression";
import { cloudStore } from "@/lib/cloud/cloud-store";
import { craftableRetired } from "@/lib/retired";
import { type GameView } from "@/lib/game-engine";
import { buzz } from "@/lib/haptics";
import { useCircle } from "@/lib/circle-store";
import { CircleStrip } from "@/components/circle-strip";
import { CircleLiveMoment } from "@/components/circle-live-moment";
import { circleLiveState, twitchUrl } from "@/lib/circle-live";
import { memesUnlocked, memesUnlockLine } from "@/lib/memes-unlock";
import { circlePityPool } from "@/lib/game-engine";
import { missingCircle } from "@/lib/circle-draw";

function formatCountdown(date: number | null, now: number) {
  if (!date) return "Réserve pleine";
  const remaining = Math.max(0, date - now);
  const hours = Math.floor(remaining / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1_000);
  return hours > 0
    ? `${hours}h ${String(minutes).padStart(2, "0")}m`
    : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function HomeView({
  game,
  themeStyle,
  friendsOpening,
  onShowInbox,
  onShowCollection,
  onOpen,
  onShowAccount,
  onUseHourglass,
  onShowOdds,
  onShowMissions,
  onShowAtelier,
  opening,
  usingHourglass,
  now,
  serverReserve,
  needsAccount,
  tutorialAvailable = false,
  onEditCircle,
}: {
  game: GameView;
  themeStyle?: CSSProperties;
  friendsOpening: number;
  onShowInbox: () => void;
  onShowCollection: () => void;
  onOpen: () => void;
  onShowAccount?: () => void;
  onOpenScene: () => void;
  sceneBusy: boolean;
  onUseHourglass: () => void;
  onShowOdds: () => void;
  onShowMissions: () => void;
  onShowAtelier: () => void;
  onShowArena: () => void;
  onShowTribunal: () => void;
  tribunalRestants: number;
  tribunalClose: boolean;
  tribunalPaid?: boolean;
  opening: boolean;
  usingHourglass: boolean;
  now: number;
  serverReserve: boolean;
  needsAccount: boolean;
  tutorialAvailable?: boolean;
  /** Ouvrir « Mes chaînes » (définir ou modifier le cercle). */
  onEditCircle?: () => void;
}) {
  const cloud = useCloud();
  const memes = useMemeBooster();
  const [universe, setUniverse] = useState<BoosterUniverse>("live");
  const pack = PACKS.live;
  const stock = game.player.packs;
  const promoPacks = cloud.configured && cloud.userId ? cloud.promoPacks : 0;
  const nextAt = game.player.nextPackAt;
  const tick = useNow(1_000);
  const needsLogin = needsAccount && !tutorialAvailable;
  const cannotOpen = opening || memes.busy || (!needsAccount && stock <= 0 && promoPacks <= 0);
  const memeCannotOpen = opening || memes.busy || (memes.account && (!memes.status || memes.status.stock < 1));

  function prepareBooster(kind: BoosterUniverse) {
    if (opening || memes.busy) return;
    buzz([8]);
    if (kind === "live" && !cannotOpen) onOpen();
    if (kind === "memes" && !memeCannotOpen) {
      if (!memes.account) onShowAccount?.();
      else memes.prepare();
    }
  }

  const [inspectCard, setInspectCard] = useState<GameView["cards"][number] | null>(null);
  useBackHandler(inspectCard !== null, () => setInspectCard(null));
  const findingFocus = usePresentationFocus(inspectCard !== null);
  const inspectedCreator = inspectCard ? CREATOR_BY_SLUG.get(inspectCard.creatorSlug) : null;
  const circle = useCircle();
  const ownedSlugs = useMemo(() => new Set(game.cards.map((card) => card.creatorSlug)), [game.cards]);
  const haloCreator = circle.length ? CREATOR_BY_SLUG.get(circle[0]) : undefined;
  const haloImage = haloCreator ? creatorImage(haloCreator) : null;
  // Un joueur qui a nommé ses chaînes voit l'accueil épuré : le pack, le bouton, ses cinq dernières cartes.
  const lean = circle.length > 0;
  // D-141 : un seul univers au début pour un joueur avec cercle ; MEMES arrive après 10 boosters.
  const showMemes = memesUnlocked(lean, game.stats.openings);
  // D-142 : le Légendaire garanti viendra du cercle tant qu'une de ses Légendaires manque.
  const circlePity = lean && circlePityPool(circle, new Set<string>(), ownedSlugs).length > 0;
  const latest = [...game.cards].sort((a, b) => b.obtainedAt - a.obtainedAt).slice(0, lean ? 5 : 4);
  const retiredLeft = useMemo(
    () =>
      craftableRetired().filter(
        (creator) => !game.cards.some((card) => card.creatorSlug === creator.slug),
      ).length,
    [game.cards],
  );
  const live = useLive();
  // Étape 2 : qui, dans le cercle du joueur, est en direct maintenant.
  const circleLive = lean ? circleLiveState(circle, live, ownedSlugs, now) : null;
  const circleLiveEntries = circleLive?.kind === "live" ? circleLive.entries : [];
  const circleRow = useRef<HTMLDivElement>(null);
  const emptyCircleReserve = lean && !needsAccount && stock <= 0 && promoPacks <= 0;
  const firstLive = circleLiveEntries[0];
  function showCircle() {
    circleRow.current?.scrollIntoView?.({ block: "center" });
    circleRow.current?.focus({ preventScroll: true });
  }
  const featured = useMemo(() => {
    if (live.stale || !live.count) return null;
    let top: { login: string; viewers: number } | null = null;
    for (const stream of live.byLogin.values()) {
      if (!top || stream.viewers > top.viewers) top = { login: stream.login, viewers: stream.viewers };
    }
    return top;
  }, [live]);

  const reserveControls = (
    <>
          <button type="button" className="pity-row now" onClick={onShowOdds}
            aria-label={`Voir les taux : Légendaire garanti ${game.pity.remaining <= 1 ? "au prochain booster" : `dans ${game.pity.remaining} boosters`}`}>
            <span>Légendaire garanti {game.pity.remaining <= 1 ? "au prochain" : `dans ${game.pity.remaining} boosters`}{circlePity ? " · une de tes chaînes" : ""}</span>
            <ChevronRight size={14} />
          </button>
          <button
            className="hourglass-action"
            onClick={onUseHourglass}
            disabled={(serverReserve && needsAccount) || stock >= pack.maxWithHourglass || game.player.hourglasses <= 0 || usingHourglass}
            aria-label={usingHourglass ? "Utilisation du sablier" : `Utiliser 1 sablier, ${game.player.hourglasses} disponibles`}
          >
            <Hourglass size={18} />
            <span>{usingHourglass ? "Utilisation…" : stock >= pack.max && stock < pack.maxWithHourglass
              ? "Utiliser 1 sablier · passer à 5/4"
              : "Utiliser 1 sablier · avancer de 15 min"}</span>
            <strong>{game.player.hourglasses}</strong>
          </button>
          {serverReserve && needsAccount ? (
            null
          ) : stock >= pack.maxWithHourglass ? (
            <small className="hourglass-note">Ouvre le booster bonus avant d’en utiliser un autre.</small>
          ) : stock > pack.max ? (
            <small className="hourglass-note">La recharge reprend après l’ouverture du booster bonus.</small>
          ) : game.player.hourglasses <= 0 ? (
            <small className="hourglass-note">Tu n’as pas de sablier disponible.</small>
          ) : null}

          {/* Étape 3 : dans le panneau unique de l'accueil épuré, les jetons sont une ligne, pas un second accordéon. */}
          {lean ? (
            <div className="token-row">
              <Coins size={14} />
              <span>
                <strong>{game.tokens.count}</strong> jetons · {game.tokens.missing > 0
                  ? `encore ${game.tokens.missing} pour une carte`
                  : "une carte au choix disponible"}
              </span>
            </div>
          ) : (
          <details className="drop-token-details">
            <summary>Jetons <strong>{game.tokens.count}</strong></summary>
            <div className="token-row">
              <Coins size={14} />
              <span>
                <strong>{game.tokens.count}</strong> jetons · {game.tokens.missing > 0
                  ? `encore ${game.tokens.missing} pour une carte`
                  : "une carte au choix disponible"}
              </span>
            </div>
          </details>
          )}
    </>
  );

  const findingsSection = (
      <section className="section-block drop-findings">
        <div className="section-heading">
          <div>
            <span className="drop-section-kicker">LES NOMS QUI RESTENT</span>
            <h2>Dernières trouvailles</h2>
          </div>
          <button type="button" className="drop-binder-link" onClick={onShowCollection}>Mon Binder <ChevronRight size={15} /></button>
        </div>
        {latest.length ? (
          <div className="mini-card-row">
            {latest.map((card) => {
              const creator = CREATOR_BY_SLUG.get(card.creatorSlug);
              return creator ? (
                <CreatorCard
                  key={card.id}
                  creator={creator}
                  variant={card.variant}
                  compact
                  onClick={() => setInspectCard(card)}
                  liveStream={liveFor(live, creator.login, now)}
                />
              ) : null;
            })}
          </div>
        ) : (
          <div className="empty-collection">
            <Layers3 size={25} />
            <div>
              <strong>Ton classeur de {CATALOG_SIZE} streameurs t’attend</strong>
              <span>Ouvre ton premier booster pour lancer la collection.</span>
            </div>
          </div>
        )}
      </section>
  );

  return (
    <div className={`view home-view${lean ? " is-lean" : ""}`} style={themeStyle}>
      {lean ? (
        // La chaîne préférée du joueur éclaire la scène : son visage, flou, derrière le pack.
        <div className="stage-halo" aria-hidden="true" style={haloImage ? { backgroundImage: `url(${haloImage})` } : undefined} />
      ) : null}
      {/* En-tête concis : zéro blabla marketing */}
      {lean ? <h1 className="sr-only">Drop</h1> : (
        <header className="drop-intro">
          <div className="drop-edition"><span>ÉDITION {String(CATALOG_EDITION_NUMBER).padStart(2, "0")}</span></div>
          <h1>Drop</h1>
        </header>
      )}

      <BoosterCarousel value={universe} onChange={setUniverse} onPrepare={prepareBooster}
        disabled={opening || memes.busy} canPrepare={universe === "live" ? !cannotOpen : !memeCannotOpen}
        universes={showMemes ? undefined : ["live"]} />

      <section className="open-panel booster-panel" hidden={universe !== "live"} data-tutorial={needsAccount ? "true" : "false"}>
        {emptyCircleReserve && firstLive ? (
          <a className="primary-action" href={twitchUrl(firstLive.creator.login)} target="_blank" rel="noopener noreferrer">
            <Zap size={19} aria-hidden="true" />
            <span>Voir {firstLive.creator.displayName} en direct</span>
            <ChevronRight size={19} aria-hidden="true" />
          </a>
        ) : <button
          className="primary-action"
          onClick={emptyCircleReserve ? showCircle : onOpen}
          disabled={emptyCircleReserve ? opening || memes.busy : cannotOpen}
        >
          {opening ? (
            <LoaderCircle className="spin" size={19} />
          ) : needsAccount ? (
            <Zap size={19} />
          ) : (
            <Zap size={19} />
          )}
          <span>
            {emptyCircleReserve ? "Personne de tes chaînes en direct" : needsLogin ? "Se connecter pour ouvrir" : needsAccount ? "Essayer" : stock > 0 ? "Ouvrir le booster" : promoPacks > 0 ? "Ouvrir un booster de test" : "Recharge en cours"}
          </span>
          {needsAccount || stock > 0 || promoPacks > 0 ? <ChevronRight size={19} /> : null}
        </button>}
        {!needsAccount ? (
          <div className="stock-row">
            <div>
              <span>Ta réserve</span>
              <strong>{stock}<small>/{pack.max}</small></strong>
            </div>
            {stock > pack.max ? <span className="reserve-bonus">+1 sablier</span> : null}
            {promoPacks > 0 ? (
              <span className="reserve-bonus" aria-label={`${promoPacks} boosters de test disponibles`}>
                {promoPacks} booster{promoPacks === 1 ? "" : "s"} de test
              </span>
            ) : null}
            {nextAt !== null ? (
              <div className="timer-copy"><Clock3 size={14} /><span>{stock > pack.max ? "Recharge après ouverture · " : "+1 dans "}{formatCountdown(nextAt, tick)}</span></div>
            ) : null}
          </div>
        ) : null}
        {!lean ? (
          <details className="drop-secondary-details">
            <summary>Plus d’infos</summary>
            {reserveControls}
          </details>
        ) : null}
      </section>
      {circleLiveEntries.length ? (
        <CircleLiveMoment
          entries={circleLiveEntries}
          now={tick}
          canOpen={!needsAccount && (stock > 0 || promoPacks > 0)}
          nextPackLabel={!needsAccount && stock <= 0 && promoPacks <= 0 && nextAt !== null ? `dans ${formatCountdown(nextAt, tick)}` : null}
          hourglass={null}
        />
      ) : null}
      {lean ? (
        <>
          {missingCircle(circle, ownedSlugs).length === 0 ? (
            <p role="status">Ton cercle est complet. Les boosters s’ouvrent au classement.</p>
          ) : null}
          <div ref={circleRow} tabIndex={-1}>
            <CircleStrip circle={circle} owned={ownedSlugs} live={live} now={now} onOpenCollection={onShowCollection} onEdit={onEditCircle} />
          </div>
        </>
      ) : null}
      {lean ? findingsSection : null}
      <section className="meme-booster-panel booster-panel" hidden={universe !== "memes"} aria-label="Réserve Mèmes">
        <button className="primary-action" type="button" disabled={memeCannotOpen}
          onClick={() => prepareBooster("memes")}>
          <Zap size={19} aria-hidden="true" />
          <span>{!memes.account ? "Se connecter pour ouvrir" : memes.busy ? "Ouverture…"
            : !memes.status ? "Lecture de ta réserve…" : memes.status.stock < 1 ? "Recharge en cours" : "Ouvrir le booster MEMES"}</span>
          <ChevronRight size={19} aria-hidden="true" />
        </button>
        <div className="meme-booster-reserve" aria-live="polite">
          {memes.status ? <><strong>Ta réserve MEMES · {memes.status.stock}/4</strong>
            <span>{memes.status.nextAt ? "+1 dans " + formatCountdown(Date.parse(memes.status.nextAt), tick) : "Réserve pleine"}</span></>
            : <span>{memes.account ? "Lecture de ta réserve…" : "Une réserve séparée pour tes cartes MEMES."}</span>}
        </div>
        {memes.notice ? <p role="status">{memes.notice}</p> : null}
        {memes.problem ? <div role="alert"><p>{memes.problem}</p>
          <button type="button" disabled={memes.loading} onClick={() => void memes.refresh()}>Réessayer la lecture</button></div> : null}
        <MemePackComposition />
        <MemeCollectionLink />
      </section>
      <MemeBoosterOpening booster={memes} />
      {!lean && onEditCircle ? (
        <section className="circle-invite" aria-labelledby="circle-invite-title">
          <div>
            <h2 id="circle-invite-title">Quelles chaînes regardes-tu ?</h2>
            <p>Nomme 5 à 15 chaînes : ton accueil et ton Binder se recentrent sur elles, et tu vois quand elles sont en direct.</p>
          </div>
          <button type="button" onClick={onEditCircle}>Définir mes chaînes <ChevronRight size={16} aria-hidden="true" /></button>
        </section>
      ) : null}


      {/* Direct sous le CTA (le moment du cercle le remplace quand une de ses chaînes streame) */}
      {featured && !circleLiveEntries.length ? (
        <button
          type="button"
          className="live-bar"
          onClick={onShowOdds}
          aria-label={`${live.count} créateurs en direct. Bonus Direct actif : voir les taux publiés.`}
        >
          <i aria-hidden="true" />
          <span className="live-bar-tag">En direct</span>
          <span className="live-bar-who">
            {live.count} sur {CATALOG_SIZE}
            {` · @${featured.login}`}
            {featured.viewers > 0 ? ` ${formatViewers(featured.viewers)}` : ""}
          </span>
          <span className="live-bar-boost">Bonus Direct</span>
        </button>
      ) : null}

      {friendsOpening > 0 ? (
        <button
          type="button"
          className="pity-row friends-row"
          onClick={onShowInbox}
          aria-label={`Ouvrir le carnet : ${friendsOpening} ami${
            friendsOpening > 1 ? "s ont" : " a"
          } ouvert un booster il y a moins d'une heure`}
        >
          <Users size={14} />
          <span>
            {friendsOpening} ami{friendsOpening > 1 ? "s ont" : " a"} ouvert un booster · moins
            d&apos;une heure
          </span>
          <ChevronRight size={14} />
        </button>
      ) : null}

      <details className="drop-secondary">
        <summary>{lean ? "Réserve, taux et sabliers" : "Progression, taux et activités"} <ChevronRight size={15} /></summary>
        {lean ? reserveControls : null}
        {!showMemes ? <p className="memes-unlock-note">{memesUnlockLine(game.stats.openings)}</p> : null}
        <button type="button" className="text-link" onClick={onShowMissions}>Objectifs et saisons <ChevronRight size={15} /></button>
        <button type="button" className="text-link" onClick={onShowOdds}>Taux officiels <ChevronRight size={15} /></button>
        {retiredLeft > 0 ? (
          <button
            type="button"
            className="pity-row retired-row"
            onClick={onShowAtelier}
            aria-label={`Ouvrir l'Atelier : ${retiredLeft} Sortant${
              retiredLeft > 1 ? "s" : ""
            } encore artisanable${retiredLeft > 1 ? "s" : ""} cette édition`}
          >
            <Clock3 size={14} />
            <span>
              {retiredLeft} Sortant{retiredLeft > 1 ? "s" : ""} encore artisanable
              {retiredLeft > 1 ? "s" : ""} · dernière édition
            </span>
            <ChevronRight size={14} />
          </button>
        ) : null}

      </details>

      {!lean ? findingsSection : null}
      {inspectCard && inspectedCreator ? createPortal(
        <div ref={findingFocus} tabIndex={-1}>
          <CardInspectModal creator={inspectedCreator} variant={inspectCard.variant}
            ownedCount={game.cards.filter((card) => card.creatorSlug === inspectCard.creatorSlug && card.variant === inspectCard.variant).length}
            liveStream={liveFor(live, inspectedCreator.login, now)} onClose={() => setInspectCard(null)} />
        </div>, document.body
      ) : null}
    </div>
  );
}
