import { Capacitor } from "@capacitor/core";
import { BUILD_COMMIT } from "./build-version";

const ENABLED_KEY = "creatordeck.diagnostics.enabled.v1";
const EVENTS_KEY = "creatordeck.diagnostics.events.v1";
const KINDS = ["script-error", "promise-error", "long-task", "long-frame", "slow-interaction"] as const;
export type DiagnosticKind = (typeof KINDS)[number];
export type DiagnosticEvent = { kind: DiagnosticKind; at: number; durationMs?: number };
let stopListening: (() => void) | null = null;

function storage(): Storage | null {
  try { return typeof window === "undefined" ? null : window.localStorage; }
  catch { return null; }
}

export function diagnosticsEnabled(): boolean {
  try { return storage()?.getItem(ENABLED_KEY) === "1"; }
  catch { return false; }
}

export function readDiagnostics(): DiagnosticEvent[] {
  try {
    const raw = storage()?.getItem(EVENTS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(-100).flatMap((item): DiagnosticEvent[] => {
      if (!item || typeof item !== "object" || !KINDS.includes(item.kind)) return [];
      if (!Number.isFinite(item.at)) return [];
      return [{ kind: item.kind, at: item.at,
        ...(Number.isFinite(item.durationMs) ? { durationMs: item.durationMs } : {}) }];
    });
  } catch { return []; }
}

export function recordDiagnostic(kind: DiagnosticKind, durationMs?: number): void {
  if (!diagnosticsEnabled() || !KINDS.includes(kind)) return;
  const event: DiagnosticEvent = { kind, at: Date.now() };
  if (Number.isFinite(durationMs)) event.durationMs = Math.max(0, Math.min(60_000, Math.round(durationMs!)));
  try { storage()?.setItem(EVENTS_KEY, JSON.stringify([...readDiagnostics(), event].slice(-100))); }
  catch { /* Un quota de stockage ne doit jamais interrompre le jeu. */ }
}

export function exportDiagnostics(): string {
  return JSON.stringify({ platform: Capacitor.isNativePlatform() ? "android" : "web",
    commit: BUILD_COMMIT || "inconnu", events: readDiagnostics() }, null, 2);
}

export function setDiagnosticsEnabled(enabled: boolean): void {
  try {
    if (enabled) storage()?.setItem(ENABLED_KEY, "1");
    else { storage()?.removeItem(ENABLED_KEY); storage()?.removeItem(EVENTS_KEY); }
  } catch { /* Le réglage reste inoffensif si le stockage est indisponible. */ }
  if (enabled) startLocalDiagnostics();
  else { stopListening?.(); stopListening = null; }
}

export function startLocalDiagnostics(): void {
  if (typeof window === "undefined" || !diagnosticsEnabled() || stopListening) return;
  const onError = () => recordDiagnostic("script-error");
  const onRejection = () => recordDiagnostic("promise-error");
  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);
  const observers: PerformanceObserver[] = [];
  const lastAt = new Map<DiagnosticKind, number>();
  const observe = (type: string, kind: DiagnosticKind, minimumMs: number) => {
    if (typeof PerformanceObserver === "undefined" || !PerformanceObserver.supportedEntryTypes?.includes(type)) return;
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration < minimumMs || Date.now() - (lastAt.get(kind) ?? 0) < 5_000) continue;
          lastAt.set(kind, Date.now());
          recordDiagnostic(kind, entry.duration);
        }
      });
      observer.observe({ type, buffered: false, ...(type === "event" ? { durationThreshold: 40 } : {}) });
      observers.push(observer);
    } catch { /* API optionnelle selon le navigateur et la WebView. */ }
  };
  observe("longtask", "long-task", 50);
  observe("long-animation-frame", "long-frame", 50);
  observe("event", "slow-interaction", 100);
  stopListening = () => {
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onRejection);
    for (const observer of observers) observer.disconnect();
  };
}
