/**
 * Le filet de sécurité (`ErrorBoundary`) : deux choses à prouver.
 *
 * 1. Quand tout va bien, il **n'ajoute rien** au DOM — sinon chaque écran
 *    capturé par le banc aurait un élément de plus, et un découpage ne
 *    comparerait plus rien.
 * 2. Quand un écran plante, le joueur lit ce qui s'est passé et a un geste à
 *    faire — au lieu d'un écran blanc.
 *
 * Le composant fautif est jeté **exprès** : React écrit alors l'erreur dans la
 * console (`console.error`), ce qui est normal et n'empêche rien — on la
 * capture pour ne pas polluer la sortie du banc.
 */
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";

import { ErrorBoundary } from "@/components/error-boundary";

/** Un composant qui plante, comme le ferait un écran fautif. */
function Bombe(): never {
  throw new Error("Boum : la fiche d'un créateur a explosé");
}

describe("le filet de sécurité", () => {
  let hote: HTMLDivElement;
  let racine: Root;

  beforeEach(() => {
    hote = document.createElement("div");
    document.body.append(hote);
    racine = createRoot(hote);
    // React journalise l'erreur rattrapée : on la garde sous le coude plutôt
    // que de la laisser crier dans la sortie des tests.
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    act(() => racine.unmount());
    hote.remove();
    vi.restoreAllMocks();
  });

  it("ne touche à rien quand tout va bien", async () => {
    await act(async () => {
      racine.render(
        <ErrorBoundary>
          <p>Un écran qui marche</p>
        </ErrorBoundary>,
      );
    });
    expect(hote.innerHTML).toContain("Un écran qui marche");
    expect(hote.innerHTML).not.toContain("planté");
    // Le filet ne se dessine pas lui-même : aucun élément à lui dans le DOM.
    expect(hote.querySelector(".panne")).toBeNull();
  });

  it("affiche le filet, la promesse sur la partie, et le geste à faire", async () => {
    await act(async () => {
      racine.render(
        <ErrorBoundary>
          <Bombe />
        </ErrorBoundary>,
      );
    });
    const html = hote.innerHTML;
    expect(html).toContain("L'écran a planté");
    // La première inquiétude d'un joueur, et la vérité : la sauvegarde est à
    // lui, une exception d'affichage n'y touche pas.
    expect(html).toContain("Ta partie n'a pas bougé");
    expect(html).toContain("Relancer");
    expect(html).toContain("Copier le détail");
    // Le message technique reste visible : une capture d'écran suffit à le
    // transmettre, même sans presse-papiers.
    expect(html).toContain("Boum : la fiche d'un créateur a explosé");
  });

  it("l'overlay se signale sans s'étaler : une ligne, pas un écran d'erreur", async () => {
    await act(async () => {
      racine.render(
        <ErrorBoundary discret>
          <Bombe />
        </ErrorBoundary>,
      );
    });
    const html = hote.innerHTML;
    expect(html).toContain("overlay est à relancer");
    // Rien de l'habillage du jeu : la page passe devant le public.
    expect(html).not.toContain("Relancer</button>");
    expect(html).not.toContain("Ta partie n'a pas bougé");
  });
});
