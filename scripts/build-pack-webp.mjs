// Sachets du carrousel en WebP : un SVG de ~280 tracés est re-rastérisé à chaque
// bascule (image + deux masques), ce qui gelait la scène ~0,6 s sur Android.
// À relancer après `scripts/build-pack-art.py` : node scripts/build-pack-webp.mjs
import sharp from "sharp";

for (const pack of ["live", "memes", "imgflip"]) {
  const out = `public/packs/${pack}-opening.webp`;
  // 1050 px : 250 px CSS × 1,5 (face dessinée à 150 %) × DPR 2,75, sans flou.
  await sharp(`public/packs/${pack}-opening.svg`, { density: 300 })
    .resize({ width: 1050 }).webp({ quality: 90, alphaQuality: 100 }).toFile(out);
  console.log(out);
}
