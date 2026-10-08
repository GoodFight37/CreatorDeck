/**
 * Scanner de jargon : trouve les **textes visibles par le joueur** qui parlent
 * d'infrastructure. Il lit les composants, extrait les nœuds de texte JSX et
 * les chaînes destinées à l'affichage (props `message`, `label`, `title`…), et
 * signale celles qui contiennent un mot interdit.
 *
 * Ce n'est pas un parseur : c'est un **garde-fou de rédaction**. Le vrai test
 * est `src/lib/jargon.test.ts`, qui rejoue le même contrôle sur les fichiers du
 * dépôt.
 *
 * Usage : node scripts/check-jargon.mjs [--liste]
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

/** Les mots interdits dans un texte affiché, avec leur remplaçant conseillé. */
export const MOTS_INTERDITS = [
  [/\bpull-rates\.json\b/i, "« les taux officiels »"],
  [/\bcloud\b/i, "« Sauvegarde en ligne »"],
  [/\btokens?\b/i, "« jetons »"],
  [/\bserveur\b/i, "« en ligne »"],
  [/\bcompte Supabase\b/i, "« compte lié »"],
  [/\.json\b/i, "aucune extension de fichier"],
  [/\.sql\b/i, "aucune extension de fichier"],
  [/\bSupabase\b/i, "« Sauvegarde en ligne »"],
  [/\bSMTP\b/i, "« l'envoi du code »"],
  [/\blocalStorage\b/i, "« sur cet appareil »"],
  [/\bpayload\b/i, "« la sauvegarde »"],
  [/\bRPC\b/i, "« la connexion »"],
  [/\bdebounce\b/i, "« en tâche de fond »"],
  [/\bAPI\b/i, "« la connexion »"],
  [/\bREST\b/i, "« la connexion »"],
  [/\bEdge Function\b/i, "« le service »"],
  [/\bservice_role\b/i, "« le service »"],
  [/\bPGRST\b/i, "« la connexion »"],
  [/\bwebhook\b/i, "« le service »"],
  [/\bpg_net\b/i, "« le service »"],
  [/\btable SQL\b/i, "aucun"],
  [/\bSQL\b/i, "aucun"],
  [/\bschéma\b/i, "aucun"],
  [/\brealtime\b/i, "aucun"],
  [/\bbucket\b/i, "aucun"],
  [/\bhash(é|ee)?\b/i, "« protégé »"],
  [/\bJWT\b/i, "aucun"],
  [/\bSDK\b/i, "aucun"],
  [/\brequête HTTP\b/i, "« la connexion »"],
  [/\bendpoint\b/i, "« la connexion »"],
];

/**
 * Le code n'est pas du texte : `theme.tokens.bg` ou `${cloud.userId}` parlent au
 * compilateur, pas au joueur. On retire donc **les interpolations** avant de
 * juger une chaîne de gabarit, et on ne regarde jamais une ligne qui n'est
 * qu'une expression (`attr={…}`).
 */
function sansInterpolations(texte) {
  return texte.replace(/\$\{[^}]*\}/g, " ");
}

/**
 * Ce qui part au **journal** n'est pas lu par le joueur.
 *
 * `console.warn` et la convention maison `journaliser(...)` servent à garder le
 * détail technique pour l'exploitant : un nom de fichier, un code d'erreur, la
 * commande qui répare. C'est utile, et invisible — donc hors du contrôle.
 */
const LIGNE_DE_JOURNAL = /console\.|\bjournaliser\(/;

/** Ce qui n'est **pas** un nœud de texte rendu : classes, clés, noms de code. */
const PROPS_MUETTES =
  /^(className|key|id|href|src|name|type|value|role|htmlFor|data-[\w-]+|style|icon|slug|variant|message\?)$/;

/** Les props dont la valeur **est** un texte montré au joueur. */
const PROPS_PARLEES =
  /^(message|label|title|hint|notice|text|placeholder|aria-label|aria-description|alt|eyebrow|subtitle|sousTitre|phrase|phrases|description|aide|note|titre|texte)$/;

export function textesParles(source) {
  const trouve = [];
  const lignes = source.split("\n");
  let dansCommentaire = false;
  for (const [index, brute] of lignes.entries()) {
    const ligne = brute;
    const nu = ligne.trim();
    // Les commentaires de code ne s'affichent pas : on les ignore, mais on
    // garde une trace des blocs /* … */ pour ne pas juger leur prose.
    if (dansCommentaire) {
      if (nu.includes("*/")) dansCommentaire = false;
      continue;
    }
    if (nu.startsWith("/*") && !nu.includes("*/")) {
      dansCommentaire = true;
      continue;
    }
    if (nu.startsWith("//") || nu.startsWith("*") || nu.startsWith("/*")) continue;
    if (LIGNE_DE_JOURNAL.test(nu)) continue;

    // 1. Les nœuds de texte JSX : `>` … `text` … `<`.
    for (const m of ligne.matchAll(/>([^<>{}"'`]+)</g)) {
      const texte = m[1].trim();
      if (texte) trouve.push({ ligne: index + 1, texte, genre: "jsx" });
    }
    // 2. Les chaînes des props qui parlent.
    for (const m of ligne.matchAll(/([A-Za-z-]+)\s*[:=]\s*"([^"]{4,})"/g)) {
      const [, nom, texte] = m;
      if (PROPS_MUETTES.test(nom)) continue;
      if (PROPS_PARLEES.test(nom) || /^(message|label|title|hint)/i.test(nom)) {
        trouve.push({ ligne: index + 1, texte, genre: nom });
      }
    }
    // 3. Les chaînes de gabarit et les phrases en français entre guillemets,
    //    quand elles ressemblent à une phrase (au moins trois mots).
    for (const m of ligne.matchAll(/"([^"]{12,})"/g)) {
      // Une chaîne collée dans une interpolation (`data-on={cloud.x ? "on"…}`)
      // ou un fragment de code (`.length`, `.map(`) n'est pas une phrase.
      const avant = ligne.slice(0, m.index ?? 0);
      const texte = sansInterpolations(m[1]);
      if (!/[a-zà-ÿ]/.test(texte) || !/\s/.test(texte)) continue;
      if (/^[a-z0-9-]+$/.test(texte)) continue;
      // Un opérateur dénonce du code : « a === \"x\" || b === \"y\" » n'est pas
      // une phrase au joueur, même si le fragment capturé ressemble à des mots.
      if (/(\.\w+\(|\.length|=>|\.map|\?\s|\[|===|!==|&&|\|\||\?\.)/.test(m[1])) continue;
      if (/\{\s*$/.test(avant)) continue;
      trouve.push({ ligne: index + 1, texte, genre: "chaine" });
    }
    // 4. La prose **posée sur sa propre ligne**, entre deux balises
    //    (`<span>` … texte … `</span>`) : le cas 1 ne la voit pas, puisqu'il
    //    exige le `>` et le `<` sur la même ligne. Une ligne sans aucun
    //    caractère de code et d'au moins quatre mots est de la prose JSX.
    const jetteLigne = /[<>{}()\[\]=;`"|]/.test(nu);
    // …et une ligne de **code** n'est pas de la prose, même sans accolades :
    // `rewardTokens: result.tokens ?? null,` a l'air d'une phrase pour un
    // scanner naïf, et c'est un champ d'objet.
    const codeDeconnecte =
      /\?\?|=>|\?\.|&&|\|\||[a-zà-ÿ]+[A-Z]\w*|^\s*[A-Za-z_$][\w$]*\s*:/.test(nu);
    if (!jetteLigne && !codeDeconnecte && nu.split(/\s+/).length >= 4 && /[a-zà-ÿ]{3,}/.test(nu)) {
      trouve.push({ ligne: index + 1, texte: nu, genre: "prose" });
    }
    for (const m of ligne.matchAll(/`([^`]{12,})`/g)) {
      const texte = sansInterpolations(m[1]);
      if (!/[a-zà-ÿ]/.test(texte) || !/\s/.test(texte)) continue;
      // Une URL d'appel n'est pas une phrase : `/rest/v1/profiles?select=…` se
      // lit dans le journal réseau, pas à l'écran.
      if (/^\s*[/.]/.test(texte) || /https?:\/\/|\/v1\/|\?[a-z_]+=|&select=/.test(texte)) continue;
      // Une chaîne qui n'est **que** des interpolations (`${a} ${b}`) n'affiche
      // rien à elle : ce sont les valeurs qui parleront.
      if (!/[a-zà-ÿ]{3,}/.test(texte)) continue;
      trouve.push({ ligne: index + 1, texte, genre: "gabarit" });
    }
  }
  return trouve;
}

export function offenses(source) {
  const out = [];
  for (const { ligne, texte, genre } of textesParles(source)) {
    for (const [motif, conseil] of MOTS_INTERDITS) {
      const m = texte.match(motif);
      if (m) out.push({ ligne, texte, genre, mot: m[0], conseil });
    }
  }
  return out;
}

export function fichiers(dossier) {
  const out = [];
  for (const nom of readdirSync(dossier)) {
    const chemin = path.join(dossier, nom);
    if (statSync(chemin).isDirectory()) out.push(...fichiers(chemin));
    else if (/\.tsx?$/.test(nom) && !nom.endsWith(".test.ts") && !nom.endsWith(".test.tsx")) {
      out.push(chemin);
    }
  }
  return out;
}

/** Les dossiers de l'interface : c'est là que le joueur lit le jeu. */
export function dossiers() {
  // Les écrans **et** les modules qui portent leurs phrases. Les messages du
  // store (« ouvre « Charger le cloud » »), les libellés du carnet et les
  // avertissements de compte s'affichent tout autant qu'un `<p>` : les oublier
  // laissait passer du jargon que le joueur lisait au milieu de l'écran.
  return ["src/components", "src/app", "src/lib", "src/hooks"].map((d) => path.join(process.cwd(), d));
}

export function rapport() {
  const lignes = [];
  let total = 0;
  for (const dossier of dossiers()) {
    for (const fichier of fichiers(dossier)) {
      const source = readFileSync(fichier, "utf8");
      const trouves = offenses(source);
      if (!trouves.length) continue;
      total += trouves.length;
      lignes.push(`\n${path.relative(process.cwd(), fichier)}`);
      for (const t of trouves) {
        lignes.push(
          `  ${String(t.ligne).padStart(4)} : « ${t.texte.trim().slice(0, 120)} » → ${t.mot} (${t.conseil})`,
        );
      }
    }
  }
  return { total, texte: lignes.join("\n") };
}

if (process.argv[1] && process.argv[1].endsWith("check-jargon.mjs")) {
  const { total, texte } = rapport();
  if (total === 0) {
    console.log("✅ aucun jargon d'infrastructure dans les textes affichés");
  } else {
    console.log(`❌ ${total} texte(s) à réécrire :${texte}\n`);
    process.exitCode = 1;
  }
}
