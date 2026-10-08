/**
 * Le Tribunal des Bannis, vérifié sans écran.
 *
 * Ce qui est risqué dans ce mode n'est pas l'affichage, c'est le **tirage** : un
 * tirage qui rebattrait les dossiers à chaque ouverture permettrait de relancer
 * sa séance jusqu'à tomber sur cinq appels faciles, et la récompense du jour
 * n'aurait plus aucune valeur. Le reste (justesse, karma, points) est du calcul
 * qu'on vérifie cas par cas.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import BRUT from "@/data/tribunal.json";
import {
  BADGES,
  DOSSIERS,
  REGLES,
  badgeInfo,
  badgesAffiches,
  dossiersDuJour,
  evaluateVerdict,
  graineDuJour,
  karma,
  reactionDuChat,
  recompenseSeance,
  seanceRendue,
  type Dossier,
  type Verdict,
} from "@/lib/tribunal";

const JOUR = "2026-10-08";
const JOUEUR = "joueuse-42";

/** Un dossier fabriqué pour le test, indépendant des données. */
function dossier(verdictAttendu: Verdict, id = "x-01"): Dossier {
  return {
    id,
    username: "TesteuseDuSoir",
    badges: ["prime"],
    banReason: "Troll",
    chatMessage: "salut",
    contexte: "Just Chatting · 500 spectateurs",
    appealText: "Je voulais juste dire bonjour.",
    verdictAttendu,
    chatReaction: { onDeban: "bienvenue", onBan: "dégage" },
  };
}

describe("les données du Tribunal", () => {
  it("garde tous les dossiers du fichier (aucun n'est écarté)", () => {
    // Si un verdict attendu est mal écrit, le dossier est écarté en silence :
    // ce test est le seul endroit où l'erreur se voit.
    expect(DOSSIERS).toHaveLength(BRUT.dossiers.length);
  });

  it("garde la vérité des dossiers alignée avec le serveur", () => {
    // Le serveur a sa propre copie de la vérité (`0042_tribunal.sql`) : si un
    // dossier change de verdict ici sans changer là-bas, la séance du jour
    // serait refusée en ligne. Ce test est le seul garde-fou.
    const sql = readFileSync(
      new URL("../../supabase/migrations/0042_tribunal.sql", import.meta.url),
      "utf8",
    );
    const bloc = sql.slice(
      sql.indexOf("insert into public.tribunal_dossiers"),
      sql.indexOf("on conflict (id) do update"),
    );
    const serveur = new Map(
      [...bloc.matchAll(/'(t-\d+)'\s*,\s*'(deban|ban)'/g)].map((m) => [m[1], m[2]]),
    );
    const application = new Map(DOSSIERS.map((d) => [d.id, d.verdictAttendu]));
    expect(serveur.size).toBe(DOSSIERS.length);
    expect([...serveur].sort()).toEqual([...application].sort());
  });

  it("propose au moins vingt-cinq dossiers, tous identifiables", () => {
    expect(DOSSIERS.length).toBeGreaterThanOrEqual(25);
    expect(new Set(DOSSIERS.map((d) => d.id)).size).toBe(DOSSIERS.length);
  });

  it("donne à chaque dossier un verdict, une pièce et deux réactions", () => {
    for (const d of DOSSIERS) {
      expect(["deban", "ban"]).toContain(d.verdictAttendu);
      expect(d.username.length).toBeGreaterThan(0);
      expect(d.banReason.length).toBeGreaterThan(0);
      expect(d.chatMessage.length).toBeGreaterThan(0);
      // Le décor du dossier : sans lui, la phrase ne veut rien dire — on ne
      // peut rien sentir d'un message sorti de nulle part.
      expect(d.contexte.length, `dossier sans décor : ${d.id}`).toBeGreaterThan(10);
      // Le plaidoyer est la moitié du plaisir : un dossier sans texte serait
      // un dossier qu'on juge au hasard.
      expect(d.appealText.length).toBeGreaterThan(20);
      expect(d.chatReaction.onDeban.length).toBeGreaterThan(0);
      expect(d.chatReaction.onBan.length).toBeGreaterThan(0);
    }
  });

  it("ne cite que des badges connus, et chacun a une étiquette", () => {
    const connus = new Set(BADGES.map((b) => b.id));
    for (const d of DOSSIERS) {
      for (const badge of d.badges) expect(connus.has(badge)).toBe(true);
    }
    for (const badge of BADGES) expect(badge.label.length).toBeGreaterThan(0);
    expect(badgeInfo("mod")).toEqual({ id: "mod", label: "Modo", ton: "modo" });
    expect(badgeInfo("inconnu")).toBeNull();
  });

  it("étiquette les badges d'un dossier en ignorant ceux qu'elle ne connaît pas", () => {
    const d = { ...dossier("ban"), badges: ["prime", "badge-fantome"] };
    expect(badgesAffiches(d).map((b) => b.id)).toEqual(["prime"]);
  });
});

describe("le tirage du jour", () => {
  it("rend la même séance pour la même journée et le même joueur", () => {
    const a = dossiersDuJour(JOUR, JOUEUR).map((d) => d.id);
    const b = dossiersDuJour(JOUR, JOUEUR).map((d) => d.id);
    expect(a).toEqual(b);
    expect(a).toHaveLength(REGLES.dossiersParSeance);
    // Et pas deux fois le même dossier dans une même séance.
    expect(new Set(a).size).toBe(a.length);
  });

  it("change de séance quand le jour change, ou quand le joueur change", () => {
    const reference = dossiersDuJour(JOUR, JOUEUR).map((d) => d.id);
    expect(dossiersDuJour("2026-10-09", JOUEUR).map((d) => d.id)).not.toEqual(reference);
    expect(dossiersDuJour(JOUR, "autre-joueuse").map((d) => d.id)).not.toEqual(reference);
  });

  it("couvre tous les dossiers quand on tire plus large, sans jamais doubler", () => {
    const tirage = dossiersDuJour(JOUR, JOUEUR, DOSSIERS.length);
    expect(tirage).toHaveLength(DOSSIERS.length);
    expect(new Set(tirage.map((d) => d.id)).size).toBe(DOSSIERS.length);
  });

  it("ne rend rien quand on ne demande rien, et tout au plus ce qui existe", () => {
    expect(dossiersDuJour(JOUR, JOUEUR, 0)).toEqual([]);
    // Demander plus que le stock ne complète pas avec des doublons.
    expect(dossiersDuJour(JOUR, JOUEUR, DOSSIERS.length + 50)).toHaveLength(DOSSIERS.length);
  });

  it("sème une graine stable et distincte par jour et par joueur", () => {
    expect(graineDuJour(JOUR, JOUEUR)).toBe(graineDuJour(JOUR, JOUEUR));
    expect(graineDuJour(JOUR, JOUEUR)).not.toBe(graineDuJour("2026-10-09", JOUEUR));
    // Un joueur sans identifiant ne plante pas : la graine reste définie.
    expect(Number.isInteger(graineDuJour(JOUR, ""))).toBe(true);
  });
});

describe("le verdict", () => {
  it("est juste quand le joueur rejoint le Tribunal", () => {
    expect(evaluateVerdict(dossier("ban"), "ban")).toMatchObject({ juste: true, complaisant: false });
    expect(evaluateVerdict(dossier("deban"), "deban")).toMatchObject({ juste: true, complaisant: false });
  });

  it("n'est complaisant que si on gracie quelqu'un qui devait rester dehors", () => {
    const complaisant = evaluateVerdict(dossier("ban"), "deban");
    expect(complaisant).toMatchObject({ juste: false, complaisant: true, rendu: "deban", attendu: "ban" });

    // Maintenir un ban qui devait être levé, c'est de la sévérité : le dossier
    // le dit, le bilan ne doit pas accuser le joueur de complaisance.
    const severe = evaluateVerdict(dossier("deban"), "ban");
    expect(severe).toMatchObject({ juste: false, complaisant: false, rendu: "ban", attendu: "deban" });
  });

  it("fait réagir le chat selon le verdict rendu", () => {
    const d = dossier("ban");
    expect(reactionDuChat(d, "deban")).toBe("bienvenue");
    expect(reactionDuChat(d, "ban")).toBe("dégage");
  });
});

describe("la séance", () => {
  it("relit les verdicts rendus, dans l'ordre du tirage", () => {
    const dossiers = dossiersDuJour(JOUR, JOUEUR);
    const verdicts = Object.fromEntries(
      dossiers.map((d, i) => [d.id, i % 2 === 0 ? "deban" : "ban"] as const),
    );
    const rendus = seanceRendue(JOUR, JOUEUR, verdicts);
    expect(rendus.map((v) => v.dossier.id)).toEqual(dossiers.map((d) => d.id));
  });

  it("ignore un verdict inconnu au lieu de le compter", () => {
    const dossiers = dossiersDuJour(JOUR, JOUEUR);
    const rendus = seanceRendue(JOUR, JOUEUR, {
      [dossiers[0].id]: "deban",
      [dossiers[1].id]: "on-sait-pas" as Verdict,
      "dossier-disparu": "ban",
    });
    expect(rendus).toHaveLength(1);
    expect(rendus[0].dossier.id).toBe(dossiers[0].id);
  });

  it("mesure un karma de 0 à 100", () => {
    const cinq = dossiersDuJour(JOUR, JOUEUR);
    const rendre = (choix: (d: Dossier) => Verdict) =>
      seanceRendue(JOUR, JOUEUR, Object.fromEntries(cinq.map((d) => [d.id, choix(d)])));

    // Tout juste : 100 %. Tout faux : 0 %.
    expect(karma(rendre((d) => d.verdictAttendu))).toBe(100);
    expect(karma(rendre((d) => (d.verdictAttendu === "ban" ? "deban" : "ban")))).toBe(0);
    expect(karma([])).toBe(0);

    // Trois dossiers sur cinq : exactement 60 %.
    const troisSurCinq = cinq.map((d, i) =>
      evaluateVerdict(d, i < 3 ? d.verdictAttendu : d.verdictAttendu === "ban" ? "deban" : "ban"),
    );
    expect(karma(troisSurCinq)).toBe(60);
  });

  it("paie au-dessus du seuil, avec le double quand le créateur est en direct", () => {
    expect(recompenseSeance(100, false)).toMatchObject({ paye: true, points: 40, multiplicateur: 1 });
    expect(recompenseSeance(60, false)).toMatchObject({ paye: true, points: 24 });
    // Sous le seuil : la séance est jugée, elle ne paie pas.
    expect(recompenseSeance(40, false)).toMatchObject({ paye: false, points: 0 });
    // En direct : les mêmes points, doublés.
    expect(recompenseSeance(100, true)).toMatchObject({ paye: true, points: 80, multiplicateur: 2 });
    expect(recompenseSeance(60, true)).toMatchObject({ paye: true, points: 48 });
  });
});
