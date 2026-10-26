"use client";

import { useEffect, useRef, useState, type PointerEvent, type KeyboardEvent, type MouseEvent } from "react";
import Link from "next/link";
import { STORY_PROLOGUE } from "../data/story-prologue";
import {
  STORY_SAVE_KEY, STORY_STATS, chooseStory, currentStoryScene, lastStoryAppliedEffects, storyEndingNarrative, storyChoiceSignals,
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

export function StoryMode() {
  const [run, setRun] = useState<StoryRun | null>(null);
  const [drag, setDrag] = useState(0);
  const [restartPending, setRestartPending] = useState(false);
  const gesture = useRef<{ x: number; y: number; pointerId: number } | null>(null);
  // Empêche qu’un double-tap valide deux scènes successives au même endroit.
  const lastDecisionAt = useRef(Number.NEGATIVE_INFINITY);
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
    if (progressTop < 12 || actionsBottom > window.innerHeight - 12) {
      progress.scrollIntoView({ block: "start", behavior: "auto" });
    }
  }, [step, ending]);

  const scene = run ? currentStoryScene(SCRIPT, run) : null;
  const resolvedEnding = run?.ending ? storyEndingNarrative(run) : null;
  const interlude = run ? storyActInterlude(run) : null;
  const character = scene?.id === "double_crise" ? "duo"
    : scene?.speaker.startsWith("FLO") ? "flo"
    : scene?.speaker.startsWith("NOX") ? "nox"
    : scene?.speaker.startsWith("MONA") ? "mona" : "toi";
  const lastEffects = run ? lastStoryAppliedEffects(SCRIPT, run) : null;
  const changedStats = lastEffects ? STORY_STATS.filter((stat) => (lastEffects[stat] ?? 0) !== 0) : [];

  function decide(direction: StoryDirection, focusScene = false) {
    const expectedStep = run?.step;
    if (expectedStep === undefined) return;
    const now = performance.now();
    if (now - lastDecisionAt.current < 450) return;
    lastDecisionAt.current = now;
    focusNextScene.current = focusScene;
    setRestartPending(false);
    setRun((previous) => previous?.step === expectedStep ? chooseStory(SCRIPT, previous, direction) : previous);
    gesture.current = null;
    setDrag(0);
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
    if (!scene || gesture.current) return;
    gesture.current = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function pointerMove(event: PointerEvent<HTMLElement>) {
    if (!gesture.current || gesture.current.pointerId !== event.pointerId) return;
    const dx = event.clientX - gesture.current.x;
    const dy = event.clientY - gesture.current.y;
    setDrag(Math.abs(dx) >= Math.abs(dy) * 1.2 ? Math.max(-100, Math.min(100, dx)) : 0);
  }

  function pointerEnd(event: PointerEvent<HTMLElement>, cancelled = false) {
    const start = gesture.current;
    if (!start || start.pointerId !== event.pointerId) return;
    gesture.current = null;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (!cancelled && Math.abs(dx) >= 64 && Math.abs(dx) > Math.abs(dy) * 1.2) decide(dx < 0 ? "left" : "right");
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
    setRestartPending(false);
    focusNextScene.current = focusScene;
    lastDecisionAt.current = Number.NEGATIVE_INFINITY;
    gesture.current = null;
    setDrag(0);
    setRun(startStory(SCRIPT));
  }

  return (
    <main className="story-page">
      <header className="story-header">
        <Link href="/" className="story-back" aria-label="Retour à CreatorDeck">‹ CreatorDeck</Link>
        <div className="story-brand">MODE HISTOIRE <span>· PILOTE</span></div>
      </header>
      <div className="story-shell">
        <div className="story-intro">
          <h1>{SCRIPT.title}</h1>
          <p>{SCRIPT.subtitle}</p>
        </div>
        {!run ? <p role="status" className="story-loading">Chargement de la partie…</p> : (
          <>
            <section className="story-stats" aria-label="Tes quatre jauges">
              {STORY_STATS.map((key) => (
                <div key={key} className="story-stat" data-low={run.stats[key] <= 20}>
                  <div className="story-stat-top">
                    <span>{STAT_LABELS[key].name}</span>
                    <strong>{run.stats[key]} <span>/ 100</span></strong>
                  </div>
                  <div className="story-meter" role="progressbar" aria-label={STAT_LABELS[key].name} aria-valuemin={0} aria-valuemax={100} aria-valuenow={run.stats[key]} aria-valuetext={`${run.stats[key]} sur 100${run.stats[key] <= 20 ? ", niveau critique" : ""}`}>
                    <div className={`story-meter-fill story-meter-${key}`} style={{ width: `${run.stats[key]}%` }} />
                  </div>
                  {run.stats[key] <= 20 && <span className="story-stat-alert" aria-hidden="true">⚠ NIVEAU CRITIQUE</span>}
                </div>
              ))}
            </section>
            <div className="story-impact" role="status" aria-live="polite" aria-atomic="true">
              {lastEffects && changedStats.length > 0 && (
                <>
                  <span className="story-impact-label">TON DERNIER CHOIX</span>
                  <div className="story-impact-values">
                    {changedStats.map((stat) => {
                      const delta = lastEffects[stat] ?? 0;
                      return (
                        <span key={stat} className="story-impact-value" data-trend={delta > 0 ? "up" : "down"}>
                          {delta > 0 ? "↑" : "↓"} {STAT_LABELS[stat].name} {delta > 0 ? "+" : ""}{delta}
                        </span>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
            {run.ending ? (
              <section ref={endingRef} tabIndex={-1} className="story-card story-ending" aria-live="polite">
                <div className="story-face" aria-hidden="true">{resolvedEnding?.emoji}</div>
                <div className="story-chapter">FIN DE PARTIE · {run.history.length} DÉCISIONS</div>
                <h2>{resolvedEnding?.title}</h2>
                <p>{resolvedEnding?.text}</p>
                <div className="story-epilogue" aria-label="Ce que tes choix ont changé">
                  <h3>CE QUE TU LAISSES DERRIÈRE TOI</h3>
                  {storyEpilogue(run).map((memory, index) => <p key={index}>{memory}</p>)}
                </div>
                <details className="story-recap" aria-live="off">
                  <summary>Revoir mes {run.history.length} décisions</summary>
                  <ol>
                    {run.history.map((entry, index) => {
                      const chapter = SCRIPT.scenes.find((candidate) => candidate.id === entry.sceneId);
                      return (
                        <li key={index}>
                          <span className="story-recap-scene">{chapter?.title ?? `Chapitre ${index + 1}`}</span>
                          <strong>{chapter?.choices[entry.direction].label ?? (entry.direction === "left" ? "Choix gauche" : "Choix droit")}</strong>
                        </li>
                      );
                    })}
                  </ol>
                </details>
                <button className="story-replay" onClick={(event) => replay(event.detail === 0)}>↻ Recommencer l’histoire</button>
              </section>
            ) : scene ? (
              <>
                <div ref={progressRef} className="story-progress" aria-label={`Décision ${run.step + 1} sur ${SCRIPT.totalSteps}`}>
                  <span>ACTE {storyActNumber(run.step)} · CHAPITRE {String(run.step + 1).padStart(2, "0")}</span>
                  <span>{run.step + 1} / {SCRIPT.totalSteps}</span>
                </div>
                <div className="story-progress-track" aria-hidden="true"><span style={{ width: `${((run.step + 1) / SCRIPT.totalSteps) * 100}%` }} /></div>
                <section
                  ref={sceneRef} className="story-card story-play-card" tabIndex={0}
                  data-character={character}
                  aria-label={`Scène : ${scene.title}. Utilise les flèches gauche et droite du clavier ou les boutons de choix.`}
                  onKeyDown={keyDown}
                  onPointerDown={pointerDown}
                  onPointerMove={pointerMove}
                  onPointerUp={(event) => pointerEnd(event)}
                  onPointerCancel={(event) => pointerEnd(event, true)}
                  style={{ transform: `translateX(${drag * 0.32}px) rotate(${drag * 0.045}deg)` }}
                >
                  <div className="story-direction story-direction-left" aria-hidden="true" data-active={drag < -18} data-ready={drag <= -64}>← {scene.choices.left.label}</div>
                  <div className="story-direction story-direction-right" aria-hidden="true" data-active={drag > 18} data-ready={drag >= 64}>{scene.choices.right.label} →</div>
                  <div className="story-card-meta" aria-hidden="true">
                    <span>DILEMME {String(run.step + 1).padStart(2, "0")}</span>
                    <span className="story-card-meta-mark">● EN COURS</span>
                  </div>
                  {interlude && (
                    <div className="story-act-interlude" role="note">
                      <strong>{interlude.title}</strong>
                      <p>{interlude.text}</p>
                    </div>
                  )}
                  <div key={scene.id} className="story-scene-art" data-channel={scene.channel} aria-hidden="true">
                    <span className="story-scene-art-channel">{scene.channel}</span>
                    <div className="story-face">{scene.emoji}</div>
                    <span className="story-scene-art-label">{scene.id === "double_crise" ? "NOX + MONA" : scene.speaker.split(" · ")[0]}</span>
                  </div>
                  <div className="story-speaker">{scene.speaker === "TOI" ? "TON POINT DE VUE" : scene.speaker}</div>
                  <h2 aria-live="polite">{scene.title}</h2>
                  <p>{scene.text}</p>
                  <div className="story-swipe-hint">← GLISSE POUR VOIR LES CHOIX →</div>
                </section>
                <div ref={actionsRef} className="story-actions">
                  <button className="story-choice" onPointerDown={markChoicePointer} onPointerEnter={restoreChoiceMouseHover} onClick={(event) => chooseFromButton(event, "left")}>
                    <span className="story-choice-direction">GAUCHE</span>
                    <strong>{scene.choices.left.label}</strong>
                    <span className="story-choice-signals" aria-label="Jauges concernées">
                      {storyChoiceSignals(run.stats, scene.choices.left.effects).map(({ stat, direction: trend }) => (
                        <span key={stat} className="story-choice-signal" data-trend={trend} aria-label={`${STAT_LABELS[stat].name} en ${trend === "up" ? "hausse" : "baisse"}`}>
                          <span aria-hidden="true">{trend === "up" ? "↑" : "↓"}</span> {STAT_LABELS[stat].name}
                        </span>
                      ))}
                    </span>
                  </button>
                  <button className="story-choice" onPointerDown={markChoicePointer} onPointerEnter={restoreChoiceMouseHover} onClick={(event) => chooseFromButton(event, "right")}>
                    <span className="story-choice-direction">DROITE</span>
                    <strong>{scene.choices.right.label}</strong>
                    <span className="story-choice-signals" aria-label="Jauges concernées">
                      {storyChoiceSignals(run.stats, scene.choices.right.effects).map(({ stat, direction: trend }) => (
                        <span key={stat} className="story-choice-signal" data-trend={trend} aria-label={`${STAT_LABELS[stat].name} en ${trend === "up" ? "hausse" : "baisse"}`}>
                          <span aria-hidden="true">{trend === "up" ? "↑" : "↓"}</span> {STAT_LABELS[stat].name}
                        </span>
                      ))}
                    </span>
                  </button>
                </div>
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
                <p className="story-footnote">Les conséquences ne sont pas toujours immédiates. Sauvegarde automatique sur cet appareil.</p>
              </>
            ) : <p role="alert">Cette scène est introuvable. Tu peux <button onClick={() => replay()}>recommencer</button>.</p>}
          </>
        )}
      </div>
    </main>
  );
}
