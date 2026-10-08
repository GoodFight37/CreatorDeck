"use client";

/**
 * Le chrome de l'application : la barre du haut (saison, sabliers, points,
 * niveau) et l'écran de chargement. Il ne regarde aucune vue — seulement ce que
 * le moteur lui donne à lire.
 */
import { useEffect, useRef } from "react";

import { Coins, Hourglass, LoaderCircle } from "lucide-react";

import { CATALOG_LABEL } from "@/lib/catalog";

import { type GameView } from "@/lib/game-engine";


function formatNumber(value: number) {
  return new Intl.NumberFormat("fr-FR").format(value);
}


export function LoadingScreen() {
  return (
    <main className="app-shell loading-screen">
      <strong className="wordmark">CreatorDeck</strong>
      <LoaderCircle className="spin" size={26} />
      <p>Préparation du {CATALOG_LABEL}…</p>
    </main>
  );
}


export function TopBar({ game }: { game: GameView }) {
  // La saison affichée est celle que le joueur remplit, calculée depuis sa
  // collection : « S01 » était écrit en dur, même pour une partie sans une
  // seule carte française.
  const season = game.currentSeason;
  const levelBase = Math.max(0, (game.player.level - 1) * 100);
  const levelProgress = Math.min(
    100,
    ((game.player.xp - levelBase) / Math.max(100, game.player.xpNext - levelBase)) * 100,
  );
  // La hauteur **réelle** de la barre part dans `--top-bar-h` : la barre du
  // classeur s'y colle, et cette hauteur change avec l'encoche du téléphone
  // (elle n'est pas devinable en CSS).
  const bar = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const element = bar.current;
    if (!element) return;
    const publish = () =>
      document.documentElement.style.setProperty("--top-bar-h", `${element.offsetHeight}px`);
    publish();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(publish);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return (
    <header className="top-bar" ref={bar}>
      <div className="brand-lockup">
        <div>
          <strong>CreatorDeck</strong>
          <small title={season ? season.name : CATALOG_LABEL}>
            {season ? `${season.familyId} · ${season.name}` : CATALOG_LABEL}
          </small>
        </div>
      </div>
      <div className="top-actions">
        <div className="currency-chip" title="Sabliers">
          <Hourglass size={14} />
          <b>{game.player.hourglasses}</b>
        </div>
        <div className="currency-chip warm" title="Points de collection">
          <Coins size={14} />
          <b>{formatNumber(game.player.points)}</b>
        </div>
        <div className="level-chip" title={`Niveau ${game.player.level}`}>
          <span>{game.player.level}</span>
          <i style={{ width: `${levelProgress}%` }} />
        </div>
      </div>
    </header>
  );
}

