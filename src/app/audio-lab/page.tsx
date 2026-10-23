import type { Metadata } from "next";
import { AudioLab } from "./audio-lab";

export const metadata: Metadata = {
  title: "Laboratoire audio — CreatorDeck (développement)",
  description: "Outil de développement pour comparer les directions musicales et les variantes de bruitages. Retiré de l'export de production, jamais exposé aux joueurs.",
  robots: { index: false, follow: false },
};

export default function AudioLabPage() {
  return <AudioLab />;
}
