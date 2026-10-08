/**
 * Le Tribunal des Bannis : **la mécanique pure**, sans écran.
 *
 * Le principe : chaque journée de jeu, cinq bannis font appel. On lit leur
 * dossier — le pseudo, les badges, le motif, la pièce à conviction et le
 * plaidoyer — et on rend un verdict au pouce : **grâce** ou **maintien**. À la
 * cinquième décision, la séance est notée (« Karma de modération ») et une
 * séance juste paie des points de craft, une fois par jour.
 *
 * Pourquoi un module à part, comme `pull.ts`, `arena.ts` ou `tirage-studio.ts` :
 * ce qui se décide ici — **quels** dossiers tombent aujourd'hui, si un verdict
 * est **juste**, combien la séance **rapporte** — est du calcul pur, vérifiable
 * sans navigateur, sans horloge et sans clic. L'écran ne fait que montrer le
 * résultat (`src/components/tribunal-view.tsx`).
 *
 * Trois règles qui viennent du jeu, pas du goût :
 *
 *   * **les mêmes dossiers pour la même journée** : le tirage est déterministe,
 *     amorcé par `(journée de jeu, identifiant du joueur)`. Rouvrir l'écran ne
 *     rebat pas les cartes — un joueur ne relance pas sa séance pour tomber sur
 *     des appels plus cléments, et quitter au troisième dossier ne remet pas le
 *     compteur à zéro ;
 *   * **un verdict n'est pas une opinion** : chaque dossier porte le verdict
 *     qu'attend le Tribunal (`verdictAttendu`). Le joueur peut être **juste**
 *     (il a vu juste) ou **complaisant** (il a gracié quelqu'un que le Tribunal
 *     gardait dehors) — jamais les deux ;
 *   * **la séance paie une seule fois** : la récompense est versée une fois par
 *     journée de jeu, et c'est le serveur qui tient la caisse quand un compte
 *     est connecté (voir `use-points.ts`). Ce module ne fait que **calculer** ce
 *     que vaut une séance, il ne crédite rien.
 *
 * Journée de jeu : 6 h UTC, la même que les missions et le Paquet Scène
 * (`gameDay` dans `src/lib/progression.ts`).
 */
import TRIBUNAL from "@/data/tribunal.json";

/** Les deux seules issues d'un appel. */
export type Verdict = "deban" | "ban";

/**
 * Un dossier d'appel. La structure est celle de `src/data/tribunal.json`, sans
 * traduction : l'écran affiche ces champs tels quels.
 */
export type Dossier = {
  id: string;
  username: string;
  badges: string[];
  banReason: string;
  /**
   * La scène : sur quoi le stream tournait quand c'est arrivé.
   *
   * Sans lui, un dossier n'est qu'une phrase sortie de nulle part — et on ne
   * peut rien *sentir* d'une phrase sans décor. « Partie classée · 3 400
   * spectateurs · il reste deux joueurs » suffit à voir le moment. Ce n'est pas
   * un indice sur le verdict à rendre : c'est le lieu du crime.
   */
  contexte: string;
  /** La pièce à conviction : le message qui a causé le ban. */
  chatMessage: string;
  /** Le plaidoyer écrit par l'accusé. */
  appealText: string;
  /** Ce que le Tribunal attendait : la vérité du dossier. */
  verdictAttendu: Verdict;
  chatReaction: { onDeban: string; onBan: string };
};

/** Un badge tel qu'on l'affiche (couleur comprise). */
export type BadgeInfo = {
  id: string;
  label: string;
  /** Nuance CSS : `ancien`, `prime`, `modo`, `vip`, `neuf`. */
  ton: string;
};

/** Les réglages du Tribunal, lus depuis les données. */
export type Regles = {
  /** Dossiers tirés par séance. */
  dossiersParSeance: number;
  /** Karma minimal (en pourcent) pour que la séance paie. */
  karmaPourRecompense: number;
  /** Points de craft d'une séance parfaite. */
  pointsParSeance: number;
  /** Multiplicateur quand le créateur qui préside est en direct. */
  multiplicateurDirect: number;
};

export const TITRE: string = TRIBUNAL.tribunal.titre;
export const ACCROCHE: string = TRIBUNAL.tribunal.accroche;

export const REGLES: Regles = {
  dossiersParSeance: TRIBUNAL.regles.dossiersParSeance,
  karmaPourRecompense: TRIBUNAL.regles.karmaPourRecompense,
  pointsParSeance: TRIBUNAL.regles.pointsParSeance,
  multiplicateurDirect: TRIBUNAL.regles.multiplicateurDirect,
};

/** Un verdict valide, ou rien : les données ne sont pas de confiance absolue. */
function estVerdict(valeur: string): valeur is Verdict {
  return valeur === "deban" || valeur === "ban";
}

/**
 * Les dossiers, tels quels.
 *
 * Un dossier dont le verdict attendu est illisible est **écarté** plutôt que de
 * faire planter l'écran : mieux vaut une séance de vingt-cinq dossiers qu'un
 * écran noir. Le test vérifie qu'aucun dossier n'est écarté — donc une erreur
 * dans les données casse les tests, pas le jeu.
 */
export const DOSSIERS: readonly Dossier[] = TRIBUNAL.dossiers.filter(
  (brut): brut is Dossier => estVerdict(brut.verdictAttendu),
);

/** Un dossier par identifiant : sert à relire une séance enregistrée. */
export const DOSSIER_BY_ID: ReadonlyMap<string, Dossier> = new Map(
  DOSSIERS.map((dossier) => [dossier.id, dossier]),
);

/** Les badges connus, par identifiant. */
export const BADGES: readonly BadgeInfo[] = TRIBUNAL.badges;

const BADGE_BY_ID: ReadonlyMap<string, BadgeInfo> = new Map(
  BADGES.map((badge) => [badge.id, badge]),
);

/**
 * L'étiquette d'un badge, ou `null` si le dossier porte un badge inconnu.
 *
 * Un badge inconnu ne casse pas l'affichage : il est simplement ignoré, comme
 * une carte retirée du catalogue.
 */
export function badgeInfo(id: string): BadgeInfo | null {
  return BADGE_BY_ID.get(id) ?? null;
}

/** Les badges d'un dossier, étiquetés et dans l'ordre du dossier. */
export function badgesAffiches(dossier: Dossier): BadgeInfo[] {
  return dossier.badges
    .map((id) => badgeInfo(id))
    .filter((badge): badge is BadgeInfo => badge !== null);
}

// ---------------------------------------------------------------------------
// Le tirage du jour.
// ---------------------------------------------------------------------------

/**
 * Une empreinte 32 bits (FNV-1a) : la graine du tirage.
 *
 * Le même `(journée, joueur)` donne toujours la même graine, donc toujours les
 * mêmes dossiers — c'est toute la garantie « pas de reset en boucle ». Un autre
 * joueur, ou le même joueur un autre jour, tire une autre suite.
 */
export function graineDuJour(day: string, joueurId: string): number {
  const source = `${day}|${joueurId || "anonyme"}`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < source.length; i += 1) {
    hash ^= source.charCodeAt(i);
    // Multiplication 32 bits (FNV-1a), sans dépasser la précision du JS.
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/** Générateur déterministe (mulberry32) : même graine, même suite. */
function generateur(graine: number): () => number {
  let etat = graine >>> 0;
  return () => {
    etat = (etat + 0x6d2b79f5) >>> 0;
    let t = etat;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

/**
 * Les dossiers du jour : `dossiersParSeance` dossiers **distincts**, dans un
 * ordre qui dépend de la journée et du joueur.
 *
 * Le tirage est un Fisher–Yates partiel : on s'arrête après `combien` échanges,
 * donc on ne mélange pas les vingt-six dossiers pour en garder cinq. S'il y a
 * moins de dossiers que demandé, on rend tout ce qui existe — jamais de doublon
 * pour compléter.
 */
export function dossiersDuJour(
  day: string,
  joueurId: string,
  combien: number = REGLES.dossiersParSeance,
): Dossier[] {
  const tirage = DOSSIERS.slice();
  const hasard = generateur(graineDuJour(day, joueurId));
  const voulu = Math.max(0, Math.min(Math.floor(combien), tirage.length));
  for (let i = 0; i < voulu; i += 1) {
    // L'indice choisi dans la partie **non encore tirée** : aucun doublon.
    const j = i + Math.floor(hasard() * (tirage.length - i));
    const permute = tirage[i];
    tirage[i] = tirage[j];
    tirage[j] = permute;
  }
  return tirage.slice(0, voulu);
}

// ---------------------------------------------------------------------------
// Le jugement.
// ---------------------------------------------------------------------------

/** Ce que vaut un verdict rendu sur un dossier. */
export type VerdictRendu = {
  dossier: Dossier;
  /** Le verdict du joueur. */
  rendu: Verdict;
  /** Ce que le Tribunal attendait. */
  attendu: Verdict;
  /** Vrai quand le joueur a vu juste. */
  juste: boolean;
  /**
   * Vrai quand le joueur a gracié quelqu'un que le Tribunal maintenait dehors.
   * C'est la complaisance, et c'est la seule façon de se tromper dans ce sens :
   * maintenir un ban qui devait être levé, c'est de la sévérité, pas de la
   * complaisance.
   */
  complaisant: boolean;
};

/**
 * Le cœur du mode : **un dossier, un choix, une vérité**.
 *
 * Fonction pure, et c'est tout l'intérêt : le verdict rendu, la vérité du
 * dossier et leur écart sont calculés ici, et l'écran n'a plus qu'à les montrer.
 * Aucune horloge, aucun hasard, aucun état.
 */
export function evaluateVerdict(dossier: Dossier, choixJoueur: Verdict): VerdictRendu {
  const juste = choixJoueur === dossier.verdictAttendu;
  return {
    dossier,
    rendu: choixJoueur,
    attendu: dossier.verdictAttendu,
    juste,
    complaisant: !juste && choixJoueur === "deban",
  };
}

/** La réaction du chat : un verdict, une phrase. */
export function reactionDuChat(dossier: Dossier, choix: Verdict): string {
  return choix === "deban" ? dossier.chatReaction.onDeban : dossier.chatReaction.onBan;
}

/**
 * Relit une séance enregistrée : les dossiers du jour, dans l'ordre du tirage,
 * accouplés aux verdicts déjà rendus.
 *
 * Un verdict inconnu (dossier retiré des données, sauvegarde trafiquée) est
 * ignoré plutôt que de faire planter le bilan.
 */
export function seanceRendue(
  day: string,
  joueurId: string,
  verdicts: Readonly<Record<string, Verdict>>,
): VerdictRendu[] {
  return dossiersDuJour(day, joueurId).flatMap((dossier) => {
    const rendu = verdicts[dossier.id];
    if (rendu !== "deban" && rendu !== "ban") return [];
    return [evaluateVerdict(dossier, rendu)];
  });
}

/**
 * Le **Karma de modération** : la part de verdicts justes, en pourcent entier.
 *
 * Cinq dossiers, donc cinq valeurs possibles (0, 20, 40, 60, 80, 100). Une
 * séance vide vaut 0 — on ne récompense pas une séance qu'on n'a pas faite.
 */
export function karma(seance: readonly VerdictRendu[]): number {
  if (!seance.length) return 0;
  const justes = seance.filter((verdict) => verdict.juste).length;
  return Math.round((justes / seance.length) * 100);
}

/** Ce que rapporte une séance : les points, le multiplicateur, et si ça paie. */
export type Recompense = {
  /** Vrai quand le karma atteint le seuil : la séance paie. */
  paye: boolean;
  /** Points de craft versés (0 si la séance ne paie pas). */
  points: number;
  /** 1 hors direct, `multiplicateurDirect` quand le créateur préside en live. */
  multiplicateur: number;
  /** Le karma qui a servi au calcul, pour l'affichage du bilan. */
  karma: number;
  /** Le seuil à atteindre, lui aussi affiché. */
  seuil: number;
};

/**
 * La récompense d'une séance.
 *
 * Deux règles, et elles sont dans les données (`src/data/tribunal.json`) :
 *
 *   * sous `karmaPourRecompense` (60 %, soit trois dossiers sur cinq), la
 *     séance **ne paie pas** — juger à moitié juste ne mérite pas la
 *     gratification ;
 *   * les points suivent le karma : une séance parfaite paie `pointsParSeance`,
 *     une séance à 60 % en paie 60 %. Le multiplicateur Direct s'applique
 *     ensuite, quand le créateur qui préside est en direct à cet instant.
 */
export function recompenseSeance(karmaPct: number, enDirect: boolean): Recompense {
  const multiplicateur = enDirect ? REGLES.multiplicateurDirect : 1;
  const paye = karmaPct >= REGLES.karmaPourRecompense;
  const brut = Math.round((REGLES.pointsParSeance * karmaPct) / 100) * multiplicateur;
  return {
    paye,
    points: paye ? brut : 0,
    multiplicateur,
    karma: karmaPct,
    seuil: REGLES.karmaPourRecompense,
  };
}
