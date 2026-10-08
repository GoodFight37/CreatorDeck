/**
 * Remet la machine de développement en état, en **une** commande :
 *
 *   npm run dev:setup
 *
 * Pourquoi ce script existe : `node_modules` n'est pas conservé par
 * l'environnement de travail (il est régénéré à partir de `package-lock.json`),
 * alors que les deux paquets de la vérification SQL sont installés en
 * `--no-save` — ils ne sont donc **pas** dans le lock, et un `npm ci` seul les
 * oublie. Résultat : `npm run supabase:verify` sort en succès **sans rien
 * tester** (il ne trouve pas `embedded-postgres`), ce qui est pire qu'un échec.
 *
 * Ce script ne fait que ce qui manque :
 *
 *   1. `node_modules` absent → `npm ci` (le lock fait foi, rien n'est ajouté au
 *      projet ni à l'APK) ;
 *   2. `embedded-postgres` ou `pg` manquant → installés en `--no-save`, comme
 *      les instructions le demandent ;
 *   3. sinon, il ne touche à rien (relancer est gratuit).
 *
 * Il est **sans dépendance** et ne modifie aucun fichier du dépôt.
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const NPM = process.platform === "win32" ? "npm.cmd" : "npm";

/** Les paquets de la vérification, installés hors lock (`--no-save`). */
const VERIF = ["embedded-postgres", "pg"];

function run(args) {
  console.log(`→ npm ${args.join(" ")}`);
  execFileSync(NPM, args, { cwd: ROOT, stdio: "inherit" });
}

function present(nom) {
  return existsSync(path.join(ROOT, "node_modules", nom));
}

const lock = path.join(ROOT, "package-lock.json");
if (!existsSync(path.join(ROOT, "node_modules"))) {
  if (!existsSync(lock)) {
    console.error("package-lock.json manquant : es-tu bien à la racine du dépôt ?");
    process.exit(1);
  }
  console.log("node_modules absent : installation complète (`npm ci`).");
  run(["ci", "--no-audit", "--no-fund"]);
}

const manquants = VERIF.filter((nom) => !present(nom));
if (manquants.length) {
  console.log(`Paquets de vérification manquants : ${manquants.join(", ")}.`);
  run(["install", "--no-save", "--no-audit", "--no-fund", ...manquants]);
}

// Un contrôle qui dit la vérité : la vérification SQL **doit** pouvoir tourner.
if (!present("embedded-postgres") || !present("pg")) {
  console.error("installation incomplète : embedded-postgres et pg sont requis par `supabase:verify`.");
  process.exit(1);
}

console.log("Prêt : `npm test`, `npm run supabase:verify`, `npm run dev`.");
