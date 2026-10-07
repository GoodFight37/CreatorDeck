/**
 * Travailler à côté sans rien chambouler : deux commandes.
 *
 *   npm run essai:start        # AVANT : le dossier passe sur une branche d'essai
 *   … un outil (Cline, Gemini, un ami) modifie le dossier …
 *   npm run essai:push         # APRÈS : tout est rangé, poussé, et le dossier
 *                              #         revient sur la branche de travail
 *
 * `npm run essai:push` marche aussi **tout seul**, sans `essai:start` : il range
 * alors ce qui traîne sur une branche `essai/<date>-<heure>` avant de pousser.
 *
 * Ce que ces commandes ne font jamais : `--force`, supprimer une branche,
 * fusionner quoi que ce soit. Le travail d'un essai se **relit sur GitHub** —
 * c'est la seule façon de décider s'il entre dans le jeu.
 *
 * `npm run essai:push -- "ton message"` donne le message du commit.
 *
 * ---------------------------------------------------------------------------
 * Les deux situations, et ce qui se passe dans chacune
 * ---------------------------------------------------------------------------
 *
 * **Rien n'est commité** (le cas normal : un outil écrit dans les fichiers) :
 * tout est rangé sur la branche d'essai, poussé, et le dossier revient sur la
 * branche de travail — modifications comprises, retirées du dossier puisqu'elles
 * vivent désormais dans la branche d'essai.
 *
 * **L'outil a commité lui-même** : ses commits sont sur la branche de travail,
 * localement. La commande les **déplace** sur la branche d'essai (créée au même
 * endroit), la pousse, puis remet la branche de travail exactement sur le dépôt
 * distant — le dossier redevient celui de tout le monde. Rien n'est perdu : les
 * commits sont dans la branche d'essai, sur GitHub.
 *
 * Dans les deux cas, un contrôle refuse d'envoyer une **vraie clé secrète** :
 * si le contenu à pousser porte `sb_secret_…` (avec sa valeur), un jeton complet
 * ou une clé privée, rien ne part et rien n'est modifié.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DEBUT = process.argv.includes("--start");
const MESSAGE = process.argv
  .slice(2)
  .filter((argument) => !argument.startsWith("--"))
  .join(" ")
  .trim();

/** Retient, le temps de l'essai, sur quelle branche revenir. */
const MARQUE = "creatordeck-essai-base";

/** Les trois motifs qui trahissent une clé qui n'a rien à faire dans Git. */
const SECRETS = [
  { nom: "une clé secrète Supabase (`sb_secret_…`)", motif: /sb_secret_[A-Za-z0-9_-]{20,}/ },
  {
    nom: "un jeton JWT complet",
    motif: /eyJ[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/,
  },
  { nom: "une clé privée (PEM)", motif: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
];

function git(args) {
  // `stdio` explicite : sans lui, les messages d'erreur d'une sonde (« Needed a
  // single revision ») s'affichent chez le joueur alors que tout va bien.
  return execFileSync("git", args, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function gitOk(args) {
  try {
    return { ok: true, sortie: git(args) };
  } catch (error) {
    const failure = error;
    return { ok: false, sortie: String(failure.stderr || failure.stdout || failure.message || "").trim() };
  }
}

function racineGit() {
  return path.resolve(ROOT, git(["rev-parse", "--git-dir"]));
}

function stop(...lignes) {
  console.log("");
  for (const ligne of lignes) console.log(ligne);
  console.log("");
  process.exit(1);
}

function dire(...lignes) {
  console.log("");
  for (const ligne of lignes) console.log(ligne);
  console.log("");
}

/** Horodatage court, pour un nom de branche lisible. */
function suffixe() {
  const maintenant = new Date();
  const deux = (valeur) => String(valeur).padStart(2, "0");
  return `${maintenant.getFullYear()}${deux(maintenant.getMonth() + 1)}${deux(maintenant.getDate())}-${deux(
    maintenant.getHours(),
  )}${deux(maintenant.getMinutes())}`;
}

/** Un nom de branche `essai/…` libre (le second essai de la même minute prend -2). */
function nomEssaiLibre() {
  let nom = `essai/${suffixe()}`;
  for (let n = 2; gitOk(["rev-parse", "--verify", `refs/heads/${nom}`]).ok; n += 1) {
    nom = `essai/${suffixe()}-${n}`;
  }
  return nom;
}

/** La branche de travail enregistrée par `essai:start`, si elle existe. */
function brancheDeRetour() {
  const fichier = path.join(racineGit(), MARQUE);
  if (!existsSync(fichier)) return null;
  return readFileSync(fichier, "utf8").trim() || null;
}

/**
 * Le commit d'où part l'essai : le parent du plus ancien commit que **aucun**
 * dépôt distant ne connaît. C'est le point où la branche d'essai a été coupée.
 */
function baseDeLEssai() {
  const locaux = git(["rev-list", "HEAD", "--not", "--remotes"]).split("\n").filter(Boolean);
  if (!locaux.length) return null;
  const parent = gitOk(["rev-parse", `${locaux[locaux.length - 1]}^`]);
  return parent.ok ? parent.sortie : null;
}

/**
 * Sans marqueur — branche ouverte par une version précédente de l'outil, ou
 * `essai:start` oublié — on retrouve la branche de travail **sur GitHub** :
 * c'est celle dont le sommet est exactement le commit d'où l'essai est parti.
 * On ne devine que si c'est net : une seule candidate. Sinon on ne touche à
 * rien, et la marche à suivre est écrite à l'écran.
 */
function infererRetour() {
  const base = baseDeLEssai();
  if (!base) return null;
  const candidates = git(["for-each-ref", "--format=%(refname:short)", "refs/remotes/origin"])
    .split("\n")
    .filter((nom) => nom && nom !== "origin/HEAD" && !nom.startsWith("origin/essai/"));
  const exactes = candidates.filter((nom) => {
    const sommet = gitOk(["rev-parse", `${nom}^{commit}`]);
    return sommet.ok && sommet.sortie === base;
  });
  return exactes.length === 1 ? exactes[0].replace(/^origin\//, "") : null;
}

function marquerRetour(nom) {
  writeFileSync(path.join(racineGit(), MARQUE), `${nom}\n`, "utf8");
}

function oublierRetour() {
  rmSync(path.join(racineGit(), MARQUE), { force: true });
}

/** Refuse d'envoyer une clé secrète. `contenu` = le diff qu'on s'apprête à pousser. */
function controlerSecrets(contenu) {
  for (const { nom, motif } of SECRETS) {
    if (!motif.test(contenu)) continue;
    stop(
      `Arrêt : le contenu à envoyer contient ${nom}.`,
      "",
      "Rien n'a été poussé, et la branche de travail n'a pas bougé. Le fichier fautif",
      "est toujours dans le dossier : retire la clé (elle n'a rien à faire dans le",
      "code — les clés du serveur vivent dans les Secrets Supabase), puis relance.",
      "",
      "Rappel : la seule clé qui a le droit d'être dans l'application est la clé",
      "**publishable** (ou « anon »). Jamais la clé secrète, jamais « service_role ».",
    );
  }
}

/** L'adresse du dépôt, en https et sans `.git`, pour fabriquer un lien. */
function lienComparaison(depuis, vers) {
  const distant = git(["remote", "get-url", "origin"])
    .replace(/\.git$/, "")
    .replace(/^git@github\.com:/, "https://github.com/");
  return `${distant}/compare/${depuis}...${vers.replace("/", ":")}`;
}

/** Les commits qui ne sont sur **aucun** dépôt distant (donc à pousser). */
function commitsAPousser() {
  // L'ordre compte : la révision d'abord, puis `--not --remotes`. Écrit dans
  // l'autre sens, git répond toujours 0 — et on croirait qu'il n'y a rien à
  // pousser alors que les commits de l'outil attendent dans le dossier.
  return Number(gitOk(["rev-list", "--count", "HEAD", "--not", "--remotes"]).sortie || "0");
}

/** Y a-t-il une branche distante pour ce nom ? */
function distanteExiste(nom) {
  return gitOk(["rev-parse", "--verify", `refs/remotes/origin/${nom}`]).ok;
}

// --------------------------------------------------------------------------
// Les contrôles communs : dépôt, origin, identité, branche courante
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
    "Sans lui, `push` ne sait pas où envoyer. Ce n'est pas normal : dis-le moi.",
  );
}

if (!gitOk(["config", "user.email"]).sortie || !gitOk(["config", "user.name"]).sortie) {
  stop(
    "Git ne sait pas encore qui tu es, il ne peut donc pas signer le commit.",
    "Tape ces deux lignes (une fois dans ta vie), puis relance :",
    "",
    '  git config --global user.name "Ton nom"',
    '  git config --global user.email "ton@adresse.fr"',
  );
}

const depart = git(["rev-parse", "--abbrev-ref", "HEAD"]);
if (depart === "HEAD") {
  stop(
    "Tu n'es sur aucune branche (état « detached HEAD »).",
    "Reviens d'abord sur une branche, par exemple :",
    "",
    "  git checkout arena/01a10c75-creatordeck",
  );
}

// ==========================================================================
// `npm run essai:start` — AVANT de laisser un outil toucher au dossier
// ==========================================================================
if (DEBUT) {
  if (depart.startsWith("essai/")) {
    dire(
      `Tu es déjà sur une branche d'essai : ${depart}.`,
      "Laisse travailler l'outil, puis lance `npm run essai:push`.",
    );
    process.exit(0);
  }

  const dejaOuvert = brancheDeRetour();
  if (dejaOuvert) {
    dire(
      `Un essai est déjà ouvert (retour prévu sur « ${dejaOuvert} »).`,
      "Range-le d'abord avec `npm run essai:push` — sinon je ne saurais pas où te",
      "ramener.",
    );
    process.exit(1);
  }

  const nom = nomEssaiLibre();
  marquerRetour(depart);
  git(["checkout", "-b", nom]);
  dire(
    `Branche d'essai ouverte : ${nom}`,
    "",
    "L'outil peut travailler : tout ce qu'il écrit (et commite, s'il le fait) reste",
    "sur cette branche. Ta branche de travail ne bouge pas.",
    "",
    "Quand il a fini :  npm run essai:push",
    `  → range, pousse sur GitHub, et te ramène sur « ${depart} ».`,
  );
  process.exit(0);
}

// ==========================================================================
// `npm run essai:push` — APRÈS le travail de l'outil
// ==========================================================================
// Un `fetch` d'abord : sans lui, `origin/<branche>` peut manquer (dépôt jamais
// relu depuis longtemps), et on confondrait « rien à pousser » avec « jamais
// poussé ». Un échec réseau n'arrête pas : on travaille avec ce qu'on a.
gitOk(["fetch", "origin", "--quiet"]);

let courante = depart;
let surEssai = courante.startsWith("essai/");
let retour = brancheDeRetour() ?? infererRetour();
let fichiers = 0;

const modifications = git(["status", "--porcelain"]).split("\n").filter(Boolean);

// --- Rien à faire ---------------------------------------------------------
if (!modifications.length && commitsAPousser() === 0) {
  if (surEssai && retour && retour !== courante) {
    // Un essai ouvert (ou déjà envoyé) ne doit pas laisser le dossier dessus :
    // on revient sur la branche de travail, exactement comme à la fin d'un envoi.
    const revenu = gitOk(["checkout", retour]).ok;
    if (revenu) oublierRetour();
    dire(
      "Rien à pousser : le dossier est exactement comme la dernière version rangée.",
      revenu
        ? `Dossier revenu sur « ${retour} ».`
        : `Tu es resté sur ${courante} — pour revenir : git checkout ${retour}`,
    );
    process.exit(0);
  }
  dire(
    "Rien à pousser : le dossier est exactement comme la dernière version rangée.",
    `(branche ${courante})`,
  );
  process.exit(0);
}

// --- Ranger les modifications en cours ------------------------------------
if (modifications.length) {
  fichiers = modifications.length;
  console.log("");
  console.log(`${fichiers} fichier(s) modifié(s) :`);
  for (const ligne of modifications.slice(0, 12)) console.log(`  · ${ligne.slice(3).trim()}`);
  if (fichiers > 12) console.log(`  · … et ${fichiers - 12} autre(s)`);

  git(["add", "-A"]);
  // On lit ce qui est **rangé** : les docs et les tests citent les motifs de
  // clés en toutes lettres, ce n'est pas une fuite.
  controlerSecrets(git(["diff", "--cached", "-U0"]));

  const message =
    MESSAGE ||
    `Essai local — ${new Date().toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}`;

  if (!surEssai) {
    const nom = nomEssaiLibre();
    console.log("");
    console.log(`→ branche ${nom}`);
    git(["checkout", "-b", nom]);
    courante = nom;
    surEssai = true;
    marquerRetour(depart);
    retour = depart;
  }

  const commit = gitOk(["commit", "-m", message]);
  if (!commit.ok) {
    if (courante !== depart) {
      // On remet tout comme avant : le retour de branche emmène les
      // modifications (pas encore commitées), et la branche vide est jetée.
      gitOk(["checkout", depart]);
      gitOk(["branch", "-d", courante]);
    }
    stop(
      "Le rangement a échoué (rien n'a été poussé) :",
      "",
      commit.sortie,
      "",
      "Tes modifications sont toujours dans le dossier.",
    );
  }
}

// --- L'outil a commité lui-même : on déplace ses commits ------------------
if (!modifications.length && !surEssai && commitsAPousser() > 0) {
  const aDeplacer = commitsAPousser();
  if (!distanteExiste(depart)) {
    stop(
      `Ta branche « ${depart} » n'existe pas sur GitHub : impossible de savoir sur`,
      "quoi la recaler. Dis-le moi, je regarde.",
    );
  }

  console.log("");
  console.log(`${aDeplacer} commit(s) fait(s) par l'outil sont sur « ${depart} » : je les déplace.`);
  // Le contrôle lit les commits eux-mêmes : ce sont eux qui partiraient.
  controlerSecrets(git(["diff", "-U0", `origin/${depart}..HEAD`]));

  const nom = nomEssaiLibre();
  // La branche d'essai naît **au même endroit** : elle emporte ces commits.
  git(["branch", nom, "HEAD"]);
  console.log(`→ branche ${nom}`);

  const envoi = gitOk(["push", "-u", "origin", nom]);
  if (!envoi.ok) {
    stop(
      "L'envoi sur GitHub a échoué (les commits sont toujours dans le dossier) :",
      "",
      envoi.sortie,
      "",
      `Branche locale : ${nom}. Réessaie plus tard : git push -u origin ${nom}`,
    );
  }

  // La branche de travail revient exactement sur le dépôt : ses commits sont
  // désormais dans la branche d'essai, et le dossier reprend le contenu de tout
  // le monde. Rien n'est perdu (tout est sur GitHub).
  const ajoutes = git(["diff", "--name-only", "--diff-filter=A", `origin/${depart}..${nom}`])
    .split("\n")
    .filter(Boolean);
  git(["reset", "--mixed", `origin/${depart}`]);
  git(["checkout", "HEAD", "--", "."]);
  for (const fichier of ajoutes) rmSync(path.join(ROOT, fichier), { force: true });

  dire(
    "✅ Déplacés, poussés, et le dossier est revenu comme avant :",
    `   branche d'essai ${nom} (${aDeplacer} commit(s))`,
    `   branche de travail ${depart} — de nouveau identique à GitHub`,
    "",
    `Pour revoir le travail de l'outil : git checkout ${nom}`,
    `Pour le récupérer dans le dossier, une fois relu : git checkout ${nom} -- .`,
    "",
    `Comparer : ${lienComparaison(depart, nom)}`,
  );
  process.exit(0);
}

// --- Envoi ----------------------------------------------------------------
const envoi = gitOk(["push", "-u", "origin", courante]);
if (!envoi.ok) {
  const connexion = /authentication|credential|username|permission denied|403/i.test(envoi.sortie);
  stop(
    "Le rangement est fait, mais l'envoi sur GitHub a échoué :",
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
    `Tes modifications sont **rangées** dans la branche locale : ${courante}`,
    "Rien n'est perdu. Pour réessayer :",
    "",
    `  git push -u origin ${courante}`,
    ...(retour ? ["", `Et pour revenir à ta branche de travail : git checkout ${retour}`] : []),
  );
}

// --- Retour sur la branche de travail -------------------------------------
let revenu = false;
if (surEssai && retour && retour !== courante) {
  revenu = gitOk(["checkout", retour]).ok;
  if (revenu) oublierRetour();
}

dire(
  "✅ Envoyé :",
  `   branche  ${courante}`,
  `   fichiers ${fichiers}${MESSAGE ? ` · message « ${MESSAGE} »` : ""}`,
  ...(revenu
    ? [`   dossier revenu sur « ${retour} » — comme avant`]
    : surEssai
      ? [
          `   le dossier est resté sur la branche d'essai ${courante}`,
          retour
            ? `   pour revenir : git checkout ${retour}`
            : "   pour revenir : git checkout <ta branche de travail>",
        ]
      : []),
  "",
  `Comparer : ${lienComparaison(retour ?? "main", courante)}`,
  "",
  "Donne le nom de la branche à relire — ou dis simplement « c'est poussé ».",
  "Un essai se relit **avant** d'entrer dans le jeu : il ne déclenche pas de",
  "nouvel APK.",
);
