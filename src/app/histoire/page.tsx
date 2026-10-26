import type { Metadata } from "next";
import { StoryMode } from "../../components/story-mode";

export const metadata: Metadata = {
  title: "Zéro spectateur | Mode Histoire · CreatorDeck",
  description: "Incarne un streamer qui part de zéro. Douze décisions, quatre jauges, plusieurs destins.",
};

/** Entrée expérimentale isolée : aucun changement de l'accueil ni des quatre piliers. */
export default function StoryPage() {
  return <StoryMode />;
}
