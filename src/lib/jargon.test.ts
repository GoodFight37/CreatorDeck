import path from "node:path";
import { describe, expect, it, vi } from "vitest";

/**
 * Le garde-fou de **rédaction** : aucun texte affiché ne nomme
 * l'infrastructure.
 *
 * Le scanner (`scripts/check-jargon.mjs`) est l'outil ; ce test est la porte. Il
 * relit tous les composants et toutes les pages, extrait ce que le joueur lit,
 * et refuse les mots d'atelier : « cloud », « serveur », « Supabase », une
 * extension de fichier, un nom de protocole.
 *
 * Sans lui, le jargon revient toujours par la petite porte : une phrase d'aide
 * écrite à la va-vite, un message d'erreur recopié du journal technique. C'est
 * exactement ce qui était arrivé — le jeu demandait « le cloud » à huit écrans.
 */
import { MOTS_INTERDITS, dossiers, fichiers, offenses, rapport } from "../../scripts/check-jargon.mjs";

describe("le jargon d'infrastructure à l'écran", () => {
  it("n'apparaît dans aucun texte affiché du jeu", () => {
    const { total, texte } = rapport();
    expect(total, `textes à réécrire :${texte}`).toBe(0);
  });

  it("couvre les écrans **et** les modules qui portent leurs phrases", () => {
    // `src/lib` compte : les messages du store, les avertissements de compte et
    // les libellés du carnet s'affichent autant qu'un `<p>` — c'est là que se
    // cachait « ouvre « Charger le cloud » » après la disparition du bouton.
    const dossiersScannes = dossiers().map((d) => path.relative(process.cwd(), d).split(path.sep).join("/"));
    expect(dossiersScannes).toEqual(["src/components", "src/app", "src/lib", "src/hooks"]);
    // Et il y a du monde à lire : un dossier vide ferait passer le test pour de
    // mauvaises raisons.
    expect(fichiers(dossiers()[0]).length).toBeGreaterThan(20);
  });

  it("attrape un texte d'atelier, quand il y en a un", () => {
    const faute = `
      <p className="account-hint">
        Charge la sauvegarde du cloud avant de compiler : voir pull-rates.json.
      </p>
    `;
    const trouves = offenses(faute);
    expect(trouves.length).toBeGreaterThan(0);
    expect(trouves.map((t) => t.mot.toLowerCase())).toContain("cloud");
  });

  it("laisse passer la prose du jeu", () => {
    // Le vocabulaire autorisé, et ce n'est pas un hasard s'il est là : c'est
    // celui qu'on veut voir partout.
    const propre = `
      <p className="account-hint">
        Ta progression est synchronisée : tu la retrouves sur un autre téléphone.
      </p>
      <p>Taux officiels certifiés, les mêmes probabilités pour tout le monde.</p>
    `;
    expect(offenses(propre)).toEqual([]);
  });

  it("ne signale pas du code déguisé en texte", () => {
    // Les interpolations, les classes et les clés ne se lisent pas : le scanner
    // doit les ignorer, sinon il crie au loup et on l'ignore à son tour.
    const code = `
      <div className={theme.tokens.bg} data-on={cloud.userId ? "on" : "off"}>
        {cloud.userId}
      </div>
    `;
    expect(offenses(code)).toEqual([]);
  });

  it("garde des mots interdits, et ils ne sont pas tous techniques", () => {
    // Ce test protège la liste elle-même : si quelqu'un la vide pour faire
    // passer une phrase, il casse ici.
    expect(MOTS_INTERDITS.length).toBeGreaterThan(10);
    for (const mot of ["cloud", "serveur", "Supabase", "SMTP"]) {
      expect(MOTS_INTERDITS.some(([motif]) => motif.test(mot))).toBe(true);
    }
    void vi;
  });
});
