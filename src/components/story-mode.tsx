"use client";

import { memo, useEffect, useRef, useState, type PointerEvent, type KeyboardEvent, type MouseEvent, type CSSProperties } from "react";
import Link from "next/link";
import { StoryPortrait } from "./story-portrait";
import { StoryGaugeIcon, StoryChannelGlyph } from "./story-glyphs";
import { StorySetPieces } from "./story-setpieces";
import { storyActEchoes } from "../lib/story-echoes";
import { affectedStoryStats, currentStoryGoal, finishedStoryGoal } from "../lib/story-goals";
import { STORY_PROLOGUE } from "../data/story-prologue";
import {
  STORY_SAVE_KEY, STORY_STATS, chooseStory, currentStoryScene, lastStoryAppliedEffects, storyEndingNarrative,
  restoreStory, startStory, storyEpilogue, storyActInterlude, type StoryDirection, type StoryRun, type StoryStat,
} from "../lib/story-mode";
import "./story-mode.css";

const SCRIPT = STORY_PROLOGUE;
const STORY_ACTS = [
  { start: 0, number: "I" },
  { start: 12, number: "II" },
  { start: 20, number: "III" },
  { start: 28, number: "IV" },
  { start: 36, number: "V" },
] as const;

function storyActNumber(step: number): string {
  for (let index = STORY_ACTS.length - 1; index >= 0; index--) {
    if (step >= STORY_ACTS[index].start) return STORY_ACTS[index].number;
  }
  return "I";
}
const STAT_LABELS: Record<StoryStat, { name: string }> = {
  public: { name: "Public" },
  energie: { name: "Énergie" },
  argent: { name: "Argent" },
  confiance: { name: "Confiance" },
};

const STORY_SCENES_BY_ID = new Map(SCRIPT.scenes.map((scene) => [scene.id, scene] as const));

/** Journal consultable pendant la partie ou après la fin, sans scènes futures ni spoilers. */
const StoryJournal = memo(function StoryJournal({ run, completed = false }: { run: StoryRun; completed?: boolean }) {
  return (
    <details className={completed ? "story-recap" : "story-recap story-recap-live"} aria-live="off">
      <summary>{completed ? `Revoir mes ${run.history.length} ${run.history.length === 1 ? "décision" : "décisions"}` : `Journal de bord · ${run.history.length} ${run.history.length === 1 ? "décision" : "décisions"}`}</summary>
      <ol>
        {run.history.map((entry, index) => {
          const chapter = STORY_SCENES_BY_ID.get(entry.sceneId);
          return (
            <li key={index}>
              <span className="story-recap-scene">{chapter?.title ?? `Chapitre ${index + 1}`}</span>
              <strong>{chapter?.choices[entry.direction].label ?? (entry.direction === "left" ? "Choix gauche" : "Choix droit")}</strong>
            </li>
          );
        })}
      </ol>
    </details>
  );
});

export function StoryMode() {
  const [run, setRun] = useState<StoryRun | null>(null);
  const [drag, setDrag] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [exiting, setExiting] = useState<StoryDirection | null>(null);
  const [restartPending, setRestartPending] = useState(false);
  const [inspectedStat, setInspectedStat] = useState<StoryStat | null>(null);
  const gesture = useRef<{ x: number; y: number; pointerId: number; startTime: number } | null>(null);
  // Empêche qu’un double-tap valide deux scènes successives au même endroit.
  const lastDecisionAt = useRef(Number.NEGATIVE_INFINITY);
  const decisionPending = useRef(false);
  const swipeThresholdReached = useRef(false);
  // Cadencer les événements pointermove à la fréquence de rendu de l'écran.
  const dragFrame = useRef<number | null>(null);
  const pendingDrag = useRef(0);
  const transitionTimer = useRef<number | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);
  const actionsRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<HTMLElement | null>(null);
  const endingRef = useRef<HTMLElement | null>(null);
  const previousStep = useRef<number | null>(null);
  const focusNextScene = useRef(false);
  const step = run?.step;
  const ending = run?.ending;

  useEffect(() => {
    let saved: string | null = null;
    try { saved = window.localStorage.getItem(STORY_SAVE_KEY); } catch { /* stockage facultatif */ }
    // Éviter une mise à jour synchrone depuis un effet React.
    const pending = window.setTimeout(() => setRun(restoreStory(SCRIPT, saved) ?? startStory(SCRIPT)), 0);
    return () => window.clearTimeout(pending);
  }, []);

  useEffect(() => {
    if (!run) return;
    try { window.localStorage.setItem(STORY_SAVE_KEY, JSON.stringify(run)); } catch { /* session en mémoire */ }
  }, [run]);

  useEffect(() => () => {
    if (transitionTimer.current !== null) window.clearTimeout(transitionTimer.current);
    if (dragFrame.current !== null) window.cancelAnimationFrame(dragFrame.current);
  }, []);

  // Après un choix, le nouveau dilemme doit être visible même sur un petit
  // écran où le joueur a fait défiler la page pour atteindre les boutons.
  // Un choix clavier transfère le focus à la nouvelle scène (ou à la fin).
  useEffect(() => {
    if (step === undefined) return;
    if (previousStep.current === null) { previousStep.current = step; return; }
    if (previousStep.current === step) return;
    previousStep.current = step;

    if (focusNextScene.current) {
      (ending ? endingRef.current : sceneRef.current)?.focus({ preventScroll: true });
    }
    focusNextScene.current = false;

    if (ending) {
      endingRef.current?.scrollIntoView({ block: "start", behavior: "auto" });
      return;
    }
    const progress = progressRef.current;
    const actions = actionsRef.current;
    if (!progress || !actions) return;
    const progressTop = progress.getBoundingClientRect().top;
    const actionsBottom = actions.getBoundingClientRect().bottom;
    // Le nouveau dilemme doit revenir en tête, même si ses boutons sont déjà visibles.
    // Sur 320 × 568, sinon le rail peut rester 130 px trop bas après un choix.
    if (progressTop < 12 || progressTop > 64 || actionsBottom > window.innerHeight - 12) {
      progress.scrollIntoView({ block: "start", behavior: "auto" });
    }
  }, [step, ending]);

  const scene = run ? currentStoryScene(SCRIPT, run) : null;
  const resolvedEnding = run?.ending ? storyEndingNarrative(run) : null;
  const interlude = run ? storyActInterlude(run) : null;
  const actEchoes = run && interlude ? storyActEchoes(run) : [];
  const character = scene?.id === "double_crise" ? "duo"
    : scene?.speaker.startsWith("FLO") ? "flo"
    : scene?.speaker.startsWith("NOX") ? "nox"
    : scene?.speaker.startsWith("MONA") ? "mona"
    : scene?.speaker.startsWith("LINA") ? "lina"
    : scene?.speaker.startsWith("PLATEFORME") ? "platform"
    : /^(SAM|ASSOCIATION|CHAT)\b/.test(scene?.speaker ?? "") ? "community"
    : "toi";
  const criticalStat: StoryStat | null = run
    ? STORY_STATS.filter(stat => run.stats[stat] <= 20)
      .sort((a, b) => run.stats[a] - run.stats[b])[0] ?? null
    : null;
  const portraitMood: "calm" | "on-air" | "tense" =
    criticalStat || /(crise|guerre|mensonge|scandale|dox|rupture|trahi|panne)/.test(scene?.id ?? "")
      ? "tense"
      : scene?.channel === "LIVE" ? "on-air" : "calm";
  const lastEffects = run ? lastStoryAppliedEffects(SCRIPT, run) : null;
  const changedStats = lastEffects ? STORY_STATS.filter((stat) => (lastEffects[stat] ?? 0) !== 0) : [];
  const previewDirection: StoryDirection | null = exiting ? null : drag < -18 ? "left" : drag > 18 ? "right" : null;
  const swipeReveal = Math.min(1, Math.max(0, (Math.abs(drag) - 12) / 26));
  const previewStats = run && scene && previewDirection
    ? affectedStoryStats(run.stats, scene.choices[previewDirection].effects)
    : [];
  const mission = run ? currentStoryGoal(run) : null;
  const previousMission = run ? finishedStoryGoal(run) : null;

  // Le lancer est une vraie phase visuelle : on verrouille l'entrée jusqu'à la carte suivante.
  function decide(direction: StoryDirection, focusScene = false) {
    const expectedStep = run?.step;
    if (expectedStep === undefined || run?.ending || decisionPending.current) return;
    const now = performance.now();
    if (now - lastDecisionAt.current < 450) return;
    lastDecisionAt.current = now;
    decisionPending.current = true;
    if (dragFrame.current !== null) window.cancelAnimationFrame(dragFrame.current);
    dragFrame.current = null;
    if (typeof window.navigator.vibrate === "function") window.navigator.vibrate(12);
    focusNextScene.current = focusScene;
    setRestartPending(false);
    setInspectedStat(null);
    gesture.current = null;
    setDragging(false);
    setExiting(direction);
    setDrag(direction === "left" ? -135 : 135);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    transitionTimer.current = window.setTimeout(() => {
      setRun((previous) => previous?.step === expectedStep ? chooseStory(SCRIPT, previous, direction) : previous);
      setDrag(0);
      setExiting(null);
      decisionPending.current = false;
      transitionTimer.current = null;
    }, reducedMotion ? 0 : 185);
  }

  // Sur un appareil hybride, un tap peut laisser :hover actif même si
  // le navigateur annonce aussi une souris. Mémoriser la vraie entrée.
  function markChoicePointer(event: PointerEvent<HTMLButtonElement>) {
    if (event.pointerType === "mouse") delete event.currentTarget.dataset.touchActivated;
    else event.currentTarget.dataset.touchActivated = "true";
  }

  function restoreChoiceMouseHover(event: PointerEvent<HTMLButtonElement>) {
    if (event.pointerType === "mouse") delete event.currentTarget.dataset.touchActivated;
  }

  function chooseFromButton(event: MouseEvent<HTMLButtonElement>, direction: StoryDirection) {
    if (event.detail > 0 && (event.currentTarget.dataset.touchActivated === "true"
      || window.matchMedia("(hover: none)").matches)) event.currentTarget.blur();
    decide(direction, event.detail === 0);
  }

  function pointerDown(event: PointerEvent<HTMLElement>) {
    if (!scene || gesture.current || decisionPending.current) return;
    gesture.current = { x: event.clientX, y: event.clientY, pointerId: event.pointerId, startTime: performance.now() };
    swipeThresholdReached.current = false;
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function pointerMove(event: PointerEvent<HTMLElement>) {
    if (!gesture.current || gesture.current.pointerId !== event.pointerId || decisionPending.current) return;
    const dx = event.clientX - gesture.current.x;
    const dy = event.clientY - gesture.current.y;
    const horizontal = Math.abs(dx) >= Math.abs(dy) * 1.2;
    const armed = horizontal && Math.abs(dx) >= 64;
    if (armed && !swipeThresholdReached.current && typeof window.navigator.vibrate === "function") window.navigator.vibrate(8);
    swipeThresholdReached.current = armed;
    pendingDrag.current = horizontal ? Math.max(-135, Math.min(135, dx)) : 0;
    if (dragFrame.current === null) {
      dragFrame.current = window.requestAnimationFrame(() => {
        dragFrame.current = null;
        setDrag(pendingDrag.current);
      });
    }
  }

  function pointerEnd(event: PointerEvent<HTMLElement>, cancelled = false) {
    const start = gesture.current;
    if (!start || start.pointerId !== event.pointerId) return;
    if (dragFrame.current !== null) window.cancelAnimationFrame(dragFrame.current);
    dragFrame.current = null;
    gesture.current = null;
    swipeThresholdReached.current = false;
    setDragging(false);
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    const quickFlick = Math.abs(dx) >= 56 && Math.abs(dx) / Math.max(1, performance.now() - start.startTime) >= 0.9;
    if (!cancelled && (Math.abs(dx) >= 64 || quickFlick) && Math.abs(dx) > Math.abs(dy) * 1.2) decide(dx < 0 ? "left" : "right");
    else setDrag(0);
  }

  function keyDown(event: KeyboardEvent<HTMLElement>) {
    if (!scene || event.target !== event.currentTarget) return;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      decide(event.key === "ArrowLeft" ? "left" : "right", true);
    }
  }

  function replay(focusScene = false) {
    if (dragFrame.current !== null) window.cancelAnimationFrame(dragFrame.current);
    dragFrame.current = null;
    if (transitionTimer.current !== null) window.clearTimeout(transitionTimer.current);
    transitionTimer.current = null;
    decisionPending.current = false;
    swipeThresholdReached.current = false;
    setExiting(null);
    setDragging(false);
    setRestartPending(false);
    setInspectedStat(null);
    focusNextScene.current = focusScene;
    lastDecisionAt.current = Number.NEGATIVE_INFINITY;
    gesture.current = null;
    setDrag(0);
    setRun(startStory(SCRIPT));
  }

  return (
    <main className="story-page" data-channel={scene?.channel ?? "FIN"} data-character={character}>
      <header className="story-header">
        <Link href="/" className="story-back" aria-label="Retour à CreatorDeck">‹ CreatorDeck</Link>
        <div className="story-brand">MODE HISTOIRE <span>· PILOTE</span></div>
      </header>
      <div className="story-shell">
        {(!run || (run.step === 0 && !run.ending)) && (
          <div className="story-intro">
            <h1>{SCRIPT.title}</h1>
            <p>{SCRIPT.subtitle}</p>
          </div>
        )}
        {!run ? <p role="status" className="story-loading">Chargement de la partie…</p> : (
          <>
            <div className="story-game-hud">
              <div className="story-run-clock" aria-label={`Épisode ${run.step + 1} de la saison 1`}>
                <span className="story-run-clock-label">SAISON 01</span>
                <strong>ÉP. {String(Math.min(run.step + 1, SCRIPT.totalSteps)).padStart(2, "0")}</strong>
              </div>
              <section className="story-stats" aria-label="Les quatre jauges de la chaîne">
                {STORY_STATS.map((key) => (
                  <div key={key} className="story-stat" data-low={run.stats[key] <= 20}
                    data-affected={previewStats.includes(key)} data-inspected={inspectedStat === key}>
                    <button type="button" className="story-stat-top"
                      onClick={() => setInspectedStat((selected) => selected === key ? null : key)}
                      aria-label={`${STAT_LABELS[key].name} : ${run.stats[key]} sur 100. Afficher ou masquer le nom.`}
                      aria-expanded={inspectedStat === key}
                      title={STAT_LABELS[key].name}>
                      <span className="story-stat-orb" aria-hidden="true" />
                      <span className="story-stat-icon"><StoryGaugeIcon stat={key} /></span>
                      <span className="story-stat-name">{STAT_LABELS[key].name}</span>
                    </button>
                    <div className="story-meter" role="progressbar" aria-label={STAT_LABELS[key].name}
                      aria-valuemin={0} aria-valuemax={100} aria-valuenow={run.stats[key]}
                      aria-valuetext={`${run.stats[key]} sur 100${run.stats[key] <= 20 ? ", niveau critique" : ""}`}>
                      <div className={`story-meter-fill story-meter-${key}`} style={{ width: `${run.stats[key]}%` }} />
                    </div>
                    {run.stats[key] <= 20 && <span className="story-stat-alert" aria-hidden="true">⚠ NIVEAU CRITIQUE</span>}
                  </div>
                ))}
              </section>
              {mission && (
                <details key={`${mission.id}:${run.step}`} className="story-mission" data-status={mission.status}>
                  <summary aria-label={`Objectif : ${mission.title}. Voir la progression.`}>
                    <span className="story-mission-check" aria-hidden="true">{mission.status === "success" ? "✓" : "□"}</span>
                    <span className="story-mission-heading"><small>OBJECTIF</small><strong>{mission.title}</strong></span>
                  </summary>
                  <div className="story-mission-panel">
                    <strong>{mission.title}</strong>
                    <p>{mission.detail}</p>
                    <div className="story-mission-track" role="progressbar" aria-label={mission.title}
                      aria-valuemin={0} aria-valuemax={mission.target}
                      aria-valuenow={Math.min(mission.progress, mission.target)}>
                      <span style={{ width: `${Math.round(Math.min(1, mission.progress / mission.target) * 100)}%` }} />
                    </div>
                    <span className="story-mission-count">{mission.caption}</span>
                    <span className="story-mission-status">{mission.status === "failure" ? "ÉCHOUÉ" : mission.status === "success" ? "RÉUSSI" : "EN COURS"}</span>
                  </div>
                </details>
              )}
            </div>
            <div className="story-impact" role="status" aria-live="polite" aria-atomic="true">
              {lastEffects && changedStats.length > 0 && (
                <>
                  <span className="story-impact-label">TON DERNIER CHOIX</span>
                  <div className="story-impact-values">
                    {changedStats.map((stat) => {
                      const delta = lastEffects[stat] ?? 0;
                      return (
                        <span key={stat} className="story-impact-value" data-trend={delta > 0 ? "up" : "down"}>
                          <StoryGaugeIcon stat={stat} />
                          <span aria-hidden="true">{delta > 0 ? "↑" : "↓"}</span>
                          <span className="story-impact-name">{STAT_LABELS[stat].name} {delta > 0 ? "+" : ""}{delta}</span>
                        </span>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
            {run.ending ? (
              <section ref={endingRef} tabIndex={-1} className="story-card story-ending" data-ending={run.ending} aria-live="polite">
                <div className="story-ending-cover" aria-hidden="true">
                  <span className="story-ending-edition">CREATORDECK / CHRONIQUE N° 01</span>
                  <div className="story-ending-tower">
                    <span className="story-ending-tower-ring" />
                    <StoryChannelGlyph channel="LIVE" />
                    <span className="story-ending-tower-line" />
                  </div>
                  <span className="story-ending-status">● DIRECT TERMINÉ</span>
                  <span className="story-ending-counter">{String(run.history.length).padStart(2, "0")} / {SCRIPT.totalSteps}</span>
                </div>
                <div className="story-chapter">TON ÉPILOGUE · {run.history.length} DÉCISIONS</div>
                <h2>{resolvedEnding?.title}</h2>
                <p>{resolvedEnding?.text}</p>
                <div className="story-epilogue" aria-label="Ce que tes choix ont changé">
                  <h3>CE QUE TU LAISSES DERRIÈRE TOI</h3>
                  {storyEpilogue(run).map((memory, index) => <p key={index}>{memory}</p>)}
                </div>
                <StoryJournal run={run} completed />
                <button className="story-replay" onClick={(event) => replay(event.detail === 0)}>↻ Recommencer l’histoire</button>
              </section>
            ) : scene ? (
              <>
                <div ref={progressRef} className="story-progress" aria-label={`Décision ${run.step + 1} sur ${SCRIPT.totalSteps}`}>
                  <span>ACTE {storyActNumber(run.step)} · CHAPITRE {String(run.step + 1).padStart(2, "0")}</span>
                  <span>{run.step + 1} / {SCRIPT.totalSteps}</span>
                </div>
                <div className="story-progress-track" aria-hidden="true"><span style={{ width: `${((run.step + 1) / SCRIPT.totalSteps) * 100}%` }} /></div>
                {interlude && (
                  <div className="story-act-interlude" role="note">
                    <span className="story-act-roman" aria-hidden="true">{storyActNumber(run.step)}</span>
                    <strong>{interlude.title}</strong>
                    <p>{interlude.text}</p>
                    {actEchoes.length > 0 && (
                      <div className="story-act-echoes" aria-label="Conséquences de tes décisions passées">
                        {actEchoes.map((echo) => (
                          <div key={echo.id} className="story-act-echo">
                            <strong>{echo.title}</strong><p>{echo.text}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {previousMission && (
                      <div className="story-mission-outcome" data-status={previousMission.status}>
                        <span aria-hidden="true">{previousMission.status === "success" ? "✓" : "×"}</span>
                        Objectif {previousMission.title.toLowerCase()} : {previousMission.status === "success" ? "réussi" : "manqué"}
                      </div>
                    )}
                  </div>
                )}
                <div className="story-deck" data-pulling={Math.abs(drag) >= 18} data-exiting={exiting !== null}
                  style={{
                    "--story-drag-depth": `${Math.min(7, Math.abs(drag) * 0.055)}px`,
                    "--story-drag-light": Math.min(0.22, Math.abs(drag) * 0.0016),
                    "--story-glint-shift": `${drag * 0.55}px`,
                  } as CSSProperties}>
                  <div className="story-deck-back story-deck-back-far" aria-hidden="true" />
                  <div className="story-deck-back story-deck-back-near" aria-hidden="true">
                    <div className="story-back-card-seal"><span>CD</span><small>HISTOIRE</small></div>
                    <div className="story-back-card-edition">S01 · CREATORDECK</div>
                  </div>
                  <section
                  key={scene.id} ref={sceneRef} className="story-card story-play-card" tabIndex={0}
                  data-character={character}
                  data-mood={portraitMood}
                  data-pressure={criticalStat ?? "none"}
                  data-event={/^(grand_final|finale|double_crise|archive_mensonge|lina_enquete|contrat_fantome)/.test(scene.id)}
                  data-dragging={dragging}
                  data-ready={drag <= -64 ? "left" : drag >= 64 ? "right" : "none"}
                  data-exiting={exiting ?? "none"}
                  aria-label={`Scène : ${scene.title}. Glisse la carte à gauche ou à droite pour découvrir un choix, puis relâche pour décider. Les boutons et les flèches du clavier fonctionnent aussi.`}
                  onKeyDown={keyDown}
                  onPointerDown={pointerDown}
                  onPointerMove={pointerMove}
                  onPointerUp={(event) => pointerEnd(event)}
                  onPointerCancel={(event) => pointerEnd(event, true)}
                  style={{ transform: exiting
                    ? `translate3d(${exiting === "left" ? "-120vw" : "120vw"}, -12px, 0) rotate(${exiting === "left" ? "-17deg" : "17deg"})`
                    : `translate3d(${drag * 0.82}px, ${-Math.min(4, Math.abs(drag) * 0.04)}px, 0) rotate(${drag * 0.065}deg)` }}
                >
                  <div className="story-touch-sheen" aria-hidden="true" />
                  <div className="story-direction story-direction-left" aria-hidden="true" data-active={drag < -18} data-ready={drag <= -64}
                    style={{ opacity: drag < -12 ? swipeReveal : 0, translate: `${drag < -12 ? -14 * (1 - swipeReveal) : -14}px 0` }}>
                    <span>← GAUCHE</span><strong>{scene.choices.left.label}</strong>
                  </div>
                  <div className="story-direction story-direction-right" aria-hidden="true" data-active={drag > 18} data-ready={drag >= 64}
                    style={{ opacity: drag > 12 ? swipeReveal : 0, translate: `${drag > 12 ? 14 * (1 - swipeReveal) : 14}px 0` }}>
                    <span>DROITE →</span><strong>{scene.choices.right.label}</strong>
                  </div>
                  <div className="story-card-meta" aria-hidden="true">
                    <span className="story-card-serial"><span className="story-card-monogram">CD</span> S01 / {String(run.step + 1).padStart(2, "0")}</span>
                  </div>
                  <div className="story-prompt">
                    <h2 aria-live="polite">{scene.title}</h2>
                    <p>{scene.text}</p>
                  </div>
                  <div key={scene.id} className="story-scene-art" data-channel={scene.channel} style={{ translate: `${drag * 0.075}px 0` }} aria-hidden="true">
                    <StorySetPieces channel={scene.channel} />
                    <span className="story-scene-art-channel"><StoryChannelGlyph channel={scene.channel} />{scene.channel}</span>
                    <StoryPortrait character={character} emoji={scene.emoji} mood={portraitMood} />
                    <span className="story-scene-art-label">{scene.id === "double_crise" ? "NOX + MONA" : scene.speaker.split(" · ")[0]}</span>
                  </div>
                  <div className="story-speaker story-visually-hidden">{scene.speaker === "TOI" ? "Ton point de vue" : scene.speaker}</div>
                  {run.step === 0 && <div className="story-swipe-hint" data-intro={!dragging && !exiting}><span aria-hidden="true">‹</span> MAINTIENS ET GLISSE <span aria-hidden="true">›</span></div>}
                  </section>
                </div>
                <div ref={actionsRef} className="story-actions">
                  <button className="story-choice" onPointerDown={markChoicePointer} onPointerEnter={restoreChoiceMouseHover} onClick={(event) => chooseFromButton(event, "left")}>
                    <span className="story-choice-direction">GAUCHE</span>
                    <strong>{scene.choices.left.label}</strong>
                  </button>
                  <button className="story-choice" onPointerDown={markChoicePointer} onPointerEnter={restoreChoiceMouseHover} onClick={(event) => chooseFromButton(event, "right")}>
                    <span className="story-choice-direction">DROITE</span>
                    <strong>{scene.choices.right.label}</strong>
                  </button>
                </div>
                {run.history.length > 0 && <StoryJournal run={run} />}
                {run.step > 0 && (
                  <div className="story-restart">
                    {!restartPending ? (
                      <button className="story-restart-trigger" onClick={() => setRestartPending(true)}>↻ Nouvelle partie</button>
                    ) : (
                      <div className="story-restart-confirm" role="group" aria-label="Confirmer une nouvelle partie">
                        <p>Recommencer depuis le premier direct ? Ta progression actuelle sera remplacée sur cet appareil.</p>
                        <div className="story-restart-actions">
                          <button className="story-restart-cancel" onClick={() => setRestartPending(false)}>Garder ma partie</button>
                          <button className="story-restart-yes" onClick={(event) => replay(event.detail === 0)}>Oui, recommencer</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : <p role="alert">Cette scène est introuvable. Tu peux <button onClick={() => replay()}>recommencer</button>.</p>}
          </>
        )}
      </div>
    </main>
  );
}
