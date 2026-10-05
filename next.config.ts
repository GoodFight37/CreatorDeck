import type { NextConfig } from "next";

/**
 * L'application est 100 % statique : la logique de jeu tourne sur l'appareil
 * (src/lib/game-engine.ts) et la sauvegarde est locale. `output: "export"`
 * produit le dossier `out/` consommé par Capacitor (voir capacitor.config.ts)
 * et par n'importe quel hébergeur statique pour la PWA.
 */
const nextConfig: NextConfig = {
  output: "export",
  // Pas de serveur d'optimisation d'images en export statique : les portraits
  // sont pré-encodés à la taille utile (600×600, voir scripts/lib/avatars.mjs).
  images: { unoptimized: true },
};

export default nextConfig;
