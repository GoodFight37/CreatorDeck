import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "CreatorDeck — collectionne les créateurs francophones",
  description:
    "Ouvre des boosters et complète ta collection de créateurs francophones.",
  applicationName: "CreatorDeck",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon.svg",
  },
  openGraph: {
    title: "CreatorDeck — collectionne les créateurs francophones",
    description:
      "Ouvre des boosters et complète ta collection de créateurs francophones.",
    siteName: "CreatorDeck",
    type: "website",
    locale: "fr_FR",
  },
  twitter: {
    card: "summary",
    title: "CreatorDeck",
    description:
      "Ouvre des boosters et complète ta collection de créateurs francophones.",
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
