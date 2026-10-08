"use client";

/**
 * Un effet de moment rare : une planche d'images qui se déroule en `steps()`,
 * ou l'écran blanc d'un Légendaire.
 *
 * Pourquoi une planche et pas quinze `<img>` : le navigateur n'a **qu'une**
 * image à charger et le CSS fait tout le travail. Quinze balises qui s'allument
 * l'une après l'autre, ça marche aussi — mais ça se voit sur un téléphone
 * modeste, et ça oblige à un état React par image. Ici, pas une ligne de
 * JavaScript par image, et l'animation est lissée par le compositeur.
 *
 * Ce qu'il fait, et ce qu'il ne fait pas : il **affiche**. La décision (qui a
 * droit à quel effet) vit dans `src/lib/fx.ts`, testée à part.
 *
 * Rien ne se joue si le joueur a coupé les effets de carte, ni s'il a demandé
 * moins d'animations : c'est le CSS qui s'en charge (`data-card-fx="off"` sur
 * `<html>`, et `prefers-reduced-motion`).
 */
import { FX_SHEETS, type FxKind } from "@/lib/fx";

export function EffectBurst({
  kind,
  className = "",
  /**
   * Le centre horizontal. La révélation laisse 50 % — le milieu de la carte.
   */
  left = "50%",
  /** Le centre vertical : au milieu de la carte, ou un peu au-dessus. */
  offset = "50%",
  /**
   * Le retard avant que ça parte, en ms. Il sert à **caler l'image sur le
   * son** : une Épique et une Légendaire observent d'abord un silence (c'est
   * lui qui fait le bruit, `src/lib/reveal.ts`), et l'éclat part avec le bang,
   * pas avant.
   */
  delayMs = 0,
}: {
  kind: FxKind;
  className?: string;
  left?: string;
  offset?: string;
  delayMs?: number;
}) {
  const sheet = FX_SHEETS[kind];
  return (
    <span
      className={`fx-burst fx-${kind} ${className}`.trim()}
      // `--fx-size` porte la taille affichée : la classe décide du reste
      // (nombre d'images, durée), pour que le CSS reste lisible.
      style={
        {
          "--fx-size": `${sheet.size}px`,
          "--fx-left": left,
          "--fx-offset": offset,
          "--fx-delay": `${Math.max(0, delayMs)}ms`,
        } as React.CSSProperties
      }
      aria-hidden="true"
    />
  );
}

/**
 * L'écran blanc : le seul effet plein écran du jeu, réservé au Légendaire et au
 * Perfect. Il recouvre tout, et repart aussitôt.
 */
export function EffectFlash() {
  return <span className="fx-flash" aria-hidden="true" />;
}
