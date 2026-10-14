import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createReleaseNotesStore, parseReleaseNoteReadIds, RELEASE_NOTES, RELEASE_NOTES_READ_KEY } from "./release-notes";

describe("journal joueur et lecture indépendante", () => {
  let storage: Map<string, string>;
  beforeEach(() => {
    storage = new Map();
    vi.stubGlobal("window", Object.assign(new EventTarget(), { localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => { storage.set(key, value); },
    } }));
  });
  afterEach(() => vi.unstubAllGlobals());
  it("publie des identifiants uniques, dates valides, textes complets et notes récentes en tête", () => {
    expect(RELEASE_NOTES.length).toBeGreaterThan(0);
    expect(new Set(RELEASE_NOTES.map((note) => note.id)).size).toBe(RELEASE_NOTES.length);
    for (const [index, note] of RELEASE_NOTES.entries()) {
      expect(note.id).toMatch(/^[a-z0-9-]+$/); expect(note.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(new Date(`${note.date}T12:00:00Z`).toISOString().slice(0, 10)).toBe(note.date);
      if (index > 0) expect(note.date <= RELEASE_NOTES[index - 1].date).toBe(true);
      expect(note.title.length).toBeGreaterThan(5); expect(note.summary.length).toBeGreaterThan(10);
      expect(note.sections.length).toBeGreaterThan(0);
      for (const section of note.sections) { expect(section.title).toBeTruthy(); expect(section.items.every((item) => item.length > 10)).toBe(true); }
    }
  });
  it("tolère un stockage absent, mal formé ou d'une autre version", () => {
    for (const raw of [null, "{", "null", "42", '{"version":2,"readIds":[]}', '{"version":1,"readIds":"all"}']) expect(parseReleaseNoteReadIds(raw)).toEqual([]);
    expect(parseReleaseNoteReadIds('{"version":1,"readIds":["future-note","future-note",null,1,"<script>"]}')).toEqual(["future-note"]);
  });
  it("garde un snapshot stable et ne marque rien à l’ouverture", () => {
    const store = createReleaseNotesStore(); const snapshot = store.getSnapshot();
    expect(snapshot.readIds).toEqual([]); expect(store.getSnapshot()).toBe(snapshot);
    expect(storage.size).toBe(0); expect(store.getServerSnapshot().readIds).toEqual([]);
  });
  it("mémorise une note et conserve les clés du jeu", () => {
    storage.set("creatordeck.save.v9", "progression intacte");
    const store = createReleaseNotesStore(); store.markRead([RELEASE_NOTES[0].id]);
    expect(store.getSnapshot().readIds).toEqual([RELEASE_NOTES[0].id]);
    expect(createReleaseNotesStore().getSnapshot().readIds).toEqual([RELEASE_NOTES[0].id]);
    expect(storage.get("creatordeck.save.v9")).toBe("progression intacte");
    expect([...storage.keys()]).toEqual(["creatordeck.save.v9", RELEASE_NOTES_READ_KEY]);
  });
  it("ne marque pas les autres notes ou un identifiant inconnu", () => {
    const store = createReleaseNotesStore(); store.markRead([RELEASE_NOTES[0].id, "inconnue"]);
    expect(RELEASE_NOTES.filter((note) => !store.getSnapshot().readIds.includes(note.id))).toHaveLength(RELEASE_NOTES.length - 1);
    expect(store.getSnapshot().readIds).not.toContain("inconnue");
  });
  it("fusionne les lectures déjà stockées par un autre onglet avant écriture", () => {
    const first = createReleaseNotesStore(), second = createReleaseNotesStore();
    first.getSnapshot(); second.getSnapshot();
    first.markRead([RELEASE_NOTES[0].id]); second.markRead([RELEASE_NOTES[1].id]);
    expect(parseReleaseNoteReadIds(storage.get(RELEASE_NOTES_READ_KEY)!)).toEqual([RELEASE_NOTES[0].id, RELEASE_NOTES[1].id]);
  });
  it("réagit au stockage entre onglets et nettoie l’abonnement", () => {
    const store = createReleaseNotesStore(), notify = vi.fn(); store.getSnapshot(); const off = store.subscribe(notify);
    storage.set(RELEASE_NOTES_READ_KEY, JSON.stringify({version:1, readIds:[RELEASE_NOTES[0].id]}));
    window.dispatchEvent(Object.assign(new Event("storage"), {key:RELEASE_NOTES_READ_KEY}));
    expect(store.getSnapshot().readIds).toEqual([RELEASE_NOTES[0].id]); expect(notify).toHaveBeenCalledTimes(1);
    off(); storage.clear(); window.dispatchEvent(Object.assign(new Event("storage"), {key:null}));
    expect(notify).toHaveBeenCalledTimes(1);
  });
  it("reste utilisable pour la session si le stockage est bloqué", () => {
    window.localStorage.getItem = () => { throw new Error("bloqué"); };
    window.localStorage.setItem = () => { throw new Error("bloqué"); };
    const store = createReleaseNotesStore(); expect(store.getSnapshot().persisted).toBe(false);
    store.markRead(RELEASE_NOTES.map((note) => note.id));
    expect(store.getSnapshot().persisted).toBe(false); expect(store.getSnapshot().readIds).toHaveLength(RELEASE_NOTES.length);
  });
});
