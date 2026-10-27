import sharp from "sharp";

// Même source approuvée que le carrousel et la scène de déchirure.
await sharp("assets/packs/anime-opening.png")
  .resize({ width: 1050 })
  .webp({ quality: 90, alphaQuality: 100 })
  .toFile("public/packs/anime-opening.webp");

console.log("public/packs/anime-opening.webp");
