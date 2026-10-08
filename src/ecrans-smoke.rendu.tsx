/**
 * Banc d'essai du découpage (Session C) — **temporaire**, pas livré.
 *
 * Il monte l'application dans un DOM (jsdom), parcourt les onglets et ouvre les
 * feuilles, puis écrit le HTML de chaque écran dans `/tmp/rendu/`. Joué avant et
 * après un découpage, il répond à une seule question : les écrans rendent-ils
 * exactement la même chose ?
 *
 * L'horloge et le hasard sont figés : deux exécutions doivent écrire des
 * fichiers identiques, sans quoi la comparaison ne dirait rien.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const DOSSIER = "/tmp/rendu";
/** Un jeudi midi, en pleine journée : ni fin de série, ni fenêtre de Prime Time. */
const T0 = Date.UTC(2026, 9, 8, 12, 0, 0);

describe("banc d'essai", () => {
  let racine: Root | null = null;
  let hote: HTMLDivElement | null = null;

  beforeEach(() => {
    vi.useFakeTimers({ now: T0 });
    mkdirSync(DOSSIER, { recursive: true });
    window.localStorage.clear();
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

  function capturer(nom: string) {
    const html = document.body.innerHTML;
    writeFileSync(`${DOSSIER}/${nom}.html`, html, "utf8");
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

  function fermer() {
    const cible = document.querySelector<HTMLButtonElement>('button[aria-label="Fermer"]');
    if (!cible) throw new Error("aucun bouton Fermer dans le DOM");
    act(() => {
      cible.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
    });
  }

  it("parcourt l'application et garde une copie de chaque écran", async () => {
    const { CreatorDeckApp } = await import("@/components/creator-deck-app");
    await monter(<CreatorDeckApp />);
    expect(capturer("01-accueil")).toContain("Ouvrir le booster");

    appuyer("Binder");
    capturer("02-binder");

    appuyer("Craft");
    capturer("03-craft");

    appuyer("Toi");
    expect(capturer("04-toi")).toContain("Compte et cloud");

    // Les feuilles : le compte (qui porte le classement et les échanges), les
    // objectifs et les saisons, les taux publiés.
    appuyer("Compte et cloud");
    capturer("05-compte");
    fermer();
    appuyer("Objectifs et saisons");
    capturer("06-objectifs");
    appuyer("Toi");
    appuyer("Taux de drop");
    capturer("07-taux-de-drop");
    fermer();

    // Et le geste du jeu : un booster ouvert, écran de révélation compris.
    // C'est la dernière capture : ouvrir un paquet change la sauvegarde.
    appuyer("Drop");
    appuyer("Ouvrir le booster");
    await act(async () => {
      await Promise.resolve();
    });
    capturer("08-revelation");
  });
});
