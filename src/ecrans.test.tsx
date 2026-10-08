/**
 * Le banc d'essai **des écrans** : l'application montée dans un DOM, parcourue
 * comme au doigt.
 *
 * Pourquoi il existe : ce dépôt se travaille sans navigateur (l'environnement de
 * développement n'en a pas, et `next build` ne pré-rend que l'accueil). Avant
 * lui, un découpage de composant — déplacer une vue dans son fichier, sortir une
 * feuille — ne pouvait être vérifié qu'en installant l'APK. Ici, les cinq écrans
 * s'ouvrent, les feuilles s'ouvrent, un booster se tire, et chacun dit ce qu'il
 * doit dire.
 *
 * L'horloge et le hasard sont **figés** : deux exécutions produisent le même
 * HTML. C'est ce qui permet de garder une copie des écrans pour comparer avant
 * et après un découpage :
 *
 *   ECRANS_DUMP=/tmp/rendu npm run ecrans
 *   # ... découpage ...
 *   ECRANS_DUMP=/tmp/apres npm run ecrans && diff -r /tmp/rendu /tmp/apres
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** Un jeudi midi : ni fin de série, ni fenêtre de Prime Time (20 h – 22 h). */
const T0 = Date.UTC(2026, 9, 8, 12, 0, 0);
const DUMP = process.env.ECRANS_DUMP;

describe("les écrans", () => {
  let racine: Root | null = null;
  let hote: HTMLDivElement | null = null;

  beforeEach(() => {
    vi.useFakeTimers({ now: T0 });
    window.localStorage.clear();
    if (DUMP) mkdirSync(DUMP, { recursive: true });
    hote = document.createElement("div");
    document.body.append(hote);
  });

  afterEach(() => {
    act(() => racine?.unmount());
    racine = null;
    hote?.remove();
    hote = null;
    vi.useRealTimers();
  });

  async function monter(element: React.ReactElement) {
    racine = createRoot(hote!);
    await act(async () => {
      racine!.render(element);
    });
  }

  /** Le HTML de l'écran courant, et sa copie sur disque si demandée. */
  function ecran(nom: string) {
    const html = document.body.innerHTML;
    if (DUMP) writeFileSync(`${DUMP}/${nom}.html`, html, "utf8");
    return html;
  }

  function boutons() {
    return [...document.querySelectorAll("button")];
  }

  function appuyer(libelle: string | RegExp) {
    const cible =
      typeof libelle === "string"
        ? boutons().find((b) => (b.textContent ?? "").trim() === libelle)
        : boutons().find((b) => libelle.test((b.textContent ?? "").trim()));
    if (!cible) {
      throw new Error(
        `bouton introuvable : ${String(libelle)} — vu : ${boutons()
          .map((b) => (b.textContent ?? "").trim().slice(0, 28))
          .join(" | ")}`,
      );
    }
    act(() => {
      cible.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
    });
  }

  /** Le bouton croix des feuilles (`aria-label="Fermer"`). */
  function fermer() {
    const cible = document.querySelector<HTMLButtonElement>('button[aria-label="Fermer"]');
    if (!cible) throw new Error("aucun bouton Fermer dans le DOM");
    act(() => {
      cible.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
    });
  }

  async function application() {
    const { CreatorDeckApp } = await import("@/components/creator-deck-app");
    await monter(<CreatorDeckApp />);
  }

  it("ouvre les quatre onglets, chacun avec son écran", async () => {
    await application();
    expect(ecran("01-accueil")).toContain("Ouvrir le booster");

    appuyer("Binder");
    const binder = ecran("02-binder");
    expect(binder).toContain("binder-tools");
    expect(binder).toContain("streameurs découverts");

    appuyer("Craft");
    expect(ecran("03-craft")).toContain("Façonne ta collection");

    appuyer("Toi");
    expect(ecran("04-toi")).toContain("Compte et cloud");
  });

  it("ouvre les feuilles : le compte, les objectifs, les taux", async () => {
    await application();
    appuyer("Toi");

    appuyer("Compte et cloud");
    // Sans cloud configuré, la feuille le dit au lieu de proposer une connexion.
    expect(ecran("05-compte")).toContain("Cloud &amp; classement");
    fermer();

    appuyer("Objectifs et saisons");
    expect(ecran("06-objectifs")).toContain("Progression");

    appuyer("Toi");
    appuyer("Taux de drop");
    expect(ecran("07-taux")).toContain("Taux de drop des boosters");
    fermer();
  });

  it("tire un booster et montre la révélation", async () => {
    await application();
    appuyer("Ouvrir le booster");
    // Le tirage passe par des temporisations (silence, déchirure) : l'horloge
    // figée doit avancer à la main, sinon l'écran de révélation n'arrive jamais.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4_000);
    });
    const revelation = ecran("08-revelation");
    expect(revelation).toContain("card-nameplate");
    // Le booster hors ligne n'est pas perdu : il sort de la réserve du jour.
    expect(revelation).toContain("cartes · 1 Rare ou mieux garantie");
  });

  it("rend deux fois le même HTML (l'horloge et le hasard sont figés)", async () => {
    await application();
    const premier = ecran("09-determinisme-a");
    await act(async () => racine?.unmount());
    racine = null;
    hote!.remove();
    hote = document.createElement("div");
    document.body.append(hote);
    window.localStorage.clear();
    await application();
    expect(ecran("09-determinisme-b")).toBe(premier);
  });
});
