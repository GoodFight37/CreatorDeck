import { Capacitor } from "@capacitor/core";
import { BUILD_COMMIT } from "./build-version";

const ENABLED_KEY = "creatordeck.diagnostics.enabled.v1";
const EVENTS_KEY = "creatordeck.diagnostics.events.v1";
const PERF_KEY = "creatordeck.diagnostics.perf.v1";
const KINDS = ["script-error", "promise-error", "long-task", "long-frame", "slow-interaction"] as const;
export type DiagnosticKind = (typeof KINDS)[number];
/** `where` : l'écran au moment de l'incident (ex. `home-view`, `ouverture:revealing:rare`). */
export type DiagnosticEvent = { kind: DiagnosticKind; at: number; durationMs?: number; where?: string };
/** Une seconde mesurée : images rendues, pire image, animations actives, mémoire JS. */
export type PerfSample = { at: number; where: string; fps: number; worstMs: number; anims: number; heapMb?: number };
const MAX_EVENTS = 100;
const MAX_SAMPLES = 240;
/** Sous ce débit, une seconde est notée même hors de l'ouverture. */
const SLOW_FPS = 40;
let stopListening: (() => void) | null = null;

function storage(): Storage | null {
  try { return typeof window === "undefined" ? null : window.localStorage; }
  catch { return null; }
}

function cleanWhere(value: unknown): string | undefined {
  return typeof value === "string" && /^[a-z0-9:-]{1,48}$/.test(value) ? value : undefined;
}

/** L'écran visible, en mots-clés sûrs : jamais de texte affiché ni d'identifiant. */
export function currentWhere(): string {
  if (typeof document === "undefined" || !document.querySelector) return "inconnu";
  try {
    const scene = document.querySelector<HTMLElement>("[data-opening-phase]");
    if (scene) {
      const phase = cleanWhere(scene.dataset.openingPhase) ?? "scene";
      const rarity = document.querySelector(".reveal-flip")?.className.match(/rarity-([a-z]+)/)?.[1];
      return `ouverture:${phase}${rarity ? `:${rarity}` : ""}`;
    }
    const view = document.querySelector(".view")?.className.match(/\b([a-z-]+-view)\b/)?.[1];
    return cleanWhere(view) ?? "inconnu";
  } catch { return "inconnu"; }
}

export function diagnosticsEnabled(): boolean {
  try { return storage()?.getItem(ENABLED_KEY) === "1"; }
  catch { return false; }
}

function readList(key: string): unknown[] {
  try {
    const raw = storage()?.getItem(key);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
type Raw = Record<string, unknown>;
const isRaw = (item: unknown): item is Raw => Boolean(item) && typeof item === "object";

export function readDiagnostics(): DiagnosticEvent[] {
  return readList(EVENTS_KEY).slice(-MAX_EVENTS).flatMap((item): DiagnosticEvent[] => {
    if (!isRaw(item) || !KINDS.includes(item.kind as DiagnosticKind) || !finite(item.at)) return [];
    const where = cleanWhere(item.where);
    return [{ kind: item.kind as DiagnosticKind, at: item.at,
      ...(finite(item.durationMs) ? { durationMs: item.durationMs } : {}),
      ...(where ? { where } : {}) }];
  });
}

export function readPerfSamples(): PerfSample[] {
  return readList(PERF_KEY).slice(-MAX_SAMPLES).flatMap((item): PerfSample[] => {
    if (!isRaw(item) || !finite(item.at) || !finite(item.fps)) return [];
    return [{ at: item.at, where: cleanWhere(item.where) ?? "inconnu", fps: item.fps,
      worstMs: finite(item.worstMs) ? item.worstMs : 0, anims: finite(item.anims) ? item.anims : 0,
      ...(finite(item.heapMb) ? { heapMb: item.heapMb } : {}) }];
  });
}

export function recordDiagnostic(kind: DiagnosticKind, durationMs?: number, where?: string): void {
  if (!diagnosticsEnabled() || !KINDS.includes(kind)) return;
  const event: DiagnosticEvent = { kind, at: Date.now() };
  if (Number.isFinite(durationMs)) event.durationMs = Math.max(0, Math.min(60_000, Math.round(durationMs!)));
  const place = cleanWhere(where);
  if (place) event.where = place;
  try { storage()?.setItem(EVENTS_KEY, JSON.stringify([...readDiagnostics(), event].slice(-MAX_EVENTS))); }
  catch { /* Un quota de stockage ne doit jamais interrompre le jeu. */ }
}

function recordPerfSample(sample: PerfSample): void {
  if (!diagnosticsEnabled()) return;
  try { storage()?.setItem(PERF_KEY, JSON.stringify([...readPerfSamples(), sample].slice(-MAX_SAMPLES))); }
  catch { /* idem */ }
}

/** Le profil technique de l'appareil : ce qui explique une lenteur, rien d'identifiant. */
function deviceProfile() {
  if (typeof window === "undefined") return {};
  const nav = typeof navigator === "undefined" ? undefined : navigator as Navigator & { deviceMemory?: number };
  const media = (query: string) => { try { return Boolean(window.matchMedia?.(query).matches); } catch { return false; } };
  return {
    webview: nav?.userAgent?.match(/Chrome\/(\d+)/)?.[1] ?? "inconnue",
    android: nav?.userAgent?.match(/Android (\d+)/)?.[1] ?? null,
    dpr: window.devicePixelRatio ?? null,
    screen: typeof window.innerWidth === "number" ? `${window.innerWidth}x${window.innerHeight}` : null,
    cores: nav?.hardwareConcurrency ?? null,
    memoryGb: nav?.deviceMemory ?? null,
    reducedMotion: media("(prefers-reduced-motion: reduce)"),
    cardFx: typeof document === "undefined" ? null : document.documentElement?.dataset?.cardFx ?? "on",
  };
}

export function exportDiagnostics(): string {
  return JSON.stringify({ platform: Capacitor.isNativePlatform() ? "android" : "web",
    commit: BUILD_COMMIT || "inconnu", device: deviceProfile(),
    events: readDiagnostics(), perf: readPerfSamples() }, null, 2);
}

export function setDiagnosticsEnabled(enabled: boolean): void {
  try {
    if (enabled) storage()?.setItem(ENABLED_KEY, "1");
    else { storage()?.removeItem(ENABLED_KEY); storage()?.removeItem(EVENTS_KEY); storage()?.removeItem(PERF_KEY); }
  } catch { /* Le réglage reste inoffensif si le stockage est indisponible. */ }
  if (enabled) startLocalDiagnostics();
  else { stopListening?.(); stopListening = null; }
}

/**
 * Mesure seconde par seconde, seulement quand le diagnostic est allumé : une
 * seconde est gardée pendant l'ouverture d'un booster, ou dès qu'elle passe
 * sous SLOW_FPS. Rien n'est mesuré quand l'appli est en arrière-plan.
 */
function startFrameSampler(): () => void {
  if (typeof window === "undefined" || typeof window.requestAnimationFrame !== "function") return () => {};
  let frame = 0;
  let windowStart = 0;
  let last = 0;
  let frames = 0;
  let worst = 0;
  const tick = (now: number) => {
    frame = window.requestAnimationFrame(tick);
    if (typeof document !== "undefined" && document.visibilityState === "hidden") { windowStart = 0; return; }
    if (!windowStart) { windowStart = now; last = now; frames = 0; worst = 0; return; }
    frames++;
    worst = Math.max(worst, now - last);
    last = now;
    if (now - windowStart < 1_000) return;
    const fps = Math.round((frames * 1_000) / (now - windowStart));
    const where = currentWhere();
    if (where.startsWith("ouverture") || fps < SLOW_FPS) {
      const memory = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
      let anims = 0;
      try { anims = document.getAnimations?.().filter((a) => a.playState === "running").length ?? 0; } catch { /* API optionnelle */ }
      recordPerfSample({ at: Date.now(), where, fps, worstMs: Math.round(worst), anims,
        ...(memory ? { heapMb: Math.round(memory.usedJSHeapSize / 1e6) } : {}) });
    }
    windowStart = now; frames = 0; worst = 0;
  };
  frame = window.requestAnimationFrame(tick);
  return () => window.cancelAnimationFrame?.(frame);
}

export function startLocalDiagnostics(): void {
  if (typeof window === "undefined" || !diagnosticsEnabled() || stopListening) return;
  const onError = () => recordDiagnostic("script-error", undefined, currentWhere());
  const onRejection = () => recordDiagnostic("promise-error", undefined, currentWhere());
  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);
  const observers: PerformanceObserver[] = [];
  const lastAt = new Map<DiagnosticKind, number>();
  const observe = (type: string, kind: DiagnosticKind, minimumMs: number) => {
    if (typeof PerformanceObserver === "undefined" || !PerformanceObserver.supportedEntryTypes?.includes(type)) return;
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          // Une par seconde et par type : assez pour suivre une ouverture, sans noyer le journal.
          if (entry.duration < minimumMs || Date.now() - (lastAt.get(kind) ?? 0) < 1_000) continue;
          lastAt.set(kind, Date.now());
          recordDiagnostic(kind, entry.duration, currentWhere());
        }
      });
      observer.observe({ type, buffered: false, ...(type === "event" ? { durationThreshold: 40 } : {}) });
      observers.push(observer);
    } catch { /* API optionnelle selon le navigateur et la WebView. */ }
  };
  observe("longtask", "long-task", 50);
  observe("long-animation-frame", "long-frame", 50);
  observe("event", "slow-interaction", 100);
  const stopSampler = startFrameSampler();
  stopListening = () => {
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onRejection);
    for (const observer of observers) observer.disconnect();
    stopSampler();
  };
}
