import { useState } from "react";
import { act } from "react";
import { beforeEach, afterEach, describe, expect, it } from "vitest";
import { creerBanc, type Banc } from "@/ecrans-banc";
import { ReleaseNotesSheet } from "@/components/release-notes-sheet";
import { useReleaseNotes } from "@/hooks/use-release-notes";
import { RELEASE_NOTES, RELEASE_NOTES_READ_KEY } from "@/lib/release-notes";
import { runBackHandler } from "@/lib/back-stack";
function Harness() {
  const [open, setOpen] = useState(false);
  const { unreadCount } = useReleaseNotes();
  return <div className="app-shell"><button onClick={() => setOpen(true)}>Nouveautés · {unreadCount}</button>{open ? <ReleaseNotesSheet onClose={() => setOpen(false)} /> : null}</div>;
}
describe("Nouveautés : lecture choisie et historique accessible", () => {
  let banc: Banc;
  beforeEach(() => { banc = creerBanc(); banc.preparer(); window.dispatchEvent(new StorageEvent("storage", {key:RELEASE_NOTES_READ_KEY})); });
  afterEach(() => banc.nettoyer());
  it("ne s'impose pas au lancement et ne marque rien par une simple consultation", async () => {
    await banc.monter(<Harness />); expect(document.querySelector('[role="dialog"]')).toBeNull();
    banc.appuyer(/^Nouveautés/);
    expect(document.querySelector('[role="dialog"]')?.parentElement).toBe(document.querySelector('.release-notes-overlay'));
    expect(document.querySelector('.release-notes-overlay')?.parentElement).toBe(document.body);
    expect(document.querySelectorAll('.release-note-row')).toHaveLength(RELEASE_NOTES.length);
    expect(window.localStorage.getItem(RELEASE_NOTES_READ_KEY)).toBeNull();
    act(() => document.querySelector<HTMLButtonElement>('.release-note-row')!.click());
    expect(document.querySelector('.release-note-detail')?.textContent).toContain(RELEASE_NOTES[0].summary);
    expect(window.localStorage.getItem(RELEASE_NOTES_READ_KEY)).toBeNull();
    banc.appuyer('Marquer comme lue');
    expect(document.querySelector('.app-shell button')?.textContent).toBe(`Nouveautés · ${RELEASE_NOTES.length - 1}`);
    expect(document.querySelector<HTMLButtonElement>('.release-notes-read')!.disabled).toBe(true);
  });
  it("filtre les non lues et conserve toutes les notes après marquage global", async () => {
    await banc.monter(<Harness />); banc.appuyer(/^Nouveautés/); banc.appuyer(/^Non lues/); banc.appuyer('Tout marquer comme lu');
    expect(document.querySelector('.release-notes-empty')?.textContent).toContain('Tu es à jour');
    banc.appuyer('Voir toutes les mises à jour');
    expect(document.querySelectorAll('.release-note-row')).toHaveLength(RELEASE_NOTES.length);
    expect(document.querySelectorAll('.release-note-seen')).toHaveLength(RELEASE_NOTES.length);
  });
  it("ferme avec Escape ou Retour et restaure le défilement", async () => {
    document.body.style.overflow = 'auto'; await banc.monter(<Harness />); banc.appuyer(/^Nouveautés/);
    expect(document.body.style.overflow).toBe('hidden');
    act(() => document.querySelector('[role="dialog"]')!.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true})));
    expect(document.querySelector('[role="dialog"]')).toBeNull(); expect(document.body.style.overflow).toBe('auto');
    banc.appuyer(/^Nouveautés/); act(() => { expect(runBackHandler()).toBe(true); });
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    document.body.style.overflow = '';
  });
});
