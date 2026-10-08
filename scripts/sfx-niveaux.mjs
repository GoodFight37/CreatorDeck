/**
 * Les niveaux des bruitages : mesure les fichiers, écrit la table.
 *
 * Pourquoi ce script existe : les quinze bruitages viennent de **six dossiers
 * différents** du même pack, et tous sont livrés à leur maximum (crête à
 * 0 dBFS). Joués avec un gain écrit à la main, ils ne sonnaient pas au même
 * volume : le papier d'une carte (`card-draw`, RMS −15,6 dB) sortait **neuf
 * décibels** plus fort qu'un clic d'onglet (`click`, RMS −22,8 dB). C'est
 * exactement ce qu'un joueur décrit par « les sons sont trop forts et n'ont
 * rien à voir avec ce que je clique ».
 *
 * La correction est ici : on **mesure** chaque fichier (RMS et crête, en dBFS)
 * et on lui donne une **cible de volume perçu**. Le gain de lecture est alors
 * le chemin entre les deux : `10^((cible − mesure) / 20)`. Les cibles sont
 * écrites dans ce script, parce que c'est un choix de game design et non une
 * mesure : un clic qu'on entend cent fois se tient à −32 dB, une récompense à
 * −26 dB — le rare a le droit d'être plus présent que le quotidien.
 *
 *   node scripts/sfx-niveaux.mjs           # mesure et réécrit src/data/sfx-niveaux.json
 *
 * `src/lib/sfx.test.ts` relit la table **et** les fichiers : remplacer un .wav
 * par un autre niveau fait échouer le test, pas le jeu.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DOSSIER = path.join(ROOT, "public", "sfx");
const TABLE = path.join(ROOT, "src", "data", "sfx-niveaux.json");

/**
 * Ce que chaque bruitage doit valoir **une fois joué**, en dBFS de RMS.
 *
 * Trois familles, et une règle : ce qui s'entend le plus souvent est le plus
 * discret. Le clic d'un onglet passe des centaines de fois par partie ; une
 * récompense, deux ou trois fois. L'écart de six décibels entre les deux, c'est
 * ce qui fait qu'une récompense s'entend **sans** qu'on monte le volume pour
 * les clics.
 */
const CIBLES = {
  // Les gestes du quotidien : courts, feutrés, toujours au même niveau.
  click: -32,
  select: -30,
  "menu-open": -30,
  close: -30,
  "card-turn": -30,
  "card-fan": -30,
  "chip-place": -30,
  // Les gestes qui portent quelque chose : le papier d'une carte, le paquet.
  "card-draw": -29,
  pop: -29,
  // Ce qui se gagne : les pièces, le carillon, la fanfare.
  coins: -28,
  chime: -28,
  fanfare: -28,
  // En réserve : plus aucun écran ne les joue aujourd'hui (ils servaient à la
  // simulation de streameur), mais ils restent réglés au cas où.
  equip: -29,
  "power-up": -29,
  gather: -28,
};

/** La crête ne doit jamais dépasser ça, même après amplification. */
const CRETE_MAX_DB = -9;

/** Lit un WAV PCM 16 bits et rend son RMS et sa crête, en dBFS. */
function mesurer(fichier) {
  const buf = readFileSync(fichier);
  const canaux = buf.readUInt16LE(22);
  const taux = buf.readUInt32LE(24);
  const bits = buf.readUInt16LE(34);
  const octetsDonnees = buf.readUInt32LE(40);
  if (bits !== 16) throw new Error(`${path.basename(fichier)} : pas du 16 bits`);
  const debut = fichier.length && 44; // en-tête canonique RIFF/WAVE de 44 octets
  const donnees = Math.min(octetsDonnees, buf.length - debut);
  const echantillons = Math.floor(donnees / 2);
  let somme = 0;
  let crete = 0;
  for (let i = 0; i < echantillons; i += 1) {
    const valeur = buf.readInt16LE(debut + i * 2) / 32768;
    somme += valeur * valeur;
    const absolu = Math.abs(valeur);
    if (absolu > crete) crete = absolu;
  }
  const rms = Math.sqrt(somme / Math.max(1, echantillons));
  return {
    duree: echantillons / (canaux * taux),
    rmsDb: arrondi(20 * Math.log10(Math.max(rms, 1e-6))),
    creteDb: arrondi(20 * Math.log10(Math.max(crete, 1e-6))),
  };
}

/** Deux décimales : la table se lit, et la mesure reste reproductible. */
function arrondi(valeur) {
  return Math.round(valeur * 100) / 100;
}

/** Le nom du bruitage : `card-draw.wav` → `card-draw`. */
function nommer(fichier) {
  return path.basename(fichier, ".wav");
}

const fichiers = readdirSync(DOSSIER).filter((f) => f.endsWith(".wav")).sort();
const connus = Object.keys(CIBLES);
const noms = fichiers.map(nommer);
for (const nom of noms) {
  if (!connus.includes(nom)) throw new Error(`bruitage sans cible : ${nom}`);
}
for (const nom of connus) {
  if (!noms.includes(nom)) throw new Error(`cible sans fichier : ${nom}`);
}

const niveaux = {};
const lignes = [];
for (const fichier of fichiers) {
  const nom = nommer(fichier);
  const mesure = mesurer(path.join(DOSSIER, fichier));
  const cibleDb = CIBLES[nom];
  // Le gain qui amène le fichier à sa cible, **borné par la crête** : un
  // bruitage très percussif (RMS bas, crête pleine) ne doit pas claquer.
  const parRms = 10 ** ((cibleDb - mesure.rmsDb) / 20);
  const parCrete = 10 ** ((CRETE_MAX_DB - mesure.creteDb) / 20);
  const gain = Math.min(parRms, parCrete);
  niveaux[nom] = { rmsDb: mesure.rmsDb, creteDb: mesure.creteDb, cibleDb };
  lignes.push(
    `${nom.padEnd(12)} ${mesure.duree.toFixed(2)}s  RMS ${String(mesure.rmsDb).padStart(7)}  ` +
      `crête ${String(mesure.creteDb).padStart(6)}  →  cible ${String(cibleDb).padStart(4)}  ` +
      `gain ${gain.toFixed(3)}${parCrete < parRms ? "  (borné par la crête)" : ""}`,
  );
}

const contenu = {
  $commentaire:
    "Généré par scripts/sfx-niveaux.mjs : la mesure des fichiers de public/sfx/ (dBFS) et leur cible de volume. Le gain de lecture se calcule, il ne s'écrit pas à la main.",
  unite: "dBFS",
  creteMaxDb: CRETE_MAX_DB,
  niveaux,
};
writeFileSync(TABLE, `${JSON.stringify(contenu, null, 2)}\n`, "utf8");
console.log(lignes.join("\n"));
console.log(`\n${fichiers.length} bruitages mesurés → src/data/sfx-niveaux.json`);
