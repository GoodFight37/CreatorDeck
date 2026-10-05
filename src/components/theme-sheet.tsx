"use client";

import { Check, Lock, Paintbrush, X } from "lucide-react";
import type { ThemeView } from "@/lib/game-engine";

/**
 * Sélecteur de thème de collection : les cosmétiques gagnés en complétant les
 * familles de jeux. Un thème verrouillé montre ce qu'il reste à faire.
 */
export function ThemeSheet({
  themes,
  onEquip,
  onClose,
}: {
  themes: ThemeView[];
  onEquip: (themeId: string) => void;
  onClose: () => void;
}) {
  const unlocked = themes.filter((theme) => theme.unlocked).length;

  return (
    <div className="odds-overlay" role="dialog" aria-modal="true" aria-label="Thème du classeur">
      <div className="odds-panel">
        <header className="odds-head">
          <div>
            <p className="eyebrow">COSMÉTIQUES</p>
            <h2>Thème du classeur</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer">
            <X size={18} />
          </button>
        </header>

        <p className="odds-intro">
          Chaque famille complétée (son emblème récupéré) débloque sa teinte, et toutes les
          compléter débloque le <strong>Grand chelem</strong>. Un thème repeint le fond, les
          panneaux, les textes et les accents de l&apos;application : aucun téléchargement, tout
          est calculé.
        </p>

        <div className="theme-grid">
          {themes.map((theme) => (
            <button
              key={theme.id}
              type="button"
              className={`theme-card ${theme.equipped ? "equipped" : ""} ${theme.unlocked ? "" : "locked"}`}
              disabled={!theme.unlocked}
              onClick={() => onEquip(theme.id)}
            >
              <span
                className="theme-swatch"
                style={{
                  // Aperçu honnête : le fond, les panneaux puis les accents,
                  // c'est-à-dire ce que le thème change réellement à l'écran.
                  background: `linear-gradient(120deg, ${theme.tokens.bg} 0%, ${theme.tokens.panel3} 42%, ${theme.tokens.purple} 78%, ${theme.tokens.gold} 100%)`,
                }}
                aria-hidden="true"
              >
                {theme.equipped ? <Check size={14} /> : null}
              </span>
              <strong>{theme.name}</strong>
              <span className="theme-hint">
                {theme.unlocked ? (
                  theme.equipped ? (
                    <>
                      <Paintbrush size={11} /> Équipé
                    </>
                  ) : (
                    theme.description
                  )
                ) : (
                  <>
                    <Lock size={11} /> {theme.unlockHint}
                  </>
                )}
              </span>
            </button>
          ))}
        </div>

        <p className="odds-footnote">
          {unlocked}/{themes.length} thèmes débloqués. Les emblèmes restent visibles dans l&apos;écran
          Objectifs.
        </p>
      </div>
    </div>
  );
}
