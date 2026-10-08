"use client";

/**
 * **Les crédits**, tout en bas de « Toi » : une ligne discrète, repliée, qui
 * s'ouvre d'un appui.
 *
 * Pourquoi repliée : personne ne cherche ses crédits tous les jours, et un bloc
 * de six lignes en bas d'un écran de réglages, c'est du texte mort. Pourquoi là
 * quand même : deux licences demandent qu'on les nomme, et c'est la moindre des
 * choses pour ce qu'on n'a pas dessiné.
 *
 * Pourquoi un bouton et pas un `<details>` : l'état est tenu par React, donc
 * l'ouverture se vérifie dans un banc d'essai comme n'importe quel autre geste
 * du jeu (`src/ecrans-credits.test.tsx`). Un pliage HTML natif ne se touche pas
 * de la même façon au doigt et au clavier.
 */
import { useState } from "react";
import { ChevronRight } from "lucide-react";

import { CREDITS } from "@/lib/credits";

export function CreditsBlock() {
  const [ouvert, setOuvert] = useState(false);
  return (
    <section className="credits" aria-label="Crédits">
      <button
        type="button"
        className="credits-toggle"
        aria-expanded={ouvert}
        onClick={() => setOuvert((actuel) => !actuel)}
      >
        <span>Crédits</span>
        <ChevronRight size={15} aria-hidden="true" />
      </button>
      {ouvert ? (
        <dl className="credits-list">
          {CREDITS.map((ligne) => (
            <div key={ligne.quoi}>
              <dt>{ligne.quoi}</dt>
              <dd>
                {ligne.qui}
                <em>{ligne.licence}</em>
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </section>
  );
}
