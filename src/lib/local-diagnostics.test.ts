import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { diagnosticsEnabled, setDiagnosticsEnabled, recordDiagnostic, readDiagnostics, readPerfSamples, exportDiagnostics } from "./local-diagnostics";

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

  it("note l'écran en mots-clés sûrs et refuse tout autre texte", () => {
    setDiagnosticsEnabled(true);
    recordDiagnostic("long-frame", 120, "ouverture:revealing:rare");
    recordDiagnostic("long-frame", 90, "Bonjour <b>Malik</b>");
    const [first, second] = readDiagnostics();
    expect(first.where).toBe("ouverture:revealing:rare");
    expect(second.where).toBeUndefined();
  });

  it("exporte le profil de l'appareil et les secondes mesurées, puis les efface en coupant", () => {
    setDiagnosticsEnabled(true);
    values.set("creatordeck.diagnostics.perf.v1", JSON.stringify([
      { at: 1, where: "ouverture:revealing:common", fps: 9, worstMs: 210, anims: 4, heapMb: 70 },
      { at: 2, where: "pas valide !", fps: 30, worstMs: 50, anims: 2 },
      { at: 3, fps: "rapide" },
    ]));
    const samples = readPerfSamples();
    expect(samples).toHaveLength(2);
    expect(samples[0]).toEqual({ at: 1, where: "ouverture:revealing:common", fps: 9, worstMs: 210, anims: 4, heapMb: 70 });
    expect(samples[1].where).toBe("inconnu");
    const exported = JSON.parse(exportDiagnostics());
    expect(exported.perf).toHaveLength(2);
    expect(exported.device).toBeTypeOf("object");
    expect(exportDiagnostics()).not.toMatch(/email|token|message|url/i);
    setDiagnosticsEnabled(false);
    expect(readPerfSamples()).toEqual([]);
  });
});
