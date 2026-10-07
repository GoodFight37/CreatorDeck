import { OverlayStage } from "@/components/overlay-stage";

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
  return <OverlayStage />;
}
