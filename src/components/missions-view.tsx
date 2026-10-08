"use client";

/**
 * L'écran **Progression** (« Objectifs et saisons ») : les trois missions du
 * jour, la série quotidienne, les jalons de collection et les saisons.
 *
 * Les seuils ne sont pas écrits ici : le moteur et `src/data/progression.json`
 * les portent, et un chiffre recopié finit toujours par mentir à l'écran.
 */
import { useState } from "react";

import { BookOpen, Check, Gem, Layers3, Radio, RotateCcw, Sparkles, Target, Trophy, Unlock, Zap } from "lucide-react";

import { SeasonsSection } from "@/components/seasons-section";

import { CATALOG_AUDIENCE, CATALOG_LABEL, CATALOG_SIZE, CREATORS } from "@/lib/catalog";

import { type GameView } from "@/lib/game-engine";

import { STREAK_REWARDS, streakRewardParts } from "@/lib/progression";

import { gameStore } from "@/lib/game-store";

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
    detail: () => "Ouvrir un booster",
  },
  ten: {
    icon: <BookOpen size={19} />,
    label: "Début du classeur",
    detail: (target) => `Découvrir ${target} streameurs du ${CATALOG_LABEL}`,
  },
  twentyfive: {
    icon: <Layers3 size={19} />,
    label: "Le classeur prend forme",
    detail: (target) => `Découvrir ${target} streameurs du ${CATALOG_LABEL}`,
  },
  fifty: {
    icon: <Gem size={19} />,
    label: "Chasseur de cartes",
    detail: (target) => `Découvrir ${target} streameurs du ${CATALOG_LABEL}`,
  },
  hundred: {
    icon: <Target size={19} />,
    label: "Cent visages",
    detail: (target) => `Découvrir ${target} streameurs du ${CATALOG_LABEL}`,
  },
  legendary: {
    icon: <Sparkles size={19} />,
    label: "Premier Légendaire",
    detail: () => "Sortir une carte Légendaire d'un booster",
  },
  master: {
    icon: <Trophy size={19} />,
    label: "Maître du Twitch Game",
    detail: () => `Compléter les ${CATALOG_SIZE} ${CATALOG_AUDIENCE}`,
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
}: {
  icon: React.ReactNode;
  label: string;
  detail: string;
  progress: number;
  target: number;
  reward: { points: number; hourglasses: number };
  claimed: boolean;
  onClaim: () => void;
}) {
  const done = progress >= target;
  const percent = Math.min(100, Math.round((progress / target) * 100));
  const gains = [
    reward.points > 0 ? `+${reward.points} pts` : "",
    reward.hourglasses > 0
      ? `+${reward.hourglasses} sablier${reward.hourglasses > 1 ? "s" : ""}`
      : "",
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <article className={`mission-row ${done ? "done" : ""}`}>
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
        <div className="progress-track">
          <i style={{ width: `${percent}%` }} />
        </div>
        {done && !claimed ? (
          <button type="button" className="mission-claim" onClick={onClaim}>
            <Unlock size={13} /> Réclamer
          </button>
        ) : (
          <span className={`mission-state ${claimed ? "done" : ""}`}>
            {claimed ? "Réclamé" : "En cours"}
          </span>
        )}
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
}: {
  game: GameView;
  onClaimSeason: (seasonId: string) => void | Promise<void>;
  onClaimMilestone: (milestoneId: string) => void;
  onNotice: (message: string) => void;
  onError: (message: string) => void;
}) {
  const dayCopy =
    game.missions.filter((mission) => mission.done).length === game.missions.length
      ? "Les trois missions du jour sont faites"
      : `${game.missions.filter((mission) => mission.done).length}/${game.missions.length} mission${
          game.missions.length > 1 ? "s" : ""
        } du jour faite${game.missions.filter((mission) => mission.done).length > 1 ? "s" : ""}`;
  const pendingMissionCount = game.missions.filter((mission) => mission.done && !mission.claimed).length;
  const pendingSeasonCount = game.seasons.filter((season) => season.claimable > 0).length;
  const pendingSeasonPoints = game.seasons.reduce((sum, season) => sum + season.claimablePoints, 0);
  const pendingSeasonHourglasses = game.seasons.reduce(
    (sum, season) => sum + season.claimableHourglasses,
    0,
  );
  const hasPendingRewards = pendingMissionCount > 0 || pendingSeasonCount > 0;
  const [claimingAll, setClaimingAll] = useState(false);

  /**
   * « Tout réclamer » : les sabliers des missions d'abord (ils sont locaux), puis
   * les familles **l'une après l'autre**.
   *
   * Une famille se réclame palier par palier chez le serveur, et deux familles
   * demandées en même temps mélangeraient deux sauvegardes : la seconde écraserait
   * la première. On attend donc chaque famille avant de passer à la suivante.
   */
  async function handleClaimAll() {
    if (claimingAll) return;
    setClaimingAll(true);
    try {
      const gained = pendingMissionCount > 0 ? gameStore.claimMissions() : 0;
      const readySeasons = game.seasons.filter((season) => season.claimable > 0);
      for (const season of readySeasons) await onClaimSeason(season.id);
      const summary = [
        gained > 0 ? `+${gained} sablier${gained > 1 ? "s" : ""}` : "",
        readySeasons.length > 0
          ? `${readySeasons.length} famille${readySeasons.length > 1 ? "s" : ""}`
          : "",
      ].filter(Boolean);
      onNotice(
        summary.length > 0
          ? `${summary.join(" · ")} réclamé${summary.length > 1 ? "s" : ""}.`
          : "Aucune récompense n'était prête.",
      );
    } catch (caught) {
      onError(caught instanceof Error ? caught.message : "Récompense indisponible.");
    } finally {
      setClaimingAll(false);
    }
  }

  return (
    <div className="view missions-view">
      <section className="page-title-row">
        <div>
          <h1>Progression</h1>
        </div>
        <div className="streak-pill">
          <Zap size={14} />
          <span>Niveau {game.player.level}</span>
        </div>
      </section>

      {/* Le jour : trois gestes à faire, un sablier chacun, et la série qui
          avance tant qu'on ouvre un booster chaque jour. C'est la partie de
          l'écran qui se remet à zéro à 6 h UTC — pas à minuit, pour ne pas
          couper une soirée de streaming en deux. */}
      {hasPendingRewards ? (
        <div className="reward-summary-banner">
          <div className="reward-summary-copy">
            <strong>{pendingMissionCount + pendingSeasonCount} récompense{pendingMissionCount + pendingSeasonCount > 1 ? "s" : ""} prête{pendingMissionCount + pendingSeasonCount > 1 ? "s" : ""}</strong>
            <span>
              {pendingMissionCount > 0 ? `${pendingMissionCount} mission${pendingMissionCount > 1 ? "s" : ""} du jour` : ""}
              {pendingMissionCount > 0 && pendingSeasonCount > 0 ? " · " : ""}
              {pendingSeasonCount > 0 ? `${pendingSeasonCount} saison${pendingSeasonCount > 1 ? "s" : ""}` : ""}
              {pendingSeasonPoints > 0 || pendingSeasonHourglasses > 0 ? ` · ${pendingSeasonPoints} pts` : ""}
              {pendingSeasonHourglasses > 0 ? ` · ${pendingSeasonHourglasses} sablier${pendingSeasonHourglasses > 1 ? "s" : ""}` : ""}
            </span>
          </div>
          <div className="reward-summary-actions">
            <span className="reward-summary-pill">{pendingMissionCount > 0 ? `${pendingMissionCount} mission${pendingMissionCount > 1 ? "s" : ""}` : ""}</span>
            <span className="reward-summary-pill">{pendingSeasonCount > 0 ? `${pendingSeasonCount} famille${pendingSeasonCount > 1 ? "s" : ""}` : ""}</span>
            <button type="button" className="ghost-button" onClick={handleClaimAll} disabled={claimingAll}>
              {claimingAll ? "Réclamation…" : "Tout réclamer"}
            </button>
          </div>
        </div>
      ) : null}

      <section className="day-block">
        <div className="day-head">
          <div>
            <h2>Le jour</h2>
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
            la septième, c'est Le Grand Direct. Un jour manqué remet la série à
            J1 — c'est la règle du moteur, l'écran ne fait que la montrer. */}
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
                      <span>ou {game.streak.jackpotHourglasses} sabliers</span>
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
        <p className="streak-rule">
          Un booster ouvert par jour fait avancer la série. Un jour manqué la remet à J1 ;
          la septième case, c&apos;est <strong>Le Grand Direct</strong>.
        </p>

        {game.streak.jackpot ? (
          <div className="streak-jackpot">
            <Sparkles size={15} />
            <div>
              <strong>Sept jours d&apos;affilée : le Perfect du jour t&apos;attend</strong>
              <span>
                Ton prochain booster part avec le tirage Perfect garanti — ou prends les{" "}
                {game.streak.jackpotHourglasses} sabliers.
              </span>
            </div>
            <div className="jackpot-actions">
              <button
                type="button"
                onClick={() => {
                  gameStore.claimStreakJackpot("perfect");
                  onNotice("Perfect garanti gardé pour ton prochain booster.");
                }}
              >
                Perfect
              </button>
              <button
                type="button"
                className="ghost"
                onClick={() => {
                  try {
                    const gained = gameStore.claimStreakJackpot("hourglasses");
                    onNotice(`+${gained} sablier${gained > 1 ? "s" : ""} : la série repart.`);
                  } catch (caught) {
                    onError(caught instanceof Error ? caught.message : "Récompense indisponible.");
                  }
                }}
              >
                {game.streak.jackpotHourglasses} sabliers
              </button>
            </div>
          </div>
        ) : null}

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
                reward={{ points: 0, hourglasses: 1 }}
                claimed={mission.claimed}
                onClaim={() => {
                  try {
                    const gained = gameStore.claimMissions();
                    onNotice(
                      gained > 0
                        ? `+${gained} sablier${gained > 1 ? "s" : ""} pour tes missions du jour.`
                        : "Mission déjà réglée pour aujourd'hui.",
                    );
                  } catch (caught) {
                    onError(caught instanceof Error ? caught.message : "Récompense indisponible.");
                  }
                }}
              />
            );
          })}
        </div>
      </section>

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
        {game.milestones.map((milestone) => {
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
              onClaim={() => onClaimMilestone(milestone.id)}
            />
          );
        })}
      </div>

      <SeasonsSection seasons={game.seasons} onClaim={onClaimSeason} />
    </div>
  );
}

