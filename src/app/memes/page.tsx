import { ErrorBoundary } from "@/components/error-boundary";
import { MemeDeck } from "@/components/meme-deck";

export const metadata = { title: "Mèmes · CreatorDeck" };

export default function MemesPage() {
  return <ErrorBoundary><MemeDeck /></ErrorBoundary>;
}
