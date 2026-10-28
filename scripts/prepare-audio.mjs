/** Traitement local uniquement : masters conservés, WAV courts et boucles MP3 mobiles. */
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const option = name => args.includes(name) ? args[args.indexOf(name) + 1] : undefined;
const briefs = JSON.parse(readFileSync(path.resolve(root, option("--briefs") ?? "src/data/audio-briefs.json")));
const report = [];
const raw = path.join(root, "reports/audio/raw");
mkdirSync(raw, { recursive: true });
export function preparerPcm(bytes, cibleDb) {
  const pcm = Array.from({ length: bytes.length / 2 }, (_, i) => bytes.readInt16LE(i * 2) / 32768);
  const peak = pcm.reduce((m, x) => Math.max(m, Math.abs(x)), 0);
  assert(peak > .0001, "Fichier silencieux");
  const seuil = Math.max(.0003, peak * .003);
  const debut = Math.max(0, pcm.findIndex(x => Math.abs(x) > seuil) - 220);
  const fin = Math.min(pcm.length, pcm.findLastIndex(x => Math.abs(x) > seuil) + 441);
  const samples = pcm.slice(debut, fin);
  const rms = Math.sqrt(samples.reduce((n, x) => n + x * x, 0) / samples.length);
  const gain = Math.min(10 ** (cibleDb / 20) / rms, 10 ** (-9 / 20) / peak);
  const output = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) {
    const fade = Math.min(1, i / 44, (samples.length - 1 - i) / 352);
    output.writeInt16LE(Math.round(samples[i] * gain * fade * 32767), i * 2);
  }
  return { output, debut: debut / 44100, fin: (pcm.length - fin) / 44100, gain };
}
function wav(pcm) {
  const b = Buffer.alloc(44);
  b.write("RIFF"); b.writeUInt32LE(pcm.length + 36, 4); b.write("WAVEfmt ", 8);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(44100, 24); b.writeUInt32LE(88200, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
  b.write("data", 36); b.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([b, pcm]);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  for (const son of briefs.effets.sons) {
    for (let v = 1; v <= son.variantes; v++) {
      const fichier = `public/sfx/candidates/${son.nom}-v${v}.mp3`;
      if (!existsSync(path.join(root, fichier))) continue;
      const cible = `public/sfx/${son.nom}${v > 1 ? "-alt" : ""}.wav`;
      const cibleDb = son.nom.startsWith("reveal-") ? -25 : son.nom.startsWith("impact-") ? -27 : ["close", "chip-place"].includes(son.nom) ? -30 : son.nom === "card-turn" ? -28.6 : son.nom === "card-draw" ? -25 : -28;
      const bytes = execFileSync("ffmpeg", ["-v", "error", "-i", path.join(root, fichier), "-af", "aformat=channel_layouts=mono,highpass=f=65,lowpass=f=10000,acompressor=threshold=0.025:ratio=6:attack=0.1:release=50", "-ar", "44100", "-ac", "1", "-f", "s16le", "pipe:1"]);
      const result = preparerPcm(bytes, cibleDb);
      const audio = wav(result.output);
      writeFileSync(path.join(root, cible), audio);
      let somme = 0, peak = 0;
      for (let i = 0; i < result.output.length; i += 2) { const x = result.output.readInt16LE(i) / 32768; somme += x * x; peak = Math.max(peak, Math.abs(x)); }
      report.push({ fichier: cible, source: fichier, duree: result.output.length / 88200, octets: audio.length, rmsDb: 20 * Math.log10(Math.sqrt(somme / (result.output.length / 2))), creteDb: 20 * Math.log10(peak), cibleDb, silenceDebutRetire: result.debut, silenceFinRetire: result.fin });
    }
  }
  for (const d of briefs.musique.directions) for (let v = 1; v <= d.variantes; v++) {
    const nom = `${d.id}-v${v}.mp3`;
    const fichier = path.join(root, "public/music/candidates", nom);
    if (!existsSync(fichier)) continue;
    const master = path.join(raw, nom);
    if (!existsSync(master)) copyFileSync(fichier, master);
    const analyse = spawnSync("ffmpeg", ["-hide_banner", "-i", master, "-af", "aformat=channel_layouts=mono,loudnorm=I=-20:TP=-3:LRA=7:print_format=json", "-f", "null", "-"], { encoding: "utf8" });
    assert.equal(analyse.status, 0);
    const initial = JSON.parse(analyse.stderr.match(/\{\s*"input_i"[\s\S]*?\}/)[0]);
    const gainDb = Math.min(-20 - Number(initial.input_i), -3 - Number(initial.input_tp));
    const pcm = execFileSync("ffmpeg", ["-v", "error", "-i", master, "-af", `volume=${gainDb}dB`, "-ar", "44100", "-ac", "1", "-f", "s16le", "pipe:1"], { maxBuffer: 10000000 });
    const samples = pcm.length / 2, overlap = Math.floor(.6 * 44100);
    // La fin croise le début ; la boucle commence après le recouvrement, sans double attaque.
    for (let i = 0; i < overlap; i++) {
      const a = pcm.readInt16LE((samples - overlap + i) * 2);
      const b = pcm.readInt16LE(i * 2);
      pcm.writeInt16LE(Math.round(a * (1 - i / overlap) + b * i / overlap), (samples - overlap + i) * 2);
    }
    execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "s16le", "-ar", "44100", "-ac", "1", "-i", "pipe:0", "-map_metadata", "-1", "-codec:a", "libmp3lame", "-b:a", "96k", fichier], { input: pcm.subarray(overlap * 2) });
    const mesure = spawnSync("ffmpeg", ["-hide_banner", "-i", fichier, "-af", "loudnorm=I=-20:TP=-3:LRA=7:print_format=json", "-f", "null", "-"], { encoding: "utf8" });
    assert.equal(mesure.status, 0);
    let niveaux = JSON.parse(mesure.stderr.match(/\{\s*"input_i"[\s\S]*?\}/)[0]);
    // Le downmix et l'encodage changent le niveau : correction sur le MP3 réellement livré.
    const correction = Math.min(-20 - Number(niveaux.input_i), -3.5 - Number(niveaux.input_tp));
    execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "s16le", "-ar", "44100", "-ac", "1", "-i", "pipe:0", "-af", `volume=${correction}dB`, "-map_metadata", "-1", "-codec:a", "libmp3lame", "-b:a", "96k", fichier], { input: pcm.subarray(overlap * 2) });
    const final = spawnSync("ffmpeg", ["-hide_banner", "-i", fichier, "-af", "loudnorm=I=-20:TP=-3:LRA=7:print_format=json", "-f", "null", "-"], { encoding: "utf8" });
    assert.equal(final.status, 0);
    niveaux = JSON.parse(final.stderr.match(/\{\s*"input_i"[\s\S]*?\}/)[0]);
    report.push({ fichier: `public/music/candidates/${nom}`, source: `reports/audio/raw/${nom}`, boucle: "recouvrement 0.6 s", cibleLufs: -20, lufs: Number(niveaux.input_i), creteDbTp: Number(niveaux.input_tp), duree: (samples - overlap) / 44100 });
  }
  const rapport = option("--report") ?? "docs/audio-measurements.json";
  writeFileSync(path.resolve(root, rapport), JSON.stringify(report, null, 2) + "\n");
  console.log(`${report.length} fichiers préparés ; mesures dans ${rapport}.`);
}
