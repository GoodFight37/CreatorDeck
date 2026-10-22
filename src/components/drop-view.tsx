"use client";

/** Le Drop défile librement ; seul un appui prépare la scène de déchirure. */
import { lazy, Suspense, useMemo, useRef, useState, type CSSProperties } from "react";
import { ChevronRight, Clock3, Coins, Hourglass, Users } from "lucide-react";

import "./drop-craft.css";
import { BoosterCarousel, type BoosterUniverse } from "@/components/booster-carousel";
export { PackArtwork } from "@/components/booster-carousel";
import { useMemeBooster } from "@/hooks/use-meme-booster";
import { MemeCollectionLink, MemePackComposition } from "@/components/meme-pack-parts";

// Chargé seulement à l'ouverture d'un booster Mèmes : l'accueil ne paie pas PackTear ni MemeReveal.
const MemeBoosterOpening = lazy(() => import("@/components/meme-booster-opening").then((m) => ({ default: m.MemeBoosterOpening })));

import { useCloud } from "@/hooks/use-cloud";
import { useLive } from "@/hooks/use-live";
import { CATALOG_EDITION_NUMBER, CATALOG_SIZE, CREATOR_BY_SLUG, PACKS, creatorImage } from "@/lib/catalog";
import { formatViewers } from "@/lib/live";
import { gameDay } from "@/lib/progression";
import { cloudStore } from "@/lib/cloud/cloud-store";
import { craftableRetired } from "@/lib/retired";
import { type GameView } from "@/lib/game-engine";
import { buzz } from "@/lib/haptics";
import { useCircle } from "@/lib/circle-store";
import { CircleStrip } from "@/components/circle-strip";
import { CircleLiveMoment } from "@/components/circle-live-moment";
import { circleLiveState } from "@/lib/circle-live";
import { circlePityPool } from "@/lib/game-engine";
import { missingCircle } from "@/lib/circle-draw";

/** L'heure du prochain sachet, comme une horloge : « 14 h 30 ». */
export function formatClock(date: number) {
  return new Date(date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }).replace(":", " h ");
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
  onUseHourglass: () => void;
  onShowOdds: () => void;
  onShowAtelier: () => void;
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
  // Un joueur qui a nommé ses chaînes voit l'accueil épuré : le sachet, une ligne, ses chaînes.
  const lean = circle.length > 0;
  // MEMES est un second paquet, visible à droite dès le départ ; Live reste devant.
  // D-142 : le Légendaire garanti viendra du cercle tant qu'une de ses Légendaires manque.
  const circlePity = lean && circlePityPool(circle, new Set<string>(), ownedSlugs).length > 0;
  const retiredLeft = useMemo(
    () =>
      craftableRetired().filter(
        (creator) => !game.cards.some((card) => card.creatorSlug === creator.slug),
      ).length,
    [game.cards],
  );
  // Étape 2 : qui, dans le cercle du joueur, est en direct maintenant.
  const circleLive = lean ? circleLiveState(circle, live, ownedSlugs, now) : null;
  const circleLiveEntries = circleLive?.kind === "live" ? circleLive.entries : [];
  const circleRow = useRef<HTMLDivElement>(null);
  const featured = topLive;
  const liveLabel = needsLogin ? "Se connecter pour ouvrir" : needsAccount ? "Essayer" : stock > 0 ? "Ouvrir le booster"
    : promoPacks > 0 ? "Ouvrir un booster de test" : nextAt !== null ? `Prochain sachet à ${formatClock(nextAt)}` : "Prochain sachet bientôt";
  const memeNextAt = memes.status?.nextAt ? Date.parse(memes.status.nextAt) : null;
  const memeLabel = !memes.account ? "Se connecter pour ouvrir MEMES" : memes.busy ? "Ouverture…"
    : !memes.status ? "Lecture de ta réserve…" : memes.status.stock < 1
      ? memeNextAt !== null ? `Prochain MEMES à ${formatClock(memeNextAt)}` : "Prochain MEMES bientôt" : "Ouvrir le booster MEMES";
  // Un seul geste ouvre : le sachet. Dessous, une ligne dit ce qu'on a et quand revient le prochain.
  const packs = stock + promoPacks;
  const reserveLine = needsLogin ? "Connecte-toi pour ouvrir"
    : packs > 0 ? `${packs} sachet${packs > 1 ? "s" : ""}${nextAt !== null && stock <= pack.max ? ` · prochain à ${formatClock(nextAt)}` : ""}`
    : nextAt !== null ? `Prochain sachet à ${formatClock(nextAt)}` : "Prochain sachet bientôt";

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

  return (
    <div className={`view home-view${lean ? " is-lean" : ""}`} style={themeStyle}>
      {haloImage ? (
        // Une lumière de plateau : le visage, flou et fort, couvre le haut de l'écran.
        <div className="stage-halo" aria-hidden="true" style={{ backgroundImage: `url(${haloImage})` }} />
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
        labels={{ live: liveLabel, memes: memeLabel }} />
      <section className="open-panel booster-panel" hidden={universe !== "live"} data-tutorial={needsAccount ? "true" : "false"}>
        {!needsAccount || needsLogin ? (
          // La seule ligne de l'accueil : la pile au-dessus montre déjà ce qu'on a.
          <p className="stock-row" data-empty={packs > 0 ? "false" : "true"}>{reserveLine}</p>
        ) : null}
        {!lean ? (
          <details className="drop-secondary-details">
            <summary>Plus d’infos</summary>
            {reserveControls}
          </details>
        ) : null}
      </section>
      {lean ? (
        // Les chaînes du joueur, sous le statut du booster : elles ne couvrent plus le sachet.
        <div ref={circleRow} tabIndex={-1} className="drop-circle-faces">
          <CircleStrip circle={circle} owned={ownedSlugs} live={live} now={now} onOpenCollection={onShowCollection} onEdit={onEditCircle} />
        </div>
      ) : null}
      {circleLiveEntries.length ? (
        <CircleLiveMoment
          entries={circleLiveEntries}
          now={now}
          canOpen={!needsAccount && (stock > 0 || promoPacks > 0)}
          nextPackLabel={!needsAccount && stock <= 0 && promoPacks <= 0 && nextAt !== null ? `à ${formatClock(nextAt)}` : null}
          hourglass={null}
        />
      ) : null}
      {lean && missingCircle(circle, ownedSlugs).length === 0 ? (
        <p role="status" className="drop-circle-complete">Ton cercle est complet. Les boosters s’ouvrent au classement.</p>
      ) : null}
      <section className="meme-booster-panel booster-panel" hidden={universe !== "memes"} aria-label="Réserve Mèmes">
        <p className="meme-booster-reserve stock-row" aria-live="polite">
          {memes.status ? memes.status.stock > 0
            ? `${memes.status.stock} MEMES${memeNextAt !== null ? ` · prochain à ${formatClock(memeNextAt)}` : ""}`
            : memeNextAt !== null ? `Prochain MEMES à ${formatClock(memeNextAt)}` : "Prochain MEMES bientôt"
            : memes.account ? "Lecture de ta réserve…" : "Une réserve séparée pour tes cartes MEMES."}
        </p>
        {memes.notice ? <p role="status">{memes.notice}</p> : null}
        {memes.problem ? <div role="alert"><p>{memes.problem}</p>
          <button type="button" disabled={memes.loading} onClick={() => void memes.refresh()}>Réessayer la lecture</button></div> : null}
        <MemePackComposition />
        <MemeCollectionLink />
      </section>
      {memes.presenting ? <Suspense fallback={null}><MemeBoosterOpening booster={memes} /></Suspense> : null}
      {!lean && onEditCircle ? (
        <section className="circle-invite" aria-labelledby="circle-invite-title">
          <div>
            <h2 id="circle-invite-title">Quelles chaînes regardes-tu ?</h2>
            <p>Ajoute les chaînes que tu regardes, une seule suffit : ton accueil et ton Binder se recentrent sur elles, et tu vois quand elles sont en direct.</p>
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

    </div>
  );
}
