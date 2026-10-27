import type { Metadata } from "next";
import { AnimeDeck } from "@/components/anime-deck";

export const metadata: Metadata = {
  title: "Collection Anime — CreatorDeck",
  description: "Classeur Anime local de CreatorDeck.",
};

export default function AnimePage() {
  return <AnimeDeck />;
}
