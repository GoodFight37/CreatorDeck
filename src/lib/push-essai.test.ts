/**
 * `npm run essai:start` / `npm run essai:push` — les deux commandes qui
 * permettent à un autre outil (Cline, Gemini, un ami) de travailler dans le
 * dossier **sans chambouler** la branche de travail.
 *
 * Le script est testé **pour de vrai** : un dépôt git jetable, un « origin » nu
 * (un dépôt local à qui on peut pousser sans réseau), et tous les cas qui
 * comptent — rien à envoyer, un essai complet, un message choisi, une clé
 * secrète qui doit **bloquer** l'envoi, la branche ouverte **avant** le travail,
 * et l'outil qui a commité lui-même (ses commits partent sur l'essai, la branche
 * de travail revient sur le dépôt).
 *
 * C'est le genre d'outil qui ne pardonne pas l'approximation : s'il range mal,
 * il mélange du travail non relu avec la branche que le joueur installe.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const SCRIPT = path.join(process.cwd(), "scripts", "push-essai.mjs");

function git(cwd: string, args: string[]): string {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

/** Un dépôt jetable avec un origin nu : exactement le décor du joueur. */
function depot(): { racine: string; origin: string } {
  const racine = mkdtempSync(path.join(tmpdir(), "creatordeck-essai-"));
  git(racine, ["init", "-q", "-b", "arena/01a10c75-creatordeck"]);
  git(racine, ["config", "user.name", "Test"]);
  git(racine, ["config", "user.email", "test@example.fr"]);
  writeFileSync(path.join(racine, "jeu.ts"), "export const version = 1;\n");
  git(racine, ["add", "-A"]);
  git(racine, ["commit", "-qm", "départ"]);

  const origin = path.join(racine, "..", `${path.basename(racine)}-origin.git`);
  execFileSync("git", ["init", "-q", "--bare", origin], { encoding: "utf8" });
  git(racine, ["remote", "add", "origin", origin]);
  git(racine, ["push", "-q", "-u", "origin", "arena/01a10c75-creatordeck"]);
  return { racine, origin };
}

/** Lance le script dans un dossier donné et capture ce qu'il raconte. */
function lancer(
  racine: string,
  args: string[] = [],
): { sortie: string; status: number } {
  try {
    const sortie = execFileSync(process.execPath, [SCRIPT, ...args], { cwd: racine, encoding: "utf8" });
    return { sortie, status: 0 };
  } catch (error) {
    const failure = error as { status?: number | null; stdout?: string; stderr?: string };
    return { sortie: `${failure.stdout ?? ""}${failure.stderr ?? ""}`, status: failure.status ?? 1 };
  }
}

/** Les branches d'un dépôt nu, sans le préfixe `refs/heads/`. */
function branches(origin: string): string[] {
  return execFileSync("git", ["--git-dir", origin, "branch", "--list", "--format=%(refname:short)"], {
    encoding: "utf8",
  })
    .split("\n")
    .filter(Boolean);
}

describe("essai:push — ranger le travail d'un autre outil sur une branche à part", () => {
  it("ne fait rien quand il n'y a rien à envoyer", () => {
    const { racine } = depot();
    const { sortie, status } = lancer(racine);
    expect(status).toBe(0);
    expect(sortie).toContain("Rien à pousser");
    // Aucune branche d'essai n'a été fabriquée pour rien.
    expect(git(racine, ["branch", "--list", "essai/*"])).toBe("");
  });

  it("envoie les modifications sur une branche essai et revient au point de départ", () => {
    const { racine, origin } = depot();
    writeFileSync(path.join(racine, "jeu.ts"), "export const version = 2;\n");
    writeFileSync(path.join(racine, "neuf.ts"), "// fichier neuf\n");

    const { sortie, status } = lancer(racine, ["l'effet holo, deuxième version"]);
    expect(status).toBe(0);
    expect(sortie).toContain("branche  essai/");

    // La branche existe sur le « GitHub » du décor, avec les deux fichiers.
    const envoi = branches(origin).filter((nom) => nom.startsWith("essai/"));
    expect(envoi).toHaveLength(1);
    expect(git(origin, ["show", `${envoi[0]}:jeu.ts`])).toContain("version = 2");
    expect(git(origin, ["show", `${envoi[0]}:neuf.ts`])).toContain("fichier neuf");
    const message = execFileSync("git", ["--git-dir", origin, "log", "-1", "--pretty=%s", envoi[0]], {
      encoding: "utf8",
    }).trim();
    expect(message).toBe("l'effet holo, deuxième version");

    // Et le dossier est revenu **exactement** comme avant : même branche, et
    // les modifications ne traînent plus dans le dossier de travail.
    expect(git(racine, ["rev-parse", "--abbrev-ref", "HEAD"])).toBe("arena/01a10c75-creatordeck");
    expect(git(racine, ["status", "--porcelain"])).toBe("");
    expect(readFileSync(path.join(racine, "jeu.ts"), "utf8")).toContain("version = 1");
  });

  it("donne un message daté quand on n'en fournit pas", () => {
    const { racine, origin } = depot();
    writeFileSync(path.join(racine, "jeu.ts"), "export const version = 3;\n");
    const { status } = lancer(racine);
    expect(status).toBe(0);

    const envoi = branches(origin).filter((nom) => nom.startsWith("essai/"));
    const message = execFileSync("git", ["--git-dir", origin, "log", "-1", "--pretty=%s", envoi[0]], {
      encoding: "utf8",
    }).trim();
    expect(message).toMatch(/^Essai local — /);
  });

  it("refuse d'envoyer une clé secrète, et ne range rien", () => {
    const { racine, origin } = depot();
    mkdirSync(path.join(racine, "src"), { recursive: true });
    writeFileSync(
      path.join(racine, "src", "config.ts"),
      'export const CLE = "sb_secret_abcdefghijklmnopqrstuvwxyz012345";\n',
    );

    const { sortie, status } = lancer(racine);
    expect(status).toBe(1);
    expect(sortie).toContain("clé secrète Supabase");

    // Rien n'est parti, et le fichier est toujours là (on ne supprime rien).
    expect(branches(origin)).toEqual(["arena/01a10c75-creatordeck"]);
    expect(git(racine, ["rev-parse", "--abbrev-ref", "HEAD"])).toBe("arena/01a10c75-creatordeck");
    expect(git(racine, ["log", "--oneline"]).split("\n")).toHaveLength(1);
    expect(readFileSync(path.join(racine, "src", "config.ts"), "utf8")).toContain("sb_secret_");
  });

  it("laisse la documentation citer les motifs de clés sans s'arrêter", () => {
    // Les docs et les tests parlent de `sb_secret_…`, de `service_role` et des
    // jetons en toutes lettres : ce ne sont pas des fuites, et un faux refus
    // rendrait l'outil inutilisable.
    const { racine } = depot();
    writeFileSync(
      path.join(racine, "docs.md"),
      "La clé secrète (`sb_secret_…`) ne va jamais dans l'app, pas plus que `service_role`.\n",
    );
    const { sortie, status } = lancer(racine);
    expect(status).toBe(0);
    expect(sortie).toContain("branche  essai/");
  });

  it("ouvre la branche d'essai AVANT le travail, et y laisse tout atterrir", () => {
    const { racine, origin } = depot();
    const { sortie, status } = lancer(racine, ["--start"]);
    expect(status).toBe(0);
    expect(sortie).toContain("Branche d'essai ouverte");

    // Le dossier est sur la branche d'essai : tout ce que l'outil écrit tombe là.
    const nom = git(racine, ["rev-parse", "--abbrev-ref", "HEAD"]);
    expect(nom).toMatch(/^essai\//);
    writeFileSync(path.join(racine, "jeu.ts"), "export const version = 7;\n");
    git(racine, ["add", "-A"]);
    git(racine, ["commit", "-qm", "travail de l'outil"]);

    // Fin de l'essai : envoi, puis retour sur la branche de travail.
    const fin = lancer(racine);
    expect(fin.status).toBe(0);
    expect(fin.sortie).toContain("dossier revenu sur");
    expect(git(racine, ["rev-parse", "--abbrev-ref", "HEAD"])).toBe("arena/01a10c75-creatordeck");
    expect(git(racine, ["status", "--porcelain"])).toBe("");
    expect(readFileSync(path.join(racine, "jeu.ts"), "utf8")).toContain("version = 1");
    expect(git(origin, ["show", `${nom}:jeu.ts`])).toContain("version = 7");
    // La branche de travail n'a pas bougé d'un commit sur le dépôt distant.
    expect(git(origin, ["log", "--pretty=%s", "arena/01a10c75-creatordeck"])).toBe("départ");
  });

  it("ne rouvre pas une deuxième branche d'essai par-dessus la première", () => {
    const { racine } = depot();
    lancer(racine, ["--start"]);
    const deuxieme = lancer(racine, ["--start"]);
    expect(deuxieme.status).toBe(0);
    expect(deuxieme.sortie).toContain("déjà sur une branche d'essai");
    expect(git(racine, ["branch", "--list", "essai/*"]).split("\n").filter(Boolean)).toHaveLength(1);
  });

  it("déplace les commits que l'outil a faits lui-même, et remet la branche de travail à jour", () => {
    // Le cas vicieux : l'outil a commité dans le dossier, sur la branche de
    // travail. Sans cette manœuvre, ces commits seraient poussés un jour ou
    // l'autre sur la branche que le joueur installe.
    const { racine, origin } = depot();
    writeFileSync(path.join(racine, "jeu.ts"), "export const version = 9;\n");
    writeFileSync(path.join(racine, "neuf.ts"), "// nouveau fichier\n");
    git(racine, ["add", "-A"]);
    git(racine, ["commit", "-qm", "l'outil a commite"]);

    const { sortie, status } = lancer(racine);
    expect(status).toBe(0);
    expect(sortie).toContain("je les déplace");

    // La branche d'essai porte le travail, sur GitHub.
    const essai = branches(origin).filter((nom) => nom.startsWith("essai/"));
    expect(essai).toHaveLength(1);
    expect(git(origin, ["show", `${essai[0]}:jeu.ts`])).toContain("version = 9");
    expect(git(origin, ["show", `${essai[0]}:neuf.ts`])).toContain("nouveau fichier");

    // La branche de travail est revenue exactement sur le dépôt, et le dossier
    // aussi : plus de fichier en trop, plus de modification en attente.
    expect(git(origin, ["log", "--pretty=%s", "arena/01a10c75-creatordeck"])).toBe("départ");
    expect(git(racine, ["rev-parse", "--abbrev-ref", "HEAD"])).toBe("arena/01a10c75-creatordeck");
    expect(git(racine, ["status", "--porcelain"])).toBe("");
    expect(readFileSync(path.join(racine, "jeu.ts"), "utf8")).toContain("version = 1");
    expect(() => readFileSync(path.join(racine, "neuf.ts"), "utf8")).toThrow();
  });

  it("reprend un envoi refusé : le commit rangé part enfin, et le dossier revient", () => {
    // L'état exact laissé par un envoi que GitHub a refusé (« Internal Server
    // Error ») : on est sur la branche d'essai, le commit est fait, et la
    // branche n'existe pas encore sur GitHub — donc aucune référence distante
    // où se comparer. Le dossier doit s'en sortir tout seul.
    const { racine, origin } = depot();
    git(racine, ["checkout", "-qb", "essai/20261007-1857"]);
    writeFileSync(path.join(racine, "jeu.ts"), "export const version = 4;\n");
    git(racine, ["add", "-A"]);
    git(racine, ["commit", "-qm", "travail de l'outil"]);

    const { sortie, status } = lancer(racine);
    expect(status).toBe(0);
    expect(sortie).toContain("essai/20261007-1857");
    // Le commit est enfin sur GitHub, sous sa branche.
    expect(branches(origin)).toContain("essai/20261007-1857");
    expect(git(origin, ["log", "-1", "--pretty=%s", "essai/20261007-1857"])).toBe("travail de l'outil");
    // Et la branche de travail est retrouvée sans marqueur : c'est la branche
    // distante dont le sommet est le commit d'où l'essai est parti.
    expect(git(racine, ["rev-parse", "--abbrev-ref", "HEAD"])).toBe("arena/01a10c75-creatordeck");
    expect(readFileSync(path.join(racine, "jeu.ts"), "utf8")).toContain("version = 1");
    expect(git(origin, ["log", "-1", "--pretty=%s", "arena/01a10c75-creatordeck"])).toBe("départ");
  });

  it("ramène le dossier sur la branche de travail quand il n'y a plus rien à pousser", () => {
    // Deuxième passage après un essai déjà envoyé : le dossier ne doit pas
    // rester sur la branche d'essai, sinon le `git pull` suivant s'y cogne.
    const { racine } = depot();
    lancer(racine, ["--start"]);
    const { sortie, status } = lancer(racine);
    expect(status).toBe(0);
    expect(sortie).toContain("Rien à pousser");
    expect(sortie).toContain("Dossier revenu sur");
    expect(git(racine, ["rev-parse", "--abbrev-ref", "HEAD"])).toBe("arena/01a10c75-creatordeck");
    // Le marqueur est effacé : un nouvel essai peut s'ouvrir.
    const suivant = lancer(racine, ["--start"]);
    expect(suivant.sortie).toContain("Branche d'essai ouverte");
  });

  it("refuse d'envoyer un commit de l'outil qui contient une clé secrète", () => {
    const { racine, origin } = depot();
    writeFileSync(
      path.join(racine, "cle.ts"),
      'export const CLE = "sb_secret_abcdefghijklmnopqrstuvwxyz012345";\n',
    );
    git(racine, ["add", "-A"]);
    git(racine, ["commit", "-qm", "oups"]);

    const { sortie, status } = lancer(racine);
    expect(status).toBe(1);
    expect(sortie).toContain("clé secrète Supabase");
    // Rien n'est parti, et rien n'a bougé localement non plus.
    expect(branches(origin)).toEqual(["arena/01a10c75-creatordeck"]);
    expect(git(racine, ["rev-parse", "--abbrev-ref", "HEAD"])).toBe("arena/01a10c75-creatordeck");
    expect(readFileSync(path.join(racine, "cle.ts"), "utf8")).toContain("sb_secret_");
  });
});
