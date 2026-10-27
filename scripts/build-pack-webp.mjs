// Sachets du carrousel en WebP : un SVG de ~280 tracés est re-rastérisé à chaque
// bascule (image + deux masques), ce qui gelait la scène ~0,6 s sur Android.
// Anime utilise l'illustration raster approuvée ; les autres sachets gardent leur SVG.
import sharp from "sharp";

for (const pack of ["live", "memes", "imgflip", "anime"]) {
  const out = `public/packs/${pack}-opening.webp`;
  // 1050 px : 250 px CSS × 1,5 (face dessinée à 150 %) × DPR 2,75, sans flou.
  const source = pack === "anime" ? "assets/packs/anime-opening.png" : `public/packs/${pack}-opening.svg`;
  await sharp(source, { density: 300 })
    .resize({ width: 1050 }).webp({ quality: 90, alphaQuality: 100 }).toFile(out);
  console.log(out);
}
