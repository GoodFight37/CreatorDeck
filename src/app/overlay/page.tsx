import { OverlayStage } from "@/components/overlay-stage";
import { ErrorBoundary } from "@/components/error-boundary";

export const metadata = {
  title: "CreatorDeck — overlay 16:9",
  description: "La scène de révélation, plein cadre, pour un direct.",
};

/**
 * L'overlay 16:9 : une page que le streamer colle en **source navigateur** dans
 * OBS (ou équivalent), et dans laquelle il ouvre ses boosters en direct.
 *
 * Pourquoi une page séparée et pas un mode de l'application : le jeu occupe
 * l'écran d'un téléphone, l'overlay occupe un cadre 16:9 sans barre de
 * navigation, sans menu et sans raccourci. Deux contextes, deux mises en page —
 * les mélanger donnerait un écran bancal dans les deux cas.
 *
 * L'adresse : `/overlay` (en local, `http://localhost:3000/overlay`).
 */
export default function OverlayPage() {
  // Le même filet que le jeu, mais **sobre** : la page est projetée devant le
  // public, elle ne doit pas afficher un gros message d'erreur en plein cadre.
  // Le streamer, lui, le voit dans OBS.
  return (
    <ErrorBoundary discret>
      <OverlayStage />
    </ErrorBoundary>
  );
}
