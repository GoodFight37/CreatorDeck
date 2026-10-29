import type { Metadata } from "next";
import { StoryMode } from "../../components/story-mode";

export const metadata: Metadata = {
  title: "Zéro spectateur | Mode Histoire · CreatorDeck",
  description: "Incarne un streamer qui part de zéro. Jusqu'à quarante décisions, quatre jauges et neuf destins dans une histoire à embranchements.",
};

/** Entrée expérimentale isolée : aucun changement de l'accueil ni des quatre piliers. */
export default function StoryPage() {
  return <StoryMode />;
}
