"use client";

import { useEffect, useRef, useState, type PointerEvent, type KeyboardEvent } from "react";
import Link from "next/link";
import { STORY_PROLOGUE } from "../data/story-prologue";
import {
  STORY_ENDINGS, STORY_SAVE_KEY, STORY_STATS, chooseStory, currentStoryScene,
  restoreStory, startStory, type StoryDirection, type StoryRun, type StoryStat,
} from "../lib/story-mode";
import "./story-mode.css";

const SCRIPT = STORY_PROLOGUE;
const STAT_LABELS: Record<StoryStat, { name: string }> = {
  public: { name: "Public" },
  energie: { name: "Énergie" },
  argent: { name: "Argent" },
  confiance: { name: "Confiance" },
};

export function StoryMode() {
  const [run, setRun] = useState<StoryRun | null>(null);
  const [drag, setDrag] = useState(0);
  const gesture = useRef<{ x: number; y: number; pointerId: number } | null>(null);
  // Empêche qu’un double-tap valide deux scènes successives au même endroit.
  const lastDecisionAt = useRef(Number.NEGATIVE_INFINITY);

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

  const scene = run ? currentStoryScene(SCRIPT, run) : null;
  const character = scene?.id === "double_crise" ? "duo"
    : scene?.speaker.startsWith("FLO") ? "flo"
    : scene?.speaker.startsWith("NOX") ? "nox"
    : scene?.speaker.startsWith("MONA") ? "mona" : "toi";
  const lastEffects = run?.history.at(-1)?.effects;
  const changedStats = lastEffects ? STORY_STATS.filter((stat) => (lastEffects[stat] ?? 0) !== 0) : [];

  function decide(direction: StoryDirection) {
    const expectedStep = run?.step;
    if (expectedStep === undefined) return;
    const now = performance.now();
    if (now - lastDecisionAt.current < 450) return;
    lastDecisionAt.current = now;
    setRun((previous) => previous?.step === expectedStep ? chooseStory(SCRIPT, previous, direction) : previous);
    gesture.current = null;
    setDrag(0);
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
      decide(event.key === "ArrowLeft" ? "left" : "right");
    }
  }

  function replay() {
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
              <section className="story-card story-ending" aria-live="polite">
                <div className="story-face" aria-hidden="true">{STORY_ENDINGS[run.ending].emoji}</div>
                <div className="story-chapter">FIN DE PARTIE · {run.history.length} DÉCISIONS</div>
                <h2>{STORY_ENDINGS[run.ending].title}</h2>
                <p>{STORY_ENDINGS[run.ending].text}</p>
                <button className="story-replay" onClick={replay}>↻ Recommencer l’histoire</button>
              </section>
            ) : scene ? (
              <>
                <div className="story-progress" aria-label={`Décision ${run.step + 1} sur ${SCRIPT.totalSteps}`}>
                  <span>CHAPITRE {String(run.step + 1).padStart(2, "0")}</span>
                  <span>{run.step + 1} / {SCRIPT.totalSteps}</span>
                </div>
                <div className="story-progress-track" aria-hidden="true"><span style={{ width: `${((run.step + 1) / SCRIPT.totalSteps) * 100}%` }} /></div>
                <section
                  className="story-card story-play-card" tabIndex={0}
                  data-character={character}
                  aria-label={`Scène : ${scene.title}. Utilise les flèches gauche et droite du clavier ou les boutons de choix.`}
                  onKeyDown={keyDown}
                  onPointerDown={pointerDown}
                  onPointerMove={pointerMove}
                  onPointerUp={(event) => pointerEnd(event)}
                  onPointerCancel={(event) => pointerEnd(event, true)}
                  style={{ transform: `translateX(${drag * 0.32}px) rotate(${drag * 0.045}deg)` }}
                >
                  <div className="story-direction story-direction-left" data-active={drag < -64}>← {scene.choices.left.label}</div>
                  <div className="story-direction story-direction-right" data-active={drag > 64}>{scene.choices.right.label} →</div>
                  <div className="story-card-meta" aria-hidden="true">
                    <span>DILEMME {String(run.step + 1).padStart(2, "0")}</span>
                    <span className="story-card-meta-mark">● EN COURS</span>
                  </div>
                  <div key={scene.id} className="story-scene-art" data-channel={scene.channel} aria-hidden="true">
                    <span className="story-scene-art-channel">{scene.channel}</span>
                    <div className="story-face">{scene.emoji}</div>
                    <span className="story-scene-art-label">{scene.id === "double_crise" ? "NOX + MONA" : scene.speaker.split(" · ")[0]}</span>
                  </div>
                  <div className="story-speaker">{scene.speaker === "TOI" ? "TON POINT DE VUE" : scene.speaker}</div>
                  <h2 aria-live="polite">{scene.title}</h2>
                  <p>{scene.text}</p>
                  <div className="story-swipe-hint">← GLISSE POUR CHOISIR →</div>
                </section>
                <div className="story-actions">
                  <button className="story-choice" onClick={(event) => { if (event.detail > 0 && window.matchMedia("(hover: none)").matches) event.currentTarget.blur(); decide("left"); }}>
                    <span className="story-choice-direction">GAUCHE</span>
                    <strong>{scene.choices.left.label}</strong>
                  </button>
                  <button className="story-choice" onClick={(event) => { if (event.detail > 0 && window.matchMedia("(hover: none)").matches) event.currentTarget.blur(); decide("right"); }}>
                    <span className="story-choice-direction">DROITE</span>
                    <strong>{scene.choices.right.label}</strong>
                  </button>
                </div>
                <p className="story-footnote">Les conséquences ne sont pas toujours immédiates. Sauvegarde automatique sur cet appareil.</p>
              </>
            ) : <p role="alert">Cette scène est introuvable. Tu peux <button onClick={replay}>recommencer</button>.</p>}
          </>
        )}
      </div>
    </main>
  );
}
