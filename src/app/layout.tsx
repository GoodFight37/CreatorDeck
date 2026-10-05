import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { CATALOG_AUDIENCE, CATALOG_LABEL } from "@/lib/catalog";
import "./globals.css";

// Titre et description suivent le périmètre du catalogue (FR ou monde) : en
// changer ne demande aucune retouche de ce fichier.
const TAGLINE = `CreatorDeck — collectionne les ${CATALOG_AUDIENCE}`;
const DESCRIPTION = `Ouvre des boosters et complète ta collection de ${CATALOG_AUDIENCE} (${CATALOG_LABEL}).`;

export const metadata: Metadata = {
  title: TAGLINE,
  description: DESCRIPTION,
  applicationName: "CreatorDeck",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon.svg",
  },
  openGraph: {
    title: TAGLINE,
    description: DESCRIPTION,
    siteName: "CreatorDeck",
    type: "website",
    locale: "fr_FR",
  },
  twitter: {
    card: "summary",
    title: "CreatorDeck",
    description: DESCRIPTION,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#090812",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
