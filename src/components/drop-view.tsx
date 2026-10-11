"use client";

/** Le Drop défile librement ; seul un appui prépare la scène de déchirure. */
import { useMemo, useRef, useState, type MouseEvent } from "react";
import Image from "next/image";
import { createPortal } from "react-dom";
import { ChevronRight, CircleUserRound, Clock3, Coins, Gavel, Hourglass, Layers3, LoaderCircle, Swords, Users, Zap } from "lucide-react";

import { CreatorCard } from "@/components/creator-card";
import { CardInspectModal } from "@/components/card-inspect-modal";
import { useBackHandler } from "@/hooks/use-back-handler";
import { usePresentationFocus } from "@/hooks/use-presentation-focus";

import { useCloud } from "@/hooks/use-cloud";

import { useNow } from "@/hooks/use-game";

import { useLive } from "@/hooks/use-live";
import { CATALOG_EDITION_NUMBER, CATALOG_SIZE, CREATOR_BY_SLUG, PACKS } from "@/lib/catalog";

import { formatViewers, liveFor } from "@/lib/live";

import { gameDay } from "@/lib/progression";
import { cloudStore } from "@/lib/cloud/cloud-store";
import { arenaDraftWindow } from "@/lib/arena";
import { craftableRetired } from "@/lib/retired";


import { type GameView } from "@/lib/game-engine";


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


export function PackArtwork({ onClick, disabled }: { onClick: (event: MouseEvent<HTMLButtonElement>) => void; disabled: boolean }) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const dragged = useRef(false);
  return (
    <button type="button" className="pack-artwork pack-live"
      onPointerDown={(event) => {
        start.current = { x: event.clientX, y: event.clientY };
        dragged.current = false;
      }}
      onPointerMove={(event) => {
        if (start.current && Math.hypot(event.clientX - start.current.x, event.clientY - start.current.y) > 8) {
          dragged.current = true;
        }
      }}
      onPointerUp={() => { start.current = null; }}
      onPointerCancel={() => { start.current = null; dragged.current = true; }}
      onClick={(event) => {
        // Le navigateur garde le scroll ; ignorer aussi le clic issu d'un glissement.
        // Une activation clavier (detail = 0) reste toujours disponible.
        if (event.detail > 0 && dragged.current) return;
        onClick(event);
      }}
      disabled={disabled} aria-label="Ouvrir le sachet Live Drop">
      <span className="pack-3d-object" aria-hidden="true">
        <span className="pack-3d-side pack-3d-side-left" />
        <span className="pack-3d-side pack-3d-side-right" />
        <span className="pack-3d-side pack-3d-side-bottom" />
        <span className="pack-3d-front">
          <Image
            className="pack-foil-image"
            src="/packs/live-foil.svg"
            alt=""
            fill
            sizes="(max-width: 390px) 46vw, 180px"
            draggable={false}
            priority
          />
          <span className="pack-specular" />
        </span>
      </span>
    </button>
  );
}

export function HomeView({
  game,
  friendsOpening,
  onShowInbox,
  onShowCollection,
  onOpen,
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
  /** Combien d'amis ont ouvert un booster dans l'heure (0 = rien à dire). */
  friendsOpening: number;
  /** La ligne des amis ouvre le carnet, qui porte les ouvertures en détail. */
  onShowInbox: () => void;
  onShowCollection: () => void;
  onOpen: () => void;
  onOpenScene: () => void;
  sceneBusy: boolean;
  onUseHourglass: () => void;
  onShowOdds: () => void;
  onShowMissions: () => void;
  /** Les Sortants : la ligne d'accueil mène à l'Atelier. */
  onShowAtelier: () => void;
  /** La ligne d'arène mène à l'écran Arène (dépôt, draft, classement). */
  onShowArena: () => void;
  /** Ouvre le Tribunal des Bannis (muet : on se déplace). */
  onShowTribunal: () => void;
  /** Dossiers encore à juger aujourd'hui (0 = séance terminée). */
  tribunalRestants: number;
  /** Vrai quand les cinq verdicts du jour ont été rendus. */
  tribunalClose: boolean;
  /** Vrai si la séance du jour a déjà reçu son paiement (elle reste rejouable). */
  tribunalPaid?: boolean;
  opening: boolean;
  usingHourglass: boolean;
  now: number;
  /** La réserve vient du serveur ; un compte est requis pour la recharge. */
  serverReserve: boolean;
  /** Build avec cloud sans compte connecté : l'ouverture demande une connexion. */
  needsAccount: boolean;
  tutorialAvailable?: boolean;
}) {
  const pack = PACKS.live;
  const stock = game.player.packs;
  const nextAt = game.player.nextPackAt;
  // Le seul compteur au format mm:ss du jeu : il bat à la seconde, et il ne
  // re-rend que ce panneau (le minuteur est local à l'écran Drop).
  const tick = useNow(1_000);
  const needsLogin = needsAccount && !tutorialAvailable;

  function openArtwork(event: MouseEvent<HTMLButtonElement>) {
    if (opening || (!needsAccount && stock <= 0)) return;
    event.currentTarget.focus();
    onOpen();
  }

  const [inspectCard, setInspectCard] = useState<GameView["cards"][number] | null>(null);
  useBackHandler(inspectCard !== null, () => setInspectCard(null));
  const findingFocus = usePresentationFocus(inspectCard !== null);
  const inspectedCreator = inspectCard ? CREATOR_BY_SLUG.get(inspectCard.creatorSlug) : null;
  const latest = [...game.cards].sort((a, b) => b.obtainedAt - a.obtainedAt).slice(0, 4);
  const dailyMission = (game.stats.openings > 0 ? game.missions.find((mission) => mission.id === "tribunal" && !mission.done) : null)
    ?? game.missions.find((mission) => !mission.done)
    ?? game.missions.find((mission) => mission.done && !mission.claimed)
    ?? null;
  // Les Sortants encore artisanables : ils ont quitté le classement (plus
  // tirables, hors complétion) mais leur fenêtre d'artisanat reste ouverte
  // pendant l'édition de leur départ. Ce sont les dernières cartes à rejoindre
  // — et elles se fabriquent, elles ne se tirent plus. On compte celles qu'il
  // reste à obtenir : à zéro, la ligne disparaît.
  const retiredLeft = useMemo(
    () =>
      craftableRetired().filter(
        (creator) => !game.cards.some((card) => card.creatorSlug === creator.slug),
      ).length,
    [game.cards],
  );
  const live = useLive();
  const cloud = useCloud();
  const verifiedScene = cloud.sceneStatus?.userId === cloud.userId && cloud.sceneStatus?.day === gameDay(now)
    ? cloud.sceneStatus : null;
  const sceneReady = !cloud.configured ? !game.scene.opened : verifiedScene?.ready === true;
  const sceneOpened = !cloud.configured ? game.scene.opened : verifiedScene?.ready === false;
  // La ligne d'arène de l'accueil : ce qui compte pour le joueur, dans l'ordre
  // — une récompense qui attend, un draft ouvert (une décision à prendre), ce
  // qu'il a déjà déposé, ou rien du tout. Aucune ligne n'apparaît sans compte :
  // l'arène n'existe qu'en ligne, et un bouton qui refuse est un piège.
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
  // Le direct le plus regardé parmi les créateurs du Top 1000, pour le bandeau :
  // c'est le « lower third » d'une régie — une ligne, un chiffre, un nom.
  const featured = useMemo(() => {
    if (live.stale || !live.count) return null;
    let top: { login: string; viewers: number } | null = null;
    for (const stream of live.byLogin.values()) {
      if (!top || stream.viewers > top.viewers) top = { login: stream.login, viewers: stream.viewers };
    }
    return top;
  }, [live]);

  return (
    <div className="view home-view">
      <header className="drop-intro">
        <div className="drop-edition"><span>LE DROP</span><span>ÉDITION {String(CATALOG_EDITION_NUMBER).padStart(2, "0")}</span></div>
        <h1>Un sachet.<br /><em>Cinq créateurs.</em></h1>
        <p>{needsLogin ? "Connecte-toi. Ta collection t’attend." : needsAccount ? "Essaie un pack tutoriel gratuit avant de créer ton compte." : stock > 0 ? "Le prochain nom de ta collection est peut-être dedans." : "Le prochain sachet se prépare. Ton Binder reste ouvert."}</p>
      </header>

      <section className="drop-priorities" aria-label="À jouer aujourd’hui">
          <button type="button" className="daily-goal" onClick={dailyMission?.id === "tribunal" ? onShowTribunal : onShowMissions} aria-label="Voir l’objectif du jour">
            <span>OBJECTIF DU JOUR</span>
            {dailyMission ? (
              <>
                <strong>{dailyMission.label}</strong>
            <small>{dailyMission.id === "tribunal" && tribunalPaid
              ? "Séance déjà récompensée · tu peux rejouer"
              : dailyMission.done ? "Terminé · récompense à réclamer" : `${dailyMission.progress} / ${dailyMission.target}`}</small>
              </>
            ) : (
              <>
                <strong>Tes missions du jour sont terminées</strong>
                <small>Reviens demain pour un nouvel objectif.</small>
              </>
            )}
            <ChevronRight size={17} />
          </button>
        {/* Le Tribunal des Bannis : l'accroche du jour. Le compte dit la
            vérité — il reste tant d'appels à juger, et pas un de plus. */}
        {dailyMission?.id !== "tribunal" ? <button
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
          <Gavel size={22} />
          <span>
            <strong>Tribunal</strong> ·{" "}
            {tribunalPaid
              ? "Séance déjà récompensée · tu peux rejouer"
              : tribunalRestants > 0
              ? `${tribunalRestants} dossier${tribunalRestants > 1 ? "s" : ""} en attente`
              : "séance close, bilan disponible"}
          </span>
            {tribunalRestants > 0 ? <b className="tribunal-entry-badge" aria-label="Dossiers restants">{tribunalRestants}</b> : null}
          <ChevronRight size={14} />
        </button> : null}
      </section>

      {/* Le bandeau du direct. Il n'apparaît que si l'app sait vraiment qui
          streame (données fraîches) : sinon il n'y a rien à dire. Il est
          cliquable parce qu'il annonce quelque chose sur le tirage — les
          créateurs en direct pèsent plus lourd et eux seuls peuvent sortir en
          variante Live. Un appui ouvre les taux publiés, qui le disent. */}
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

      <section className="pack-stage stage-live"
        aria-label={`${pack.label} : appuie sur le sachet pour préparer l'ouverture`}
      >
        <div className="pack-shadow" />
        <PackArtwork onClick={openArtwork} disabled={opening || (!needsAccount && stock <= 0)} />
        <div className="pack-copy">
          <h2 tabIndex={-1} data-presentation-focus-fallback>{pack.label}</h2>
          <span>{pack.size} cartes</span>
        </div>
        <p className="pull-hint">Appuie sur le sachet pour préparer l’ouverture.</p>
      </section>

      <section className="open-panel">
        <div className="stock-row">
          <div>
            <span>{needsAccount ? "Pack tutoriel" : "Ta réserve"}</span>
            <strong>
              {needsAccount ? tutorialAvailable ? 1 : 0 : stock}<small>/{needsAccount ? 1 : pack.max}</small>
            </strong>
          </div>
          {/* Réserve pleine : l'état change de couleur, il ne clignote pas — le
              jeu n'a aucune animation perpétuelle. */}
          {stock > pack.max ? <span className="reserve-bonus">+1 sablier</span> : null}
          {nextAt !== null && !needsAccount ? (
            <div className="timer-copy"><Clock3 size={14} /><span>{stock > pack.max ? "Recharge après ouverture · " : "+1 dans "}{formatCountdown(nextAt, tick)}</span></div>
          ) : null}
        </div>
        <button type="button" className="pity-row now" onClick={onShowOdds}
          aria-label={`Voir les taux : Légendaire garanti ${game.pity.remaining <= 1 ? "au prochain booster" : `dans ${game.pity.remaining} boosters`}`}>
          <span>Légendaire garanti {game.pity.remaining <= 1 ? "au prochain" : `dans ${game.pity.remaining} boosters`}</span>
          <ChevronRight size={14} />
        </button>
        <button
          className="primary-action"
          onClick={onOpen}
          disabled={opening || (!needsAccount && stock <= 0)}
        >
          {opening ? (
            <LoaderCircle className="spin" size={19} />
          ) : needsAccount ? (
            <CircleUserRound size={19} />
          ) : (
            <Zap size={19} />
          )}
          <span>
            {needsLogin ? "Se connecter pour ouvrir" : needsAccount ? "Essayer le pack tutoriel" : stock > 0 ? "Ouvrir le booster" : "Recharge en cours"}
          </span>
          {needsAccount || stock > 0 ? <ChevronRight size={19} /> : null}
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
        {serverReserve && needsAccount ? <small className="hourglass-note">Connecte-toi pour utiliser tes sabliers.</small> : null}
        {stock >= pack.maxWithHourglass ? <small className="hourglass-note">Ouvre le booster bonus avant d’en utiliser un autre.</small> : null}
        {stock > pack.max && stock < pack.maxWithHourglass ? <small className="hourglass-note">La recharge reprend après l’ouverture du booster bonus.</small> : null}
        {game.player.hourglasses <= 0 ? <small className="hourglass-note">Tu n’as pas de sablier disponible.</small> : null}

        {/* Les jetons : la monnaie lente des boosters, dépensée à l'Atelier. */}
        <div className="token-row">
          <Coins size={14} />
          <span>
            <strong>{game.tokens.count}</strong> jetons · {game.tokens.missing > 0
              ? `encore ${game.tokens.missing} pour une carte`
              : "une carte au choix disponible"}
          </span>
        </div>
      </section>

      {/* Le second paquet, et le seul autre : celui de **ta** famille, une fois
          par jour de jeu. Il ne se recharge pas (le sablier n'y peut rien), il
          ne contient aucune Légendaire, et il ne touche ni au compteur de
          malchance ni à la série — c'est un paquet de complétion. */}
      <section className={`scene-block${sceneOpened ? " done" : ""}`} aria-label="Ton paquet de famille du jour" data-ready={sceneReady}>
        <div className="scene-head">
          <div>
            <h2 tabIndex={-1} data-presentation-focus-fallback>{game.scene.label}</h2>
            <span>5 cartes de ta famille · 1 paquet par jour</span>
          </div>
          <span className="scene-state">
            {sceneOpened ? "Ouvert aujourd’hui" : !cloud.configured || sceneReady ? "Disponible" : !cloud.userId ? "Compte requis" : cloud.sceneStatusLoading ? "Vérification…" : "À vérifier"}
          </span>
        </div>

        <p className="scene-purpose">Un rendez-vous quotidien pour compléter ta famille, en plus du Live Drop. Pas de Légendaire dans ce paquet.</p>
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

      <details className="drop-secondary">
        <summary>Progression, taux et activités <ChevronRight size={15} /></summary>
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

        {arenaLine ? (
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

