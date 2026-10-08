/**
 * Les effets des cartes : ce qui brille, et à quel prix pour les yeux.
 *
 * Le défaut à ne pas réintroduire : la carte **Live** portait des bandes de
 * couleurs répétées au pixel près, qui **défilaient en boucle**. Sur un
 * téléphone, ça donne « de vieilles télé avec des bandes horribles » — et un
 * interrupteur qui ne coupe que le gyroscope, pas le défilement, ne coupe rien.
 *
 * Ces tests lisent `globals.css` comme un contrat de tenue : pas d'animation
 * perpétuelle sur une carte, des lueurs larges et peu contrastées, et un
 * réglage qui éteint vraiment tout. Ce n'est pas de la décoration : c'est ce qui
 * empêche le retour du problème.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const CSS = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

/** Le bloc d'une règle, par son sélecteur exact. */
function bloc(selecteur: string): string {
  const debut = CSS.indexOf(selecteur);
  if (debut === -1) throw new Error(`règle introuvable : ${selecteur}`);
  const ouvre = CSS.indexOf("{", debut);
  const ferme = CSS.indexOf("}", ouvre);
  return CSS.slice(ouvre + 1, ferme);
}

describe("effets des cartes", () => {
  it("n'anime aucune carte en boucle", () => {
    // Une carte posée sur l'écran ne bouge pas toute seule : le brillant vient
    // du geste (doigt, inclinaison). Un défilement perpétuel fatigue l'œil sur
    // une carte qu'on garde longtemps sous les yeux.
    for (const selecteur of [
      ".creator-card.variant-live .card-foil",
      ".creator-card.variant-holo .card-foil",
      ".creator-card.variant-gold .card-foil",
    ]) {
      expect(bloc(selecteur), selecteur).not.toContain("animation");
    }
    // Et le balayage de bandes a disparu du fichier pour de bon.
    expect(CSS).not.toContain("foil-sweep");
    expect(CSS).not.toContain("repeating-linear-gradient(\n    180deg");
  });

  it("garde des lueurs larges et peu contrastées", () => {
    // Le foil est un `radial-gradient` de plus de 60 % de rayon : une tache
    // large, pas un motif serré. Les alphas restent sous 0,65 — au-delà, le
    // reflet devient un projecteur (et masque le portrait).
    for (const selecteur of [
      ".creator-card.variant-live .card-foil",
      ".creator-card.variant-holo .card-foil",
      ".creator-card.variant-gold .card-foil",
    ]) {
      const regle = bloc(selecteur);
      expect(regle, selecteur).toContain("radial-gradient");
      expect(regle, selecteur).toContain("rgba(255, 255, 255, 0) 7");
      const alphas = [...regle.matchAll(/rgba\(\d+, \d+, \d+, ([\d.]+)\)/g)].map((found) =>
        Number(found[1]),
      );
      // Le contrôle ne doit pas passer à vide : trois teintes au moins.
      expect(alphas.length, `${selecteur} : aucune teinte lue`).toBeGreaterThanOrEqual(3);
      for (const alpha of alphas) {
        expect(alpha, `${selecteur} alpha ${alpha}`).toBeLessThanOrEqual(0.65);
      }
    }
    // Le voile global du foil non plus n'est pas un projecteur.
    const alpha = Number(/opacity: ([\d.]+)/.exec(bloc(".creator-card.is-shiny .card-foil"))?.[1]);
    expect(alpha).toBeLessThanOrEqual(0.6);
  });

  it("n'allume qu'une pastille discrète, et jamais sur les cartes", () => {
    // La pulsation du « en direct » : lente (3,2 s) et de faible amplitude.
    expect(CSS).toMatch(/@keyframes live-pulse \{ 0%, 100% \{ opacity: \.7; \} 50% \{ opacity: 1; \} \}/);
    // Sur une carte, le point marque : il ne clignote pas (des dizaines de
    // cartes Live à l'écran, toutes en phase, feraient clignoter la page).
    expect(bloc(".card-live i")).toContain("animation: none");
  });

  it("éteint le reflet quand le joueur le demande", () => {
    // Le réglage (onglet Toi → « Reflets des cartes ») écrit `data-card-fx` sur
    // `<html>` : le reflet disparaît, il ne se contente pas de cesser de suivre
    // l'inclinaison — c'est tout l'écart entre les deux.
    expect(CSS).toContain('[data-card-fx="off"] .card-foil { display: none; }');
  });
});
