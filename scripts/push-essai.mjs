/**
 * Envoie les modifications en cours sur une **branche d'essai**, en une seule
 * commande :
 *
 *   npm run essai:push
 *   npm run essai:push -- "l'effet holo, deuxième version"
 *
 * À quoi ça sert : quand un autre outil (ou une autre personne) modifie le
 * dossier, ces changements arrivent **sans branche** — mélangés à la branche
 * courante. `git pull` du lendemain se cognerait alors à eux, et il faudrait
 * démêler à la main. Ici, tout part sur sa propre branche :
 *
 *   1. les modifications sont **rangées** (toutes, y compris les fichiers neufs) ;
 *   2. un contrôle refuse de committer une vraie clé secrète (voir `SECRETS`) ;
 *   3. une branche `essai/<date>-<heure>` est créée **sur place** et poussée ;
 *   4. le dossier **revient** sur la branche de départ, comme si de rien n'était.
 *
 * Rien n'est jamais forcé, rien n'est supprimé : la branche d'essai existe des
 * deux côtés (local et GitHub) et peut être relue, comparée, ou jetée.
 *
 * Ce que ce script ne fait **pas** : fusionner. Une branche d'essai se relit.
 */
import { execFileSync } from "node:child_process";

const ROOT = process.cwd();
const GIT = "git";

/** Les trois motifs qui trahissent une clé qui n'a rien à faire dans Git. */
const SECRETS = [
  { nom: "une clé secrète Supabase (`sb_secret_…`)", motif: /sb_secret_[A-Za-z0-9_-]{20,}/ },
  { nom: "un jeton JWT complet", motif: /eyJ[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/ },
  { nom: "une clé privée (PEM)", motif: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
];

/** Lance git et rend sa sortie, ou lève (le message est déjà en français). */
function git(args, options = {}) {
  return execFileSync(GIT, args, { cwd: ROOT, encoding: "utf8", ...options }).trim();
}

function gitOk(args, options = {}) {
  try {
    return { ok: true, sortie: git(args, options) };
  } catch (error) {
    const failure = error;
    return { ok: false, sortie: String(failure.stderr || failure.stdout || failure.message || "").trim() };
  }
}

function stop(...lignes) {
  console.log("");
  for (const ligne of lignes) console.log(ligne);
  console.log("");
  process.exit(1);
}

// --------------------------------------------------------------------------
// 0. Le dossier est-il un dépôt, avec une identité pour signer le commit ?
// --------------------------------------------------------------------------
if (!gitOk(["rev-parse", "--is-inside-work-tree"]).ok) {
  stop(
    "Ce dossier n'est pas un dépôt Git.",
    "Ouvre un terminal **dans le dossier CreatorDeck** (celui qui contient ce projet)",
    "et relance la commande.",
  );
}

if (!gitOk(["remote", "get-url", "origin"]).ok) {
  stop(
    "Ce dépôt n'a pas de dépôt distant nommé « origin ».",
    "Sans lui, `push` ne sait pas où envoyer. Ouvre une issue : ce n'est pas normal.",
  );
}

// Un commit a besoin d'un nom et d'une adresse. S'ils manquent (machine neuve),
// git refuse avec un message anglais que personne ne lit — on le dit avant.
if (!gitOk(["config", "user.email"]).sortie || !gitOk(["config", "user.name"]).sortie) {
  stop(
    "Git ne sait pas encore qui tu es, il ne peut donc pas signer le commit.",
    "Tape ces deux lignes (une fois dans ta vie), puis relance :",
    "",
    '  git config --global user.name "Ton nom"',
    '  git config --global user.email "ton@adresse.fr"',
  );
}

const branche = git(["rev-parse", "--abbrev-ref", "HEAD"]);
if (branche === "HEAD") {
  stop(
    "Tu n'es sur aucune branche (état « detached HEAD »).",
    "Reviens d'abord sur une branche, par exemple :",
    "",
    "  git checkout arena/01a10c75-creatordeck",
  );
}

// --------------------------------------------------------------------------
// 1. Y a-t-il quelque chose à envoyer ?
// --------------------------------------------------------------------------
const modifications = git(["status", "--porcelain"]).split("\n").filter(Boolean);
if (!modifications.length) {
  const enAvance = gitOk(["rev-list", "--count", `origin/${branche}..HEAD`]);
  const nombre = enAvance.ok ? Number(enAvance.sortie) : 0;
  console.log("");
  console.log("Rien à pousser : le dossier est exactement comme la dernière version rangée.");
  if (nombre > 0) {
    console.log(
      `En revanche, ${nombre} commit(s) de cette branche ne sont pas encore sur GitHub : « git push ».`,
    );
  }
  console.log("");
  process.exit(0);
}

// --------------------------------------------------------------------------
// 2. Ranger, puis regarder ce qu'on s'apprête à envoyer
// --------------------------------------------------------------------------
git(["add", "-A"]);

// Le contrôle des secrets : il lit ce qui est **rangé**, pas tout le dossier
// (les docs et les tests citent ces motifs en toutes lettres, ce n'est pas une
// fuite — un vrai secret, lui, a une longue valeur aléatoire).
const rangé = git(["diff", "--cached", "-U0"]);
for (const { nom, motif } of SECRETS) {
  if (motif.test(rangé)) {
    stop(
      `Arrêt : le contenu à envoyer contient ${nom}.`,
      "",
      "Rien n'a été commité, rien n'est parti sur GitHub. Le fichier fautif est",
      "toujours dans le dossier : retire la clé (elle n'a aucune raison d'être dans",
      "le code — les clés du serveur vivent dans les Secrets Supabase), puis relance",
      "la commande.",
      "",
      "Rappel : la seule clé qui a le droit d'être dans l'application est la clé",
      "**publishable** (ou « anon »). Jamais la clé secrète, jamais « service_role ».",
    );
  }
}

const fichiers = modifications.map((ligne) => ligne.slice(3).trim());
const horodatage = new Date();
const date = horodatage.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
const suffixe = `${horodatage.getFullYear()}${String(horodatage.getMonth() + 1).padStart(2, "0")}${String(
  horodatage.getDate(),
).padStart(2, "0")}-${String(horodatage.getHours()).padStart(2, "0")}${String(
  horodatage.getMinutes(),
).padStart(2, "0")}`;

let nomBranche = `essai/${suffixe}`;
for (let n = 2; gitOk(["rev-parse", "--verify", `refs/heads/${nomBranche}`]).ok; n += 1) {
  nomBranche = `essai/${suffixe}-${n}`;
}

const message = process.argv.slice(2).join(" ").trim() || `Essai local — ${date}`;

// --------------------------------------------------------------------------
// 3. La branche, le commit, l'envoi
// --------------------------------------------------------------------------
console.log("");
console.log(`${fichiers.length} fichier(s) modifié(s) :`);
for (const fichier of fichiers.slice(0, 12)) console.log(`  · ${fichier}`);
if (fichiers.length > 12) console.log(`  · … et ${fichiers.length - 12} autre(s)`);
console.log("");
console.log(`→ branche ${nomBranche}`);

git(["checkout", "-b", nomBranche]);
const commit = gitOk(["commit", "-m", message], { stdio: ["ignore", "pipe", "pipe"] });
if (!commit.ok) {
  // On remet tout comme avant : le retour de branche emmène les modifications
  // (elles ne sont pas encore commitées), et la branche vide est jetée.
  gitOk(["checkout", branche]);
  gitOk(["branch", "-d", nomBranche]);
  stop(
    "Le rangement a échoué (rien n'a été envoyé) :",
    "",
    commit.sortie,
    "",
    "Tes modifications sont toujours dans le dossier, et la branche de départ est",
    "revenue. Copie-moi ce message et je corrige.",
  );
}

const envoi = gitOk(["push", "-u", "origin", nomBranche], { stdio: ["ignore", "pipe", "pipe"] });
if (!envoi.ok) {
  const connexion = /authentication|credential|username|permission denied|403/i.test(envoi.sortie);
  stop(
    "Le commit est fait, mais l'envoi sur GitHub a échoué :",
    "",
    envoi.sortie,
    ...(connexion
      ? [
          "",
          "C'est un refus de connexion à GitHub (pas une erreur dans le code). Git va",
          "ouvrir une fenêtre : connecte-toi avec ton compte GitHub dedans. Ne colle",
          "jamais un jeton dans le chat — ni ici, ni ailleurs.",
        ]
      : []),
    "",
    "Tes modifications sont **rangées** dans la branche locale :",
    `  ${nomBranche}`,
    "Rien n'est perdu. Pour réessayer :",
    "",
    `  git push -u origin ${nomBranche}`,
    "",
    `Et pour revenir comme avant : git checkout ${branche}`,
  );
}

// Retour sur la branche de départ : le dossier redevient celui qu'on connaît,
// et le travail de l'essai reste vivant sur sa branche.
git(["checkout", branche]);

const distant = git(["remote", "get-url", "origin"])
  .replace(/\.git$/, "")
  .replace(/^git@github\.com:/, "https://github.com/");
console.log("");
console.log("✅ Envoyé :");
console.log(`   branche  ${nomBranche}`);
console.log(`   fichiers ${fichiers.length} · message « ${message} »`);
console.log(`   comparer ${distant}/compare/${branche}...${nomBranche.replace("/", ":")}`);
console.log("");
console.log(`Le dossier est revenu sur « ${branche} » — comme avant.`);
console.log(
  `Tes modifications vivent dans « ${nomBranche} » : pour les revoir sous les yeux,`,
);
console.log(`  git checkout ${nomBranche}      (et pour revenir : git checkout ${branche})`);
console.log("");
