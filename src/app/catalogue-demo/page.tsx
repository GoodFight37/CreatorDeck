import type { Metadata } from "next";
import { CatalogueDemo } from "./catalogue-demo";

export const metadata: Metadata = {
  title: "Prototype de classeur hybride — CreatorDeck",
  description: "Prototype isolé de classeur mêlant des créateurs Twitch fictifs et des personnages imaginaires, avec un classement distinct par univers.",
};

export default function CatalogueDemoPage() {
  return <CatalogueDemo />;
}
