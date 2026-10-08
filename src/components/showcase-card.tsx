/**
 * Une carte de la vitrine : le portrait du créateur, son nom, sa rareté.
 *
 * Ce composant vit à part parce qu'il sert à trois endroits — l'écran Compte
 * (choix des cartes épinglées), la ligne dépliée du classement et la fiche
 * publique d'un joueur — et que la fiche publique ne doit pas importer tout
 * l'écran Compte pour afficher quatre cartes.
 */
import Image from "next/image";
import type { CSSProperties } from "react";
import { CREATOR_BY_SLUG, RARITY_META, creatorImage } from "@/lib/catalog";

export function ShowcaseCard({ slug, small = false }: { slug: string; small?: boolean }) {
  const creator = CREATOR_BY_SLUG.get(slug);
  if (!creator) return null;

  const rarity = RARITY_META[creator.rarity];
  const style = {
    "--rarity": rarity.color,
    "--rarity-glow": rarity.glow,
  } as CSSProperties;

  return (
    <figure className={`showcase-card${small ? " is-small" : ""}`} style={style}>
      <span className="showcase-photo">
        <Image src={creatorImage(creator)} width={96} height={96} alt={creator.displayName} unoptimized />
      </span>
      <figcaption>
        <b>{creator.displayName}</b>
        <span>{rarity.label}</span>
      </figcaption>
    </figure>
  );
}
