import type { NextConfig } from "next";
import { execFileSync } from "node:child_process";

function buildCommit(): string {
  const providerCommit = process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GITHUB_SHA;
  if (providerCommit && /^[\da-f]{40}$/i.test(providerCommit)) return providerCommit.toLowerCase();

  try {
    const localCommit = execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return /^[\da-f]{40}$/i.test(localCommit) ? localCommit.toLowerCase() : "";
  } catch {
    return "";
  }
}

/**
 * L'application est 100 % statique : la logique de jeu tourne sur l'appareil
 * (src/lib/game-engine.ts) et la sauvegarde est locale. `output: "export"`
 * produit le dossier `out/` consommé par Capacitor (voir capacitor.config.ts)
 * et par n'importe quel hébergeur statique pour la PWA.
 */
const nextConfig: NextConfig = {
  output: "export",
  // Seul le SHA public de cette version est injecté dans le bundle statique.
  // Vercel/GitHub fournissent le commit du build ; le checkout local sert de
  // repli pour les APK construits depuis un clone Git.
  env: { NEXT_PUBLIC_BUILD_COMMIT: buildCommit() },
  // Pas de serveur d'optimisation d'images en export statique : les portraits
  // sont pré-encodés à la taille utile (600×600, voir scripts/lib/avatars.mjs).
  images: { unoptimized: true },
};

export default nextConfig;
