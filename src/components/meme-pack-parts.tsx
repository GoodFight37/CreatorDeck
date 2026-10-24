"use client";

import Link from "next/link";

// Séparés de meme-booster-opening.tsx pour que l'accueil ne charge pas l'ouverture (PackTear, MemeReveal) avant d'en avoir besoin.
export function MemePackComposition() {
  return <details className="meme-rates"><summary>Composition du booster</summary><p>Trois communes, une carte variable et une Rare ou mieux. Sur la dernière carte : Rare 82 %, Épique 15 %, Légendaire 2,5 %, Mythique 0,5 %. Réserve séparée : quatre boosters au maximum, un toutes les 30 minutes.</p></details>;
}

export function MemeCollectionLink() {
  return <Link className="booster-collection-link" href="/memes">Voir le classeur MEMES →</Link>;
}
