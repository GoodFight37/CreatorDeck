"use client";

/**
 * L'écran **Progression** (« Objectifs et saisons ») : les trois missions du
 * jour, la série quotidienne, les jalons de collection et les saisons.
 *
 * Les seuils ne sont pas écrits ici : le moteur et `src/data/progression.json`
 * les portent, et un chiffre recopié finit toujours par mentir à l'écran.
 */
import "./objectives.css";
import type { PointsOutcome } from "@/hooks/use-points";
import { useEffect, useRef, useState } from "react";

import { BookOpen, Check, Gem, Gavel, Layers3, Radio, RotateCcw, Sparkles, Target, Trophy, Unlock, Zap } from "lucide-react";

import { SeasonsSection } from "@/components/seasons-section";

import { CATALOG_AUDIENCE, CATALOG_LABEL, CATALOG_SIZE, CREATORS } from "@/lib/catalog";

import { type GameView } from "@/lib/game-engine";

import { MISSION_REWARD, STREAK_REWARDS, streakRewardParts } from "@/lib/progression";

import { gameStore } from "@/lib/game-store";
import { useCloud } from "@/hooks/use-cloud";
import { useNow } from "@/hooks/use-game";
import { cloudStore } from "@/lib/cloud/cloud-store";
import { gameDay } from "@/lib/progression";

/** Jalons de collection, exprimés en part du catalogue (25 puis 100 sur 500). */
/**
 * Habillage des jalons du moteur (`MILESTONES` dans `game-engine.ts`) : icône,
 * titre et phrase. Les seuils, eux, ne sont plus écrits ici — c'est ce qui
 * faisait dire « Découvrir 50 » au-dessus d'un compteur qui visait 25.
 */
const MILESTONE_LOOK: Record<string, { icon: React.ReactNode; label: string; detail: (target: number) => string }> = {
  first: {
    icon: <Layers3 size={19} />,
    label: "Premier drop",
    detail: () => "Ouvre un booster",
  },
  ten: {
    icon: <BookOpen size={19} />,
    label: "Début du classeur",
    detail: (target) => `Découvre ${target} streameurs du ${CATALOG_LABEL}`,
  },
  twentyfive: {
    icon: <Layers3 size={19} />,
    label: "Le classeur prend forme",
    detail: (target) => `Découvre ${target} streameurs du ${CATALOG_LABEL}`,
  },
  fifty: {
    icon: <Gem size={19} />,
    label: "Chasseur de cartes",
    detail: (target) => `Découvre ${target} streameurs du ${CATALOG_LABEL}`,
  },
  hundred: {
    icon: <Target size={19} />,
    label: "Cent visages",
    detail: (target) => `Découvre ${target} streameurs du ${CATALOG_LABEL}`,
  },
  legendary: {
    icon: <Sparkles size={19} />,
    label: "Premier Légendaire",
    detail: () => "Sors une carte Légendaire d'un booster",
  },
  master: {
    icon: <Trophy size={19} />,
    label: "Maître du Twitch Game",
    detail: () => `Complète les ${CATALOG_SIZE} ${CATALOG_AUDIENCE}`,
  },
};


/**
 * Habillage des trois missions du jour (règles dans `src/data/progression.json`).
 *
 * Les seuils ne sont pas écrits ici : `MISSIONS` les porte, et un chiffre
 * recopié finit toujours par mentir à l'écran.
 */
const MISSION_LOOK: Record<string, { icon: React.ReactNode; label: string; detail: string }> = {
  pack: { icon: <Layers3 size={19} />, label: "Ouvre un booster", detail: "Le geste du jour" },
  recycle: {
    icon: <RotateCcw size={19} />,
    label: "Recycle un doublon",
    detail: "Un doublon en points, et un sablier",
  },
  family: {
    icon: <Radio size={19} />,
    label: "Touche ta famille ou un Direct",
    detail: "Une carte de la famille visée, ou une variante Live",
  },
  tribunal: {
    icon: <Gavel size={19} />,
    label: "Juge 5 dossiers",
    detail: "Rends un verdict sur 5 dossiers distincts au Tribunal des Bannis",
  },
};


function MissionRow({
  icon,
  label,
  detail,
  progress,
  target,
  reward,
  claimed,
  onClaim,
  busy,
  claiming,
}: {
  icon: React.ReactNode;
  label: string;
  detail: string;
  progress: number;
  target: number;
  reward: { points: number; hourglasses: number };
  claimed: boolean;
  onClaim: () => void;
  busy: boolean;
  claiming: boolean;
}) {
  const done = progress >= target;
  const gains = [
    reward.points > 0 ? `+${reward.points} pts` : "",
    reward.hourglasses > 0
      ? `+${reward.hourglasses} sablier${reward.hourglasses > 1 ? "s" : ""}`
      : "",
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <article className={`mission-row ${done ? "done" : ""} ${claimed ? "claimed" : ""}`} data-state={claimed ? "claimed" : done ? "ready" : "progress"}>
      <div className="mission-icon">{done ? <Check size={19} /> : icon}</div>
      <div className="mission-content">
        <div>
          <strong>{label}</strong>
          <span>{detail}</span>
          {/* La récompense est écrite noir sur blanc : sans elle, ces quatre
              lignes étaient des jauges qui ne payaient rien. */}
          <span className="mission-reward">{claimed ? "Récompense reçue" : gains}</span>
        </div>
        <div className="mission-progress-copy">
          <b>{Math.min(progress, target)}</b>/{target}
        </div>
        <progress className="objective-progress" aria-label={`Progression : ${label}`} value={Math.min(progress, target)} max={target} />
        {done && !claimed ? (
          <button type="button" className="mission-claim" onClick={onClaim} disabled={busy} aria-label={`Réclamer : ${label}`}>
            <Unlock size={13} /> {claiming ? "Réclamation…" : "Réclamer"}
          </button>
        ) : claimed ? (
          <span className="mission-state done">Réclamé</span>
        ) : null}
      </div>
    </article>
  );
}


export function MissionsView({
  game,
  onClaimSeason,
  onClaimMilestone,
  onNotice,
  onError,
  onOpenScene,
  onShowTribunal,
  onShowArena,
  onShowMarket,
  onShowFriends,
  onShowLastPack,
  onShowLeaderboard,
  onShowAccount,
  sceneBusy = false,
}: {
  game: GameView;
  onClaimSeason: (seasonId: string) => PointsOutcome | Promise<PointsOutcome>;
  onClaimMilestone: (milestoneId: string) => PointsOutcome | Promise<PointsOutcome>;
  onNotice: (message: string) => void;
  onError: (message: string) => void;
  onOpenScene?: () => void;
  onShowTribunal?: () => void;
  onShowArena?: () => void;
  /** Les activités en ligne vivent ici depuis la barre à trois objets (21 octobre 2026). */
  onShowMarket?: () => void;
  onShowFriends?: () => void;
  onShowLastPack?: () => void;
  onShowLeaderboard?: () => void;
  onShowAccount?: () => void;
  sceneBusy?: boolean;
}) {
  const cloud = useCloud();
  const now = useNow(60_000);
  const verifiedScene = cloud.sceneStatus?.userId === cloud.userId && cloud.sceneStatus?.day === gameDay(now)
    ? cloud.sceneStatus : null;
  const sceneReady = !cloud.configured ? !game.scene.opened : verifiedScene?.ready === true;
  const sceneOpened = !cloud.configured ? game.scene.opened : verifiedScene?.ready === false;
  const dayCopy =
    game.missions.filter((mission) => mission.done).length === game.missions.length
      ? "Toutes les missions du jour sont faites"
      : `${game.missions.filter((mission) => mission.done).length}/${game.missions.length} mission${
          game.missions.length > 1 ? "s" : ""
        } du jour faite${game.missions.length > 1 ? "s" : ""}`;
  const pendingMissions = game.missions.filter((mission) => mission.done && !mission.claimed);
  const pendingMilestones = game.milestones.filter((milestone) => milestone.progress >= milestone.target && !milestone.claimed);
  const pendingSeasons = game.seasons.filter((season) => season.claimable > 0);
  const pendingCount = pendingMissions.length + pendingMilestones.length + pendingSeasons.reduce((sum, season) => sum + season.claimable, 0);
  const pendingPoints = pendingMilestones.reduce((sum, item) => sum + item.reward.points, 0) + pendingSeasons.reduce((sum, item) => sum + item.claimablePoints, 0);
  const pendingHourglasses = pendingMissions.length * MISSION_REWARD.hourglasses + pendingMilestones.reduce((sum, item) => sum + item.reward.hourglasses, 0) + pendingSeasons.reduce((sum, item) => sum + item.claimableHourglasses, 0);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const busy = useRef(false);
  const [feedback, setFeedback] = useState<{ error: boolean; title: string; messages: string[] } | null>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!feedback) return;
    feedbackRef.current?.focus({ preventScroll: true });
    feedbackRef.current?.scrollIntoView?.({ block: "nearest" });
  }, [feedback]);
  type ClaimStep = () => PointsOutcome | Promise<PointsOutcome>;
  function claimMissions(): PointsOutcome {
    const gained = gameStore.claimMissions();
    return { status: "done", message: gained > 0 ? `Missions du jour : +${gained} sablier${gained > 1 ? "s" : ""}.` : "Aucune mission supplémentaire à réclamer." };
  }
  async function runClaim(key: string, steps: ClaimStep[]) {
    if (busy.current) return;
    busy.current = true; setBusyKey(key); setFeedback(null);
    const messages: string[] = [];
    try {
      for (const step of steps) {
        const result = await step();
        if (result.status === "refused") throw new Error(result.message);
        messages.push(result.message ?? "Récompense récupérée.");
      }
      setFeedback({ error: false, title: "Réclamation terminée", messages });
      onNotice(messages.length === 1 ? messages[0] : "Réclamation terminée. Le détail est affiché dans tes objectifs.");
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Récompense indisponible.";
      setFeedback({ error: true, title: messages.length ? "Réclamation interrompue" : "Réclamation impossible", messages: [...messages, message] });
      onError(message);
    } finally { busy.current = false; setBusyKey(null); }
  }
  function handleClaimAll() {
    const steps: ClaimStep[] = [];
    if (pendingMissions.length) steps.push(claimMissions);
    for (const milestone of pendingMilestones) steps.push(() => onClaimMilestone(milestone.id));
    for (const season of pendingSeasons) steps.push(() => onClaimSeason(season.id));
    if (steps.length) void runClaim("all", steps);
  }
  const orderedMilestones = [...game.milestones].sort((a, b) => {
    const rank = (item: typeof a) => item.claimed ? 2 : item.progress >= item.target ? 0 : 1;
    return rank(a) - rank(b);
  });

  const renderMilestone = (milestone: (typeof orderedMilestones)[number]) => {
  const look = MILESTONE_LOOK[milestone.id];
  return (
    <MissionRow
      key={milestone.id}
      icon={look?.icon ?? <Sparkles size={19} />}
      label={look?.label ?? milestone.id}
      detail={look ? look.detail(milestone.target) : ""}
      progress={milestone.progress}
      target={milestone.target}
      reward={milestone.reward}
      claimed={milestone.claimed}
      busy={busyKey !== null} claiming={busyKey === `milestone-${milestone.id}`}
      onClaim={() => void runClaim(`milestone-${milestone.id}`, [() => onClaimMilestone(milestone.id)])}
    />
  );
  };

  return (
    <div className="view missions-view">
      <section className="page-title-row">
        <div>
          <h1>Objectifs et saisons</h1>
        </div>
        <div className="streak-pill">
          <Zap size={14} />
          <span>Niveau {game.player.level}</span>
        </div>
      </section>

      {/* Le jour : missions issues de la configuration, et la série qui
          avance tant qu'on ouvre un booster chaque jour. C'est la partie de
          l'écran qui se remet à zéro à 6 h UTC — pas à minuit, pour ne pas
          couper une soirée de streaming en deux. */}
      {pendingCount > 0 ? <section className="reward-summary-banner" aria-label="Récompenses prêtes" aria-busy={busyKey !== null}>
        <div className="reward-summary-copy"><strong>{pendingCount} récompense{pendingCount > 1 ? "s" : ""} prête{pendingCount > 1 ? "s" : ""}</strong>
          <span>{[pendingPoints > 0 ? `${pendingPoints} points` : "", pendingHourglasses > 0 ? `${pendingHourglasses} sablier${pendingHourglasses > 1 ? "s" : ""}` : ""].filter(Boolean).join(" · ")}</span>
          <small>Missions, jalons et paliers de saison · hors choix de série</small>
        </div>
        <button type="button" className="objectives-claim-all" onClick={handleClaimAll} disabled={busyKey !== null}>{busyKey === "all" ? "Réclamation…" : "Tout réclamer"}</button>
      </section> : null}
      {busyKey ? <p className="objectives-wait" role="status">Réclamation en cours… Les autres récompenses attendent la réponse.</p> : null}
      {feedback ? <div className={`objectives-feedback ${feedback.error ? "is-error" : ""}`} ref={feedbackRef} tabIndex={-1} role={feedback.error ? "alert" : "status"}>
        <strong>{feedback.title}</strong><ul>{feedback.messages.map((message, index) => <li key={index}>{message}</li>)}</ul>
        {feedback.error ? <p>Les récompenses déjà reçues restent acquises. Tu peux réessayer les suivantes.</p> : null}
      </div> : null}

      <section className="day-block" id="objectives-day" aria-labelledby="objectives-day-title">

        <div className="day-head">
          <div>
            <h2 id="objectives-day-title" tabIndex={-1} data-presentation-focus-fallback>Aujourd’hui</h2>
            <span>{dayCopy}</span>
          </div>
          <div className={`streak-chip${game.streak.jackpot ? " hot" : ""}`}>
            <Zap size={14} />
            <span>
              Série {game.streak.days}/{game.streak.target}
            </span>
          </div>
        </div>

        {/* Le planning de régie : sept cases, comme une semaine de diffusion.
            Chaque jour ouvert coche sa case ; la case du jour dit « à faire » ;
            la septième, c'est Le Grand Direct. Une absence d'un jour est
            protégée une fois par cycle. */}
        <div className="streak-plan" role="list" aria-label="Planning de la semaine, sept jours">
          {Array.from({ length: game.streak.target }, (_, index) => {
            const day = index + 1;
            const final = day === game.streak.target;
            const done = index < game.streak.days;
            const today = index === game.streak.days && !game.streak.todayDone;
            return (
              <div
                key={day}
                role="listitem"
                className={`plan-cell${done ? " done" : ""}${today ? " today" : ""}${final ? " final" : ""}${final && game.streak.jackpot ? " won" : ""}`}
              >
                <span className="plan-day">{final ? "J7" : `J${day}`}</span>
                <span className="plan-mark">
                  {done ? <Check size={13} /> : today ? "à faire" : final ? "Direct" : "—"}
                </span>
                {/* Ce que la case paie, écrit noir sur blanc : le barème du
                    jour vient du même fichier que celui qui verse les points,
                    donc l'écran ne peut pas promettre autre chose que le
                    moteur. Le 7ᵉ jour, c'est le gros lot. */}
                <span className="plan-gift">
                  {final ? (
                    <>
                      <span>Perfect</span>
                    </>
                  ) : (
                    (() => {
                      const reward = STREAK_REWARDS.find((item) => item.day === day);
                      const parts = reward ? streakRewardParts(reward) : [];
                      return (parts.length > 0 ? parts : ["série +1"]).map((part) => (
                        <span key={part}>{part}</span>
                      ));
                    })()
                  )}
                </span>
              </div>
            );
          })}
        </div>

        {game.streak.jackpot ? (
          <div className="streak-jackpot">
            <Sparkles size={15} />
            <div>
              <strong>Sept jours joués : ton booster Perfect t&apos;attend</strong>
              <span>
                Ton prochain booster part avec le tirage Perfect garanti.
              </span>
            </div>
            <div className="jackpot-actions">
              <button
                type="button"
                disabled={busyKey !== null}
                onClick={() => void runClaim("jackpot", [() => { gameStore.claimStreakJackpot("perfect"); return { status: "done", message: "Perfect garanti gardé pour ton prochain booster." }; }])}
              >
                Perfect
              </button>
            </div>
          </div>
        ) : null}

        <details>
          <summary>Autres activités</summary>
          {onShowTribunal ? <button type="button" className="text-link" onClick={onShowTribunal}>Tribunal des Bannis</button> : null}
          {onOpenScene ? <>
            <span className="scene-state">{sceneOpened ? "Ouvert aujourd’hui" : cloud.sceneStatusLoading ? "Vérification…" : sceneReady ? "Disponible" : "À vérifier"}</span>
            <button type="button" className={`text-link scene-action${sceneOpened ? " is-opened" : ""}`}
              onClick={cloud.configured && cloud.userId && !sceneReady && !sceneOpened ? () => void cloudStore.packStatus() : onOpenScene}
              disabled={sceneBusy || sceneOpened || cloud.sceneStatusLoading || !game.scene.family}>
              {sceneBusy ? "Ouverture…" : sceneOpened ? "Déjà ouvert · demain matin" : cloud.configured && cloud.userId && !sceneReady ? "Vérifier la disponibilité" : "Ouvrir le Paquet Scène"}
            </button>
          </> : null}
          {onShowArena ? <button type="button" className="text-link" onClick={onShowArena}>Arène</button> : null}
          {cloud.configured && cloud.userId ? <>
            {onShowMarket ? <button type="button" className="text-link" onClick={onShowMarket}>Hôtel des ventes</button> : null}
            {onShowFriends ? <button type="button" className="text-link" onClick={onShowFriends}>Amis</button> : null}
            {onShowLeaderboard ? <button type="button" className="text-link" onClick={onShowLeaderboard}>Classement mondial</button> : null}
            {onShowLastPack ? <button type="button" className="text-link" onClick={onShowLastPack}>Last Pack</button> : null}
          </> : cloud.configured && onShowAccount ? (
            <button type="button" className="text-link" onClick={onShowAccount}>Se connecter pour l’Hôtel des ventes, les Amis et le Classement</button>
          ) : null}
        </details>
        <div className="mission-list day-missions">
          {game.missions.map((mission) => {
            const look = MISSION_LOOK[mission.id];
            return (
              <MissionRow
                key={mission.id}
                icon={look?.icon ?? <Target size={19} />}
                label={look?.label ?? mission.id}
                detail={look?.detail ?? ""}
                progress={mission.progress}
                target={mission.target}
                reward={{ points: 0, hourglasses: MISSION_REWARD.hourglasses }}
                claimed={mission.claimed}
                busy={busyKey !== null} claiming={busyKey === "missions"}
                onClaim={() => void runClaim("missions", [claimMissions])}
              />
            );
          })}
        </div>
      </section>

      <section id="objectives-collection" aria-label="Collection et jalons">
      <section className="mission-hero">
        <div className="mission-hero-icon">
          <Trophy size={27} />
        </div>
        <div>
          <span>Collection {CATALOG_LABEL}</span>
          <strong>{game.stats.uniqueCreators} / {CREATORS.length}</strong>
          <div className="progress-track">
            <i
              style={{
                width: `${Math.round((game.stats.uniqueCreators / CREATORS.length) * 100)}%`,
              }}
            />
          </div>
          {game.stats.rareDrops > 0 ? (
            <span className="perfect-count">
              <Sparkles size={11} />
              {game.stats.rareDrops} carte{game.stats.rareDrops > 1 ? "s" : ""} obtenue
              {game.stats.rareDrops > 1 ? "s" : ""} en booster Perfect
            </span>
          ) : null}
        </div>
      </section>

      <div className="section-heading compact-heading">
        <div>
          <h2>Objectifs du collectionneur</h2>
        </div>
      </div>
      <div className="mission-list">
        {orderedMilestones.slice(0, 3).map(renderMilestone)}
      </div>
      {orderedMilestones.length > 3 ? (
        <details className="milestones-more">
          <summary>Voir les {orderedMilestones.length - 3} autres objectifs</summary>
          <div className="mission-list">{orderedMilestones.slice(3).map(renderMilestone)}</div>
        </details>
      ) : null}

      </section>
      <SeasonsSection seasons={game.seasons} busy={busyKey !== null} busyKey={busyKey}
        onClaim={(id) => void runClaim(`season-${id}`, [() => onClaimSeason(id)])} />
    </div>
  );
}

