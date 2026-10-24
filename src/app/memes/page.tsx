import { ErrorBoundary } from "@/components/error-boundary";
import { MemeDeck } from "@/components/meme-deck";

export const metadata = { title: "MEMES · CreatorDeck" };

export default function MemesPage() {
  return <ErrorBoundary><MemeDeck /></ErrorBoundary>;
}
