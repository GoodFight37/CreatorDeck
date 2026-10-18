import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { diagnosticsEnabled, setDiagnosticsEnabled, recordDiagnostic, readDiagnostics, exportDiagnostics } from "./local-diagnostics";

const values = new Map<string, string>();
const storage = {
  getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => { values.set(key, value); },
  removeItem: (key: string) => { values.delete(key); },
};

beforeEach(() => {
  values.clear();
  vi.stubGlobal("window", { localStorage: storage, addEventListener: vi.fn(), removeEventListener: vi.fn() });
});
afterEach(() => vi.unstubAllGlobals());

describe("diagnostic volontaire et local", () => {
  it("reste éteint par défaut puis ne garde que le type et la durée d'un incident", () => {
    expect(diagnosticsEnabled()).toBe(false);
    recordDiagnostic("script-error");
    expect(readDiagnostics()).toEqual([]);
    setDiagnosticsEnabled(true);
    recordDiagnostic("long-task", 83);
    recordDiagnostic("script-error");
    const events = readDiagnostics();
    expect(events.map((event) => event.kind)).toEqual(["long-task", "script-error"]);
    expect(events[0].durationMs).toBe(83);
    expect(exportDiagnostics()).not.toMatch(/email|token|message|url/i);
  });

  it("efface les mesures en coupant l'option et borne le journal à 100 éléments", () => {
    setDiagnosticsEnabled(true);
    for (let i = 0; i < 120; i++) recordDiagnostic("long-frame", i);
    expect(readDiagnostics()).toHaveLength(100);
    setDiagnosticsEnabled(false);
    expect(readDiagnostics()).toEqual([]);
    expect(diagnosticsEnabled()).toBe(false);
  });
});
