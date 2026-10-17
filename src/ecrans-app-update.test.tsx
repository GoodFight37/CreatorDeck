import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { creerBanc, type Banc } from "@/ecrans-banc";
import { AppUpdateBanner } from "@/components/app-update-banner";
import type { NativeUpdater } from "@/lib/native-updater";
import { buildManifest } from "../scripts/apk-manifest.mjs";
import { UPDATE_REPO } from "@/lib/app-update";

const SHA = "e376fa609804ea82b1b647b960788f8481ec1419";
const SHA256 = "3f7139cb5506e0ff4f1cbee714fa4fd64c0ad5f126646d0dc804bf2012d4bb02";
const MANIFEST = buildManifest({ versionCode: 900, versionName: "e376fa6", sha: SHA, sha256: SHA256, size: 110_659_107,
  tag: "v900", repo: UPDATE_REPO, builtAt: "2026-10-18T00:00:00Z" });

function fakeUpdater(installed: number, canInstall = true) {
  let progress: ((p: { done: number; total: number }) => void) | null = null;
  const state = { canInstall };
  const updater: NativeUpdater = {
    info: vi.fn(async () => ({ versionCode: installed, versionName: "old", canInstall: state.canInstall })),
    openInstallSettings: vi.fn(async () => {}),
    downloadAndInstall: vi.fn(async () => { progress?.({ done: 50, total: 100 }); return { started: true }; }),
    addListener: vi.fn(async (_event, listener) => { progress = listener; return { remove: async () => { progress = null; } }; }),
  };
  return { updater, state };
}

describe("D-144 : bandeau de mise à jour de l'APK", () => {
  let banc: Banc;
  beforeEach(() => { banc = creerBanc(); banc.preparer(); });
  afterEach(() => { banc.nettoyer(); });
  const banner = () => document.querySelector<HTMLElement>(".app-update-banner");
  async function mount(updater: NativeUpdater | null, payload: unknown = MANIFEST) {
    const fetchJson = vi.fn(async () => payload);
    await banc.monter(<AppUpdateBanner deps={{ updater: () => updater, fetchJson }} />);
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 5)); });
    return fetchJson;
  }

  it("sur le site (pas d'APK) : rien, et aucun appel réseau", async () => {
    const fetchJson = await mount(null);
    expect(banner()).toBeNull();
    expect(fetchJson).not.toHaveBeenCalled();
  });

  it("version déjà à jour ou manifeste douteux : rien", async () => {
    await mount(fakeUpdater(900).updater);
    expect(banner()).toBeNull();
    banc.nettoyer(); banc = creerBanc(); banc.preparer();
    await mount(fakeUpdater(1).updater, { ...MANIFEST, url: "https://exemple.com/x.apk" });
    expect(banner()).toBeNull();
  });

  it("nouvelle version : télécharge puis ouvre l'installateur", async () => {
    const { updater } = fakeUpdater(1);
    await mount(updater);
    expect(banner()!.textContent).toContain("Nouvelle version disponible · 106 Mo");
    await act(async () => { banc.appuyer("Mettre à jour"); await new Promise((resolve) => setTimeout(resolve, 5)); });
    expect(updater.downloadAndInstall).toHaveBeenCalledWith({ url: MANIFEST.url, sha256: SHA256, versionCode: 900 });
    expect(banner()!.textContent).toContain("Appuie sur « Installer »");
  });

  it("première fois : demande l'autorisation d'installer, puis reprend", async () => {
    const { updater, state } = fakeUpdater(1, false);
    await mount(updater);
    await act(async () => { banc.appuyer("Mettre à jour"); await new Promise((resolve) => setTimeout(resolve, 5)); });
    expect(updater.openInstallSettings).toHaveBeenCalledOnce();
    expect(updater.downloadAndInstall).not.toHaveBeenCalled();
    expect(banner()!.textContent).toContain("Autorise CreatorDeck à installer des applis");
    state.canInstall = true;
    await act(async () => { banc.appuyer("Mettre à jour"); await new Promise((resolve) => setTimeout(resolve, 5)); });
    expect(updater.downloadAndInstall).toHaveBeenCalledOnce();
  });

  it("échec du téléchargement : message clair et nouvel essai", async () => {
    const { updater } = fakeUpdater(1);
    vi.mocked(updater.downloadAndInstall).mockRejectedValueOnce(new Error("Fichier abîmé : empreinte différente."));
    await mount(updater);
    await act(async () => { banc.appuyer("Mettre à jour"); await new Promise((resolve) => setTimeout(resolve, 5)); });
    expect(banner()!.textContent).toContain("Fichier abîmé : empreinte différente.");
    expect(banc.boutons().some((b) => b.textContent === "Réessayer")).toBe(true);
  });

  it("« Plus tard » cache la proposition", async () => {
    await mount(fakeUpdater(1).updater);
    await act(async () => { banc.appuyerNom("Plus tard"); });
    expect(banner()).toBeNull();
  });
});
