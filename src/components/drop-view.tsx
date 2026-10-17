"use client";

/** Le Drop défile librement ; seul un appui prépare la scène de déchirure. */
import { useMemo, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { ChevronRight, Clock3, Coins, Gavel, Hourglass, Layers3, LoaderCircle, Swords, Users, Zap } from "lucide-react";

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
import { arenaDraftWindow } from "@/lib/arena";
import { craftableRetired } from "@/lib/retired";
import { type GameView } from "@/lib/game-engine";
import { buzz } from "@/lib/haptics";
import { useCircle } from "@/lib/circle-store";
import { CircleStrip } from "@/components/circle-strip";

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
  onShowArena,
  onOpenScene,
  onShowTribunal,
  tribunalRestants,
  tribunalClose,
  tribunalPaid = false,
  opening,
  usingHourglass,
  sceneBusy,
  now,
  serverReserve,
  needsAccount,
  tutorialAvailable = false,
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
  const latest = [...game.cards].sort((a, b) => b.obtainedAt - a.obtainedAt).slice(0, lean ? 5 : 4);
  const dailyMission = (game.stats.openings > 0 ? game.missions.find((mission) => mission.id === "tribunal" && !mission.done) : null)
    ?? game.missions.find((mission) => !mission.done)
    ?? game.missions.find((mission) => mission.done && !mission.claimed)
    ?? null;

  const retiredLeft = useMemo(
    () =>
      craftableRetired().filter(
        (creator) => !game.cards.some((card) => card.creatorSlug === creator.slug),
      ).length,
    [game.cards],
  );
  const live = useLive();
  const verifiedScene = cloud.sceneStatus?.userId === cloud.userId && cloud.sceneStatus?.day === gameDay(now)
    ? cloud.sceneStatus : null;
  const sceneReady = !cloud.configured ? !game.scene.opened : verifiedScene?.ready === true;
  const sceneOpened = !cloud.configured ? game.scene.opened : verifiedScene?.ready === false;

  const arenaNow = useNow(30_000);
  const arenaLine = useMemo(() => {
    if (!cloud.configured || !cloud.userId) return null;
    const pending = cloud.arenaMine?.pending.length ?? 0;
    if (pending > 0) {
      return {
        tone: "reward" as const,
        label:
          pending === 1
            ? "Une récompense d'arène t'attend"
            : `${pending} récompenses d'arène t'attendent`,
      };
    }
    const window = arenaDraftWindow(arenaNow);
    if (cloud.arenaMine?.draftOpen ?? window.open) {
      const left = Math.max(0, window.closesAt - arenaNow);
      const hours = Math.floor(left / 3_600_000);
      const minutes = Math.floor((left % 3_600_000) / 60_000);
      return {
        tone: "hot" as const,
        label: `Draft du week-end ouvert · ${hours} h ${String(minutes).padStart(2, "0")} min pour le boucler`,
      };
    }
    const entry = cloud.arenaMine?.entry;
    if (entry) {
      const rank = cloud.arenaMine?.rank;
      return {
        tone: "done" as const,
        label: `Ton arène : ${entry.score.toLocaleString("fr-FR")} viewers${rank ? ` · ${rank === 1 ? "1er" : `${rank}e`}` : ""}`,
      };
    }
    return {
      tone: "idle" as const,
      label: "Arène : aucune équipe cette semaine",
    };
  }, [cloud.configured, cloud.userId, cloud.arenaMine, arenaNow]);

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
            <span>Légendaire garanti {game.pity.remaining <= 1 ? "au prochain" : `dans ${game.pity.remaining} boosters`}</span>
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
        universes={lean ? ["live"] : undefined} />

      <section className="open-panel booster-panel" hidden={universe !== "live"} data-tutorial={needsAccount ? "true" : "false"}>
        <button
          className="primary-action"
          onClick={onOpen}
          disabled={cannotOpen}
        >
          {opening ? (
            <LoaderCircle className="spin" size={19} />
          ) : needsAccount ? (
            <Zap size={19} />
          ) : (
            <Zap size={19} />
          )}
          <span>
            {needsLogin ? "Se connecter pour ouvrir" : needsAccount ? "Essayer" : stock > 0 ? "Ouvrir le booster" : promoPacks > 0 ? "Ouvrir un booster de test" : "Recharge en cours"}
          </span>
          {needsAccount || stock > 0 || promoPacks > 0 ? <ChevronRight size={19} /> : null}
        </button>
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
      {lean ? (
        <CircleStrip circle={circle} owned={ownedSlugs} live={live} now={now} onOpenCollection={onShowCollection} />
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


      {/* Direct sous le CTA */}
      {featured ? (
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

      {!lean ? (
        <>
      {/* Priorités & Missions compactées sans doublon */}
      <section className="drop-priorities" aria-label="À jouer aujourd’hui">
        {dailyMission?.id === "tribunal" ? (
          <button
            type="button"
            className={`daily-goal tribunal-entry${tribunalClose ? " done" : ""}`}
            onClick={onShowTribunal}
            aria-label={
              tribunalPaid
                ? "Objectif du jour : Tribunal des Bannis (séance déjà récompensée, tu peux rejouer)"
                : tribunalClose
                ? "Objectif du jour : Tribunal des Bannis (séance close, bilan disponible)"
                : `Objectif du jour : Tribunal des Bannis (${tribunalRestants} dossier(s) en attente)`
            }
          >
            <Gavel size={20} />
            <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
              <span>OBJECTIF DU JOUR · TRIBUNAL</span>
              <strong>{dailyMission.label}</strong>
              <small>
                {tribunalPaid
                  ? "Séance déjà récompensée · tu peux rejouer"
                  : tribunalRestants > 0
                  ? `${tribunalRestants} dossier${tribunalRestants > 1 ? "s" : ""} en attente`
                  : dailyMission.done
                  ? "Terminé · récompense à réclamer"
                  : "Séance close · bilan disponible"}
              </small>
            </div>
            {tribunalRestants > 0 ? (
              <b className="tribunal-entry-badge" aria-label="Dossiers restants">{tribunalRestants}</b>
            ) : (
              <ChevronRight size={17} />
            )}
          </button>
        ) : (
          <>
            <button
              type="button"
              className="daily-goal"
              onClick={onShowMissions}
              aria-label="Voir l’objectif du jour"
            >
              <span>OBJECTIF DU JOUR</span>
              {dailyMission ? (
                <>
                  <strong>{dailyMission.label}</strong>
                  <small>
                    {dailyMission.done
                      ? "Terminé · récompense à réclamer"
                      : `${dailyMission.progress} / ${dailyMission.target}`}
                  </small>
                </>
              ) : (
                <>
                  <strong>Tes missions du jour sont terminées</strong>
                  <small>Reviens demain pour un nouvel objectif.</small>
                </>
              )}
              <ChevronRight size={17} />
            </button>
            <button
              type="button"
              className={`tribunal-entry tribunal-row${tribunalClose ? " done" : ""}`}
              onClick={onShowTribunal}
              aria-label={
                tribunalPaid
                  ? "Ouvrir le Tribunal des Bannis : séance déjà récompensée, tu peux rejouer"
                  : tribunalClose
                  ? "Ouvrir le Tribunal des Bannis : séance close, bilan disponible"
                  : `Ouvrir le Tribunal des Bannis : ${tribunalRestants} dossier(s) en attente`
              }
            >
              <Gavel size={20} />
              <span>
                <strong>Tribunal</strong> ·{" "}
                {tribunalPaid
                  ? "Séance déjà récompensée · tu peux rejouer"
                  : tribunalRestants > 0
                  ? `${tribunalRestants} dossier${tribunalRestants > 1 ? "s" : ""} en attente`
                  : "séance close, bilan disponible"}
              </span>
              {tribunalRestants > 0 ? (
                <b className="tribunal-entry-badge" aria-label="Dossiers restants">{tribunalRestants}</b>
              ) : null}
              <ChevronRight size={14} />
            </button>
          </>
        )}
      </section>

      {/* Paquet Scène avec statut neutre */}
      <section
        className={`scene-block${sceneOpened ? " done is-neutral" : ""}`}
        aria-label="Ton paquet de famille du jour"
        data-ready={sceneOpened ? "done" : sceneReady ? "true" : "false"}
      >
        <div className="scene-head">
          <div>
            <h2 tabIndex={-1} data-presentation-focus-fallback>{game.scene.label}</h2>
            <span>5 cartes de ta famille · 1 paquet par jour</span>
          </div>
          <span
            className={`scene-state${sceneOpened ? " scene-state-neutral is-neutral" : ""}`}
          >
            {sceneOpened ? "Ouvert aujourd’hui" : !cloud.configured || sceneReady ? "Disponible" : !cloud.userId ? "Compte requis" : cloud.sceneStatusLoading ? "Vérification…" : "À vérifier"}
          </span>
        </div>

        <p className="scene-purpose">Pas de Légendaire dans ce paquet.</p>
        {game.scene.family ? (
          <div className="scene-family">
            <div className="scene-family-copy">
              <strong>{game.scene.family.name}</strong>
              <span>
                {game.scene.family.owned}/{game.scene.family.total} découverts · il t&apos;en
                manque {game.scene.family.total - game.scene.family.owned}
              </span>
            </div>
            <div className="progress-track">
              <i
                style={{
                  width: `${Math.round(
                    (game.scene.family.owned / game.scene.family.total) * 100,
                  )}%`,
                }}
              />
            </div>
          </div>
        ) : (
          <span className="scene-empty">
            Aucune famille n&apos;est assez grande pour un paquet — le Live Drop reste là.
          </span>
        )}

        <button
          type="button"
          className={`scene-action${sceneOpened ? " is-opened" : ""}`}
          onClick={cloud.configured && cloud.userId && !sceneReady && !sceneOpened ? () => void cloudStore.packStatus() : onOpenScene}
          disabled={sceneBusy || opening || sceneOpened || cloud.sceneStatusLoading || !game.scene.family}
        >
          {sceneBusy ? (
            <LoaderCircle className="spin" size={17} />
          ) : sceneOpened ? (
            <Clock3 size={17} />
          ) : (
            <Layers3 size={17} />
          )}
          <span>
            {sceneBusy
              ? "Ouverture…"
              : sceneOpened
                ? "Déjà ouvert · demain matin"
                : cloud.configured && !cloud.userId ? "Se connecter pour ouvrir"
                  : cloud.configured && !sceneReady ? "Vérifier la disponibilité"
                    : `Ouvrir le ${game.scene.label}`}
          </span>
        </button>
      </section>

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

        </>
      ) : null}

      <details className="drop-secondary">
        <summary>{lean ? "Réserve, taux et sabliers" : "Progression, taux et activités"} <ChevronRight size={15} /></summary>
        {lean ? reserveControls : null}
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

        {arenaLine && !lean ? (
          <button
            type="button"
            className={`pity-row arena-row ${arenaLine.tone}`}
            onClick={onShowArena}
            aria-label={`Ouvrir l'arène : ${arenaLine.label}`}
          >
            <Swords size={14} />
            <span>{arenaLine.label}</span>
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
