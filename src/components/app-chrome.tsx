"use client";

/**
 * Le chrome de l'application : la barre du haut (saison, sabliers, points,
 * niveau) et l'écran de chargement. Il ne regarde aucune vue — seulement ce que
 * le moteur lui donne à lire.
 */
import { useEffect, useRef } from "react";

import { Coins, Hourglass, LoaderCircle, Settings } from "lucide-react";

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


/**
 * L'en-tête : à gauche le badge de niveau (il ouvre le profil), au milieu les
 * ressources, à droite l'engrenage des réglages. Plus de nom d'app ni de
 * saison : le joueur sait où il est, il veut savoir ce qu'il a.
 */
export function TopBar({
  game,
  onShowProfile,
  onShowSettings,
  settingsAlert = false,
}: {
  game: GameView;
  onShowProfile: () => void;
  onShowSettings: () => void;
  /** Le compte demande une action (synchronisation à vérifier, erreur). */
  settingsAlert?: boolean;
}) {
  const levelBase = Math.max(0, (game.player.level - 1) * 100);
  const levelProgress = Math.min(
    100,
    Math.max(0, ((game.player.xp - levelBase) / Math.max(100, game.player.xpNext - levelBase)) * 100),
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
      <button type="button" className="level-badge" onClick={onShowProfile} aria-label={`Ton profil · niveau ${game.player.level}`}>
        <span className="level-badge-num" aria-hidden="true">{game.player.level}</span>
        <span className="level-badge-meta" aria-hidden="true">
          <small>Niv. {game.player.level}</small>
          <i><u style={{ width: `${levelProgress}%` }} /></i>
        </span>
      </button>
      <div className="top-actions">
        {/* Un seul porte-monnaie : icône + nombre, le nom complet reste dans l'étiquette accessible. */}
        <div className="top-wallet">
          <div role="group" className="currency-chip" title="Sabliers" aria-label={`${game.player.hourglasses} sabliers`}>
            <Hourglass size={14} aria-hidden="true" />
            <b>{game.player.hourglasses}</b>
          </div>
          <div role="group" className="currency-chip warm" title="Points de collection" aria-label={`${formatNumber(game.player.points)} points`}>
            <Coins size={14} aria-hidden="true" />
            <b>{formatNumber(game.player.points)}</b>
          </div>
        </div>
        <button type="button" className="settings-button" onClick={onShowSettings} aria-label={settingsAlert ? "Réglages · une action t’attend" : "Réglages"}>
          <Settings size={20} aria-hidden="true" />
          {settingsAlert ? <i className="settings-dot" aria-hidden="true" /> : null}
        </button>
      </div>
    </header>
  );
}

