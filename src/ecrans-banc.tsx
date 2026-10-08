/**
 * Le petit matériel commun des bancs d'essai d'écrans (`*.test.tsx`) : monter
 * l'application dans le DOM, appuyer sur un bouton, fermer une feuille, garder
 * une copie du HTML.
 *
 * C'est du code de test, pas du code de jeu : il vit à côté des tests, jamais
 * dans le bundle (`.test.tsx` n'est compilé que par `npm run ecrans`).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

/** Dossier où les écrans sont recopiés quand `ECRANS_DUMP` est défini. */
const DUMP = process.env.ECRANS_DUMP;

export type Banc = ReturnType<typeof creerBanc>;

export function creerBanc() {
  let racine: Root | null = null;
  let hote: HTMLDivElement | null = null;

  function preparer() {
    window.localStorage.clear();
    if (DUMP) mkdirSync(DUMP, { recursive: true });
    hote = document.createElement("div");
    document.body.append(hote);
  }

  function nettoyer() {
    act(() => racine?.unmount());
    racine = null;
    hote?.remove();
    hote = null;
  }

  /** Remet un hôte vide : sert au test « deux fois le même HTML ». */
  function vider() {
    act(() => racine?.unmount());
    racine = null;
    hote?.remove();
    hote = document.createElement("div");
    document.body.append(hote);
    window.localStorage.clear();
  }

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

  /**
   * Un appui **par nom accessible** : le socle d'un invité est un bouton sans
   * texte (le « + » n'est qu'un dessin), son nom est son `aria-label`.
   */
  function appuyerNom(nom: string | RegExp) {
    const cible = boutons().find((b) => {
      const aria = b.getAttribute("aria-label") ?? "";
      return typeof nom === "string" ? aria === nom : nom.test(aria);
    });
    if (!cible) {
      throw new Error(
        `bouton sans nom « ${String(nom)} » — vu : ${boutons()
          .map((b) => b.getAttribute("aria-label") ?? (b.textContent ?? "").trim().slice(0, 24))
          .join(" | ")}`,
      );
    }
    act(() => {
      cible.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
    });
  }

  /**
   * Tape dans un champ. La valeur passe par le setter **natif** avant l'événement :
   * React écoute `input` (et `change` pour un `<select>`), et poser `.value`
   * tout seul ne réveille aucun `onChange` — le champ paraîtrait écrire dans le
   * vide.
   */
  function saisir(champ: HTMLInputElement | HTMLSelectElement, texte: string) {
    const select = champ instanceof window.HTMLSelectElement;
    const setter = Object.getOwnPropertyDescriptor(
      select ? window.HTMLSelectElement.prototype : window.HTMLInputElement.prototype,
      "value",
    )?.set;
    if (!setter) throw new Error("champ sans valeur : impossible de saisir");
    act(() => {
      setter.call(champ, texte);
      champ.dispatchEvent(new window.Event(select ? "change" : "input", { bubbles: true }));
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

  return {
    preparer,
    nettoyer,
    vider,
    monter,
    ecran,
    appuyer,
    appuyerNom,
    saisir,
    fermer,
    boutons,
    racine: () => racine,
  };
}
