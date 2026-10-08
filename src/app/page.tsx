import { CreatorDeckApp } from "@/components/creator-deck-app";
import { ErrorBoundary } from "@/components/error-boundary";

/**
 * L'accueil : le jeu, sous le filet de sécurité (`ErrorBoundary`). Sans lui,
 * une exception dans un écran ferait tomber tout l'arbre React et le joueur
 * n'aurait qu'un écran blanc, sans message ni recours.
 */
export default function HomePage() {
  return (
    <ErrorBoundary>
      <CreatorDeckApp />
    </ErrorBoundary>
  );
}
